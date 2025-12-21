
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
        expect((dialog as any).open).toBe(true);

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

        const closeBtn = element.shadowRoot?.querySelector('button');
        expect(closeBtn).toBeTruthy();
        (closeBtn as HTMLElement).click();

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
});
