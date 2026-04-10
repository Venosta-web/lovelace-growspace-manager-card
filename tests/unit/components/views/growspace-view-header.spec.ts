import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { html } from 'lit';
import { fixture, elementUpdated } from '@open-wc/testing-helpers';
import '../../../../src/components/views/growspace-view-header';
import { GrowspaceViewHeader } from '../../../../src/components/views/growspace-view-header';

// Mock child components
vi.mock('../../../../src/features/ui/containers/growspace-header.container', () => ({
    GrowspaceHeader: class extends HTMLElement { }
}));

describe('GrowspaceViewHeader', () => {
    let element: GrowspaceViewHeader;
    const mockDevice = {
        deviceId: 'gs1',
        name: 'Growspace 1',
    } as any;

    beforeEach(async () => {
        element = await fixture(html`
            <growspace-view-header .device=${mockDevice}></growspace-view-header>
        `);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should be instantiated', () => {
        expect(element).toBeInstanceOf(GrowspaceViewHeader);
    });

    it('should NOT render content if device is missing', async () => {
        element.device = undefined;
        await elementUpdated(element);
        expect(element.shadowRoot?.querySelector('.view-mode-container')).toBeNull();
    });

    it('should render growspace-header and expand handle when device is present', async () => {
        const header = element.shadowRoot?.querySelector('growspace-header');
        const expandHandle = element.shadowRoot?.querySelector('.expand-handle');

        expect(header).toBeTruthy();
        expect(expandHandle).toBeTruthy();
        expect((header as any).device).toEqual(mockDevice);
    });

    it('should dispatch toggle-expansion event when expand handle is clicked', async () => {
        const expandHandle = element.shadowRoot?.querySelector('.expand-handle') as HTMLElement;
        const spy = vi.fn();
        element.addEventListener('toggle-expansion', spy);

        expandHandle.click();

        expect(spy).toHaveBeenCalled();
        expect(spy.mock.calls[0][0].bubbles).toBe(true);
        expect(spy.mock.calls[0][0].composed).toBe(true);
    });

    it('should redispatch growspace-changed event from header', async () => {
        const header = element.shadowRoot?.querySelector('growspace-header');
        const spy = vi.fn();
        element.addEventListener('growspace-changed', spy);

        const detail = 'gs2';
        header?.dispatchEvent(new CustomEvent('growspace-changed', {
            detail,
            bubbles: true,
            composed: true
        }));

        expect(spy).toHaveBeenCalled();
        expect(spy.mock.calls[0][0].detail).toBe(detail);
    });

    it('should use fallback value in _redispatch if detail is missing', async () => {
        // Access private method for testing fallback logic if needed, 
        // but it's better to trigger it via event if possible.
        // In growspace-view-header.ts: detail: e.detail || (e.target as HTMLSelectElement).value
        
        const header = element.shadowRoot?.querySelector('growspace-header');
        const spy = vi.fn();
        element.addEventListener('growspace-changed', spy);

        // Simulate an event from a target that has a .value (like a select)
        const mockEvent = new CustomEvent('growspace-changed', {
            bubbles: true,
            composed: true
        });
        Object.defineProperty(mockEvent, 'target', { value: { value: 'gs-fallback' }, enumerable: true });
        
        header?.dispatchEvent(mockEvent);

        expect(spy).toHaveBeenCalled();
        expect(spy.mock.calls[0][0].detail).toBe('gs-fallback');
    });
});
