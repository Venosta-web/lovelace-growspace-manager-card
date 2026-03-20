import { describe, it, expect, vi, beforeEach } from 'vitest';
import { html, fixture } from '@open-wc/testing-helpers';
import '../../../src/dialogs/grow-report-dialog';
import { GrowReportDialog } from '../../../src/dialogs/grow-report-dialog';

describe('GrowReportDialog', () => {
    let element: GrowReportDialog;
    let mockStore: any;

    beforeEach(async () => {
        mockStore = {
            dataService: {
                fetchGrowReport: vi.fn().mockResolvedValue({
                    summary: { plant_count: 5, strains: ['OG Kush'], stages: {} },
                    environment: { temperature_avg: 24, humidity_avg: 50, vpd_avg: 1.2 },
                    harvest: { total_wet_weight: 500, total_dry_weight: 100, total_trim_weight: 50, top_thc: 25 }
                }),
                exportGrowReport: vi.fn().mockResolvedValue(undefined)
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
        // Wait for report data to load
        await new Promise(r => setTimeout(r, 0));
        await element.updateComplete;

        const pdfBtn = element.shadowRoot?.querySelector('mwc-button[label="Export PDF"]') as HTMLElement;
        pdfBtn.click();

        expect(mockStore.dataService.exportGrowReport).toHaveBeenCalledWith('gs1', 'pdf');
    });
});
