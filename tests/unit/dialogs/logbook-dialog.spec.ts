
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LogbookDialog } from '../../../src/dialogs/logbook-dialog';
import '../../../src/dialogs/logbook-dialog';

// Mock dependencies
vi.mock('../../../src/features/shared/ui/growspace-logbook', () => ({
    GrowspaceLogbook: class extends HTMLElement {
        hass: any;
        growspaceId: any;
    }
}));

const { mockAddGrowspaceNote } = vi.hoisted(() => ({
    mockAddGrowspaceNote: vi.fn(),
}));

vi.mock('../../../src/slices/logbook', () => ({
    addGrowspaceNote: mockAddGrowspaceNote,
    fetchGrowspaceEvents: vi.fn().mockResolvedValue([]),
    fetchPlantEvents: vi.fn().mockResolvedValue([]),
    addPlantNote: vi.fn(),
    deleteEvent: vi.fn(),
    growspaceEvents$: { get: vi.fn(() => []), set: vi.fn(), subscribe: vi.fn() },
    plantEvents$: { get: vi.fn(() => []), set: vi.fn(), subscribe: vi.fn() },
    setGrowspaceEvents: vi.fn(),
    setPlantEvents: vi.fn(),
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

// Mock quick-note-input if not already defined
if (!customElements.get('quick-note-input')) {
    class QuickNoteInputMock extends HTMLElement {
        setSaving = vi.fn();
        clear = vi.fn();
    }
    customElements.define('quick-note-input', QuickNoteInputMock);
}

describe('LogbookDialog', () => {
    let element: LogbookDialog;

    beforeEach(async () => {
        vi.clearAllMocks();

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
        expect(element.shadowRoot?.querySelector('gs-dialog')).toBeNull();
    });

    it('should render dialog content when open', async () => {
        element.open = true;
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('gs-dialog');
        expect(dialog).toBeTruthy();
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

        const gsDialog = element.shadowRoot?.querySelector('gs-dialog');
        const closeBtn = (gsDialog as any)?.shadowRoot?.querySelector('button.dialog-close-btn') as HTMLButtonElement;
        expect(closeBtn).toBeTruthy();
        closeBtn.click();

        expect(closeSpy).toHaveBeenCalled();
    });

    it('should dispatch close event when gs-dialog emits close event', async () => {
        element.open = true;
        await element.updateComplete;

        const closeSpy = vi.fn();
        element.addEventListener('close', closeSpy);

        const gsDialog = element.shadowRoot?.querySelector('gs-dialog');
        gsDialog?.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));

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

        it('should switch back to list view', async () => {
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

    describe('Note Submission', () => {
        beforeEach(async () => {
            vi.useFakeTimers();
            element.open = true;
            element.growspaceId = 'test-growspace';
            await element.updateComplete;
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should handle successful note submission', async () => {
            const noteInput = element.shadowRoot?.querySelector('quick-note-input') as any;
            expect(noteInput).toBeTruthy();

            const setSavingSpy = vi.spyOn(noteInput, 'setSaving');
            const clearSpy = vi.spyOn(noteInput, 'clear');

            const refreshSpy = vi.fn();
            element.addEventListener('growspace-refresh', refreshSpy);

            const submitEvent = new CustomEvent('submit', {
                detail: {
                    text: 'Test note',
                    images: ['image1.jpg']
                }
            });

            mockAddGrowspaceNote.mockResolvedValue(undefined);

            noteInput.dispatchEvent(submitEvent);

            expect(setSavingSpy).toHaveBeenCalledWith(true);
            expect(mockAddGrowspaceNote).toHaveBeenCalledWith('test-growspace', {
                notes: 'Test note',
                images: ['image1.jpg']
            });

            // Wait for the async operations
            await vi.runAllTimersAsync();

            expect(clearSpy).toHaveBeenCalled();
            expect(refreshSpy).toHaveBeenCalled();
        });

        it('should handle error during note submission', async () => {
            const noteInput = element.shadowRoot?.querySelector('quick-note-input') as any;
            expect(noteInput).toBeTruthy();

            const setSavingSpy = vi.spyOn(noteInput, 'setSaving');

            const submitEvent = new CustomEvent('submit', {
                detail: {
                    text: 'Test note',
                    images: []
                }
            });

            const error = new Error('Service error');
            mockAddGrowspaceNote.mockRejectedValue(error);
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            noteInput.dispatchEvent(submitEvent);

            // Wait for the async operations
            await vi.runAllTimersAsync();

            expect(consoleSpy).toHaveBeenCalledWith('Error adding growspace note:', error);
            expect(setSavingSpy).toHaveBeenCalledWith(false);

            consoleSpy.mockRestore();
        });


        it('should return early if quick-note-input is not found', async () => {
            // This is a bit contrived since it's hard to make it not found if it's in the template,
            // but we can mock shadowRoot.querySelector to return null once.
            const querySpy = vi.spyOn(element.shadowRoot!, 'querySelector').mockReturnValue(null);

            const submitEvent = new CustomEvent('submit', {
                detail: { text: 'test' }
            });

            await (element as any)._handleNoteSubmit(submitEvent);

            expect(mockAddGrowspaceNote).not.toHaveBeenCalled();

            querySpy.mockRestore();
        });
    });
});

