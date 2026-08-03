/**
 * test-server.js
 *
 * A minimal HTTP server that serves parameterized HTML test pages.
 * This is required because Chrome extension content scripts only inject
 * on real navigation events (page.goto), NOT on page.setContent().
 * 
 * Usage:
 *   const server = await startTestServer();
 *   // server.url('button', { label: 'Submit Form', text: 'Send' })
 *   // => 'http://localhost:PORT/?type=button&label=Submit+Form&text=Send'
 *   await server.close();
 */

import http from 'http';

/**
 * Generates a full HTML page for the given element type and attributes.
 * @param {URLSearchParams} params
 */
function generateHtml(params) {
  const type = params.get('type') || 'button';
  const label = params.get('label') || '';
  const text = params.get('text') || 'Click me';
  const id = params.get('id') || 'test-element';
  const initialLabel = params.get('initial-label') || label;

  let elementHtml = '';

  if (type === 'button') {
    const ariaLabel = label ? `aria-label="${label}"` : '';
    elementHtml = `<button id="${id}" ${ariaLabel}>${text}</button>`;
  } else if (type === 'input') {
    const ariaLabel = label ? `aria-label="${label}"` : '';
    elementHtml = `<input type="text" id="${id}" ${ariaLabel} />`;
  } else if (type === 'link') {
    const ariaLabel = label ? `aria-label="${label}"` : '';
    elementHtml = `<a href="#" id="${id}" ${ariaLabel}>${text}</a>`;
  } else if (type === 'mutable-button') {
    // For mutation observer tests — starts with initial-label
    const ariaLabel = initialLabel ? `aria-label="${initialLabel}"` : '';
    elementHtml = `<button id="${id}" ${ariaLabel}>${text}</button>`;
  } else {
    elementHtml = `<div id="${id}" tabindex="0" role="region" aria-label="${label}">${text}</div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Screen Reader Inspector Test Page</title>
</head>
<body>
  <h1>Integration Test Page</h1>
  ${elementHtml}
</body>
</html>`;
}

/**
 * Starts a local HTTP server for test pages.
 * @returns {Promise<{baseUrl: string, url: Function, close: Function}>}
 */
export async function startTestServer() {
  const server = http.createServer((req, res) => {
    const parsed = new URL(req.url, 'http://localhost');
    const html = generateHtml(parsed.searchParams);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  });

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve); // Port 0 = OS assigns a free port
  });

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    baseUrl,
    /**
     * Generate a URL for a test page.
     * @param {string} type - Element type: 'button', 'input', 'link', 'mutable-button'
     * @param {Object} attrs - Attributes: { label, text, id, 'initial-label' }
     */
    url(type, attrs = {}) {
      const params = new URLSearchParams({ type, ...attrs });
      return `${baseUrl}/?${params.toString()}`;
    },
    close() {
      return new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}
