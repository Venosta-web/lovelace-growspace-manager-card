
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LogbookDialog } from '../../../src/dialogs/logbook-dialog';
import '../../../src/dialogs/logbook-dialog';

// Mock dependencies
vi.mock('../../../src/components/ui/growspace-logbook', () => ({
    GrowspaceLogbook: class extends HTMLElement {
        hass: any;
        growspaceId: any;
    }
}));

// Mock ha-dialog if not already defined
if (!customElements.get('ha-dialog')) {
    class HaDialogMock extends HTMLElement {
        open = false;
        heading = false;
        hideActions = false;
    }
    customElements.define('ha-dialog', HaDialogMock);
}

describe('LogbookDialog', () => {
    let element: LogbookDialog;

    beforeEach(async () => {
        element = new LogbookDialog();
        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        if (element && element.isConnected) {
            document.body.removeChild(element);
        }
    });

    it('should render nothing when closed', async () => {
        element.open = false;
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('ha-dialog')).toBeNull();
    });

    it('should render dialog content when open', async () => {
        element.open = true;
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('ha-dialog');
        expect(dialog).toBeTruthy();
        // Check if property binding works (requires casting or checking attribute)
        expect(dialog?.hasAttribute('open')).toBe(true);

        const logbook = element.shadowRoot?.querySelector('growspace-logbook');
        expect(logbook).toBeTruthy();
    });

    it('should propagate properties to growspace-logbook', async () => {
        const mockHass = { states: {} } as any;
        element.hass = mockHass;
        element.growspaceId = 'test-growspace';
        element.open = true;
        await element.updateComplete;

        const logbook = element.shadowRoot?.querySelector('growspace-logbook') as any;
        expect(logbook.hass).toBe(mockHass);
        expect(logbook.growspaceId).toBe('test-growspace');
    });

    it('should dispatch close event when close button is clicked', async () => {
        element.open = true;
        await element.updateComplete;

        const closeSpy = vi.fn();
        element.addEventListener('close', closeSpy);

        const closeBtn = element.shadowRoot?.querySelector('button.md3-button') as HTMLButtonElement;
        expect(closeBtn).toBeTruthy();
        closeBtn.click();

        expect(closeSpy).toHaveBeenCalled();
    });

    it('should dispatch close event when ha-dialog fires closed event', async () => {
        element.open = true;
        await element.updateComplete;

        const closeSpy = vi.fn();
        element.addEventListener('close', closeSpy);

        const dialog = element.shadowRoot?.querySelector('ha-dialog');
        dialog?.dispatchEvent(new CustomEvent('closed'));

        expect(closeSpy).toHaveBeenCalled();
    });
    describe('Tab Switching', () => {
        beforeEach(async () => {
            element.open = true;
            await element.updateComplete;
        });

        it('should switch to timeline view when timeline tab is clicked', async () => {
            const tabs = element.shadowRoot?.querySelectorAll('.tab');
            const timelineTab = Array.from(tabs || []).find(t => t.textContent?.includes('Timeline'));
            expect(timelineTab).toBeTruthy();

            (timelineTab as HTMLElement).click();
            await element.updateComplete;

            expect((element as any)._activeTab).toBe('timeline');
            expect(timelineTab?.classList.contains('active')).toBe(true);
        });

        it('should switch to VPD view when VPD tab is clicked', async () => {
            const tabs = element.shadowRoot?.querySelectorAll('.tab');
            const vpdTab = Array.from(tabs || []).find(t => t.textContent?.includes('VPD'));
            expect(vpdTab).toBeTruthy();

            (vpdTab as HTMLElement).click();
            await element.updateComplete;

            expect((element as any)._activeTab).toBe('vpd');
            expect(vpdTab?.classList.contains('active')).toBe(true);
        });

        it('should switch back to list view', async () => {
            // First switch to timeline
            (element as any)._activeTab = 'timeline';
            await element.updateComplete;

            const tabs = element.shadowRoot?.querySelectorAll('.tab');
            const listTab = Array.from(tabs || []).find(t => t.textContent?.includes('List View'));
            expect(listTab).toBeTruthy();

            (listTab as HTMLElement).click();
            await element.updateComplete;

            expect((element as any)._activeTab).toBe('list');
            expect(listTab?.classList.contains('active')).toBe(true);
        });
    });
});
