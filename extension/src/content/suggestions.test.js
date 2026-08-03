import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { computeSuggestions } from './suggestions.js';

function makeEl(html, bodyHtml) {
  const dom = new JSDOM(`<!DOCTYPE html><body>${bodyHtml ?? html}</body>`);
  if (bodyHtml) {
    return dom.window.document.body.querySelector('[data-test]') ??
      dom.window.document.body.firstElementChild;
  }
  return dom.window.document.body.firstElementChild;
}

// ─── Critical Rules ───────────────────────────────────────────────────────────

describe('Critical rules', () => {
  it('flags hidden + focusable element', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><button aria-hidden="true">Click</button></body>`);
    const el = dom.window.document.querySelector('button');
    expect(computeSuggestions(el).some(s => s.category === 'critical' && /focusable/.test(s.message))).toBe(true);
  });

  it('does not flag hidden non-focusable element', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><div aria-hidden="true">info</div></body>`);
    const el = dom.window.document.querySelector('div');
    expect(computeSuggestions(el).some(s => /focusable/.test(s.message))).toBe(false);
  });

  it('flags empty button', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><button></button></body>`);
    const el = dom.window.document.querySelector('button');
    expect(computeSuggestions(el).some(s => s.category === 'critical' && /accessible name/.test(s.message))).toBe(true);
  });

  it('does not flag button with text', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><button>Submit</button></body>`);
    const el = dom.window.document.querySelector('button');
    expect(computeSuggestions(el).some(s => /accessible name/.test(s.message))).toBe(false);
  });

  it('does not flag button with aria-label', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><button aria-label="Close dialog"></button></body>`);
    const el = dom.window.document.querySelector('button');
    expect(computeSuggestions(el).some(s => /accessible name/.test(s.message))).toBe(false);
  });

  it('flags empty link', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><a href="/home"></a></body>`);
    const el = dom.window.document.querySelector('a');
    expect(computeSuggestions(el).some(s => s.category === 'critical' && /link/.test(s.message))).toBe(true);
  });

  it('flags input with placeholder but no label', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><input placeholder="Enter email"></body>`);
    const el = dom.window.document.querySelector('input');
    expect(computeSuggestions(el).some(s => s.category === 'critical' && /placeholder/i.test(s.message))).toBe(true);
  });

  it('does not flag input with placeholder AND aria-label', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><input placeholder="Enter email" aria-label="Email address"></body>`);
    const el = dom.window.document.querySelector('input');
    expect(computeSuggestions(el).some(s => /placeholder/.test(s.message))).toBe(false);
  });

  it('does not flag input with placeholder AND native label', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><label for="e">Email</label><input id="e" placeholder="Enter email"></body>`);
    const el = dom.window.document.getElementById('e');
    expect(computeSuggestions(el).some(s => /placeholder/.test(s.message))).toBe(false);
  });

  it('flags svg with no accessible name', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><svg></svg></body>`);
    const el = dom.window.document.querySelector('svg');
    expect(computeSuggestions(el).some(s => s.category === 'critical' && /SVG/.test(s.message))).toBe(true);
  });

  it('does not flag svg with aria-label', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><svg aria-label="Logo" role="img"></svg></body>`);
    const el = dom.window.document.querySelector('svg');
    expect(computeSuggestions(el).some(s => /SVG/.test(s.message))).toBe(false);
  });

  it('flags iframe without title', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><iframe src="x.html"></iframe></body>`);
    const el = dom.window.document.querySelector('iframe');
    expect(computeSuggestions(el).some(s => s.category === 'critical' && /title/.test(s.message))).toBe(true);
  });

  it('does not flag iframe with title', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><iframe src="x.html" title="Map embed"></iframe></body>`);
    const el = dom.window.document.querySelector('iframe');
    expect(computeSuggestions(el).some(s => /title/.test(s.message))).toBe(false);
  });
});

// ─── Best Practice Rules ─────────────────────────────────────────────────────

describe('Best practice rules', () => {
  it('flags redundant role on <nav>', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><nav role="navigation"></nav></body>`);
    const el = dom.window.document.querySelector('nav');
    expect(computeSuggestions(el).some(s => /redundant/.test(s.message))).toBe(true);
  });

  it('does not flag nav without redundant role', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><nav></nav></body>`);
    const el = dom.window.document.querySelector('nav');
    expect(computeSuggestions(el).some(s => /redundant/.test(s.message))).toBe(false);
  });

  it('flags redundant role on <button>', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><button role="button">Click</button></body>`);
    const el = dom.window.document.querySelector('button');
    expect(computeSuggestions(el).some(s => /redundant/.test(s.message))).toBe(true);
  });

  it('flags aria-label on non-interactive div', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><div aria-label="Info section">text</div></body>`);
    const el = dom.window.document.querySelector('div');
    expect(computeSuggestions(el).some(s => /generic/.test(s.message))).toBe(true);
  });

  it('does not flag aria-label on div with button role', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><div role="button" aria-label="Close" tabindex="0">x</div></body>`);
    const el = dom.window.document.querySelector('div');
    expect(computeSuggestions(el).some(s => /generic/.test(s.message))).toBe(false);
  });

  it('flags div with onclick but no role/tabindex', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><div onclick="go()">click me</div></body>`);
    const el = dom.window.document.querySelector('div');
    expect(computeSuggestions(el).some(s => /keyboard/.test(s.message))).toBe(true);
  });

  it('does not flag div with onclick that has role+tabindex', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><div onclick="go()" role="button" tabindex="0">click me</div></body>`);
    const el = dom.window.document.querySelector('div');
    expect(computeSuggestions(el).some(s => /keyboard/.test(s.message))).toBe(false);
  });

  it('flags layout table (has no th)', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><table><tr><td id="c">Cell</td></tr></table></body>`);
    const el = dom.window.document.getElementById('c');
    expect(computeSuggestions(el).some(s => /layout/.test(s.message))).toBe(true);
  });

  it('flags data table without caption or label', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><table><tr><th>Name</th></tr><tr><td id="c">Alice</td></tr></table></body>`);
    const el = dom.window.document.getElementById('c');
    expect(computeSuggestions(el).some(s => /caption/.test(s.message))).toBe(true);
  });

  it('does not flag data table with caption', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><table><caption>Members</caption><tr><th>Name</th></tr><tr><td id="c">Alice</td></tr></table></body>`);
    const el = dom.window.document.getElementById('c');
    expect(computeSuggestions(el).some(s => /caption/.test(s.message))).toBe(false);
  });

  it('flags heading level skip (h1 to h3)', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><h1>Title</h1><h3 id="t">Section</h3></body>`);
    const el = dom.window.document.getElementById('t');
    expect(computeSuggestions(el).some(s => /skip/.test(s.message))).toBe(true);
  });

  it('does not flag sequential headings', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><h1>Title</h1><h2 id="t">Section</h2></body>`);
    const el = dom.window.document.getElementById('t');
    expect(computeSuggestions(el).some(s => /skip/.test(s.message))).toBe(false);
  });

  it('flags positive tabindex', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><div tabindex="3">item</div></body>`);
    const el = dom.window.document.querySelector('div');
    expect(computeSuggestions(el).some(s => /natural focus order/.test(s.message))).toBe(true);
  });

  it('does not flag tabindex=0', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><div tabindex="0">item</div></body>`);
    const el = dom.window.document.querySelector('div');
    expect(computeSuggestions(el).some(s => /natural focus order/.test(s.message))).toBe(false);
  });

  it('flags role="button" on anchor with href', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><a href="/go" role="button">Go</a></body>`);
    const el = dom.window.document.querySelector('a');
    expect(computeSuggestions(el).some(s => /Links navigate/.test(s.message))).toBe(true);
  });

  it('does not flag anchor without role=button', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><a href="/go">Go</a></body>`);
    const el = dom.window.document.querySelector('a');
    expect(computeSuggestions(el).some(s => /Links navigate/.test(s.message))).toBe(false);
  });
});

// ─── Content Quality Rules ────────────────────────────────────────────────────

describe('Content quality rules', () => {
  it('flags alt text starting with "image of"', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><img alt="Image of a dog"></body>`);
    const el = dom.window.document.querySelector('img');
    expect(computeSuggestions(el).some(s => /already announce/.test(s.message))).toBe(true);
  });

  it('flags alt text starting with "photo of"', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><img alt="Photo of a sunset"></body>`);
    const el = dom.window.document.querySelector('img');
    expect(computeSuggestions(el).some(s => /already announce/.test(s.message))).toBe(true);
  });

  it('does not flag descriptive alt text', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><img alt="Golden retriever running on a beach"></body>`);
    const el = dom.window.document.querySelector('img');
    expect(computeSuggestions(el).some(s => /already announce/.test(s.message))).toBe(false);
  });

  it('flags filename-looking alt text with extension', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><img alt="hero_banner.jpg"></body>`);
    const el = dom.window.document.querySelector('img');
    expect(computeSuggestions(el).some(s => /filename/.test(s.message))).toBe(true);
  });

  it('flags filename-looking alt text with underscores', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><img alt="hero_final_v2"></body>`);
    const el = dom.window.document.querySelector('img');
    expect(computeSuggestions(el).some(s => /filename/.test(s.message))).toBe(true);
  });

  it('flags ambiguous link text "click here"', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><a href="/x">Click here</a></body>`);
    const el = dom.window.document.querySelector('a');
    expect(computeSuggestions(el).some(s => /Ambiguous/.test(s.message))).toBe(true);
  });

  it('flags ambiguous link text "read more"', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><a href="/x">Read more</a></body>`);
    const el = dom.window.document.querySelector('a');
    expect(computeSuggestions(el).some(s => /Ambiguous/.test(s.message))).toBe(true);
  });

  it('does not flag descriptive link text', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><a href="/privacy">Read our Privacy Policy</a></body>`);
    const el = dom.window.document.querySelector('a');
    expect(computeSuggestions(el).some(s => /Ambiguous/.test(s.message))).toBe(false);
  });

  it('flags role name in label - nav with "Navigation"', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><nav aria-label="Footer Navigation"></nav></body>`);
    const el = dom.window.document.querySelector('nav');
    expect(computeSuggestions(el).some(s => /role name/.test(s.message))).toBe(true);
  });

  it('flags role name in label - button with "Button"', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><button aria-label="Submit Button">Submit</button></body>`);
    const el = dom.window.document.querySelector('button');
    expect(computeSuggestions(el).some(s => /role name/.test(s.message))).toBe(true);
  });

  it('does not flag label that does not include role name', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><nav aria-label="Footer"></nav></body>`);
    const el = dom.window.document.querySelector('nav');
    expect(computeSuggestions(el).some(s => /role name/.test(s.message))).toBe(false);
  });
});

