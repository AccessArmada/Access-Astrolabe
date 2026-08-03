import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateAnnouncement } from './announcements.js';

describe('generateAnnouncement', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('handles page load (body/html)', () => {
    const originalTitle = document.title;
    document.title = 'Test Title';
    const result = generateAnnouncement({ tagName: 'BODY' }, document.body);
    expect(result).toBe('Test Title');
    document.title = '';
    expect(generateAnnouncement({ tagName: 'BODY' }, document.body)).toBe('Untitled Document');
    document.title = originalTitle;
  });

  it('generates list item context correctly for nested links', () => {
    document.body.innerHTML = `
      <ul id="nav-list">
        <li><a href="#" id="link1">Home</a></li>
        <li><a href="#" id="link2">About</a></li>
      </ul>
    `;
    const link = document.getElementById('link2');
    const result = generateAnnouncement({ role: 'link', name: 'About', tagName: 'A' }, link);
    expect(result).toBe('List item 2 of 2, About, Link');
  });

  it('handles headings with level from tag', () => {
    const el = document.createElement('h2');
    const result = generateAnnouncement({ role: 'heading', name: 'Success', tagName: 'H2' }, el);
    expect(result).toBe('Heading Level 2, Success');
  });

  it('handles headings with level from ARIA', () => {
    const el = document.createElement('div');
    el.setAttribute('aria-level', '3');
    const result = generateAnnouncement({ role: 'heading', name: 'Subheading', tagName: 'DIV' }, el);
    expect(result).toBe('Heading Level 3, Subheading');
  });

  it('handles links (both role and tag)', () => {
    const a = document.createElement('a');
    expect(generateAnnouncement({ role: 'link', name: 'Home', tagName: 'A' }, a)).toBe('Home, Link');

    const div = document.createElement('div');
    expect(generateAnnouncement({ role: 'link', name: 'Help', tagName: 'DIV' }, div)).toBe('Help, Link');
  });

  it('handles buttons with states', () => {
    const el = document.createElement('button');
    const data = {
      role: 'button',
      name: 'Toggle',
      tagName: 'BUTTON',
      states: { pressed: 'true', expanded: 'false' }
    };
    const result = generateAnnouncement(data, el);
    expect(result).toBe('Toggle, Button Pressed: true collapsed');
  });

  it('handles images', () => {
    const el = document.createElement('img');
    const result = generateAnnouncement({ role: 'img', name: 'Logo', tagName: 'IMG' }, el);
    expect(result).toBe('Logo, Graphic');
  });

  it('handles form inputs with required/invalid states', () => {
    const el = document.createElement('input');
    el.setAttribute('aria-required', 'true');
    el.setAttribute('aria-invalid', 'true');
    const result = generateAnnouncement({ role: 'textbox', name: 'Email', tagName: 'INPUT' }, el);
    expect(result).toBe('Email, text field, Required Invalid entry');
  });

  it('handles checkboxes (checked vs unchecked)', () => {
    const el = document.createElement('input');
    el.type = 'checkbox';
    el.checked = true;
    const resultChecked = generateAnnouncement({ role: 'checkbox', name: 'Accept', tagName: 'INPUT', states: { checked: 'true' } }, el);
    expect(resultChecked).toBe('Accept, Checkbox, Checked');

    el.checked = false;
    const resultUnchecked = generateAnnouncement({ role: 'checkbox', name: 'Accept', tagName: 'INPUT', states: { checked: 'false' } }, el);
    expect(resultUnchecked).toBe('Accept, Checkbox, Unchecked');
  });

  it('handles radio buttons (selected vs not selected)', () => {
    const el = document.createElement('input');
    el.type = 'radio';
    el.checked = true;
    const resultSelected = generateAnnouncement({ role: 'radio', name: 'Option 1', tagName: 'INPUT', states: { checked: 'true' } }, el);
    expect(resultSelected).toBe('Option 1, Radio button, Selected');

    el.checked = false;
    const resultUnselected = generateAnnouncement({ role: 'radio', name: 'Option 1', tagName: 'INPUT', states: { checked: 'false' } }, el);
    expect(resultUnselected).toBe('Option 1, Radio button, Not selected');
  });

  it('handles lists and items', () => {
    const ul = document.createElement('ul');
    ul.innerHTML = '<li>1</li><li>2</li>';
    const resultList = generateAnnouncement({ role: 'list', tagName: 'UL' }, ul);
    expect(resultList).toBe('List with 2 items');

    const li = ul.children[0];
    const resultItem = generateAnnouncement({ role: 'listitem', name: 'Item 1', tagName: 'LI' }, li);
    expect(resultItem).toBe('List item 1 of 2, Item 1, List item');
  });

  it('counts only direct listitems for nested lists', () => {
    const ul = document.createElement('ul');
    ul.innerHTML = `
      <li>
        Parent 1
        <ul><li>Nested 1</li></ul>
      </li>
      <li>Parent 2</li>
    `;
    const resultList = generateAnnouncement({ role: 'list', tagName: 'UL' }, ul);
    expect(resultList).toBe('List with 2 items');
  });

  it('handles tables and cells', () => {
    const table = document.createElement('table');
    const row = table.insertRow();
    const cell = row.insertCell();
    cell.textContent = 'Data';

    // Table announcement
    const resultTable = generateAnnouncement({ role: 'table', name: 'Stats', tagName: 'TABLE' }, table);
    expect(resultTable).toBe('Stats, Table with 1 rows and 1 columns');

    // Cell announcement
    const resultCell = generateAnnouncement({ role: 'cell', name: 'Data', tagName: 'TD' }, cell);
    expect(resultCell).toContain('Row 1, Column 1');
  });

  it('handles div-based tables with role=row and role=cell', () => {
    const table = document.createElement('div');
    table.setAttribute('role', 'table');

    const row1 = document.createElement('div');
    row1.setAttribute('role', 'row');
    const r1c1 = document.createElement('div');
    r1c1.setAttribute('role', 'cell');
    const r1c2 = document.createElement('div');
    r1c2.setAttribute('role', 'cell');
    row1.append(r1c1, r1c2);

    const row2 = document.createElement('div');
    row2.setAttribute('role', 'row');
    const r2c1 = document.createElement('div');
    r2c1.setAttribute('role', 'cell');
    const r2c2 = document.createElement('div');
    r2c2.setAttribute('role', 'cell');
    row2.append(r2c1, r2c2);

    table.append(row1, row2);

    const resultTable = generateAnnouncement({ role: 'table', name: 'Stats', tagName: 'DIV' }, table);
    expect(resultTable).toBe('Stats, Table with 2 rows and 2 columns');
  });

  it('adds header context for table cells when headers exist', () => {
    const table = document.createElement('table');
    const headerRow = table.insertRow();
    const th = document.createElement('th');
    th.textContent = 'Category';
    headerRow.appendChild(th);

    const dataRow = table.insertRow();
    const td = dataRow.insertCell();
    td.textContent = 'Electronics';

    const resultCell = generateAnnouncement({ role: 'cell', name: 'Electronics', tagName: 'TD' }, td);
    expect(resultCell).toBe('Category: Electronics');
  });

  it('handles landmarks', () => {
    const nav = document.createElement('nav');
    const result = generateAnnouncement({ role: 'navigation', name: 'Main', tagName: 'NAV' }, nav);
    expect(result).toBe('Main navigation Landmark');
  });

  it('falls back to default with description', () => {
    const div = document.createElement('div');
    const result = generateAnnouncement({ role: 'none', name: 'Name', description: 'Extra info', tagName: 'DIV', states: {} }, div);
    expect(result).toBe('Name none, Extra info');

    // Name only
    expect(generateAnnouncement({ name: 'Only Name' }, div)).toBe('Only Name');
    // Role only
    expect(generateAnnouncement({ role: 'Button' }, div)).toBe('Button');
    // Description only
    expect(generateAnnouncement({ description: 'Info' }, div)).toBe('Info');
    // Nothing
    expect(generateAnnouncement({}, div)).toBe('');
  });

  it('handles empty tables', () => {
    const table = document.createElement('table');
    const result = generateAnnouncement({ role: 'table', tagName: 'TABLE' }, table);
    expect(result).toBe('Table with 0 rows and 0 columns');
  });

  it('handles role table on div', () => {
    const div = document.createElement('div');
    const result = generateAnnouncement({ role: 'table', tagName: 'DIV' }, div);
    expect(result).toBe('Table with 0 rows and 0 columns');
  });

  it('handles textarea in form inputs', () => {
    const el = document.createElement('textarea');
    const result = generateAnnouncement({ role: 'textbox', name: 'Comment', tagName: 'TEXTAREA' }, el);
    expect(result).toBe('Comment, text field');
  });

  it('handles cell role on div', () => {
    const div = document.createElement('div');
    const result = generateAnnouncement({ role: 'cell', name: 'Data', tagName: 'DIV' }, div);
    expect(result).toBe('Data, cell');
  });

  it('handles landmark without name', () => {
    const nav = document.createElement('nav');
    const result = generateAnnouncement({ role: 'navigation', tagName: 'NAV' }, nav);
    expect(result).toBe('navigation Landmark');
  });

  it('handles landmark with tagName only', () => {
    const main = document.createElement('main');
    const result = generateAnnouncement({ tagName: 'MAIN' }, main);
    expect(result).toBe('main Landmark');
  });

  it('supports progressbar aria-valuenow/min/max', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'progressbar');
    el.setAttribute('aria-valuenow', '50');
    el.setAttribute('aria-valuemin', '0');
    el.setAttribute('aria-valuemax', '100');
    const result = generateAnnouncement({ role: 'progressbar', name: 'Loading', tagName: 'DIV' }, el);
    expect(result).toBe('Loading, Progress bar, 50%');
  });

  it('supports slider aria-valuenow/min/max', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'slider');
    el.setAttribute('aria-valuenow', '7');
    el.setAttribute('aria-valuemin', '0');
    el.setAttribute('aria-valuemax', '10');
    const result = generateAnnouncement({ role: 'slider', name: 'Volume', tagName: 'DIV' }, el);
    expect(result).toBe('Volume, slider, 7 Min: 0 Max: 10');
  });

  it('prefixes live regions with Alert:', () => {
    const el = document.createElement('a');
    el.setAttribute('aria-live', 'assertive');
    const result = generateAnnouncement({ role: 'link', name: 'Home', tagName: 'A' }, el);
    expect(result).toBe('Alert: Home, Link');
  });

  it('appends description for role handlers (no early return)', () => {
    const el = document.createElement('a');
    const result = generateAnnouncement({ role: 'link', name: 'Home', description: 'More info', tagName: 'A' }, el);
    expect(result).toBe('Home, Link, More info');
  });

  it('returns empty announcement for hidden elements', () => {
    const el = document.createElement('button');
    el.setAttribute('aria-hidden', 'true');
    const result = generateAnnouncement({ role: 'button', name: 'Submit', tagName: 'BUTTON' }, el);
    expect(result).toBe('');
  });

  it('appends unavailable for disabled elements', () => {
    const el = document.createElement('button');
    el.setAttribute('disabled', '');
    const result = generateAnnouncement({ role: 'button', name: 'Submit', tagName: 'BUTTON' }, el);
    expect(result).toBe('Submit, Button, unavailable');
  });

  it('ignores aria-label for role=presentation and prefers text content', () => {
    const el = document.createElement('span');
    el.setAttribute('role', 'presentation');
    el.setAttribute('aria-label', 'Decorative');
    el.textContent = 'Visible text';
    const result = generateAnnouncement({ role: 'presentation', name: 'Decorative', tagName: 'SPAN' }, el);
    expect(result).toBe('Visible text');
  });

  it('uses aria-labelledby (multiple ids) as the effective name', () => {
    document.body.innerHTML = `
      <span id="l1">Save</span>
      <span id="l2">Changes</span>
      <button id="target" aria-labelledby="l1 l2"></button>
    `;
    const el = document.getElementById('target');
    const result = generateAnnouncement({ role: 'button', name: '', tagName: 'BUTTON' }, el);
    expect(result).toBe('Save Changes, Button');
  });

  it('falls back to recursive text accumulator (including child img alt)', () => {
    const el = document.createElement('button');
    const img = document.createElement('img');
    img.setAttribute('alt', 'Settings');
    const span = document.createElement('span');
    span.textContent = 'Menu';
    el.append(img, span);

    const result = generateAnnouncement({ role: 'button', name: '', tagName: 'BUTTON' }, el);
    expect(result).toBe('Settings Menu, Button');
  });

  it('handles textarea without role', () => {
    const el = document.createElement('textarea');
    const result = generateAnnouncement({ name: 'Feedback', tagName: 'TEXTAREA' }, el);
    expect(result).toBe('Feedback, text area');
  });

  it('handles td without role', () => {
    const table = document.createElement('table');
    const row = table.insertRow();
    const cell = row.insertCell();
    const result = generateAnnouncement({ name: 'Data', tagName: 'TD' }, cell);
    expect(result).toContain('Data, td');
  });

  it('handles cells without parent rows', () => {
    const cell = document.createElement('td');
    const result = generateAnnouncement({ role: 'cell', tagName: 'TD' }, cell);
    expect(result).toBe('cell'); // No row/col context if parent is missing
  });

  it('includes placeholder in announcement when input has no label', () => {
    const el = document.createElement('input');
    el.setAttribute('placeholder', 'Enter your email');
    const result = generateAnnouncement({ role: 'textbox', name: '', tagName: 'INPUT' }, el);
    expect(result).toBe('Enter your email, text field');
  });

  it('prefers label over placeholder in announcement when both present', () => {
    const el = document.createElement('input');
    el.setAttribute('placeholder', 'Enter your email');
    const result = generateAnnouncement({ role: 'textbox', name: 'Email address', tagName: 'INPUT' }, el);
    expect(result).toBe('Email address, text field');
  });

  it('includes placeholder in announcement for textarea with no label', () => {
    const el = document.createElement('textarea');
    el.setAttribute('placeholder', 'Write a comment');
    const result = generateAnnouncement({ role: 'textbox', name: '', tagName: 'TEXTAREA' }, el);
    expect(result).toBe('Write a comment, text field');
  });
});

