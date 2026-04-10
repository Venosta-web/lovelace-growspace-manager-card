import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { html } from 'lit';
import { fixture, elementUpdated } from '@open-wc/testing-helpers';
import '../../../../src/components/views/growspace-view-compact';
import { GrowspaceViewCompact } from '../../../../src/components/views/growspace-view-compact';

import { customElement } from 'lit/decorators.js';

// Mock child components
vi.mock('../../../../src/features/plants/containers/growspace-grid.container', () => ({
    GrowspaceGridContainer: class extends HTMLElement { }
}));

@customElement('growspace-grid-container')
class MockGridContainer extends HTMLElement {
    focusPlant(index: number) { }
}

describe('GrowspaceViewCompact', () => {
    let element: GrowspaceViewCompact;
    const mockGrid = [
        [null, null],
        [null, null]
    ];

    beforeEach(async () => {
        element = await fixture(html`
            <growspace-view-compact 
                .grid=${mockGrid} 
                .rows=${2} 
                .cols=${2}
            ></growspace-view-compact>
        `);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should be instantiated', () => {
        expect(element).toBeInstanceOf(GrowspaceViewCompact);
    });

    it('should render compact controls and grid container', async () => {
        const controls = element.shadowRoot?.querySelector('.compact-controls');
        const gridContainer = element.shadowRoot?.querySelector('growspace-grid-container');

        expect(controls).toBeTruthy();
        expect(gridContainer).toBeTruthy();
        expect((gridContainer as any).plants).toEqual(mockGrid);
        expect((gridContainer as any).rows).toBe(2);
        expect((gridContainer as any).cols).toBe(2);
    });

    it('should dispatch view-mode-changed event when exit button is clicked', async () => {
        const exitButton = element.shadowRoot?.querySelector('.compact-exit-fab') as HTMLElement;
        const spy = vi.fn();
        element.addEventListener('view-mode-changed', spy);

        exitButton.click();

        expect(spy).toHaveBeenCalled();
        expect(spy.mock.calls[0][0].detail).toEqual({ mode: 'standard' });
    });

    it('should delegate focusPlant call to grid container', async () => {
        const gridContainer = element.shadowRoot?.querySelector('growspace-grid-container') as any;
        const focusSpy = vi.spyOn(gridContainer, 'focusPlant');

        element.focusPlant(1);

        expect(focusSpy).toHaveBeenCalledWith(1);
    });

    it('should not throw if focusPlant is called but grid container is missing', async () => {
        // Temporarily remove shadowRoot or querySelector mock to simulate missing element
        const querySpy = vi.spyOn(element.shadowRoot!, 'querySelector').mockReturnValue(null);
        
        expect(() => element.focusPlant(1)).not.toThrow();
        
        querySpy.mockRestore();
    });
});
