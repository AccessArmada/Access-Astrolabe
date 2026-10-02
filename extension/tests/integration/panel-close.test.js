import { test, expect } from './fixtures.js';

test.describe('Panel Close - Visual effects should clear when side panel closes', () => {

  test('focus highlighter clears when side panel closes', async ({ page, sidePanel, testServer }) => {
    const url = testServer.url('button', { label: 'Submit Form', text: 'Send', id: 'test-button' });
    await page.goto(url);

    // Wait until the panel is detected as open and the highlighter is drawn for the focused element
    await expect(async () => {
      await page.evaluate(() => {
        document.getElementById('test-button')?.focus();
      });
      await expect(page.locator('#sri-highlighter')).toBeAttached({ timeout: 1000 });
    }).toPass({ timeout: 10000 });

    // Close the side panel
    await sidePanel.close();

    // The highlighter should disappear from the page
    await expect(page.locator('#sri-highlighter')).not.toBeAttached({ timeout: 10000 });
  });

  test('vision mask overlay clears when side panel closes', async ({ page, sidePanel, testServer }) => {
    const url = testServer.url('button', { label: 'Submit Form', text: 'Send', id: 'test-button' });
    await page.goto(url);
    await sidePanel.waitForSelector('#vision-mask', { state: 'attached' });

    // Enable the vision mask from the side panel (click the visible label, since
    // the checkbox itself is visually-hidden behind a styled toggle track)
    await sidePanel.locator('label.control-toggle-micro', { has: sidePanel.locator('#vision-mask') }).click();

    await expect(page.locator('#sri-universal-mask')).toBeAttached({ timeout: 10000 });

    // Close the side panel
    await sidePanel.close();

    // The mask overlay should disappear from the page
    await expect(page.locator('#sri-universal-mask')).not.toBeAttached({ timeout: 10000 });
  });
});
