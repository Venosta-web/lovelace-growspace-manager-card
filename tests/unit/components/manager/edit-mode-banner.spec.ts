import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EditModeBanner } from '../../../../src/components/manager/edit-mode-banner';
import { mdiClose, mdiSelectAll, mdiSelectOff } from '@mdi/js';

describe('GrowspaceEditModeBanner', () => {
    let element: EditModeBanner;

    beforeEach(() => {
        element = new EditModeBanner();
    });

    it('should be defined', () => {
        expect(customElements.get('growspace-edit-mode-banner')).toBeDefined();
    });

    it('should render correct selection count', async () => {
        element.selectedCount = 5;
        document.body.appendChild(element);
        await element.updateComplete;

        const count = element.shadowRoot?.querySelector('span')?.textContent;
        expect(count).toContain('5 plant(s) selected');

        document.body.removeChild(element);
    });

    it('should dispach select-all event', async () => {
        document.body.appendChild(element);
        await element.updateComplete;

        const listener = vi.fn();
        element.addEventListener('select-all', listener);

        const buttons = element.shadowRoot?.querySelectorAll('button');
        const btn = Array.from(buttons || []).find(b => b.textContent?.includes('Select All'));
        (btn as HTMLElement)?.click();

        expect(listener).toHaveBeenCalled();

        document.body.removeChild(element);
    });

    it('should dispach clear-selection event', async () => {
        document.body.appendChild(element);
        await element.updateComplete;

        const listener = vi.fn();
        element.addEventListener('clear-selection', listener);

        const buttons = element.shadowRoot?.querySelectorAll('button');
        const btn = Array.from(buttons || []).find(b => b.textContent?.includes('Clear'));
        (btn as HTMLElement)?.click();

        expect(listener).toHaveBeenCalled();

        document.body.removeChild(element);
    });

    it('should dispach exit-edit-mode event', async () => {
        document.body.appendChild(element);
        await element.updateComplete;

        const listener = vi.fn();
        element.addEventListener('exit-edit-mode', listener);

        const buttons = element.shadowRoot?.querySelectorAll('button');
        const btn = Array.from(buttons || []).find(b => b.textContent?.includes('Exit'));
        (btn as HTMLElement)?.click();

        expect(listener).toHaveBeenCalled();

        document.body.removeChild(element);
    });
});
