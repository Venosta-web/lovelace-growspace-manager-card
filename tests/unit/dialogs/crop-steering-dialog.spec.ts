import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CropSteeringDialog } from '../../../src/dialogs/crop-steering-dialog';
import { GrowspaceDevice } from '../../../src/types';
import { GrowspaceType } from '../../../src/constants';

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

    const mockDevice: GrowspaceDevice = {
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

    const mockStore = {
        ui: {
            closeDialog: vi.fn()
        },
        data: {
            $devices: {
                get: () => [mockDevice]
            }
        }
    };

    const mockHass = {
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

    beforeEach(async () => {
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
    });

    it('should not render anything if not open', async () => {
        element.open = false;
        await element.updateComplete;
        expect(element.shadowRoot?.innerHTML).toContain('<!---->');
    });

    it('should render the dialog with correct title and growspace name', () => {
        const title = element.shadowRoot?.querySelector('.dialog-title');
        const subtitle = element.shadowRoot?.querySelector('.dialog-subtitle');

        expect(title?.textContent).toBe('Crop Steering Diagnostics');
        expect(subtitle?.textContent).toBe('Flower Tent 1');
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

        const closeBtn = element.shadowRoot?.querySelector('button.md3-button') as HTMLButtonElement;
        closeBtn.click();

        expect(closeSpy).toHaveBeenCalled();
    });

    it('should call close when ha-dialog emits closed event', () => {
        const closeSpy = vi.fn();
        element.addEventListener('close', closeSpy);
        const dialog = element.shadowRoot?.querySelector('ha-dialog');
        dialog?.dispatchEvent(new CustomEvent('closed'));
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
                mockDevice.name = name;
                expect((element as any)._getEntityId()).toBe(expected);
            });
        });

        it('should return undefined if growspace not found', () => {
            element.dialogState = { growspaceId: 'nonexistent' };
            expect((element as any)._getEntityId()).toBeUndefined();
        });
    });
});
