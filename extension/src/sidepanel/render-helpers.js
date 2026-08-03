/**
 * Escapes HTML characters for safe rendering
 */
export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Renders nested details for aria-labelledby trace steps
 */
export function renderTraceDetails(details) {
    if (!details || details.length === 0) return '';

    if (details[0].labelType !== undefined) {
        return `
            <dl class="trace-details-dl">
                ${details.map(d => `
                    <div class="trace-detail-item-dl">
                        <dt class="detail-label-type">${escapeHtml(d.labelType)}</dt>
                        <dd class="detail-value">"${escapeHtml(d.value)}"</dd>
                    </div>
                `).join('')}
            </dl>
        `;
    }

    if (details[0].nodeType !== undefined) {
        return `
            <dl class="trace-details-dl">
                ${details.map(d => {
                    const itemClass = [
                        'trace-detail-item-dl',
                        d.overridden ? 'overridden' : '',
                        d.excluded ? 'excluded' : ''
                    ].filter(Boolean).join(' ');
                    const ddClass = [
                        'detail-value',
                        d.overridden ? 'detail-value-overridden' : '',
                        d.excluded ? 'detail-value-excluded' : ''
                    ].filter(Boolean).join(' ');
                    const badge = d.excluded ? `<span class="trace-excluded-badge">[aria-hidden]</span>` : '';
                    return `
                    <div class="${itemClass}">
                        <dt class="detail-label-type">${escapeHtml(d.nodeType)}</dt>
                        <dd class="${ddClass}">"${escapeHtml(d.value)}"${badge}</dd>
                    </div>`;
                }).join('')}
            </dl>
        `;
    }

    return `
        <dl class="trace-details-dl">
            ${details.map(d => `
                <div class="trace-detail-item-dl ${d.found ? '' : 'missing'}" ${d.found ? `data-id="${d.id}"` : ''}>
                    <dt class="detail-id">#${d.id}</dt>
                    ${d.found ? `<dd class="detail-value">"${escapeHtml(d.computedValue)}"</dd>` : '<dd class="detail-error">(Not found)</dd>'}
                    ${d.found ? `
                        <div class="detail-snippet">
                            <pre class="code-snippet"><code>${escapeHtml(d.snippet)}</code></pre>
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </dl>
    `;
}
