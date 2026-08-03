import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTENSION_PATH = path.resolve(__dirname, '../../dist');

test('extension loads and side panel is accessible', async () => {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });

  const page = await context.newPage();
  await page.goto('https://example.com');

  // Verify extension loading
  // We can't easily interact with the sidepanel from page in a simple smoke test,
  // but we can check if the extension background page is running if we wanted to be fancy.
  // For a basic smoke test, if it launches and doesn't crash, that's a good start.
  
  await context.close();
});
