import { describe, it, expect } from 'vitest';
import { renderTraceDetails } from './render-helpers.js';

describe('renderTraceDetails', () => {
    it('returns a dl structure with dt/dd for labelType detail items', () => {
        const details = [{ labelType: 'aria-label', value: 'Submit' }];
        const html = renderTraceDetails(details);
        expect(html).toContain('<dl class="trace-details-dl">');
        expect(html).toContain('<dt class="detail-label-type">aria-label</dt>');
        expect(html).toContain('<dd class="detail-value">"Submit"</dd>');
    });

    it('returns a dl structure with dt/dd for nodeType detail items', () => {
        const details = [{ nodeType: 'text node', value: 'Hello', overridden: false }];
        const html = renderTraceDetails(details);
        expect(html).toContain('<dl class="trace-details-dl">');
        expect(html).toContain('<dt class="detail-label-type">text node</dt>');
        expect(html).toContain('<dd class="detail-value">"Hello"</dd>');
    });

    it('returns a dl structure with dt/dd for id-reference detail items', () => {
        const details = [{ id: 'label1', found: true, computedValue: 'Submit', snippet: '<span id="label1">Submit</span>' }];
        const html = renderTraceDetails(details);
        expect(html).toContain('<dl class="trace-details-dl">');
        expect(html).toContain('<dt class="detail-id">#label1</dt>');
        expect(html).toContain('<dd class="detail-value">"Submit"</dd>');
    });

    it('returns a dl structure with dt/dd for missing id-reference detail items', () => {
        const details = [{ id: 'label1', found: false }];
        const html = renderTraceDetails(details);
        expect(html).toContain('<dl class="trace-details-dl">');
        expect(html).toContain('<dt class="detail-id">#label1</dt>');
        expect(html).toContain('<dd class="detail-error">(Not found)</dd>');
    });

    it('returns empty string for empty details', () => {
        expect(renderTraceDetails([])).toBe('');
        expect(renderTraceDetails(null)).toBe('');
    });
});
