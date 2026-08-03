import { describe, it, expect } from 'vitest';
import { computeStatesSummary, computeValueSummary } from './state-summary.js';

describe('computeStatesSummary', () => {
  it('returns (none) when states is empty', () => {
    expect(computeStatesSummary({})).toBe('(none)');
  });

  it('returns (none) when all states are null/undefined/false', () => {
    expect(computeStatesSummary({ expanded: null, checked: null, disabled: false })).toBe('(none)');
  });

  it('maps expanded: "true" → expanded', () => {
    expect(computeStatesSummary({ expanded: 'true' })).toBe('expanded');
  });

  it('maps expanded: "false" → collapsed', () => {
    expect(computeStatesSummary({ expanded: 'false' })).toBe('collapsed');
  });

  it('maps checked: "true" → checked', () => {
    expect(computeStatesSummary({ checked: 'true' })).toBe('checked');
  });

  it('maps checked: "false" → not checked', () => {
    expect(computeStatesSummary({ checked: 'false' })).toBe('not checked');
  });

  it('maps checked: "mixed" → partially checked', () => {
    expect(computeStatesSummary({ checked: 'mixed' })).toBe('partially checked');
  });

  it('maps pressed: "true" → pressed', () => {
    expect(computeStatesSummary({ pressed: 'true' })).toBe('pressed');
  });

  it('maps pressed: "false" → not pressed', () => {
    expect(computeStatesSummary({ pressed: 'false' })).toBe('not pressed');
  });

  it('maps pressed: "mixed" → partially pressed', () => {
    expect(computeStatesSummary({ pressed: 'mixed' })).toBe('partially pressed');
  });

  it('maps selected: "true" → selected', () => {
    expect(computeStatesSummary({ selected: 'true' })).toBe('selected');
  });

  it('maps selected: "false" → not selected', () => {
    expect(computeStatesSummary({ selected: 'false' })).toBe('not selected');
  });

  it('maps disabled: true → disabled', () => {
    expect(computeStatesSummary({ disabled: true })).toBe('disabled');
  });

  it('does not include disabled when false', () => {
    expect(computeStatesSummary({ disabled: false })).toBe('(none)');
  });

  it('maps hidden: true → hidden', () => {
    expect(computeStatesSummary({ hidden: true })).toBe('hidden');
  });

  it('maps live: "polite" → live (polite)', () => {
    expect(computeStatesSummary({ live: 'polite' })).toBe('live (polite)');
  });

  it('maps live: "assertive" → live (assertive)', () => {
    expect(computeStatesSummary({ live: 'assertive' })).toBe('live (assertive)');
  });

  it('formats value with range', () => {
    expect(computeValueSummary({ valueNow: '50', valueMin: '0', valueMax: '100' })).toBe('50 (0–100)');
  });

  it('formats value without range', () => {
    expect(computeValueSummary({ valueNow: '50', valueMin: null, valueMax: null })).toBe('50');
  });

  it('combines multiple active states comma-separated', () => {
    expect(computeStatesSummary({ expanded: 'false', disabled: true })).toBe('collapsed, disabled');
  });

  it('ordering: expanded, checked, pressed, selected, disabled, hidden, live, value', () => {
    const result = computeStatesSummary({ checked: 'true', expanded: 'true', disabled: true });
    expect(result).toBe('expanded, checked, disabled');
  });
});
