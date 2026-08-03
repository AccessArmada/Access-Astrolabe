export function computeStatesSummary(states) {
  const parts = [];

  if (states.expanded !== null && states.expanded !== undefined) {
    parts.push(states.expanded === 'true' ? 'expanded' : 'collapsed');
  }
  if (states.checked !== null && states.checked !== undefined) {
    if (states.checked === 'true') parts.push('checked');
    else if (states.checked === 'false') parts.push('not checked');
    else if (states.checked === 'mixed') parts.push('partially checked');
  }
  if (states.pressed !== null && states.pressed !== undefined) {
    if (states.pressed === 'true') parts.push('pressed');
    else if (states.pressed === 'false') parts.push('not pressed');
    else if (states.pressed === 'mixed') parts.push('partially pressed');
  }
  if (states.selected !== null && states.selected !== undefined) {
    parts.push(states.selected === 'true' ? 'selected' : 'not selected');
  }
  if (states.required) parts.push('required');
  if (states.invalid) parts.push('invalid');
  if (states.current && states.current !== 'false') {
    const CURRENT_LABELS = {
      page:     'current page',
      step:     'current step',
      location: 'current location',
      date:     'current date',
      time:     'current time',
      true:     'current',
    };
    parts.push(CURRENT_LABELS[states.current] ?? `current ${states.current}`);
  }
  if (states.disabled) parts.push('disabled');
  if (states.hidden) parts.push('hidden');
  if (states.live === 'polite') parts.push('live (polite)');
  else if (states.live === 'assertive') parts.push('live (assertive)');

  return parts.length > 0 ? parts.join(', ') : '(none)';
}

export function computeValueSummary(states) {
  const parts = [];

  const valueNow = states.valueNow;
  const valueMin = states.valueMin;
  const valueMax = states.valueMax;

  if (valueNow !== null && valueNow !== undefined && valueNow !== '') {
    const hasRange =
      (valueMin !== null && valueMin !== undefined && valueMin !== '') &&
      (valueMax !== null && valueMax !== undefined && valueMax !== '');
    parts.push(hasRange
      ? `${valueNow} (${valueMin}–${valueMax})`
      : `${valueNow}`);
  }

  return parts.length > 0 ? parts.join(', ') : '(none)';
}
