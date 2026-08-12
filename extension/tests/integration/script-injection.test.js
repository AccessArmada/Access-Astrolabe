import { test, expect } from './fixtures.js';

/**
 * ROOT CAUSE NOTE:
 * ensureContentScriptsInjected() (sidepanel/index.js) is supposed to inject
 * content scripts into tabs that were already open before the extension
 * loaded/reloaded, so users don't have to manually reload the page.
 *
 * It relies on:
 *   1. `tabs[0].url` being populated, to skip special pages (chrome://, about:).
 *   2. `chrome.scripting.executeScript` succeeding against an arbitrary tab.
 *
 * Both require the extension to hold host permissions for that tab's origin.
 * `content_scripts[].matches` in the manifest only grants *automatic*
 * injection on navigation — it does NOT grant `chrome.tabs` URL visibility
 * or `chrome.scripting` programmatic access. Without an explicit
 * `host_permissions` (or `activeTab`) grant, `tabs[].url` comes back
 * `undefined` and `chrome.scripting.executeScript` throws a permission
 * error, so the fallback injection silently never runs.
 *
 * NOTE ON TEST STRATEGY: in real Chrome, the side panel is not a tab, so
 * chrome.tabs.query({active: true, currentWindow: true}) called from it
 * returns the actual foreground content tab. Playwright's side panel
 * fixture, however, opens the panel as its own regular tab, which then
 * becomes the "active" one — so these tests locate the content tab by URL
 * instead, to exercise the real permission gap without that harness quirk.
 */
test.describe('Script injection into already-open tabs', () => {
  function findContentTab(tabs, needle) {
    return tabs.find((t) => t.url && t.url.includes(needle));
  }

  test('tab URLs are visible to the extension', async ({ page, sidePanel }) => {
    await page.goto('http://example.com');
    await page.waitForTimeout(300);

    const tabs = await sidePanel.evaluate(() => chrome.tabs.query({}));

    // Without host_permissions, Chrome omits `.url` entirely for tabs the
    // extension doesn't have host access to — this is what breaks the
    // special-page guard in ensureContentScriptsInjected().
    expect(findContentTab(tabs, 'example.com')).toBeTruthy();
  });

  test('chrome.scripting.executeScript can inject into an arbitrary tab', async ({ page, sidePanel }) => {
    await page.goto('http://example.com');
    await page.waitForTimeout(300);

    const result = await sidePanel.evaluate(async () => {
      const tabs = await chrome.tabs.query({});
      const target = tabs.find((t) => t.url && t.url.includes('example.com'));
      if (!target) return { ok: false, message: 'TARGET_TAB_NOT_FOUND' };
      try {
        await chrome.scripting.executeScript({
          target: { tabId: target.id },
          files: ['content/ariaNotify-interceptor.js'],
          world: 'MAIN',
          injectImmediately: true,
        });
        return { ok: true };
      } catch (err) {
        return { ok: false, message: err.message };
      }
    });

    expect(result).toEqual({ ok: true });
  });
});
