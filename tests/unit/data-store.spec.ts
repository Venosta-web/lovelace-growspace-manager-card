import { describe, it, expect, beforeEach } from 'vitest';
import * as dataStore from '../../src/store/data-store';

describe('DataStore', () => {
    beforeEach(() => {
        // Reset atoms
        dataStore.$devices.set([]);
        dataStore.$strainLibrary.set([]);
        dataStore.$config.set({} as any);
        dataStore.$optimisticDeletedPlantIds.set(new Set());
        dataStore.$selectedDevice.set(null);
    });

    it('should set devices', () => {
        const devices = [{ device_id: 'd1' }] as any[];
        dataStore.setDevices(devices);
        expect(dataStore.$devices.get()).toEqual(devices);
    });

    it('should set selected device', () => {
        dataStore.setSelectedDevice('d1');
        expect(dataStore.$selectedDevice.get()).toBe('d1');

        dataStore.setSelectedDevice(null);
        expect(dataStore.$selectedDevice.get()).toBeNull();
    });

    it('should set config', () => {
        const config = { default_growspace: 'd1' } as any;
        dataStore.setConfig(config);
        expect(dataStore.$config.get()).toEqual(config);
    });

    it('should set strain library', () => {
        const lib = [{ strain: 'A' }] as any[];
        dataStore.setStrainLibrary(lib);
        expect(dataStore.$strainLibrary.get()).toEqual(lib);
    });

    it('should manage optimistic deleted plant IDs', () => {
        const initial = new Set(['p1']);
        dataStore.setOptimisticDeletedPlantIds(initial);
        expect(dataStore.$optimisticDeletedPlantIds.get()).toEqual(initial);

        dataStore.addOptimisticDeletedPlantId('p2');
        expect(dataStore.$optimisticDeletedPlantIds.get().has('p1')).toBe(true);
        expect(dataStore.$optimisticDeletedPlantIds.get().has('p2')).toBe(true);

        dataStore.removeOptimisticDeletedPlantId('p1');
        expect(dataStore.$optimisticDeletedPlantIds.get().has('p1')).toBe(false);
        expect(dataStore.$optimisticDeletedPlantIds.get().has('p2')).toBe(true);

        // Remove non-existent
        dataStore.removeOptimisticDeletedPlantId('p99');
        expect(dataStore.$optimisticDeletedPlantIds.get().size).toBe(1);
    });
});
