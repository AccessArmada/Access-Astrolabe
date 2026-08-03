/**
 * Navigation Interceptor
 * Implements Alt+[H,L,B,G,T] for forward navigation
 * and Alt+Shift+[H,L,B,G,T] for reverse navigation.
 */

let simulationModeEnabled = true;

/**
 * Global App state for the navigator
 */
let appState = {
  mode: 'navigation', // 'navigation' | 'table'
  tableContext: {
    table: null,
    rowIndex: 0,
    colIndex: 0
  }
};

export function isNativelyFocusable(el) {
  const tag = el.tagName;
  if (tag === 'BUTTON') return true;
  if (tag === 'A' && el.hasAttribute('href')) return true;
  if (tag === 'INPUT' && el.type !== 'hidden') return true;
  if (tag === 'SELECT') return true;
  if (tag === 'TEXTAREA') return true;
  if (tag === 'DETAILS') return true;
  if ((tag === 'AUDIO' || tag === 'VIDEO') && el.hasAttribute('controls')) return true;
  return false;
}

const managedTabindexes = new WeakSet();

export function isExtensionManagedTabindex(el) {
  return el != null && managedTabindexes.has(el);
}

export function cleanupExtensionTabindex(el) {
  if (el != null && managedTabindexes.has(el)) {
    el.removeAttribute('tabindex');
    managedTabindexes.delete(el);
  }
}

export function _addManagedForTest(el) {
  el.setAttribute('tabindex', '-1');
  managedTabindexes.add(el);
}

// We use chrome.storage.local (or sync)
if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.storage?.sync) {
  chrome.storage.sync.get("simulation-mode", (data) => {
    if (chrome.runtime?.id) {
      simulationModeEnabled = data["simulation-mode"] !== false;
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (chrome.runtime?.id && area === 'sync' && changes["simulation-mode"]) {
      simulationModeEnabled = !!changes["simulation-mode"].newValue;
    }
  });
}

function isHeading(el) {
  const r = el.getAttribute('role');
  if (r === 'heading') return true;
  return /^(H[1-6])$/i.test(el.tagName);
}

function isLink(el) {
  const r = el.getAttribute('role');
  if (r === 'link') return true;
  return el.tagName === 'A' && el.hasAttribute('href');
}

function isButton(el) {
  const r = el.getAttribute('role');
  if (r === 'button') return true;
  if (el.tagName === 'BUTTON') return true;
  if (el.tagName === 'INPUT' && ['button', 'submit', 'reset'].includes(el.type)) return true;
  return false;
}

function isGraphic(el) {
  const r = el.getAttribute('role');
  if (r === 'img' || r === 'image') return true;
  if (el.tagName === 'IMG' || el.tagName === 'SVG') return true;
  return false;
}

function isTable(el) {
  const r = el.getAttribute('role');
  if (r === 'table' || r === 'grid') return true;
  return el.tagName === 'TABLE';
}

const ARIA_CELL_ROLES = new Set(['cell', 'gridcell', 'columnheader', 'rowheader']);

function getTableRows(table) {
  if (table.tagName === 'TABLE') return Array.from(table.rows);
  return Array.from(table.querySelectorAll('[role="row"]')).filter(
    row => row.closest('[role="table"],[role="grid"],[role="treegrid"]') === table
  );
}

function getRowCells(row) {
  if (row.tagName === 'TR') return Array.from(row.cells);
  return Array.from(row.children).filter(
    c => ARIA_CELL_ROLES.has((c.getAttribute('role') ?? '').toLowerCase())
  );
}

function isList(el) {
  const r = el.getAttribute('role');
  if (r === 'list') return true;
  return ['UL', 'OL', 'DL'].includes(el.tagName);
}

function isListItem(el) {
  const r = el.getAttribute('role');
  if (r === 'listitem') return true;
  return el.tagName === 'LI';
}

function isFormField(node) {
  const r = node.getAttribute('role');
  if (['textbox', 'checkbox', 'radio', 'combobox', 'listbox', 'slider', 'spinbutton'].includes(r)) return true;
  const tag = node.tagName;
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return true;
  return false;
}

function isLandmark(node) {
  const r = node.getAttribute('role');
  const landmarks = ['banner', 'complementary', 'contentinfo', 'form', 'main', 'navigation', 'search', 'region'];
  if (landmarks.includes(r)) return true;
  const tag = node.tagName;
  if (['HEADER', 'FOOTER', 'MAIN', 'NAV', 'ASIDE', 'SECTION'].includes(tag)) {
    if (tag === 'SECTION' || tag === 'FORM') {
      return node.hasAttribute('aria-label') || node.hasAttribute('aria-labelledby');
    }
    return true;
  }
  return false;
}


function navigateToNext(matcher, isReverse) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) => {
      // Basic visibility check - skip entire subtrees if hidden
      const style = window.getComputedStyle(node);
      if (style && (style.display === 'none' || style.visibility === 'hidden')) return NodeFilter.FILTER_REJECT;
      if (node.getAttribute('aria-hidden') === 'true') return NodeFilter.FILTER_REJECT;

      if (matcher(node)) return NodeFilter.FILTER_ACCEPT;
      return NodeFilter.FILTER_SKIP; // Skip this node but check children
    }
  });

  const nodes = [];
  let currentNode = walker.nextNode();
  while (currentNode) {
    nodes.push(currentNode);
    currentNode = walker.nextNode();
  }

  if (nodes.length === 0) return;

  const activeElt = document.activeElement;
  let currentIndex = nodes.indexOf(activeElt);

  if (currentIndex === -1) {
    // If not currently on a matched node, find the closest one after the active element
    const closestAfterIndex = nodes.findIndex(n =>
      !!(activeElt.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING)
    );

    if (closestAfterIndex !== -1) {
      if (!isReverse) {
        currentIndex = closestAfterIndex - 1; // forward moves to closestAfterIndex
      } else {
        currentIndex = closestAfterIndex; // backward moves to closestAfterIndex - 1
      }
    } else {
      // All nodes are before the active element
      currentIndex = isReverse ? nodes.length : -1;
    }
  }

  let nextIndex = isReverse ? currentIndex - 1 : currentIndex + 1;

  // Looping logic
  if (nextIndex >= nodes.length) nextIndex = 0;
  if (nextIndex < 0) nextIndex = nodes.length - 1;

  const target = nodes[nextIndex];
  if (target) {
    if (!isNativelyFocusable(target) && target.getAttribute('tabindex') === null) {
      target.setAttribute('tabindex', '-1');
      managedTabindexes.add(target);
    }
    target.focus();
  }
}

