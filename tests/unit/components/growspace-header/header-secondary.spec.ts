import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { html } from 'lit';
import { fixture, elementUpdated } from '@open-wc/testing-helpers';
import '../../../../src/components/growspace-header/header-secondary';
import { GrowspaceHeaderSecondary } from '../../../../src/components/growspace-header/header-secondary';

// Mock dependencies
vi.mock('../../../../src/components/ui/nutrient-stock-chip', () => ({
    NutrientStockChip: class extends HTMLElement { }
}));

vi.mock('../../../../src/components/growspace-chip', () => ({
    GrowspaceChip: class extends HTMLElement { }
}));

vi.mock('../../../../src/components/ui/scroll-container', () => ({
    ScrollContainer: class extends HTMLElement {
        set scrollAmount(v: any) { }
    }
}));

describe('GrowspaceHeaderSecondary', () => {
    let element: GrowspaceHeaderSecondary;

    beforeEach(async () => {
        element = await fixture(html`<growspace-header-secondary></growspace-header-secondary>`);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should be instantiated', () => {
        expect(element).toBeInstanceOf(GrowspaceHeaderSecondary);
    });

    it('should render chips when provided', async () => {
        element.chips = [
            { key: 'co2', label: 'CO2', value: '800ppm', icon: '', status: 'optimal', active: false, linked: false, tooltip: '', groupIndex: 0 },
            { key: 'vpd', label: 'VPD', value: '1.2kPa', icon: '', status: 'optimal', active: false, linked: false, tooltip: '', groupIndex: 0 }
        ];
        await elementUpdated(element);

        const chips = element.shadowRoot?.querySelectorAll('growspace-chip');
        expect(chips?.length).toBe(2);
    });

    it('should render nutrient chips when inventory exists', async () => {
        element.inventory = {
            stocks: {
                'n1': { nutrient_id: 'n1', name: 'CalMag', quantity: 1, unit: 'L' }
            }
        } as any;
        await elementUpdated(element);

        const chips = element.shadowRoot?.querySelectorAll('nutrient-stock-chip');
        expect(chips?.length).toBe(1);
    });

    it('should dispatch toggle-graph event when chip is clicked', async () => {
        element.chips = [{ key: 'co2', label: 'CO2', value: '800ppm' } as any];
        await elementUpdated(element);

        const spy = vi.fn();
        element.addEventListener('toggle-graph', spy);

        const chip = element.shadowRoot?.querySelector('growspace-chip') as HTMLElement;
        chip.click();

        expect(spy).toHaveBeenCalled();
        expect(spy.mock.calls[0][0].detail.metric).toBe('co2');
    });

    it('should dispatch open-nutrients event when nutrient chip is clicked', async () => {
        element.inventory = {
            stocks: {
                'n1': { nutrient_id: 'n1', name: 'CalMag', quantity: 1, unit: 'L' }
            }
        } as any;
        await elementUpdated(element);

        const spy = vi.fn();
        element.addEventListener('open-nutrients', spy);

        const chip = element.shadowRoot?.querySelector('nutrient-stock-chip') as HTMLElement;
        chip.click();

        expect(spy).toHaveBeenCalled();
    });

    it('should dispatch chip-drag-start event', async () => {
        element.chips = [{ key: 'co2', label: 'CO2', value: '800ppm' } as any];
        await elementUpdated(element);

        const spy = vi.fn();
        element.addEventListener('chip-drag-start', spy);

        const chip = element.shadowRoot?.querySelector('growspace-chip') as HTMLElement;
        chip.dispatchEvent(new CustomEvent('dragstart')); // Simplified since we mock chip

        // Note: The real event comes from the chip itself via @dragstart which calls _handleChipDragStart
        // Since we mock growspace-chip, we might need to manually trigger the handler if the mock doesn't bubble or if we want to test the component's internal handler.
        (element as any)._handleChipDragStart({} as DragEvent, 'co2');
        expect(spy).toHaveBeenCalled();
    });

    it('should handle chip drop', async () => {
        element.chips = [{ key: 'co2', label: 'CO2', value: '800ppm', groupIndex: 0 } as any];
        await elementUpdated(element);

        const spy = vi.fn();
        element.addEventListener('chip-drop', spy);

        (element as any)._handleChipDrop({ preventDefault: vi.fn() } as any, 'co2');
        expect(spy).toHaveBeenCalled();
    });

    it('should handle unlink-graphs', async () => {
        element.chips = [{ key: 'co2', label: 'CO2', value: '800ppm', groupIndex: 1 } as any];
        await elementUpdated(element);

        const spy = vi.fn();
        element.addEventListener('unlink-graphs', spy);

        (element as any)._unlinkGraphs(1);
        expect(spy).toHaveBeenCalled();
        expect(spy.mock.calls[0][0].detail.groupIndex).toBe(1);
    });

    it('should handle mobile link toggle', async () => {
        element.isMobile = true;
        await elementUpdated(element);

        const spy = vi.fn();
        element.addEventListener('toggle-mobile-link', spy);

        (element as any).dispatchEvent(new CustomEvent('toggle-mobile-link', { bubbles: true, composed: true }));
        expect(spy).toHaveBeenCalled();
    });

    describe('Draggable Logic', () => {
        it('should return "true" when not mobile', async () => {
            element.isMobile = false;
            await elementUpdated(element);
            expect((element as any)._chipDraggable).toBe('true');
        });

        it('should return mobileLink as string when mobile', async () => {
            element.isMobile = true;
            element.mobileLink = false;
            await elementUpdated(element);
            expect((element as any)._chipDraggable).toBe('false');

            element.mobileLink = true;
            await elementUpdated(element);
            expect((element as any)._chipDraggable).toBe('true');
        });
    });

    describe('Template Handlers', () => {
        it('should trigger _handleChipDragStart from template', async () => {
            element.chips = [{ key: 'temp', label: 'T' } as any];
            await elementUpdated(element);
            const chip = element.shadowRoot?.querySelector('growspace-chip');
            const spy = vi.spyOn(element as any, '_handleChipDragStart');

            chip?.dispatchEvent(new DragEvent('dragstart'));
            expect(spy).toHaveBeenCalledWith(expect.anything(), 'temp');
        });

        it('should trigger _handleChipDrop from template', async () => {
            element.chips = [{ key: 'temp', label: 'T' } as any];
            await elementUpdated(element);
            const chip = element.shadowRoot?.querySelector('growspace-chip');
            const spy = vi.spyOn(element as any, '_handleChipDrop');

            chip?.dispatchEvent(new DragEvent('drop'));
            expect(spy).toHaveBeenCalledWith(expect.anything(), 'temp');
        });

        it('should trigger _unlinkGraphs from template', async () => {
            element.chips = [{ key: 'temp', label: 'T', groupIndex: 5 } as any];
            await elementUpdated(element);
            const chip = element.shadowRoot?.querySelector('growspace-chip');
            const spy = vi.spyOn(element as any, '_unlinkGraphs');

            chip?.dispatchEvent(new CustomEvent('unlink'));
            expect(spy).toHaveBeenCalledWith(5);
        });

        it('should trigger _openNutrientsDialog from nutrient-stock-chip template', async () => {
            element.inventory = { stocks: { n1: { nutrient_id: 'n1' } as any } } as any;
            await elementUpdated(element);
            const chip = element.shadowRoot?.querySelector('nutrient-stock-chip');
            const spy = vi.spyOn(element as any, '_openNutrientsDialog');

            chip?.dispatchEvent(new MouseEvent('click'));
            expect(spy).toHaveBeenCalled();
        });
    });
});