describe('expanded announcement (non-button elements)', () => {
  it('announces expanded for element with aria-expanded=true', () => {
    const el = document.createElement('div');
    el.setAttribute('aria-expanded', 'true');
    const data = { role: 'treeitem', name: 'Documents', tagName: 'DIV', states: {}, description: '' };
    expect(generateAnnouncement(data, el)).toContain('expanded');
  });

  it('announces collapsed for element with aria-expanded=false', () => {
    const el = document.createElement('div');
    el.setAttribute('aria-expanded', 'false');
    const data = { role: 'treeitem', name: 'Documents', tagName: 'DIV', states: {}, description: '' };
    expect(generateAnnouncement(data, el)).toContain('collapsed');
  });

  it('announces expanded for open <details>', () => {
    const el = document.createElement('details');
    el.setAttribute('open', '');
    const data = { role: 'group', name: '', tagName: 'DETAILS', states: {}, description: '' };
    expect(generateAnnouncement(data, el)).toContain('expanded');
  });

  it('announces collapsed for closed <details>', () => {
    const el = document.createElement('details');
    const data = { role: 'group', name: '', tagName: 'DETAILS', states: {}, description: '' };
    expect(generateAnnouncement(data, el)).toContain('collapsed');
  });

  it('does not double-announce expanded for button', () => {
    const el = document.createElement('button');
    const data = { role: 'button', name: 'Menu', tagName: 'BUTTON', states: { pressed: null, expanded: 'true' }, description: '' };
    const result = generateAnnouncement(data, el);
    expect((result.toLowerCase().match(/expanded/g) || []).length).toBe(1);
  });
});

describe('selected announcement', () => {
  it('announces selected for tab with aria-selected=true', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'tab');
    el.setAttribute('aria-selected', 'true');
    const data = { role: 'tab', name: 'Overview', tagName: 'DIV', states: {}, description: '' };
    expect(generateAnnouncement(data, el)).toContain('selected');
  });

  it('announces not selected for tab with aria-selected=false', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'tab');
    el.setAttribute('aria-selected', 'false');
    const data = { role: 'tab', name: 'Overview', tagName: 'DIV', states: {}, description: '' };
    expect(generateAnnouncement(data, el)).toContain('not selected');
  });

  it('announces not selected for unselected native <option>', () => {
    const el = document.createElement('option');
    el.textContent = 'Red';
    const data = { role: 'option', name: 'Red', tagName: 'OPTION', states: {}, description: '' };
    expect(generateAnnouncement(data, el)).toContain('not selected');
  });

  it('announces selected for selected native <option>', () => {
    const select = document.createElement('select');
    const el = document.createElement('option');
    el.textContent = 'Blue';
    select.appendChild(el);
    document.body.appendChild(select);
    el.selected = true;
    const data = { role: 'option', name: 'Blue', tagName: 'OPTION', states: {}, description: '' };
    expect(generateAnnouncement(data, el)).toContain('selected');
    document.body.removeChild(select);
  });
});

describe('select announcement', () => {
  it('announces label, list box role, selected value, and option count', () => {
    document.body.innerHTML = `
      <label for="sort">Sort order</label>
      <select id="sort">
        <option>Price: Low to High</option>
        <option>Price: High to Low</option>
        <option>Newest first</option>
        <option selected>Most popular</option>
      </select>
    `;
    const el = document.getElementById('sort');
    const result = generateAnnouncement({ role: 'combobox', name: 'Sort order', tagName: 'SELECT' }, el);
    expect(result).toBe('Sort order, list box, Most popular, 4 options');
  });

  it('announces required state on select', () => {
    const el = document.createElement('select');
    el.setAttribute('aria-required', 'true');
    const opt = document.createElement('option');
    opt.textContent = 'Pick one';
    el.appendChild(opt);
    const result = generateAnnouncement({ role: 'combobox', name: 'Category', tagName: 'SELECT' }, el);
    expect(result).toBe('Category, list box, Pick one, 1 options, Required');
  });

  it('handles select with no options', () => {
    const el = document.createElement('select');
    const result = generateAnnouncement({ role: 'combobox', name: 'Empty', tagName: 'SELECT' }, el);
    expect(result).toBe('Empty, list box');
  });
});

describe('switch announcement', () => {
  it('announces on when aria-checked=true', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'switch');
    el.setAttribute('aria-checked', 'true');
    const result = generateAnnouncement({ role: 'switch', name: 'Dark mode', tagName: 'DIV' }, el);
    expect(result).toBe('Dark mode, switch, on');
  });

  it('announces off when aria-checked=false', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'switch');
    el.setAttribute('aria-checked', 'false');
    const result = generateAnnouncement({ role: 'switch', name: 'Notifications', tagName: 'DIV' }, el);
    expect(result).toBe('Notifications, switch, off');
  });
});

describe('aria-current announcement', () => {
  it('appends "current page" for aria-current=page on a link', () => {
    const el = document.createElement('a');
    el.setAttribute('aria-current', 'page');
    const result = generateAnnouncement({ role: 'link', name: 'Home', tagName: 'A' }, el);
    expect(result).toBe('Home, Link, current page');
  });

  it('appends "current step" for aria-current=step', () => {
    document.body.innerHTML = `<ol><li id="item" aria-current="step">Shipping</li><li>Payment</li></ol>`;
    const el = document.getElementById('item');
    const result = generateAnnouncement({ role: 'listitem', name: 'Shipping', tagName: 'LI' }, el);
    expect(result).toContain('current step');
  });

  it('appends plain "current" for aria-current=true', () => {
    const el = document.createElement('a');
    el.setAttribute('aria-current', 'true');
    const result = generateAnnouncement({ role: 'link', name: 'Dashboard', tagName: 'A' }, el);
    expect(result).toContain('current');
  });

  it('does not append anything for aria-current=false', () => {
    const el = document.createElement('a');
    el.setAttribute('aria-current', 'false');
    const result = generateAnnouncement({ role: 'link', name: 'About', tagName: 'A' }, el);
    expect(result).toBe('About, Link');
  });
});

describe('summary/details announcement', () => {
  it('announces button + collapsed when details is closed', () => {
    document.body.innerHTML = `<details><summary id="s">Shipping information</summary><p>Ships in 3-5 days.</p></details>`;
    const el = document.getElementById('s');
    const result = generateAnnouncement({ role: 'button', name: 'Shipping information', tagName: 'SUMMARY' }, el);
    expect(result).toBe('Shipping information, button, collapsed');
  });

  it('announces button + expanded when details is open', () => {
    document.body.innerHTML = `<details open><summary id="s">Shipping information</summary><p>Ships in 3-5 days.</p></details>`;
    const el = document.getElementById('s');
    const result = generateAnnouncement({ role: 'button', name: 'Shipping information', tagName: 'SUMMARY' }, el);
    expect(result).toBe('Shipping information, button, expanded');
  });

  it('announces button without expanded state when summary has no parent details', () => {
    const el = document.createElement('summary');
    el.textContent = 'Orphan summary';
    const result = generateAnnouncement({ role: 'button', name: 'Orphan summary', tagName: 'SUMMARY' }, el);
    expect(result).toBe('Orphan summary, button');
  });
});

describe('tab announcement', () => {
  it('announces selected tab with position', () => {
    document.body.innerHTML = `
      <div role="tablist">
        <button role="tab" id="t1" aria-selected="true">General</button>
        <button role="tab" id="t2" aria-selected="false">Privacy</button>
        <button role="tab" id="t3" aria-selected="false">Security</button>
      </div>
    `;
    expect(generateAnnouncement({ role: 'tab', name: 'General', tagName: 'BUTTON' }, document.getElementById('t1')))
      .toBe('General, tab, selected, 1 of 3');
    expect(generateAnnouncement({ role: 'tab', name: 'Privacy', tagName: 'BUTTON' }, document.getElementById('t2')))
      .toBe('Privacy, tab, not selected, 2 of 3');
  });

  it('omits position for a lone tab with no tablist', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'tab');
    el.setAttribute('aria-selected', 'true');
    expect(generateAnnouncement({ role: 'tab', name: 'Only Tab', tagName: 'DIV' }, el))
      .toBe('Only Tab, tab, selected');
  });
});

describe('menuitem announcement', () => {
  it('announces menuitem with position', () => {
    document.body.innerHTML = `
      <ul role="menu">
        <li role="menuitem" id="cut">Cut</li>
        <li role="menuitem" id="copy">Copy</li>
        <li role="menuitem" id="paste">Paste</li>
      </ul>
    `;
    expect(generateAnnouncement({ role: 'menuitem', name: 'Copy', tagName: 'LI' }, document.getElementById('copy')))
      .toBe('Copy, menu item, 2 of 3');
  });

  it('announces menuitemcheckbox with checked state and position', () => {
    document.body.innerHTML = `
      <ul role="menu">
        <li role="menuitemcheckbox" id="toolbar" aria-checked="true">Show toolbar</li>
        <li role="menuitemcheckbox" id="sidebar" aria-checked="false">Show sidebar</li>
      </ul>
    `;
    expect(generateAnnouncement({ role: 'menuitemcheckbox', name: 'Show toolbar', tagName: 'LI' }, document.getElementById('toolbar')))
      .toBe('Show toolbar, menu item checkbox, checked, 1 of 2');
    expect(generateAnnouncement({ role: 'menuitemcheckbox', name: 'Show sidebar', tagName: 'LI' }, document.getElementById('sidebar')))
      .toBe('Show sidebar, menu item checkbox, unchecked, 2 of 2');
  });

  it('announces menuitemradio with selected state and position', () => {
    document.body.innerHTML = `
      <ul role="menu">
        <li role="menuitemradio" id="sm" aria-checked="true">Small</li>
        <li role="menuitemradio" id="md" aria-checked="false">Medium</li>
        <li role="menuitemradio" id="lg" aria-checked="false">Large</li>
      </ul>
    `;
    expect(generateAnnouncement({ role: 'menuitemradio', name: 'Small', tagName: 'LI' }, document.getElementById('sm')))
      .toBe('Small, menu item radio, selected, 1 of 3');
    expect(generateAnnouncement({ role: 'menuitemradio', name: 'Medium', tagName: 'LI' }, document.getElementById('md')))
      .toBe('Medium, menu item radio, not selected, 2 of 3');
  });
});

describe('treeitem announcement', () => {
  it('announces treeitem with level, expanded state, and sibling position', () => {
    document.body.innerHTML = `
      <ul role="tree">
        <li role="treeitem" id="docs" aria-level="1" aria-expanded="true">Documents
          <ul>
            <li role="treeitem" id="work" aria-level="2" aria-expanded="false">Work</li>
            <li role="treeitem" id="personal" aria-level="2">Personal</li>
          </ul>
        </li>
        <li role="treeitem" id="dl" aria-level="1">Downloads</li>
      </ul>
    `;
    expect(generateAnnouncement({ role: 'treeitem', name: 'Documents', tagName: 'LI' }, document.getElementById('docs')))
      .toBe('Documents, tree item, level 1, expanded, 1 of 2');
    expect(generateAnnouncement({ role: 'treeitem', name: 'Work', tagName: 'LI' }, document.getElementById('work')))
      .toBe('Work, tree item, level 2, collapsed, 1 of 2');
  });

  it('omits expanded label for leaf treeitem without aria-expanded', () => {
    document.body.innerHTML = `
      <ul role="tree">
        <li role="treeitem" id="leaf" aria-level="1">Leaf</li>
      </ul>
    `;
    expect(generateAnnouncement({ role: 'treeitem', name: 'Leaf', tagName: 'LI' }, document.getElementById('leaf')))
      .toBe('Leaf, tree item, level 1');
  });
});