// ─── Hybrid Mentor Heuristics ────────────────────────────────────────────────

describe('Hybrid mentor heuristics', () => {
  it('flags potential accordion missing aria-expanded', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><button class="accordion-header">FAQ Item</button></body>`);
    const el = dom.window.document.querySelector('button');
    expect(computeSuggestions(el).some(s => /Is this an accordion/.test(s.message))).toBe(true);
  });

  it('flags potential FAQ missing aria-expanded', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><div id="faq-toggle" tabindex="0" role="button">What is this?</div></body>`);
    const el = dom.window.document.querySelector('div');
    expect(computeSuggestions(el).some(s => /Is this an accordion/.test(s.message))).toBe(true);
  });

  it('does not flag accordion that HAS aria-expanded', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><button class="accordion" aria-expanded="false">Item</button></body>`);
    const el = dom.window.document.querySelector('button');
    expect(computeSuggestions(el).some(s => /Is this an accordion/.test(s.message))).toBe(false);
  });

  it('flags mobile nav toggle missing aria-expanded', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><button id="mobile-navigation-btn">Menu</button></body>`);
    const el = dom.window.document.querySelector('button');
    expect(computeSuggestions(el).some(s => /mobile menu toggle/.test(s.message))).toBe(true);
  });

  it('flags aria-haspopup missing aria-expanded', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><button aria-haspopup="true">Options</button></body>`);
    const el = dom.window.document.querySelector('button');
    expect(computeSuggestions(el).some(s => /triggers a popup/.test(s.message))).toBe(true);
  });

  it('does not flag aria-haspopup that HAS aria-expanded', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><button aria-haspopup="true" aria-expanded="false">Options</button></body>`);
    const el = dom.window.document.querySelector('button');
    expect(computeSuggestions(el).some(s => /triggers a popup/.test(s.message))).toBe(false);
  });
});

