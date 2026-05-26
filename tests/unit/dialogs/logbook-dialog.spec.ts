
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

    describe('Report Tab', () => {
        let mockReportActions: { fetch: any; export: any };
        let mockStore: any;

        beforeEach(async () => {
            mockReportActions = {
                fetch: vi.fn(),
                export: vi.fn(),
            };
            mockStore = {
                actions: {
                    report: mockReportActions
                }
            };
            element.store = mockStore as any;
            element.growspaceId = 'test-growspace';
            element.open = true;
            await element.updateComplete;
        });

        it('should fetch report data when report tab is selected', async () => {
            const mockReportData = {
                summary: { plant_count: 5, strains: ['Amnesia Haze', 'Super Lemon Haze'] },
                environment: { temperature_avg: 24.5, humidity_avg: 60.2, vpd_avg: 1.15 },
                harvest: { total_wet_weight: 500, total_dry_weight: 120, total_trim_weight: 50 }
            };
            mockReportActions.fetch.mockResolvedValue(mockReportData);

            const tabs = element.shadowRoot ? Array.from(element.shadowRoot.querySelectorAll('.tab')) : [];
            const reportTab = tabs.find(t => t.textContent?.includes('Report'));
            expect(reportTab).toBeTruthy();

            (reportTab as HTMLElement).click();
            
            // Check loading state is rendered
            await element.updateComplete;
            const loadingState = element.shadowRoot?.querySelector('.loading-state');
            expect(loadingState).toBeTruthy();
            expect(loadingState?.textContent).toContain('Generating report data...');

            // Wait for fetch to complete
            await new Promise(resolve => setTimeout(resolve, 0));
            await element.updateComplete;

            expect(mockReportActions.fetch).toHaveBeenCalledWith('test-growspace');
            expect((element as any)._reportData).toEqual(mockReportData);

            // Check rendered data
            const summarySection = element.shadowRoot?.querySelector('.summary-section');
            expect(summarySection).toBeTruthy();
            expect(summarySection?.textContent).toContain('Overview');
            expect(summarySection?.textContent).toContain('Total Plants');
            expect(summarySection?.textContent).toContain('5');
            expect(summarySection?.textContent).toContain('Amnesia Haze');

            const envValue = element.shadowRoot ? Array.from(element.shadowRoot.querySelectorAll('.stat-value')) : [];
            const values = envValue.map(v => v.textContent);
            expect(values).toContain('24.5°C');
            expect(values).toContain('60.2%');
            expect(values).toContain('1.15 kPa');

            const harvestSection = element.shadowRoot?.querySelector('.report-container');
            expect(harvestSection?.textContent).toContain('Harvest Metrics');
            expect(harvestSection?.textContent).toContain('500g');
            expect(harvestSection?.textContent).toContain('120g');
            expect(harvestSection?.textContent).toContain('50g');
        });

        it('should show error state and allow retry when fetching fails', async () => {
            mockReportActions.fetch.mockRejectedValue(new Error('Network Error'));

            // Click Report tab
            const tabs = element.shadowRoot ? Array.from(element.shadowRoot.querySelectorAll('.tab')) : [];
            const reportTab = tabs.find(t => t.textContent?.includes('Report'));
            expect(reportTab).toBeTruthy();
            (reportTab as HTMLElement).click();

            await new Promise(resolve => setTimeout(resolve, 0));
            await element.updateComplete;

            expect((element as any)._error).toBe('Network Error');
            const alert = element.shadowRoot?.querySelector('ha-alert');
            expect(alert).toBeTruthy();
            expect(alert?.textContent).toContain('Network Error');

            const retryBtn = element.shadowRoot?.querySelector('button.primary');
            expect(retryBtn).toBeTruthy();
            expect(retryBtn?.textContent).toContain('Retry');

            // Set up successful resolve for retry
            const mockReportData = {
                summary: { plant_count: 3, strains: [] },
                environment: {},
                harvest: {}
            };
            mockReportActions.fetch.mockResolvedValue(mockReportData);

            (retryBtn as HTMLElement).click();
            await element.updateComplete;

            await new Promise(resolve => setTimeout(resolve, 0));
            await element.updateComplete;

            expect(mockReportActions.fetch).toHaveBeenCalledTimes(2);
            expect((element as any)._error).toBeNull();
            expect((element as any)._reportData).toEqual(mockReportData);
        });

        it('should handle export actions', async () => {
            const mockReportData = {
                summary: { plant_count: 3, strains: [] },
                environment: {},
                harvest: {}
            };
            mockReportActions.fetch.mockResolvedValue(mockReportData);

            // Open report tab
            (element as any)._activeTab = 'report';
            await element.updateComplete;
            await new Promise(resolve => setTimeout(resolve, 0));
            await element.updateComplete;

            const buttons = element.shadowRoot ? Array.from(element.shadowRoot.querySelectorAll('.md3-button')) : [];
            const exportPdfBtn = buttons.find(b => b.textContent?.includes('Export PDF')) as HTMLElement;
            expect(exportPdfBtn).toBeTruthy();

            exportPdfBtn.click();
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(mockReportActions.export).toHaveBeenCalledWith('test-growspace', 'pdf');

            mockReportActions.export.mockClear();

            const exportJsonBtn = buttons.find(b => b.textContent?.includes('Export JSON')) as HTMLElement;
            expect(exportJsonBtn).toBeTruthy();

            exportJsonBtn.click();
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(mockReportActions.export).toHaveBeenCalledWith('test-growspace', 'json');
        });

        it('should show "No report data available." when report fetch returns null', async () => {
            mockReportActions.fetch.mockResolvedValue(null);

            // Click Report tab
            const tabs = element.shadowRoot ? Array.from(element.shadowRoot.querySelectorAll('.tab')) : [];
            const reportTab = tabs.find(t => t.textContent?.includes('Report'));
            expect(reportTab).toBeTruthy();
            (reportTab as HTMLElement).click();

            await new Promise(resolve => setTimeout(resolve, 0));
            await element.updateComplete;

            const noDataMessage = element.shadowRoot?.querySelector('.report-container p');
            expect(noDataMessage).toBeTruthy();
            expect(noDataMessage?.textContent).toContain('No report data available.');
        });

        it('should handle partial report data / missing sections', async () => {
            const mockReportData = {};
            mockReportActions.fetch.mockResolvedValue(mockReportData);

            // Open report tab
            (element as any)._activeTab = 'report';
            await element.updateComplete;
            await new Promise(resolve => setTimeout(resolve, 0));
            await element.updateComplete;

            // Confirm no crashes occurred and report container is rendered
            const container = element.shadowRoot?.querySelector('.report-container');
            expect(container).toBeTruthy();
            expect(container?.querySelector('.summary-section')).toBeFalsy();
            expect(container?.querySelector('.report-actions')).toBeTruthy();
        });
    });
});