describe('meter announcement', () => {
  it('announces meter with value and max', () => {
    document.body.innerHTML = `<meter id="m" value="80" min="0" max="100"></meter>`;
    expect(generateAnnouncement({ role: 'meter', name: 'Disk usage', tagName: 'METER' }, document.getElementById('m')))
      .toBe('Disk usage, meter, 80 of 100');
  });

  it('announces meter matched by tagName with decimal value', () => {
    document.body.innerHTML = `<meter id="s" value="7.5" min="0" max="10"></meter>`;
    expect(generateAnnouncement({ name: 'Score', tagName: 'METER' }, document.getElementById('s')))
      .toBe('Score, meter, 7.5 of 10');
  });
});

describe('live region role announcement', () => {
  it('announces status role without a label using role then content', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.textContent = '3 results found';
    expect(generateAnnouncement({ role: 'status', name: '', tagName: 'DIV' }, el))
      .toBe('status, 3 results found');
  });

  it('announces timer role with explicit label and content', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'timer');
    el.textContent = '4:32';
    expect(generateAnnouncement({ role: 'timer', name: 'Session timeout', tagName: 'DIV' }, el))
      .toBe('Session timeout, timer, 4:32');
  });

  it('announces log role with explicit label and content', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'log');
    el.textContent = 'Alice: Hello';
    expect(generateAnnouncement({ role: 'log', name: 'Chat history', tagName: 'DIV' }, el))
      .toBe('Chat history, log, Alice: Hello');
  });
});

describe('abbr announcement', () => {
  it('expands abbreviation using title attribute', () => {
    const el = document.createElement('abbr');
    el.setAttribute('title', 'General Practitioner');
    el.textContent = 'GP';
    expect(generateAnnouncement({ tagName: 'ABBR' }, el))
      .toBe('GP, abbreviation for General Practitioner');
  });

  it('falls through to default for abbr without title', () => {
    const el = document.createElement('abbr');
    el.textContent = 'HTML';
    expect(generateAnnouncement({ tagName: 'ABBR' }, el))
      .toBe('HTML');
  });

  it('expands abbr title when abbr is a child of a link', () => {
    document.body.innerHTML = `
      <a id="lnk" href="#"><abbr title="Web Content Accessibility Guidelines">WCAG</abbr></a>
    `;
    const el = document.getElementById('lnk');
    expect(generateAnnouncement({ role: 'link', tagName: 'A' }, el))
      .toBe('Web Content Accessibility Guidelines, Link');
  });
});

describe('menuitem role on anchor', () => {
  it('announces as menu item, not link, when role=menuitem overrides <a>', () => {
    document.body.innerHTML = `
      <ul role="menu">
        <li><a role="menuitem" id="cut" href="#">Cut</a></li>
        <li><a role="menuitem" id="copy" href="#">Copy</a></li>
        <li><a role="menuitem" id="paste" href="#">Paste</a></li>
      </ul>
    `;
    expect(generateAnnouncement({ role: 'menuitem', name: 'Copy', tagName: 'A' }, document.getElementById('copy')))
      .toBe('Copy, menu item, 2 of 3');
  });
});

describe('menubar and menu container announcement', () => {
  it('announces menubar role on <ul> as menu bar, not list', () => {
    document.body.innerHTML = `<ul role="menubar" id="mb"><li role="menuitem">File</li></ul>`;
    expect(generateAnnouncement({ role: 'menubar', name: 'Editor', tagName: 'UL' }, document.getElementById('mb')))
      .toBe('Editor, menu bar');
  });

  it('announces menubar role without a label', () => {
    const el = document.createElement('ul');
    el.setAttribute('role', 'menubar');
    expect(generateAnnouncement({ role: 'menubar', tagName: 'UL' }, el))
      .toBe('menu bar');
  });

  it('announces menu role on <ul> as menu, not list', () => {
    const el = document.createElement('ul');
    el.setAttribute('role', 'menu');
    expect(generateAnnouncement({ role: 'menu', tagName: 'UL' }, el))
      .toBe('menu');
  });
});

describe('aria-labelledby with inline style/script in referenced element', () => {
  it('strips <style> content from aria-labelledby target', () => {
    document.body.innerHTML = `
      <span id="lbl" aria-hidden="true">
        <style>.foo { color: red; }</style>
        Cool Widget
      </span>
      <input id="inp" type="radio" aria-labelledby="lbl" aria-checked="false">
    `;
    const el = document.getElementById('inp');
    const result = generateAnnouncement({ role: 'radio', name: 'Cool Widget', tagName: 'INPUT', states: { checked: 'false' } }, el);
    expect(result).not.toContain('.foo');
    expect(result).toContain('Cool Widget');
  });

  it('strips <script> content from aria-labelledby target', () => {
    document.body.innerHTML = `
      <span id="lbl2">
        <script>var x = 1;</script>
        Submit
      </span>
      <button id="btn" aria-labelledby="lbl2"></button>
    `;
    const el = document.getElementById('btn');
    const result = generateAnnouncement({ role: 'button', name: 'Submit', tagName: 'BUTTON' }, el);
    expect(result).not.toContain('var x');
    expect(result).toContain('Submit');
  });
});

describe('aria-haspopup announcement', () => {
  it('appends "has popup menu" for aria-haspopup=menu', () => {
    const el = document.createElement('button');
    el.setAttribute('aria-haspopup', 'menu');
    expect(generateAnnouncement({ role: 'button', name: 'Options', tagName: 'BUTTON' }, el))
      .toContain('has popup menu');
  });

  it('appends "has popup" for aria-haspopup=true', () => {
    const el = document.createElement('button');
    el.setAttribute('aria-haspopup', 'true');
    expect(generateAnnouncement({ role: 'button', name: 'Open', tagName: 'BUTTON' }, el))
      .toContain('has popup');
  });

  it('appends "has popup listbox" for aria-haspopup=listbox', () => {
    const el = document.createElement('div');
    el.setAttribute('aria-haspopup', 'listbox');
    expect(generateAnnouncement({ role: 'combobox', name: 'Country', tagName: 'DIV' }, el))
      .toContain('has popup listbox');
  });

  it('appends "has popup dialog" for aria-haspopup=dialog', () => {
    const el = document.createElement('button');
    el.setAttribute('aria-haspopup', 'dialog');
    expect(generateAnnouncement({ role: 'button', name: 'Pick date', tagName: 'BUTTON' }, el))
      .toContain('has popup dialog');
  });

  it('appends "has popup <value>" for unknown haspopup value', () => {
    const el = document.createElement('button');
    el.setAttribute('aria-haspopup', 'custom');
    expect(generateAnnouncement({ role: 'button', name: 'Open', tagName: 'BUTTON' }, el))
      .toContain('has popup custom');
  });

  it('does not append popup label for aria-haspopup=false', () => {
    const el = document.createElement('button');
    el.setAttribute('aria-haspopup', 'false');
    const result = generateAnnouncement({ role: 'button', name: 'Open', tagName: 'BUTTON' }, el);
    expect(result).not.toContain('has popup');
  });

  it('does not append popup label when aria-haspopup is absent', () => {
    const el = document.createElement('button');
    const result = generateAnnouncement({ role: 'button', name: 'Open', tagName: 'BUTTON' }, el);
    expect(result).not.toContain('has popup');
  });
});

describe('aria-invalid on checkbox, radio, and select', () => {
  it('appends Invalid entry to checkbox when aria-invalid=true', () => {
    const el = document.createElement('input');
    el.type = 'checkbox';
    el.setAttribute('aria-invalid', 'true');
    expect(generateAnnouncement({ role: 'checkbox', name: 'Agree', tagName: 'INPUT', states: { checked: 'false' } }, el))
      .toBe('Agree, Checkbox, Unchecked, Invalid entry');
  });

  it('does not append Invalid entry to checkbox when aria-invalid is absent', () => {
    const el = document.createElement('input');
    el.type = 'checkbox';
    expect(generateAnnouncement({ role: 'checkbox', name: 'Agree', tagName: 'INPUT', states: { checked: 'false' } }, el))
      .toBe('Agree, Checkbox, Unchecked');
  });

  it('appends Invalid entry to radio when aria-invalid=true', () => {
    const el = document.createElement('input');
    el.type = 'radio';
    el.setAttribute('aria-invalid', 'true');
    expect(generateAnnouncement({ role: 'radio', name: 'Option A', tagName: 'INPUT', states: { checked: 'false' } }, el))
      .toBe('Option A, Radio button, Not selected, Invalid entry');
  });

  it('appends Invalid entry to select when aria-invalid=true', () => {
    const el = document.createElement('select');
    el.setAttribute('aria-invalid', 'true');
    const opt = document.createElement('option');
    opt.textContent = 'Choose';
    el.appendChild(opt);
    expect(generateAnnouncement({ role: 'combobox', name: 'Category', tagName: 'SELECT' }, el))
      .toContain('Invalid entry');
  });
});

describe('aria-busy announcement', () => {
  it('appends "busy" when aria-busy=true', () => {
    const el = document.createElement('div');
    el.setAttribute('aria-busy', 'true');
    expect(generateAnnouncement({ role: 'region', name: 'Results', tagName: 'DIV' }, el))
      .toContain('busy');
  });

  it('does not append busy when aria-busy is absent', () => {
    const el = document.createElement('div');
    expect(generateAnnouncement({ role: 'region', name: 'Results', tagName: 'DIV' }, el))
      .not.toContain('busy');
  });

  it('does not double-append busy when text already contains it', () => {
    const el = document.createElement('div');
    el.setAttribute('aria-busy', 'true');
    const result = generateAnnouncement({ role: 'status', name: 'busy loader', tagName: 'DIV' }, el);
    expect((result.toLowerCase().match(/busy/g) || []).length).toBe(1);
  });
});

describe('role="group" and fieldset announcement', () => {
  it('announces fieldset with legend as group name', () => {
    document.body.innerHTML = `
      <fieldset id="fs">
        <legend>Shipping address</legend>
        <input type="text">
      </fieldset>
    `;
    const el = document.getElementById('fs');
    expect(generateAnnouncement({ tagName: 'FIELDSET' }, el))
      .toBe('Shipping address, group');
  });

  it('announces role=group with aria-label as group name', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'group');
    expect(generateAnnouncement({ role: 'group', name: 'Date range', tagName: 'DIV' }, el))
      .toBe('Date range, group');
  });

  it('announces role=group without a name as just "group"', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'group');
    expect(generateAnnouncement({ role: 'group', name: '', tagName: 'DIV' }, el))
      .toBe('group');
  });

  it('fieldset without legend announces as just "group"', () => {
    const el = document.createElement('fieldset');
    expect(generateAnnouncement({ tagName: 'FIELDSET' }, el))
      .toBe('group');
  });
});

describe('figure and figcaption announcement', () => {
  it('announces figure with figcaption as name', () => {
    document.body.innerHTML = `
      <figure id="fig">
        <img src="chart.png" alt="Sales chart">
        <figcaption>Q3 sales by region</figcaption>
      </figure>
    `;
    const el = document.getElementById('fig');
    expect(generateAnnouncement({ tagName: 'FIGURE' }, el))
      .toBe('Q3 sales by region, figure');
  });

  it('announces figure with aria-label overriding figcaption', () => {
    document.body.innerHTML = `
      <figure id="fig" aria-label="Annual report chart">
        <figcaption>Ignored caption</figcaption>
      </figure>
    `;
    const el = document.getElementById('fig');
    expect(generateAnnouncement({ name: 'Annual report chart', tagName: 'FIGURE' }, el))
      .toBe('Annual report chart, figure');
  });

  it('announces figure without a caption as just "figure"', () => {
    const el = document.createElement('figure');
    expect(generateAnnouncement({ tagName: 'FIGURE' }, el))
      .toBe('figure');
  });

  it('announces figcaption with its text content', () => {
    const el = document.createElement('figcaption');
    el.textContent = 'Rainfall by month';
    expect(generateAnnouncement({ tagName: 'FIGCAPTION' }, el))
      .toBe('Figure caption, Rainfall by month');
  });
});

describe('time element announcement', () => {
  it('announces time element with visible text', () => {
    const el = document.createElement('time');
    el.textContent = 'June 23, 2026';
    expect(generateAnnouncement({ tagName: 'TIME' }, el))
      .toBe('June 23, 2026');
  });

  it('appends machine-readable datetime when it differs from display text', () => {
    const el = document.createElement('time');
    el.setAttribute('datetime', '2026-06-23');
    el.textContent = 'June 23, 2026';
    expect(generateAnnouncement({ tagName: 'TIME' }, el))
      .toBe('June 23, 2026, (2026-06-23)');
  });

  it('does not append datetime when it matches display text', () => {
    const el = document.createElement('time');
    el.setAttribute('datetime', '2026-06-23');
    el.textContent = '2026-06-23';
    expect(generateAnnouncement({ tagName: 'TIME' }, el))
      .toBe('2026-06-23');
  });

  it('announces "time" for empty time element', () => {
    const el = document.createElement('time');
    expect(generateAnnouncement({ tagName: 'TIME' }, el))
      .toBe('time');
  });
});

