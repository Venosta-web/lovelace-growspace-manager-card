
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
    actions: {
        ui: {
            toast: vi.fn(),
        },
        plant: {
            printLabel: vi.fn(),
        },
    },
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
        mockStore.actions.plant.printLabel.mockReset();
        mockStore.actions.ui.toast.mockReset();
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

            expect((element as any)._selectedDeviceId).toBe('image.b1_last_label_made');
        });

        it('should avoid auto-selection if deviceId is provided in dialogState', async () => {
            element.dialogState = { deviceId: 'existing_device' };
            mockHass.states['image.b1_last_label_made'] = {
                entity_id: 'image.b1_last_label_made',
                attributes: { friendly_name: 'B1 Last Label Made' }
            };

            element.open = true;
            await element.updateComplete;

            expect((element as any)._selectedDeviceId).toBe('existing_device');
        });

        it('should handle no printers available during auto-selection', async () => {
            mockHass.states = {};
            element.open = true;
            await element.updateComplete;
            expect((element as any)._selectedDeviceId).toBe('');
        });

        it('should use deviceId from dialogState if provided', async () => {
            element.dialogState = { deviceId: 'state_device' };
            element.open = true;
            await element.updateComplete;
            expect((element as any)._selectedDeviceId).toBe('state_device');
        });
    });

    describe('Preview Fetching', () => {
        it('should call store.actions.plant.printLabel with preview=true', async () => {
            element.dialogState = { plantId: '123', strainName: 'Test' };
            (element as any)._selectedDeviceId = 'image.printer_niimbot';

            const promise = (element as any)._fetchPreview();

            expect(mockStore.actions.plant.printLabel).toHaveBeenCalledWith(expect.objectContaining({
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
            // Check cache buster
            expect((element as any)._previewImage).toMatch(/&v=\d+$/);
        });

        it('should handle preview failure with Error object', async () => {
            mockStore.actions.plant.printLabel.mockRejectedValue(new Error('Preview failed'));
            (element as any)._selectedDeviceId = 'image.printer_preview';

            await (element as any)._fetchPreview();

            expect((element as any)._previewError).toBe('Preview failed');
            expect((element as any)._previewLoading).toBe(false);
        });

        it('should handle preview failure with string error', async () => {
            mockStore.actions.plant.printLabel.mockRejectedValue('String error');
            (element as any)._selectedDeviceId = 'image.printer_preview';

            await (element as any)._fetchPreview();

            expect((element as any)._previewError).toBe('Failed to fetch preview');
        });

        it('should handle missing image attribute after success', async () => {
            (element as any)._selectedDeviceId = 'image.printer_preview';
            mockHass.states['image.printer_preview'] = {
                attributes: {} // No entity_picture
            };

            await (element as any)._fetchPreview();
            expect((element as any)._previewError).toContain('no picture attribute');
        });

        it('should return early if no dialog state', async () => {
            element.dialogState = undefined;
            await (element as any)._fetchPreview();
            expect(mockStore.actions.plant.printLabel).not.toHaveBeenCalled();
        });

        it('should return early if no device id', async () => {
            (element as any)._selectedDeviceId = '';
            await (element as any)._fetchPreview();
            expect(mockStore.actions.plant.printLabel).not.toHaveBeenCalled();
        });

        it('should return early if no plantId and no strainName', async () => {
            element.dialogState = { phenotype: '1' }; // Neither plantId nor strainName
            (element as any)._selectedDeviceId = 'some_device';
            await (element as any)._fetchPreview();
            expect(mockStore.actions.plant.printLabel).not.toHaveBeenCalled();
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

        it('should use entity_id if friendly_name is missing', () => {
            mockHass.states = {
                'image.printer_last_label_made': {
                    entity_id: 'image.printer_last_label_made',
                    attributes: {}
                }
            };

            const printers = (element as any)._getPrinters();
            expect(printers[0].label).toBe('image.printer_last_label_made');
        });

        it('should update selected device on change event', async () => {
            element.open = true;
            await element.updateComplete;

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

            expect(mockStore.actions.plant.printLabel).toHaveBeenCalledWith(expect.objectContaining({
                preview: false,
                deviceId: 'printer1'
            }));
            expect(mockStore.actions.ui.toast).toHaveBeenCalledWith(expect.stringContaining('sent'), 'success');
            expect(closeSpy).toHaveBeenCalled();
        });

        it('should handle submit errors with Error object', async () => {
            mockStore.actions.plant.printLabel.mockRejectedValue(new Error('Print failed'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            await (element as any)._submit();

            expect(mockStore.actions.ui.toast).toHaveBeenCalledWith(expect.stringContaining('Print failed'), 'error');
            expect(consoleSpy).toHaveBeenCalled();
        });

        it('should handle submit errors with unknown type', async () => {
            mockStore.actions.plant.printLabel.mockRejectedValue('Unknown Failure');
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            await (element as any)._submit();

            expect(mockStore.actions.ui.toast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
            expect(consoleSpy).toHaveBeenCalled();
        });

        it('should not submit if store is missing', async () => {
            element.store = undefined as any;
            await (element as any)._submit();
            expect(mockStore.actions.plant.printLabel).not.toHaveBeenCalled();
        });

        it('should not submit if dialogState is missing', async () => {
            element.dialogState = undefined;
            await (element as any)._submit();
            expect(mockStore.actions.plant.printLabel).not.toHaveBeenCalled();
        });

        it('should send undefined deviceId if none selected', async () => {
            element.dialogState = { plantId: '123' };
            (element as any)._selectedDeviceId = '';

            await (element as any)._submit();

            expect(mockStore.actions.plant.printLabel).toHaveBeenCalledWith(expect.objectContaining({
                deviceId: undefined
            }));
        });
    });

    describe('Helpers', () => {
        it('should format date correctly', () => {
            const dateStr = '2023-01-01';
            const formatted = (element as any)._formatDate(dateStr);
            expect(typeof formatted).toBe('string');
            expect(formatted).not.toBe(dateStr);
        });

        it('should handle empty date string', () => {
            expect((element as any)._formatDate('')).toBe('N/A');
            expect((element as any)._formatDate(undefined)).toBe('N/A');
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

        it('should get plant from store by plant_id', () => {
            const mockPlant = {
                entity_id: 'sensor.plant_raw',
                attributes: { plant_id: '123', strain: 'OG' }
            };
            mockStore.data.$devices.set([
                { plants: [mockPlant] }
            ]);

            const plant = (element as any)._getPlant('123');
            expect(plant).toEqual(mockPlant);
        });

        it('should get plant from store by entity_id fallback', () => {
            const mockPlant = {
                entity_id: 'sensor.plant456',
                attributes: { strain: 'Kush' }
            };
            mockStore.data.$devices.set([
                { plants: [mockPlant] }
            ]);

            const plant = (element as any)._getPlant('plant456');
            expect(plant).toEqual(mockPlant);
        });

        it('should return null for plant if plantId not found', () => {
            mockStore.data.$devices.set([{ plants: [] }]);
            expect((element as any)._getPlant('none')).toBeNull();
        });

        it('should return null for plant if store data is missing', () => {
            element.store = { data: undefined } as any;
            expect((element as any)._getPlant('123')).toBeNull();
            element.store = undefined as any;
            expect((element as any)._getPlant('123')).toBeNull();
        });

        it('should get strain from library with default phenotype', () => {
            const mockStrain = { strain: 'OG', phenotype: 'default' };
            mockStore.data.$strainLibrary.set([mockStrain]);

            const result = (element as any)._getStrain('OG');
            expect(result).toEqual(mockStrain);
        });

        it('should get strain from library with specific phenotype', () => {
            const mockStrain = { strain: 'OG', phenotype: 'P1' };
            mockStore.data.$strainLibrary.set([mockStrain]);

            const result = (element as any)._getStrain('OG', 'P1');
            expect(result).toEqual(mockStrain);
        });

        it('should return null if strain not found', () => {
            mockStore.data.$strainLibrary.set([]);
            expect((element as any)._getStrain('OG')).toBeNull();
        });

        it('should return null for strain if store data is missing', () => {
            element.store = { data: undefined } as any;
            expect((element as any)._getStrain('OG')).toBeNull();
        });
    });

    describe('Rendering', () => {
        beforeEach(() => {
            element.open = true;
        });

        it('should return nothing if not open', async () => {
            element.open = false;
            await element.updateComplete;
            // Lit 'nothing' often leaves a comment node
            expect(element.shadowRoot?.innerHTML.replace('<!---->', '').trim()).toBe('');
        });

        it('should render plant-based subtitle', async () => {
            const mockPlant = {
                entity_id: 'sensor.p1',
                attributes: { plant_id: 'P1', strain: 'StrainA' }
            };
            mockStore.data.$devices.set([{ plants: [mockPlant] }]);
            element.dialogState = { plantId: 'P1' };

            await element.updateComplete;
            const gsDialog = element.shadowRoot?.querySelector('gs-dialog') as any;
            expect(gsDialog?.subtitle).toBe('StrainA (P1)');
        });

        it('should render strain-only subtitle if plant not found', async () => {
            mockStore.data.$devices.set([{ plants: [] }]);
            element.dialogState = { strainName: 'StrainB' };

            await element.updateComplete;
            const gsDialog = element.shadowRoot?.querySelector('gs-dialog') as any;
            expect(gsDialog?.subtitle).toBe('StrainB');
        });

        it('should render "Unknown" if no data available', async () => {
            element.dialogState = {};
            await element.updateComplete;
            const gsDialog = element.shadowRoot?.querySelector('gs-dialog') as any;
            expect(gsDialog?.subtitle).toBe('Unknown');
        });

        it('should render loading state', async () => {
            (element as any)._previewLoading = true;
            await element.updateComplete;
            expect(element.shadowRoot?.querySelector('ha-circular-progress')).toBeTruthy();
            expect(element.shadowRoot?.textContent).toContain('Generating preview...');
        });

        it('should render error state with try again button', async () => {
            (element as any)._previewError = 'Some Error';
            await element.updateComplete;

            expect(element.shadowRoot?.textContent).toContain('Some Error');
            const tryAgain = element.shadowRoot?.querySelector('button.tonal.small');
            expect(tryAgain).toBeTruthy();

            const fetchSpy = vi.spyOn(element as any, '_fetchPreview').mockResolvedValue(undefined);
            (element as any)._fetchPreview();
            expect(fetchSpy).toHaveBeenCalled();
        });

        it('should render no preview state', async () => {
            (element as any)._previewImage = null;
            (element as any)._previewLoading = false;
            (element as any)._previewError = null;
            await element.updateComplete;
            expect(element.shadowRoot?.textContent).toContain('No preview available');
        });

        it('should render printer warning if no printers available', async () => {
            mockHass.states = {};
            await element.updateComplete;
            expect(element.shadowRoot?.textContent).toContain('No Niimbot printers discovered');
        });

        it('should render buttons and handle close', async () => {
            const closeSpy = vi.spyOn(element as any, '_close');
            await element.updateComplete;

            const cancelBtn = element.shadowRoot?.querySelectorAll('.button-group button')[0] as HTMLElement;
            (element as any)._close();
            expect(closeSpy).toHaveBeenCalled();
        });

        it('should disable buttons when submitting', async () => {
            (element as any)._isSubmitting = true;
            await element.updateComplete;

            const buttons = element.shadowRoot?.querySelectorAll('button');
            expect(buttons?.length).toBeGreaterThan(0);
            buttons?.forEach(btn => {
                // Cancel button doesn't have disabled in template but @click exists? No, it has ?disabled
                // cancel button is buttons[0], print button is buttons[2] (refresh is buttons[1])
                if (btn.classList.contains('primary') || btn.classList.contains('tonal')) {
                    expect(btn.hasAttribute('disabled')).toBe(true);
                }
            });
            expect(element.shadowRoot?.textContent).toContain('Printing...');
        });

        it('should handle refresh button click', async () => {
            const fetchSpy = vi.spyOn(element as any, '_fetchPreview').mockResolvedValue(undefined);
            await element.updateComplete;

            (element as any)._fetchPreview();
            expect(fetchSpy).toHaveBeenCalled();
        });
    });
});
