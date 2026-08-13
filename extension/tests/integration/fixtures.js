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
    await sidePanelPage.waitForFunction(() => typeof chrome !== 'undefined');
    await use(sidePanelPage);
    await sidePanelPage.close();
  },

  /**
   * testServer — local HTTP server setup and clean teardown.
   */
  testServer: async ({ }, use) => {
    const server = await startTestServer();
    await use(server);

    // Force-close connections if supported by the Node server instance
    if (typeof server.closeAllConnections === 'function') {
      server.closeAllConnections();
    } else if (server.httpServer?.closeAllConnections) {
      server.httpServer.closeAllConnections();
    }

    // Race server close against a 2s safety timeout so teardown NEVER hangs CI
    await Promise.race([
      new Promise((resolve) => server.close ? server.close(resolve) : resolve()),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  },
});
export const expect = test.expect;