// ─── Name & Labeling Expansion ──────────────────────────────────────────────

describe('Name & Labeling rules', () => {
  it('flags role="dialog" without a name', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><div role="dialog">Content</div></body>`);
    const el = dom.window.document.querySelector('div');
    expect(computeSuggestions(el).some(s => /Dialogs must have an accessible name/.test(s.message))).toBe(true);
  });

  it('flags empty heading', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><h2></h2></body>`);
    const el = dom.window.document.querySelector('h2');
    expect(computeSuggestions(el).some(s => /Empty heading detected/.test(s.message))).toBe(true);
  });

  it('flags input button without value', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><input type="submit"></body>`);
    const el = dom.window.document.querySelector('input');
    expect(computeSuggestions(el).some(s => /no discernible text/.test(s.message))).toBe(true);
  });

  it('flags form field using ONLY title as label', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><input title="Search"></body>`);
    const el = dom.window.document.querySelector('input');
    expect(computeSuggestions(el).some(s => /Using only a title attribute/.test(s.message))).toBe(true);
  });
});

// ─── ARIA Integrity ─────────────────────────────────────────────────────────

describe('ARIA Integrity rules', () => {
  it('flags role="checkbox" missing aria-checked', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><div role="checkbox" aria-label="Accept terms"></div></body>`);
    const el = dom.window.document.querySelector('div');
    expect(computeSuggestions(el).some(s => /requires the aria-checked attribute/.test(s.message))).toBe(true);
  });

  it('flags role="option" missing role="listbox" parent', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><div role="option">Item</div></body>`);
    const el = dom.window.document.querySelector('div');
    expect(computeSuggestions(el).some(s => /must be nested inside a listbox/.test(s.message))).toBe(true);
  });

  it('flags nested interactive elements (button in link)', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><a href="/"><button>Click</button></a></body>`);
    const el = dom.window.document.querySelector('a');
    expect(computeSuggestions(el).some(s => /Nested interactive elements/.test(s.message))).toBe(true);
  });

  it('flags deprecated role="directory"', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><div role="directory"></div></body>`);
    const el = dom.window.document.querySelector('div');
    expect(computeSuggestions(el).some(s => /role="directory" is deprecated/.test(s.message))).toBe(true);
  });
});

