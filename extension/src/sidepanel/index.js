/**
 * sidepanel/index.js
 *
 * Logic for the Access Astrolabe Side Panel.
 */

import { escapeHtml, renderTraceDetails } from './render-helpers.js';

// Override test CSS margins that apply after page load
function removeTestCSSMargins() {
    document.documentElement.style.margin = '0';
    document.body.style.margin = '0';
}
removeTestCSSMargins();
// Re-apply if test CSS injected later
new MutationObserver(() => removeTestCSSMargins()).observe(document.head, { childList: true });

// DOM Elements
const currentAnnouncementEl = document.getElementById('current-text');
const historyListEl = document.getElementById('history-list');
const inspectorContentEl = document.getElementById('inspector-content');
const clearHistoryBtn = document.getElementById('clear-history');

// Toggles
let visionMaskBtn = document.getElementById('vision-mask');
const settingsPeekBtn = document.getElementById('settings-peek');
const compactModeBtn = document.getElementById('compact-mode');
const maskOpacityInput = document.getElementById('mask-opacity');
const opacityValueDisplay = document.getElementById('opacity-value');

// --- Magnification Control State ---
let currentZoom = 100;
const STORAGE_KEY_ZOOM = 'sidepanel-zoom-level';

const zoomOutBtn = document.getElementById('zoom-out');
const zoomInBtn = document.getElementById('zoom-in');
const zoomResetBtn = document.getElementById('zoom-reset');

function applyZoom(level) {
    document.documentElement.style.fontSize = `${level}%`;

    // Remove wrap classes, then add based on zoom threshold
    document.documentElement.classList.remove('zoom-wrap-trace', 'zoom-wrap-inspector', 'zoom-stack-header');
    if (level >= 140) {
        document.documentElement.classList.add('zoom-wrap-trace');
        document.documentElement.classList.add('zoom-stack-header');
    }
    if (level >= 150) document.documentElement.classList.add('zoom-wrap-inspector');

    updateZoomUI(level);
}

function updateZoomUI(level) {
    if (!zoomResetBtn) return;
    zoomResetBtn.textContent = `${level}%`;
    zoomResetBtn.setAttribute('aria-label', `Current zoom ${level}%. Reset to 100%`);

    if (zoomOutBtn) {
        zoomOutBtn.disabled = level <= 100;
        zoomOutBtn.setAttribute('aria-disabled', level <= 100);
    }

    if (zoomInBtn) {
        zoomInBtn.disabled = level >= 200;
        zoomInBtn.setAttribute('aria-disabled', level >= 200);
    }

    const zoomAnnouncer = document.getElementById('zoom-announcer');
    if (zoomAnnouncer) {
        zoomAnnouncer.textContent = `Zoom level ${level}%`;
    }
}

function saveAndApplyZoom(level) {
    chrome.storage.local.set({ [STORAGE_KEY_ZOOM]: level });
    applyZoom(level);
}

if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
        if (currentZoom > 100) {
            currentZoom -= 10;
            saveAndApplyZoom(currentZoom);
        }
    });

    zoomInBtn.addEventListener('click', () => {
        if (currentZoom < 200) {
            currentZoom += 10;
            saveAndApplyZoom(currentZoom);
        }
    });

    zoomResetBtn.addEventListener('click', () => {
        currentZoom = 100;
        saveAndApplyZoom(currentZoom);
    });
}

// Restore zoom on load
chrome.storage.local.get([STORAGE_KEY_ZOOM], (result) => {
    if (result[STORAGE_KEY_ZOOM]) {
        currentZoom = parseInt(result[STORAGE_KEY_ZOOM], 10);
        applyZoom(currentZoom);
    }
});

