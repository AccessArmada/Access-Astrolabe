import "./patch.js";
import { computeAccessibleName, getRole, computeAccessibleDescription } from "dom-accessibility-api";
import { computeTrace } from "./trace.js";
import { generateAnnouncement, generateContext } from "./announcements.js";
import { computeSuggestions } from "./suggestions.js";
import { VALID_ARIA_ROLES } from "./roles.js";
import { initNavigator, isExtensionManagedTabindex, cleanupExtensionTabindex } from "./navigator.js";
import { computeStatesSummary, computeValueSummary } from "./state-summary.js";
import { toggleMask, togglePeekMask, updatePeekMaskVars, setPeekMaskFullDark, updateMaskOpacity } from "./mask.js";
import { updateHighlighter } from "./highlighter.js";


// Live Editing State
if (window.location.protocol.includes('extension')) {
  // Silence in extension context
} else {

let ignoredAttributes = new Set();
let isInternalUpdate = false;

const accessibilityAttributes = [
  "aria-label", "aria-labelledby", "aria-describedby", "alt", "title", "role",
  "aria-hidden", "aria-disabled", "aria-expanded", "aria-pressed", "aria-checked", "hidden"
];

const observerOptions = {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: accessibilityAttributes
};

let observer = null;

function serializeToDepth(el, maxDepth, currentDepth = 0, rootAttrFilter = null, indent = 0) {
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr']);
  const tag = el.tagName.toLowerCase();

  let attrArr = Array.from(el.attributes);
  if (currentDepth === 0 && rootAttrFilter) {
    attrArr = attrArr.filter(rootAttrFilter);
  }
  const attrs = attrArr.map(a => ` ${a.name}="${a.value}"`).join('');

  if (voidTags.has(tag)) return `<${tag}${attrs}>`;

  const childIndent = indent + 2;
  const hasElementChildren = Array.from(el.childNodes).some(n => n.nodeType === Node.ELEMENT_NODE);

  if (currentDepth >= maxDepth && hasElementChildren) {
    return `<${tag}${attrs}>\n${' '.repeat(childIndent)}<!-- … -->\n${' '.repeat(indent)}</${tag}>`;
  }

  const childParts = Array.from(el.childNodes).map(child => {
    if (child.nodeType === Node.TEXT_NODE) return child.textContent.trim();
    if (child.nodeType === Node.ELEMENT_NODE) {
      return serializeToDepth(child, maxDepth, currentDepth + 1, null, childIndent);
    }
    return '';
  }).filter(Boolean);

  if (!hasElementChildren) {
    return `<${tag}${attrs}>${childParts.join('')}</${tag}>`;
  }

  const childrenStr = childParts.map(p => `\n${' '.repeat(childIndent)}${p}`).join('');
  return `<${tag}${attrs}>${childrenStr}\n${' '.repeat(indent)}</${tag}>`;
}

/**
 * Generates the accessibility data payload for an element.
 * Wraps core functions from dom-accessibility-api.
 */
function getAccessibilityData(element) {
  if (!element || element.nodeType !== 1 || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(element.tagName)) {
    return null;
  }

  const overrides = [];

  // Apply temporary overrides for live testing
  for (const attr of ignoredAttributes) {
    if (attr === 'textContent') {
      overrides.push({ type: 'text', target: element, value: element.textContent });
      element.textContent = '';
    } else if (attr === 'label') {
      // Handle native labels
      if (element.id) {
        const explicitLabels = Array.from(document.querySelectorAll(`label[for="${element.id}"]`));
        explicitLabels.forEach(l => {
          overrides.push({ target: l, type: 'attr', name: 'for', value: element.id });
          l.removeAttribute('for');
        });
      }
      const implicitLabel = element.closest('label');
      if (implicitLabel) {
        overrides.push({ target: implicitLabel, type: 'attr', name: 'aria-hidden', value: implicitLabel.getAttribute('aria-hidden') });
        implicitLabel.setAttribute('aria-hidden', 'true');
      }
    } else if (element.hasAttribute(attr)) {
      overrides.push({ target: element, type: 'attr', name: attr, value: element.getAttribute(attr) });
      element.removeAttribute(attr);
    } else {
      // Also check child elements for 'alt' if that's what was ignored
      const imgChild = element.querySelector('img[alt]');
      if (attr === 'alt' && imgChild) {
          overrides.push({ type: 'attr', target: imgChild, name: 'alt', value: imgChild.getAttribute('alt') });
          imgChild.removeAttribute('alt');
      }
    }
  }

  try {
    const name = computeAccessibleName(element);
    const rawRole = getRole(element);
    const explicitTokens = (element.getAttribute('role') ?? '').trim().split(/\s+/).filter(Boolean);
    const hasExplicitRole = explicitTokens.length > 0;

    let role;
    if (!hasExplicitRole) {
      role = rawRole;
    } else {
      const firstValidToken = explicitTokens.find(t => VALID_ARIA_ROLES.has(t)) ?? null;

      // none and presentation are valid tokens but are conditionally ignored
      // by the browser. When ignored, the effective role is the implicit role,
      // not "none"/"presentation".
      const PRESENTATION_ROLES = new Set(['none', 'presentation']);
      if (firstValidToken && PRESENTATION_ROLES.has(firstValidToken)) {
        const nativeFocusableTags = new Set(['a', 'button', 'input', 'textarea', 'select', 'details', 'iframe']);
        const isFocusable = element.tabIndex >= 0 || nativeFocusableTags.has(element.tagName.toLowerCase());
        const hasGlobalAriaAttr = [
          'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-owns',
          'aria-controls', 'aria-haspopup', 'aria-live', 'aria-atomic',
          'aria-relevant', 'aria-busy'
        ].some(attr => element.hasAttribute(attr));

        if (isFocusable || hasGlobalAriaAttr) {
          // presentation/none is being ignored — use the implicit role instead.
          // dom-accessibility-api's getRole reads the explicit role attribute, so
          // rawRole may itself be "presentation"/"none" when the library happened
          // to honor it. Temporarily strip the attribute to get the true implicit role.
          const savedAttr = element.getAttribute('role');
          element.removeAttribute('role');
          const implicitRole = getRole(element);
          element.setAttribute('role', savedAttr);
          role = implicitRole;
        } else {
          role = firstValidToken;
        }
      } else {
        role = firstValidToken;
      }
    }
    const description = computeAccessibleDescription(element);
    const trace = computeTrace(element);

    let snippet = '';
    try {
      const attrFilter = isExtensionManagedTabindex(element)
        ? a => a.name !== 'tabindex'
        : null;
      snippet = serializeToDepth(element, 2, 0, attrFilter);
    } catch (e) {
      snippet = `<${element.tagName.toLowerCase()}>`;
    }

    // Apply ignored status to trace steps
    trace.forEach(step => {
      if (ignoredAttributes.has(step.attribute)) {
        step.ignored = true;
      }
    });

    const inputType = element.type || '';
    const elTag = element.tagName;

    const expandedAttr = element.getAttribute('aria-expanded');
    const expanded = expandedAttr !== null ? expandedAttr
      : (elTag === 'DETAILS' ? String(element.open) : null);

    const checkedAttr = element.getAttribute('aria-checked');
    const isCheckable = elTag === 'INPUT' && (inputType === 'checkbox' || inputType === 'radio');
    const checked = checkedAttr !== null ? checkedAttr
      : (isCheckable ? (element.indeterminate ? 'mixed' : String(element.checked)) : null);

    const selectedAttr = element.getAttribute('aria-selected');
    const selected = selectedAttr !== null ? selectedAttr
      : (elTag === 'OPTION' ? String(element.selected) : null);

    const isRangeInput = elTag === 'INPUT' && inputType === 'range';
    const isProgressLike = elTag === 'PROGRESS' || elTag === 'METER';
    const valueNow = element.getAttribute('aria-valuenow')
      ?? ((isRangeInput || isProgressLike) ? element.value : null);
    const valueMin = element.getAttribute('aria-valuemin')
      ?? (isRangeInput ? element.min : null);
    const valueMax = element.getAttribute('aria-valuemax')
      ?? (isRangeInput ? element.max : null);

    const states = {
      hidden: element.getAttribute('aria-hidden') === 'true' || element.hasAttribute('hidden') || element.hidden === true,
      disabled: element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true',
      expanded,
      pressed: element.getAttribute('aria-pressed'),
      checked,
      selected,
      live: element.getAttribute('aria-live'),
      valueNow,
      valueMin,
      valueMax,
      required: element.hasAttribute('required') || element.getAttribute('aria-required') === 'true',
      invalid: element.getAttribute('aria-invalid') === 'true' || element.validity?.valid === false,
      current: element.getAttribute('aria-current') ?? null,
      level: element.getAttribute('aria-level') ?? null,
    };

    const data = {
      name,
      role,
      description,
      trace,
      htmlSnippet: snippet,
      id: element.id,
      className: element.className,
      tagName: element.tagName,
      states,
      statesSummary: computeStatesSummary(states),
      valueSummary: computeValueSummary(states),
      inputType: elTag === 'INPUT' ? (inputType || 'text') : null,
    };

    data.announcement = generateAnnouncement(data, element);
    try {
      data.suggestions = computeSuggestions(element, data.name, data.role);
    } catch (suggErr) {
      data.suggestions = [];
    }

    return data;
  } catch (err) {
    return null;
  } finally {
    // Restore original values
    for (const o of overrides.reverse()) {
      if (o.type === 'text') {
        o.target.textContent = o.value;
      } else if (o.value === null) {
        o.target.removeAttribute(o.name);
      } else {
        o.target.setAttribute(o.name, o.value);
      }
    }
  }
}



// Keep track of the currently focused element
let lastFocusedElement = null;
let lastRightClickedElement = null;
let peekEnabled = false;

let peekUpdateQueued = false;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getBestSpotlightRect(element) {
  let current = element;
  for (let depth = 0; depth < 6 && current; depth++) {
    if (current.nodeType !== 1) break;
    const rect = current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return rect;
    current = current.parentElement;
  }
  return null;
}

function updatePeekSpotlight(element) {
  if (!peekEnabled) return;

  const active = element || document.activeElement;
  if (!active || active === document.body || active === document.documentElement) {
    setPeekMaskFullDark(true);
    return;
  }

  const rect = getBestSpotlightRect(active);
  if (!rect) {
    setPeekMaskFullDark(true);
    return;
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const visibleLeft = clamp(rect.left, 0, viewportWidth);
  const visibleRight = clamp(rect.right, 0, viewportWidth);
  const visibleTop = clamp(rect.top, 0, viewportHeight);
  const visibleBottom = clamp(rect.bottom, 0, viewportHeight);

  const visibleWidth = Math.max(0, visibleRight - visibleLeft);
  const visibleHeight = Math.max(0, visibleBottom - visibleTop);

  if (visibleWidth === 0 && visibleHeight === 0) {
    setPeekMaskFullDark(true);
    return;
  }

  const centerX = visibleLeft + visibleWidth / 2;
  const centerY = visibleTop + visibleHeight / 2;

  const spotlightRadius = Math.max(visibleWidth, visibleHeight) / 2 + 48;

  setPeekMaskFullDark(false);
  updatePeekMaskVars({
    focusX: `${centerX}px`,
    focusY: `${centerY}px`,
    focusSize: `${Math.round(spotlightRadius)}px`,
    blurRadius: '64px'
  });
}

function queuePeekUpdate(element = null) {
  if (!peekEnabled) return;
  if (peekUpdateQueued) return;
  peekUpdateQueued = true;
  requestAnimationFrame(() => {
    peekUpdateQueued = false;
    updatePeekSpotlight(element || lastFocusedElement);
  });
}

/**
 * Finds associated headers for a table cell
 */
function getTableCellContext(cell) {
  if (cell.tagName !== 'TD' && cell.tagName !== 'TH') return null;
  const table = cell.closest('table');
  if (!table) return null;

  const rowHeaders = [];
  const colHeaders = [];

  // Find row headers (TH in the same row)
  const row = cell.closest('tr');
  if (row) {
    row.querySelectorAll('th').forEach(th => {
      if (th !== cell) rowHeaders.push(th.textContent.trim());
    });
  }

  // Find column headers (TH in the same column, typically in THEAD or first row)
  const colIndex = cell.cellIndex;
  const allRows = Array.from(table.rows);
  allRows.forEach(r => {
    const candidate = r.cells[colIndex];
    if (candidate && candidate.tagName === 'TH' && candidate !== cell) {
      colHeaders.push(candidate.textContent.trim());
    }
  });

  return {
    row: (row ? row.rowIndex + 1 : 0),
    col: colIndex + 1,
    rowHeaders: [...new Set(rowHeaders)],
    colHeaders: [...new Set(colHeaders)]
  };
}

function broadcastFocusChange(element) {
  if (!element || isInternalUpdate || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(element.tagName)) return;

  // Stop observing during internal changes
  if (observer) {
    observer.disconnect();
  }

  isInternalUpdate = true;

  try {
    const data = getAccessibilityData(element);
    if (data) {
      const tableContext = getTableCellContext(element);
      if (tableContext) {
        data.tableContext = tableContext;
      }

      data.context = generateContext(element, data);

      // Sanitize data to prevent circular references
      if (chrome.runtime?.id) {
        const cleanData = JSON.parse(JSON.stringify(data));
        chrome.runtime.sendMessage({ type: "FOCUS_CHANGE", data: cleanData }).catch(() => {});
      }

      updateHighlighter(element);
      queuePeekUpdate(element);

      if (chrome.runtime?.id && chrome.storage?.local) {
        chrome.storage.local.set({ 'current-focus': data });
      }
    }
  } finally {
    isInternalUpdate = false;
    // Resume observing
    if (observer && document.body) {
      observer.observe(document.body, observerOptions);
    }
  }
}

function initLiveRegionObserver() {
  const liveObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      const target = mutation.target;
      const el = target.nodeType === Node.ELEMENT_NODE ? target : target.parentElement;
      if (!el) continue;

      const liveRegion = el.closest?.('[aria-live], [role="alert"], [role="status"], [role="log"], [role="marquee"], [role="timer"]');

      if (liveRegion) {
        let textToAnnounce = "";


        // 1. Check for specific text change
        if (mutation.type === "characterData") {
          textToAnnounce = mutation.target.textContent.trim();
        }
        // 2. Check for added nodes
        else if (mutation.addedNodes.length > 0) {
          const addedTexts = Array.from(mutation.addedNodes)
            .map(node => node.textContent.trim())
            .filter(Boolean);
          if (addedTexts.length > 0) {
            textToAnnounce = addedTexts.join(" ");
          }
        }
        // 3. Class gained on an element (e.g. carousel slide becoming active)
        else if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const oldClasses = new Set((mutation.oldValue ?? '').split(/\s+/).filter(Boolean));
          const newClasses = new Set((el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean));
          const gained = [...newClasses].filter(c => !oldClasses.has(c));
          if (gained.length > 0) {
            textToAnnounce = el.textContent?.trim().replace(/\s+/g, ' ') || '';
          }
        }
        // 4. aria-hidden removed — content revealed
        else if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
          if (mutation.oldValue === 'true' && el.getAttribute('aria-hidden') !== 'true') {
            textToAnnounce = el.textContent?.trim().replace(/\s+/g, ' ') || '';
          }
        }

        // If we found specific text to announce, send it
        if (textToAnnounce) {
          // aria-atomic="true" (explicit or implicit per role) means read the full region
          // role="status" and role="alert" have aria-atomic=true as an implicit ARIA value
          const IMPLICITLY_ATOMIC_ROLES = new Set(['status', 'alert']);
          const isAtomic = liveRegion.getAttribute('aria-atomic') === 'true'
            || IMPLICITLY_ATOMIC_ROLES.has(liveRegion.getAttribute('role'));
          if (isAtomic) {
            textToAnnounce = liveRegion.textContent.trim().replace(/\s+/g, ' ');
          }

          const liveAttr = liveRegion.getAttribute('aria-live');
          const roleAttr = liveRegion.getAttribute('role');
          const isAssertive = liveAttr === 'assertive' || roleAttr === 'alert';
          const prefix = isAssertive ? 'Alert: ' : 'Live: ';


          if (chrome.runtime?.id) {
            chrome.runtime.sendMessage({
              type: 'LIVE_ANNOUNCEMENT',
              announcement: `${prefix}${textToAnnounce}`,
              text: textToAnnounce,
              politeness: isAssertive ? 'assertive' : 'polite',
              timestamp: Date.now()
            }).catch(() => {});
          }
        }

      }
    }
  });

  if (document.body) {
    liveObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ['class', 'aria-hidden']
    });
  }
}