function broadcastModeChange(mode) {
  if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
    chrome.runtime.sendMessage({ type: 'MODE_CHANGE', mode }).catch(() => {});
  }
}

function enterTableMode(table) {
  appState.mode = 'table';
  appState.tableContext.table = table;

  const rows = getTableRows(table);
  const firstRow = rows[0];
  const cells = firstRow ? getRowCells(firstRow) : [];
  const firstCell = cells[0];

  if (firstCell) {
    if (!isNativelyFocusable(firstCell) && firstCell.getAttribute('tabindex') === null) {
      firstCell.setAttribute('tabindex', '-1');
      managedTabindexes.add(firstCell);
    }
    firstCell.focus();
    appState.tableContext.rowIndex = 0;
    appState.tableContext.colIndex = 0;
  }

  broadcastModeChange('table');
}

function exitTableMode() {
  if (appState.mode !== 'table') return;

  appState.mode = 'navigation';
  const table = appState.tableContext.table;
  if (table) {
    table.querySelectorAll('td, th, [role="cell"], [role="gridcell"], [role="columnheader"], [role="rowheader"]')
      .forEach(cell => cleanupExtensionTabindex(cell));
    table.focus();
  }
  appState.tableContext.table = null;

  broadcastModeChange('navigation');
}

function moveInTable(direction) {
  const table = appState.tableContext.table;
  if (!table) return;

  const rows = getTableRows(table);
  if (!rows || rows.length === 0) return;

  let { rowIndex, colIndex } = appState.tableContext;

  if (direction === 'ArrowDown') rowIndex++;
  else if (direction === 'ArrowUp') rowIndex--;
  else if (direction === 'ArrowRight') colIndex++;
  else if (direction === 'ArrowLeft') colIndex--;

  if (rowIndex < 0 || rowIndex >= rows.length) return;

  const row = rows[rowIndex];
  const cells = getRowCells(row);
  if (colIndex < 0 || colIndex >= cells.length) return;

  const cell = cells[colIndex];
  if (cell) {
    appState.tableContext.rowIndex = rowIndex;
    appState.tableContext.colIndex = colIndex;

    if (!isNativelyFocusable(cell) && cell.getAttribute('tabindex') === null) {
      cell.setAttribute('tabindex', '-1');
      managedTabindexes.add(cell);
    }
    cell.focus();
  }
}


export function initNavigator() {
  document.addEventListener('keydown', (e) => {
    if (!simulationModeEnabled) return;

    const code = e.code;
    const isReverse = e.shiftKey;

    // Global Esc to exit Table Mode or reset
    if (code === 'Escape' && appState.mode === 'table') {
      e.preventDefault();
      exitTableMode();
      return;
    }

    // Table Mode specific keys (No Alt required)
    if (appState.mode === 'table') {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
        e.preventDefault();
        moveInTable(code);
        return;
      }
    }

    // Enter to enter Table Mode when on a table
    if (code === 'Enter' && appState.mode === 'navigation') {
      const active = document.activeElement;
      if (isTable(active)) {
        e.preventDefault();
        enterTableMode(active);
        return;
      }
    }


    if (!e.altKey) return; // All other shortcuts require Alt key

    let isMatch = null;
    switch (code) {
      case 'KeyH': isMatch = isHeading; break;
      case 'KeyK': isMatch = isLink; break;
      case 'KeyL': isMatch = isList; break;
      case 'KeyI': isMatch = isListItem; break;
      case 'KeyB': isMatch = isButton; break;
      case 'KeyG': isMatch = isGraphic; break;
      case 'KeyT': isMatch = isTable; break;
      case 'KeyF': isMatch = isFormField; break;
      case 'KeyD': isMatch = isLandmark; break;
      default: return; // Not a navigation key
    }


    if (isMatch) {
      // It's a matching navigation interaction
      e.preventDefault();
      e.stopPropagation();
      navigateToNext(isMatch, isReverse);
    }
  }, true); // use capture phase to intercept early
}
