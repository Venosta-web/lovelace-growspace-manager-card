
import { describe, it, expect, beforeEach } from 'vitest';
import { html, fixture, elementUpdated } from '@open-wc/testing-helpers';
import '../../../../src/features/shared/ui/nutrient-stock-chip';
import { NutrientStockChip } from '../../../../src/features/shared/ui/nutrient-stock-chip';

describe('NutrientStockChip', () => {
    let element: NutrientStockChip;

    const mockStock = {
        nutrient_id: 'n1',
        name: 'Grow A',
        current_ml: 800,
        initial_ml: 1000,
        last_updated: new Date().toISOString()
    };

    beforeEach(async () => {
        element = await fixture(html`<nutrient-stock-chip .stock=${mockStock}></nutrient-stock-chip>`);
    });

    it('renders correctly with default properties', () => {
        expect(element).to.exist;
        expect(element.compact).to.be.false;
    });

    it('renders nothing when stock is undefined', async () => {
        element = await fixture(html`<nutrient-stock-chip></nutrient-stock-chip>`);
        // We expect mostly empty shadow root, or at least no chip
        const chip = element.shadowRoot?.querySelector('growspace-chip');
        expect(chip).to.be.null;
    });

    it('calculates optimal status correctly', async () => {
        // 80% full -> optimal
        const chip = element.shadowRoot?.querySelector('growspace-chip') as any;
        expect(chip).to.exist;
        expect(chip.status).to.equal('optimal');
        expect(chip.value).to.equal('800ml (80%)');
    });

    it('calculates warning status correctly', async () => {
        element.stock = { ...mockStock, current_ml: 400 }; // 40%
        await elementUpdated(element);
        const chip = element.shadowRoot?.querySelector('growspace-chip') as any;
        expect(chip.status).to.equal('warning');
    });

    it('calculates danger status correctly', async () => {
        element.stock = { ...mockStock, current_ml: 100 }; // 10%
        await elementUpdated(element);
        const chip = element.shadowRoot?.querySelector('growspace-chip') as any;
        expect(chip.status).to.equal('danger');
    });

    it('handles compact mode correctly', async () => {
        element.compact = true;
        await elementUpdated(element);
        const chip = element.shadowRoot?.querySelector('growspace-chip') as any;
        expect(chip.value).to.equal('80%');
        // Label should be undefined or empty string in compact mode logic
        // The implementation uses .label=${this.compact ? undefined : name}
        expect(chip.label).to.be.undefined;
    });

    it('handles zero initial_ml correctly', async () => {
        element.stock = { ...mockStock, initial_ml: 0, current_ml: 0 };
        await elementUpdated(element);
        const chip = element.shadowRoot?.querySelector('growspace-chip') as any;
        expect(chip.value).to.equal('0ml (0%)');
        expect(chip.status).to.equal('danger'); // 0 ratio <= 0.2
    });

    it('generates correct tooltip', () => {
        const chip = element.shadowRoot?.querySelector('growspace-chip') as any;
        expect(chip.tooltip).to.contain('Capacity: 1000ml');
        expect(chip.tooltip).to.contain('Last Updated:');
    });
});
