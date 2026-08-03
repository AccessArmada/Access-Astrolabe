import { VALID_ARIA_ROLES } from './roles.js';

/**
 * suggestions.js
 *
 * Computes accessibility anti-pattern suggestions for the currently focused element.
 * Runs in the content script alongside computeTrace() on every focus event.
 *
 * @param {HTMLElement} element
 * @param {string} computedName
 * @returns {Array<{ category: 'critical'|'best-practice'|'content', icon: string, message: string }>}
 */
export function computeSuggestions(element, computedName = '', effectiveRole = null) {
  if (!element || element.nodeType !== 1) return [];

  try {
    const suggestions = [];
    const tag = element.tagName.toLowerCase();
    const explicitRole = element.getAttribute('role')?.toLowerCase() ?? '';

    // Implicit roles
    const getImplicitRole = (el) => {
      const t = el.tagName.toLowerCase();
      if (t === 'input') {
        const type = el.getAttribute('type')?.toLowerCase();
        if (type === 'number') return 'spinbutton';
        if (type === 'range') return 'slider';
        if (type === 'checkbox') return 'checkbox';
        if (type === 'radio') return 'radio';
        if (type === 'submit' || type === 'button' || type === 'reset') return 'button';
        if (type === 'search') return 'searchbox';
        return 'textbox';
      }
      if (t === 'button') return 'button';
      if (t === 'a' && el.hasAttribute('href')) return 'link';
      if (t === 'select') return 'listbox';
      if (t === 'textarea') return 'textbox';
      return '';
    };

    const role = explicitRole || getImplicitRole(element);

    const REDUNDANT_ROLES = {
      nav: 'navigation', main: 'main', header: 'banner', footer: 'contentinfo',
      aside: 'complementary', section: 'region', form: 'form',
      button: 'button', article: 'article', a: 'link', h1: 'heading',
      h2: 'heading', h3: 'heading', h4: 'heading', h5: 'heading', h6: 'heading',
    };

    // ─── Helpers ────────────────────────────────────────────────────────────────

    const safeEscape = (str) => {
      if (typeof CSS !== 'undefined' && CSS.escape) {
        return CSS.escape(str);
      }
      // Simple fallback for test environment (JSDOM might lack CSS.escape)
      return str.replace(/([!"#$%&'()*+,.\/:;<=>?@\[\\\]^`{|}~])/g, "\\$1");
    };

    const hasLabel = () =>
      element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby');

    const isInteractiveRole = (roleName) =>
      ['button', 'link', 'checkbox', 'radio', 'menuitem', 'tab',
        'option', 'combobox', 'listbox', 'switch', 'textbox', 'searchbox', 'spinbutton', 'slider'].includes(roleName);

    const isInteractiveElement = (el) => {
      const t = el.tagName?.toLowerCase();
      const r = el.getAttribute('role')?.toLowerCase();
      return ['a', 'button', 'input', 'select', 'textarea'].includes(t) || isInteractiveRole(r);
    };

    const getComputedLabel = () =>
      element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '';

    const safeQuerySelectorAll = (selector) => {
      try {
        return element.ownerDocument?.querySelectorAll(selector) ?? [];
      } catch (e) {
        return [];
      }
    };

    // ─── Critical Rules ──────────────────────────────────────────────────────────

    // Rule 9: Hidden but focusable
    const isAriaHidden = element.getAttribute('aria-hidden') === 'true';
    const isDomHidden = element.hasAttribute('hidden');
    const nativeFocusable = ['a', 'button', 'input', 'textarea', 'select', 'details', 'iframe'].includes(tag);
    const isFocusable = element.tabIndex >= 0 || nativeFocusable;
    if ((isAriaHidden || isDomHidden) && isFocusable) {
      suggestions.push({
        category: 'critical', icon: '❌',
        message: "Element is hidden from screen readers but remains focusable. Use tabindex='-1' or display:none to hide it from everyone.",
        url: "https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA1",
        urlTitle: "WCAG: Using aria-hidden"
      });
    }

    // Rule 14: Placeholder as label
    if (['input', 'textarea'].includes(tag) && element.hasAttribute('placeholder')) {
      const eid = element.getAttribute('id');
      const doc = element.ownerDocument;
      const hasForLabel = !!(eid && doc && doc.querySelector(`label[for="${safeEscape(eid)}"]`));
      let hasWrappingLabel = false;
      let p = element.parentElement;
      while (p) {
        if (p.tagName && p.tagName.toLowerCase() === 'label') { hasWrappingLabel = true; break; }
        p = p.parentElement;
      }
      if (!hasLabel() && !hasForLabel && !hasWrappingLabel) {
        suggestions.push({
          category: 'critical', icon: '❌',
          message: "Placeholder text is not a valid label substitute. Add a permanent <label> or aria-label so users know what to type even after the field is filled.",
          url: "https://www.w3.org/WAI/tutorials/forms/labels/",
          urlTitle: "W3C: Form Labeling Tutorial"
        });
      }
    }

    // Rule: Universal label-missing fallback
    const isCurrentElementInteractive = isInteractiveElement(element);

    if (isCurrentElementInteractive) {
      // If computedName is empty, try a basic local check (for tests/cases where trace isn't run)
      const localName = computedName || getComputedLabel();

      if (!localName || localName.trim().length === 0) {
        // Only add general error if we haven't already added a specific label error
        const alreadyHasLabelError = suggestions.some(s => s.message.includes('label') || s.message.includes('name'));

        if (!alreadyHasLabelError) {
          const labelType = role ? `role="${role}"` : `<${tag}>`;
          suggestions.push({
            category: 'critical', icon: '❌',
            message: `This ${labelType} is missing an accessible name. Without a label, screen readers will announce only the role, leaving users with no context.`,
            url: "https://www.w3.org/WAI/tutorials/forms/labels/",
            urlTitle: "W3C: Form Labeling Tutorial"
          });
        }
      }
    }

    // Rule: label-title-only
    if (['input', 'textarea', 'select'].includes(tag) || isInteractiveRole(explicitRole)) {
      const eid = element.getAttribute('id');
      const doc = element.ownerDocument;
      const hasForLabel = !!(eid && doc && doc.querySelector(`label[for="${safeEscape(eid)}"]`));
      let hasWrappingLabel = false;
      let p = element.parentElement;
      while (p) {
        if (p.tagName && p.tagName.toLowerCase() === 'label') { hasWrappingLabel = true; break; }
        p = p.parentElement;
      }

      if (!hasLabel() && !hasForLabel && !hasWrappingLabel && element.hasAttribute('title')) {
        suggestions.push({
          category: 'best-practice', icon: '💡',
          message: "Using only a title attribute for a label is unreliable. Use a <label> element or aria-label instead.",
          url: "https://www.w3.org/WAI/WCAG22/Techniques/html/H65",
          urlTitle: "WCAG: Title Attribute Usage"
        });
      }
    }

    // Rule 17: SVG without accessible name
    if (tag === 'svg') {
      const hasSvgLabel = hasLabel();
      const hasSvgTitle = !!element.querySelector('title');
      const hasRoleImg = explicitRole === 'img';
      if (!hasSvgLabel && !hasSvgTitle && !hasRoleImg) {
        suggestions.push({
          category: 'critical', icon: '❌',
          message: "This SVG has no accessible name. Add role='img' and aria-label, or a <title> element inside the SVG.",
          url: "https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/img_role",
          urlTitle: "MDN: SVG Accessibility"
        });
      }
    }

    // Rule 18: iframe without title
    if (tag === 'iframe' && !element.hasAttribute('title')) {
      suggestions.push({
        category: 'critical', icon: '❌',
        message: "iframes must have a title attribute so screen readers can describe what the frame contains.",
        url: "https://www.w3.org/WAI/WCAG22/Techniques/html/H64",
        urlTitle: "WCAG: iframe Titles"
      });
    }

    // Rule: dialog-name
    if (explicitRole === 'dialog' || explicitRole === 'alertdialog') {
      if (!hasLabel() && !element.getAttribute('title')) {
        suggestions.push({
          category: 'critical', icon: '❌',
          message: "Dialogs must have an accessible name (usually via aria-labelledby) so users know what the popup is for.",
          url: "https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/",
          urlTitle: "W3C: Dialog Pattern"
        });
      }
    }

    // Rule: empty-heading
    if (/^h[1-6]$/.test(tag) || explicitRole === 'heading') {
      if (!element.textContent?.trim().length && !element.querySelector('img[alt]') && !element.querySelector('svg title')) {
        suggestions.push({
          category: 'critical', icon: '❌',
          message: "Empty heading detected. Headings should contain text to help screen reader users navigate the page.",
          url: "https://www.w3.org/WAI/tutorials/page-structure/headings/",
          urlTitle: "W3C: Heading Structure"
        });
      }
    }

    // Rule: button-name (inputs)
    if (tag === 'input' && ['submit', 'button', 'reset'].includes(element.type)) {
      if (!element.value?.trim() && !hasLabel() && !element.getAttribute('title')) {
        suggestions.push({
          category: 'critical', icon: '❌',
          message: "This input button has no discernible text. Screen readers will announce it without context.",
          url: "https://www.w3.org/WAI/WCAG22/Techniques/html/H36",
          urlTitle: "WCAG: Button Naming"
        });
      }
    }

    // Rule 21: aria-describedby pointing to hidden element
    if (element.hasAttribute('aria-describedby')) {
      const ids = element.getAttribute('aria-describedby').split(/\s+/).filter(Boolean);
      const allHidden = ids.every(id => {
        const target = element.ownerDocument?.getElementById(id);
        if (!target) return true;
        return target.getAttribute('aria-hidden') === 'true' ||
          target.hasAttribute('hidden') ||
          target.hidden === true;
      });
      if (allHidden && ids.length > 0) {
        suggestions.push({
          category: 'critical', icon: '❌',
          message: "aria-describedby references a hidden element. The description exists in code but is invisible to screen readers.",
          url: "https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA1",
          urlTitle: "WCAG: ARIA Hidden Relationships"
        });
      }
    }

    // Rule: aria-required-attr
    const REQUIRED_ATTRS = {
      checkbox: ['aria-checked'],
      radio: ['aria-checked'],
      switch: ['aria-checked'],
      scrollbar: ['aria-controls', 'aria-valuenow'],
      slider: ['aria-valuenow'],
      spinbutton: ['aria-valuenow'],
      combobox: ['aria-expanded', 'aria-controls'],
      tab: ['aria-selected'],
      treeitem: ['aria-selected']
    };
    if (REQUIRED_ATTRS[explicitRole]) {
      REQUIRED_ATTRS[explicitRole].forEach(attr => {
        if (!element.hasAttribute(attr)) {
          suggestions.push({
            category: 'critical', icon: '❌',
            message: `This role="${explicitRole}" requires the ${attr} attribute to be accessible.`,
            url: "https://www.w3.org/TR/wai-aria-1.2/#role_definitions",
            urlTitle: "W3C: ARIA Role Definitions"
          });
        }
      });
    }

    // Rule: aria-required-parent
    const REQUIRED_PARENTS = {
      option: { parents: ['listbox'], url: 'https://www.w3.org/WAI/ARIA/apg/patterns/listbox/', title: 'W3C: Listbox Pattern' },
      tab: { parents: ['tablist'], url: 'https://www.w3.org/WAI/ARIA/apg/patterns/tabs/', title: 'W3C: Tabs Pattern' },
      treeitem: { parents: ['tree'], url: 'https://www.w3.org/WAI/ARIA/apg/patterns/treeview/', title: 'W3C: Treeview Pattern' },
      menuitem: { parents: ['menu', 'menubar'], url: 'https://www.w3.org/WAI/ARIA/apg/patterns/menu/', title: 'W3C: Menu Pattern' },
      menuitemcheckbox: { parents: ['menu', 'menubar'], url: 'https://www.w3.org/WAI/ARIA/apg/patterns/menu/', title: 'W3C: Menu Pattern' },
      menuitemradio: { parents: ['menu', 'menubar'], url: 'https://www.w3.org/WAI/ARIA/apg/patterns/menu/', title: 'W3C: Menu Pattern' },
      row: { parents: ['table', 'grid', 'rowgroup', 'treegrid'], url: 'https://www.w3.org/WAI/ARIA/apg/patterns/grid/', title: 'W3C: Grid Pattern' },
      cell: { parents: ['row'], url: 'https://www.w3.org/WAI/ARIA/apg/patterns/table/', title: 'W3C: Table Pattern' },
      gridcell: { parents: ['row'], url: 'https://www.w3.org/WAI/ARIA/apg/patterns/grid/', title: 'W3C: Grid Pattern' },
      rowheader: { parents: ['row'], url: 'https://www.w3.org/WAI/ARIA/apg/patterns/grid/', title: 'W3C: Grid Pattern' },
      columnheader: { parents: ['row'], url: 'https://www.w3.org/WAI/ARIA/apg/patterns/grid/', title: 'W3C: Grid Pattern' }
    };

    if (REQUIRED_PARENTS[explicitRole]) {
      const { parents, url, title } = REQUIRED_PARENTS[explicitRole];
      let found = false;
      let p = element.parentElement;
      while (p) {
        const pRole = p.getAttribute('role')?.toLowerCase();
        if (parents.includes(pRole)) { found = true; break; }
        p = p.parentElement;
      }
      if (!found) {
        suggestions.push({
          category: 'critical', icon: '❌',
          message: `This role="${explicitRole}" must be nested inside a ${parents.join(' or ')} to be announced correctly.`,
          url: url,
          urlTitle: title
        });
      }
    }

    // Rule: nested-interactive
    if (isCurrentElementInteractive) {
      const nestedInteractive = element.querySelector('a, button, input, select, textarea, [role="button"], [role="link"], [role="checkbox"]');
      if (nestedInteractive) {
        suggestions.push({
          category: 'critical', icon: '❌',
          message: "Nested interactive elements detected. This causes focus traps and conflicting announcements.",
          url: "https://www.w3.org/WAI/WCAG22/Understanding/keyboard",
          urlTitle: "WCAG: Keyboard Interactions"
        });
      }
    }

    // Rule: aria-deprecated-role
    const DEPRECATED_ROLES = ['directory', 'note'];
    if (DEPRECATED_ROLES.includes(explicitRole)) {
      suggestions.push({
        category: 'best-practice', icon: '💡',
        message: `The role="${explicitRole}" is deprecated or discouraged. Use a more modern ARIA role or semantic HTML instead.`,
        url: "https://www.w3.org/TR/wai-aria-1.2/#deprecations",
        urlTitle: "W3C: ARIA Deprecations"
      });
    }

    // ─── Best Practice Rules ─────────────────────────────────────────────────────
    // Rule: target-size
    const rect = element.getBoundingClientRect?.();
    if (rect && (rect.width > 0 || rect.height > 0)) {
      if (rect.width < 24 || rect.height < 24) {
        if (isCurrentElementInteractive) {
          suggestions.push({
            category: 'best-practice', icon: '📏',
            message: "This element is very small (< 24px). Consider increasing its size to make it easier for all users to activate.",
            url: "https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum",
            urlTitle: "WCAG: Target Size"
          });
        }
      }
    }

    // Rule: td-has-header
    if (tag === 'td') {
      const table = element.closest('table');
      if (table && table.getAttribute('role') !== 'presentation' && table.getAttribute('role') !== 'none') {
        const hasTh = !!table.querySelector('th');
        if (!hasTh) {
          suggestions.push({
            category: 'best-practice', icon: '📊',
            message: "This table cell is not associated with a header. Data table users may lose context for this cell.",
            url: "https://www.w3.org/WAI/tutorials/tables/",
            urlTitle: "W3C: Table Accessibility"
          });
        }
      }
    }

    // Rule: duplicate-id-aria
    const attrWithIds = ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'aria-flowto'];
    attrWithIds.forEach(attr => {
      if (element.hasAttribute(attr)) {
        const ids = element.getAttribute(attr).split(/\s+/).filter(Boolean);
        ids.forEach(id => {
          const matches = safeQuerySelectorAll(`[id="${safeEscape(id)}"]`);
          if (matches && matches.length > 1) {
            suggestions.push({
              category: 'critical', icon: '❌',
              message: `Multiple elements have the same ID "${id}". This breaks the relationship for ARIA controls.`,
              url: "https://www.w3.org/WAI/WCAG22/Understanding/parsing",
              urlTitle: "WCAG: Duplicate IDs"
            });
          }
        });
      }
    });

    // Rule: Landmark Rules (scoped to focus)
    const landmarkRoles = ['main', 'navigation', 'banner', 'contentinfo', 'complementary', 'search', 'region'];
    const currentRole = explicitRole || REDUNDANT_ROLES[tag];
    if (landmarkRoles.includes(currentRole)) {
      const sameRoleElements = Array.from(safeQuerySelectorAll(currentRole === 'main' ? 'main, [role="main"]' : `[role="${safeEscape(currentRole)}"]`))
        .concat(currentRole === 'navigation' ? Array.from(safeQuerySelectorAll('nav')) : [])
        .concat(currentRole === 'banner' ? Array.from(safeQuerySelectorAll('header')) : [])
        .concat(currentRole === 'contentinfo' ? Array.from(safeQuerySelectorAll('footer')) : []);

      const uniqueElements = new Set(sameRoleElements);
      if (uniqueElements.size > 1) {
        if (currentRole === 'main') {
          suggestions.push({
            category: 'critical', icon: '❌',
            message: "Landmark issue: Multiple main regions detected. Ensure there is only one primary content area.",
            url: "https://www.w3.org/WAI/tutorials/page-structure/landmarks/",
            urlTitle: "W3C: Page Landmarks"
          });
        } else {
          const landmarkHasLabel = (el) => el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby');
          const allLabeled = Array.from(uniqueElements).every(landmarkHasLabel);
          if (!allLabeled) {
            suggestions.push({
              category: 'best-practice', icon: '💡',
              message: `Landmark issue: Multiple ${currentRole} regions detected. Landmarks should be unique or have distinct labels.`,
              url: "https://www.w3.org/WAI/tutorials/page-structure/landmarks/",
              urlTitle: "W3C: Page Landmarks"
            });
          }
        }
      }
    }

    // Rule 1: Redundant ARIA role on semantic element
    if (explicitRole && REDUNDANT_ROLES[tag] === explicitRole) {
      suggestions.push({
        category: 'best-practice', icon: '💡',
        message: `The role="${explicitRole}" attribute is redundant on <${tag}>. Semantic HTML already communicates this role to screen readers.`,
        url: "https://www.w3.org/TR/html-aria/#docconformance",
        urlTitle: "W3C: Redundant ARIA"
      });
    }

    // Rule 2: aria-label on non-interactive generic element
    if (['div', 'span'].includes(tag) && hasLabel()) {
      if (!isInteractiveRole(explicitRole) && element.tabIndex < 0) {
        suggestions.push({
          category: 'best-practice', icon: '💡',
          message: "Screen readers may ignore aria-label on non-interactive generic elements. Use visible text or a semantic landmark instead.",
          url: "https://www.w3.org/TR/using-aria/#label-support",
          urlTitle: "W3C: Label Support"
        });
      }
    }

    // Rule 3: div/span with onclick but no role or tabindex
    if (['div', 'span'].includes(tag) && element.hasAttribute('onclick')) {
      if (!explicitRole || element.tabIndex < 0) {
        suggestions.push({
          category: 'best-practice', icon: '💡',
          message: "This element has a click handler but is not keyboard-accessible. Replace with <button>, or add role='button' and tabindex='0'.",
          url: "https://www.w3.org/WAI/WCAG22/Understanding/keyboard",
          urlTitle: "WCAG: Keyboard Accessibility"
        });
      }
    }

    // Rule 7: fake-table div
    const fakeTableAncestor = element.closest('div[class*="table"], div[id*="table"]');
    if (fakeTableAncestor) {
      const ancestorRole = fakeTableAncestor.getAttribute('role');
      if (!ancestorRole || !['table', 'grid', 'treegrid'].includes(ancestorRole)) {
        suggestions.push({
          category: 'best-practice', icon: '💡',
          message: "A div appears to be used as a table without ARIA roles. Add role='table', role='row', and role='cell' to the appropriate elements.",
          url: "https://www.w3.org/WAI/tutorials/tables/",
          urlTitle: "W3C: Table Accessibility"
        });
      }
    }

    // Rule 8 & 19: ancestor table checks
    const ancestorTable = element.closest('table');
    if (ancestorTable) {
      const hasTh = !!ancestorTable.querySelector('th');
      const hasPresentation =
        ancestorTable.getAttribute('role') === 'presentation' ||
        ancestorTable.getAttribute('role') === 'none';

      if (!hasPresentation) {
        if (!hasTh) {
          suggestions.push({
            category: 'best-practice', icon: '💡',
            message: "This table has no header cells (<th>). If it is used for layout only, add role='presentation' so screen readers ignore the grid structure.",
            url: "https://www.w3.org/WAI/tutorials/tables/layout/",
            urlTitle: "W3C: Layout Tables"
          });
        } else {
          const hasCaption = !!ancestorTable.querySelector('caption');
          const hasTableLabel =
            ancestorTable.hasAttribute('aria-label') ||
            ancestorTable.hasAttribute('aria-labelledby');
          if (!hasCaption && !hasTableLabel) {
            suggestions.push({
              category: 'best-practice', icon: '💡',
              message: "This data table has no caption or aria-label. Add a <caption> or aria-label so users understand the table's purpose before navigating it.",
              url: "https://www.w3.org/WAI/tutorials/tables/caption-summary/",
              urlTitle: "W3C: Table Captions"
            });
          }
        }
      }
    }

    // Rule 12: inside assertive live region (non-alert)
    const assertiveRegion = element.closest('[aria-live="assertive"]');
    if (assertiveRegion && assertiveRegion.getAttribute('role') !== 'alert') {
      suggestions.push({
        category: 'best-practice', icon: '💡',
        message: "This element is inside an assertive live region. Use aria-live='polite' for non-urgent updates to avoid interrupting screen reader users.",
        url: "https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions",
        urlTitle: "MDN: ARIA Live Regions"
      });
    }

    // Rule 13: heading level skip
    if (/^h[1-6]$/.test(tag) || explicitRole === 'heading') {
      const level = /^h([1-6])$/.test(tag)
        ? parseInt(tag[1])
        : parseInt(element.getAttribute('aria-level') || '2');

      const allHeadings = Array.from(
        element.ownerDocument?.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]') ?? []
      );
      const idx = allHeadings.indexOf(element);
      if (idx > 0) {
        const prev = allHeadings[idx - 1];
        const prevLevel = /^H([1-6])$/.test(prev.tagName)
          ? parseInt(prev.tagName[1])
          : parseInt(prev.getAttribute('aria-level') || '2');
        if (level > prevLevel + 1) {
          suggestions.push({
            category: 'best-practice', icon: '💡',
            message: `Heading level skip detected (h${prevLevel} → h${level}). Maintain a sequential hierarchy (h1→h2→h3) to help users understand page structure.`,
            url: "https://www.w3.org/WAI/tutorials/page-structure/headings/",
            urlTitle: "W3C: Heading Structure"
          });
        }
      }
    }

    // Rule 15: positive tabindex
    if (element.tabIndex > 0) {
      suggestions.push({
        category: 'best-practice', icon: '💡',
        message: "Positive tabindex values disrupt the natural focus order. Use tabindex='0' to make elements focusable without reordering.",
        url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/tabindex",
        urlTitle: "MDN: tabindex"
      });
    }

    // Rule 16: role="button" on an anchor with href
    if (tag === 'a' && element.hasAttribute('href') && explicitRole === 'button') {
      suggestions.push({
        category: 'best-practice', icon: '💡',
        message: "Links navigate; buttons perform actions. Using role='button' on an anchor confuses assistive technology users. Use a <button> element instead.",
        url: "https://www.w3.org/WAI/WCAG22/Understanding/name-role-value",
        urlTitle: "WCAG: Link vs Button"
      });
    }

    // ─── Content Quality Rules ───────────────────────────────────────────────────

    // Rule 4: Redundant alt prefix
    if (['img', 'area', 'input'].includes(tag) && element.hasAttribute('alt')) {
      const alt = element.getAttribute('alt').trim().toLowerCase();
      if (/^(image of|photo of|graphic of|picture of|icon of)/.test(alt)) {
        suggestions.push({
          category: 'content', icon: '✍️',
          message: "Screen readers already announce 'Graphic'. Start alt text directly with the description (e.g. 'Golden Retriever' not 'Image of a dog').",
          url: "https://www.w3.org/WAI/tutorials/images/tips/",
          urlTitle: "W3C: Alt Text Tips"
        });
      }
    }

    // Rule 5: Filename-looking alt text
    if (['img', 'area'].includes(tag) && element.hasAttribute('alt')) {
      const alt = element.getAttribute('alt').trim();
      if (/\.(jpe?g|png|gif|webp|svg|bmp|tiff?)$/i.test(alt) || /^[\w]+([-_][\w]+){2,}$/.test(alt)) {
        suggestions.push({
          category: 'content', icon: '✍️',
          message: "This alt text looks like a filename. Replace it with a descriptive sentence, or use alt='' if the image is purely decorative.",
          url: "https://www.w3.org/WAI/tutorials/images/decision-tree/",
          urlTitle: "W3C: Alt Decision Tree"
        });
      }
    }

    // Rule 6: Link + image label redundancy
    if (tag === 'a' && element.hasAttribute('aria-label')) {
      const linkLabel = element.getAttribute('aria-label').trim().toLowerCase();
      const img = element.querySelector('img[alt]');
      if (img && img.getAttribute('alt').trim().toLowerCase() === linkLabel) {
        suggestions.push({
          category: 'content', icon: '✍️',
          message: "The image alt text and link label are identical. This will be read twice. Clear the image alt: alt=''.",
          url: "https://www.w3.org/WAI/tutorials/images/functional/",
          urlTitle: "W3C: Functional Images"
        });
      }
    }

    // Rule 11: Ambiguous link text
    if ((tag === 'a' || explicitRole === 'link') && element.hasAttribute('href')) {
      const AMBIGUOUS = ['click here', 'read more', 'learn more', 'more', 'here', 'link', 'this link', 'continue', 'details'];
      const linkText = element.textContent?.trim().toLowerCase() ?? '';
      if (AMBIGUOUS.includes(linkText)) {
        suggestions.push({
          category: 'content', icon: '✍️',
          message: "Ambiguous link text. Make it descriptive so it makes sense out of context (e.g. 'Read our Privacy Policy' instead of 'Read more').",
          url: "https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context",
          urlTitle: "WCAG: Link Purpose"
        });
      }
    }

    // Rule 20: Role name repeated in label
    const ROLE_NAMES = {
      nav: 'navigation', button: 'button', link: 'link',
      checkbox: 'checkbox', radio: 'radio', main: 'main',
      header: 'banner', footer: 'contentinfo', aside: 'complementary',
      img: 'image', input: 'input', select: 'select', textarea: 'textarea',
    };
    const ROLE_WORDS_EXPLICIT = {
      navigation: 'navigation', button: 'button', link: 'link',
      checkbox: 'checkbox', radio: 'radio', heading: 'heading',
    };
    const roleWord = ROLE_WORDS_EXPLICIT[explicitRole] || ROLE_NAMES[tag];
    const computedLabelStr = getComputedLabel().toLowerCase();
    if (roleWord && computedLabelStr.includes(roleWord) && computedLabelStr.length > roleWord.length) {
      suggestions.push({
        category: 'content', icon: '✍️',
        message: `The label includes the role name ("${roleWord}"). Screen readers already announce the role, so this will be read twice. Remove the role word from the label.`,
        url: "https://www.w3.org/TR/using-aria/#label-support",
        urlTitle: "W3C: Label Support"
      });
    }

    // ─── Hybrid Mentor Heuristics (Intent-Based) ──────────────────────────────

    const identifier = (element.id + ' ' + element.className).toLowerCase();
    const hasAriaExpanded = element.hasAttribute('aria-expanded');

    // Rule: Accordion / FAQ
    if (!hasAriaExpanded && (identifier.includes('accordion') || identifier.includes('faq') || identifier.includes('collapse') || identifier.includes('expand'))) {
      suggestions.push({
        category: 'best-practice', icon: '🤔',
        message: "Is this an accordion or FAQ item? If so, it looks like it is not announcing whether it is expanded. Consider adding aria-expanded.",
        url: "https://www.w3.org/WAI/ARIA/apg/patterns/accordion/",
        urlTitle: "W3C: Accordion Pattern"
      });
    }

    // Rule: Mobile Nav
    if (!hasAriaExpanded && (identifier.includes('hamburger') || identifier.includes('nav-toggle') || identifier.includes('mobile-nav') || identifier.includes('mobile-navigation'))) {
      suggestions.push({
        category: 'best-practice', icon: '🤔',
        message: "Is this a mobile menu toggle? If so, consider adding aria-expanded so users know if the menu is open.",
        url: "https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/",
        urlTitle: "W3C: Disclosure Pattern"
      });
    }

    // Rule: Popup Trigger
    if (!hasAriaExpanded && element.hasAttribute('aria-haspopup')) {
      suggestions.push({
        category: 'best-practice', icon: '🤔',
        message: "This element triggers a popup but doesn't communicate its state. Add aria-expanded to tell users if it is open.",
        url: "https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/",
        urlTitle: "W3C: Menu Button Pattern"
      });
    }

    // ─── Role Resolution Conflicts ───────────────────────────────────────────────

    const explicitRoleAttr = element.getAttribute('role')?.trim() ?? '';
    const explicitTokens = explicitRoleAttr ? explicitRoleAttr.split(/\s+/) : [];

    if (explicitTokens.length > 0) {

      // Case 1: All tokens are unrecognized — role silently fell back to implicit
      const validTokens = explicitTokens.filter(t => VALID_ARIA_ROLES.has(t));
      if (validTokens.length === 0) {
        suggestions.push({
          category: 'critical', icon: '❌',
          message: `The role="${explicitRoleAttr}" attribute contains no recognized ARIA roles. The browser ignored it and fell back to the implicit role. Check for typos.`,
          url: "https://www.w3.org/TR/wai-aria-1.2/#role_definitions",
          urlTitle: "W3C: ARIA Role Definitions"
        });
      }

      // Case 2: Multiple tokens, first valid one won — others silently ignored
      else if (explicitTokens.length > 1) {
        const ignoredTokens = explicitTokens.filter(t => t !== validTokens[0]);
        if (ignoredTokens.length > 0) {
          suggestions.push({
            category: 'best-practice', icon: '💡',
            message: `Multiple roles specified: "${explicitRoleAttr}". Only the first valid token ("${validTokens[0]}") is used. The others (${ignoredTokens.map(t => `"${t}"`).join(', ')}) are ignored.`,
            url: "https://www.w3.org/TR/wai-aria-1.2/#host_languages",
            urlTitle: "W3C: ARIA Role Attribute"
          });
        }
      }

      // Case 3: presentation/none specified but DOM conditions mean it will be ignored
      const presentationAttempted = explicitTokens.includes('presentation') || explicitTokens.includes('none');
      if (presentationAttempted) {
        const nativeFocusableTags = ['a', 'button', 'input', 'textarea', 'select', 'details', 'iframe'];
        const isFocusableElement = element.tabIndex >= 0 || nativeFocusableTags.includes(tag);
        const hasGlobalAriaAttr = [
          'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-owns',
          'aria-controls', 'aria-haspopup', 'aria-live', 'aria-atomic',
          'aria-relevant', 'aria-busy'
        ].some(attr => element.hasAttribute(attr));

        if (isFocusableElement || hasGlobalAriaAttr) {
          const reason = isFocusableElement
            ? 'the element is focusable'
            : 'the element has global ARIA attributes';
          const attemptedToken = explicitTokens.includes('presentation') ? 'presentation' : 'none';
          const effectiveRoleClause = effectiveRole
            ? `The element's effective role is "${effectiveRole}".`
            : 'The element has no meaningful implicit role.';
          suggestions.push({
            category: 'critical', icon: '❌',
            message: `role="${attemptedToken}" was specified but is being ignored because ${reason}. ${effectiveRoleClause} Remove the ${attemptedToken} role or make the element non-focusable.`,
            url: "https://www.w3.org/TR/wai-aria-1.2/#presentation",
            urlTitle: "W3C: Presentation Role"
          });
        }
      }
    }

    return suggestions;
  } catch (globalErr) {
    console.error("Screen Reader Inspector: Suggestion engine internal error:", globalErr);
    return [];
  }
}