// Wrapper to track execution status
try {
  initNavigator();
  initLiveRegionObserver();

  document.addEventListener('__astrolabe_ariaNotify', (e) => {
    chrome.runtime.sendMessage({
      type: 'ARIA_NOTIFY_ANNOUNCEMENT',
      payload: {
        message:   e.detail.message,
        priority:  e.detail.priority,
        source:    e.detail.source,
        timestamp: e.detail.timestamp
      }
    });
  });

  document.addEventListener("focusin", (event) => {
    try {
      if (lastFocusedElement !== event.target) {
        ignoredAttributes.clear();
        cleanupExtensionTabindex(lastFocusedElement);
      }
      lastFocusedElement = event.target;
      broadcastFocusChange(lastFocusedElement);
    } catch (focusErr) {
      console.error("Screen Reader Inspector: Focus listener error:", focusErr);
    }
  });

  document.addEventListener("contextmenu", (event) => {
    lastRightClickedElement = event.target;
  });



  observer = new MutationObserver((mutations) => {
    if (isInternalUpdate) return;
    if (lastFocusedElement) {
      // Only re-broadcast if the mutation happened inside or targets the focused element
      const changed = mutations.some(m =>
        m.target === lastFocusedElement || lastFocusedElement.contains(m.target)
      );
      if (changed) {
        broadcastFocusChange(lastFocusedElement);
      }
    }
  });


  if (document.body) {
    observer.observe(document.body, observerOptions);
  }


  // Read initial mask setting
  if (chrome.runtime?.id && chrome.storage?.sync) {
    chrome.storage.sync.get(['vision-mask', 'peek-active-item', 'mask-opacity'], (result) => {
      if (!chrome.runtime?.id) return;
      if (result['mask-opacity'] !== undefined) updateMaskOpacity(result['mask-opacity']);
      if (result['vision-mask']) toggleMask(true);

      if (result['peek-active-item']) {
        peekEnabled = true;
        togglePeekMask(true);
        queuePeekUpdate(document.activeElement);
      }
    });

    // Listen for storage changes to react instantly across all open tabs
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (!chrome.runtime?.id) return;
      if (areaName === 'sync' && changes['vision-mask']) {
        toggleMask(changes['vision-mask'].newValue);
      }
      if (areaName === 'sync' && changes['peek-active-item']) {
        const enabled = Boolean(changes['peek-active-item'].newValue);
        peekEnabled = enabled;
        togglePeekMask(enabled);
        if (enabled) queuePeekUpdate(document.activeElement);
      }
    });
  }

  // Keep highlighter positioned correctly on scroll/resize
  window.addEventListener('scroll', () => {
    if (lastFocusedElement) updateHighlighter(lastFocusedElement);
    queuePeekUpdate();
  }, { passive: true });
  window.addEventListener('resize', () => {
    if (lastFocusedElement) updateHighlighter(lastFocusedElement);
    queuePeekUpdate();
  }, { passive: true });
  // Listen for messages from the side panel
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!chrome.runtime?.id) return false;

    if (message.type === 'UPDATE_MASK_OPACITY') {
      updateMaskOpacity(message.opacity);
      sendResponse({});
      return false;
    }

    if (message.type === 'ENABLE_MASK') {
      toggleMask(true);
      sendResponse({});
      return false;
    }

    if (message.type === 'DISABLE_MASK') {
      toggleMask(false);
      sendResponse({});
      return false;
    }

    if (message.type === 'RESTORE_FOCUS') {

      if (lastFocusedElement) {
        lastFocusedElement.focus();
        console.log("Screen Reader Inspector: Restored Focus to", lastFocusedElement);
      }
      sendResponse({});
      return false;
    } else if (message.type === 'GET_HEADINGS_SUMMARY') {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]'))
        .filter(el => {
          const style = window.getComputedStyle(el);
          return style && style.display !== 'none' && style.visibility !== 'hidden' && el.getAttribute('aria-hidden') !== 'true';
        });

      sendResponse({
        count: headings.length,
        currentFocusIsHeading: headings.includes(document.activeElement)
      });
      return false;
    } else if (message.type === 'HIGHLIGHT_ELEMENT_BY_ID') {
      const el = document.getElementById(message.id);
      if (el) {
        updateHighlighter(el, { pulsate: true });
      }
      sendResponse({});
      return false;
    } else if (message.type === 'HIGHLIGHT_MAIN_ELEMENT') {
      if (lastFocusedElement) {
        updateHighlighter(lastFocusedElement);
      }
      sendResponse({});
      return false;
    } else if (message.type === 'CLEAR_HIGHLIGHT') {
      if (lastFocusedElement) {
        updateHighlighter(lastFocusedElement);
      } else {
        updateHighlighter(null);
      }
      sendResponse({});
      return false;
    } else if (message.type === 'TOGGLE_ATTRIBUTE') {
      if (ignoredAttributes.has(message.attribute)) {
        ignoredAttributes.delete(message.attribute);
      } else {
        ignoredAttributes.add(message.attribute);
      }
      // Re-broadcast change to update side panel
      if (lastFocusedElement) {
        broadcastFocusChange(lastFocusedElement);
      }
      sendResponse({});
      return false;
    } else if (message.type === 'INSPECT_ELEMENT') {
      if (lastRightClickedElement) {
        lastRightClickedElement.focus();
        broadcastFocusChange(lastRightClickedElement);
      }
      sendResponse({});
      return false;
    }



    // Explicitly respond to unknown messages to avoid port closure errors
    sendResponse({});
    return false;
  });


} catch (e) {
  console.error("Screen Reader Inspector: CONTENT Script Crash", e);
}
} // End extension guard
