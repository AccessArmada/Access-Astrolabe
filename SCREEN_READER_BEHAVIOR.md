# Screen Reader Behavior

This document explains how Access Astrolabe behaves when used alongside assistive technologies, the browser architecture it relies on, and the design decisions behind its behavior.

## Accessibility of the Extension UI

The Access Astrolabe extension interface is designed to meet WCAG 2.2 Level AA requirements.

- All interactive controls are keyboard operable.
- Interactive elements expose appropriate roles, names, states, and properties.
- The interface is intended to work effectively with modern desktop screen readers.

If you encounter an accessibility issue within the extension itself, please open an issue.

---

## Using Access Astrolabe with a Screen Reader

Access Astrolabe is designed to complement screen reader testing, including for developers and accessibility professionals who use screen readers themselves.

### Keyboard Navigation

Navigation shortcuts use:

- **Windows/Linux:** `Alt + key`
- **macOS:** `Option + key`

Examples include:

- `Alt + H` — Next heading
- `Alt + G` — Next graphic

These shortcuts are intentionally chosen to avoid conflicts with common screen reader browse mode commands, which typically use unmodified letter keys, as well as standard NVDA and JAWS modifier combinations.

---

## Browser Context Separation

Chrome extension side panels operate in a separate browsing context from the page being inspected.

This browser architecture has several practical consequences.

### Live Announcements

When screen reader focus is in the web page, the side panel is not monitored for accessibility updates.

Likewise, when focus is in the side panel, the web page is not monitored.

As a result, Access Astrolabe cannot announce changes occurring in one context while your screen reader is focused in the other.

This is a browser limitation rather than an implementation limitation of Access Astrolabe.

---

### Recommended Workflow

For screen reader users, the recommended workflow is:

1. Navigate the web page using your screen reader as normal.
2. Switch focus to the Access Astrolabe side panel.
3. Review:
   - current announcement
   - accessibility properties
   - accessible name traces
   - suggestions and detected issues

This approach allows the extension to complement(without interfering with) normal screen reader usage.

---

### Mode Changes

Some extension state changes occur within the side panel while keyboard interaction continues in the page.

For example, entering **Table Mode** changes keyboard behavior immediately, but that state change cannot be announced to a screen reader focused in the page because the side panel and page are separate browsing contexts.

Press `Escape` to leave Table Mode and return to standard navigation.

---

### Critical Issue Notifications

When Access Astrolabe detects critical accessibility issues, the Suggestions panel expands automatically and displays a visual indicator.

If focus remains in the web page, this visual change cannot be announced by the screen reader until focus returns to the side panel.

---

## Behavioral Model

Access Astrolabe models accessibility behavior using information exposed by the browser's accessibility tree.

It is a debugging and inspection tool, not a screen reader, and does not invoke native assistive technology APIs such as:

- IAccessible2
- Microsoft UI Automation
- macOS Accessibility API

Where browser behavior is consistent across assistive technologies, Access Astrolabe follows the browser's computed accessibility information.

Where screen readers diverge, Access Astrolabe generally follows NVDA and JAWS conventions, which represent the most common desktop testing baseline.

---

## Placeholder Fallback

When an input has no associated label, Access Astrolabe uses placeholder text as the computed accessible name, matching the behavior of NVDA, JAWS, and VoiceOver.

Because placeholder text should not be relied upon as a label, this condition is also reported as an accessibility issue within the Suggestions panel.

---

## Validation with Real Assistive Technology

Access Astrolabe is intended to help explain accessibility behavior and accelerate debugging.

It does not replace testing with real assistive technologies.

For accessibility validation and conformance testing, always verify behavior using the assistive technologies appropriate for your users, such as:

- NVDA
- JAWS
- VoiceOver
- TalkBack