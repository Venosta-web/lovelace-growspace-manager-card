
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IrrigationDialog } from '../../../src/dialogs/irrigation-dialog';
import { GrowspaceDevice } from '../../../src/types';
import { GrowspaceType } from '../../../src/constants';

// Mock ha-dialog
class HaDialogMock extends HTMLElement {
    open = false;
}
customElements.define('ha-dialog', HaDialogMock);

describe('IrrigationDialog Visibility', () => {
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
        environmentAttributes: {
            soilMoistureSensor: 'sensor.sm1',
        } as any,
        stats: {} as any,
        irrigationConfig: {
            irrigationPumpEntity: 'switch.pump',
            drainPumpEntity: 'switch.drain',
        } as any,
        irrigationStrategy: {
            enabled: false
        } as any
    };

    beforeEach(() => {
        element = new IrrigationDialog();
        element.device = JSON.parse(JSON.stringify(mockDevice));
        element.hass = { states: {} } as any;
    });

    it('should show steering tab when soil moisture and pumps are present', () => {
        const visibleTabs = (element as any)._visibleTabs;
        expect(visibleTabs).toContain('steering');
    });

    it('should hide steering tab when pumps are missing', async () => {
        element.device!.irrigationConfig!.irrigationPumpEntity = undefined;
        element.device!.irrigationConfig!.drainPumpEntity = undefined;
        
        const visibleTabs = (element as any)._visibleTabs;
        expect(visibleTabs).not.toContain('steering');
    });

    it('should show steering tab if only irrigation pump is present', () => {
        element.device!.irrigationConfig!.irrigationPumpEntity = 'switch.pump';
        element.device!.irrigationConfig!.drainPumpEntity = undefined;
        
        const visibleTabs = (element as any)._visibleTabs;
        expect(visibleTabs).toContain('steering');
    });

    it('should show steering tab if only drain pump is present', () => {
        element.device!.irrigationConfig!.irrigationPumpEntity = undefined;
        element.device!.irrigationConfig!.drainPumpEntity = 'switch.drain';
        
        const visibleTabs = (element as any)._visibleTabs;
        expect(visibleTabs).toContain('steering');
    });

    it('should show steering tab even if soil moisture is missing but strategy is enabled AND pumps exist', () => {
        element.device!.environmentAttributes!.soilMoistureSensor = undefined;
        element.device!.irrigationStrategy!.enabled = true;
        
        const visibleTabs = (element as any)._visibleTabs;
        expect(visibleTabs).toContain('steering');
    });

    it('should hide steering tab if strategy is enabled but NO pumps exist', () => {
        element.device!.irrigationStrategy!.enabled = true;
        element.device!.irrigationConfig!.irrigationPumpEntity = undefined;
        element.device!.irrigationConfig!.drainPumpEntity = undefined;
        
        const visibleTabs = (element as any)._visibleTabs;
        expect(visibleTabs).not.toContain('steering');
    });

    describe('Setup Hints', () => {
        it('should show pump hint when steering is hidden due to missing pumps', () => {
            element.device!.irrigationConfig!.irrigationPumpEntity = undefined;
            element.device!.irrigationConfig!.drainPumpEntity = undefined;
            
            const hints = (element as any)._setupHints;
            const pumpHint = hints.find((h: any) => h.text.includes('Configure an irrigation or drain pump'));
            expect(pumpHint).toBeDefined();
            expect(pumpHint.icon).toBe('🚰');
        });

        it('should show soil moisture hint when steering is hidden but pumps exist', () => {
            element.device!.environmentAttributes!.soilMoistureSensor = undefined;
            element.device!.irrigationStrategy!.enabled = false;
            // Pumps exist from mockDevice
            
            const hints = (element as any)._setupHints;
            const moistureHint = hints.find((h: any) => h.text.includes('Configure a soil moisture sensor'));
            expect(moistureHint).toBeDefined();
            expect(moistureHint.icon).toBe('🌱');
        });
    });
});