describe('draggable and aria-grabbed announcement', () => {
  it('appends "draggable" for draggable=true', () => {
    const el = document.createElement('div');
    el.setAttribute('draggable', 'true');
    expect(generateAnnouncement({ role: 'listitem', name: 'Task 1', tagName: 'DIV' }, el))
      .toContain('draggable');
  });

  it('appends "grabbed" for aria-grabbed=true', () => {
    const el = document.createElement('div');
    el.setAttribute('aria-grabbed', 'true');
    expect(generateAnnouncement({ role: 'listitem', name: 'Task 1', tagName: 'DIV' }, el))
      .toContain('grabbed');
  });

  it('appends "not grabbed" for aria-grabbed=false', () => {
    const el = document.createElement('div');
    el.setAttribute('aria-grabbed', 'false');
    expect(generateAnnouncement({ role: 'listitem', name: 'Task 1', tagName: 'DIV' }, el))
      .toContain('not grabbed');
  });

  it('does not also append "draggable" when grabbed state is present', () => {
    const el = document.createElement('div');
    el.setAttribute('aria-grabbed', 'true');
    const result = generateAnnouncement({ role: 'listitem', name: 'Task 1', tagName: 'DIV' }, el);
    expect(result).toContain('grabbed');
    expect(result).not.toContain('draggable');
  });
});

describe('date input stepper announcement', () => {
  it('announces date picker type label', () => {
    const el = document.createElement('input');
    el.setAttribute('type', 'date');
    expect(generateAnnouncement({ role: 'textbox', name: 'Birthday', tagName: 'INPUT' }, el))
      .toContain('date picker');
  });

  it('announces time picker type label', () => {
    const el = document.createElement('input');
    el.setAttribute('type', 'time');
    expect(generateAnnouncement({ role: 'textbox', name: 'Alarm', tagName: 'INPUT' }, el))
      .toContain('time picker');
  });

  it('announces month picker type label', () => {
    const el = document.createElement('input');
    el.setAttribute('type', 'month');
    expect(generateAnnouncement({ role: 'textbox', name: 'Start month', tagName: 'INPUT' }, el))
      .toContain('month picker');
  });

  it('announces week picker type label', () => {
    const el = document.createElement('input');
    el.setAttribute('type', 'week');
    expect(generateAnnouncement({ role: 'textbox', name: 'Sprint week', tagName: 'INPUT' }, el))
      .toContain('week picker');
  });

  it('announces date and time picker for datetime-local', () => {
    const el = document.createElement('input');
    el.setAttribute('type', 'datetime-local');
    expect(generateAnnouncement({ role: 'textbox', name: 'Meeting', tagName: 'INPUT' }, el))
      .toContain('date and time picker');
  });

  it('surfaces the current date value', () => {
    const el = document.createElement('input');
    el.setAttribute('type', 'date');
    Object.defineProperty(el, 'value', { value: '2026-06-23', writable: false });
    const result = generateAnnouncement({ role: 'textbox', name: 'Birthday', tagName: 'INPUT' }, el);
    expect(result).toContain('2026-06-23');
  });
});

describe('dialog announcement', () => {
  it('announces role=dialog with name', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'dialog');
    expect(generateAnnouncement({ role: 'dialog', name: 'Confirm deletion', tagName: 'DIV' }, el))
      .toBe('Confirm deletion, dialog');
  });

  it('announces role=dialog without name', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'dialog');
    expect(generateAnnouncement({ role: 'dialog', name: '', tagName: 'DIV' }, el))
      .toBe('dialog');
  });

  it('announces role=alertdialog with "alert dialog" label', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'alertdialog');
    expect(generateAnnouncement({ role: 'alertdialog', name: 'Session expiring', tagName: 'DIV' }, el))
      .toBe('Session expiring, alert dialog');
  });
});

describe('role=application announcement', () => {
  it('announces application role with name', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'application');
    expect(generateAnnouncement({ role: 'application', name: 'Spreadsheet editor', tagName: 'DIV' }, el))
      .toBe('Spreadsheet editor, application');
  });

  it('announces application role without name', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'application');
    expect(generateAnnouncement({ role: 'application', name: '', tagName: 'DIV' }, el))
      .toBe('application');
  });
});

describe('mark element announcement', () => {
  it('announces mark content as highlighted', () => {
    const el = document.createElement('mark');
    el.textContent = 'search term';
    expect(generateAnnouncement({ tagName: 'MARK' }, el))
      .toBe('search term, highlighted');
  });

  it('announces "highlighted" for empty mark element', () => {
    const el = document.createElement('mark');
    expect(generateAnnouncement({ tagName: 'MARK' }, el))
      .toBe('highlighted');
  });
});

describe('gridcell and row announcement (date picker grid support)', () => {
  it('announces gridcell using column header as context (header context wins over row/col numbers)', () => {
    document.body.innerHTML = `
      <div role="grid" aria-label="January 2026">
        <div role="row">
          <div role="columnheader">Su</div>
          <div role="columnheader">Mo</div>
        </div>
        <div role="row">
          <div role="gridcell" id="d1" tabindex="-1">1</div>
          <div role="gridcell" id="d2" tabindex="-1">2</div>
        </div>
      </div>
    `;
    const el = document.getElementById('d2');
    const result = generateAnnouncement({ role: 'gridcell', name: '2', tagName: 'DIV' }, el);
    // "Mo: 2" — Monday column, day 2
    expect(result).toContain('Mo');
    expect(result).toContain('2');
  });

  it('announces gridcell with column header context', () => {
    document.body.innerHTML = `
      <div role="grid" aria-label="January 2026">
        <div role="row">
          <div role="columnheader">Su</div>
          <div role="columnheader">Mo</div>
          <div role="columnheader">Tu</div>
        </div>
        <div role="row">
          <div role="gridcell" tabindex="-1"></div>
          <div role="gridcell" tabindex="-1"></div>
          <div role="gridcell" id="cell" tabindex="-1" aria-selected="true">1</div>
        </div>
      </div>
    `;
    const el = document.getElementById('cell');
    const result = generateAnnouncement({ role: 'gridcell', name: '1', tagName: 'DIV' }, el);
    expect(result).toContain('Tu');
    expect(result).toContain('1');
  });

  it('counts gridcells when computing grid column count', () => {
    document.body.innerHTML = `
      <div id="grid" role="grid" aria-label="Cal">
        <div role="row">
          <div role="gridcell">A</div>
          <div role="gridcell">B</div>
          <div role="gridcell">C</div>
        </div>
      </div>
    `;
    const el = document.getElementById('grid');
    const result = generateAnnouncement({ role: 'grid', name: 'Cal', tagName: 'DIV' }, el);
    expect(result).toContain('3 columns');
  });

  it('announces role=row with position', () => {
    document.body.innerHTML = `
      <div role="grid">
        <div role="row" id="r1"><div role="gridcell">A</div></div>
        <div role="row" id="r2"><div role="gridcell">B</div></div>
      </div>
    `;
    const el = document.getElementById('r2');
    expect(generateAnnouncement({ role: 'row', tagName: 'DIV' }, el))
      .toContain('Row 2');
  });

  it('respects aria-colindex and aria-rowindex on gridcell and row', () => {
    document.body.innerHTML = `
      <div role="grid" aria-label="Test Grid">
        <div role="row" aria-rowindex="5">
          <div role="gridcell">X</div>
          <div role="gridcell">Y</div>
          <div role="gridcell" id="cell3" aria-colindex="3">Z</div>
        </div>
      </div>
    `;
    const el = document.getElementById('cell3');
    const result = generateAnnouncement({ role: 'gridcell', name: 'Z', tagName: 'DIV' }, el);
    expect(result).toContain('Row 5');
    expect(result).toContain('Column 3');
  });

  it('resolves column header through rowgroup structure', () => {
    document.body.innerHTML = `
      <div role="grid" aria-label="Sales">
        <div role="rowgroup">
          <div role="row">
            <div role="columnheader">Name</div>
            <div role="columnheader">Amount</div>
          </div>
        </div>
        <div role="rowgroup">
          <div role="row">
            <div role="gridcell">Alice</div>
            <div role="gridcell" id="amount">500</div>
          </div>
        </div>
      </div>
    `;
    const el = document.getElementById('amount');
    const result = generateAnnouncement({ role: 'gridcell', name: '500', tagName: 'DIV' }, el);
    expect(result).toContain('Amount');
    expect(result).toContain('500');
  });

  it('does not show column header context when cell is itself a columnheader', () => {
    document.body.innerHTML = `
      <div role="grid" aria-label="Data">
        <div role="row">
          <div role="columnheader" id="ch1">Product</div>
          <div role="columnheader" id="ch2">Price</div>
        </div>
        <div role="row">
          <div role="gridcell">Widget</div>
          <div role="gridcell">$9.99</div>
        </div>
      </div>
    `;
    const el = document.getElementById('ch1');
    const result = generateAnnouncement({ role: 'columnheader', name: 'Product', tagName: 'DIV' }, el);
    // Should NOT contain "Product: Product" or show itself as header context
    expect(result).not.toMatch(/Product.*:.*Product/);
    // Should contain the cell name and role
    expect(result).toContain('Product');
  });

  it('finds rowheader nested inside a wrapper div in the row', () => {
    document.body.innerHTML = `
      <div role="table" aria-label="Employees">
        <div role="row">
          <div role="columnheader">Name</div>
          <div role="columnheader">Department</div>
        </div>
        <div role="row" id="datarow">
          <div><div role="rowheader">Bob</div></div>
          <div role="cell" id="dept">Engineering</div>
        </div>
      </div>
    `;
    const el = document.getElementById('dept');
    const result = generateAnnouncement({ role: 'cell', name: 'Engineering', tagName: 'DIV' }, el);
    expect(result).toContain('Bob');
    expect(result).toContain('Engineering');
  });
});

describe('aria-invalid consistency', () => {
  it('uses "Invalid entry" for textbox (not just "Invalid")', () => {
    const el = document.createElement('input');
    el.setAttribute('aria-invalid', 'true');
    expect(generateAnnouncement({ role: 'textbox', name: 'Name', tagName: 'INPUT' }, el))
      .toContain('Invalid entry');
  });

  it('uses "Invalid entry" for textarea', () => {
    const el = document.createElement('textarea');
    el.setAttribute('aria-invalid', 'true');
    expect(generateAnnouncement({ role: 'textbox', name: 'Comment', tagName: 'TEXTAREA' }, el))
      .toContain('Invalid entry');
  });
});

describe('draggable + aria-grabbed combinations', () => {
  it('appends "draggable, not grabbed" when draggable=true and aria-grabbed=false', () => {
    const el = document.createElement('div');
    el.setAttribute('draggable', 'true');
    el.setAttribute('aria-grabbed', 'false');
    const result = generateAnnouncement({ role: 'listitem', name: 'File', tagName: 'DIV' }, el);
    expect(result).toContain('draggable');
    expect(result).toContain('not grabbed');
  });

  it('appends only "grabbed" (not also "draggable") when aria-grabbed=true', () => {
    const el = document.createElement('div');
    el.setAttribute('draggable', 'true');
    el.setAttribute('aria-grabbed', 'true');
    const result = generateAnnouncement({ role: 'listitem', name: 'File', tagName: 'DIV' }, el);
    expect(result).toContain('grabbed');
    expect(result).not.toContain('draggable');
  });
});

describe('figcaption context for images inside figures', () => {
  it('includes figcaption text when img is inside a figure', () => {
    document.body.innerHTML = `
      <figure>
        <img id="img" src="bridge.jpg" alt="Pennybacker Bridge" tabindex="-1">
        <figcaption>Fig.1 - The Pennybacker Bridge in Austin, Texas</figcaption>
      </figure>
    `;
    const el = document.getElementById('img');
    const result = generateAnnouncement({ role: 'img', name: 'Pennybacker Bridge', tagName: 'IMG' }, el);
    expect(result).toContain('Pennybacker Bridge');
    expect(result).toContain('Graphic');
    expect(result).toContain('Fig.1 - The Pennybacker Bridge in Austin, Texas');
  });

  it('does not duplicate text when alt matches figcaption exactly', () => {
    document.body.innerHTML = `
      <figure>
        <img id="img" src="photo.jpg" alt="My Photo" tabindex="-1">
        <figcaption>My Photo</figcaption>
      </figure>
    `;
    const el = document.getElementById('img');
    const result = generateAnnouncement({ role: 'img', name: 'My Photo', tagName: 'IMG' }, el);
    expect(result).toBe('My Photo, Graphic');
  });

  it('announces image normally when not inside a figure', () => {
    const el = document.createElement('img');
    const result = generateAnnouncement({ role: 'img', name: 'Logo', tagName: 'IMG' }, el);
    expect(result).toBe('Logo, Graphic');
  });
});

