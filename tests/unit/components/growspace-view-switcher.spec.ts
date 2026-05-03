
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { GrowspaceViewSwitcher } from '../../../src/features/shared/layouts/growspace-view-switcher';
import { GrowspaceDevice } from '../../../src/types';

// Mock child components to avoid deep rendering issues in unit tests
vi.mock('../../../src/features/shared/layouts/growspace-view-standard', () => ({
    GrowspaceViewStandard: class extends HTMLElement { }
}));
vi.mock('../../../src/features/shared/layouts/growspace-view-compact', () => ({
    GrowspaceViewCompact: class extends HTMLElement { }
}));
vi.mock('../../../src/features/shared/layouts/growspace-view-header', () => ({
    GrowspaceViewHeader: class extends HTMLElement { }
}));

describe('GrowspaceViewSwitcher', () => {
    let element: GrowspaceViewSwitcher;
    let mockDevice: GrowspaceDevice;

    beforeEach(async () => {
        mockDevice = {
            deviceId: 'd1',
            plantsPerRow: 4
        } as unknown as GrowspaceDevice;

        element = await fixture(html`
            <growspace-view-switcher .device=${mockDevice}></growspace-view-switcher>
        `);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should be defined', () => {
        expect(customElements.get('growspace-view-switcher')).toBeDefined();
        // Force usage of the class to prevent tree cleaning of the import
        expect(element).toBeInstanceOf(GrowspaceViewSwitcher);
    });

    it('renders standard view by default', async () => {
        element.viewMode = 'standard';
        await element.updateComplete;

        const standard = element.shadowRoot?.querySelector('growspace-view-standard');
        expect(standard).toBeTruthy();
        const compact = element.shadowRoot?.querySelector('growspace-view-compact');
        expect(compact).toBeFalsy();
    });

    it('renders compact view when mode is compact', async () => {
        element.viewMode = 'compact';
        await element.updateComplete;

        const compact = element.shadowRoot?.querySelector('growspace-view-compact');
        expect(compact).toBeTruthy();
    });

    it('delegates focusPlant to the child view', async () => {
        element.viewMode = 'standard';
        await element.updateComplete;

        const childMock = element.shadowRoot?.querySelector('growspace-view-standard') as any;
        childMock.focusPlant = vi.fn();

        element.focusPlant(2);
        expect(childMock.focusPlant).toHaveBeenCalledWith(2);
    });

    it('renders header view when mode is header', async () => {
        element.viewMode = 'header';
        await element.updateComplete;

        const header = element.shadowRoot?.querySelector('growspace-view-header');
        expect(header).toBeTruthy();
    });

    it('renders nothing if device is undefined', async () => {
        element = await fixture(html`<growspace-view-switcher></growspace-view-switcher>`); // No device property

        await element.updateComplete;

        // Lit renders comments for empty templates. Check that NO element nodes exist.
        const anyTag = element.shadowRoot?.querySelector('*');
        expect(anyTag).toBeNull();
    });

    it('handles focusPlant safely if active view does not implementation method', async () => {
        element.viewMode = 'header'; // header view mock doesn't have focusPlant mocked above
        await element.updateComplete;

        // Should not throw
        element.focusPlant(1);
    });

    it('passes properties to standard view', async () => {
        // Re-create with properties, or just update them
        element.viewMode = 'standard';
        element.isLoading = true;
        element.rows = 5;
        element.selectedCount = 3;

        await element.updateComplete;

        const view = element.shadowRoot?.querySelector('growspace-view-standard') as any;
        expect(view.isLoading).toBe(true);
        expect(view.rows).toBe(5);
        expect(view.selectedCount).toBe(3);
        expect(view.cols).toBe(4); // from device mock
    });

    it('triggers focusPlant when focusedPlantIndex changes', async () => {
        element.viewMode = 'standard';
        await element.updateComplete;

        const childMock = element.shadowRoot?.querySelector('growspace-view-standard') as any;
        childMock.focusPlant = vi.fn();

        // Update focusedPlantIndex
        element.focusedPlantIndex = 3;
        await element.updateComplete;

        expect(childMock.focusPlant).toHaveBeenCalledWith(3);
    });

    it('propagates batch-add-plants event from standard view', async () => {
        element.viewMode = 'standard';
        await element.updateComplete;

        const view = element.shadowRoot?.querySelector('growspace-view-standard');
        expect(view).toBeTruthy();

        const listener = vi.fn();
        element.addEventListener('batch-add-plants', listener);

        const eventDetail = { quantity: 5, strain: 'Test' };
        view?.dispatchEvent(new CustomEvent('batch-add-plants', {
            detail: eventDetail,
            bubbles: false,
            composed: false
        }));

        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener.mock.calls[0][0].detail).toEqual(eventDetail);
    });
});
