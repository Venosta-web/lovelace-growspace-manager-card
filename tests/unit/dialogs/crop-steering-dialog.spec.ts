import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CropSteeringDialog } from '../../../src/dialogs/crop-steering-dialog';
import { GrowspaceDevice } from '../../../src/types';
import { GrowspaceType } from '../../../src/constants';
import { setDevices } from '../../../src/slices/grid';

// Mock UI components
class HaDialogMock extends HTMLElement {
    open = false;
}
customElements.define('ha-dialog', HaDialogMock);

class HaIconButtonMock extends HTMLElement {
    path = '';
}
customElements.define('ha-icon-button', HaIconButtonMock);

class HaSvgIconMock extends HTMLElement {
    path = '';
}
customElements.define('ha-svg-icon', HaSvgIconMock);

describe('CropSteeringDialog', () => {
    let element: CropSteeringDialog;
    let mockDevice: GrowspaceDevice;
    let mockStore: any;
    let mockHass: any;

    beforeEach(async () => {
        mockDevice = {
            deviceId: 'gs_123',
            name: 'Flower Tent 1',
            type: GrowspaceType.NORMAL,
            rows: 4,
            plantsPerRow: 4,
            plants: [],
            grid: {},
            biologicalMetrics: {} as any,
            environmentAttributes: {} as any,
            stats: {} as any,
            irrigationConfig: {} as any
        };

        setDevices([mockDevice]);

        mockStore = {
            ui: {
                closeDialog: vi.fn()
            },
        };

        mockHass = {
            states: {
                'sensor.flower_tent_1_crop_steering': {
                    state: '0.45',
                    attributes: {
                        steering_mode: 'generative',
                        dryback_percent: 15,
                        peak_vwc: 45,
                        trough_vwc: 30,
                        ec_trend: 'rising'
                    }
                }
            },
            localize: (key: string) => key
        };

        element = new CropSteeringDialog();
        (element as any).store = mockStore;
        (element as any).hass = mockHass;
        element.open = true;
        element.growspaceName = 'Flower Tent 1';
        element.dialogState = { growspaceId: 'gs_123' };
        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        document.body.removeChild(element);
        vi.clearAllMocks();
        setDevices([]);
    });

    it('should not render anything if not open', async () => {
        element.open = false;
        await element.updateComplete;
        expect(element.shadowRoot?.innerHTML).toContain('<!---->');
    });

    it('should render the dialog with correct title and growspace name', () => {
        const gsDialog = element.shadowRoot?.querySelector('gs-dialog') as any;
        expect(gsDialog?.heading).toBe('Crop Steering Diagnostics');
        expect(gsDialog?.subtitle).toBe('Flower Tent 1');
    });

    it('should display correct steering score and mode badge', () => {
        const score = element.shadowRoot?.querySelector('div[style*="font-size: 36px"]');
        const badge = element.shadowRoot?.querySelector('.mode-badge');

        expect(score?.textContent?.trim()).toBe('+0.45');
        expect(badge?.textContent?.trim()).toBe('GENERATIVE MODE');
        expect(badge?.classList.contains('mode-generative')).toBe(true);
    });

    it('should display metrics cards with correct values', () => {
        const cards = element.shadowRoot?.querySelectorAll('.metric-card');
        expect(cards?.length).toBe(4);

        const values = Array.from(cards!).map(c => c.querySelector('.metric-value')?.textContent?.trim());
        expect(values).toContain('15%'); // Dry-back
        expect(values).toContain('45%'); // Peak
        expect(values).toContain('30%'); // Trough
        expect(values).toContain('RISING'); // EC Trend
    });

    it('should handle different steering modes for badge styling', async () => {
        // Vegetative
        mockHass.states['sensor.flower_tent_1_crop_steering'].attributes.steering_mode = 'vegetative';
        element.requestUpdate();
        await element.updateComplete;
        let badge = element.shadowRoot?.querySelector('.mode-badge');
        expect(badge?.classList.contains('mode-vegetative')).toBe(true);

        // Balanced
        mockHass.states['sensor.flower_tent_1_crop_steering'].attributes.steering_mode = 'balanced';
        element.requestUpdate();
        await element.updateComplete;
        badge = element.shadowRoot?.querySelector('.mode-badge');
        expect(badge?.classList.contains('mode-balanced')).toBe(true);
    });

    it('should handle EC trends correctly', async () => {
        // Falling
        mockHass.states['sensor.flower_tent_1_crop_steering'].attributes.ec_trend = 'falling';
        element.requestUpdate();
        await element.updateComplete;
        const trendCard = Array.from(element.shadowRoot?.querySelectorAll('.metric-card')!).find(c => c.querySelector('.metric-label')?.textContent?.trim().startsWith('EC Trend'));
        expect(trendCard?.querySelector('.metric-value')?.textContent?.trim()).toBe('FALLING');

        // Stable/Unknown
        mockHass.states['sensor.flower_tent_1_crop_steering'].attributes.ec_trend = 'stable';
        element.requestUpdate();
        await element.updateComplete;
        expect(trendCard?.querySelector('.metric-value')?.textContent?.trim()).toBe('STABLE');
    });

    it('should show unavailable message when sensor is missing', async () => {
        element.dialogState = { growspaceId: 'unknown' };
        await element.updateComplete;

        expect(element.shadowRoot?.textContent).toContain('Crop steering data is currently unavailable');
    });

    it('should show unavailable message when score is NaN', async () => {
        mockHass.states['sensor.flower_tent_1_crop_steering'].state = 'unavailable';
        element.requestUpdate();
        await element.updateComplete;

        expect(element.shadowRoot?.textContent).toContain('Crop steering data is currently unavailable');
    });

    it('should close the dialog when the close button is clicked', async () => {
        const closeSpy = vi.fn();
        element.addEventListener('close', closeSpy);

        const gsDialog = element.shadowRoot?.querySelector('gs-dialog') as any;
        await gsDialog?.updateComplete;
        const closeBtn = gsDialog?.shadowRoot?.querySelector('button.dialog-close-btn') as HTMLButtonElement;
        closeBtn.click();

        expect(closeSpy).toHaveBeenCalled();
    });

    it('should propagate close when gs-dialog emits close event', () => {
        const closeSpy = vi.fn();
        element.addEventListener('close', closeSpy);

        const gsDialog = element.shadowRoot?.querySelector('gs-dialog');
        gsDialog?.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));

        expect(closeSpy).toHaveBeenCalled();
    });

    describe('_getEntityId slugification', () => {
        it('should correctly slugify growspace names', () => {
            const testNames = [
                { name: 'Flower Tent 1', expected: 'sensor.flower_tent_1_crop_steering' },
                { name: 'Mother   Room!', expected: 'sensor.mother_room_crop_steering' },
                { name: '---Veg@Room---', expected: 'sensor.vegroom_crop_steering' }
            ];

            testNames.forEach(({ name, expected }) => {
                setDevices([{ ...mockDevice, name }]);
                expect((element as any)._getEntityId()).toBe(expected);
            });
        });

        it('should return undefined if growspace not found', () => {
            element.dialogState = { growspaceId: 'nonexistent' };
            expect((element as any)._getEntityId()).toBeUndefined();
        });

        it('should return undefined if dialogState or growspaceId is missing', () => {
            element.dialogState = undefined;
            expect((element as any)._getEntityId()).toBeUndefined();

            element.dialogState = {} as any;
            expect((element as any)._getEntityId()).toBeUndefined();
        });
    });

    describe('_device private method', () => {
        it('should return undefined if dialogState is missing', () => {
            element.dialogState = undefined;
            expect((element as any)._device()).toBeUndefined();
        });

        it('should return undefined if growspaceId is missing', () => {
            element.dialogState = {} as any;
            expect((element as any)._device()).toBeUndefined();
        });

        it('should return the device if growspaceId matches a device in the store', () => {
            element.dialogState = { growspaceId: 'gs_123' };
            expect((element as any)._device()).toEqual(mockDevice);
        });
    });

    describe('_renderMetricCard help branch', () => {
        it('should render without help tooltip if help parameter is omitted or empty', () => {
            const cardOmitted = (element as any)._renderMetricCard('Title', 'Value', 'icon', 'color');
            expect(cardOmitted.values).toContain('');

            const cardEmpty = (element as any)._renderMetricCard('Title', 'Value', 'icon', 'color', '');
            expect(cardEmpty.values).toContain('');
        });
    });

    describe('Diagnostics Tab branch coverage', () => {
        it('should not prefix with plus sign if score is zero or negative', async () => {
            mockHass.states['sensor.flower_tent_1_crop_steering'].state = '-0.85';
            element.requestUpdate();
            await element.updateComplete;

            const scoreDiv = element.shadowRoot?.querySelector('div[style*="font-size: 36px"]');
            expect(scoreDiv?.textContent?.trim()).toBe('-0.85'); // No "+" prefix
        });

        it('should handle missing ec_trend gracefully', async () => {
            delete (mockHass.states['sensor.flower_tent_1_crop_steering'].attributes as any).ec_trend;
            element.requestUpdate();
            await element.updateComplete;

            const trendCard = Array.from(element.shadowRoot?.querySelectorAll('.metric-card')!).find(c => c.querySelector('.metric-label')?.textContent?.trim().startsWith('EC Trend'));
            expect(trendCard?.querySelector('.metric-value')?.textContent?.trim()).toBe('STABLE');
        });

        it('should fallback to 0% if metric attributes are missing', async () => {
            mockHass.states['sensor.flower_tent_1_crop_steering'].attributes = {
                steering_mode: 'generative',
                ec_trend: 'rising'
            }; // Omit dryback_percent, peak_vwc, trough_vwc
            element.requestUpdate();
            await element.updateComplete;

            const cards = element.shadowRoot?.querySelectorAll('.metric-card');
            expect(cards?.length).toBe(4);

            const drybackCard = Array.from(cards!).find(c => c.querySelector('.metric-label')?.textContent?.trim().startsWith('Dry-back'));
            const peakCard = Array.from(cards!).find(c => c.querySelector('.metric-label')?.textContent?.trim().startsWith('Peak'));
            const troughCard = Array.from(cards!).find(c => c.querySelector('.metric-label')?.textContent?.trim().startsWith('Trough'));

            expect(drybackCard?.querySelector('.metric-value')?.textContent?.trim()).toBe('0%');
            expect(peakCard?.querySelector('.metric-value')?.textContent?.trim()).toBe('0%');
            expect(troughCard?.querySelector('.metric-value')?.textContent?.trim()).toBe('0%');
        });
    });

    describe('Private state machine helper methods', () => {
        it('should transition the state machine correctly via _transition', () => {
            expect((element as any)._sm.toast).toBeUndefined();
            (element as any)._transition({ type: 'SET_TOAST', message: 'Test Toast Message' });
            expect((element as any)._sm.toast).toBe('Test Toast Message');
        });

        describe('_switchTab', () => {
            it('should switch tab directly when device is nonexistent', () => {
                element.dialogState = { growspaceId: 'nonexistent' };
                (element as any)._switchTab('settings');
                expect((element as any)._sm.activeTab).toBe('settings');
            });

            it('should switch tab directly when device exists but tab is not dirty', () => {
                (element as any)._switchTab('settings');
                expect((element as any)._sm.activeTab).toBe('settings');
            });

            it('should request tab switch when device exists and active tab is dirty', () => {
                // First switch to settings tab so it's the active tab
                (element as any)._switchTab('settings');
                expect((element as any)._sm.activeTab).toBe('settings');

                // Make the settings tab dirty by changing the draft phase
                (element as any)._sm.tabs.settings.draft.phase = 'p3'; // device default or config is usually 'p2' or undefined

                // Try to switch back to diagnostics
                (element as any)._switchTab('diagnostics');

                // It should request a tab switch (pending tab status) rather than switching immediately
                expect((element as any)._sm.activeTab).toBe('settings');
                expect((element as any)._sm.status.kind).toBe('confirm-discard');
                expect((element as any)._sm.status.pendingTab).toBe('diagnostics');
            });
        });

        describe('_confirmDiscard', () => {
            it('should do nothing when device is nonexistent', () => {
                element.dialogState = { growspaceId: 'nonexistent' };
                const initialSm = { ...((element as any)._sm) };
                (element as any)._confirmDiscard();
                expect((element as any)._sm).toEqual(initialSm);
            });

            it('should discard changes and switch tab when device exists', () => {
                // Set activeSteeringPhase on device so it resets to it
                setDevices([{ ...mockDevice, irrigationConfig: { activeSteeringPhase: 'p2' } as any }]);

                // Set up pending switch status
                (element as any)._sm.status = { kind: 'confirm-discard', pendingTab: 'settings' };
                (element as any)._sm.tabs.settings.draft.phase = 'p3'; // changed draft

                (element as any)._confirmDiscard();

                expect((element as any)._sm.status.kind).toBe('idle');
                expect((element as any)._sm.activeTab).toBe('settings');
                // The draft should be reset to device value
                expect((element as any)._sm.tabs.settings.draft.phase).toBe('p2');
            });
        });

        describe('_requestTabSwitch', () => {
            it('should do nothing when device is nonexistent', () => {
                element.dialogState = { growspaceId: 'nonexistent' };
                const initialSm = { ...((element as any)._sm) };
                (element as any)._requestTabSwitch('settings');
                expect((element as any)._sm).toEqual(initialSm);
            });

            it('should request tab switch when device exists', () => {
                (element as any)._requestTabSwitch('settings');
                expect((element as any)._sm.activeTab).toBe('settings');
            });
        });
    });
});