describe('fieldset context surfaced for buttons inside fieldset', () => {
  it('prefixes fieldset legend for buttons inside fieldset', () => {
    document.body.innerHTML = `
      <fieldset>
        <legend>Florida's Orangest Oranges</legend>
        <button id="dec" aria-label="Decrease Amount">-</button>
        <input type="number" aria-label="Amount" value="1">
        <button id="add" aria-label="Add to cart">Add</button>
      </fieldset>
    `;
    const dec = document.getElementById('dec');
    const add = document.getElementById('add');
    expect(generateAnnouncement({ role: 'button', name: 'Decrease Amount', tagName: 'BUTTON' }, dec))
      .toBe("Florida's Orangest Oranges, Decrease Amount, Button");
    expect(generateAnnouncement({ role: 'button', name: 'Add to cart', tagName: 'BUTTON' }, add))
      .toBe("Florida's Orangest Oranges, Add to cart, Button");
  });

  it('does not repeat legend if button name already contains it', () => {
    document.body.innerHTML = `
      <fieldset>
        <legend>Shipping</legend>
        <button id="b" aria-label="Shipping Options">Choose</button>
      </fieldset>
    `;
    const el = document.getElementById('b');
    const result = generateAnnouncement({ role: 'button', name: 'Shipping Options', tagName: 'BUTTON' }, el);
    expect((result.toLowerCase().match(/shipping/g) || []).length).toBe(1);
  });

  it('does not prepend context for buttons outside a fieldset', () => {
    const el = document.createElement('button');
    expect(generateAnnouncement({ role: 'button', name: 'Submit', tagName: 'BUTTON' }, el))
      .toBe('Submit, Button');
  });
});

describe('fieldset context surfaced for form fields', () => {
  it('prefixes fieldset legend for text inputs inside fieldset', () => {
    document.body.innerHTML = `
      <fieldset>
        <legend>Billing Address</legend>
        <input id="street" type="text" aria-label="Street">
      </fieldset>
    `;
    const el = document.getElementById('street');
    const result = generateAnnouncement({ role: 'textbox', name: 'Street', tagName: 'INPUT' }, el);
    expect(result).toContain('Billing Address');
    expect(result).toContain('Street');
    expect(result).toContain('text field');
  });

  it('does not repeat legend if already in the field name', () => {
    document.body.innerHTML = `
      <fieldset>
        <legend>Billing Address</legend>
        <input id="f" type="text" aria-label="Billing Address Street">
      </fieldset>
    `;
    const el = document.getElementById('f');
    const result = generateAnnouncement({ role: 'textbox', name: 'Billing Address Street', tagName: 'INPUT' }, el);
    expect((result.toLowerCase().match(/billing address/g) || []).length).toBe(1);
  });
});

describe('role=group context surfaced for checkboxes', () => {
  it('prefixes group label (via aria-labelledby) for checkboxes inside role=group div', () => {
    document.body.innerHTML = `
      <div role="group" aria-labelledby="gl">
        <p id="gl">Accessibility Accommodations</p>
        <input type="checkbox" id="cb" aria-label="Braille">
      </div>
    `;
    const el = document.getElementById('cb');
    const result = generateAnnouncement({ role: 'checkbox', name: 'Braille', tagName: 'INPUT', states: { checked: 'false' } }, el);
    expect(result).toContain('Accessibility Accommodations');
    expect(result).toContain('Braille');
    expect(result).toContain('Checkbox');
  });

  it('prefixes group aria-label for checkboxes inside role=group div', () => {
    document.body.innerHTML = `
      <div role="group" aria-label="Preferences">
        <input type="checkbox" id="cb2" aria-label="Dark mode">
      </div>
    `;
    const el = document.getElementById('cb2');
    const result = generateAnnouncement({ role: 'checkbox', name: 'Dark mode', tagName: 'INPUT', states: { checked: 'false' } }, el);
    expect(result).toContain('Preferences');
    expect(result).toContain('Dark mode');
  });
});

describe('audio element announcement', () => {
  it('announces basic paused audio with current time', () => {
    const el = document.createElement('audio');
    expect(generateAnnouncement({ tagName: 'AUDIO' }, el))
      .toBe('audio, paused, 0:00');
  });

  it('announces audio with controls attribute', () => {
    const el = document.createElement('audio');
    el.setAttribute('controls', '');
    expect(generateAnnouncement({ tagName: 'AUDIO' }, el))
      .toBe('audio, paused, 0:00, use arrow keys to control');
  });

  it('announces audio with aria-label', () => {
    const el = document.createElement('audio');
    expect(generateAnnouncement({ name: 'My Podcast', tagName: 'AUDIO' }, el))
      .toBe('My Podcast, audio, paused, 0:00');
  });

  it('extracts filename from src as fallback name', () => {
    const el = document.createElement('audio');
    el.setAttribute('src', '/recordings/interview.mp3');
    expect(generateAnnouncement({ tagName: 'AUDIO' }, el))
      .toContain('interview');
  });

  it('announces playing state when paused=false', () => {
    const el = document.createElement('audio');
    Object.defineProperty(el, 'paused', { value: false, configurable: true });
    expect(generateAnnouncement({ tagName: 'AUDIO' }, el))
      .toContain('playing');
  });

  it('announces muted state', () => {
    const el = document.createElement('audio');
    Object.defineProperty(el, 'muted', { value: true, configurable: true });
    expect(generateAnnouncement({ tagName: 'AUDIO' }, el))
      .toContain('muted');
  });

  it('announces looping state', () => {
    const el = document.createElement('audio');
    Object.defineProperty(el, 'loop', { value: true, configurable: true });
    expect(generateAnnouncement({ tagName: 'AUDIO' }, el))
      .toContain('looping');
  });

  it('announces current time and duration when duration is finite', () => {
    const el = document.createElement('audio');
    Object.defineProperty(el, 'currentTime', { value: 74, configurable: true });
    Object.defineProperty(el, 'duration', { value: 202, configurable: true });
    expect(generateAnnouncement({ tagName: 'AUDIO' }, el))
      .toContain('1:14 of 3:22');
  });

  it('omits duration when NaN', () => {
    const el = document.createElement('audio');
    Object.defineProperty(el, 'currentTime', { value: 0, configurable: true });
    const result = generateAnnouncement({ tagName: 'AUDIO' }, el);
    expect(result).not.toContain(' of ');
    expect(result).toContain('0:00');
  });

  it('formats hours correctly for long media', () => {
    const el = document.createElement('audio');
    Object.defineProperty(el, 'currentTime', { value: 3661, configurable: true });
    Object.defineProperty(el, 'duration', { value: 7320, configurable: true });
    expect(generateAnnouncement({ tagName: 'AUDIO' }, el))
      .toContain('1:01:01 of 2:02:00');
  });
});

describe('video element announcement', () => {
  it('announces basic paused video', () => {
    const el = document.createElement('video');
    expect(generateAnnouncement({ tagName: 'VIDEO' }, el))
      .toBe('video, paused, 0:00');
  });

  it('announces video with controls', () => {
    const el = document.createElement('video');
    el.setAttribute('controls', '');
    expect(generateAnnouncement({ tagName: 'VIDEO' }, el))
      .toBe('video, paused, 0:00, use arrow keys to control');
  });

  it('announces named video that is playing', () => {
    const el = document.createElement('video');
    Object.defineProperty(el, 'paused', { value: false, configurable: true });
    Object.defineProperty(el, 'currentTime', { value: 8, configurable: true });
    Object.defineProperty(el, 'duration', { value: 135, configurable: true });
    expect(generateAnnouncement({ name: 'Product demo', tagName: 'VIDEO' }, el))
      .toBe('Product demo, video, playing, 0:08 of 2:15');
  });

  it('announces video with muted and no duration', () => {
    const el = document.createElement('video');
    el.setAttribute('controls', '');
    Object.defineProperty(el, 'muted', { value: true, configurable: true });
    expect(generateAnnouncement({ tagName: 'VIDEO' }, el))
      .toBe('video, paused, muted, 0:00, use arrow keys to control');
  });
});

describe('timeline slider announcement', () => {
  it('formats Time Scrubber values as mm:ss', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'slider');
    el.setAttribute('aria-valuenow', '34');
    el.setAttribute('aria-valuemin', '0');
    el.setAttribute('aria-valuemax', '202');
    const result = generateAnnouncement({ role: 'slider', name: 'Time Scrubber', tagName: 'DIV' }, el);
    expect(result).toContain('0:34');
    expect(result).toContain('Min: 0:00');
    expect(result).toContain('Max: 3:22');
  });

  it('formats seek slider values as mm:ss', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'slider');
    el.setAttribute('aria-valuenow', '90');
    el.setAttribute('aria-valuemin', '0');
    el.setAttribute('aria-valuemax', '300');
    const result = generateAnnouncement({ role: 'slider', name: 'Seek Position', tagName: 'DIV' }, el);
    expect(result).toContain('1:30');
  });

  it('keeps numeric format for non-timeline sliders', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'slider');
    el.setAttribute('aria-valuenow', '75');
    el.setAttribute('aria-valuemin', '0');
    el.setAttribute('aria-valuemax', '100');
    const result = generateAnnouncement({ role: 'slider', name: 'Volume', tagName: 'DIV' }, el);
    expect(result).toBe('Volume, slider, 75 Min: 0 Max: 100');
    // Confirm no mm:ss time formatting was applied
    expect(result).not.toMatch(/\d:\d\d/);
  });
});

describe('math element announcement', () => {
  it('announces math container with numeric content', () => {
    const math = document.createElement('math');
    const mn = document.createElement('mn');
    mn.textContent = '42';
    math.appendChild(mn);
    expect(generateAnnouncement({ tagName: 'MATH' }, math))
      .toBe('math, 42');
  });

  it('uses alttext as the math content when no aria-label present', () => {
    const math = document.createElement('math');
    math.setAttribute('alttext', 'E equals m c squared');
    const mn = document.createElement('mn');
    mn.textContent = '2';
    math.appendChild(mn);
    // alttext takes priority over assembleMathReading
    expect(generateAnnouncement({ tagName: 'MATH' }, math))
      .toBe('math, E equals m c squared');
  });

  it('aria-label (explicit name) takes priority over alttext', () => {
    const math = document.createElement('math');
    math.setAttribute('alttext', 'ignored alttext');
    expect(generateAnnouncement({ name: 'Quadratic formula', tagName: 'MATH' }, math))
      .toBe('math, Quadratic formula');
  });

  it('announces fraction via mfrac', () => {
    const math = document.createElement('math');
    const mfrac = document.createElement('mfrac');
    const mn1 = document.createElement('mn');
    mn1.textContent = '1';
    const mn2 = document.createElement('mn');
    mn2.textContent = '2';
    mfrac.appendChild(mn1);
    mfrac.appendChild(mn2);
    math.appendChild(mfrac);
    expect(generateAnnouncement({ tagName: 'MATH' }, math))
      .toBe('math, fraction, 1 over 2, end fraction');
  });

  it('announces square root via msqrt', () => {
    const math = document.createElement('math');
    const msqrt = document.createElement('msqrt');
    const mi = document.createElement('mi');
    mi.textContent = 'x';
    msqrt.appendChild(mi);
    math.appendChild(msqrt);
    expect(generateAnnouncement({ tagName: 'MATH' }, math))
      .toBe('math, square root of x, end square root');
  });

  it('announces x squared for msup with exponent 2', () => {
    const math = document.createElement('math');
    const msup = document.createElement('msup');
    const mi = document.createElement('mi');
    mi.textContent = 'x';
    const mn = document.createElement('mn');
    mn.textContent = '2';
    msup.appendChild(mi);
    msup.appendChild(mn);
    math.appendChild(msup);
    expect(generateAnnouncement({ tagName: 'MATH' }, math))
      .toBe('math, x squared');
  });

  it('announces x cubed for msup with exponent 3', () => {
    const math = document.createElement('math');
    const msup = document.createElement('msup');
    const mi = document.createElement('mi');
    mi.textContent = 'x';
    const mn = document.createElement('mn');
    mn.textContent = '3';
    msup.appendChild(mi);
    msup.appendChild(mn);
    math.appendChild(msup);
    expect(generateAnnouncement({ tagName: 'MATH' }, math))
      .toBe('math, x cubed');
  });

  it('announces ordinal power for msup with exponent > 3', () => {
    const math = document.createElement('math');
    const msup = document.createElement('msup');
    const mi = document.createElement('mi');
    mi.textContent = 'x';
    const mn = document.createElement('mn');
    mn.textContent = '4';
    msup.appendChild(mi);
    msup.appendChild(mn);
    math.appendChild(msup);
    expect(generateAnnouncement({ tagName: 'MATH' }, math))
      .toBe('math, x to the 4th power');
  });

  it('announces "to the power of" for variable exponent in msup', () => {
    const math = document.createElement('math');
    const msup = document.createElement('msup');
    const mi = document.createElement('mi');
    mi.textContent = 'e';
    const mi2 = document.createElement('mi');
    mi2.textContent = 'n';
    msup.appendChild(mi);
    msup.appendChild(mi2);
    math.appendChild(msup);
    expect(generateAnnouncement({ tagName: 'MATH' }, math))
      .toBe('math, e to the power of n');
  });

  it('announces subscript via msub', () => {
    const math = document.createElement('math');
    const msub = document.createElement('msub');
    const mi = document.createElement('mi');
    mi.textContent = 'a';
    const mn = document.createElement('mn');
    mn.textContent = '1';
    msub.appendChild(mi);
    msub.appendChild(mn);
    math.appendChild(msub);
    expect(generateAnnouncement({ tagName: 'MATH' }, math))
      .toBe('math, a subscript 1');
  });

  it('translates Greek identifiers via MATH_IDENTIFIER_MAP', () => {
    const math = document.createElement('math');
    const mi = document.createElement('mi');
    mi.textContent = 'π';
    math.appendChild(mi);
    expect(generateAnnouncement({ tagName: 'MATH' }, math))
      .toBe('math, pi');
  });

  it('translates operator symbols via MATH_OPERATOR_MAP', () => {
    const math = document.createElement('math');
    const mo = document.createElement('mo');
    mo.textContent = '∑';
    math.appendChild(mo);
    expect(generateAnnouncement({ tagName: 'MATH' }, math))
      .toBe('math, sum');
  });

  it('announces empty math as just "math"', () => {
    const math = document.createElement('math');
    expect(generateAnnouncement({ tagName: 'MATH' }, math))
      .toBe('math');
  });
});

