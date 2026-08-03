import { describe, it, expect, beforeEach, vi } from 'vitest';
import { computeTrace } from './trace.js';

describe('computeTrace', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    // Mock getComputedStyle for JSDOM
    vi.stubGlobal('getComputedStyle', (el) => ({
      display: el.style.display || 'block'
    }));
  });

  it('returns empty array for invalid input', () => {
    expect(computeTrace(null)).toEqual([]);
    expect(computeTrace(document.createTextNode('test'))).toEqual([]);
  });

  it('identifies hidden but focusable elements as errors', () => {
    const el = document.createElement('button');
    el.setAttribute('aria-hidden', 'true');
    el.textContent = 'Hidden Button';
    document.body.appendChild(el);

    const trace = computeTrace(el);
    const error = trace.find(s => s.type === 'error');
    expect(error.step).toBe('Conflict Warning');
    expect(error.value).toContain('accessibility violation');
  });

  it('handles aria-labelledby with valid and invalid references', () => {
    document.body.innerHTML = `
      <div id="target" aria-labelledby="ref1 ref2"></div>
      <span id="ref1">First</span>
    `;
    const target = document.getElementById('target');
    const trace = computeTrace(target);

    const step = trace.find(s => s.step === 'aria-labelledby attribute');
    expect(step.type).toBe('warning'); // Warning because ref2 is missing
    expect(step.details.find(d => d.id === 'ref1')?.found).toBe(true);
    expect(step.details.find(d => d.id === 'ref2')?.found).toBe(false);
  });

  it('marks aria-labelledby as success when all refs found', () => {
    document.body.innerHTML = `
      <div id="target" aria-labelledby="ref1"></div>
      <span id="ref1">Label</span>
    `;
    const target = document.getElementById('target');
    const trace = computeTrace(target);

    const step = trace.find(s => s.step === 'aria-labelledby attribute');
    expect(step.type).toBe('success');
  });

  it('ignores aria-label when aria-labelledby is present and valid', () => {
    document.body.innerHTML = `
      <div id="target" aria-labelledby="ref1" aria-label="Label"></div>
      <span id="ref1">Reference</span>
    `;
    const target = document.getElementById('target');
    const trace = computeTrace(target);

    const labelStep = trace.find(s => s.step === 'aria-label attribute');
    expect(labelStep.type).toBe('info');
    expect(labelStep.value).toContain('Ignored: overridden');
  });

  it('handles alt attribute for images', () => {
    const img = document.createElement('img');
    img.setAttribute('alt', 'Image Alt');
    const trace = computeTrace(img);

    const step = trace.find(s => s.step === 'alt attribute');
    expect(step.type).toBe('success');
    expect(step.value).toContain('Image Alt');
  });

  it('handles child image alt attribute', () => {
    document.body.innerHTML = `
      <button id="target">
        <img src="icon.png" alt="Close">
      </button>
    `;
    const target = document.getElementById('target');
    const trace = computeTrace(target);

    const step = trace.find(s => s.step === 'Child image alt attribute');
    expect(step.type).toBe('success');
    expect(step.value).toContain('Close');
  });

  it('handles text content as fallback', () => {
    const btn = document.createElement('button');
    btn.textContent = 'Click Me';
    const trace = computeTrace(btn);

    const step = trace.find(s => s.step === 'Text content');
    expect(step.type).toBe('success');
    expect(step.value).toContain('Click Me');
  });

  it('handles title attribute as final fallback', () => {
    const div = document.createElement('div');
    div.setAttribute('title', 'Helpful Title');
    const trace = computeTrace(div);

    const step = trace.find(s => s.step === 'title attribute');
    expect(step.type).toBe('success');
    expect(step.value).toContain('Used as fallback');
  });

  it('shows info when optional attributes are missing', () => {
    const div = document.createElement('div');
    const trace = computeTrace(div);

    expect(trace.find(s => s.step === 'aria-labelledby attribute').value).toBe('Not present');
    expect(trace.find(s => s.step === 'aria-label attribute').value).toBe('Not present');
    expect(trace.find(s => s.step === 'title attribute').value).toBe('Not present');
  });

  it('marks aria-label as ignored when aria-labelledby wins', () => {
    document.body.innerHTML = `
      <button id="target" aria-labelledby="label" aria-label="Label Value"></button>
      <span id="label">Actual Label</span>
    `;
    const target = document.getElementById('target');
    const trace = computeTrace(target);

    const step = trace.find(s => s.step === 'aria-label attribute');
    expect(step.type).toBe('info');
    expect(step.value).toContain('Ignored: overridden');
  });

  it('marks alt as ignored when aria-label wins', () => {
    const img = document.createElement('img');
    img.setAttribute('aria-label', 'Label');
    img.setAttribute('alt', 'Alt Text');
    const trace = computeTrace(img);

    const step = trace.find(s => s.step === 'alt attribute');
    expect(step.type).toBe('info');
    expect(step.value).toContain('Ignored: overridden');
  });

  it('marks child alt as ignored when aria-label wins', () => {
    document.body.innerHTML = `
      <button id="target" aria-label="Main Label">
        <img alt="Child Alt">
      </button>
    `;
    const target = document.getElementById('target');
    const trace = computeTrace(target);

    const step = trace.find(s => s.step === 'Child image alt attribute');
    expect(step.type).toBe('info');
    expect(step.value).toContain('Ignored: overridden');
  });

  it('marks text content as ignored when alt attribute wins', () => {
    const img = document.createElement('input');
    img.setAttribute('alt', 'Alt text');
    img.textContent = 'Button Text';
    const trace = computeTrace(img);

    const step = trace.find(s => s.step === 'Text content');
    expect(step.type).toBe('info');
    expect(step.value).toContain('Ignored: overridden');
  });

  it('marks title as ignored when text content wins', () => {
    const button = document.createElement('button');
    button.textContent = 'Label';
    button.setAttribute('title', 'Override');
    const trace = computeTrace(button);

    const step = trace.find(s => s.step === 'title attribute');
    expect(step.type).toBe('info');
    expect(step.value).toContain('Ignored: overridden');
  });

  it('handles associated label elements for input fields', () => {
    document.body.innerHTML = `
      <label for="username">Username Label</label>
      <input id="username" />
      <label>
        Password Label
        <input id="password" />
      </label>
    `;
    const username = document.getElementById('username');
    const password = document.getElementById('password');

    const trace1 = computeTrace(username);
    const step1 = trace1.find(s => s.step === 'Associated label elements');
    expect(step1.type).toBe('success');
    expect(step1.value).toContain('Username Label');

    const trace2 = computeTrace(password);
    const step2 = trace2.find(s => s.step === 'Associated label elements');
    expect(step2.type).toBe('success');
    expect(step2.value).toContain('Password Label');
  });

  it('includes details array with label type for each associated label', () => {
    document.body.innerHTML = `
      <label for="email">Email</label>
      <label>
        (required)
        <input id="email" type="email" />
      </label>
    `;
    const input = document.getElementById('email');
    const trace = computeTrace(input);
    const step = trace.find(s => s.step === 'Associated label elements');

    expect(step.details).toHaveLength(2);
    expect(step.details[0].labelType).toBe('for="email"');
    expect(step.details[0].value).toBe('Email');
    expect(step.details[1].labelType).toBe('wraps input');
    expect(step.details[1].value).toContain('(required)');
  });

  it('marks associated labels as ignored when overridden by aria-label', () => {
    document.body.innerHTML = `
      <label for="username">Username Label</label>
      <input id="username" aria-label="Custom User" />
    `;
    const username = document.getElementById('username');
    const trace = computeTrace(username);
    const step = trace.find(s => s.step === 'Associated label elements');
    expect(step.type).toBe('info');
    expect(step.value).toContain('Ignored: overridden');
    expect(step.details).toHaveLength(1);
    expect(step.details[0].labelType).toBe('for="username"');
    expect(step.details[0].value).toBe('Username Label');
  });

  it('handles descendant name contributions in text content', () => {
    document.body.innerHTML = `
      <button id="target">
        <span aria-label="Save changes">Save</span>
      </button>
    `;
    const target = document.getElementById('target');
    const trace = computeTrace(target);
    const step = trace.find(s => s.step === 'Text content');
    expect(step.type).toBe('success');
    expect(step.value).toContain('Save changes');
    expect(step.details).toHaveLength(2);
    expect(step.details[0].nodeType).toBe('aria-label');
    expect(step.details[0].value).toBe('Save changes');
    expect(step.details[1].nodeType).toBe('text');
    expect(step.details[1].value).toBe('Save');
    expect(step.details[1].overridden).toBe(true);
  });

  it('accumulates descendant contributions from aria-label and plain text nodes', () => {
    document.body.innerHTML = `
      <a id="mixed-link" href="#">
        <span aria-label="GitHub">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="8" fill="#333"></circle></svg>
        </span>
        Profile
      </a>
    `;
    const target = document.getElementById('mixed-link');
    const trace = computeTrace(target);
    const step = trace.find(s => s.step === 'Text content');
    expect(step.type).toBe('success');
    expect(step.value).toContain('GitHub');
    expect(step.value).toContain('Profile');
    expect(step.details).toHaveLength(2);
    expect(step.details[0].nodeType).toBe('aria-label');
    expect(step.details[0].value).toBe('GitHub');
    expect(step.details[1].nodeType).toBe('text');
    expect(step.details[1].value).toBe('Profile');
    expect(step.details[1].overridden).toBeUndefined();
  });

  it('excludes aria-hidden span text from "Text content" but records it as excluded detail', () => {
    document.body.innerHTML = `
      <button id="target">
        Visible
        <span aria-hidden="true">Hidden</span>
      </button>
    `;
    const target = document.getElementById('target');
    const trace = computeTrace(target);
    const step = trace.find(s => s.step === 'Text content');
    expect(step.type).toBe('success');
    // Accessible name should NOT include the hidden span text
    expect(step.value).toContain('Visible');
    expect(step.value).not.toContain('Hidden');
    // But a detail entry with excluded:true should be present
    const excludedDetail = step.details.find(d => d.excluded === true);
    expect(excludedDetail).toBeDefined();
    expect(excludedDetail.value).toBe('Hidden');
    expect(excludedDetail.reason).toBe('aria-hidden');
  });

  it('aria-labelledby still resolves text even when the referenced element is aria-hidden', () => {
    document.body.innerHTML = `
      <div id="target" aria-labelledby="ref1"></div>
      <span id="ref1" aria-hidden="true">Hidden Label</span>
    `;
    const target = document.getElementById('target');
    const trace = computeTrace(target);
    const step = trace.find(s => s.step === 'aria-labelledby attribute');
    // aria-labelledby crosses hidden subtrees — text should still be resolved
    expect(step.type).toBe('success');
    expect(step.value).toContain('Hidden Label');
  });

  it('excludes child with hidden attribute from "Text content" trace step', () => {
    document.body.innerHTML = `
      <button id="target">
        Shown
        <span hidden>Invisible</span>
      </button>
    `;
    const target = document.getElementById('target');
    const trace = computeTrace(target);
    const step = trace.find(s => s.step === 'Text content');
    expect(step.type).toBe('success');
    expect(step.value).toContain('Shown');
    expect(step.value).not.toContain('Invisible');
    const excludedDetail = step.details.find(d => d.excluded === true);
    expect(excludedDetail).toBeDefined();
    expect(excludedDetail.value).toBe('Invisible');
  });

  it('handles empty aria-label correctly', () => {
    const div = document.createElement('div');
    div.setAttribute('aria-label', '   ');
    const trace = computeTrace(div);

    const step = trace.find(s => s.step === 'aria-label attribute');
    expect(step.type).toBe('info');
    expect(step.value).not.toContain('Ignored: overridden');
  });

  it('truncates long text content in trace', () => {
    const div = document.createElement('div');
    div.textContent = 'This is a very long string of text that should definitely exceed the fifty character limit we set in the trace logic to keep the UI clean properly.';
    const trace = computeTrace(div);

    const step = trace.find(s => s.step === 'Text content');
    expect(step.value).toContain('...');
    expect(step.value.length).toBeLessThan(100); // UI-friendly length
  });
});
