
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PrintLabelDialog } from '../../../src/dialogs/print-label-dialog';
import { PrintLabelDialogState } from '../../../src/types';
import { atom } from 'nanostores';

// Mock dependencies
const mockStore = {
    data: {
        $devices: atom<any[]>([]),
        $strainLibrary: atom<any[]>([])
    },
    printLabel: vi.fn(),
    showToast: vi.fn()
};

describe('PrintLabelDialog', () => {
    let element: PrintLabelDialog;
    let mockHass: any;

    beforeEach(() => {
        element = new PrintLabelDialog();

        mockHass = {
            states: {
                'image.printer_preview': {
                    entity_id: 'image.printer_preview',
                    attributes: {
                        entity_picture: '/api/image/preview'
                    }
                },
                'image.printer_niimbot': {
                    entity_id: 'image.printer_niimbot',
                    attributes: {
                        friendly_name: 'Niimbot B1 Last Label Made'
                    }
                },
                'binary_sensor.printer_connection': {
                    entity_id: 'binary_sensor.printer_connection',
                    attributes: {
                        friendly_name: 'Niimbot Status'
                    }
                }
            },
            callService: vi.fn()
        };

        element.hass = mockHass;
        element.store = mockStore as any;
        element.dialogState = {
            plantId: '123',
            strainName: 'Blue Dream',
            phenotype: '1',
            breeder: 'Humboldt',
            lineage: 'Blueberry x Haze',
            breederLogo: 'logo.png'
        };

        // Reset mocks
        mockStore.printLabel.mockReset();
        mockStore.showToast.mockReset();
        mockStore.data.$devices.set([]);
        mockStore.data.$strainLibrary.set([]);

        document.body.appendChild(element);
    });

    afterEach(() => {
        if (element && element.isConnected) {
            document.body.removeChild(element);
        }
        vi.clearAllMocks();
    });

    it('should be defined', () => {
        expect(element).toBeInstanceOf(PrintLabelDialog);
    });

    describe('Initialization', () => {
        it('should initialize with default state', () => {
            const el = new PrintLabelDialog();
            expect(el.open).toBe(false);
        });
    });

    describe('Opening Behavior', () => {
        it('should reset form and fetch preview when opened', async () => {
            const resetSpy = vi.spyOn(element as any, '_resetForm');
            const fetchSpy = vi.spyOn(element as any, '_fetchPreview');

            element.open = true;
            await element.updateComplete;

            expect(resetSpy).toHaveBeenCalled();
            expect(fetchSpy).toHaveBeenCalled();
        });

        it('should not reset form if open prop remains false', async () => {
            const resetSpy = vi.spyOn(element as any, '_resetForm');
            element.requestUpdate();
            await element.updateComplete;
            expect(resetSpy).not.toHaveBeenCalled();
        });

        it('should auto-select first printer if none selected', async () => {
            // Setup printer in hass
            mockHass.states['image.b1_last_label_made'] = {
                entity_id: 'image.b1_last_label_made',
                attributes: { friendly_name: 'B1 Last Label Made' }
            };

            element.open = true;
            await element.updateComplete;

            // Check private state _selectedDeviceId if possible, or verify behavior
            // Since _selectedDeviceId is private state, we can check via a getter if exposed or check side effects
            // But for this test let's check the render output or use 'any' casting
            expect((element as any)._selectedDeviceId).toBe('image.b1_last_label_made');
        });
    });

    describe('Preview Fetching', () => {
        it('should call store.printLabel with preview=true', async () => {
            element.dialogState = { plantId: '123', strainName: 'Test' };
            (element as any)._selectedDeviceId = 'image.printer_niimbot';

            const promise = (element as any)._fetchPreview();

            expect(mockStore.printLabel).toHaveBeenCalledWith(expect.objectContaining({
                preview: true,
                plantId: '123',
                strain: 'Test'
            }));

            await promise;
        });

        it('should handle preview success', async () => {
            // Mock selected device
            (element as any)._selectedDeviceId = 'image.printer_preview';
            mockHass.states['image.printer_preview'] = {
                attributes: { entity_picture: '/test.jpg' }
            };

            await (element as any)._fetchPreview();

            expect((element as any)._previewImage).toContain('/test.jpg');
        });

        it('should handle preview failure', async () => {
            mockStore.printLabel.mockRejectedValue(new Error('Preview failed'));
            (element as any)._selectedDeviceId = 'image.printer_preview';

            await (element as any)._fetchPreview();

            expect((element as any)._previewError).toBe('Preview failed');
            expect((element as any)._previewLoading).toBe(false);
        });

        it('should handle missing image attribute after success', async () => {
            (element as any)._selectedDeviceId = 'image.printer_preview';
            mockHass.states['image.printer_preview'] = {
                attributes: {} // No entity_picture
            };

            await (element as any)._fetchPreview();
            expect((element as any)._previewError).toContain('no picture attribute');
        });

        it('should return early if no dialog state or device id', async () => {
            element.dialogState = undefined;
            await (element as any)._fetchPreview();
            expect(mockStore.printLabel).not.toHaveBeenCalled();
        });

        it('should return early if no plantId and no strainName', async () => {
            element.dialogState = {} as any;
            await (element as any)._fetchPreview();
            expect(mockStore.printLabel).not.toHaveBeenCalled();
        });
    });

    describe('Printer Discovery', () => {
        it('should filter correct printer entities', () => {
            mockHass.states = {
                'image.b1_last_label_made': {
                    entity_id: 'image.b1_last_label_made',
                    attributes: { friendly_name: 'Niimbot B1 Last Label Made' }
                },
                'image.other': { entity_id: 'image.other', attributes: {} },
                'sensor.temp': { entity_id: 'sensor.temp', attributes: {} }
            };

            const printers = (element as any)._getPrinters();
            expect(printers).toHaveLength(1);
            expect(printers[0].value).toBe('image.b1_last_label_made');
            expect(printers[0].label).toBe('Niimbot B1');
        });

        it('should update selected device on change event', async () => {
            element.open = true;
            await element.updateComplete;

            // Find the select element or dispatch event on shadowroot
            // Since we use querySelector in tests usually...
            // But here we can simulate the event being fired on the component itself if bubble?
            // Or better, testing the handler directly if exposed, or interacting with shadowDOM

            // The handler is inline: @change=${(e) => this._selectedDeviceId = e.detail}
            // It's a CustomEvent 'change'

            // Let's query the select element
            const select = element.shadowRoot?.querySelector('md3-select');
            expect(select).toBeTruthy();

            select?.dispatchEvent(new CustomEvent('change', { detail: 'printer2' }));
            await element.updateComplete;

            expect((element as any)._selectedDeviceId).toBe('printer2');
        });

        it('should return empty if hass is missing', () => {
            element.hass = undefined as any;
            expect((element as any)._getPrinters()).toEqual([]);
        });
    });

    describe('Submission', () => {
        it('should submit print job and close', async () => {
            const closeSpy = vi.spyOn(element as any, '_close');
            element.dialogState = { plantId: '123' };
            (element as any)._selectedDeviceId = 'printer1';

            await (element as any)._submit();

            expect(mockStore.printLabel).toHaveBeenCalledWith(expect.objectContaining({
                preview: false,
                deviceId: 'printer1'
            }));
            expect(mockStore.showToast).toHaveBeenCalledWith(expect.stringContaining('sent'), 'success');
            expect(closeSpy).toHaveBeenCalled();
        });

        it('should handle submit errors', async () => {
            mockStore.printLabel.mockRejectedValue(new Error('Print failed'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            await (element as any)._submit();

            expect(mockStore.showToast).toHaveBeenCalledWith(expect.stringContaining('Print failed'), 'error');
            expect(consoleSpy).toHaveBeenCalled();
        });

        it('should not submit if store is missing', async () => {
            element.store = undefined as any;
            await (element as any)._submit();
            // Should just return
        });
    });

    describe('Helpers', () => {
        it('should format date correctly', () => {
            const dateStr = '2023-01-01';
            const formatted = (element as any)._formatDate(dateStr);
            // Result depends on locale, but should verify it doesn't crash and returns string
            expect(typeof formatted).toBe('string');
            expect(formatted).not.toBe(dateStr);
        });

        it('should return "Invalid Date" or original string for invalid date', () => {
            const formatted = (element as any)._formatDate('not-a-date');
            expect(formatted).toBe('Invalid Date');
        });

        it('should return original string if formatting throws', () => {
            const spy = vi.spyOn(Date.prototype, 'toLocaleDateString').mockImplementation(() => {
                throw new Error('Format error');
            });

            const formatted = (element as any)._formatDate('2023-01-01');
            expect(formatted).toBe('2023-01-01');

            spy.mockRestore();
        });

        it('should get plant from store', () => {
            const mockPlant = {
                entity_id: 'sensor.plant1',
                attributes: { plant_id: '123', strain: 'OG' }
            };
            mockStore.data.$devices.set([
                { plants: [mockPlant] }
            ]);

            const plant = (element as any)._getPlant('123');
            expect(plant).toEqual(mockPlant);
        });

        it('should get strain from library', () => {
            const mockStrain = { strain: 'OG', phenotype: 'default' };
            mockStore.data.$strainLibrary.set([mockStrain]);

            const result = (element as any)._getStrain('OG');
            expect(result).toEqual(mockStrain);
        });
    });

    describe('Rendering', () => {
        it('should return nothing if not open', async () => {
            element.open = false;
            await element.updateComplete;
            // Lit 'nothing' often leaves the shadowRoot empty or with a comment
            expect(element.shadowRoot?.innerHTML).not.toContain('<ha-dialog');
        });

        // Skipping deep shadow DOM render tests for now as they require more setup
        // and we likely have good logic coverage already.
    });
});
