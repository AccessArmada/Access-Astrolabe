# Access Astrolabe 🧭

> **Debug screen reader behavior directly in Chrome.**

Access Astrolabe is a Chrome extension for debugging accessibility behavior directly in the browser. It captures screen reader announcements, inspects computed accessibility properties, and traces accessible name calculations to help developers understand how assistive technology interprets web content.

Designed for developers, QA engineers, and accessibility specialists, Access Astrolabe helps investigate accessibility issues that are difficult to understand from DOM inspection alone by showing what is announced, why it is announced, and which underlying HTML and ARIA properties contributed to the result.

---

## Why Access Astrolabe?

Browser accessibility tools typically expose DOM attributes and computed properties, but debugging screen reader behavior requires understanding the output generated from those properties.

Access Astrolabe helps bridge that gap by showing:

- what announcement information is exposed to assistive technology
- which attributes contributed to that announcement
- how an accessible name was computed
- how accessibility behavior changes as focus moves through a page

---

## Features

### Screen Reader Announcement Capture & Log

* **Live Announcements**: Captures screen reader-style announcements dynamically as you navigate through a page.
* **Announcement History**: Review recent announcements while debugging focus movement, dynamic updates, and interactive components.
* **Clear History**: Reset your local announcement history with a single click.


### Accessibility Inspector & Accessible Name Trace

* **Accessibility Property Inspector**: View computed accessibility properties including `role`, accessible `name`, `description`, and relevant ARIA states such as `aria-expanded` and `aria-checked`.
* **Accessible Name Trace**: Stepby-step trace showing which DOM attributes and content sources contributed to an element's accessible name, including `aria-labelledby`, `aria-label`, alt text, title attributes, and text content.
* **Right-Click to Inspect**: Quickly inspect any element on the page by right-clicking and opening Access Astrolabe's accessibility inspector for the selected element.

### Keyboard Navigation Testing

* **Screen Reader-Inspired Navigation**: Explore pages using keyboard navigation patterns commonly used when navigating with assistive technology, helping identify issues with focus order, interactive controls, and page structure.
* **Element Navigation**: Move through relevant page elements such as headings, landmarks, links, buttons, and form controls without relying on visual scanning.
* **Focus Tracking**: Monitor the currently focused element and inspect its accessibility properties as focus moves through the page.

### Visualization & Testing Tools


#### Vision Mask

* Applies full-screen dimming and blur simulation.
* Reduces reliance on visual information to help evaluate keyboard navigation and screen reader workflows.
* Helps test whether content structure and interactions remain understandable when visual context is limited.

#### Peek Spotlight (Peek Mode)

* Highlights the currently inspected DOM element by dimming surrounding content with a dynamic CSS mask.
* Uses CSS mask properties (`mask-image: radial-gradient(...)`) to move the spotlight as keyboard focus changes.
* Helps isolate individual components during accessibility debugging.

#### Zoom & Magnification Control

* Dynamically scales the Access Astrolabe side panel UI from **100% to 200%** in 10% increments.
* Includes keyboard-accessible controls for `Zoom In`, `Zoom Out`, and `Reset`.
* Supports magnification testing within the extension interface itself.

---

## Privacy & Data Handling

Because Access Astrolabe is a completely local, client-side browser extension:

* **Local Processing**: Accessibility analysis, DOM inspection, and announcement history processing happen entirely within the browser. This makes Access Astrolabe suitable for use with internal admin consoles, intranet portals, and local development environments.
* **No Remote Transmission**: Access Astrolabe does not collect or transmit page content, session data, or accessibility information to external servers.
* **No Analytics**: The extension does not include tracking pixels, analytics services, or behavior monitoring tools.

---

## Architecture Overview

Access Astrolabe is a Manifest V3 Chrome extension built with modern web extension tooling:

- **Vite** for build tooling
- **Side Panel UI** for the developer interface
- **Content scripts** for page inspection
- **Extension messaging** for communication between extension contexts
- **Vitest/jsdom** for unit and DOM testing
- **Playwright** for browser integration testing

---

## Local Development & Setup

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed.

### 1. Clone & Install Dependencies

From the repository root:

```bash
cd extension

npm install

### 2. Build & Watch

Start Vite's development watcher to automatically build extension files to the `/dist` directory whenever you make changes:

```bash
npm run dev
```

### 3. Load the Unpacked Extension in Chrome

1. Open Chrome's Extensions page (`chrome://extensions/`).
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked**.
4. Select the `dist` directory inside the cloned `extension` repository.
5. The Access Astrolabe extension will now appear in your extensions list. Open any webpage, click the extension icon, and start inspecting.

---

## Running Tests

Access Astrolabe includes unit and browser integration tests.

### Unit & DOM Testing (Vitest)

```bash
npm test
```

Runs unit tests for HTML tracers, announcement parsing, and helper modules using Vitest and jsdom.

### Integration & UI Testing (Playwright)

```bash
npm run test:integration
```

Runs browser automation tests in headless Chrome to verify communication between the side panel and content scripts.

---

## Contributing

Contributions are welcome. For larger changes, please open an issue first to discuss the proposed approach.

When submitting changes:

- include tests for new functionality
- verify the extension builds successfully
- run the existing unit and integration test suites

---

## License

This project is licensed under the **Apache License, Version 2.0**. For the full license text, see the [LICENSE](LICENSE) file.