// Query current focused element on sidepanel load
function queryCurrentFocus() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;

        // Try immediately, then retry a few times with exponential backoff
        const attempt = (retriesLeft) => {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_CURRENT_FOCUS' }, (response) => {
                if (chrome.runtime.lastError) {
                    if (retriesLeft > 0) {
                        setTimeout(() => attempt(retriesLeft - 1), 200 * (3 - retriesLeft));
                    }
                    return;
                }

                if (response?.success && response.data) {
                    updateInspector(response.data);
                    updateAnnouncement(response.data.announcement || 'No accessible information');
                } else {
                    currentAnnouncementEl.textContent = 'No element focused. Press Tab or click an element on the page to inspect.';
                }
            });
        };

        attempt(3);
    });
}

// Inject content scripts into the active tab if not already present
function ensureContentScriptsInjected() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) {
            console.debug('No active tab found');
            return;
        }

        const tabId = tabs[0].id;
        const url = tabs[0].url;

        console.debug('Attempting script injection on tab', tabId, 'URL:', url);

        // Don't inject on special pages
        if (!url || url.startsWith('chrome://') || url.startsWith('about:')) {
            console.debug('Skipping injection - special page');
            return;
        }

        // Check if content script is already present by sending a ping
        chrome.tabs.sendMessage(tabId, { type: 'PING' }, (response) => {
            if (chrome.runtime.lastError) {
                // Expected: no content script listening yet on this tab.
                // Reading lastError here (rather than ignoring it) is what
                // prevents Chrome from logging an "Unchecked runtime.lastError"
                // warning for this normal, anticipated case.
            }

            if (response?.pong) {
                console.debug('Content script already present');
                return; // Already injected
            }

            console.debug('Content script not found, injecting...');

            // Inject ariaNotify-interceptor first (runs in MAIN world)
            chrome.scripting.executeScript({
                target: { tabId },
                files: ['content/ariaNotify-interceptor.js'],
                world: 'MAIN',
                injectImmediately: true
            }).then(() => {
                console.debug('Injected ariaNotify-interceptor');
                // Then inject main content script
                return chrome.scripting.executeScript({
                    target: { tabId },
                    files: ['content/index.js'],
                    injectImmediately: false
                });
            }).then(() => {
                console.debug('Injected content/index.js - retry queryCurrentFocus');
                // Retry the focus query now that scripts are injected
                queryCurrentFocus();
            }).catch((err) => {
                console.error('Script injection failed:', err?.message);
            });
        });
    });
}

// Inject scripts on sidepanel load
ensureContentScriptsInjected();

// Query on load
queryCurrentFocus();

// Also listen for focus changes via the message listener (which still works via FOCUS_CHANGE)

// Initialize State
let history = [];

// Testing Coach State
let auditState = {
    active: false,
    totalHeadings: 0,
    reviewedCount: 0,
    passes: 0,
    fails: 0
};

// Coach DOM Elements
const coachInitial = document.getElementById('coach-initial');
const coachActive = document.getElementById('coach-active');
const coachSummary = document.getElementById('coach-summary');
const coachInstruction = document.getElementById('coach-instruction');
const startAuditBtn = document.getElementById('start-audit');
const coachPassBtn = document.getElementById('coach-pass');
const coachFailBtn = document.getElementById('coach-fail');
const restartAuditBtn = document.getElementById('restart-audit');
const progressText = document.getElementById('test-progress-text');
const progressFill = document.getElementById('progress-fill');
const summaryStats = document.getElementById('summary-stats');

let lastFocusedSummary = '';

