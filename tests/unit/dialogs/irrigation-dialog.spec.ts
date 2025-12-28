
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IrrigationDialog } from '../../../src/dialogs/irrigation-dialog';
import { GrowspaceDevice } from '../../../src/types';

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
    setIrrigationSettings: vi.fn(),
    addIrrigationTime: vi.fn(),
    removeIrrigationTime: vi.fn(),
    addDrainTime: vi.fn(),
    removeDrainTime: vi.fn(),
    setIrrigationStrategy: vi.fn()
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
        device_id: 'gs1',
        name: 'Growspace 1',
        type: 'normal',
        rows: 4,
        plants_per_row: 4,
        plants: [],
        grid: {},
        biological_metrics: {} as any,
        environment_attributes: {} as any,
        stats: {} as any,
        irrigation_config: {
            irrigation_pump_entity: 'switch.pump',
            drain_pump_entity: 'switch.drain',
            irrigation_duration: 60,
            drain_duration: 60,
            irrigation_times: [{ time: '08:00', duration: 60 }],
            drain_times: [{ time: '08:30', duration: 60 }]
        },
        irrigation_strategy: {
            enabled: false,
            lights_on_time: '06:00',
            p0_duration_minutes: 60,
            p2_stop_before_lights_off_minutes: 120,
            target_vwc_percent: 45,
            maintenance_dryback_percent: 3,
            shot_duration_seconds: 15,
            shot_interval_minutes: 15
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
                growspace_id: 'gs1',
                time: '12:00',
                duration: 120
            }));
        });

        it('should remove irrigation time', async () => {
            // Mock window.confirm
            const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);

            const markers = element.shadowRoot?.querySelectorAll('.chart-marker');
            const irrigationMarker = markers?.[0]; // Assuming order or detail checking.
            // First marker is usually irrigation based on render order (Irrigation Schedule first)

            (irrigationMarker as HTMLElement).click();
            await element.updateComplete;

            expect(confirmSpy).toHaveBeenCalled();
            expect(mocks.removeIrrigationTime).toHaveBeenCalledWith(expect.objectContaining({
                growspace_id: 'gs1',
                time: '08:00'
            }));
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
                growspace_id: 'gs1',
                time: '14:00',
                duration: 45
            }));
        });

        it('should remove drain time', async () => {
            const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);

            // Drain markers are likely in the second time-bar container or just all markers with click handler?
            // The render loop is: irrigation markers then drain markers?
            // No, checks which section.

            // Let's target the marker specifically in the drain section.
            const drainSection = element.shadowRoot?.querySelectorAll('.detail-card')[1]; // Second card is drain
            const drainMarker = drainSection?.querySelector('.chart-marker');
            expect(drainMarker).toBeTruthy();

            (drainMarker as HTMLElement).click();
            await element.updateComplete;

            expect(confirmSpy).toHaveBeenCalled();
            expect(mocks.removeDrainTime).toHaveBeenCalledWith(expect.objectContaining({
                growspace_id: 'gs1',
                time: '08:30'
            }));
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
                target_vwc_percent: 55
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
                lights_on_time: '08:00'
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
            vi.spyOn(window, 'confirm').mockImplementation(() => true);

            const markers = element.shadowRoot?.querySelectorAll('.chart-marker');
            (markers?.[0] as HTMLElement).click();
            await element.updateComplete;

            expect(consoleSpy).toHaveBeenCalledWith('Failed to remove irrigation time:', expect.any(Error));
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
            vi.spyOn(window, 'confirm').mockImplementation(() => true);

            const drainSection = element.shadowRoot?.querySelectorAll('.detail-card')[1];
            const drainMarker = drainSection?.querySelector('.chart-marker');
            (drainMarker as HTMLElement).click();
            await element.updateComplete;

            expect(consoleSpy).toHaveBeenCalledWith('Failed to remove drain time:', expect.any(Error));
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
            expect((element as any)._irrigation_times).toEqual([]);
        });

        it('should initialize state with empty config', () => {
            element.device = { device_id: '1' } as any;
            (element as any)._initializeState();
            expect((element as any)._irrigation_pump_entity).toBe('');
            expect((element as any)._irrigation_duration).toBe(60);
        });

        it('should re-initialize state when device property changes', async () => {
            document.body.appendChild(element); // Connect to DOM
            element.device = {
                ...mockDevice,
                irrigation_config: { ...mockDevice.irrigation_config, irrigation_duration: 999 }
            } as any;
            await element.updateComplete;

            expect((element as any)._irrigation_duration).toBe(999);
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
                { label: 'Target VWC (%)', key: 'target_vwc_percent', val: '60', expected: 60 },
                { label: 'Dryback (%)', key: 'maintenance_dryback_percent', val: '5', expected: 5 },
                { label: 'P0 Duration (min)', key: 'p0_duration_minutes', val: '30', expected: 30 },
                { label: 'P2 Stop Buffer (min)', key: 'p2_stop_before_lights_off_minutes', val: '60', expected: 60 },
                { label: 'Shot Duration (sec)', key: 'shot_duration_seconds', val: '10', expected: 10 },
                { label: 'Shot Interval (min)', key: 'shot_interval_minutes', val: '20', expected: 20 },
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
                target_vwc_percent: 60,
                maintenance_dryback_percent: 5,
                p0_duration_minutes: 30,
                p2_stop_before_lights_off_minutes: 60,
                shot_duration_seconds: 10,
                shot_interval_minutes: 20
            }));
        });
    });
});
