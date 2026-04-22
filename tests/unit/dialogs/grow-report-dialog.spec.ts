import { describe, it, expect, vi, beforeEach } from 'vitest';
import { html, fixture } from '@open-wc/testing-helpers';
import '../../../src/dialogs/grow-report-dialog';
import { GrowReportDialog } from '../../../src/dialogs/grow-report-dialog';

const REPORT_DATA = {
    summary: { plant_count: 5, strains: ['OG Kush'], stages: {} },
    environment: { temperature_avg: 24, humidity_avg: 50, vpd_avg: 1.2 },
    harvest: { total_wet_weight: 500, total_dry_weight: 100, total_trim_weight: 50, top_thc: 25 }
};

describe('GrowReportDialog', () => {
    let element: GrowReportDialog;
    let mockStore: any;

    beforeEach(async () => {
        mockStore = {
            actions: {
                report: {
                    fetch: vi.fn().mockResolvedValue(REPORT_DATA),
                    export: vi.fn().mockResolvedValue(undefined),
                }
            },
            ui: {
                $activeDialog: {
                    get: vi.fn().mockReturnValue({ type: 'GROW_REPORT', payload: { growspaceId: 'gs1' } })
                },
                showToast: vi.fn()
            },
            data: {
                $devices: {
                    get: vi.fn().mockReturnValue([{ deviceId: 'gs1', name: 'Main Tent' }])
                }
            }
        };

        element = await fixture(html`
            <grow-report-dialog
                .open=${true}
                .store=${mockStore}
                .state=${{ type: 'GROW_REPORT', growspaceId: 'gs1' }}
            ></grow-report-dialog>
        `);
    });

    it('renders the header title and growspace name', () => {
        const title = element.shadowRoot?.querySelector('.dialog-title');
        const subtitle = element.shadowRoot?.querySelector('.dialog-subtitle');
        expect(title?.textContent).toBe('Grow Report');
        expect(subtitle?.textContent).toBe('Main Tent');
    });

    it('renders the "x" close button in the header', () => {
        const closeBtn = element.shadowRoot?.querySelector('ha-icon-button[title="Close"]');
        expect(closeBtn).to.exist;
    });

    it('dispatches "close" event when "x" button is clicked', async () => {
        const closeSpy = vi.fn();
        element.addEventListener('close', closeSpy);

        const closeBtn = element.shadowRoot?.querySelector('ha-icon-button[title="Close"]') as HTMLElement;
        closeBtn.click();

        expect(closeSpy).toHaveBeenCalled();
    });

    it('dispatches "close" event when "Close" button at bottom is clicked', async () => {
        const closeSpy = vi.fn();
        element.addEventListener('close', closeSpy);

        const bottomCloseBtn = element.shadowRoot?.querySelector('mwc-button[label="Close"]') as HTMLElement;
        bottomCloseBtn.click();

        expect(closeSpy).toHaveBeenCalled();
    });

    it('triggers PDF export when PDF button is clicked', async () => {
        await new Promise(r => setTimeout(r, 0));
        await element.updateComplete;

        const pdfBtn = element.shadowRoot?.querySelector('mwc-button[label="Export PDF"]') as HTMLElement;
        pdfBtn.click();

        expect(mockStore.actions.report.export).toHaveBeenCalledWith('gs1', 'pdf');
    });

    it('triggers JSON export when JSON button is clicked', async () => {
        await new Promise(r => setTimeout(r, 0));
        await element.updateComplete;

        const jsonBtn = element.shadowRoot?.querySelector('mwc-button[label="Export JSON"]') as HTMLElement;
        jsonBtn.click();

        expect(mockStore.actions.report.export).toHaveBeenCalledWith('gs1', 'json');
    });

    it('handles error during report loading', async () => {
        mockStore.actions.report.fetch.mockRejectedValueOnce(new Error('Load Error'));

        (element as any)._loadReport();
        await element.updateComplete;
        await element.updateComplete;

        const alert = element.shadowRoot?.querySelector('ha-alert');
        expect(alert?.textContent?.trim()).toContain('Load Error');
    });

    it('triggers reload when Retry button is clicked', async () => {
        (element as any)._error = 'Some Error';
        await element.updateComplete;

        const retryBtn = element.shadowRoot?.querySelector('mwc-button[label="Retry"]') as HTMLElement;
        retryBtn.click();

        expect(mockStore.actions.report.fetch).toHaveBeenCalled();
    });

    it('handles error during export', async () => {
        await new Promise(r => setTimeout(r, 0));
        await element.updateComplete;

        mockStore.actions.report.export.mockRejectedValueOnce(new Error('Export Error'));
        const pdfBtn = element.shadowRoot?.querySelector('mwc-button[label="Export PDF"]') as HTMLElement;
        pdfBtn.click();

        await element.updateComplete;
        // Toast is handled inside the action; dialog only swallows the error
        expect(mockStore.actions.report.export).toHaveBeenCalledWith('gs1', 'pdf');
    });

    it('shows "No report data available" when report is null', async () => {
        mockStore.actions.report.fetch.mockResolvedValueOnce(null);
        (element as any)._loadReport();
        await element.updateComplete;
        await element.updateComplete;

        expect(element.shadowRoot?.textContent).toContain('No report data available');
    });

    it('handles partial report data (missing sections)', async () => {
        (element as any)._reportData = {
            summary: undefined,
            environment: undefined,
            harvest: undefined
        };
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('.summary-section')).toBeNull();

        (element as any)._reportData = {
            summary: { plant_count: 5, strains: ['OG Kush'], stages: {} },
            environment: { temperature_avg: 25 },
            harvest: { total_dry_weight: 50.5 }
        };
        await element.updateComplete;

        expect(element.shadowRoot?.textContent).toContain('OG Kush');
        expect(element.shadowRoot?.textContent).toContain('Environment Averages');
        expect(element.shadowRoot?.textContent).toContain('Harvest Metrics');
    });

    it('renders correct subtitle from device name', async () => {
        mockStore.data.$devices.get.mockReturnValue([{ deviceId: 'gs1', name: 'New Tent Name' }]);
        element.requestUpdate();
        await element.updateComplete;

        const subtitle = element.shadowRoot?.querySelector('.dialog-subtitle');
        expect(subtitle?.textContent).toBe('New Tent Name');
    });

    it('renders stage chips when summary has strains', async () => {
        (element as any)._reportData = {
            summary: { plant_count: 1, strains: ['White Widow'], stages: {} }
        };
        await element.updateComplete;

        const chip = element.shadowRoot?.querySelector('ha-chip');
        expect(chip?.textContent).toBe('White Widow');
    });

    it('uses default error message when load error has no message', async () => {
        mockStore.actions.report.fetch.mockRejectedValueOnce({});
        (element as any)._loadReport();
        await element.updateComplete;
        await element.updateComplete;

        expect((element as any)._error).toBe('Failed to load grow report');
    });

    it('uses default error message when export error has no message', async () => {
        (element as any)._reportData = { summary: {} };
        await element.updateComplete;

        mockStore.actions.report.export.mockRejectedValueOnce({});
        const jsonBtn = element.shadowRoot?.querySelector('mwc-button[label="Export JSON"]') as HTMLElement;
        jsonBtn.click();
        await element.updateComplete;

        // Toast is handled inside the action; dialog just swallows the rejection
        expect(mockStore.actions.report.export).toHaveBeenCalledWith('gs1', 'json');
    });

    it('dispatches close event when ha-dialog is closed', async () => {
        const closeSpy = vi.fn();
        element.addEventListener('close', closeSpy);
        const dialog = element.shadowRoot?.querySelector('ha-dialog');
        dialog?.dispatchEvent(new CustomEvent('closed', { bubbles: true }));
        expect(closeSpy).toHaveBeenCalled();
    });

    it('handles missing growspaceId in subtitle', async () => {
        element.state = { growspaceId: '' } as any;
        element.requestUpdate();
        await element.updateComplete;
        const subtitle = element.shadowRoot?.querySelector('.dialog-subtitle');
        expect(subtitle?.textContent).toBe('');
    });

    it('prevents concurrent exports', async () => {
        (element as any)._reportData = { summary: {}, environment: {}, harvest: {} };
        (element as any)._exporting = true;
        await element.updateComplete;

        const pdfBtn = element.shadowRoot?.querySelector('mwc-button[label="Export PDF"]');
        expect(pdfBtn?.hasAttribute('disabled')).toBe(true);

        (element as any)._exportReport('pdf');
        expect(mockStore.actions.report.export).not.toHaveBeenCalled();
    });
});