// Listen for messages from Content Scripts or Background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.type === 'FOCUS_CHANGE') {
        const { name, role, description, announcement, id, tagName } = message.data;
        const currentSummary = `${tagName}|${id || ''}|${name}`;

        updateAnnouncement(announcement);

        try {
            updateInspector(message.data);
        } catch (err) {
            console.error("Side Panel: Failed to update UI:", err);
        }

        addToHistory(announcement);

        if (currentSummary !== lastFocusedSummary) {
            updateLiveAnnouncement('');
            lastFocusedSummary = currentSummary;
        }

        // Update Audit Coach if active
        if (auditState.active && (role === 'heading' || /^H[1-6]$/.test(tagName))) {
            updateAuditForHeading(name);
        }

    } else if (message.type === 'LIVE_ANNOUNCEMENT') {

        updateLiveAnnouncement(message.announcement);
        addLiveRegionToHistory(message);
    } else if (message.type === 'ARIA_NOTIFY_ANNOUNCEMENT') {

        updateLiveAnnouncement(`ariaNotify: ${message.payload.message}`);
        addAriaNotifyToHistory(message.payload);
    } else if (message.type === 'MODE_CHANGE') {
        updateModeBadge(message.mode);
    }
});


/**
 * Updates the Polite Live Region
 */
function updateAnnouncement(announcementStr) {
    currentAnnouncementEl.textContent = announcementStr || 'No accessible information';
}

function updateLiveAnnouncement(announcementStr) {
    const liveUpdateEl = document.getElementById('live-update');
    if (liveUpdateEl) {
        liveUpdateEl.textContent = announcementStr ? `Live Update: ${announcementStr}` : '';
        liveUpdateEl.style.display = announcementStr ? 'block' : 'none';
    }
}

/**
 * Announces internal extension feedback to screen readers only
 */
/**
 * Updates the Mode Badge
 */
function updateModeBadge(mode) {
    const status = document.getElementById('mode-status');
    if (!status) return;

    if (mode === 'table') {
        status.textContent = 'Mode: Table';
        status.classList.add('table-mode');
    } else {
        status.textContent = 'Mode: Navigation';
        status.classList.remove('table-mode');
    }
}


/**
 * Updates the Inspector Pane with raw attributes and trace
 */