describe('MathJax v3 mjx-container announcement', () => {
  function makeMjxContainer({ ariaLabel, mathML } = {}) {
    const container = document.createElement('mjx-container');
    if (ariaLabel) container.setAttribute('aria-label', ariaLabel);
    const visual = document.createElement('mjx-math');
    visual.setAttribute('aria-hidden', 'true');
    visual.textContent = '[visual]';
    container.appendChild(visual);
    const assistive = document.createElement('mjx-assistive-mml');
    if (mathML) assistive.innerHTML = mathML;
    container.appendChild(assistive);
    return container;
  }

  it('reads inner math via assembleMathReading when no aria-label', () => {
    const el = makeMjxContainer({
      mathML: '<math><msup><mi>b</mi><mn>2</mn></msup></math>',
    });
    expect(generateAnnouncement({ tagName: 'MJX-CONTAINER' }, el))
      .toBe('math, b squared');
  });

  it('prefers aria-label over inner math reading', () => {
    const el = makeMjxContainer({
      ariaLabel: 'b squared plus 4 a c',
      mathML: '<math><msup><mi>b</mi><mn>2</mn></msup></math>',
    });
    expect(generateAnnouncement({ name: 'b squared plus 4 a c', tagName: 'MJX-CONTAINER' }, el))
      .toBe('math, b squared plus 4 a c');
  });

  it('does not read aria-hidden visual layer', () => {
    const el = makeMjxContainer({
      mathML: '<math><mn>42</mn></math>',
    });
    const result = generateAnnouncement({ tagName: 'MJX-CONTAINER' }, el);
    expect(result).not.toContain('[visual]');
    expect(result).toBe('math, 42');
  });

  it('announces just "math" when no inner math and no label', () => {
    const el = document.createElement('mjx-container');
    expect(generateAnnouncement({ tagName: 'MJX-CONTAINER' }, el))
      .toBe('math');
  });

  it('reads fraction correctly through mjx-container', () => {
    const el = makeMjxContainer({
      mathML: '<math><mfrac><mn>1</mn><mn>2</mn></mfrac></math>',
    });
    expect(generateAnnouncement({ tagName: 'MJX-CONTAINER' }, el))
      .toBe('math, fraction, 1 over 2, end fraction');
  });
});

describe('MathJax v3 announcement (role=math on custom element)', () => {
  it('announces mjx-container via role=math using aria-label', () => {
    const el = document.createElement('mjx-container');
    el.setAttribute('role', 'math');
    el.setAttribute('aria-label', 'x squared plus y squared equals r squared');
    expect(generateAnnouncement({ role: 'math', name: 'x squared plus y squared equals r squared', tagName: 'MJX-CONTAINER' }, el))
      .toBe('math, x squared plus y squared equals r squared');
  });

  it('prefers aria-label over assembleMathReading for role=math', () => {
    const el = document.createElement('mjx-container');
    el.setAttribute('role', 'math');
    el.setAttribute('aria-label', 'E equals m c squared');
    // Even if there were child MathML, the aria-label should win
    expect(generateAnnouncement({ role: 'math', name: 'E equals m c squared', tagName: 'MJX-CONTAINER' }, el))
      .toBe('math, E equals m c squared');
  });

  it('falls back to assembleMathReading when no aria-label on role=math', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'math');
    const mn = document.createElement('mn');
    mn.textContent = '42';
    el.appendChild(mn);
    expect(generateAnnouncement({ role: 'math', tagName: 'DIV' }, el))
      .toBe('math, 42');
  });

  it('announces just "math" for empty role=math element with no label', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'math');
    expect(generateAnnouncement({ role: 'math', tagName: 'DIV' }, el))
      .toBe('math');
  });
});

describe('MathJax SRE aria-label on sub-expressions', () => {
  it('prefers SRE aria-label over assembleMathReading for focused mfrac', () => {
    const mfrac = document.createElement('mfrac');
    mfrac.setAttribute('aria-label', 'one half');
    const mn1 = document.createElement('mn');
    mn1.textContent = '1';
    const mn2 = document.createElement('mn');
    mn2.textContent = '2';
    mfrac.appendChild(mn1);
    mfrac.appendChild(mn2);
    expect(generateAnnouncement({ tagName: 'MFRAC', name: 'one half' }, mfrac))
      .toBe('one half');
  });

  it('uses assembleMathReading when no SRE label on MATH_TAGS element', () => {
    const mfrac = document.createElement('mfrac');
    const mn1 = document.createElement('mn');
    mn1.textContent = '3';
    const mn2 = document.createElement('mn');
    mn2.textContent = '4';
    mfrac.appendChild(mn1);
    mfrac.appendChild(mn2);
    expect(generateAnnouncement({ tagName: 'MFRAC' }, mfrac))
      .toBe('fraction, 3 over 4, end fraction');
  });
});

describe('individual MathML element announcement (MATH_TAGS)', () => {
  it('announces mfrac directly when focused as subtree', () => {
    const mfrac = document.createElement('mfrac');
    const mn1 = document.createElement('mn');
    mn1.textContent = '3';
    const mn2 = document.createElement('mn');
    mn2.textContent = '4';
    mfrac.appendChild(mn1);
    mfrac.appendChild(mn2);
    expect(generateAnnouncement({ tagName: 'MFRAC' }, mfrac))
      .toBe('fraction, 3 over 4, end fraction');
  });

  it('announces msup directly when focused (variable exponent)', () => {
    const msup = document.createElement('msup');
    const mi = document.createElement('mi');
    mi.textContent = 'e';
    const mi2 = document.createElement('mi');
    mi2.textContent = 'x';
    msup.appendChild(mi);
    msup.appendChild(mi2);
    expect(generateAnnouncement({ tagName: 'MSUP' }, msup))
      .toBe('e to the power of x');
  });

  it('announces msup directly when focused (integer exponent)', () => {
    const msup = document.createElement('msup');
    const mi = document.createElement('mi');
    mi.textContent = 'r';
    const mn = document.createElement('mn');
    mn.textContent = '2';
    msup.appendChild(mi);
    msup.appendChild(mn);
    expect(generateAnnouncement({ tagName: 'MSUP' }, msup))
      .toBe('r squared');
  });

  it('announces msubsup with sub and sup', () => {
    const msubsup = document.createElement('msubsup');
    const mi = document.createElement('mi');
    mi.textContent = 'x';
    const mn1 = document.createElement('mn');
    mn1.textContent = '0';
    const mn2 = document.createElement('mn');
    mn2.textContent = 'n';
    msubsup.appendChild(mi);
    msubsup.appendChild(mn1);
    msubsup.appendChild(mn2);
    expect(generateAnnouncement({ tagName: 'MSUBSUP' }, msubsup))
      .toBe('x subscript 0 superscript n');
  });

  it('announces mroot with index', () => {
    const mroot = document.createElement('mroot');
    const mi = document.createElement('mi');
    mi.textContent = 'x';
    const mn = document.createElement('mn');
    mn.textContent = '3';
    mroot.appendChild(mi);
    mroot.appendChild(mn);
    expect(generateAnnouncement({ tagName: 'MROOT' }, mroot))
      .toBe('3 root of x, end root');
  });

  it('announces munder', () => {
    const munder = document.createElement('munder');
    const mi = document.createElement('mi');
    mi.textContent = 'x';
    const mo = document.createElement('mo');
    mo.textContent = '→';
    munder.appendChild(mi);
    munder.appendChild(mo);
    expect(generateAnnouncement({ tagName: 'MUNDER' }, munder))
      .toContain('below');
  });

  it('announces mo as translated operator', () => {
    const mo = document.createElement('mo');
    mo.textContent = '+';
    expect(generateAnnouncement({ tagName: 'MO' }, mo))
      .toBe('plus');
  });

  it('announces mi as text (unknown identifier)', () => {
    const mi = document.createElement('mi');
    mi.textContent = 'f';
    expect(generateAnnouncement({ tagName: 'MI' }, mi))
      .toBe('f');
  });

  it('announces mn as text', () => {
    const mn = document.createElement('mn');
    mn.textContent = '42';
    expect(generateAnnouncement({ tagName: 'MN' }, mn))
      .toBe('42');
  });

  it('announces merror with content', () => {
    const merror = document.createElement('merror');
    const mtext = document.createElement('mtext');
    mtext.textContent = 'parse error';
    merror.appendChild(mtext);
    expect(generateAnnouncement({ tagName: 'MERROR' }, merror))
      .toBe('math error: parse error');
  });

  it('silences mphantom when reading it as part of a parent math tree', () => {
    // mphantom is silent when assembleMathReading is called on it from a parent context
    const math = document.createElement('math');
    const mrow = document.createElement('mrow');
    const mn = document.createElement('mn');
    mn.textContent = '3';
    const mphantom = document.createElement('mphantom');
    const mn2 = document.createElement('mn');
    mn2.textContent = '5';
    mphantom.appendChild(mn2);
    mrow.appendChild(mn);
    mrow.appendChild(mphantom);
    math.appendChild(mrow);
    // The phantom content '5' should not appear in the reading
    expect(generateAnnouncement({ tagName: 'MATH' }, math))
      .toBe('math, 3');
  });

  it('announces mphantom tag name when directly focused (fallback)', () => {
    // When mphantom is the directly focused element, the fallback is the tag name
    const mphantom = document.createElement('mphantom');
    const mn = document.createElement('mn');
    mn.textContent = '5';
    mphantom.appendChild(mn);
    expect(generateAnnouncement({ tagName: 'MPHANTOM' }, mphantom))
      .toBe('mphantom');
  });

  it('falls back to tagName when math reading is empty', () => {
    const mspace = document.createElement('mspace');
    expect(generateAnnouncement({ tagName: 'MSPACE' }, mspace))
      .toBe('mspace');
  });
});

describe('application role context for child elements', () => {
  it('appends "application" when element is inside role=application', () => {
    document.body.innerHTML = `
      <div role="application">
        <img id="drag" src="logo.gif" alt="logo" tabindex="0" draggable="true">
      </div>
    `;
    const el = document.getElementById('drag');
    const result = generateAnnouncement({ role: 'img', name: 'logo', tagName: 'IMG' }, el);
    expect(result).toContain('application');
    expect(result).toContain('Graphic');
    expect(result).toContain('draggable');
  });

  it('does not double-append application when announcing application container itself', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'application');
    const result = generateAnnouncement({ role: 'application', name: '', tagName: 'DIV' }, el);
    expect(result).toBe('application');
    expect((result.match(/application/g) || []).length).toBe(1);
  });
});

