import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { html } from 'lit';
import { fixture, elementUpdated } from '@open-wc/testing-helpers';
import '../../../../src/components/growspace-header/header-stages';
import { GrowspaceHeaderStages } from '../../../../src/components/growspace-header/header-stages';

vi.mock('../../../../src/components/ui/scroll-container', () => ({
    ScrollContainer: class extends HTMLElement { }
}));

describe('GrowspaceHeaderStages', () => {
    let element: GrowspaceHeaderStages;

    beforeEach(async () => {
        element = await fixture(html`<growspace-header-stages></growspace-header-stages>`);
    });

    it('should be instantiated', () => {
        expect(element).toBeInstanceOf(GrowspaceHeaderStages);
    });

    it('should render nothing if no dominant stage', async () => {
        element.dominant = undefined;
        await elementUpdated(element);
        expect(element.shadowRoot?.children.length).toBe(0);
    });

    it('should render stages when dominant info is provided', async () => {
        element.dominant = {
            icon: 'mdi:leaf',
            daysLabel: '15 Days Veg',
            weeksLabel: '2 Weeks Veg'
        };
        await elementUpdated(element);
        const strip = element.shadowRoot?.querySelector('.stages-wrapper');
        expect(strip).toBeTruthy();
    });
});
