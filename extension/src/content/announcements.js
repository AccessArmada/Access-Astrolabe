const MATH_OPERATOR_MAP = {
  '+':  'plus',
  '-':  'minus',
  '−':  'minus',
  '×':  'times',
  '·':  'times',
  '÷':  'divided by',
  '=':  'equals',
  '≠':  'not equal to',
  '<':  'less than',
  '>':  'greater than',
  '≤':  'less than or equal to',
  '≥':  'greater than or equal to',
  '±':  'plus or minus',
  '∓':  'minus or plus',
  '∞':  'infinity',
  '∑':  'sum',
  '∏':  'product',
  '∫':  'integral',
  '∬':  'double integral',
  '∭':  'triple integral',
  '∮':  'contour integral',
  '∂':  'partial',
  '∇':  'nabla',
  '√':  'square root of',
  '→':  'right arrow',
  '←':  'left arrow',
  '↔':  'left right arrow',
  '⇒':  'implies',
  '⇔':  'if and only if',
  '∈':  'element of',
  '∉':  'not an element of',
  '⊂':  'subset of',
  '⊃':  'superset of',
  '∪':  'union',
  '∩':  'intersection',
  '∀':  'for all',
  '∃':  'there exists',
  '¬':  'not',
  '∧':  'and',
  '∨':  'or',
  '⊕':  'direct sum',
  '⊗':  'tensor product',
  '|':  'such that',
  '‖':  'norm of',
  '…':  'ellipsis',
  '⋯':  'center ellipsis',
  '⋮':  'vertical ellipsis',
  '⋱':  'diagonal ellipsis',
};

const MATH_IDENTIFIER_MAP = {
  'α': 'alpha',    'β': 'beta',    'γ': 'gamma',   'δ': 'delta',
  'ε': 'epsilon',  'ζ': 'zeta',    'η': 'eta',     'θ': 'theta',
  'ι': 'iota',     'κ': 'kappa',   'λ': 'lambda',  'μ': 'mu',
  'ν': 'nu',       'ξ': 'xi',      'π': 'pi',      'ρ': 'rho',
  'σ': 'sigma',    'τ': 'tau',     'υ': 'upsilon',  'φ': 'phi',
  'χ': 'chi',      'ψ': 'psi',     'ω': 'omega',
  'Α': 'Alpha',    'Β': 'Beta',    'Γ': 'Gamma',   'Δ': 'Delta',
  'Ε': 'Epsilon',  'Ζ': 'Zeta',   'Η': 'Eta',     'Θ': 'Theta',
  'Λ': 'Lambda',   'Μ': 'Mu',     'Ν': 'Nu',      'Ξ': 'Xi',
  'Π': 'Pi',       'Σ': 'Sigma',  'Τ': 'Tau',     'Υ': 'Upsilon',
  'Φ': 'Phi',      'Χ': 'Chi',    'Ψ': 'Psi',     'Ω': 'Omega',
  'ℝ': 'real numbers',
  'ℤ': 'integers',
  'ℕ': 'natural numbers',
  'ℚ': 'rational numbers',
  'ℂ': 'complex numbers',
  '∞': 'infinity',
};

const MATH_TAGS = new Set([
  'mrow', 'mfrac', 'msup', 'msub', 'msubsup', 'msqrt', 'mroot',
  'mover', 'munder', 'munderover', 'mmultiscripts',
  'mo', 'mi', 'mn', 'mtext', 'mspace', 'merror', 'menclose',
  'mtable', 'mtr', 'mtd', 'mglyph', 'mstyle', 'mpadded', 'mphantom',
]);

const toOrdinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
};

const assembleMathReading = (el) => {
  if (!el) return '';
  const tag = (el.tagName ?? '').toLowerCase().replace(/^m:/, '');

  if (el.nodeType === Node.TEXT_NODE) {
    return (el.textContent ?? '').trim();
  }

  const children = Array.from(el.childNodes ?? [])
    .map(child => assembleMathReading(child))
    .filter(Boolean);

  switch (tag) {
    case 'math':
      return children.join(' ');

    case 'mrow':
    case 'mstyle':
    case 'mpadded':
    case 'mphantom':
      return tag === 'mphantom' ? '' : children.join(' ');

    case 'mo': {
      const text = (el.textContent ?? '').trim();
      return MATH_OPERATOR_MAP[text] ?? text;
    }

    case 'mi': {
      const text = (el.textContent ?? '').trim();
      return MATH_IDENTIFIER_MAP[text] ?? text;
    }

    case 'mn':
    case 'mtext':
      return (el.textContent ?? '').trim();

    case 'mspace':
      return '';

    case 'mfrac': {
      const [num, den] = children;
      return `fraction, ${num ?? ''} over ${den ?? ''}, end fraction`;
    }

    case 'msup': {
      const [base, exp] = children;
      const expRaw = (el.children?.[1]?.textContent ?? '').trim();
      const isInteger = /^\d+$/.test(expRaw);
      const expNum = isInteger ? parseInt(expRaw, 10) : NaN;
      if (expNum === 2) return `${base ?? ''} squared`;
      if (expNum === 3) return `${base ?? ''} cubed`;
      if (Number.isFinite(expNum) && expNum > 3) return `${base ?? ''} to the ${toOrdinal(expNum)} power`;
      return `${base ?? ''} to the power of ${exp ?? ''}`;
    }

    case 'msub': {
      const [base, sub] = children;
      return `${base ?? ''} subscript ${sub ?? ''}`;
    }

    case 'msubsup': {
      const [base, sub, sup] = children;
      return `${base ?? ''} subscript ${sub ?? ''} superscript ${sup ?? ''}`;
    }

    case 'msqrt':
      return `square root of ${children.join(' ')}, end square root`;

    case 'mroot': {
      const [content, index] = children;
      const indexText = index ? `${index} root` : 'root';
      return `${indexText} of ${content ?? ''}, end root`;
    }

    case 'mover': {
      const [base, over] = children;
      const overOp = (el.children?.[1]?.textContent ?? '').trim();
      const OVER_MAP = {
        '→': 'with right arrow above',
        '←': 'with left arrow above',
        '↔': 'with left right arrow above',
        '¯': 'bar',
        '^': 'hat',
        '~': 'tilde',
      };
      const overLabel = OVER_MAP[overOp] ?? `with ${over ?? ''} above`;
      return `${base ?? ''} ${overLabel}`;
    }

    case 'munder': {
      const [base, under] = children;
      return `${base ?? ''} with ${under ?? ''} below`;
    }

    case 'munderover': {
      const [base, under, over] = children;
      return `${base ?? ''} with ${over ?? ''} above and ${under ?? ''} below`;
    }

    case 'mmultiscripts': {
      return `${children[0] ?? ''} with scripts ${children.slice(1).join(' ')}`;
    }

    case 'mtable': {
      const rows = Array.from(el.querySelectorAll?.('mtr') ?? []).length;
      const cols = Math.max(
        0,
        ...Array.from(el.querySelectorAll?.('mtr') ?? []).map(
          r => Array.from(r.children ?? []).filter(c =>
            (c.tagName?.toLowerCase().replace(/^m:/, '')) === 'mtd'
          ).length
        )
      );
      return `math table, ${rows} rows, ${cols} columns`;
    }

    case 'mtr':
      return `row, ${children.join(', ')}`;

    case 'mtd':
      return children.join(' ');

    case 'merror':
      return `math error: ${children.join(' ')}`;

    case 'menclose': {
      const notation = el.getAttribute?.('notation') ?? 'box';
      return `${children.join(' ')}, enclosed in ${notation}`;
    }

    case 'mglyph': {
      const alt = el.getAttribute?.('alt') ?? '';
      return alt || '';
    }

    default:
      return children.join(' ');
  }
};