describe('aria-roledescription', () => {
  it('replaces role label for button', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-roledescription', 'color swatch');
    expect(generateAnnouncement({ role: 'button', name: 'Blue', tagName: 'DIV' }, el))
      .toBe('Blue, color swatch');
  });

  it('replaces role label for group', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'group');
    el.setAttribute('aria-roledescription', 'slide');
    expect(generateAnnouncement({ role: 'group', name: 'Slide 1 of 5', tagName: 'DIV' }, el))
      .toBe('Slide 1 of 5, slide');
  });

  it('replaces role label for tab, keeping selected and position', () => {
    document.body.innerHTML = `
      <div role="tablist">
        <div role="tab" id="t1" aria-roledescription="step" aria-selected="true">Billing</div>
        <div role="tab" id="t2" aria-roledescription="step" aria-selected="false">Shipping</div>
        <div role="tab" id="t3" aria-roledescription="step" aria-selected="false">Review</div>
        <div role="tab" id="t4" aria-roledescription="step" aria-selected="false">Confirm</div>
      </div>
    `;
    expect(generateAnnouncement({ role: 'tab', name: 'Billing', tagName: 'DIV' }, document.getElementById('t1')))
      .toBe('Billing, step, selected, 1 of 4');
  });

  it('drops heading level when aria-roledescription is present', () => {
    const el = document.createElement('h2');
    el.setAttribute('aria-roledescription', 'section title');
    expect(generateAnnouncement({ role: 'heading', name: 'Introduction', tagName: 'H2' }, el))
      .toBe('Introduction, section title');
  });

  it('replaces role for link', () => {
    const el = document.createElement('a');
    el.setAttribute('aria-roledescription', 'external link');
    expect(generateAnnouncement({ role: 'link', name: 'Docs', tagName: 'A' }, el))
      .toBe('Docs, external link');
  });

  it('replaces role for img', () => {
    const el = document.createElement('img');
    el.setAttribute('aria-roledescription', 'photo');
    expect(generateAnnouncement({ role: 'img', name: 'Sunset', tagName: 'IMG' }, el))
      .toBe('Sunset, photo');
  });

  it('replaces role for switch', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'switch');
    el.setAttribute('aria-roledescription', 'toggle');
    el.setAttribute('aria-checked', 'true');
    expect(generateAnnouncement({ role: 'switch', name: 'Dark mode', tagName: 'DIV' }, el))
      .toBe('Dark mode, toggle, on');
  });

  it('replaces role for treeitem', () => {
    document.body.innerHTML = `
      <ul role="tree">
        <li role="treeitem" id="item" aria-roledescription="folder" aria-level="1">Documents</li>
      </ul>
    `;
    expect(generateAnnouncement({ role: 'treeitem', name: 'Documents', tagName: 'LI' }, document.getElementById('item')))
      .toContain('folder');
  });
});

describe('aria-multiselectable', () => {
  it('appends multi-select for listbox with aria-multiselectable=true', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'listbox');
    el.setAttribute('aria-multiselectable', 'true');
    expect(generateAnnouncement({ role: 'listbox', name: 'Files', tagName: 'DIV' }, el))
      .toContain('multi-select');
  });

  it('appends multi-select for tablist with aria-multiselectable=true', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'tablist');
    el.setAttribute('aria-multiselectable', 'true');
    expect(generateAnnouncement({ role: 'tablist', name: '', tagName: 'DIV' }, el))
      .toContain('multi-select');
  });

  it('does not append multi-select for listbox without aria-multiselectable', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'listbox');
    expect(generateAnnouncement({ role: 'listbox', name: 'Files', tagName: 'DIV' }, el))
      .not.toContain('multi-select');
  });

  it('does not append multi-select for non-container roles', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-multiselectable', 'true');
    const result = generateAnnouncement({ role: 'button', name: 'Click', tagName: 'DIV' }, el);
    expect(result).not.toContain('multi-select');
  });

  it('appends multi-select for grid', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'grid');
    el.setAttribute('aria-multiselectable', 'true');
    expect(generateAnnouncement({ role: 'grid', name: 'Data', tagName: 'DIV' }, el))
      .toContain('multi-select');
  });
});

describe('aria-valuetext', () => {
  it('uses aria-valuetext instead of aria-valuenow for slider', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'slider');
    el.setAttribute('aria-valuenow', '1');
    el.setAttribute('aria-valuetext', 'Low');
    el.setAttribute('aria-valuemin', '0');
    el.setAttribute('aria-valuemax', '3');
    const result = generateAnnouncement({ role: 'slider', name: 'Priority', tagName: 'DIV' }, el);
    expect(result).toContain('Low');
    expect(result).not.toContain('1, Min');
  });

  it('falls back to aria-valuenow when aria-valuetext absent', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'slider');
    el.setAttribute('aria-valuenow', '7');
    const result = generateAnnouncement({ role: 'slider', name: 'Volume', tagName: 'DIV' }, el);
    expect(result).toContain(', 7');
  });

  it('uses aria-valuetext for spinbutton', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'spinbutton');
    el.setAttribute('aria-valuenow', '2');
    el.setAttribute('aria-valuetext', 'February');
    const result = generateAnnouncement({ role: 'spinbutton', name: 'Month', tagName: 'DIV' }, el);
    expect(result).toContain('February');
    expect(result).not.toContain('2, Min');
  });
});

describe('aria-posinset and aria-setsize', () => {
  it('uses aria-posinset/aria-setsize for tab position in virtualized list', () => {
    document.body.innerHTML = `
      <div role="tablist">
        <div role="tab" id="t" aria-selected="true" aria-posinset="5" aria-setsize="20">Tab 5</div>
      </div>
    `;
    expect(generateAnnouncement({ role: 'tab', name: 'Tab 5', tagName: 'DIV' }, document.getElementById('t')))
      .toBe('Tab 5, tab, selected, 5 of 20');
  });

  it('uses aria-posinset/aria-setsize for menuitem in virtual menu', () => {
    document.body.innerHTML = `
      <ul role="menu">
        <li role="menuitem" id="item" aria-posinset="3" aria-setsize="50">Copy</li>
      </ul>
    `;
    expect(generateAnnouncement({ role: 'menuitem', name: 'Copy', tagName: 'LI' }, document.getElementById('item')))
      .toBe('Copy, menu item, 3 of 50');
  });

  it('uses aria-posinset/aria-setsize for treeitem', () => {
    document.body.innerHTML = `
      <ul role="tree">
        <li role="treeitem" id="item" aria-level="1" aria-posinset="2" aria-setsize="100">Folder</li>
      </ul>
    `;
    expect(generateAnnouncement({ role: 'treeitem', name: 'Folder', tagName: 'LI' }, document.getElementById('item')))
      .toContain('2 of 100');
  });

  it('falls back to DOM count when aria-posinset absent', () => {
    document.body.innerHTML = `
      <div role="tablist">
        <div role="tab" id="t1" aria-selected="true">A</div>
        <div role="tab" id="t2" aria-selected="false">B</div>
      </div>
    `;
    expect(generateAnnouncement({ role: 'tab', name: 'A', tagName: 'DIV' }, document.getElementById('t1')))
      .toBe('A, tab, selected, 1 of 2');
  });
});

describe('aria-errormessage', () => {
  it('appends error message text for textbox with aria-errormessage', () => {
    document.body.innerHTML = `
      <input id="email" type="email" aria-invalid="true" aria-errormessage="err1">
      <span id="err1">Must be a valid email address</span>
    `;
    const el = document.getElementById('email');
    const result = generateAnnouncement({ role: 'textbox', name: 'Email', tagName: 'INPUT' }, el);
    expect(result).toContain('Invalid entry, Error: Must be a valid email address');
  });

  it('falls back to plain Invalid entry when errormessage element not found', () => {
    const el = document.createElement('input');
    el.setAttribute('aria-invalid', 'true');
    el.setAttribute('aria-errormessage', 'nonexistent-id');
    const result = generateAnnouncement({ role: 'textbox', name: 'Name', tagName: 'INPUT' }, el);
    expect(result).toContain('Invalid entry');
    expect(result).not.toContain('Error:');
  });

  it('appends error message for checkbox with aria-errormessage', () => {
    document.body.innerHTML = `
      <input id="cb" type="checkbox" aria-invalid="true" aria-errormessage="cberr">
      <span id="cberr">You must agree to the terms</span>
    `;
    const el = document.getElementById('cb');
    const result = generateAnnouncement({ role: 'checkbox', name: 'Agree', tagName: 'INPUT', states: { checked: 'false' } }, el);
    expect(result).toContain('Invalid entry, Error: You must agree to the terms');
  });

  it('appends error message for radio with aria-errormessage', () => {
    document.body.innerHTML = `
      <input id="r" type="radio" aria-invalid="true" aria-errormessage="rerr">
      <span id="rerr">Please select an option</span>
    `;
    const el = document.getElementById('r');
    const result = generateAnnouncement({ role: 'radio', name: 'Option A', tagName: 'INPUT', states: { checked: 'false' } }, el);
    expect(result).toContain('Invalid entry, Error: Please select an option');
  });

  it('appends error message for select with aria-errormessage', () => {
    document.body.innerHTML = `
      <select id="sel" aria-invalid="true" aria-errormessage="selerr">
        <option>Choose</option>
      </select>
      <span id="selerr">Selection required</span>
    `;
    const el = document.getElementById('sel');
    const result = generateAnnouncement({ role: 'combobox', name: 'Category', tagName: 'SELECT' }, el);
    expect(result).toContain('Invalid entry, Error: Selection required');
  });

  it('does not include Error: when aria-invalid is absent', () => {
    const el = document.createElement('input');
    const result = generateAnnouncement({ role: 'textbox', name: 'Name', tagName: 'INPUT' }, el);
    expect(result).not.toContain('Error:');
  });
});

describe('aria-sort on column headers', () => {
  it('appends "sorted ascending" for aria-sort=ascending on columnheader', () => {
    document.body.innerHTML = `
      <div role="grid">
        <div role="row">
          <div role="columnheader" id="ch" aria-sort="ascending">Name</div>
        </div>
      </div>
    `;
    const el = document.getElementById('ch');
    expect(generateAnnouncement({ role: 'columnheader', name: 'Name', tagName: 'DIV' }, el))
      .toContain('sorted ascending');
  });

  it('appends "sorted descending" for aria-sort=descending', () => {
    document.body.innerHTML = `
      <div role="grid">
        <div role="row">
          <div role="columnheader" id="ch" aria-sort="descending">Price</div>
        </div>
      </div>
    `;
    const el = document.getElementById('ch');
    expect(generateAnnouncement({ role: 'columnheader', name: 'Price', tagName: 'DIV' }, el))
      .toContain('sorted descending');
  });

  it('appends "sorted" for aria-sort=other', () => {
    document.body.innerHTML = `
      <div role="grid">
        <div role="row">
          <div role="columnheader" id="ch" aria-sort="other">Category</div>
        </div>
      </div>
    `;
    const el = document.getElementById('ch');
    expect(generateAnnouncement({ role: 'columnheader', name: 'Category', tagName: 'DIV' }, el))
      .toContain('sorted');
  });

  it('does not append sort label when aria-sort is absent', () => {
    const el = document.createElement('th');
    el.textContent = 'Date';
    expect(generateAnnouncement({ role: 'columnheader', name: 'Date', tagName: 'TH' }, el))
      .not.toContain('sorted');
  });

  it('does not append sort to regular data cells', () => {
    const el = document.createElement('td');
    el.setAttribute('aria-sort', 'ascending');
    expect(generateAnnouncement({ role: 'cell', name: 'Alice', tagName: 'TD' }, el))
      .not.toContain('sorted');
  });
});

describe('aria-autocomplete', () => {
  it('appends "has autocomplete list" for aria-autocomplete=list on combobox', () => {
    const el = document.createElement('input');
    el.setAttribute('aria-autocomplete', 'list');
    expect(generateAnnouncement({ role: 'combobox', name: 'Country', tagName: 'INPUT' }, el))
      .toContain('has autocomplete list');
  });

  it('appends "autocomplete inline" for aria-autocomplete=inline on textbox', () => {
    const el = document.createElement('input');
    el.setAttribute('aria-autocomplete', 'inline');
    expect(generateAnnouncement({ role: 'textbox', name: 'Search', tagName: 'INPUT' }, el))
      .toContain('autocomplete inline');
  });

  it('appends "has autocomplete" for aria-autocomplete=both', () => {
    const el = document.createElement('input');
    el.setAttribute('aria-autocomplete', 'both');
    expect(generateAnnouncement({ role: 'searchbox', name: 'Query', tagName: 'INPUT' }, el))
      .toContain('has autocomplete');
  });

  it('does not append autocomplete label when attribute absent', () => {
    const el = document.createElement('input');
    expect(generateAnnouncement({ role: 'combobox', name: 'Country', tagName: 'INPUT' }, el))
      .not.toContain('autocomplete');
  });

  it('does not append autocomplete label for non-text roles', () => {
    const el = document.createElement('div');
    el.setAttribute('aria-autocomplete', 'list');
    expect(generateAnnouncement({ role: 'button', name: 'Click', tagName: 'DIV' }, el))
      .not.toContain('autocomplete');
  });
});

describe('role=alert', () => {
  it('announces alert content with Alert: prefix (no redundant role label)', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'alert');
    el.textContent = 'Your session is about to expire';
    expect(generateAnnouncement({ role: 'alert', name: '', tagName: 'DIV' }, el))
      .toBe('Alert: Your session is about to expire');
  });

  it('includes explicit name in alert announcement without redundant role label', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'alert');
    el.textContent = 'Error occurred';
    expect(generateAnnouncement({ role: 'alert', name: 'System alert', tagName: 'DIV' }, el))
      .toBe('Alert: System alert, Error occurred');
  });

  it('Alert: prefix applies for assertive live regions (not polite)', () => {
    const el = document.createElement('div');
    el.setAttribute('aria-live', 'assertive');
    expect(generateAnnouncement({ role: 'link', name: 'Home', tagName: 'A' }, el))
      .toContain('Alert:');
  });

  it('polite live regions do not get Alert: prefix', () => {
    const el = document.createElement('div');
    el.setAttribute('aria-live', 'polite');
    expect(generateAnnouncement({ role: 'link', name: 'Home', tagName: 'A' }, el))
      .not.toContain('Alert:');
  });
});

