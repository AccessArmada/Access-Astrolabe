import { test, expect } from './fixtures.js';

test.describe('Bridge Integration - Focus and Mutation Syncing', () => {

  test('should sync announcement when an element is focused', async ({ page, sidePanel, testServer }) => {
    const url = testServer.url('button', { label: 'Submit Form', text: 'Send', id: 'test-button' });
    await page.goto(url);

    // Wait for side panel UI to exist
    await sidePanel.waitForSelector('#current-text', { state: 'attached' });

    // Poll: Repeatedly blur/focus the button until the content script catches it and the side panel updates
    await expect(async () => {
      await page.evaluate(() => {
        const btn = document.getElementById('test-button');
        if (btn) {
          btn.blur();
          btn.focus();
        }
      });
      // Small internal timeout since this block will retry quickly
      await expect(sidePanel.locator('#current-text')).toHaveText('Submit Form, button', { timeout: 1000 });
    }).toPass({ timeout: 10000 });
  });

  test('should update announcement when attributes change on focused element', async ({ page, sidePanel, testServer }) => {
    const url = testServer.url('mutable-button', {
      'initial-label': 'Initial Label',
      text: 'Button',
      id: 'test-button',
    });
    await page.goto(url);
    await sidePanel.waitForSelector('#current-text', { state: 'attached' });

    // 1. Poll initial focus state
    await expect(async () => {
      await page.evaluate(() => {
        const btn = document.getElementById('test-button');
        if (btn) {
          btn.blur();
          btn.focus();
        }
      });
      await expect(sidePanel.locator('#current-text')).toHaveText('Initial Label, button', { timeout: 1000 });
    }).toPass({ timeout: 10000 });

    // 2. Mutate aria-label (the content script is definitely attached by this point)
    await page.evaluate(() => {
      document.getElementById('test-button').setAttribute('aria-label', 'Updated Label');
    });

    // 3. Verify side panel updates automatically via mutation observer
    // Standard expect works here because we already proved the content script is active above
    await expect(sidePanel.locator('#current-text')).toHaveText('Updated Label, button', { timeout: 10000 });
  });
});
