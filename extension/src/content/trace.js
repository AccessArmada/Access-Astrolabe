/**
 * Computes an explainability trace for the Accessible Name computation.
 * This decision tree documents why an element has a specific accessible name.
 *
 * @param {HTMLElement} element - The DOM element to analyze.
 * @returns {Array<Object>} An array of trace steps detailing the computation process.
 */

function getAssociatedLabels(element) {
  return element.labels ? Array.from(element.labels) : [];
}

const SKIP_TAGS = new Set(['script', 'style', 'noscript']);

function resolveDescendantText(element) {
  const parts = [];
  const details = [];
  for (const node of element.childNodes) {
    if (node.nodeType === 3) {
      const text = node.textContent.trim();
      if (text) {
        parts.push(text);
        details.push({ nodeType: 'text', value: text });
      }
    } else if (node.nodeType === 1) {
      // Skip non-visible structural tags
      if (SKIP_TAGS.has(node.tagName.toLowerCase())) continue;

      // Skip aria-hidden / hidden nodes — record them as excluded
      const isAriaHidden = node.getAttribute('aria-hidden') === 'true';
      const isHidden = isAriaHidden || node.hasAttribute('hidden') || node.hidden === true;
      if (isHidden) {
        const hiddenText = node.textContent.trim();
        if (hiddenText) {
          details.push({ nodeType: 'text', value: hiddenText, excluded: true, reason: 'aria-hidden' });
        }
        continue;
      }

      const label = node.getAttribute('aria-label');
      if (label && label.trim()) {
        parts.push(label.trim());
        details.push({ nodeType: 'aria-label', value: label.trim() });
        const innerText = node.textContent.trim();
        if (innerText) details.push({ nodeType: 'text', value: innerText, overridden: true });
      } else {
        const nested = resolveDescendantText(node);
        if (nested.text) {
          parts.push(nested.text);
          details.push(...nested.details);
        } else {
          // No text contributed but there may be excluded details to surface
          details.push(...nested.details);
        }
      }
    }
  }
  return { text: parts.join(' '), details };
}

