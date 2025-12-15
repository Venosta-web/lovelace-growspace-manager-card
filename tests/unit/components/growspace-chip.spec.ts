import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GrowspaceChip } from '../../../src/components/growspace-chip';

describe('GrowspaceChip', () => {
    let element: GrowspaceChip;
    let container: HTMLElement;

    beforeEach(async () => {
        container = document.createElement('div');
        document.body.appendChild(container);
        element = new GrowspaceChip();
        container.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        document.body.removeChild(container);
    });

    it('should be defined', () => {
        expect(element).toBeInstanceOf(GrowspaceChip);
    });

    it('should render label and value', async () => {
        element.label = 'Temp';
        element.value = '25°C';
        await element.updateComplete;

        const chip = element.shadowRoot?.querySelector('.stat-chip');
        expect(chip?.textContent).toContain('Temp: 25°C');
    });

    it('should apply status class', async () => {
        element.status = 'danger';
        await element.updateComplete;

        const chip = element.shadowRoot?.querySelector('.stat-chip');
        expect(chip?.classList.contains('status-danger')).toBe(true);
    });

    it('should apply active attribute styles', async () => {
        element.active = true;
        await element.updateComplete;
        expect(element.hasAttribute('active')).toBe(true);
    });

    it('should show link icon when linked', async () => {
        element.linked = true;
        await element.updateComplete;

        const linkIcon = element.shadowRoot?.querySelector('.link-icon');
        expect(linkIcon).toBeTruthy();
    });

    it('should emit unlink event when link icon clicked', async () => {
        element.linked = true;
        await element.updateComplete;

        const listener = vi.fn();
        element.addEventListener('unlink', listener);

        const linkIcon = element.shadowRoot?.querySelector('.link-icon') as HTMLElement;
        linkIcon.click();

        expect(listener).toHaveBeenCalled();
    });
});