describe('role=option (custom listbox)', () => {
  it('announces custom option with selected state and position', () => {
    document.body.innerHTML = `
      <div role="listbox">
        <div role="option" id="o1" aria-selected="false">Apple</div>
        <div role="option" id="o2" aria-selected="true">Banana</div>
        <div role="option" id="o3" aria-selected="false">Cherry</div>
      </div>
    `;
    expect(generateAnnouncement({ role: 'option', name: 'Banana', tagName: 'DIV' }, document.getElementById('o2')))
      .toBe('Banana, option, selected, 2 of 3');
    expect(generateAnnouncement({ role: 'option', name: 'Apple', tagName: 'DIV' }, document.getElementById('o1')))
      .toBe('Apple, option, not selected, 1 of 3');
  });

  it('announces option outside a listbox without position', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'option');
    el.setAttribute('aria-selected', 'false');
    expect(generateAnnouncement({ role: 'option', name: 'Item', tagName: 'DIV' }, el))
      .toBe('Item, option, not selected');
  });

  it('uses aria-posinset/aria-setsize for virtual listbox options', () => {
    document.body.innerHTML = `
      <div role="listbox">
        <div role="option" id="o" aria-selected="false" aria-posinset="12" aria-setsize="500">Item 12</div>
      </div>
    `;
    expect(generateAnnouncement({ role: 'option', name: 'Item 12', tagName: 'DIV' }, document.getElementById('o')))
      .toBe('Item 12, option, not selected, 12 of 500');
  });
});

describe('ins, del, and s element announcement', () => {
  it('announces <ins> as insertion', () => {
    const el = document.createElement('ins');
    el.textContent = 'added text';
    expect(generateAnnouncement({ tagName: 'INS' }, el))
      .toBe('added text, insertion');
  });

  it('announces <del> as deletion', () => {
    const el = document.createElement('del');
    el.textContent = 'removed text';
    expect(generateAnnouncement({ tagName: 'DEL' }, el))
      .toBe('removed text, deletion');
  });

  it('announces <s> as deletion', () => {
    const el = document.createElement('s');
    el.textContent = 'old price';
    expect(generateAnnouncement({ tagName: 'S' }, el))
      .toBe('old price, deletion');
  });

  it('announces role=insertion', () => {
    const el = document.createElement('span');
    el.setAttribute('role', 'insertion');
    el.textContent = 'new item';
    expect(generateAnnouncement({ role: 'insertion', tagName: 'SPAN' }, el))
      .toBe('new item, insertion');
  });

  it('announces role=deletion', () => {
    const el = document.createElement('span');
    el.setAttribute('role', 'deletion');
    el.textContent = 'old item';
    expect(generateAnnouncement({ role: 'deletion', tagName: 'SPAN' }, el))
      .toBe('old item, deletion');
  });
});

describe('output element announcement', () => {
  it('announces <output> as status', () => {
    const el = document.createElement('output');
    el.textContent = 'Total: $42.00';
    expect(generateAnnouncement({ tagName: 'OUTPUT' }, el))
      .toBe('status, Total: $42.00');
  });

  it('includes explicit name for <output>', () => {
    const el = document.createElement('output');
    el.textContent = '128';
    expect(generateAnnouncement({ name: 'Word count', tagName: 'OUTPUT' }, el))
      .toBe('Word count, status, 128');
  });
});

describe('role=tooltip announcement', () => {
  it('announces tooltip with content', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'tooltip');
    el.textContent = 'This action cannot be undone';
    expect(generateAnnouncement({ role: 'tooltip', tagName: 'DIV' }, el))
      .toBe('This action cannot be undone, tooltip');
  });

  it('uses explicit name for tooltip when provided', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'tooltip');
    expect(generateAnnouncement({ role: 'tooltip', name: 'Help text', tagName: 'DIV' }, el))
      .toBe('Help text, tooltip');
  });
});

describe('role=toolbar announcement', () => {
  it('announces toolbar with explicit label', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'toolbar');
    expect(generateAnnouncement({ role: 'toolbar', name: 'Text formatting', tagName: 'DIV' }, el))
      .toBe('Text formatting, toolbar');
  });

  it('announces toolbar without label', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'toolbar');
    expect(generateAnnouncement({ role: 'toolbar', name: '', tagName: 'DIV' }, el))
      .toBe('toolbar');
  });
});

describe('role=tree and role=treegrid container announcement', () => {
  it('announces tree container with label', () => {
    const el = document.createElement('ul');
    el.setAttribute('role', 'tree');
    expect(generateAnnouncement({ role: 'tree', name: 'File browser', tagName: 'UL' }, el))
      .toBe('File browser, tree');
  });

  it('announces tree container without label', () => {
    const el = document.createElement('ul');
    el.setAttribute('role', 'tree');
    expect(generateAnnouncement({ role: 'tree', name: '', tagName: 'UL' }, el))
      .toBe('tree');
  });

  it('announces treegrid container as "tree grid"', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'treegrid');
    expect(generateAnnouncement({ role: 'treegrid', name: 'Project files', tagName: 'DIV' }, el))
      .toBe('Project files, tree grid');
  });
});

describe('dt and dd element announcement', () => {
  it('announces <dt> as term', () => {
    const el = document.createElement('dt');
    el.textContent = 'HTML';
    expect(generateAnnouncement({ tagName: 'DT' }, el))
      .toBe('HTML, term');
  });

  it('announces <dd> as definition', () => {
    const el = document.createElement('dd');
    el.textContent = 'HyperText Markup Language';
    expect(generateAnnouncement({ tagName: 'DD' }, el))
      .toBe('HyperText Markup Language, definition');
  });

  it('uses effective name for dt when available', () => {
    const el = document.createElement('dt');
    expect(generateAnnouncement({ name: 'CSS', tagName: 'DT' }, el))
      .toBe('CSS, term');
  });
});

describe('addendum: container label context (Fix 1)', () => {
  it('prepends tablist aria-label to tab announcement', () => {
    document.body.innerHTML = `
      <div role="tablist" aria-label="Checkout steps">
        <div role="tab" id="t1" aria-selected="false">Shipping</div>
        <div role="tab" id="t2" aria-selected="true">Billing</div>
      </div>
    `;
    const el = document.getElementById('t2');
    const result = generateAnnouncement({ role: 'tab', name: 'Billing', tagName: 'DIV' }, el);
    expect(result).toBe('Checkout steps, Billing, tab, selected, 2 of 2');
  });

  it('omits tablist label when already in tab name', () => {
    document.body.innerHTML = `
      <div role="tablist" aria-label="Steps">
        <div role="tab" id="t1" aria-selected="true">Steps overview</div>
      </div>
    `;
    const el = document.getElementById('t1');
    const result = generateAnnouncement({ role: 'tab', name: 'Steps overview', tagName: 'DIV' }, el);
    expect(result).not.toMatch(/^Steps, Steps/);
    expect(result).toContain('Steps overview');
  });

  it('prepends listbox aria-label to option announcement', () => {
    document.body.innerHTML = `
      <div role="listbox" aria-label="Fruit">
        <div role="option" id="o1" aria-selected="true">Apple</div>
        <div role="option" id="o2" aria-selected="false">Banana</div>
      </div>
    `;
    const el = document.getElementById('o1');
    const result = generateAnnouncement({ role: 'option', name: 'Apple', tagName: 'DIV' }, el);
    expect(result).toBe('Fruit, Apple, option, selected, 1 of 2');
  });

  it('prepends menu aria-label to menuitem announcement', () => {
    document.body.innerHTML = `
      <div role="menu" aria-label="Edit menu">
        <div role="menuitem" id="m1">Bold</div>
        <div role="menuitem" id="m2">Italic</div>
        <div role="menuitem" id="m3">Underline</div>
      </div>
    `;
    const el = document.getElementById('m1');
    const result = generateAnnouncement({ role: 'menuitem', name: 'Bold', tagName: 'DIV' }, el);
    expect(result).toBe('Edit menu, Bold, menu item, 1 of 3');
  });

  it('uses aria-labelledby for container label resolution', () => {
    document.body.innerHTML = `
      <span id="tl-label">Payment flow</span>
      <div role="tablist" aria-labelledby="tl-label">
        <div role="tab" id="tab1" aria-selected="true">Card</div>
      </div>
    `;
    const el = document.getElementById('tab1');
    const result = generateAnnouncement({ role: 'tab', name: 'Card', tagName: 'DIV' }, el);
    expect(result).toContain('Payment flow');
  });

  it('falls back to title attribute for container label', () => {
    document.body.innerHTML = `
      <div role="tablist" title="Account tabs">
        <div role="tab" id="tab1" aria-selected="false">Profile</div>
      </div>
    `;
    const el = document.getElementById('tab1');
    const result = generateAnnouncement({ role: 'tab', name: 'Profile', tagName: 'DIV' }, el);
    expect(result).toContain('Account tabs');
  });
});

describe('addendum: Fix 2 — no redundant role label for role=alert', () => {
  it('does not include "alert" word in middle of announcement', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'alert');
    el.textContent = 'Password too short';
    const result = generateAnnouncement({ role: 'alert', name: '', tagName: 'DIV' }, el);
    expect(result).toBe('Alert: Password too short');
    expect(result).not.toContain('alert, ');
  });

  it('status role still includes its label', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.textContent = 'Saved';
    const result = generateAnnouncement({ role: 'status', name: '', tagName: 'DIV' }, el);
    expect(result).toContain('status');
    expect(result).not.toContain('Alert:');
  });
});

describe('addendum: Fix 3 — unavailable instead of Disabled', () => {
  it('appends unavailable for aria-disabled elements', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-disabled', 'true');
    const result = generateAnnouncement({ role: 'button', name: 'Pay', tagName: 'DIV' }, el);
    expect(result).toContain('unavailable');
    expect(result).not.toContain('Disabled');
  });

  it('appends unavailable for natively disabled input', () => {
    const el = document.createElement('input');
    el.type = 'text';
    el.disabled = true;
    const result = generateAnnouncement({ role: 'textbox', name: 'Email', tagName: 'INPUT' }, el);
    expect(result).toContain('unavailable');
  });
});

describe('addendum: Fix 4 — OVER_MAP dedup (→ = with right arrow above)', () => {
  it('announces mover with → as "with right arrow above"', () => {
    document.body.innerHTML = `
      <math>
        <mover id="mv">
          <mi>v</mi>
          <mo>→</mo>
        </mover>
      </math>
    `;
    const el = document.getElementById('mv');
    const result = generateAnnouncement({ role: 'math', tagName: 'MOVER' }, el);
    expect(result).toContain('with right arrow above');
    expect(result).not.toContain('vector');
  });
});

describe('addendum: Fix 5 — no "Value: " prefix on slider/progressbar', () => {
  it('announces slider value without Value: prefix', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'slider');
    el.setAttribute('aria-valuenow', '5');
    el.setAttribute('aria-valuemin', '1');
    el.setAttribute('aria-valuemax', '10');
    const result = generateAnnouncement({ role: 'slider', name: 'Rating', tagName: 'DIV' }, el);
    expect(result).toBe('Rating, slider, 5 Min: 1 Max: 10');
    expect(result).not.toContain('Value:');
  });

  it('announces aria-valuetext without Value: prefix', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'slider');
    el.setAttribute('aria-valuenow', '1');
    el.setAttribute('aria-valuetext', 'Low');
    el.setAttribute('aria-valuemin', '0');
    el.setAttribute('aria-valuemax', '3');
    const result = generateAnnouncement({ role: 'slider', name: 'Priority', tagName: 'DIV' }, el);
    expect(result).toBe('Priority, slider, Low Min: 0 Max: 3');
    expect(result).not.toContain('Value:');
  });

  it('announces progressbar fallback value without Value: prefix', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'progressbar');
    el.setAttribute('aria-valuenow', '42');
    const result = generateAnnouncement({ role: 'progressbar', name: 'Upload', tagName: 'DIV' }, el);
    expect(result).toBe('Upload, Progress bar, 42');
    expect(result).not.toContain('Value:');
  });
});

describe('addendum: Fix 6 — ARIA 1.3 roles in VALID_ARIA_ROLES', () => {
  it('exports VALID_ARIA_ROLES with insertion and deletion', async () => {
    const { VALID_ARIA_ROLES } = await import('./roles.js');
    expect(VALID_ARIA_ROLES.has('insertion')).toBe(true);
    expect(VALID_ARIA_ROLES.has('deletion')).toBe(true);
    expect(VALID_ARIA_ROLES.has('suggestion')).toBe(true);
    expect(VALID_ARIA_ROLES.has('comment')).toBe(true);
    expect(VALID_ARIA_ROLES.has('blockquote')).toBe(true);
    expect(VALID_ARIA_ROLES.has('mark')).toBe(true);
    expect(VALID_ARIA_ROLES.has('strong')).toBe(true);
    expect(VALID_ARIA_ROLES.has('code')).toBe(true);
  });
});
