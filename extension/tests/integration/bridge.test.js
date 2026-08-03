import { test, expect } from './fixtures.js';

test.describe('Bridge Integration - Focus and Mutation Syncing', () => {
  /**
   * ROOT CAUSE NOTE:
   * page.setContent() does NOT re-trigger Chrome extension content script injection.
   * Content scripts only inject on real navigation events (page.goto()).
   * All tests must navigate to localhost test server URLs so the content script
   * properly injects, and focusin listeners are active when page.focus() is called.
   */

  test('should sync announcement when an element is focused', async ({ page, sidePanel, testServer, context, extensionId }) => {
    // Capture all console output for diagnostics
    page.on('console', msg => console.log(`BROWSER [PAGE]: ${msg.text()}`));
    sidePanel.on('console', msg => console.log(`BROWSER [SIDE]: ${msg.text()}`));

    const workers = context.serviceWorkers();
    const worker = workers[0] || await context.waitForEvent('serviceworker');
    worker.on('console', msg => console.log(`BROWSER [WORKER]: ${msg.text()}`));

    // Navigate using page.goto() so content script injects at document_idle
    const url = testServer.url('button', { label: 'Submit Form', text: 'Send', id: 'test-button' });
    console.log(`TEST: Navigating to test server: ${url}`);
    await page.goto(url);

    // Wait for content scripts to initialize (document_idle + script setup)
    await page.waitForFunction(() => typeof chrome !== 'undefined');
    await page.waitForTimeout(500);

    // Focus the element — this triggers the focusin listener in the content script
    await page.focus('#test-button');

    // Give the bridge time to relay via storage or runtime message
    // Side panel listens on chrome.storage.onChanged which is near-instant
    const currentText = sidePanel.locator('#current-text');
    await expect(currentText).toHaveText('Submit Form, button', { timeout: 8000 });
  });

  test('should update announcement when attributes change on focused element', async ({ page, sidePanel, testServer }) => {
    page.on('console', msg => console.log(`BROWSER [PAGE]: ${msg.text()}`));
    sidePanel.on('console', msg => console.log(`BROWSER [SIDE]: ${msg.text()}`));

    // Navigate to a page with a mutable button (starts with "Initial Label")
    const url = testServer.url('mutable-button', {
      'initial-label': 'Initial Label',
      text: 'Button',
      id: 'test-button',
    });
    await page.goto(url);
    await page.waitForFunction(() => typeof chrome !== 'undefined');
    await page.waitForTimeout(500);

    // Focus the element
    await page.focus('#test-button');

    // Check initial state synced to side panel
    await expect(sidePanel.locator('#current-text')).toHaveText('Initial Label, button', { timeout: 8000 });

    // Mutate the aria-label — MutationObserver in content script should detect this
    await page.evaluate(() => {
      document.getElementById('test-button').setAttribute('aria-label', 'Updated Label');
    });

    // Verify side panel updates automatically via mutation observer → bridge
    await expect(sidePanel.locator('#current-text')).toHaveText('Updated Label, button', { timeout: 8000 });
  });
});
