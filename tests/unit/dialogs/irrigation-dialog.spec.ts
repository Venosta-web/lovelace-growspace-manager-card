
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IrrigationDialog } from '../../../src/dialogs/irrigation-dialog';
import { GrowspaceDevice } from '../../../src/types';
import { GrowspaceType } from '../../../src/constants';

// Mock dependencies
vi.mock('../../../src/components/ui/md3-text-input', () => ({
    Md3TextInput: class extends HTMLElement {
        get value() { return this.getAttribute('value') || ''; }
        set value(v) { this.setAttribute('value', v); }
    }
}));
vi.mock('../../../src/components/ui/md3-number-input', () => ({
    Md3NumberInput: class extends HTMLElement {
        get value() { return this.getAttribute('value') || ''; }
        set value(v) { this.setAttribute('value', v); }
    }
}));
vi.mock('../../../src/components/ui/md3-switch', () => ({
    Md3Switch: class extends HTMLElement {
        get checked() { return this.hasAttribute('checked'); }
        set checked(v) { v ? this.setAttribute('checked', '') : this.removeAttribute('checked'); }
    }
}));

const mocks = vi.hoisted(() => ({
    setIrrigationSettings: vi.fn().mockResolvedValue(undefined),
    addIrrigationTime: vi.fn().mockResolvedValue(undefined),
    removeIrrigationTime: vi.fn().mockResolvedValue(undefined),
    addDrainTime: vi.fn().mockResolvedValue(undefined),
    removeDrainTime: vi.fn().mockResolvedValue(undefined),
    setIrrigationStrategy: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../../../src/data-service', () => {
    return {
        DataService: class {
            constructor() {
                return mocks;
            }
        }
    };
});

// Mock ha-dialog
class HaDialogMock extends HTMLElement {
    open = false;
}
customElements.define('ha-dialog', HaDialogMock);

describe('IrrigationDialog', () => {
    let element: IrrigationDialog;
    const mockDevice: GrowspaceDevice = {
        deviceId: 'gs1',
        name: 'Growspace 1',
        type: GrowspaceType.NORMAL,
        rows: 4,
        plantsPerRow: 4,
        plants: [],
        grid: {},
        biologicalMetrics: {} as any,
        environmentAttributes: {} as any,
        stats: {} as any,
        irrigationConfig: {
            irrigationPumpEntity: 'switch.pump',
            drainPumpEntity: 'switch.drain',
            irrigationDuration: 60,
            drainDuration: 60,
            irrigationTimes: [{ time: '08:00', duration: 60 }],
            drainTimes: [{ time: '08:30', duration: 60 }]
        },
        irrigationStrategy: {
            enabled: false,
            lightsOnTime: '06:00',
            p0DurationMinutes: 60,
            p2StopBeforeLightsOffMinutes: 120,
            targetVwcPercent: 45,
            maintenanceDrybackPercent: 3,
            shotDurationSeconds: 15,
            shotIntervalMinutes: 15
        }
    };

    let originalGetBoundingClientRect: any;

    beforeEach(() => {
        vi.clearAllMocks();
        element = new IrrigationDialog();
        element.device = JSON.parse(JSON.stringify(mockDevice)); // Deep copy
        element.hass = {} as any;

        originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
        Element.prototype.getBoundingClientRect = vi.fn(() => ({
            width: 100, height: 10, top: 0, left: 0, bottom: 0, right: 0, x: 0, y: 0, toJSON: () => { }
        }));
    });

    afterEach(() => {
        if (element.isConnected) document.body.removeChild(element);
        if (originalGetBoundingClientRect) {
            Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
        }
        vi.restoreAllMocks();
    });

    it('should render content when open', async () => {
        element.open = true;
        document.body.appendChild(element);
        await element.updateComplete;

        const dialog = element.shadowRoot?.querySelector('ha-dialog');
        expect(dialog).toBeTruthy();
    });

    describe('Schedules Tab', () => {
        beforeEach(async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;
        });

        it('should render existing times', () => {
            const markers = element.shadowRoot?.querySelectorAll('.chart-marker');
            expect(markers?.length).toBe(2); // 1 irrigation + 1 drain
        });

        it('should add new irrigation time', async () => {


            // Click Add Time button (first one is irrigation)
            const addBtns = element.shadowRoot?.querySelectorAll('button.primary');
            const addIrrigationBtn = Array.from(addBtns || []).find(b => b.textContent?.includes('ADD TIME'));
            (addIrrigationBtn as HTMLElement)?.click();
            await element.updateComplete;

            const overlay = element.shadowRoot?.querySelector('.overlay-backdrop');
            expect(overlay).toBeTruthy();

            // Set Time Input
            const timeInput = overlay?.querySelector('md3-text-input') as any;
            expect(timeInput).toBeTruthy();
            timeInput.value = '12:00';
            timeInput?.dispatchEvent(new CustomEvent('change', { detail: '12:00', bubbles: true, composed: true }));
            await element.updateComplete;

            // Set Duration Input
            const durInput = overlay?.querySelector('md3-number-input') as any;
            expect(durInput).toBeTruthy();
            durInput.value = '120';
            durInput?.dispatchEvent(new CustomEvent('change', { detail: '120', bubbles: true, composed: true }));
            await element.updateComplete;

            // Click Add Schedule
            const confirmBtn = Array.from(overlay?.querySelectorAll('button.primary') || [])
                .find(b => b.textContent?.includes('Add Schedule'));
            (confirmBtn as HTMLElement)?.click();
            await element.updateComplete;

            expect(mocks.addIrrigationTime).toHaveBeenCalledWith(expect.objectContaining({
                growspaceId: 'gs1',
                time: '12:00:00',
                duration: 120
            }));
        });

        it('should remove irrigation time via edit dialog', async () => {
            const markers = element.shadowRoot?.querySelectorAll('.chart-marker');
            const irrigationMarker = markers?.[0];

            // 1. Click marker to open edit dialog
            (irrigationMarker as HTMLElement).click();
            await element.updateComplete;

            const editOverlay = element.shadowRoot?.querySelector('.overlay-backdrop');
            expect(editOverlay).toBeTruthy();

            // 2. Click Delete button
            const deleteBtn = editOverlay?.querySelector('.delete-button');
            (deleteBtn as HTMLElement).click();

            // Wait for microtasks and DOM update
            await new Promise(r => setTimeout(r, 0));
            await element.updateComplete;

            expect(mocks.removeIrrigationTime).toHaveBeenCalledWith(expect.objectContaining({
                growspaceId: 'gs1',
                time: '08:00'
            }));

            // Edit dialog should be closed
            expect(element.shadowRoot?.querySelector('.overlay-backdrop')).toBeFalsy();
        });

        it('should add new drain time', async () => {
            // Mock getBoundingClientRect for drain logic if needed, but we can click button directly
            // The button click logic uses getBoundingClientRect on the container found via closest
            // Our mock on Element.prototype covers it.

            // Click Add Time button (second one is drain)
            const addBtns = element.shadowRoot?.querySelectorAll('button.primary');
            const addDrainBtn = Array.from(addBtns || []).filter(b => b.textContent?.includes('ADD TIME'))[1];
            expect(addDrainBtn).toBeTruthy();
            (addDrainBtn as HTMLElement)?.click();
            await element.updateComplete;

            const overlay = element.shadowRoot?.querySelector('.overlay-backdrop');
            expect(overlay).toBeTruthy();

            // Set Time Input
            const timeInput = overlay?.querySelector('md3-text-input') as any;
            expect(timeInput).toBeTruthy();
            timeInput.value = '14:00';
            timeInput?.dispatchEvent(new CustomEvent('change', { detail: '14:00', bubbles: true, composed: true }));
            await element.updateComplete;

            // Set Duration Input
            const durInput = overlay?.querySelector('md3-number-input') as any;
            expect(durInput).toBeTruthy();
            durInput.value = '45';
            durInput?.dispatchEvent(new CustomEvent('change', { detail: '45', bubbles: true, composed: true }));
            await element.updateComplete;

            // Click Add Schedule
            const confirmBtn = Array.from(overlay?.querySelectorAll('button.primary') || [])
                .find(b => b.textContent?.includes('Add Schedule'));
            (confirmBtn as HTMLElement)?.click();
            await element.updateComplete;

            expect(mocks.addDrainTime).toHaveBeenCalledWith(expect.objectContaining({
                growspaceId: 'gs1',
                time: '14:00:00',
                duration: 45
            }));
        });

        it('should remove drain time via edit dialog', async () => {
            const drainSection = element.shadowRoot?.querySelectorAll('.detail-card')[1]; // Second card is drain
            const drainMarker = drainSection?.querySelector('.chart-marker');
            expect(drainMarker).toBeTruthy();

            // 1. Click marker to open edit dialog
            (drainMarker as HTMLElement).click();
            await element.updateComplete;

            const editOverlay = element.shadowRoot?.querySelector('.overlay-backdrop');
            expect(editOverlay).toBeTruthy();

            // 2. Click Delete button
            const deleteBtn = editOverlay?.querySelector('.delete-button');
            (deleteBtn as HTMLElement).click();

            // Wait for microtasks and DOM update
            await new Promise(r => setTimeout(r, 0));
            await element.updateComplete;

            expect(mocks.removeDrainTime).toHaveBeenCalledWith(expect.objectContaining({
                growspaceId: 'gs1',
                time: '08:30'
            }));

            // Edit dialog should be closed
            expect(element.shadowRoot?.querySelector('.overlay-backdrop')).toBeFalsy();
        });
    });

    describe('Steering Tab', () => {
        beforeEach(async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            // Switch to Steering Tab
            const tabs = element.shadowRoot?.querySelectorAll('.tab-item');
            (tabs?.[1] as HTMLElement).click();
            await element.updateComplete;
        });

        it('should toggle steering enabled', async () => {
            const switchEl = element.shadowRoot?.querySelector('md3-switch') as any;

            // Set checked property
            switchEl.checked = true;
            switchEl?.dispatchEvent(new Event('change', { bubbles: true }));
            await element.updateComplete;

            // Click Save
            const saveBtn = element.shadowRoot?.querySelector('button.primary'); // Save Strategy
            (saveBtn as HTMLElement).click();

            expect(mocks.setIrrigationStrategy).toHaveBeenCalledWith('gs1', expect.objectContaining({
                enabled: true
            }));
        });

        it('should update target vwc', async () => {
            const inputs = element.shadowRoot?.querySelectorAll('md3-number-input');
            const targetVwcInput = Array.from(inputs || [])
                .find(i => i.getAttribute('label') === 'Target VWC (%)') as any;

            expect(targetVwcInput).toBeTruthy();
            targetVwcInput.value = '55';
            targetVwcInput?.dispatchEvent(new CustomEvent('change', { detail: '55' }));
            await element.updateComplete;

            const saveBtn = element.shadowRoot?.querySelector('button.primary');
            (saveBtn as HTMLElement).click();

            expect(mocks.setIrrigationStrategy).toHaveBeenCalledWith('gs1', expect.objectContaining({
                targetVwcPercent: 55
            }));
        });

        it('should update lights on time', async () => {
            const input = element.shadowRoot?.querySelector('md3-text-input[label="Lights On Time"]') as any;
            input.value = '08:00';
            input?.dispatchEvent(new CustomEvent('change', { detail: '08:00' }));
            await element.updateComplete;

            const saveBtn = element.shadowRoot?.querySelector('button.primary');
            (saveBtn as HTMLElement).click();

            expect(mocks.setIrrigationStrategy).toHaveBeenCalledWith('gs1', expect.objectContaining({
                lightsOnTime: '08:00'
            }));
        });
    });
    describe('Error Handling', () => {
        beforeEach(async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;
        });

        it('should handle addIrrigationTime failure', async () => {
            mocks.addIrrigationTime.mockRejectedValueOnce(new Error('API Error'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });



            const addBtns = element.shadowRoot?.querySelectorAll('button.primary');
            const addIrrigationBtn = Array.from(addBtns || []).find(b => b.textContent?.includes('ADD TIME'));
            (addIrrigationBtn as HTMLElement)?.click();
            await element.updateComplete;

            const overlay = element.shadowRoot?.querySelector('.overlay-backdrop');
            const confirmBtn = Array.from(overlay?.querySelectorAll('button.primary') || [])
                .find(b => b.textContent?.includes('Add Schedule'));

            // We need to set some values first or it might fail if inputs are empty? 
            // The method defaults duration but time is required?
            // `addingTime` is set in `_startAddingIrrigationTime` with default time strings.
            // So we can just click confirm.
            (confirmBtn as HTMLElement)?.click();
            await element.updateComplete;

            expect(consoleSpy).toHaveBeenCalledWith('Failed to add irrigation time:', expect.any(Error));
        });

        it('should handle removeIrrigationTime failure', async () => {
            mocks.removeIrrigationTime.mockRejectedValueOnce(new Error('API Error'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const markers = element.shadowRoot?.querySelectorAll('.chart-marker');
            (markers?.[0] as HTMLElement).click();
            await element.updateComplete;

            const editOverlay = element.shadowRoot?.querySelector('.overlay-backdrop');
            const deleteBtn = editOverlay?.querySelector('.delete-button');
            (deleteBtn as HTMLElement).click();
            await element.updateComplete;

            expect(consoleSpy).toHaveBeenCalledWith('Failed to delete irrigation time:', expect.any(Error));
        });

        it('should handle addDrainTime failure', async () => {
            mocks.addDrainTime.mockRejectedValueOnce(new Error('API Error'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const addBtns = element.shadowRoot?.querySelectorAll('button.primary');
            const addDrainBtn = Array.from(addBtns || []).filter(b => b.textContent?.includes('ADD TIME'))[1];
            (addDrainBtn as HTMLElement)?.click();
            await element.updateComplete;

            const overlay = element.shadowRoot?.querySelector('.overlay-backdrop');
            const confirmBtn = Array.from(overlay?.querySelectorAll('button.primary') || [])
                .find(b => b.textContent?.includes('Add Schedule'));
            (confirmBtn as HTMLElement)?.click();
            await element.updateComplete;

            expect(consoleSpy).toHaveBeenCalledWith('Failed to add drain time:', expect.any(Error));
        });

        it('should handle removeDrainTime failure', async () => {
            mocks.removeDrainTime.mockRejectedValueOnce(new Error('API Error'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const drainSection = element.shadowRoot?.querySelectorAll('.detail-card')[1];
            const drainMarker = drainSection?.querySelector('.chart-marker');
            (drainMarker as HTMLElement).click();
            await element.updateComplete;

            const editOverlay = element.shadowRoot?.querySelector('.overlay-backdrop');
            const deleteBtn = editOverlay?.querySelector('.delete-button');
            (deleteBtn as HTMLElement).click();
            await element.updateComplete;

            expect(consoleSpy).toHaveBeenCalledWith('Failed to delete drain time:', expect.any(Error));
        });

        it('should handle saveStrategy failure', async () => {
            mocks.setIrrigationStrategy.mockRejectedValueOnce(new Error('API Error'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            // Switch to Steering Tab
            const tabs = element.shadowRoot?.querySelectorAll('.tab-item');
            (tabs?.[1] as HTMLElement).click();
            await element.updateComplete;

            const saveBtn = element.shadowRoot?.querySelector('button.primary');
            (saveBtn as HTMLElement).click();
            await element.updateComplete;

            expect(consoleSpy).toHaveBeenCalledWith('Failed to save strategy:', expect.any(Error));
        });

        it('should handle saveSettings failure', async () => {
            mocks.setIrrigationSettings.mockRejectedValueOnce(new Error('API Error'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            // Directly call private method as it is not currently exposed in UI
            await (element as any)._saveSettings();

            expect(consoleSpy).toHaveBeenCalledWith('Failed to save settings:', expect.any(Error));
        });
    });

    describe('Edge Cases', () => {
        it('should handle undefined parseScheduleString inputs', () => {
            const result = (element as any)._parseScheduleString(undefined);
            expect(result).toEqual([]);
        });

        it('should return array if input is already array', () => {
            const arr = [{ time: '12:00', duration: 60 }];
            const result = (element as any)._parseScheduleString(arr);
            expect(result).toBe(arr);
        });

        it('should parse valid schedule strings', () => {
            const result = (element as any)._parseScheduleString('12:00|60, 14:00|120');
            expect(result).toEqual([
                { time: '12:00', duration: 60 },
                { time: '14:00', duration: 120 }
            ]);
        });

        it('should initialize state correctly without device', () => {
            element.device = undefined;
            (element as any)._initializeState();
            // Should just return safely
            expect((element as any)._irrigationTimes).toEqual([]);
        });

        it('should initialize state with empty config', () => {
            element.device = { deviceId: '1' } as any;
            (element as any)._initializeState();
            expect((element as any)._irrigationPumpEntity).toBe('');
            expect((element as any)._irrigationDuration).toBe(60);
        });

        it('should NOT overwrite state on subsequent device property changes if already open', async () => {
            document.body.appendChild(element); // Connect to DOM
            element.open = true;
            await element.updateComplete;

            expect((element as any)._irrigationDuration).toBe(60);

            element.device = {
                ...mockDevice,
                irrigationConfig: { ...mockDevice.irrigationConfig, irrigationDuration: 999 }
            } as any;
            await element.updateComplete;

            expect((element as any)._irrigationDuration).toBe(60);
        });

        it('should create DataService if missing when hass changes', async () => {
            document.body.appendChild(element); // Connect to DOM
            // force dataService undefined
            (element as any)._dataService = undefined;
            element.hass = { ...element.hass }; // Trigger update
            await element.updateComplete;

            expect((element as any)._dataService).toBeDefined();
        });

        it('should handle canceling add time dialog', async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            // Open Add Dialog
            const addBtns = element.shadowRoot?.querySelectorAll('button.primary');
            (addBtns?.[0] as HTMLElement).click();
            await element.updateComplete;

            expect(element.shadowRoot?.querySelector('.overlay-backdrop')).toBeTruthy();

            // Click Cancel
            const cancelBtn = Array.from(element.shadowRoot?.querySelectorAll('button.tonal') || [])
                .find(b => b.textContent?.includes('Cancel'));
            (cancelBtn as HTMLElement).click();
            await element.updateComplete;

            expect(element.shadowRoot?.querySelector('.overlay-backdrop')).toBeFalsy();
        });

        it('should handle canceling by clicking backdrop', async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            // Open Add Dialog
            const addBtns = element.shadowRoot?.querySelectorAll('button.primary');
            (addBtns?.[0] as HTMLElement).click();
            await element.updateComplete;

            const backdrop = element.shadowRoot?.querySelector('.overlay-backdrop') as HTMLElement;
            expect(backdrop).toBeTruthy();
            backdrop.click();
            await element.updateComplete;

            expect(element.shadowRoot?.querySelector('.overlay-backdrop')).toBeFalsy();
        });

        it('should open add time dialog by clicking time bar', async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            // Mock getBoundingClientRect
            const timeBar = element.shadowRoot?.querySelector('.irrigation-time-bar') as HTMLElement;
            // timeBar click logic uses clientX relative to rect.left

            // We can't easily mock the MouseEvent clientX relative to rect in JSDOM cleanly without custom event construction
            // but we can just trigger the click and ensure the method calls expected private logic (or checks UI result)

            // Just simulate click
            const mockEvent = {
                currentTarget: timeBar,
                clientX: 50,
                stopPropagation: vi.fn(),
                preventDefault: vi.fn()
            };

            // Call the handler directly if possible or simulate click?
            // Since we can't easily pass clientX to click() method on element, 
            // We'll dispatch a MouseEvent
            const rect = { left: 0, width: 100 };
            vi.spyOn(timeBar, 'getBoundingClientRect').mockReturnValue(rect as DOMRect);

            timeBar.dispatchEvent(new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                clientX: 50
            }));
            await element.updateComplete;

            expect(element.shadowRoot?.querySelector('.overlay-backdrop')).toBeTruthy();
        });

        it('should handle API calls safely if device/service is missing', async () => {
            element.device = undefined;
            const consoleSpy = vi.spyOn(console, 'error');

            await (element as any)._saveSettings();
            await (element as any)._addIrrigationTime('12:00');
            await (element as any)._removeIrrigationTime('12:00');
            await (element as any)._addDrainTime('12:00');
            await (element as any)._removeDrainTime('12:00');
            await (element as any)._saveStrategy();

            // Should simply return without error/call
            expect(mocks.setIrrigationSettings).not.toHaveBeenCalled();
        });
    });

    describe('Additional Interactions', () => {
        beforeEach(async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;
        });

        it('should switch tabs back and forth', async () => {
            const tabs = element.shadowRoot?.querySelectorAll('.tab-item') as NodeListOf<HTMLElement>;

            // Click Steering
            tabs[1].click();
            await element.updateComplete;
            expect((element as any)._activeTab).toBe('steering');
            expect(element.shadowRoot?.querySelector('.form-grid')).toBeTruthy();

            // Click Schedules
            tabs[0].click();
            await element.updateComplete;
            expect((element as any)._activeTab).toBe('schedules');
            expect(element.shadowRoot?.querySelector('.time-bar-container')).toBeTruthy();
        });

        it('should dispatch close event', async () => {
            const spy = vi.fn();
            element.addEventListener('close', spy);

            const closeBtn = element.shadowRoot?.querySelector('.dialog-header button');
            (closeBtn as HTMLElement).click();

            expect(spy).toHaveBeenCalled();
        });

        it('should update all strategy fields', async () => {
            const tabs = element.shadowRoot?.querySelectorAll('.tab-item') as NodeListOf<HTMLElement>;
            tabs[1].click();
            await element.updateComplete;

            const strategyFields = [
                { label: 'Target VWC (%)', key: 'targetVwcPercent', val: '60', expected: 60 },
                { label: 'Dryback (%)', key: 'maintenanceDrybackPercent', val: '5', expected: 5 },
                { label: 'P0 Duration (min)', key: 'p0DurationMinutes', val: '30', expected: 30 },
                { label: 'P2 Stop Buffer (min)', key: 'p2StopBeforeLightsOffMinutes', val: '60', expected: 60 },
                { label: 'Shot Duration (sec)', key: 'shotDurationSeconds', val: '10', expected: 10 },
                { label: 'Shot Interval (min)', key: 'shotIntervalMinutes', val: '20', expected: 20 },
            ];

            for (const field of strategyFields) {
                const input = Array.from(element.shadowRoot?.querySelectorAll('md3-number-input') || [])
                    .find(el => el.getAttribute('label') === field.label) as any;

                expect(input).toBeTruthy();

                input.value = field.val;
                input.dispatchEvent(new CustomEvent('change', { detail: field.val }));
            }

            await element.updateComplete;
            const saveBtn = element.shadowRoot?.querySelector('button.primary') as HTMLElement;
            saveBtn.click();

            expect(mocks.setIrrigationStrategy).toHaveBeenCalledWith('gs1', expect.objectContaining({
                targetVwcPercent: 60,
                maintenanceDrybackPercent: 5,
                p0DurationMinutes: 30,
                p2StopBeforeLightsOffMinutes: 60,
                shotDurationSeconds: 10,
                shotIntervalMinutes: 20
            }));
        });
    });

    describe('Coverage Gap Fillers', () => {
        it('should not add irrigation time without device', async () => {
            (element as any).device = undefined;
            await (element as any)._addIrrigationTime('10:00');

            expect(mocks.addIrrigationTime).not.toHaveBeenCalled();
        });

        it('should parse schedule string with duration', () => {
            const result = (element as any)._parseScheduleString('08:00|120,12:00|90');
            expect(result).toHaveLength(2);
            expect(result[0].time).toBe('08:00');
            expect(result[0].duration).toBe(120);
            expect(result[1].time).toBe('12:00');
            expect(result[1].duration).toBe(90);
        });

        it('should parse schedule string without duration', () => {
            const result = (element as any)._parseScheduleString('08:00,12:00');
            expect(result).toHaveLength(2);
            expect(result[0].duration).toBeUndefined();
        });

        it('should return empty array for empty schedule string', () => {
            const result = (element as any)._parseScheduleString('');
            expect(result).toEqual([]);
        });

        it('should not add drain time without device', async () => {
            (element as any).device = undefined;
            await (element as any)._addDrainTime('10:00');

            expect(mocks.addDrainTime).not.toHaveBeenCalled();
        });

        it('should not remove drain time without device', async () => {
            (element as any).device = undefined;
            await (element as any)._removeDrainTime('08:30');

            expect(mocks.removeDrainTime).not.toHaveBeenCalled();
        });
    });

    describe('Drain Add Dialog', () => {
        it('should handle canceling drain add dialog via backdrop', async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const addBtns = element.shadowRoot?.querySelectorAll('button.primary');
            const addDrainBtn = Array.from(addBtns || []).filter(b => b.textContent?.includes('ADD TIME'))[1];
            (addDrainBtn as HTMLElement).click();
            await element.updateComplete;

            const backdrop = element.shadowRoot?.querySelector('.overlay-backdrop') as HTMLElement;
            backdrop.click();
            await element.updateComplete;
            expect(element.shadowRoot?.querySelector('.overlay-backdrop')).toBeFalsy();
        });

        it('should handle canceling drain add dialog via button', async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const addBtns = element.shadowRoot?.querySelectorAll('button.primary');
            const addDrainBtn = Array.from(addBtns || []).filter(b => b.textContent?.includes('ADD TIME'))[1];
            (addDrainBtn as HTMLElement).click();
            await element.updateComplete;

            const cancelBtn = Array.from(element.shadowRoot?.querySelectorAll('button.tonal') || [])
                .find(b => b.textContent?.includes('Cancel'));
            (cancelBtn as HTMLElement).click();
            await element.updateComplete;
            expect(element.shadowRoot?.querySelector('.overlay-backdrop')).toBeFalsy();
        });

        it('should update drain add dialog fields', async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            const addBtns = element.shadowRoot?.querySelectorAll('button.primary');
            const addDrainBtn = Array.from(addBtns || []).filter(b => b.textContent?.includes('ADD TIME'))[1];
            (addDrainBtn as HTMLElement).click();
            await element.updateComplete;

            const overlay = element.shadowRoot?.querySelector('.overlay-backdrop');
            const timeInput = overlay?.querySelector('md3-text-input') as any;
            const durInput = overlay?.querySelector('md3-number-input') as any;

            timeInput.value = '13:00'; timeInput.dispatchEvent(new CustomEvent('change', { detail: '13:00' }));
            durInput.dispatchEvent(new CustomEvent('change', { detail: '15' }));
            await element.updateComplete;

            expect((element as any)._addingDrainTime.time).toBe('13:00');
            expect((element as any)._addingDrainTime.duration).toBe(15);
        });

        it('should parse schedule string with duration and spaces', () => {
            const result = (element as any)._parseScheduleString(' 08:00 | 120 , 12:00 | 90 ');
            expect(result).toHaveLength(2);
            expect(result[0].time).toBe('08:00');
            expect(result[0].duration).toBe(120);
        });

        it('should add irrigation time with default duration fallback', async () => {
            document.body.appendChild(element);
            element.open = true;
            await element.updateComplete;

            // Directly call private method to skip UI interaction complexity for this specific branch
            await (element as any)._addIrrigationTime('10:00', undefined);

            expect(mocks.addIrrigationTime).toHaveBeenCalledWith(expect.objectContaining({
                duration: 60 // default
            }));
            document.body.removeChild(element);
        });

        it('should add drain time with default duration fallback', async () => {
            document.body.appendChild(element);
            element.open = true;
            await element.updateComplete;

            await (element as any)._addDrainTime('10:00', undefined);

            expect(mocks.addDrainTime).toHaveBeenCalledWith(expect.objectContaining({
                duration: 60 // default
            }));
            document.body.removeChild(element);
        });

        it('should update lights_on_time using event detail fallback', async () => {
            document.body.appendChild(element);
            element.open = true;
            (element as any)._activeTab = 'steering';
            await element.updateComplete;

            const dateInput = element.shadowRoot?.querySelector('md3-text-input[label="Lights On Time"]');
            expect(dateInput).toBeTruthy();

            // Simulate event where target.value is empty but e.detail has value
            const evt = new CustomEvent('change', { detail: '07:00' });
            // We can't easily force target.value to be empty if it's bound, but we can dispatch against a fake target
            // Or just mock the event target
            Object.defineProperty(evt, 'target', { value: { value: '' }, writable: true });

            dateInput?.dispatchEvent(evt);
            await element.updateComplete;

            expect((element as any)._strategy.lightsOnTime).toBe('07:00');
            document.body.removeChild(element);
        });

        it('should handle missing container when clicking add time button', async () => {
            document.body.appendChild(element);
            element.open = true;
            await element.updateComplete;

            const addBtn = element.shadowRoot?.querySelector('.detail-card button.primary');
            expect(addBtn).toBeTruthy();

            // Spy on closest to return null
            const originalClosest = HTMLElement.prototype.closest;
            HTMLElement.prototype.closest = vi.fn().mockReturnValue(null);

            // This effectively covers the if (container) false branch
            (addBtn as HTMLElement).click();

            // Restore
            HTMLElement.prototype.closest = originalClosest;
            document.body.removeChild(element);
        });

        it('should handle drain time bar click', async () => {
            document.body.appendChild(element);
            element.open = true;
            await element.updateComplete;

            // Find drain time bar
            const drainTimeBar = element.shadowRoot?.querySelector('.drain-time-bar');
            expect(drainTimeBar).toBeTruthy();

            // trigger click
            (drainTimeBar as HTMLElement).click();

            expect((element as any)._addingDrainTime).toBeDefined();
            document.body.removeChild(element);
        });

        it('should not delete time when edit dialog is cancelled', async () => {
            document.body.appendChild(element);
            element.open = true;
            await element.updateComplete;

            mocks.removeIrrigationTime.mockClear();

            const marker = element.shadowRoot?.querySelector('.chart-marker');
            (marker as HTMLElement).click();
            await element.updateComplete;

            const editOverlay = element.shadowRoot?.querySelector('.overlay-backdrop');
            const cancelBtn = Array.from(editOverlay?.querySelectorAll('button.tonal') || [])
                .find(b => b.textContent?.includes('Cancel'));

            (cancelBtn as HTMLElement).click();
            await element.updateComplete;

            expect(mocks.removeIrrigationTime).not.toHaveBeenCalled();
            expect(element.shadowRoot?.querySelector('.overlay-backdrop')).toBeFalsy();

            document.body.removeChild(element);
        });

        it('should handle adding time inputs with null/invalid values', async () => {
            document.body.appendChild(element);
            element.open = true;
            await element.updateComplete;

            // Activate adding mode
            (element as any)._addingIrrigationTime = { time: '12:00', duration: 60 };
            await element.updateComplete;

            // Find inputs in overlay
            const overlay = element.shadowRoot?.querySelector('.overlay-backdrop');
            const textInput = overlay?.querySelector('md3-text-input');
            const numInput = overlay?.querySelector('md3-number-input'); // duration

            // Test text input change from detail fallback
            const evt = new CustomEvent('change', { detail: '12:30' });
            Object.defineProperty(evt, 'target', { value: { value: '' }, writable: true });
            textInput?.dispatchEvent(evt);

            expect((element as any)._addingIrrigationTime.time).toBe('12:30');

            // Test number input with NaN
            const nanEvt = new CustomEvent('change', { detail: 'invalid' });
            numInput?.dispatchEvent(nanEvt);

            // Valid change
            const validEvt = new CustomEvent('change', { detail: '120' });
            numInput?.dispatchEvent(validEvt);
            expect((element as any)._addingIrrigationTime.duration).toBe(120);

            document.body.removeChild(element);
        });


        describe('drain time', () => {
            it('should handle adding time inputs with null/invalid values', async () => {
                document.body.appendChild(element);
                element.open = true;
                await element.updateComplete;

                // Activate adding mode
                (element as any)._addingDrainTime = { time: '12:00', duration: 60 };
                await element.updateComplete;

                // Find inputs in overlay
                const overlay = element.shadowRoot?.querySelector('.overlay-backdrop');
                const textInput = overlay?.querySelector('md3-text-input');
                const numInput = overlay?.querySelector('md3-number-input'); // duration

                // Test text input change from detail fallback
                const evt = new CustomEvent('change', { detail: '12:30' });
                Object.defineProperty(evt, 'target', { value: { value: '' }, writable: true });
                textInput?.dispatchEvent(evt);

                expect((element as any)._addingDrainTime.time).toBe('12:30');

                // Test number input with NaN
                const nanEvt = new CustomEvent('change', { detail: 'invalid' });
                numInput?.dispatchEvent(nanEvt);

                // Valid change
                const validEvt = new CustomEvent('change', { detail: '120' });
                numInput?.dispatchEvent(validEvt);
                expect((element as any)._addingDrainTime.duration).toBe(120);

                document.body.removeChild(element);
            });
        });

        it('should render time item using default duration when missing in object', async () => {
            document.body.appendChild(element);
            const deviceWithMissionDuration = {
                ...mockDevice,
                irrigationConfig: {
                    ...mockDevice.irrigationConfig!,
                    irrigationTimes: [{ time: '09:00' }] // no duration
                }
            };
            element.device = deviceWithMissionDuration as any;
            element.open = true;
            await element.updateComplete;

            const markers = element.shadowRoot?.querySelectorAll('.chart-marker');
            const tooltip = markers?.[0]?.querySelector('.chart-tooltip');
            expect(tooltip?.textContent).toContain('09:00 | 60s');

            document.body.removeChild(element);
        });
    });

    describe('Branch Coverage (v2)', () => {
        it('should handle willUpdate with various property changes', async () => {
            document.body.appendChild(element);

            const initSpy = vi.spyOn(element as any, '_initializeState');

            // 1. open becomes true
            element.open = true;
            await element.updateComplete;
            expect(initSpy).toHaveBeenCalledTimes(1);
            initSpy.mockClear();

            // Trigger update by changing a property that is NOT 'open'
            element.hass = { ...element.hass };
            await element.updateComplete;
            expect(initSpy).not.toHaveBeenCalled();

            // 2. device changes while already open
            element.device = { ...mockDevice, name: 'New Name' };
            await element.updateComplete;
            expect(initSpy).not.toHaveBeenCalled();
        });

        it('should fallback to defaults in _initializeState when strategy fields are missing', async () => {
            element.device = {
                ...mockDevice,
                irrigationStrategy: { enabled: true } as any // missing other fields
            };
            (element as any)._initializeState();

            expect((element as any)._strategy.lightsOnTime).toBe('06:00:00');
            expect((element as any)._strategy.p0DurationMinutes).toBe(60);
        });

        it('should handle _updateStrategyField directly', () => {
            (element as any)._updateStrategyField('enabled', true);
            expect((element as any)._strategy.enabled).toBe(true);
        });
    });

    describe('Configuration Tab', () => {
        beforeEach(async () => {
            // Setup Hass with mock entities
            element.hass = {
                states: {
                    'switch.pump1': { entity_id: 'switch.pump1', attributes: { friendly_name: 'Pump 1' } },
                    'input_boolean.valve': { entity_id: 'input_boolean.valve', attributes: { friendly_name: 'Valve A' } },
                    'light.grow': { entity_id: 'light.grow', attributes: { friendly_name: 'Grow Light' } }, // Should be filtered out
                    'switch.pump2': { entity_id: 'switch.pump2', attributes: { friendly_name: 'Pump 2' } },
                    'switch.bare': { entity_id: 'switch.bare', attributes: {} }
                }
            } as any;

            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            // Switch to Config Tab
            const tabs = element.shadowRoot?.querySelectorAll('.tab-item');
            (tabs?.[2] as HTMLElement).click();
            await element.updateComplete;
        });

        it('should render configuration tab content', () => {
            const section = element.shadowRoot?.querySelector('.schedule-section');
            expect(section).toBeTruthy();
            expect(section?.innerHTML).toContain('Pump Configuration');
        });

        it('should populate entity selects with filtered and sorted entities', () => {
            const selects = element.shadowRoot?.querySelectorAll('select');
            const pumpSelect = selects?.[0]; // Irrigation Pump

            const options = Array.from(pumpSelect?.querySelectorAll('option') || []).map(o => o.value).filter(v => v);

            // Should contain switches and input_booleans, but not lights
            expect(options).toContain('switch.pump1');
            expect(options).toContain('input_boolean.valve');
            expect(options).toContain('switch.pump2');
            expect(options).toContain('switch.bare');
            expect(options).not.toContain('light.grow');
            // Check sorting if needed, but existence is key for coverage
        });

        it('should update irrigation pump entity on change', async () => {
            const selects = element.shadowRoot?.querySelectorAll('select');
            const pumpSelect = selects?.[0]; // First one is irrigation pump

            expect(pumpSelect).toBeTruthy();

            // Simulating change
            pumpSelect!.value = 'switch.pump2';
            pumpSelect!.dispatchEvent(new Event('change'));
            await element.updateComplete;

            // Verify state update by checking what happens on save
            const saveBtn = element.shadowRoot?.querySelector('button.primary');
            (saveBtn as HTMLElement).click();

            expect(mocks.setIrrigationSettings).toHaveBeenCalledWith(expect.objectContaining({
                irrigationPumpEntity: 'switch.pump2'
            }));
        });

        it('should update drain pump entity on change', async () => {
            const selects = element.shadowRoot?.querySelectorAll('select');
            const drainSelect = selects?.[1]; // Second one is drain pump

            expect(drainSelect).toBeTruthy();

            drainSelect!.value = 'input_boolean.valve';
            drainSelect!.dispatchEvent(new Event('change'));
            await element.updateComplete;

            const saveBtn = element.shadowRoot?.querySelector('button.primary');
            (saveBtn as HTMLElement).click();

            expect(mocks.setIrrigationSettings).toHaveBeenCalledWith(expect.objectContaining({
                drainPumpEntity: 'input_boolean.valve'
            }));
        });

        it('should handle missing hass safely in _getEntities', async () => {
            element.hass = undefined as any;
            await element.requestUpdate();
            await element.updateComplete;

            // Re-render to trigger _getEntities
            const tabs = element.shadowRoot?.querySelectorAll('.tab-item');
            (tabs?.[2] as HTMLElement).click();
            await element.updateComplete;

            const selects = element.shadowRoot?.querySelectorAll('select');
            expect(selects?.length).toBeGreaterThan(0);
            const options = selects?.[0]?.querySelectorAll('option');
            // Should have 1 option (None)
            expect(options?.length).toBe(1);
        });
    });

    describe('Tanks Tab', () => {
        beforeEach(async () => {
            element.open = true;
            element.device = {
                ...mockDevice,
                environmentAttributes: {
                    irrigationTanks: [
                        { name: 'Main Tank', fillLevel: 75, isWarning: false, warningLevel: 20 },
                        { name: 'Reserve Tank', fillLevel: 15, isWarning: true, warningLevel: 20 },
                        { name: 'Empty Tank', fillLevel: null, isWarning: true, warningLevel: 10 }
                    ]
                }
            } as any;
            document.body.appendChild(element);
            await element.updateComplete;

            // Switch to Tanks Tab
            const tabs = element.shadowRoot?.querySelectorAll('.tab-item');
            (tabs?.[3] as HTMLElement).click();
            await element.updateComplete;
        });

        it('should render tank cards', () => {
            const tankCards = element.shadowRoot?.querySelectorAll('.tank-card');
            expect(tankCards?.length).toBe(3);
        });

        it('should render main tank with correct level', () => {
            const mainTank = element.shadowRoot?.querySelector('.tank-card:nth-child(1)');
            expect(mainTank?.textContent).toContain('Main Tank');
            expect(mainTank?.querySelector('.percentage-text')?.textContent).toContain('75%');
            expect(mainTank?.classList.contains('warning')).toBe(false);
        });

        it('should render reserve tank with warning', () => {
            const reserveTank = element.shadowRoot?.querySelector('.tank-card:nth-child(2)');
            expect(reserveTank?.textContent).toContain('Reserve Tank');
            expect(reserveTank?.querySelector('.percentage-text')?.textContent).toContain('15%');
            expect(reserveTank?.classList.contains('warning')).toBe(true);
            expect(reserveTank?.querySelector('.warning-icon')).toBeTruthy();
        });

        it('should handle null fill level', () => {
            const emptyTank = element.shadowRoot?.querySelector('.tank-card:nth-child(3)');
            const percentageText = emptyTank?.querySelector('.percentage-text');
            // We want to make sure it contains 'N/A' and NOT '0%'
            expect(percentageText?.textContent).toContain('N/A');
            expect(percentageText?.textContent).not.toContain('0%');
        });

        it('should render empty state when no tanks configured', async () => {
            element.device = {
                ...mockDevice,
                environmentAttributes: { irrigationTanks: [] }
            } as any;
            await element.updateComplete;

            expect(element.shadowRoot?.textContent).toContain('No irrigation tanks configured');
        });

        it('should render empty state when environmentAttributes is missing', async () => {
            element.device = { ...mockDevice, environmentAttributes: undefined } as any;
            await element.updateComplete;

            expect(element.shadowRoot?.textContent).toContain('No irrigation tanks configured');
        });
    });

    describe('Additional Branch Coverage', () => {
        it('should handle formatting time in _addIrrigationTime', async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            // Test HH:MM format (should append :00)
            await (element as any)._addIrrigationTime('10:00');
            expect(mocks.addIrrigationTime).toHaveBeenCalledWith(expect.objectContaining({
                time: '10:00:00'
            }));

            // Test HH:MM:SS format (should remain same)
            await (element as any)._addIrrigationTime('11:11:11');
            expect(mocks.addIrrigationTime).toHaveBeenCalledWith(expect.objectContaining({
                time: '11:11:11'
            }));
        });

        it('should handle formatting time in _addDrainTime', async () => {
            element.open = true;
            document.body.appendChild(element);
            await element.updateComplete;

            // Test HH:MM format
            await (element as any)._addDrainTime('05:30');
            expect(mocks.addDrainTime).toHaveBeenCalledWith(expect.objectContaining({
                time: '05:30:00'
            }));
        });

        it('should notify data changed', () => {
            const spy = vi.fn();
            element.addEventListener('data-changed', spy);
            (element as any)._notifyDataChanged();
            expect(spy).toHaveBeenCalled();
        });

        it('should sort entities by friendly name or entity_id', async () => {
            element.hass = {
                states: {
                    'switch.z_last': { entity_id: 'switch.z_last', attributes: { friendly_name: 'Z' } },
                    'switch.a_first': { entity_id: 'switch.a_first', attributes: { friendly_name: 'A' } },
                    'switch.id_only': { entity_id: 'switch.id_only', attributes: {} },
                    'switch.another_id': { entity_id: 'switch.another_id', attributes: {} }
                }
            } as any;

            const entities = (element as any)._getEntities(['switch']);
            // A first (by friendly name)
            expect(entities[0].attributes.friendly_name).toBe('A');
            // another_id (by entity_id as no friendly_name)
            expect(entities[1].entity_id).toBe('switch.another_id');
            // id_only (by entity_id)
            expect(entities[2].entity_id).toBe('switch.id_only');
            // Z (by friendly name)
            expect(entities[3].attributes.friendly_name).toBe('Z');
        });

        it('should handle start_time in schedules', async () => {
            element.open = true;
            element.device = {
                ...mockDevice,
                irrigationConfig: {
                    ...mockDevice.irrigationConfig!,
                    irrigationTimes: [{ start_time: '11:00' } as any] // Using start_time instead of time
                }
            } as any;
            document.body.appendChild(element);
            await element.updateComplete;

            const markers = element.shadowRoot?.querySelectorAll('.chart-marker');
            expect(markers?.length).toBeGreaterThan(0);
            expect(markers?.[0].querySelector('.chart-tooltip')?.textContent).toContain('11:00');
        });

        it('should handle both time and start_time fallback in filter', async () => {
            element.hass = {} as any;
            element.open = true;
            element.device = {
                ...mockDevice,
                irrigationConfig: {
                    ...mockDevice.irrigationConfig!,
                    irrigationTimes: [
                        { time: '10:00' },
                        { start_time: '11:00' } as any,
                        { something_else: '12:00' } as any // should be filtered out
                    ]
                }
            } as any;
            document.body.appendChild(element);
            await element.updateComplete;

            const irrigationBar = element.shadowRoot?.querySelector('.irrigation-time-bar');
            const markers = irrigationBar?.querySelectorAll('.chart-marker');
            expect(markers?.length).toBe(2);
            document.body.removeChild(element);
        });

        it('should handle sorting with mixed time and start_time', async () => {
            element.hass = {} as any;
            element.open = true;
            element.device = {
                ...mockDevice,
                irrigationConfig: {
                    ...mockDevice.irrigationConfig!,
                    irrigationTimes: [{ start_time: '12:00' } as any]
                }
            } as any;
            // Connect to DOM to trigger willUpdate which creates _dataService
            document.body.appendChild(element);
            await element.updateComplete;

            await (element as any)._addIrrigationTime('11:00');

            const times = (element as any)._irrigationTimes;
            expect(times[0].time).toBe('11:00:00');
            expect(times[1].start_time).toBe('12:00');
            document.body.removeChild(element);
        });
    });
});