export function generateAnnouncement(data, element) {
  let announcement = "";
  const { role, name, description, states = {} } = data;
  const tagName = data.tagName ? data.tagName.toLowerCase().replace(/^m:/, '') : "";

  const getExplicitRole = (el) => (el?.getAttribute?.("role") ?? "").toString().toLowerCase();

  const getElementText = (el) => {
    // Used for aria-labelledby resolution: traverse all descendants (ignore aria-hidden,
    // since labelledby references override it), include img alt, skip style/script.
    const pieces = [];
    const visit = (n) => {
      if (!n) return;
      if (n.nodeType === Node.TEXT_NODE) {
        const t = (n.textContent ?? "").toString().replace(/\s+/g, " ").trim();
        if (t) pieces.push(t);
        return;
      }
      if (n.nodeType !== Node.ELEMENT_NODE) return;
      const elTag = (n.tagName ?? "").toString().toLowerCase();
      if (elTag === "script" || elTag === "style" || elTag === "noscript") return;
      if (elTag === "img") {
        const alt = ((n.getAttribute?.("alt")) ?? "").toString().trim();
        if (alt) pieces.push(alt);
        return;
      }
      for (const child of Array.from(n.childNodes ?? [])) visit(child);
    };
    try {
      visit(el);
    } catch (_) { /* ignore */ }
    return pieces.join(" ").replace(/\s+/g, " ").trim();
  };

  const normalizeText = (text) =>
    (text ?? "")
      .toString()
      .replace(/\s+/g, " ")
      .trim();

  const resolveIdTextList = (ids) => {
    if (!ids) return [];
    const tokens = ids
      .toString()
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean);
    const texts = [];
    for (const id of tokens) {
      const target = element?.ownerDocument?.getElementById?.(id) ?? document.getElementById(id);
      const txt = getElementText(target);
      if (txt) texts.push(txt);
    }
    return texts;
  };

  const accumulateText = (node) => {
    const pieces = [];
    const visit = (n) => {
      if (!n) return;
      if (n.nodeType === Node.TEXT_NODE) {
        const t = normalizeText(n.textContent);
        if (t) pieces.push(t);
        return;
      }
      if (n.nodeType !== Node.ELEMENT_NODE) return;

      const el = /** @type {HTMLElement} */ (n);
      const elTag = (el.tagName ?? "").toString().toLowerCase();
      if (elTag === "script" || elTag === "style" || elTag === "noscript") return;
      if (el.getAttribute?.("aria-hidden") === "true" || el.hasAttribute?.("hidden") || el.hidden === true) return;

      if (elTag === "img") {
        const alt = normalizeText(el.getAttribute?.("alt"));
        if (alt) pieces.push(alt);
        return;
      }

      if (elTag === "abbr") {
        const title = normalizeText(el.getAttribute?.("title") ?? "");
        pieces.push(title || normalizeText(el.textContent));
        return;
      }

      for (const child of Array.from(el.childNodes ?? [])) visit(child);
    };
    visit(node);
    return normalizeText(pieces.join(" "));
  };

  const countDirectListItems = (listEl) => {
    if (!listEl) return 0;
    let count = 0;
    for (const child of Array.from(listEl.children ?? [])) {
      const childTag = (child.tagName ?? "").toString().toLowerCase();
      const childRole = getExplicitRole(child);
      if (childTag === "li" || childRole === "listitem") count += 1;
    }
    return count;
  };

  const getFieldsetContext = (el) => {
    const fieldset = el?.closest?.('fieldset');
    if (fieldset) {
      const legend = fieldset.querySelector(':scope > legend');
      return legend ? normalizeText(legend.textContent) : '';
    }
    const group = el?.closest?.('[role="group"]');
    if (!group) return '';
    const labelledBy = group.getAttribute?.('aria-labelledby');
    if (labelledBy) {
      const texts = labelledBy.split(/\s+/).map(id => {
        const target = el?.ownerDocument?.getElementById?.(id) ?? document.getElementById(id);
        return target ? normalizeText(target.textContent) : '';
      }).filter(Boolean);
      if (texts.length) return texts.join(' ');
    }
    return normalizeText(group.getAttribute?.('aria-label') ?? '');
  };

  const getRadioGroupContext = (el) => {
    const name = el.getAttribute?.('name');
    if (!name) return '';
    const group = Array.from(
      el.ownerDocument?.querySelectorAll(`input[type="radio"][name="${name}"]`) ?? []
    );
    const pos = group.indexOf(el) + 1;
    const total = group.length;
    return (pos > 0 && total > 1) ? `${pos} of ${total}` : '';
  };

  const getPositionLabel = (el, domPos, domTotal) => {
    const ariaPos   = parseInt(el?.getAttribute?.('aria-posinset') ?? '', 10);
    const ariaTotal = parseInt(el?.getAttribute?.('aria-setsize')  ?? '', 10);
    const pos   = Number.isFinite(ariaPos)   ? ariaPos   : domPos;
    const total = Number.isFinite(ariaTotal) ? ariaTotal : domTotal;
    return (pos > 0 && total > 1) ? `${pos} of ${total}` : '';
  };

  const getContainerLabel = (el, selector) => {
    const container = el?.closest?.(selector);
    if (!container) return '';
    const labelledBy = container.getAttribute?.('aria-labelledby');
    if (labelledBy) {
      const texts = resolveIdTextList(labelledBy);
      if (texts.length) return normalizeText(texts.join(' '));
    }
    const ariaLabel = normalizeText(container.getAttribute?.('aria-label') ?? '');
    if (ariaLabel) return ariaLabel;
    const title = normalizeText(container.getAttribute?.('title') ?? '');
    return title;
  };

  const getListContext = (el) => {
    const listItem = el?.closest?.('li, [role="listitem"], dt, dd');
    if (!listItem) return "";
    const list = listItem.closest?.('ul, ol, dl, [role="list"]');
    if (!list) return "";

    const isDl = list.tagName?.toLowerCase() === "dl";
    const allItems = Array.from(
      list.querySelectorAll?.('li, [role="listitem"], dt, dd') ?? []
    ).filter((item) => item.closest?.('ul, ol, dl, [role="list"]') === list);

    if (isDl) {
      const dtItems = allItems.filter((i) => i.tagName?.toLowerCase() === "dt");
      const total = dtItems.length;
      let currentDt = listItem.tagName?.toLowerCase() === "dt"
        ? listItem
        : listItem.previousElementSibling;
      while (currentDt && currentDt.tagName?.toLowerCase() !== "dt") {
        currentDt = currentDt.previousElementSibling;
      }
      const pos = currentDt ? dtItems.indexOf(currentDt) + 1 : 0;
      return pos > 0 && total > 0 ? `List item ${pos} of ${total}` : "";
    }

    const liItems = allItems.filter((i) => {
      const t = i.tagName?.toLowerCase();
      const r = getExplicitRole(i);
      return t === "li" || r === "listitem";
    });
    const total = liItems.length;
    const pos = liItems.indexOf(listItem) + 1;
    return pos > 0 && total > 0 ? `List item ${pos} of ${total}` : "";
  };

  const roledesc = normalizeText(element?.getAttribute?.('aria-roledescription'));
  const live = (states.live ?? element?.getAttribute?.("aria-live") ?? "").toString().toLowerCase();
  const isAlert = role === 'alert';
  const isLive = live === "polite" || live === "assertive" || isAlert;

  const getErrorLabel = (el) => {
    const errMsgId = el?.getAttribute?.('aria-errormessage');
    const errEl = errMsgId
      ? (el?.ownerDocument?.getElementById?.(errMsgId) ?? document.getElementById(errMsgId))
      : null;
    const errText = errEl ? normalizeText(errEl.textContent) : '';
    return errText ? `Invalid entry, Error: ${errText}` : 'Invalid entry';
  };

  const isHidden =
    Boolean(states.hidden) ||
    element?.getAttribute?.("aria-hidden") === "true" ||
    element?.hasAttribute?.("hidden") ||
    element?.hidden === true;

  if (isHidden) return "";

  const isDisabled =
    Boolean(states.disabled) ||
    element?.hasAttribute?.("disabled") ||
    element?.getAttribute?.("aria-disabled") === "true";

  // Compute list context once — applies to any element inside a list item
  const listContextPrefix = getListContext(element);

  const finalize = (text) => {
    const desc = normalizeText(description);
    let out = normalizeText(text);
    if (!out) out = desc;
    if (!out) return out;
    if (desc && out !== desc && !out.includes(desc)) out = `${out}, ${desc}`;
    if ((isAlert || live === 'assertive') && !out.startsWith('Alert:')) out = `Alert: ${out}`;
    if (isDisabled && !out.toLowerCase().includes("unavailable")) out = `${out}, unavailable`;

    const isBusy = element?.getAttribute?.('aria-busy') === 'true';
    if (isBusy && !out.toLowerCase().includes('busy')) out = `${out}, busy`;

    const grabbedAttr = element?.getAttribute?.('aria-grabbed');
    const isDraggable = element?.getAttribute?.('draggable') === 'true' || grabbedAttr !== null;
    if (grabbedAttr === 'true' && !out.toLowerCase().includes('grabbed')) {
      out = `${out}, grabbed`;
    } else if (grabbedAttr === 'false' && !out.toLowerCase().includes('not grabbed')) {
      if (element?.getAttribute?.('draggable') === 'true' && !out.toLowerCase().includes('draggable')) {
        out = `${out}, draggable`;
      }
      out = `${out}, not grabbed`;
    } else if (isDraggable && !out.toLowerCase().includes('draggable')) {
      out = `${out}, draggable`;
    }

    const isButtonLike = role === 'button' || tagName === 'button';
    if (!isButtonLike) {
      const expandedAttr = element?.getAttribute?.('aria-expanded');
      const expandedVal = expandedAttr !== null && expandedAttr !== undefined
        ? expandedAttr
        : (tagName === 'details' ? String(element?.open) : null);
      if (expandedVal !== null && expandedVal !== undefined) {
        const label = expandedVal === 'true' ? 'expanded' : 'collapsed';
        if (!out.toLowerCase().includes(label)) out = `${out}, ${label}`;
      }
    }

    const selectedAttr = element?.getAttribute?.('aria-selected');
    const selectedVal = selectedAttr !== null && selectedAttr !== undefined
      ? selectedAttr
      : (tagName === 'option' ? String(element?.selected) : null);
    if (selectedVal !== null && selectedVal !== undefined) {
      const label = selectedVal === 'true' ? 'selected' : 'not selected';
      if (!out.toLowerCase().includes(label)) out = `${out}, ${label}`;
    }

    const currentAttr = element?.getAttribute?.('aria-current');
    if (currentAttr && currentAttr !== 'false') {
      const CURRENT_LABELS = {
        page:     'current page',
        step:     'current step',
        location: 'current location',
        date:     'current date',
        time:     'current time',
        true:     'current',
      };
      const currentLabel = CURRENT_LABELS[currentAttr] ?? `current ${currentAttr}`;
      if (!out.toLowerCase().includes(currentLabel)) {
        out = `${out}, ${currentLabel}`;
      }
    }

    const MULTISELECTABLE_ROLES = new Set(['listbox', 'tree', 'treegrid', 'grid', 'tablist']);
    const isMultiselectable = element?.getAttribute?.('aria-multiselectable') === 'true'
      && MULTISELECTABLE_ROLES.has(role);
    if (isMultiselectable && !out.toLowerCase().includes('multi')) {
      out = `${out}, multi-select`;
    }

    const haspopup = element?.getAttribute?.('aria-haspopup');
    if (haspopup && haspopup !== 'false') {
      const POPUP_LABELS = {
        true:    'has popup',
        menu:    'has popup menu',
        listbox: 'has popup listbox',
        tree:    'has popup tree',
        grid:    'has popup grid',
        dialog:  'has popup dialog',
      };
      const popupLabel = POPUP_LABELS[haspopup] ?? `has popup ${haspopup}`;
      if (!out.toLowerCase().includes('has popup')) out = `${out}, ${popupLabel}`;
    }

    if (role !== 'application') {
      const applicationAncestor = element?.closest?.('[role="application"]');
      if (applicationAncestor && !out.toLowerCase().includes('application')) {
        out = `${out}, application`;
      }
    }

    const SKIP_LIST_PREFIX = new Set(['tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'treeitem']);
    if (listContextPrefix && !out.startsWith("List item") && !SKIP_LIST_PREFIX.has(role)) out = `${listContextPrefix}, ${out}`;
    return out;
  };

  const getExplicitName = () => {
    const labelledByTexts = resolveIdTextList(element?.getAttribute?.("aria-labelledby"));
    if (labelledByTexts.length > 0) return normalizeText(labelledByTexts.join(" "));
    const explicit = normalizeText(name);
    if (explicit) return explicit;
    return "";
  };

  const getEffectiveName = () => {
    const explicit = getExplicitName();
    if (explicit) return explicit;
    return accumulateText(element);
  };

  const effectiveName = getEffectiveName();


  // 1. Page Load: Document Title (handled elsewhere or by checking if element is body)
  if (tagName === "body" || tagName === "html") {
    return document.title || "Untitled Document";
  }

  // Prohibited naming: presentational roles and generic spans should ignore aria-label/aria-labelledby
  if (role === "presentation") {
    const text = (element?.textContent ?? "").toString().trim();
    const out = text || (description ?? "");
    return finalize(out);
  }

  if (
    !role &&
    tagName === "span" &&
    (element?.hasAttribute?.("aria-label") || element?.hasAttribute?.("aria-labelledby"))
  ) {
    const text = (element?.textContent ?? "").toString().trim();
    const out = description ? (text ? `${text}, ${description}` : description) : text;
    return finalize(out);
  }

  // 2. Headings: Level + Name
  if (role === "heading" || tagName.match(/^h[1-6]$/)) {
    if (roledesc) {
      announcement = `${effectiveName}, ${roledesc}`;
    } else {
      const level = element.getAttribute("aria-level") || (tagName.match(/^h[1-6]$/) ? tagName.replace("h", "") : "");
      announcement = `Heading${level ? ` Level ${level}` : ""}, ${effectiveName}`;
    }
    return finalize(announcement);
  }

  // 3. Links: Role + Name + Visited State
  // Explicit roles on <a> take precedence over the anchor semantics
  const ANCHOR_ROLE_OVERRIDES = new Set(['menuitem', 'menuitemcheckbox', 'menuitemradio', 'treeitem', 'tab']);
  if ((role === "link" || tagName === "a") && !ANCHOR_ROLE_OVERRIDES.has(role)) {
    announcement = `${effectiveName}, ${roledesc || 'Link'}`;
    return finalize(announcement);
  }

  // Summary (details disclosure) — must precede button block: <summary> has implicit role="button"
  if (tagName === "summary") {
    const details = element.parentElement;
    const isOpen = details?.tagName?.toLowerCase() === "details"
      ? Boolean(details.open)
      : null;
    const expandedLabel = isOpen === null ? "" : isOpen ? "expanded" : "collapsed";
    const parts = [
      effectiveName || null,
      roledesc || "button",
      expandedLabel || null,
    ].filter(Boolean);
    announcement = parts.join(", ");
    return finalize(announcement);
  }

  // 4. Buttons: Role + Name + Pressed/Expanded States
  if ((role === "button" || tagName === "button") && role !== "tab") {
    let stateStr = "";
    if (states.pressed !== null && states.pressed !== undefined) stateStr += `Pressed: ${states.pressed} `;
    if (states.expanded !== null && states.expanded !== undefined) stateStr += states.expanded === 'true' ? 'expanded ' : 'collapsed ';
    const groupContext = getFieldsetContext(element);
    const groupContextToUse = (groupContext && !effectiveName.toLowerCase().includes(groupContext.toLowerCase()))
      ? groupContext : '';
    const buttonLabel = `${roledesc || 'button'}${stateStr ? ' ' + stateStr.trim() : ''}`;
    const parts = [groupContextToUse || null, effectiveName || null, buttonLabel].filter(Boolean);
    announcement = parts.join(', ');
    return finalize(announcement);
  }

  // 5. Images: "Graphic" + Alt Text + figcaption context
  if (role === "img" || tagName === "img") {
    const parentFigure = element.closest?.('figure');
    const figcaption = parentFigure ? parentFigure.querySelector?.(':scope > figcaption') : null;
    const captionText = figcaption ? normalizeText(figcaption.textContent) : '';
    const parts = [
      effectiveName || null,
      roledesc || 'graphic',
      (captionText && captionText !== effectiveName) ? captionText : null,
    ].filter(Boolean);
    announcement = parts.join(', ');
    return finalize(announcement);
  }

  // 5b. Range-ish widgets: aria-valuenow/min/max
  if (role === "progressbar") {
    const valueNow = states.valueNow ?? element?.getAttribute?.("aria-valuenow");
    const valueMin = states.valueMin ?? element?.getAttribute?.("aria-valuemin");
    const valueMax = states.valueMax ?? element?.getAttribute?.("aria-valuemax");

    let valueStr = "";
    const nowNum = valueNow === "" || valueNow === null || valueNow === undefined ? null : Number(valueNow);
    const minNum = valueMin === "" || valueMin === null || valueMin === undefined ? null : Number(valueMin);
    const maxNum = valueMax === "" || valueMax === null || valueMax === undefined ? null : Number(valueMax);

    if (nowNum !== null && Number.isFinite(nowNum) && minNum !== null && maxNum !== null && Number.isFinite(minNum) && Number.isFinite(maxNum) && maxNum > minNum) {
      const pct = Math.round(((nowNum - minNum) / (maxNum - minNum)) * 100);
      valueStr = `${pct}%`;
    } else if (valueNow !== null && valueNow !== undefined && valueNow !== "") {
      valueStr = `${valueNow}`;
    }

    announcement = `${effectiveName ? `${effectiveName}, ` : ""}${roledesc || 'Progress bar'}${valueStr ? `, ${valueStr}` : ""}`;
    return finalize(announcement);
  }

  // Meter
  if (tagName === 'meter' || role === 'meter') {
    const value = element.value ?? element.getAttribute('aria-valuenow');
    const min = element.min ?? element.getAttribute('aria-valuemin') ?? '0';
    const max = element.max ?? element.getAttribute('aria-valuemax') ?? '1';
    const valueLabel = (value != null && value !== '')
      ? `${value} of ${max}`
      : '';
    const parts = [
      effectiveName || null,
      roledesc || 'meter',
      valueLabel || null,
    ].filter(Boolean);
    announcement = parts.join(', ');
    return finalize(announcement);
  }

  // 6. Checkboxes & Radio Buttons (Specialized states)
  if (role === "checkbox" || (tagName === "input" && (element.type === "checkbox" || role === "checkbox"))) {
    const checked = states.checked === 'true' || element.checked ? "Checked" : "Unchecked";
    const groupLabel = getFieldsetContext(element);
    const groupLabelToUse = (groupLabel && !effectiveName.toLowerCase().includes(groupLabel.toLowerCase()))
      ? groupLabel : '';
    const isInvalid = element?.getAttribute?.('aria-invalid') === 'true';
    const parts = [
      groupLabelToUse || null,
      effectiveName,
      roledesc || 'Checkbox',
      checked,
      isInvalid ? getErrorLabel(element) : null,
    ].filter(Boolean);
    announcement = parts.join(', ');
    return finalize(announcement);
  }

  if (role === "radio" || (tagName === "input" && (element.type === "radio" || role === "radio"))) {
    const checked = states.checked === 'true' || element.checked ? "Selected" : "Not selected";
    const groupLabel = getFieldsetContext(element);
    const groupLabelToUse = (groupLabel && !effectiveName.toLowerCase().includes(groupLabel.toLowerCase()))
      ? groupLabel : '';
    const radioPosition = getRadioGroupContext(element);
    const isInvalid = element?.getAttribute?.('aria-invalid') === 'true';
    const parts = [
      groupLabelToUse || null,
      effectiveName,
      roledesc || 'Radio button',
      checked,
      isInvalid ? getErrorLabel(element) : null,
      radioPosition || null,
    ].filter(Boolean);
    announcement = parts.join(', ');
    return finalize(announcement);
  }

  // Switch
  if (role === "switch") {
    const isOn = states.checked === "true"
      || element.getAttribute("aria-checked") === "true";
    const checkedLabel = isOn ? "on" : "off";
    announcement = `${effectiveName}, ${roledesc || 'switch'}, ${checkedLabel}`;
    return finalize(announcement);
  }

  // Tab
  if (role === 'tab') {
    const tablist = element.closest('[role="tablist"]');
    const allTabs = tablist
      ? Array.from(tablist.querySelectorAll('[role="tab"]'))
      : [];
    const pos = allTabs.indexOf(element) + 1;
    const total = allTabs.length;
    const posLabel = getPositionLabel(element, pos, total);

    const isSelected = element.getAttribute('aria-selected') === 'true';
    const selectedLabel = isSelected ? 'selected' : 'not selected';

    const tablistLabel = getContainerLabel(element, '[role="tablist"]');
    const tablistLabelToUse = (tablistLabel && !effectiveName.toLowerCase().includes(tablistLabel.toLowerCase()))
      ? tablistLabel : '';

    const parts = [
      tablistLabelToUse || null,
      effectiveName || null,
      roledesc || 'tab',
      selectedLabel,
      posLabel || null,
    ].filter(Boolean);
    announcement = parts.join(', ');
    return finalize(announcement);
  }

  // Menu items
  if (['menuitem', 'menuitemcheckbox', 'menuitemradio'].includes(role)) {
    const menu = element.closest('[role="menu"], [role="menubar"]');
    const allItems = menu
      ? Array.from(menu.querySelectorAll(
          '[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]'
        )).filter(el => el.closest('[role="menu"],[role="menubar"]') === menu)
      : [];
    const pos = allItems.indexOf(element) + 1;
    const total = allItems.length;
    const posLabel = getPositionLabel(element, pos, total);

    let checkedLabel = '';
    if (role === 'menuitemcheckbox') {
      checkedLabel = element.getAttribute('aria-checked') === 'true'
        ? 'checked' : 'unchecked';
    }
    if (role === 'menuitemradio') {
      checkedLabel = element.getAttribute('aria-checked') === 'true'
        ? 'selected' : 'not selected';
    }

    const defaultMenuItemLabel = role === 'menuitem'
      ? 'menu item'
      : role === 'menuitemcheckbox'
        ? 'menu item checkbox'
        : 'menu item radio';
    const roleLabel = roledesc || defaultMenuItemLabel;

    const menuLabel = getContainerLabel(element, '[role="menu"], [role="menubar"]');
    const menuLabelToUse = (menuLabel && !effectiveName.toLowerCase().includes(menuLabel.toLowerCase()))
      ? menuLabel : '';

    const parts = [
      menuLabelToUse || null,
      effectiveName || null,
      roleLabel,
      checkedLabel || null,
      posLabel || null,
    ].filter(Boolean);
    announcement = parts.join(', ');
    return finalize(announcement);
  }

  // Tree item
  if (role === 'treeitem') {
    const level = parseInt(element.getAttribute('aria-level') ?? '1', 10);
    const levelLabel = `level ${level}`;

    const expandedAttr = element.getAttribute('aria-expanded');
    const expandedLabel = expandedAttr === 'true'
      ? 'expanded'
      : expandedAttr === 'false'
        ? 'collapsed'
        : '';

    const tree = element.closest('[role="tree"],[role="treegrid"]');
    const allItems = tree
      ? Array.from(tree.querySelectorAll('[role="treeitem"]'))
          .filter(el => el.getAttribute('aria-level') === String(level))
      : [];
    const pos = allItems.indexOf(element) + 1;
    const total = allItems.length;
    const posLabel = getPositionLabel(element, pos, total);

    const parts = [
      effectiveName || null,
      roledesc || 'tree item',
      levelLabel,
      expandedLabel || null,
      posLabel || null,
    ].filter(Boolean);
    announcement = parts.join(', ');
    return finalize(announcement);
  }

  // Select: current value + option count
  if (tagName === "select" || role === "listbox") {
    const selectedOption = element.options?.[element.selectedIndex];
    const selectedText = selectedOption
      ? normalizeText(selectedOption.text)
      : "";
    const optionCount = element.options?.length ?? 0;
    const stateStr = (element.required || element.getAttribute("aria-required") === "true")
      ? "Required" : "";
    const isInvalid = element?.getAttribute?.('aria-invalid') === 'true';
    const parts = [
      effectiveName || null,
      "list box",
      selectedText || null,
      optionCount > 0 ? `${optionCount} options` : null,
      stateStr || null,
      isInvalid ? getErrorLabel(element) : null,
    ].filter(Boolean);
    announcement = parts.join(", ");
    return finalize(announcement);
  }

  // 7. Forms: Role label + type label + value + states
  const formTypes = ["textbox", "searchbox", "spinbutton", "combobox", "listbox", "slider"];
  if (formTypes.includes(role) || ["input", "textarea", "select"].includes(tagName)) {

    const ROLE_LABELS = {
      textbox:    'text field',
      searchbox:  'search field',
      spinbutton: 'number field',
      combobox:   'combo box',
      listbox:    'list box',
      slider:     'slider',
    };
    const roleLabel = roledesc || (ROLE_LABELS[role]
      ?? (tagName === 'select'   ? 'list box'  : null)
      ?? (tagName === 'textarea' ? 'text area' : null)
      ?? 'text field');

    const TYPE_LABELS = {
      tel:      'telephone',
      email:    'email',
      url:      'URL',
      number:   'number',
      date:     'date picker',
      time:     'time picker',
      month:    'month picker',
      week:     'week picker',
      'datetime-local': 'date and time picker',
      color:    'color',
      file:     'file',
      password: 'password',
    };
    const rawType = element.getAttribute('type')?.toLowerCase() ?? '';
    const typeLabel = TYPE_LABELS[rawType] ?? null;

    const VALUE_TYPES = new Set(['tel', 'email', 'url', 'text', 'search']);
    const inputValue = (VALUE_TYPES.has(rawType) && element.value)
      ? element.value.trim()
      : '';

    const DATE_INPUT_TYPES = new Set(['date', 'time', 'month', 'week', 'datetime-local']);
    const dateValue = DATE_INPUT_TYPES.has(rawType) && element.value
      ? element.value
      : '';

    const AUTOCOMPLETE_LABELS = {
      inline: 'autocomplete inline',
      list:   'has autocomplete list',
      both:   'has autocomplete',
    };
    const autocompleteRole = ['combobox', 'textbox', 'searchbox'].includes(role) ? role : null;
    const autocompleteLabel = autocompleteRole
      ? (AUTOCOMPLETE_LABELS[element?.getAttribute?.('aria-autocomplete')] ?? null)
      : null;

    let stateStr = '';
    if (element.required || element.getAttribute('aria-required') === 'true') stateStr += 'Required ';
    const isInvalidForm = element.getAttribute('aria-invalid') === 'true';
    if (isInvalidForm) stateStr += `${getErrorLabel(element)} `;

    if (role === 'slider' || role === 'spinbutton') {
      const valueText  = element?.getAttribute?.('aria-valuetext');
      const valueNow   = states.valueNow ?? element?.getAttribute?.('aria-valuenow');
      const valueMin   = states.valueMin ?? element?.getAttribute?.('aria-valuemin');
      const valueMax   = states.valueMax ?? element?.getAttribute?.('aria-valuemax');
      const isTimeline = effectiveName.toLowerCase().includes('time') ||
        effectiveName.toLowerCase().includes('scrub') ||
        effectiveName.toLowerCase().includes('seek');
      if (valueText) {
        stateStr += `${valueText} `;
        if (isTimeline) {
          const minSecs = parseFloat(valueMin);
          const maxSecs = parseFloat(valueMax);
          if (Number.isFinite(minSecs)) stateStr += `Min: ${formatTime(minSecs)} `;
          if (Number.isFinite(maxSecs)) stateStr += `Max: ${formatTime(maxSecs)} `;
        } else {
          if (valueMin != null && valueMin !== '') stateStr += `Min: ${valueMin} `;
          if (valueMax != null && valueMax !== '') stateStr += `Max: ${valueMax} `;
        }
      } else if (isTimeline) {
        const nowSecs = parseFloat(valueNow);
        const minSecs = parseFloat(valueMin);
        const maxSecs = parseFloat(valueMax);
        if (Number.isFinite(nowSecs)) stateStr += `${formatTime(nowSecs)} `;
        if (Number.isFinite(minSecs)) stateStr += `Min: ${formatTime(minSecs)} `;
        if (Number.isFinite(maxSecs)) stateStr += `Max: ${formatTime(maxSecs)} `;
      } else {
        if (valueNow != null && valueNow !== '') stateStr += `${valueNow} `;
        if (valueMin != null && valueMin !== '') stateStr += `Min: ${valueMin} `;
        if (valueMax != null && valueMax !== '') stateStr += `Max: ${valueMax} `;
      }
    }

    const nameForAnnouncement = effectiveName || normalizeText(element?.placeholder ?? '');
    const groupContext = getFieldsetContext(element);
    const groupContextToUse = (groupContext && !nameForAnnouncement.toLowerCase().includes(groupContext.toLowerCase()))
      ? groupContext : '';

    const parts = [
      groupContextToUse || null,
      nameForAnnouncement || null,
      roleLabel,
      typeLabel,
      autocompleteLabel || null,
      inputValue || dateValue || null,
      stateStr.trim() || null,
    ].filter(Boolean);

    announcement = parts.join(', ');
    return finalize(announcement);
  }

  // Menu / menubar containers
  if (role === 'menubar' || role === 'menu') {
    const defaultMenuLabel = role === 'menubar' ? 'menu bar' : 'menu';
    const roleLabel = roledesc || defaultMenuLabel;
    const parts = [effectiveName || null, roleLabel].filter(Boolean);
    announcement = parts.join(', ');
    return finalize(announcement);
  }

  // 8. Lists: Entry ("List with X items") + Items
  // Exclude semantic list elements that carry a non-list ARIA role
  if ((role === "list" || ["ul", "ol", "dl"].includes(tagName)) && role !== "menubar" && role !== "menu" && role !== "tree" && role !== "treegrid") {
    const items = countDirectListItems(element);
    announcement = `List with ${items} items`;
    return finalize(announcement);
  }

  // List Item
  if (role === "listitem" || tagName === "li") {
    announcement = `${effectiveName}, List item`;
    return finalize(announcement);
  }

  // Row (inside grid/table)
  if (role === "row") {
    const gridEl = element.closest?.('[role="grid"],[role="table"]') ?? element.closest?.('table');
    const allRows = gridEl
      ? Array.from(gridEl.querySelectorAll?.('[role="row"]') ?? [])
      : [];
    const rowIndex = allRows.indexOf(element) + 1;
    const rowLabel = rowIndex > 0 ? `Row ${rowIndex}` : 'Row';
    const parts = [effectiveName || null, rowLabel].filter(Boolean);
    announcement = parts.join(', ');
    return finalize(announcement);
  }

  // 9. Tables: Entry (Rows/Cols) + Cell context (Row/Col N)
  if (role === "table" || role === "grid" || tagName === "table") {
    let rows = 0;
    let cols = 0;
    if (tagName === "table") {
      rows = element.rows?.length || 0;
      cols = element.rows?.[0]?.cells?.length || 0;
    } else if (role === "table" || role === "grid") {
      const rowEls = Array.from(element.querySelectorAll?.('[role="row"]') ?? []);
      rows = rowEls.length;
      for (const rowEl of rowEls) {
        const directCells = Array.from(rowEl.children ?? []).filter((c) => {
          const r = getExplicitRole(c);
          return r === "cell" || r === "gridcell" || r === "columnheader" || r === "rowheader";
        });
        if (directCells.length > 0) {
          cols = Math.max(cols, directCells.length);
          continue;
        }

        const anyCells = Array.from(rowEl.querySelectorAll?.('[role="cell"],[role="gridcell"],[role="columnheader"],[role="rowheader"]') ?? []);
        cols = Math.max(cols, anyCells.length);
      }
    }
    announcement = `Table with ${rows} rows and ${cols} columns`;
    const tableName = getExplicitName();
    if (tableName) announcement = `${tableName}, ${announcement}`;
    return finalize(announcement);

  }

  if (role === "cell" || role === "gridcell" || role === "columnheader" || role === "rowheader" || ["td", "th"].includes(tagName)) {
    let cellContext = "";
    let headerContext = "";

    if (tagName === "td" || tagName === "th") {
       const cellIndex = typeof element.cellIndex === 'number' ? element.cellIndex + 1 : null;
       const rowIndex = typeof element.parentElement?.rowIndex === 'number' ? element.parentElement.rowIndex + 1 : null;
       if (rowIndex !== null && cellIndex !== null) {
         cellContext = `Row ${rowIndex}, Column ${cellIndex}`;
       }

       const headersAttr = element.getAttribute?.("headers");
       const headerTexts = resolveIdTextList(headersAttr);
       if (headerTexts.length > 0) {
         headerContext = headerTexts.join(", ");
       } else {
         const table = element.closest?.("table");
         const cellIndex0 = Number.isFinite(element.cellIndex) ? element.cellIndex : null;
         const rowEl = element.parentElement;
         const rowCells = rowEl?.cells ?? null;
         const rowHeaderCell = rowCells?.[0]?.tagName?.toLowerCase?.() === "th" ? rowCells?.[0] : null;

         const colHeaderCell =
           table && cellIndex0 !== null
             ? Array.from(table.querySelectorAll("tr")).find((tr) => tr.querySelector("th"))?.cells?.[cellIndex0]
             : null;

         const rowHeaderText = getElementText(rowHeaderCell);
         const colHeaderText = getElementText(colHeaderCell);

         // Only show headers if we are in a data cell, not a header cell itself
         if ((rowHeaderText || colHeaderText) && tagName !== 'th' && role !== 'columnheader' && role !== 'rowheader') {
           headerContext = [colHeaderText, rowHeaderText].filter(Boolean).join(", ");
         }
       }
    } else if (role === "cell" || role === "gridcell" || role === "columnheader" || role === "rowheader") {
      const rowEl = element.closest?.('[role="row"]');
      if (rowEl) {
        const cellLikeChildren = Array.from(rowEl.children ?? []).filter((c) => {
          const r = getExplicitRole(c);
          return r === "cell" || r === "gridcell" || r === "columnheader" || r === "rowheader";
        });

        const indexInRow = cellLikeChildren.indexOf(element);
        const rowIndex = Array.from(rowEl.parentElement?.querySelectorAll?.('[role="row"]') ?? []).indexOf(rowEl);

        // 2b: Use aria-colindex / aria-rowindex when present
        const ariaColIndex = element.getAttribute?.('aria-colindex');
        const ariaRowIndex = rowEl?.getAttribute?.('aria-rowindex');
        const colPos = ariaColIndex ? parseInt(ariaColIndex, 10) : (indexInRow + 1);
        const rowPos = ariaRowIndex
          ? parseInt(ariaRowIndex, 10)
          : (rowIndex >= 0 ? rowIndex + 1 : 0);
        if (rowPos > 0 && colPos > 0) {
          cellContext = `Row ${rowPos}, Column ${colPos}`;
        }

        const headersAttr = element.getAttribute?.("headers");
        const headerTexts = resolveIdTextList(headersAttr);
        if (headerTexts.length > 0) {
          headerContext = headerTexts.join(", ");
        } else {
          // 2c: Improved column header resolution
          const tableRoot = rowEl.closest?.('[role="table"],[role="grid"],[role="treegrid"]');

          const rowgroups = tableRoot
            ? Array.from(tableRoot.querySelectorAll?.(':scope > [role="rowgroup"]') ?? [])
            : [];

          let headerRow = null;
          for (const rg of rowgroups) {
            const chCandidate = rg.querySelector?.('[role="columnheader"]');
            if (chCandidate) { headerRow = chCandidate.closest?.('[role="row"]'); break; }
          }
          if (!headerRow) {
            const allRows = tableRoot ? Array.from(tableRoot.querySelectorAll?.('[role="row"]') ?? []) : [];
            headerRow = allRows.find(r => r.querySelector?.('[role="columnheader"]')) ?? null;
          }

          const CELL_ROLES_SET = new Set(['cell', 'columnheader', 'rowheader', 'gridcell']);
          const headerCells = headerRow
            ? Array.from(headerRow.children ?? []).filter(c => CELL_ROLES_SET.has(getExplicitRole(c)))
            : [];
          const colHeaderText = indexInRow >= 0 && indexInRow < headerCells.length
            ? getElementText(headerCells[indexInRow])
            : '';

          // 2d: Row header resolution via querySelectorAll (handles nested rowheaders)
          const rowHeaderEl = Array.from(rowEl.querySelectorAll?.('[role="rowheader"]') ?? [])
            .find(el => el.closest?.('[role="row"]') === rowEl) ?? null;
          const rowHeaderText = getElementText(rowHeaderEl);

          // 2e: Assemble headerContext — column first, skip when cell is itself a header
          if ((colHeaderText || rowHeaderText) && element !== rowHeaderEl && role !== 'columnheader') {
            headerContext = [colHeaderText, rowHeaderText].filter(Boolean).join(", ");
          }
        }
      }
    }

    if (headerContext && effectiveName) {
      announcement = `${headerContext}: ${effectiveName}`;
      return finalize(announcement);
    }

    const SORT_LABELS = { ascending: 'sorted ascending', descending: 'sorted descending', other: 'sorted' };
    const sortAttr = element?.getAttribute?.('aria-sort');
    const sortLabel = (role === 'columnheader' || tagName === 'th') ? (SORT_LABELS[sortAttr] ?? '') : '';

    const label = effectiveName ? `${effectiveName}, ` : "";
    announcement = `${label}${role || tagName}${cellContext ? ` ${cellContext}` : ''}${sortLabel ? `, ${sortLabel}` : ''}`.trim();
    return finalize(announcement);
  }

  // Group and fieldset (non-checkbox/radio context)
  if (role === 'group' || tagName === 'fieldset') {
    const legend = element.querySelector?.(':scope > legend');
    const legendText = legend ? normalizeText(legend.textContent) : '';
    const groupName = getExplicitName() || legendText;
    const parts = [groupName || null, roledesc || 'group'].filter(Boolean);
    announcement = parts.join(', ');
    return finalize(announcement);
  }

  // Dialog and alert dialog
  if (role === 'dialog' || role === 'alertdialog') {
    const dialogName = getExplicitName();
    const defaultDialogLabel = role === 'alertdialog' ? 'alert dialog' : 'dialog';
    const roleLabel = roledesc || defaultDialogLabel;
    const parts = [dialogName || null, roleLabel].filter(Boolean);
    announcement = parts.join(', ');
    return finalize(announcement);
  }

  // Application
  if (role === 'application') {
    const parts = [getExplicitName() || null, roledesc || 'application'].filter(Boolean);
    announcement = parts.join(', ');
    return finalize(announcement);
  }

  // C2: Custom listbox options
  if (role === 'option') {
    const isSelected = element.getAttribute?.('aria-selected') === 'true'
      || (tagName === 'option' && Boolean(element.selected));
    const selectedLabel = isSelected ? 'selected' : 'not selected';

    const listbox = element.closest?.('[role="listbox"]');
    const allOptions = listbox
      ? Array.from(listbox.querySelectorAll?.('[role="option"]') ?? [])
          .filter(el => el.closest?.('[role="listbox"]') === listbox)
      : [];

    const domPos   = allOptions.indexOf(element) + 1;
    const domTotal = allOptions.length;
    const posLabel = getPositionLabel(element, domPos, domTotal);

    const listboxLabel = getContainerLabel(element, '[role="listbox"]');
    const listboxLabelToUse = (listboxLabel && !effectiveName.toLowerCase().includes(listboxLabel.toLowerCase()))
      ? listboxLabel : '';

    const parts = [
      listboxLabelToUse || null,
      effectiveName || null,
      roledesc || 'option',
      selectedLabel,
      posLabel || null,
    ].filter(Boolean);
    announcement = parts.join(', ');
    return finalize(announcement);
  }

  // C3: Insertions and deletions
  if (tagName === 'ins' || role === 'insertion') {
    const content = effectiveName || normalizeText(element?.textContent);
    announcement = `${content}, ${roledesc || 'insertion'}`;
    return finalize(announcement);
  }

  if (tagName === 'del' || tagName === 's' || role === 'deletion') {
    const content = effectiveName || normalizeText(element?.textContent);
    announcement = `${content}, ${roledesc || 'deletion'}`;
    return finalize(announcement);
  }

  // C4: <output> has implicit role=status with aria-live=polite
  if (tagName === 'output') {
    const content = normalizeText(element?.textContent);
    const parts = [getExplicitName() || null, roledesc || 'status', content || null].filter(Boolean);
    announcement = parts.join(', ');
    return finalize(announcement);
  }

  // C5: Tooltip
  if (role === 'tooltip') {
    const content = effectiveName || normalizeText(element?.textContent);
    const parts = [content || null, roledesc || 'tooltip'].filter(Boolean);
    announcement = parts.join(', ');
    return finalize(announcement);
  }

  // C6: Toolbar
  if (role === 'toolbar') {
    const parts = [getExplicitName() || null, roledesc || 'toolbar'].filter(Boolean);
    announcement = parts.join(', ');
    return finalize(announcement);
  }

  // C7: Tree and treegrid containers
  if (role === 'tree' || role === 'treegrid') {
    const defaultLabel = role === 'treegrid' ? 'tree grid' : 'tree';
    const roleLabel = roledesc || defaultLabel;
    const parts = [getExplicitName() || null, roleLabel].filter(Boolean);
    announcement = parts.join(', ');
    return finalize(announcement);
  }

  // Audio and video elements
  if (tagName === 'audio' || tagName === 'video') {
    const mediaSrc = element.src
      || element.querySelector?.('source')?.getAttribute?.('src')
      || '';
    const srcName = mediaSrc
      ? decodeURIComponent(mediaSrc.split('/').pop().split('?')[0].replace(/\.[^.]+$/, ''))
      : '';
    const mediaName = getExplicitName() || srcName;

    const isPaused = element.paused !== false;
    const isMuted = Boolean(element.muted);
    const isLooping = Boolean(element.loop);
    const hasControls = element.hasAttribute?.('controls');

    const currentTime = typeof element.currentTime === 'number' ? element.currentTime : null;
    const duration = typeof element.duration === 'number' && Number.isFinite(element.duration)
      ? element.duration : null;

    const timeStr = currentTime !== null && duration !== null
      ? `${formatTime(currentTime)} of ${formatTime(duration)}`
      : currentTime !== null
        ? formatTime(currentTime)
        : '';

    const parts = [
      mediaName || null,
      tagName,
      isPaused ? 'paused' : 'playing',
      isMuted ? 'muted' : null,
      isLooping ? 'looping' : null,
      timeStr || null,
      hasControls ? 'use arrow keys to control' : null,
    ].filter(Boolean);

    announcement = parts.join(', ');
    return finalize(announcement);
  }

  // MathJax v3 container (<mjx-container> custom element)
  if (tagName === 'mjx-container') {
    const explicitLabel = getExplicitName();
    if (explicitLabel) {
      announcement = `math, ${explicitLabel}`;
      return finalize(announcement);
    }
    const mathEl = element.querySelector?.('mjx-assistive-mml math') ?? element.querySelector?.('math');
    const mathContent = mathEl ? assembleMathReading(mathEl) : '';
    announcement = mathContent ? `math, ${mathContent}` : 'math';
    return finalize(announcement);
  }

  // Math container
  if (tagName === 'math' || role === 'math') {
    const explicitLabel = getExplicitName();
    const altText = element.getAttribute?.('alttext') ?? '';
    const mathContent = explicitLabel || altText || assembleMathReading(element);
    const parts = ['math', mathContent || null].filter(Boolean);
    announcement = parts.join(', ');
    return finalize(announcement);
  }

  // Individual MathML elements
  if (MATH_TAGS.has(tagName)) {
    const sreLabel = getExplicitName();
    const mathReading = sreLabel || assembleMathReading(element);
    announcement = mathReading || tagName;
    return finalize(announcement);
  }

  // Implicit live region roles (alert added — implicit assertive live)
  const LIVE_REGION_ROLES = {
    alert:   'alert',
    status:  'status',
    log:     'log',
    timer:   'timer',
    marquee: 'marquee',
  };
  if (LIVE_REGION_ROLES[role]) {
    // For role="alert", the "Alert:" prefix from finalize() is sufficient — suppress the role label
    // here to avoid the double-announcement "Alert: alert, …".
    const regionLabel = role === 'alert' ? null : (roledesc || LIVE_REGION_ROLES[role]);
    const content = normalizeText(element.textContent);
    const parts = [
      getExplicitName() || null,
      regionLabel,
      content || null,
    ].filter(Boolean);
    announcement = parts.join(', ');
    return finalize(announcement);
  }

  // 10. Landmarks: Type (Navigation, Main) + Label
  const landmarks = ["banner", "complementary", "contentinfo", "form", "main", "navigation", "region", "search"];
  if (landmarks.includes(role) || ["nav", "main", "header", "footer", "aside"].includes(tagName)) {
    const nameToUse = getExplicitName() || "";
    const landmarkRole = roledesc || role || tagName || '';
    announcement = `${nameToUse} ${landmarkRole} Landmark`.trim();
    return finalize(announcement);
  }


  // Abbreviation
  if (tagName === 'abbr' && element.hasAttribute('title')) {
    const expansion = element.getAttribute('title');
    const abbrevText = normalizeText(element.textContent);
    announcement = expansion
      ? `${abbrevText}, abbreviation for ${expansion}`
      : abbrevText;
    return finalize(announcement);
  }

  // Figure and figcaption
  if (tagName === 'figure' || role === 'figure') {
    const figcaption = element.querySelector?.(':scope > figcaption');
    const captionText = figcaption ? normalizeText(figcaption.textContent) : '';
    const figureName = getExplicitName() || captionText;
    const parts = [figureName || null, roledesc || 'figure'].filter(Boolean);
    announcement = parts.join(', ');
    return finalize(announcement);
  }

  if (tagName === 'figcaption') {
    announcement = `Figure caption, ${effectiveName}`;
    return finalize(announcement);
  }

  // Time element
  if (tagName === 'time') {
    const datetime = element?.getAttribute?.('datetime') ?? '';
    const displayText = effectiveName || normalizeText(element?.textContent);
    const datetimeDiffers = datetime && datetime !== displayText;
    const parts = [
      displayText || null,
      datetimeDiffers ? `(${datetime})` : null,
    ].filter(Boolean);
    announcement = parts.join(', ') || 'time';
    return finalize(announcement);
  }

  // Mark element (highlighted text)
  if (tagName === 'mark') {
    const markedText = effectiveName || normalizeText(element?.textContent);
    announcement = markedText
      ? `${markedText}, highlighted`
      : 'highlighted';
    return finalize(announcement);
  }

  // C8: Definition terms and descriptions
  if (tagName === 'dt') {
    const content = effectiveName || normalizeText(element?.textContent);
    announcement = `${content}, ${roledesc || 'term'}`;
    return finalize(announcement);
  }

  if (tagName === 'dd') {
    const content = effectiveName || normalizeText(element?.textContent);
    announcement = `${content}, ${roledesc || 'definition'}`;
    return finalize(announcement);
  }

  // Default fallback
  const MEANINGFUL_TAGS = new Set([
    'button','a','input','select','textarea',
    'h1','h2','h3','h4','h5','h6',
    'nav','main','header','footer','aside',
    'table','ul','ol','li'
  ]);
  const roleOrTag = (role || (MEANINGFUL_TAGS.has(tagName) ? tagName : '')).toLowerCase();
  announcement = `${effectiveName || ''} ${roleOrTag}`.trim();
  return finalize(announcement);
}

export function generateContext(element, data) {
  if (!element) return null;

  const { role } = data;
  const tagName = (data.tagName ?? '').toLowerCase();
  const parts = [];
  let positionAdded = false;

  // Prefers aria-posinset/setsize over DOM-computed position
  const getAriaPos = (el) => {
    const pos = parseInt(el?.getAttribute?.('aria-posinset') ?? '', 10);
    const total = parseInt(el?.getAttribute?.('aria-setsize') ?? '', 10);
    return (Number.isFinite(pos) && Number.isFinite(total)) ? { pos, total } : null;
  };

  // Fieldset group label — applies to checkboxes and radio buttons
  if (
    role === 'checkbox' || role === 'radio' ||
    (tagName === 'input' && (element.type === 'checkbox' || element.type === 'radio'))
  ) {
    const fieldset = element.closest?.('fieldset');
    const legend = fieldset?.querySelector?.(':scope > legend');
    const groupLabel = legend ? (legend.textContent ?? '').toString().replace(/\s+/g, ' ').trim() : '';
    if (groupLabel) parts.push(`Group: ${groupLabel}`);
  }

  // Radio group position
  if (role === 'radio' || (tagName === 'input' && element.type === 'radio')) {
    const ariaPos = getAriaPos(element);
    if (ariaPos) {
      if (ariaPos.total > 1) { parts.push(`${ariaPos.pos} of ${ariaPos.total} in group`); positionAdded = true; }
    } else {
      const name = element.getAttribute?.('name');
      if (name) {
        const group = Array.from(
          element.ownerDocument?.querySelectorAll(`input[type="radio"][name="${name}"]`) ?? []
        );
        const pos = group.indexOf(element) + 1;
        const total = group.length;
        if (pos > 0 && total > 1) { parts.push(`${pos} of ${total} in group`); positionAdded = true; }
      }
    }
  }

  // List position — skip roles that aren't semantically list items
  const SKIP_LIST_CONTEXT = new Set(['tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'treeitem']);
  if (!SKIP_LIST_CONTEXT.has(role)) {
    const listItem = element.closest?.('li, [role="listitem"], dt, dd');
    if (listItem) {
      const list = listItem.closest?.('ul, ol, dl, [role="list"]');
      if (list) {
        const ariaPos = getAriaPos(element) ?? getAriaPos(listItem);
        if (ariaPos) {
          if (ariaPos.total > 0) { parts.push(`${ariaPos.pos} of ${ariaPos.total} in list`); positionAdded = true; }
        } else {
          const isDl = list.tagName?.toLowerCase() === 'dl';
          if (isDl) {
            const allItems = Array.from(
              list.querySelectorAll?.('dt, dd') ?? []
            ).filter(item => item.closest?.('ul, ol, dl, [role="list"]') === list);
            const dtItems = allItems.filter(i => i.tagName?.toLowerCase() === 'dt');
            let currentDt = listItem.tagName?.toLowerCase() === 'dt'
              ? listItem
              : listItem.previousElementSibling;
            while (currentDt && currentDt.tagName?.toLowerCase() !== 'dt') {
              currentDt = currentDt.previousElementSibling;
            }
            const pos = currentDt ? dtItems.indexOf(currentDt) + 1 : 0;
            const total = dtItems.length;
            if (pos > 0 && total > 0) { parts.push(`${pos} of ${total} in list`); positionAdded = true; }
          } else {
            const allItems = Array.from(
              list.querySelectorAll?.('li, [role="listitem"]') ?? []
            ).filter(item => {
              const t = item.tagName?.toLowerCase();
              const r = (item.getAttribute?.('role') ?? '').toLowerCase();
              return (t === 'li' || r === 'listitem') &&
                     item.closest?.('ul, ol, [role="list"]') === list;
            });
            const pos = allItems.indexOf(listItem) + 1;
            const total = allItems.length;
            if (pos > 0 && total > 0) { parts.push(`${pos} of ${total} in list`); positionAdded = true; }
          }
        }
      }
    }
  }

  // Tab position
  if (role === 'tab') {
    const ariaPos = getAriaPos(element);
    if (ariaPos) {
      if (ariaPos.total > 1) { parts.push(`${ariaPos.pos} of ${ariaPos.total} in tab list`); positionAdded = true; }
    } else {
      const tablist = element.closest?.('[role="tablist"]');
      if (tablist) {
        const allTabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
        const pos = allTabs.indexOf(element) + 1;
        const total = allTabs.length;
        if (pos > 0 && total > 1) { parts.push(`${pos} of ${total} in tab list`); positionAdded = true; }
      }
    }
  }

  // Menu item position
  if (['menuitem', 'menuitemcheckbox', 'menuitemradio'].includes(role)) {
    const ariaPos = getAriaPos(element);
    if (ariaPos) {
      if (ariaPos.total > 1) { parts.push(`${ariaPos.pos} of ${ariaPos.total} in menu`); positionAdded = true; }
    } else {
      const menu = element.closest?.('[role="menu"], [role="menubar"]');
      if (menu) {
        const allItems = Array.from(
          menu.querySelectorAll('[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]')
        ).filter(el => el.closest?.('[role="menu"],[role="menubar"]') === menu);
        const pos = allItems.indexOf(element) + 1;
        const total = allItems.length;
        if (pos > 0 && total > 1) { parts.push(`${pos} of ${total} in menu`); positionAdded = true; }
      }
    }
  }

  // Option position inside listbox
  if (role === 'option') {
    const ariaPos = getAriaPos(element);
    if (ariaPos) {
      if (ariaPos.total > 1) { parts.push(`${ariaPos.pos} of ${ariaPos.total} in list`); positionAdded = true; }
    } else {
      const listbox = element.closest?.('[role="listbox"]');
      if (listbox) {
        const allOptions = Array.from(listbox.querySelectorAll('[role="option"]'))
          .filter(el => el.closest?.('[role="listbox"]') === listbox);
        const pos = allOptions.indexOf(element) + 1;
        const total = allOptions.length;
        if (pos > 0 && total > 1) { parts.push(`${pos} of ${total} in list`); positionAdded = true; }
      }
    }
  }

  // Treeitem level and position
  if (role === 'treeitem') {
    const level = parseInt(element.getAttribute?.('aria-level') ?? '1', 10);
    const tree = element.closest?.('[role="tree"],[role="treegrid"]');
    if (tree) {
      const ariaPos = getAriaPos(element);
      parts.push(`level ${level}`);
      if (ariaPos) {
        if (ariaPos.total > 1) { parts.push(`${ariaPos.pos} of ${ariaPos.total} at this level`); positionAdded = true; }
      } else {
        const peersAtLevel = Array.from(tree.querySelectorAll('[role="treeitem"]'))
          .filter(el => el.getAttribute('aria-level') === String(level));
        const pos = peersAtLevel.indexOf(element) + 1;
        const total = peersAtLevel.length;
        if (pos > 0 && total > 1) { parts.push(`${pos} of ${total} at this level`); positionAdded = true; }
      }
    }
  }

  // Table cell coordinates and headers (consumed from data.tableContext)
  if (data.tableContext) {
    const tc = data.tableContext;
    const coordStr = `Row ${tc.row}, Column ${tc.col}`;
    parts.push(coordStr);
    // Header cells are the headers — don't echo their siblings back as context
    const isHeaderCell = tagName === 'th' || role === 'columnheader' || role === 'rowheader';
    if (!isHeaderCell) {
      const headerStr = [
        tc.colHeaders?.length ? `Column: ${tc.colHeaders.join(', ')}` : null,
        tc.rowHeaders?.length ? `Row: ${tc.rowHeaders.join(', ')}` : null,
      ].filter(Boolean).join('; ');
      if (headerStr) parts.push(headerStr);
    }
    positionAdded = true;
  }

  // Catch-all: explicit aria-posinset/setsize on roles not handled above
  if (!positionAdded) {
    const ariaPos = getAriaPos(element);
    if (ariaPos && ariaPos.total > 1) parts.push(`${ariaPos.pos} of ${ariaPos.total} in set`);
  }

  return parts.length > 0 ? parts.join(', ') : null;
}
