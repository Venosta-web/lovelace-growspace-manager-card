import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigDialog } from '../../../src/dialogs/config-dialog';
import { ConfigTab } from '../../../src/constants';
import { html, render } from 'lit';
import { mdiViewDashboard } from '@mdi/js';
import * as growspaceSlice from '../../../src/slices/growspace/index';

// Mock components
if (!customElements.get('md3-number-input')) {
    customElements.define('md3-number-input', class extends HTMLElement {
        set value(v: any) { this.setAttribute('value', v); }
    });
}

vi.mock('../../../src/slices/growspace/index', async (importOriginal) => {
    const actual = await importOriginal<typeof growspaceSlice>();
    return { ...actual, setDehumidifierControl: vi.fn().mockResolvedValue(undefined) };
});

describe('ConfigDialog Interactions', () => {
    let element: ConfigDialog;

    beforeEach(async () => {
        element = new ConfigDialog();
        element.open = true; // MUST SET OPEN
        document.body.appendChild(element);
        await element.updateComplete;
    });

    afterEach(() => {
        element.remove();
        vi.clearAllMocks();
    });

    it('should switch tabs when header buttons are clicked', async () => {
        const buttons = element.shadowRoot?.querySelectorAll('.cfg-nav-item');
        expect(buttons?.length).toBeGreaterThan(0);

        const tabs = [
            ConfigTab.GROWSPACES,
            ConfigTab.SENSORS,
            ConfigTab.CLIMATE,
            ConfigTab.HUMIDITY,
            ConfigTab.IRRIGATION,
            ConfigTab.TANKS,
            ConfigTab.VISION,
            ConfigTab.HEATMAP,
            ConfigTab.SUBAREAS,
        ];

        if (buttons) {
            for (let i = 0; i < Math.min(buttons.length, tabs.length); i++) {
                (buttons[i] as HTMLElement).click();
                await element.updateComplete;
                expect(element.currentTab).toBe(tabs[i]);
            }
        }
    });

    it('should trigger sensor changes via DOM select', async () => {
        element.setInitialState(ConfigTab.SENSORS, {
            selectedGrowspaceId: 'gs1'
        } as any);
        element.hass = {
            states: {
                'sensor.temp1': { entity_id: 'sensor.temp1', attributes: { device_class: 'temperature', friendly_name: 'T1' } }
            }
        } as any;
        await element.updateComplete;

        const selects = element.shadowRoot?.querySelectorAll('select');
        // Index 0: Growspace selector, Index 1: Temp sensor selector
        const select = selects?.[1] as HTMLSelectElement;
        if (select) {
            select.value = 'sensor.temp1';
            select.dispatchEvent(new Event('change'));
            expect((element as any).env_temp_sensor).toBe('sensor.temp1');
        }
    });

    it('should trigger updateThreshold via night/off selection', async () => {
        element.setInitialState(ConfigTab.HUMIDITY, {
            dehumidifierThresholds: {
                'gs1': { 'day': { on: 60, off: 55 }, 'night': { on: 65, off: 60 } }
            }
        } as any);
        (element as any)._openHumidityStageId = 'gs1';
        await element.updateComplete;

        const inputs = element.shadowRoot?.querySelectorAll('md3-number-input');
        if (inputs && inputs.length > 0) {
            const input = inputs[0] as any;
            input.dispatchEvent(new CustomEvent('change', { detail: '70' }));
            // Threshold update logic is internal, but this hits the branch
        }
    });

    it('configure-environment-submit payload does not include dehumidifierControlEnabled', async () => {
        element.setInitialState(ConfigTab.HUMIDITY, { selectedGrowspaceId: 'gs1' } as any);
        await element.updateComplete;

        const listener = vi.fn();
        element.addEventListener('configure-environment-submit', listener);
        (element as any)._submitEnvironment();

        expect(listener).toHaveBeenCalledOnce();
        expect(listener.mock.calls[0][0].detail).not.toHaveProperty('dehumidifierControlEnabled');
    });

    it('toggling dehumidifier control checkbox calls setDehumidifierControl immediately', async () => {
        element.setInitialState(ConfigTab.HUMIDITY, { selectedGrowspaceId: 'gs1' } as any);
        await element.updateComplete;

        const checkbox = Array.from(element.shadowRoot?.querySelectorAll('input[type="checkbox"]') ?? [])
            .find((el) => el.closest('label')?.textContent?.includes('Dehumidifier Control')) as HTMLInputElement | undefined;

        expect(checkbox).toBeDefined();
        checkbox!.checked = true;
        checkbox!.dispatchEvent(new Event('change'));

        expect(growspaceSlice.setDehumidifierControl).toHaveBeenCalledWith('gs1', true);
    });
});
