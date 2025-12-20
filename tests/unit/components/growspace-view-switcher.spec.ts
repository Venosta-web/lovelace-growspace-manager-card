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
});
