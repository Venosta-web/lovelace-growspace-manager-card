import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GrowspaceViewCompact } from '../../../../src/components/views/growspace-view-compact';

// Mock feature flags BEFORE they are imported or used in the component
vi.mock('../../../../src/features/shared/config/feature-flags', () => ({
    FEATURE_FLAGS: {
        USE_NEW_GROWSPACE_GRID: true,
    },
    isFeatureEnabled: vi.fn(() => true),
}));

// Mock other components
vi.mock('../../../../src/features/plants/containers/growspace-grid.container', () => ({
    GrowspaceGridContainer: class extends HTMLElement {
        focusPlant = vi.fn();
    }
}));

describe('GrowspaceViewCompact Coverage (New Grid)', () => {
    let element: GrowspaceViewCompact;

    beforeEach(() => {
        element = new GrowspaceViewCompact();
    });

    it('should use growspace-grid-container when USE_NEW_GROWSPACE_GRID is true', async () => {
        document.body.appendChild(element);
        await element.updateComplete;

        const grid = element.shadowRoot?.querySelector('growspace-grid-container');
        expect(grid).toBeTruthy();

        document.body.removeChild(element);
    });

    it('should handle focusPlant delegation to growspace-grid-container', async () => {
        document.body.appendChild(element);
        await element.updateComplete;

        const grid = element.shadowRoot?.querySelector('growspace-grid-container') as any;
        const focusSpy = vi.fn();
        grid.focusPlant = focusSpy;

        element.focusPlant(42);
        expect(focusSpy).toHaveBeenCalledWith(42);

        document.body.removeChild(element);
    });
});