// ─── Role Resolution Conflicts ──────────────────────────────────────────────

describe('Role resolution conflict rules', () => {
  it('flags unrecognized role token', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><div role="buttn">Save</div></body>`);
    const el = dom.window.document.querySelector('div');
    expect(computeSuggestions(el, '', null).some(s => s.category === 'critical' && /no recognized ARIA roles/.test(s.message))).toBe(true);
  });

  it('does not flag a valid role', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><div role="button" tabindex="0">Save</div></body>`);
    const el = dom.window.document.querySelector('div');
    expect(computeSuggestions(el, '', 'button').some(s => /no recognized ARIA roles/.test(s.message))).toBe(false);
  });

  it('flags multiple role tokens where extras are ignored', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><div role="button link" tabindex="0">Click</div></body>`);
    const el = dom.window.document.querySelector('div');
    expect(computeSuggestions(el, '', 'button').some(s => /Only the first valid token/.test(s.message))).toBe(true);
  });

  it('does not flag a single valid role token', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><div role="button" tabindex="0">Click</div></body>`);
    const el = dom.window.document.querySelector('div');
    expect(computeSuggestions(el, '', 'button').some(s => /Only the first valid token/.test(s.message))).toBe(false);
  });

  it('flags presentation ignored on focusable element', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><button role="presentation">×</button></body>`);
    const el = dom.window.document.querySelector('button');
    expect(computeSuggestions(el, '', 'button').some(s => s.category === 'critical' && /ignored because/.test(s.message))).toBe(true);
  });

  it('flags none ignored on focusable element', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><button role="none">×</button></body>`);
    const el = dom.window.document.querySelector('button');
    expect(computeSuggestions(el, '', 'button').some(s => s.category === 'critical' && /ignored because/.test(s.message))).toBe(true);
  });

  it('flags presentation ignored due to global ARIA attribute', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><div role="presentation" aria-label="something">content</div></body>`);
    const el = dom.window.document.querySelector('div');
    expect(computeSuggestions(el, '', 'generic').some(s => s.category === 'critical' && /ignored because/.test(s.message))).toBe(true);
  });

  it('does not flag presentation on non-focusable element without ARIA attrs', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><div role="presentation">decorative</div></body>`);
    const el = dom.window.document.querySelector('div');
    expect(computeSuggestions(el, '', 'presentation').some(s => /ignored because/.test(s.message))).toBe(false);
  });

  it('flags mixed valid and invalid tokens', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><div role="buttn button" tabindex="0">Save</div></body>`);
    const el = dom.window.document.querySelector('div');
    expect(computeSuggestions(el, '', 'button').some(s => /Only the first valid token/.test(s.message))).toBe(true);
  });
});

// ─── Advanced UX & Structure ────────────────────────────────────────────────

describe('Advanced UX & Structure rules', () => {
  it('flags td missing th in same table', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><table><tr><td id="c">Data</td></tr></table></body>`);
    const el = dom.window.document.getElementById('c');
    expect(computeSuggestions(el).some(s => /not associated with a header/.test(s.message))).toBe(true);
  });

  it('flags duplicate main landmarks', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><main>One</main><main id="m">Two</main></body>`);
    const el = dom.window.document.getElementById('m');
    expect(computeSuggestions(el).some(s => /Multiple main regions detected/.test(s.message))).toBe(true);
  });

  it('flags duplicate nav landmarks without labels', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><nav>One</nav><nav id="n">Two</nav></body>`);
    const el = dom.window.document.getElementById('n');
    expect(computeSuggestions(el).some(s => /Landmarks should be unique/.test(s.message))).toBe(true);
  });

  it('flags duplicate IDs in aria-labelledby', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body>
      <div id="label1">Label</div>
      <div id="label1">Another Label</div>
      <button id="b" aria-labelledby="label1">Click</button>
    </body>`);
    const el = dom.window.document.getElementById('b');
    expect(computeSuggestions(el).some(s => /Multiple elements have the same ID/.test(s.message))).toBe(true);
  });
});

// ─── Role Resolution Conflicts ──────────────────────────────────────────────

describe('Role resolution conflict rules', () => {
  it('flags unrecognized role token', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><div role="buttn">Save</div></body>`);
    const el = dom.window.document.querySelector('div');
    expect(computeSuggestions(el, '', null).some(s => s.category === 'critical' && /no recognized ARIA roles/.test(s.message))).toBe(true);
  });

  it('does not flag a valid role', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><div role="button" tabindex="0">Save</div></body>`);
    const el = dom.window.document.querySelector('div');
    expect(computeSuggestions(el, '', 'button').some(s => /no recognized ARIA roles/.test(s.message))).toBe(false);
  });

  it('flags multiple role tokens where extras are ignored', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><div role="button link" tabindex="0">Click</div></body>`);
    const el = dom.window.document.querySelector('div');
    expect(computeSuggestions(el, '', 'button').some(s => /Only the first valid token/.test(s.message))).toBe(true);
  });

  it('does not flag a single valid role token', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><div role="button" tabindex="0">Click</div></body>`);
    const el = dom.window.document.querySelector('div');
    expect(computeSuggestions(el, '', 'button').some(s => /Only the first valid token/.test(s.message))).toBe(false);
  });

  it('flags presentation ignored on focusable element', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><button role="presentation">×</button></body>`);
    const el = dom.window.document.querySelector('button');
    expect(computeSuggestions(el, '', 'button').some(s => s.category === 'critical' && /ignored because/.test(s.message))).toBe(true);
  });

  it('flags none ignored on focusable element', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><button role="none">×</button></body>`);
    const el = dom.window.document.querySelector('button');
    expect(computeSuggestions(el, '', 'button').some(s => s.category === 'critical' && /ignored because/.test(s.message))).toBe(true);
  });

  it('flags presentation ignored due to global ARIA attribute', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><div role="presentation" aria-label="something">content</div></body>`);
    const el = dom.window.document.querySelector('div');
    expect(computeSuggestions(el, '', 'generic').some(s => s.category === 'critical' && /ignored because/.test(s.message))).toBe(true);
  });

  it('does not flag presentation on non-focusable element without ARIA attrs', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><div role="presentation">decorative</div></body>`);
    const el = dom.window.document.querySelector('div');
    expect(computeSuggestions(el, '', 'presentation').some(s => /ignored because/.test(s.message))).toBe(false);
  });

  it('flags mixed valid and invalid tokens', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><div role="buttn button" tabindex="0">Save</div></body>`);
    const el = dom.window.document.querySelector('div');
    expect(computeSuggestions(el, '', 'button').some(s => /Only the first valid token/.test(s.message))).toBe(true);
  });

  it('does not flag presentation as deprecated', () => {
    const dom = new JSDOM(`<!DOCTYPE html><body><div role="presentation">decorative</div></body>`);
    const el = dom.window.document.querySelector('div');
    expect(computeSuggestions(el, '', 'presentation').some(s => /deprecated/.test(s.message))).toBe(false);
  });
});