function updateInspector(data) {
    const traceHtml = (data.trace && data.trace.length > 0) ? `
        <div class="accordion-item" id="accordion-trace">
            <h2 class="accordion-heading">
                <button class="accordion-header" aria-expanded="true" aria-controls="content-trace">
                    <span class="accordion-title">Accessible Name Trace</span>
                    <span class="accordion-icon">▶</span>
                </button>
            </h2>
            <div id="content-trace" class="accordion-content">
                <ul class="trace-list">
                    ${data.trace.map((t, i) => `
                        <li class="trace-item trace-item-${t.type} ${t.ignored ? 'ignored' : ''}" data-step-index="${i}" data-attribute="${t.attribute || ''}">
                            <span class="trace-step-number">${i + 1}.</span>
                            <div class="trace-content">
                                <div class="trace-header">
                                    <dl class="trace-header-dl">
                                        <dt class="trace-step-label">${escapeHtml(t.step)}</dt>
                                        <dd class="trace-step-value">${escapeHtml(t.value)}</dd>
                                    </dl>
                                    ${t.attribute ? `
                                        <button class="btn-toggle-trace" aria-label="Toggle ${escapeHtml(t.step)} rule" title="Toggle this rule">
                                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                <circle cx="12" cy="12" r="3"></circle>
                                                ${t.ignored ? '<line x1="1" y1="1" x2="23" y2="23" stroke="#FF4444"></line>' : ''}
                                            </svg>
                                        </button>
                                    ` : ''}
                                </div>
                                ${t.details ? renderTraceDetails(t.details) : (t.snippet ? `<pre class="code-snippet"><code>${escapeHtml(t.snippet)}</code></pre>` : '')}
                            </div>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
    ` : '';


    const suggestionsHtml = renderSuggestions(data.suggestions);

    inspectorContentEl.innerHTML = `
        ${suggestionsHtml}
        <div class="accordion-item" id="accordion-properties">
            <h2 class="accordion-heading">
                <button class="accordion-header" aria-expanded="true" aria-controls="content-properties">
                    <span class="accordion-title">Inspector</span>
                    <span class="accordion-icon">▶</span>
                </button>
            </h2>
            <div id="content-properties" class="accordion-content">
                <div class="trace-group-compact">
                    <span class="visually-hidden">Code sample:</span>
                    <pre class="code-snippet" style="margin-top: 0;"><code>${escapeHtml(data.htmlSnippet || `<${data.tagName.toLowerCase()}>`)}</code></pre>
                </div>
                <div class="trace-group-compact">
                    <dl class="attribute-list">
                        <dt>Role</dt>
                        <dd><strong>${escapeHtml(data.role ?? '(none)')}</strong></dd>
                        <dt>Name</dt>
                        <dd>${escapeHtml(data.name)}</dd>
                        <dt>Description</dt>
                        <dd>${escapeHtml(data.description || '(none)')}</dd>
                        <dt>Value</dt>
                        <dd>${escapeHtml(data.valueSummary || '(none)')}</dd>
                        <dt>State</dt>
                        <dd>${escapeHtml(data.statesSummary || '(none)')}</dd>
                        <dt>Context</dt>
                        <dd>${escapeHtml(data.context || '(none)')}</dd>
                        ${data.inputType ? `<dt>Input Type</dt><dd>${escapeHtml(data.inputType)}</dd>` : ''}
                    </dl>
                </div>
            </div>
        </div>
        ${traceHtml}
    `;

    // Smart suggestion expansion: Collapse by default, expand on critical issues
    const suggestionsBtn = document.getElementById('suggestions-toggle-btn');
    const suggestionsList = document.getElementById('suggestions-list-container');
    const suggestionsIcon = suggestionsBtn?.querySelector('.accordion-icon');

    if (suggestionsBtn && suggestionsList) {
        const hasCritical = data.suggestions && data.suggestions.some(s => s.category === 'critical');

        if (hasCritical) {
            suggestionsBtn.setAttribute('aria-expanded', 'true');
            suggestionsList.classList.remove('hidden');
            suggestionsList.removeAttribute('hidden');
            if (suggestionsIcon) suggestionsIcon.style.transform = 'rotate(90deg)';

            // Announcement skipped: sidepanel live regions aren't monitored by screen readers while user is on the main page
        } else {
            suggestionsBtn.setAttribute('aria-expanded', 'false');
            suggestionsList.classList.add('hidden');
            suggestionsList.setAttribute('hidden', '');
            if (suggestionsIcon) suggestionsIcon.style.transform = 'rotate(0deg)';
        }
    }
}

/**
 * Renders the suggestions panel html
 */
function renderSuggestions(suggestions = []) {
  if (!suggestions || suggestions.length === 0) {
    return '';
  }

  const critical = suggestions.filter(s => s.category === 'critical');
  const bestPractice = suggestions.filter(s => s.category === 'best-practice');
  const content = suggestions.filter(s => s.category === 'content');

  const badgeHtml = [
    critical.length ? `<span class="suggestions-badge suggestions-badge--critical">${critical.length} critical</span>` : '',
    bestPractice.length ? `<span class="suggestions-badge suggestions-badge--info">${bestPractice.length} tips</span>` : '',
    content.length ? `<span class="suggestions-badge suggestions-badge--content">${content.length} content</span>` : '',
  ].filter(Boolean).join('');

  const itemsHtml = suggestions.map(s => {
    const sourceLink = s.url
      ? ` <span class="suggestion-source">(<a href="${s.url}" target="_blank" rel="noopener noreferrer">Source: ${escapeHtml(s.urlTitle || 'Reference')}</a>)</span>`
      : '';
    return `
    <li class="suggestion-item suggestion-item--${s.category}">
      <span class="suggestion-icon">${s.icon}</span>
      <span class="suggestion-message">${escapeHtml(s.message)}${sourceLink}</span>
    </li>`;
  }).join('');

  return `
    <div class="accordion-item" id="accordion-suggestions">
      <h2 class="accordion-heading">
        <button type="button" class="accordion-header" id="suggestions-toggle-btn" aria-expanded="false" aria-controls="suggestions-list-container">
          <span style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="accordion-title">Suggestions</span>
          </span>
          <span class="suggestions-badges">${badgeHtml}</span>
          <span class="accordion-icon">▶</span>
        </button>
      </h2>
      <div id="suggestions-list-container" class="accordion-content hidden" hidden>
        <ul class="suggestions-list">${itemsHtml}</ul>
      </div>
    </div>`;
}



/**
 * Adds a focus-change announcement to the history log
 */
function addToHistory(announcementStr) {
    if (history.length > 0 && history[0].type === 'focus' && history[0].text === announcementStr) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    history.unshift({ type: 'focus', time, text: announcementStr });
    if (history.length > 50) history.pop();
    renderHistory();
}

/**
 * Adds a live region announcement to the history log
 */
function addLiveRegionToHistory(message) {
    const politeness = message.politeness ||
        (message.announcement?.startsWith('Alert: ') ? 'assertive' : 'polite');
    const text = message.text ||
        (message.announcement?.replace(/^(Alert|Live): /, '') ?? '');
    if (!text) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    history.unshift({ type: 'liveRegion', time, text, politeness, badge: `[${politeness}]` });
    if (history.length > 50) history.pop();
    renderHistory();
}

/**
 * Adds an ariaNotify announcement to the history log
 */
function addAriaNotifyToHistory(payload) {
    if (!payload?.message) return;
    // Dedup: sidepanel may receive the same event from the content script directly
    // and again relayed through the background service worker
    if (history.length > 0 && history[0].type === 'ariaNotify' && history[0].timestamp === payload.timestamp) return;
    const time = new Date(payload.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    history.unshift({ type: 'ariaNotify', time, text: payload.message, priority: payload.priority, source: payload.source, timestamp: payload.timestamp });
    if (history.length > 50) history.pop();
    renderHistory();
}

/**
 * Renders the history list
 */
function renderHistory() {
    historyListEl.innerHTML = history.map(item => {
        if (item.type === 'liveRegion') {
            return `
        <li class="history-item history-item--announcement" aria-label="${escapeHtml(item.time)}: ${escapeHtml(item.badge)}: ${escapeHtml(item.text)}">
            <div class="history-entry-badge">${escapeHtml(item.badge)}</div>
            <div class="history-entry-text">${escapeHtml(item.text)}</div>
            <div class="history-entry-secondary">
                <span>aria-live</span>
                <time>${escapeHtml(item.time)}</time>
            </div>
        </li>`;
        }
        if (item.type === 'ariaNotify') {
            const badge = `[ariaNotify · priority: ${item.priority}]`;
            return `
        <li class="history-item history-item--announcement" aria-label="${escapeHtml(item.time)}: ariaNotify priority: ${escapeHtml(item.priority)}: ${escapeHtml(item.text)}">
            <div class="history-entry-badge">${escapeHtml(badge)}</div>
            <div class="history-entry-text">${escapeHtml(item.text)}</div>
            <div class="history-entry-secondary">
                <span>source: ${escapeHtml(item.source)}</span>
                <time>${escapeHtml(item.time)}</time>
            </div>
        </li>`;
        }
        return `
        <li class="history-item" aria-label="${escapeHtml(item.time)}: ${escapeHtml(item.text)}">
            <time class="history-time">${escapeHtml(item.time)}</time>
            <span class="history-text">${escapeHtml(item.text)}</span>
        </li>`;
    }).join('');
}

// --- Heading Audit Logic ---

function startAudit() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;
        chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_HEADINGS_SUMMARY' }, (response) => {
            if (response && response.count > 0) {
                auditState = {
                    active: true,
                    totalHeadings: response.count,
                    reviewedCount: 0,
                    passes: 0,
                    fails: 0
                };

                coachInitial.classList.add('hidden');
                coachActive.classList.remove('hidden');
                coachSummary.classList.add('hidden');



                if (response.currentFocusIsHeading) {
                    // We are already on a heading
                    updateAuditStep();
                } else {
                    coachInstruction.textContent = "Press Alt+Shift+H to find the first heading.";
                    updateProgressBar();
                }
            } else {

            }
        });
    });
}

function updateAuditForHeading(headingName) {
    coachInstruction.innerHTML = `<strong>Current Heading:</strong> "${escapeHtml(headingName)}"<br><br>Is this heading descriptive of its section?`;
    coachPassBtn.disabled = false;
    coachFailBtn.disabled = false;
}

function recordAuditResult(passed) {
    if (passed) auditState.passes++;
    else auditState.fails++;

    auditState.reviewedCount++;

    if (auditState.reviewedCount >= auditState.totalHeadings) {
        showAuditSummary();
    } else {
        updateAuditStep();
    }
}

function updateAuditStep() {
    coachInstruction.textContent = "Press Alt+Shift+H for the next heading.";
    coachPassBtn.disabled = true;
    coachFailBtn.disabled = true;
    updateProgressBar();
}

function updateProgressBar() {
    const percent = Math.round((auditState.reviewedCount / auditState.totalHeadings) * 100);
    const progressBar = document.querySelector('.progress-bar');

    if (progressBar) {
        progressBar.setAttribute('aria-valuenow', percent);
    }

    progressFill.style.width = `${percent}%`;
    progressText.textContent = `Heading ${auditState.reviewedCount} of ${auditState.totalHeadings}`;
}

function showAuditSummary() {
    auditState.active = false;
    coachActive.classList.add('hidden');
    coachSummary.classList.remove('hidden');

    summaryStats.innerHTML = `
        <div class="stat-item"><span class="stat-label">Total Headings:</span> <span>${auditState.totalHeadings}</span></div>
        <div class="stat-item"><span class="stat-label">Descriptive:</span> <span style="color: var(--accent-green)">${auditState.passes}</span></div>
        <div class="stat-item"><span class="stat-label">Unclear/Bad:</span> <span style="color: var(--accent-red)">${auditState.fails}</span></div>
    `;


}

function resetCoach() {
    coachSummary.classList.add('hidden');
    coachInitial.classList.remove('hidden');
}

// --- Event Listeners ---

// --- Event Listeners ---
if (startAuditBtn) startAuditBtn.addEventListener('click', startAudit);
if (coachPassBtn) coachPassBtn.addEventListener('click', () => recordAuditResult(true));
if (coachFailBtn) coachFailBtn.addEventListener('click', () => recordAuditResult(false));
if (restartAuditBtn) restartAuditBtn.addEventListener('click', resetCoach);

// Help Button
const helpBtn = document.getElementById('btn-help');
const settingsBtn = document.getElementById('btn-settings');
const backBtns = document.querySelectorAll('.btn-back');

const mainContainer = document.getElementById('app-container');
const viewInspector = document.getElementById('view-inspector');
const viewCoach = document.getElementById('view-coach');
const viewSettings = document.getElementById('view-settings');
const viewHelp = document.getElementById('view-help');

function showView(viewId) {
    // Define all view elements
    const views = {
        inspector: [viewInspector],
        coach: [viewCoach],
        settings: [viewSettings],
        help: [viewHelp]
    };

    // Hide all view-specific sections
    Object.values(views).flat().forEach(el => {
        if (el) el.classList.add('hidden');
    });

    // Update Toolbar Active State
    document.querySelectorAll('.toolbar-item').forEach(item => item.classList.remove('active'));

    if (viewId === 'inspector') {
        viewInspector.classList.remove('hidden');
        const btn = document.getElementById('btn-show-inspector');
        if (btn) btn.classList.add('active');
        const heading = document.getElementById('announcement-heading');
        if (heading) heading.focus();
    } else if (viewId === 'coach') {
        viewCoach.classList.remove('hidden');
        const btn = document.getElementById('btn-show-coach');
        if (btn) btn.classList.add('active');
    } else {
        const targetView = document.getElementById(`view-${viewId}`);
        if (targetView) targetView.classList.remove('hidden');

        const btn = document.getElementById(`btn-${viewId}`);
        if (btn) btn.classList.add('active');

        const backBtn = targetView && targetView.querySelector('.btn-back');
        if (backBtn) backBtn.focus();
    }

    // Always hide zoom popover when switching views
    document.getElementById('zoom-popover').classList.add('hidden');
}

const showInspectorBtn = document.getElementById('btn-show-inspector');
const showCoachBtn = document.getElementById('btn-show-coach');

if (showInspectorBtn) {
    showInspectorBtn.addEventListener('click', () => showView('inspector'));
}
if (showCoachBtn) {
    showCoachBtn.addEventListener('click', () => showView('coach'));
}

const zoomPopoverBtn = document.getElementById('btn-zoom-popover');
const zoomPopover = document.getElementById('zoom-popover');

if (zoomPopoverBtn) {
    zoomPopoverBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = zoomPopover.classList.contains('hidden');
        zoomPopover.classList.toggle('hidden');
        zoomPopoverBtn.setAttribute('aria-expanded', isHidden);
        if (isHidden) {
            requestAnimationFrame(() => {
                const firstBtn = zoomPopover.querySelector('button:not(:disabled)');
                if (firstBtn) firstBtn.focus();
            });
        }
    });
}

// Close zoom popover when clicking outside
document.addEventListener('click', (e) => {
    if (zoomPopover && !zoomPopover.contains(e.target) && !zoomPopoverBtn.contains(e.target)) {
        zoomPopover.classList.add('hidden');
        zoomPopoverBtn.setAttribute('aria-expanded', 'false');
    }
});

if (helpBtn) helpBtn.addEventListener('click', () => showView('help'));
if (settingsBtn) settingsBtn.addEventListener('click', () => showView('settings'));
if (backBtns) backBtns.forEach(btn => btn.addEventListener('click', () => showView('inspector')));

// Mask Opacity Logic
maskOpacityInput.addEventListener('input', (e) => {
    const percent = parseInt(e.target.value, 10);
    const opacity = percent / 100;
    opacityValueDisplay.textContent = `${percent}%`;
    maskOpacityInput.setAttribute('aria-valuenow', percent);
    maskOpacityInput.setAttribute('aria-valuetext', `${percent}%`);
    chrome.storage.sync.set({ 'mask-opacity': opacity });

    // Notify content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'UPDATE_MASK_OPACITY', opacity }).catch(() => {});
        }
    });
});

// Initial Restore for Opacity
chrome.storage.sync.get(['mask-opacity'], (result) => {
    if (result['mask-opacity'] !== undefined) {
        const percent = Math.round(result['mask-opacity'] * 100);
        maskOpacityInput.value = percent;
        maskOpacityInput.setAttribute('aria-valuenow', percent);
        maskOpacityInput.setAttribute('aria-valuetext', `${percent}%`);
        opacityValueDisplay.textContent = `${percent}%`;
    }
});


// Clear History Event
clearHistoryBtn.addEventListener('click', () => {
    history = [];
    renderHistory();
});

// Toggle Event Listeners (Sync to Storage)
[visionMaskBtn, settingsPeekBtn, compactModeBtn].forEach(btn => {
    if (!btn) return;
    btn.addEventListener('change', (e) => {
        const { id, checked } = e.target;
        const labelText = e.target.parentElement.querySelector('span').textContent;
        const status = checked ? 'Enabled' : 'Disabled';

        console.log(`Toggle ${id}: ${checked}`);

        // Peek is matched to storage key 'peek-active-item'
        if (id === 'settings-peek') {
            chrome.storage.sync.set({ 'peek-active-item': checked });
            if (checked && visionMaskBtn && !visionMaskBtn.checked) {
                visionMaskBtn.checked = true;
                chrome.storage.sync.set({ 'vision-mask': true });
            }
        } else if (id === 'compact-mode') {
            chrome.storage.sync.set({ 'compact-mode': checked });
            document.body.classList.toggle('compact-mode', checked);
        } else if (id === 'vision-mask') {
            chrome.storage.sync.set({ [id]: checked });
            if (!checked && settingsPeekBtn && settingsPeekBtn.checked) {
                settingsPeekBtn.checked = false;
                chrome.storage.sync.set({ 'peek-active-item': false });
            }
        } else {
            chrome.storage.sync.set({ [id]: checked });
        }



    });
});

// Restore settings from storage
chrome.storage.sync.get(['vision-mask', 'peek-active-item'], (result) => {
    if (result['vision-mask']) {
        visionMaskBtn.checked = true;
    }

    if (result['peek-active-item'] && settingsPeekBtn) {
        settingsPeekBtn.checked = true;
    }

    if (result['compact-mode']) {
        const compactModeBtn = document.getElementById('compact-mode');
        if (compactModeBtn) compactModeBtn.checked = true;
        document.body.classList.add('compact-mode');
    }
});


// Handle Escape key to restore focus back to the page
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { type: 'RESTORE_FOCUS' }).catch(() => {});
            }
        });
    }
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes['vision-mask']) {
        if (visionMaskBtn) visionMaskBtn.checked = changes['vision-mask'].newValue;
    }
});

// --- Interaction Logic ---

function sendMessageToActiveTab(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;
        chrome.tabs.sendMessage(tabs[0].id, message).catch(() => {});
    });
}

// Event Delegation for Inspector (Hover Highlighting and Toggles)
inspectorContentEl.addEventListener('mouseover', (e) => {
    const detailItem = e.target.closest('.trace-detail-item');
    if (detailItem && detailItem.dataset.id) {
        sendMessageToActiveTab({ type: 'HIGHLIGHT_ELEMENT_BY_ID', id: detailItem.dataset.id });
        return;
    }

    // If hovering over a main trace item that has a snippet, highlight the main element
    const traceItem = e.target.closest('.trace-item');
    if (traceItem) {
        sendMessageToActiveTab({ type: 'HIGHLIGHT_MAIN_ELEMENT' });
    }
});

// Global Click Handler for Accordions and Toggles
document.getElementById('app-container').addEventListener('click', (e) => {
    // Handle trace toggle buttons
    const toggleBtn = e.target.closest('.btn-toggle-trace');
    if (toggleBtn) {
        const traceItem = toggleBtn.closest('.trace-item');
        const attribute = traceItem.dataset.attribute;
        if (attribute) {
            sendMessageToActiveTab({ type: 'TOGGLE_ATTRIBUTE', attribute });
        }
        return;
    }

    // Handle accordion toggles
    const accordionHeader = e.target.closest('.accordion-header');
    if (accordionHeader) {
        const isExpanded = accordionHeader.getAttribute('aria-expanded') === 'true';
        const controlId = accordionHeader.getAttribute('aria-controls');
        const content = document.getElementById(controlId);

        accordionHeader.setAttribute('aria-expanded', !isExpanded);
        if (content) {
            content.classList.toggle('hidden', isExpanded);
            content.hidden = isExpanded;
        }
        return;
    }

    // Handle clear history specifically (prevent propagation if needed,
    // though it's inside content now, not header)
    const clearBtn = e.target.closest('#clear-history');
    if (clearBtn) {
        history = [];
        renderHistory();
        return;
    }
});

inspectorContentEl.addEventListener('mouseout', (e) => {
    sendMessageToActiveTab({ type: 'CLEAR_HIGHLIGHT' });
});


// Platform detection for shortcuts
chrome.runtime.getPlatformInfo((info) => {
    if (info.os === 'mac') {
        document.querySelectorAll('kbd').forEach(el => {
            if (el.textContent === 'Alt') el.textContent = 'Option';
        });
    }
});

console.log('Side Panel Script Initialized');
