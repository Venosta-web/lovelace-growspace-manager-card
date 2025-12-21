import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrowspaceViewSwitcher } from '../../../src/components/growspace-view-switcher';
import { GrowspaceDevice } from '../../../src/types';

// Mock child components to avoid deep rendering issues in unit tests
vi.mock('../../../src/components/views/growspace-view-standard', () => ({
    GrowspaceViewStandard: class extends HTMLElement { }
}));
vi.mock('../../../src/components/views/growspace-view-compact', () => ({
    GrowspaceViewCompact: class extends HTMLElement { }
}));
vi.mock('../../../src/components/views/growspace-view-header', () => ({
    GrowspaceViewHeader: class extends HTMLElement { }
}));

describe('GrowspaceViewSwitcher', () => {
    let element: GrowspaceViewSwitcher;

    beforeEach(() => {
        element = new GrowspaceViewSwitcher();
        // Default mock device
        element.device = {
            device_id: 'd1',
            plants_per_row: 4
        } as unknown as GrowspaceDevice;
    });

    it('should be defined', () => {
        expect(customElements.get('growspace-view-switcher')).toBeDefined();
    });

    it('renders standard view by default', async () => {
        element.viewMode = 'standard';
        document.body.appendChild(element);
        await element.updateComplete;

        const standard = element.shadowRoot?.querySelector('growspace-view-standard');
        expect(standard).toBeTruthy();
        const compact = element.shadowRoot?.querySelector('growspace-view-compact');
        expect(compact).toBeFalsy();

        document.body.removeChild(element);
    });

    it('renders compact view when mode is compact', async () => {
        element.viewMode = 'compact';
        document.body.appendChild(element);
        await element.updateComplete;

        const compact = element.shadowRoot?.querySelector('growspace-view-compact');
        expect(compact).toBeTruthy();

        document.body.removeChild(element);
    });

    it('delegates focusPlant to the child view', async () => {
        element.viewMode = 'standard';
        document.body.appendChild(element);
        await element.updateComplete;

        const childMock = element.shadowRoot?.querySelector('growspace-view-standard') as any;
        childMock.focusPlant = vi.fn();

        element.focusPlant(2);
        expect(childMock.focusPlant).toHaveBeenCalledWith(2);

        document.body.removeChild(element);
    });

    it('renders header view when mode is header', async () => {
        element.viewMode = 'header';
        document.body.appendChild(element);
        await element.updateComplete;

        const header = element.shadowRoot?.querySelector('growspace-view-header');
        expect(header).toBeTruthy();

        document.body.removeChild(element);
    });

    it('renders nothing if device is undefined', async () => {
        element.device = undefined;
        document.body.appendChild(element);
        await element.updateComplete;

        // Lit renders comments for empty templates. Check that NO element nodes exist.
        // We verify that innerHTML contains Lit's comment marker or is empty-ish, but relying on exact string is fragile.
        // Instead, check that querySelector('*') returns null (no element children).
        const anyTag = element.shadowRoot?.querySelector('*');
        expect(anyTag).toBeNull();

        document.body.removeChild(element);
    });

    it('handles focusPlant safely if active view does not implementation method', async () => {
        element.viewMode = 'header'; // header view mock doesn't have focusPlant mocked above
        document.body.appendChild(element);
        await element.updateComplete;

        // Should not throw
        element.focusPlant(1);

        document.body.removeChild(element);
    });

    it('passes properties to standard view', async () => {
        element.viewMode = 'standard';
        element.isLoading = true;
        element.rows = 5;
        element.selectedCount = 3;

        document.body.appendChild(element);
        await element.updateComplete;

        const view = element.shadowRoot?.querySelector('growspace-view-standard') as any;
        expect(view.isLoading).toBe(true);
        expect(view.rows).toBe(5);
        expect(view.selectedCount).toBe(3);
        expect(view.cols).toBe(4); // from device mock

        document.body.removeChild(element);
    });

});
