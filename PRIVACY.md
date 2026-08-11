# Access Astrolabe — Privacy Policy Addendum

**Last Updated:** May 28, 2026

Access Armada ("we," "us," or "our") is dedicated to protecting your privacy. This Privacy Policy Addendum outlines our data handling practices for the **Access Astrolabe** Chrome browser extension (the "Extension"). This document serves as our official privacy disclosure, which is also hosted on [accessarmada.com](https://accessarmada.com).

---

## 🛡️ Our Core Philosophy: Absolute Zero-Tracking

Access Astrolabe is engineered from the ground up to guarantee total privacy and confidentiality. **We do not collect, store, track, transmit, sell, or share any of your personal, sensitive, or browsing data.**

All computations, accessibility tree calculations, and visual simulator logs occur 100% locally within your browser sandbox.

---

## 📂 Data and Transmission Disclosures

### 1. No Server-Side Infrastructure
The Extension has no back-end servers, no databases, and no remote endpoints. It does not communicate with Access Armada or any third-party infrastructure.

### 2. No Analytics or Telemetry
We do not use any analytics frameworks (such as Google Analytics, Mixpanel, or Amplitude), tracking pixels, error tracking platforms (such as Sentry), or session recorders.

### 3. Local-Only Storage
Any states, preferences, or logs managed by the Extension are kept entirely inside Chrome's secure storage systems:
* **Settings & Preferences**: Toggles (like compact mode, Peek Mode activation, and Vision Mask status) and opacity percentages are persisted locally using Chrome's native `chrome.storage.sync` API. If you have Chrome Sync enabled, these preferences are synchronized across your own devices by Google, in accordance with your Google Account settings.
* **Inspect History**: The temporary screen reader announcement history (limited to 50 entries) is stored in the browser's temporary storage (`chrome.storage.local`) and never leaves your local profile. You can clear this log at any time by clicking the "Clear History" button in the Extension UI.
* **No Focused Element Caching**: Access Astrolabe does not cache or persist the currently focused element or its accessibility data. When you open the side panel, it queries the active tab for the current focused element in real-time. All subsequent focus changes and live region announcements are transmitted as they occur, without being stored locally.

### 4. Page Content and DOM Inspection
To analyze and display screen reader output and calculate the **Accessible Name Trace**, the Extension reads the structural DOM attributes of pages you visit.
* **Scope**: This analysis is completely passive and executes entirely within the active browser tab's content script sandbox.
* **Security**: No page content, HTML snippets, text readouts, URLs, cookie data, or authentication headers are ever saved to disk or transmitted to any server.

---

## 🔑 Permissions and Justification

When you install Access Astrolabe, Chrome requires authorization for several technical permissions. Below is the plain-English justification for why each is necessary:

| Permission | Technical Name | Purpose and Justification |
| :--- | :--- | :--- |
| **Read and change all your data on the websites you visit** | `<all_urls>` / Content Scripts | Necessary to inject light-weight scripts to listen for focus events and inspect accessibility tree structures (such as `aria-label`, headings, and roles) so the simulator can output screen reader text. |
| **Show as a side panel** | `sidePanel` | Allows the Extension to render its main user interface natively on the side of your browser, preventing layout disruption to the page under audit. |
| **Inject scripts** | `scripting` | Allows the Extension to inject its content script into already-loaded pages so you can inspect them without reloading. Used when you open the side panel on a page that was loaded before the extension was enabled. |
| **Store settings** | `storage` | Saves your custom visual preferences, zoom scale, and settings toggles so they persist between browser sessions. |
| **Add context menus** | `contextMenus` | Provides quick right-click shortcuts to open the inspector or trigger structural audits. |

---

## 🏢 Local Security and Data Privacy

Because Access Astrolabe is a completely local, client-side browser extension:
* **Local Processing**: Safe to use on internal admin consoles, intranet portals, and local development environments.
* **No Remote Transmission**: Because data is never collected or sent over the network, using Access Astrolabe will not transmit page content or session data off your device.

---

## ✉️ Contact and Feedback

If you have any questions, concerns, or feedback regarding Access Astrolabe or this Privacy Policy, please reach out to us at:

* **Website**: [accessarmada.com/astrolabe](https://accessarmada.com/astrolabe)
* **Email**: astrolabe@accessarmada.com
