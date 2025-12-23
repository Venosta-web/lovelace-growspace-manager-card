import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GrowspaceEnvChart } from '../../src/growspace-env-chart';
import { hassContext } from '../../src/context';
import { ContextProvider } from '@lit/context';

describe('GrowspaceEnvChart VPD Logic', () => {
    let element: GrowspaceEnvChart;
    let container: HTMLElement;
    let hassProvider: ContextProvider<any>;
    let hassMock: any;

    beforeEach(async () => {
        // Mock ResizeObserver which is not available in JSDOM
        (globalThis as any).ResizeObserver = class {
            observe = () => { };
            disconnect = () => { };
            unobserve = () => { };
        };

        container = document.createElement('div');
        document.body.appendChild(container);

        hassMock = {
            states: {
                'sensor.overview': {
                    attributes: {
                        // Day: Optimal 1.0-2.0
                        day_vpd_target_min: 1.0,
                        day_vpd_target_max: 2.0,
                        day_vpd_danger_min: 0.5,
                        day_vpd_danger_max: 2.5,
                        // Night: Optimal 0.4-0.6 (1.5 will be Warning/Danger)
                        night_vpd_target_min: 0.4,
                        night_vpd_target_max: 0.6,
                        night_vpd_danger_min: 0.2,
                        night_vpd_danger_max: 0.8
                    }
                }
            },
            locale: { language: 'en' }
        };

        const wrapper = document.createElement('div');
        hassProvider = new ContextProvider(wrapper, hassContext, hassMock);
        container.appendChild(wrapper);

        element = new GrowspaceEnvChart();
        element.device = {
            device_id: 'd1',
            name: 'Device 1',
            sensors: {},
            overview_entity_id: 'sensor.overview'
        } as any;

        wrapper.appendChild(element);
        await new Promise(r => setTimeout(r, 0));
    });

    afterEach(() => {
        document.body.removeChild(container);
    });

    it('should infer Night (warnings) when time is before first Light ON event', async () => {
        const now = Date.now();
        const historyTime = now - 5000; // 5s ago
        const lightChangeTime = now; // Now

        // Scenario:
        // History contains: Light turns ON at 'now'.
        // Data point is at 'historyTime' (before 'now').
        // Inference: Before Light ON, it was likely Light OFF (Night).
        // VPD Value: 1.5.
        // Night Thresholds (0.4-0.6). 1.5 is way above -> Danger.
        // Day Thresholds (1.0-2.0). 1.5 is Optimal.

        element.metricKey = 'vpd';
        element.sensorHistory = {
            'vpd': [
                { state: '1.5', last_changed: new Date(historyTime).toISOString() }
            ] as any,
            'light': [
                { state: 'on', last_changed: new Date(lightChangeTime).toISOString() }
            ] as any
        };

        await element.updateComplete;

        // We expect "Danger" color for the segment/stroke.
        // Danger color in code: '#f44336'
        // Optimal color in code: '#4caf50'

        // Check the segment path stroke color
        const path = element.shadowRoot?.querySelector('path[stroke-width="2.5"]');
        expect(path).toBeTruthy();
        expect(path?.getAttribute('stroke')).toBe('#f44336'); // Red/Danger
    });

    it('should infer Day (optimal) when time is before first Light OFF event', async () => {
        const now = Date.now();
        const historyTime = now - 5000;
        const lightChangeTime = now;

        // Scenario:
        // History contains: Light turns OFF at 'now'.
        // Data point at 'historyTime' (before).
        // Inference: Before OFF, it was likely ON (Day).
        // VPD Value: 1.5.
        // Day Thresholds (1.0-2.0). 1.5 is Optimal.

        element.metricKey = 'vpd';
        element.sensorHistory = {
            'vpd': [
                { state: '1.5', last_changed: new Date(historyTime).toISOString() }
            ] as any,
            'light': [
                { state: 'off', last_changed: new Date(lightChangeTime).toISOString() }
            ] as any
        };

        await element.updateComplete;

        const path = element.shadowRoot?.querySelector('path[stroke-width="2.5"]');
        expect(path).toBeTruthy();
        expect(path?.getAttribute('stroke')).toBe('#4caf50'); // Green/Optimal
    });

    it('should handle dimmers (numeric state) correctly', async () => {
        const now = Date.now();
        const historyTime = now - 5000;
        const lightChangeTime = now;

        // Light turns from X to 10% (Day)
        // Inference logic currently: checks if first point is 0.
        // If first point is 10 (Day), inferred previous is Night (0). -> 1.5 is Warning/Danger.

        element.metricKey = 'vpd';
        element.sensorHistory = {
            'vpd': [
                { state: '1.5', last_changed: new Date(historyTime).toISOString() }
            ] as any,
            'light': [
                { state: '10.0', last_changed: new Date(lightChangeTime).toISOString() }
            ] as any
        };

        await element.updateComplete;

        const path = element.shadowRoot?.querySelector('path[stroke-width="2.5"]');
        expect(path).toBeTruthy();
        // If first point is 10 (Day), we infer previous was Night.
        // Night targets (0.4-0.6), 1.5 is Danger.
        expect(path?.getAttribute('stroke')).toBe('#f44336');
    });
});
