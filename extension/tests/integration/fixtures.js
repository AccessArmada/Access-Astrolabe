import { test as base, chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { startTestServer } from './test-server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTENSION_PATH = path.resolve(__dirname, '../../dist');

export const test = base.extend({
  context: async ({ }, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });
    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers();
    if (!background) background = await context.waitForEvent('serviceworker');
    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  },

  sidePanel: async ({ context, extensionId }, use) => {
    const sidePanelPage = await context.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/sidepanel/index.html`);
    // Wait for the side panel JS to fully initialize
    await sidePanelPage.waitForFunction(() => typeof chrome !== 'undefined');
    await use(sidePanelPage);
  },

  /**
   * testServer — a local HTTP server that serves parameterized HTML pages.
   * Content scripts only inject on real navigation events (page.goto), NOT
   * on page.setContent(). This server enables correct injection.
   */
  testServer: async ({ }, use) => {
    const server = await startTestServer();
    await use(server);
    await server.close();
  },
});

export const expect = test.expect;
