import { test, expect } from './fixtures.js';

/**
 * ROOT CAUSE NOTE:
 * The Help panel's content (.help-content) scrolls internally as intended —
 * #app-container and .pane-view (#view-help) never overflow their own boxes
 * (their scrollHeight === clientHeight at rest). But neither <html> nor
 * <body> declared `overflow: hidden`. Per default browser behavior, the
 * document root remains its own scrollable area sized to the full unclipped
 * extent of descendant content, even when every element in between clips
 * that same content via `overflow: hidden`/`auto`. Once wheel-scrolling
 * exhausts .help-content's own scroll range, the remaining scroll delta
 * "chains" up past #app-container (which has nothing left to scroll) into
 * the native document scroll — visibly sliding the whole app (including the
 * header/footer) up to reveal blank space. This is the "exterior scroll"
 * users saw after bottoming out the "interior scroll".
 *
 * Fix: `html, body { overflow: hidden }` pins the document root so all
 * scrolling is confined to the app's own designated scroll containers.
 */
test('scrolling past the bottom of the Help panel does not scroll the document', async ({ sidePanel }) => {
  await sidePanel.setViewportSize({ width: 360, height: 600 });
  await sidePanel.click('#btn-help');
  await sidePanel.waitForTimeout(200);

  // Scroll the interior help content all the way to its bottom first.
  await sidePanel.evaluate(() => {
    const el = document.querySelector('.help-content');
    el.scrollTop = el.scrollHeight;
  });
  await sidePanel.waitForTimeout(100);

  // Keep scrolling well past that point.
  const box = await sidePanel.locator('.help-content').boundingBox();
  await sidePanel.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < 15; i++) {
    await sidePanel.mouse.wheel(0, 200);
  }
  await sidePanel.waitForTimeout(200);

  const scroll = await sidePanel.evaluate(() => ({
    windowScrollY: window.scrollY,
    docScrollTop: document.documentElement.scrollTop,
  }));

  expect(scroll.windowScrollY).toBe(0);
  expect(scroll.docScrollTop).toBe(0);
});