export function computeTrace(element) {
  if (!element || element.nodeType !== 1) return [];

  const trace = [];
  const tag = element.tagName.toLowerCase();

  // 1. Is it hidden but focusable? (Conflict)
  const style = getComputedStyle(element);
  const isHidden = element.getAttribute('aria-hidden') === 'true' ||
                   element.hasAttribute('hidden') ||
                   (style && style.display === 'none');
  const isFocusable = element.tabIndex >= 0 ||
                      ['a', 'button', 'input', 'textarea', 'select', 'details'].includes(tag);

  if (isHidden && isFocusable) {
    trace.push({
      step: 'Conflict Warning',
      value: 'Element is hidden from screen readers but remains focusable. This is an accessibility violation.',
      type: 'error'
    });
  }

  let nameFound = false;

  // 2. aria-labelledby
  if (element.hasAttribute('aria-labelledby')) {
    const labelledby = element.getAttribute('aria-labelledby');
    const ids = labelledby.split(/\s+/).filter(Boolean);
    const refs = ids.map(id => document.getElementById(id));
    const isValid = refs.length > 0 && refs.every(r => r);

    const details = ids.map((id, i) => {
      const ref = refs[i];
      if (ref) {
        return { id, found: true, computedValue: ref.textContent.trim(), snippet: ref.outerHTML.replace(/\s+/g, ' ').substring(0, 120) };
      }
      return { id, found: false };
    });
    const resolvedText = details.filter(d => d.found).map(d => d.computedValue).join(' ');
    const value = isValid
      ? `Present: "${resolvedText}"`
      : resolvedText
        ? `Present: "${resolvedText}" (some references not found)`
        : `Present: "${labelledby}" (references not found)`;

    trace.push({
      step: 'aria-labelledby attribute',
      value,
      type: isValid ? 'success' : 'warning',
      details
    });
    if (isValid) nameFound = true;
  } else {
    trace.push({
      step: 'aria-labelledby attribute',
      value: 'Not present',
      type: 'info'
    });
  }

  // 3. aria-label
  if (element.hasAttribute('aria-label')) {
    const isWinner = !nameFound && element.getAttribute('aria-label').trim().length > 0;
    trace.push({
      step: 'aria-label attribute',
      value: `Present: "${element.getAttribute('aria-label')}"${!isWinner && !nameFound ? '' : (!isWinner ? ' (Ignored: overridden)' : '')}`,
      type: isWinner ? 'success' : 'info'
    });
    if (isWinner) nameFound = true;
  } else {
    trace.push({
      step: 'aria-label attribute',
      value: 'Not present',
      type: 'info'
    });
  }

  // 4. Associated label elements (for form controls)
  if (['input', 'textarea', 'select'].includes(tag)) {
    if (nameFound) {
      const ignoredLabels = getAssociatedLabels(element);
      const ignoredDetails = ignoredLabels.length > 0
        ? ignoredLabels.map(label => ({
            labelType: element.id && label.htmlFor === element.id ? `for="${element.id}"` : 'wraps input',
            value: label.textContent.trim()
          }))
        : undefined;
      trace.push({
        step: 'Associated label elements',
        value: 'Ignored: overridden',
        type: 'info',
        ...(ignoredDetails && { details: ignoredDetails })
      });
    } else {
      const labels = getAssociatedLabels(element);
      if (labels.length > 0) {
        const details = labels.map(label => ({
          labelType: element.id && label.htmlFor === element.id ? `for="${element.id}"` : 'wraps input',
          value: label.textContent.trim()
        }));
        const labelText = details.map(d => d.value).join(' ');
        trace.push({
          step: 'Associated label elements',
          value: `Present: "${labelText}"`,
          type: 'success',
          details
        });
        nameFound = true;
      } else {
        trace.push({
          step: 'Associated label elements',
          value: 'Not present',
          type: 'info'
        });
      }
    }
  }

  // 5. alt attribute (for images / areas / inputs)
  if (['img', 'area'].includes(tag)) {
    if (element.hasAttribute('alt')) {
      const isWinner = !nameFound;
      trace.push({
        step: 'alt attribute',
        value: `Present: "${element.getAttribute('alt')}"${!isWinner ? ' (Ignored: overridden)' : ''}`,
        type: isWinner ? 'success' : 'info'
      });
      if (isWinner) nameFound = true;
    } else {
      trace.push({ step: 'alt attribute', value: 'Not present', type: 'info' });
    }
  } else if (tag === 'input' && element.hasAttribute('alt')) {
    const isWinner = !nameFound;
    trace.push({
      step: 'alt attribute',
      value: `Present: "${element.getAttribute('alt')}"${!isWinner ? ' (Ignored: overridden)' : ''}`,
      type: isWinner ? 'success' : 'info'
    });
    if (isWinner) nameFound = true;
  }

  // 6. Child Image Alt Text (if element is not an image itself but contains one)
  const imgChild = element.querySelector('img[alt]');
  if (imgChild && imgChild.getAttribute('alt').trim().length > 0) {
    const isWinner = !nameFound;
    trace.push({
      step: 'Child image alt attribute',
      value: `Present: "${imgChild.getAttribute('alt')}"${!isWinner ? ' (Ignored: overridden)' : ''}`,
      type: isWinner ? 'success' : 'info'
    });
    if (isWinner) nameFound = true;
  }

  // 7. Text content (for text elements, buttons, etc)
  const result = resolveDescendantText(element);
  const resolvedText = result.text;
  const textDetails = result.details.length > 0 ? result.details : undefined;

  if (resolvedText) {
    const isWinner = !nameFound;
    const textStep = {
      step: 'Text content',
      value: `Present: "${resolvedText.substring(0, 50).replace(/\n/g, ' ')}${resolvedText.length > 50 ? '...' : ''}"${!isWinner ? ' (Ignored: overridden)' : ''}`,
      type: isWinner ? 'success' : 'info'
    };
    if (textDetails) textStep.details = textDetails;
    trace.push(textStep);
    if (isWinner) nameFound = true;
  }

  // 8. title attribute fallback
  if (element.hasAttribute('title')) {
    const isWinner = !nameFound;
    trace.push({
      step: 'title attribute',
      value: `Present: "${element.getAttribute('title')}"${!isWinner ? ' (Ignored: overridden)' : ' (Used as fallback)'}`,
      type: isWinner ? 'success' : 'info'
    });
    if (isWinner) nameFound = true;
  } else {
    trace.push({
      step: 'title attribute',
      value: 'Not present',
      type: 'info'
    });
  }

  return trace;
}
