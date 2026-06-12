import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncService } from '../../../src/services/sync-service';
import { DataService } from '../../../src/services/data-service';
import { GrowspaceUIStore } from '../../../src/store/ui/ui-store';
import { GridSliceRef, devices$, setDevices } from '../../../src/slices/grid';
import {
  deviceSnapshotEntityIds,
  setDeviceSnapshot,
  setSubareaDeviceSnapshot,
  subareaDeviceSnapshots$,
} from '../../../src/slices/device-state';
import {
  envSnapshotEntityIds,
  setEnvSnapshot,
  setSubareaEnvSnapshot,
  subareaEnvSnapshots$,
} from '../../../src/slices/environment';
import { subareas$, subareasGrowspaceId$ } from '../../../src/slices/subarea';
import { setPlants } from '../../../src/slices/plant';
import { setIrrigationConfig, setIrrigationStrategy, setTankLevels } from '../../../src/slices/irrigation';
import { HomeAssistant } from 'custom-card-helpers';
import { GrowspaceDevice, GrowspaceManagerCardConfig, PlantEntity } from '../../../src/types';
import { atom } from 'nanostores';

vi.mock('../../../src/slices/device-state', () => ({
  setDeviceSnapshot: vi.fn(),
  setSubareaDeviceSnapshot: vi.fn(),
  subareaDeviceSnapshots$: { get: vi.fn(() => new Map()) },
  deviceSnapshotEntityIds: vi.fn(() => []),
}));

vi.mock('../../../src/slices/environment', () => ({
  setEnvSnapshot: vi.fn(),
  setSubareaEnvSnapshot: vi.fn(),
  subareaEnvSnapshots$: { get: vi.fn(() => new Map()) },
  envSnapshotEntityIds: vi.fn(() => []),
}));

vi.mock('../../../src/slices/plant', () => ({
  setPlants: vi.fn(),
}));

vi.mock('../../../src/slices/irrigation', () => ({
  setIrrigationConfig: vi.fn(),
  setIrrigationStrategy: vi.fn(),
  setTankLevels: vi.fn(),
}));

describe('SyncService Unit Tests', () => {
  let syncService: SyncService;
  let dataService: DataService;
  let uiStore: GrowspaceUIStore;
  let gridStore: GridSliceRef;

  afterEach(() => {
    setDevices([]);
    subareas$.set([]);
    subareasGrowspaceId$.set(null);
  });

  beforeEach(() => {
    vi.clearAllMocks();

    dataService = {
      updateHass: vi.fn(),
      fetchGrowspaceData: vi.fn(),
      getGrowspaceDevices: vi.fn(() => []),
      hass: undefined,
    } as unknown as DataService;

    setDevices([]);

    uiStore = {
      $defaultApplied: atom<boolean>(false),
      setDefaultApplied: vi.fn((applied: boolean) => {
        uiStore.$defaultApplied.set(applied);
      }),
      setIsLoading: vi.fn(),
    } as unknown as GrowspaceUIStore;

    gridStore = {
      $selectedDevice: atom<string | null>(null),
      setSelectedDevice: vi.fn((id: string) => {
        gridStore.$selectedDevice.set(id);
      }),
    } as unknown as GridSliceRef;

    syncService = new SyncService(dataService, uiStore, gridStore);
  });

  describe('setCardConfig', () => {
    it('does not trigger setDefaultApplied(false) when config default_growspace is the same', () => {
      const config1: GrowspaceManagerCardConfig = { default_growspace: 'room1' } as any;
      syncService.setCardConfig(config1);
      vi.clearAllMocks();

      const config2: GrowspaceManagerCardConfig = { default_growspace: 'room1' } as any;
      syncService.setCardConfig(config2);

      expect(uiStore.setDefaultApplied).not.toHaveBeenCalled();
    });

    it('triggers setDefaultApplied(false) when config default_growspace is different', () => {
      const config1: GrowspaceManagerCardConfig = { default_growspace: 'room1' } as any;
      syncService.setCardConfig(config1);
      vi.clearAllMocks();

      const config2: GrowspaceManagerCardConfig = { default_growspace: 'room2' } as any;
      syncService.setCardConfig(config2);

      expect(uiStore.setDefaultApplied).toHaveBeenCalledWith(false);
    });
  });

  describe('updateHass', () => {
    it('returns early when new hass reference is identical to previous hass reference', () => {
      const mockHass: HomeAssistant = { states: {} } as any;
      syncService.updateHass(mockHass);
      vi.clearAllMocks();

      syncService.updateHass(mockHass);

      expect(dataService.updateHass).not.toHaveBeenCalled();
    });

    it('triggers initial refreshGrowspaceData when cache is empty and not fetching', () => {
      const mockHass: HomeAssistant = { states: {} } as any;
      const refreshSpy = vi.spyOn(syncService, 'refreshGrowspaceData').mockResolvedValue();

      syncService.updateHass(mockHass);

      expect(dataService.updateHass).toHaveBeenCalledWith(mockHass);
      expect(refreshSpy).toHaveBeenCalled();
    });

    it('does not trigger refreshGrowspaceData when cache is empty but currently fetching', () => {
      const mockHass: HomeAssistant = { states: {} } as any;
      const refreshSpy = vi.spyOn(syncService, 'refreshGrowspaceData').mockResolvedValue();

      // Set internal fetching flag via a private cast or by tricking the service
      (syncService as any)._isFetchingWS = true;

      syncService.updateHass(mockHass);

      expect(dataService.updateHass).toHaveBeenCalledWith(mockHass);
      expect(refreshSpy).not.toHaveBeenCalled();
    });

    it('updates devices state directly when cache is not empty and no watched entities exist', () => {
      const mockHass: HomeAssistant = { states: {} } as any;
      (syncService as any)._cache = { some_key: {} as any };
      const updateDevicesSpy = vi.spyOn(syncService, 'updateDevicesState');

      syncService.updateHass(mockHass);

      expect(dataService.updateHass).toHaveBeenCalledWith(mockHass);
      expect(updateDevicesSpy).toHaveBeenCalled();
      expect(uiStore.setIsLoading).toHaveBeenCalledWith(false);
    });

    it('returns early if watched entities exist but none changed', () => {
      const stateObj = { entity_id: 'sensor.temp', state: '24' } as any;

      const mockHass1: HomeAssistant = {
        states: {
          'sensor.temp': stateObj,
        },
      } as any;

      const mockHass2: HomeAssistant = {
        states: {
          'sensor.temp': stateObj,
        },
      } as any;

      // Populate watched entities and last HASS ref
      const watched = (syncService as any)._watchedEntities as Set<string>;
      watched.add('sensor.temp');
      (syncService as any)._lastHassRef = mockHass1;
      (syncService as any)._cache = { some_key: {} as any };

      const updateDevicesSpy = vi.spyOn(syncService, 'updateDevicesState');

      syncService.updateHass(mockHass2);

      expect(updateDevicesSpy).not.toHaveBeenCalled();
    });

    it('updates devices state when a watched entity state reference changes', () => {
      const stateObj1 = { entity_id: 'sensor.temp', state: '24' } as any;
      const stateObj2 = { entity_id: 'sensor.temp', state: '25' } as any;

      const mockHass1: HomeAssistant = {
        states: { 'sensor.temp': stateObj1 },
      } as any;

      const mockHass2: HomeAssistant = {
        states: { 'sensor.temp': stateObj2 },
      } as any;

      const watched = (syncService as any)._watchedEntities as Set<string>;
      watched.add('sensor.temp');
      (syncService as any)._lastHassRef = mockHass1;
      (syncService as any)._cache = { some_key: {} as any };

      const updateDevicesSpy = vi.spyOn(syncService, 'updateDevicesState');

      syncService.updateHass(mockHass2);

      expect(updateDevicesSpy).toHaveBeenCalled();
      expect(uiStore.setIsLoading).toHaveBeenCalledWith(false);
    });

    it('updates devices state when a watched entity state becomes missing', () => {
      const mockHass1: HomeAssistant = {
        states: {
          'sensor.temp': { entity_id: 'sensor.temp', state: '24' } as any,
        },
      } as any;

      const mockHass2: HomeAssistant = {
        states: {},
      } as any;

      const watched = (syncService as any)._watchedEntities as Set<string>;
      watched.add('sensor.temp');
      (syncService as any)._lastHassRef = mockHass1;
      (syncService as any)._cache = { some_key: {} as any };

      const updateDevicesSpy = vi.spyOn(syncService, 'updateDevicesState');

      syncService.updateHass(mockHass2);

      expect(updateDevicesSpy).toHaveBeenCalled();
      expect(uiStore.setIsLoading).toHaveBeenCalledWith(false);
    });

    it('updates devices state when a watched entity state becomes newly added', () => {
      const mockHass1: HomeAssistant = {
        states: {},
      } as any;

      const mockHass2: HomeAssistant = {
        states: {
          'sensor.temp': { entity_id: 'sensor.temp', state: '24' } as any,
        },
      } as any;

      const watched = (syncService as any)._watchedEntities as Set<string>;
      watched.add('sensor.temp');
      (syncService as any)._lastHassRef = mockHass1;
      (syncService as any)._cache = { some_key: {} as any };

      const updateDevicesSpy = vi.spyOn(syncService, 'updateDevicesState');

      syncService.updateHass(mockHass2);

      expect(updateDevicesSpy).toHaveBeenCalled();
      expect(uiStore.setIsLoading).toHaveBeenCalledWith(false);
    });
  });

  describe('refreshGrowspaceData', () => {
    it('returns early when dataService.hass is undefined', async () => {
      dataService.hass = undefined as any;
      await syncService.refreshGrowspaceData();
      expect(dataService.fetchGrowspaceData).not.toHaveBeenCalled();
    });

    it('returns early when _isFetchingWS is true', async () => {
      dataService.hass = { states: {} } as any;
      (syncService as any)._isFetchingWS = true;

      await syncService.refreshGrowspaceData();

      expect(dataService.fetchGrowspaceData).not.toHaveBeenCalled();
    });

    it('calls setIsLoading(true) if devices list is empty', async () => {
      dataService.hass = { states: {} } as any;
      setDevices([]);

      const fetchPromise = Promise.resolve({} as any);
      vi.mocked(dataService.fetchGrowspaceData).mockReturnValue(fetchPromise);

      await syncService.refreshGrowspaceData();

      expect(uiStore.setIsLoading).toHaveBeenCalledWith(true);
      expect(uiStore.setIsLoading).toHaveBeenCalledWith(false);
    });

    it('does not call setIsLoading(true) if devices list is not empty', async () => {
      dataService.hass = { states: {} } as any;
      setDevices([{ deviceId: 'd1', plants: [] } as any]);

      const fetchPromise = Promise.resolve({} as any);
      vi.mocked(dataService.fetchGrowspaceData).mockReturnValue(fetchPromise);

      await syncService.refreshGrowspaceData();

      expect(uiStore.setIsLoading).not.toHaveBeenCalledWith(true);
      expect(uiStore.setIsLoading).toHaveBeenCalledWith(false);
    });

    it('updates cache and calls updateDevicesState on successful fetch', async () => {
      dataService.hass = { states: {} } as any;
      const mockResult = { data: 'some_data' } as any;
      vi.mocked(dataService.fetchGrowspaceData).mockResolvedValue(mockResult);

      const updateDevicesSpy = vi.spyOn(syncService, 'updateDevicesState');

      await syncService.refreshGrowspaceData();

      expect((syncService as any)._cache).toBe(mockResult);
      expect(updateDevicesSpy).toHaveBeenCalled();
      expect(uiStore.setIsLoading).toHaveBeenCalledWith(false);
    });

    it('sets cache to empty object on undefined/null fetch result', async () => {
      dataService.hass = { states: {} } as any;
      vi.mocked(dataService.fetchGrowspaceData).mockResolvedValue(null as any);

      await syncService.refreshGrowspaceData();

      expect((syncService as any)._cache).toEqual({});
    });

    it('handles throw inside fetchGrowspaceData gracefully', async () => {
      dataService.hass = { states: {} } as any;
      const errorObj = new Error('WebSocket Fail');
      vi.mocked(dataService.fetchGrowspaceData).mockRejectedValue(errorObj);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await syncService.refreshGrowspaceData();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch growspace data', errorObj);
      expect((syncService as any)._isFetchingWS).toBe(false);
      expect(uiStore.setIsLoading).toHaveBeenCalledWith(false);
    });
  });

  describe('updateDevicesState and _watchedEntities', () => {
    it('sets devices store when device arrays are not equal', () => {
      const newDevices: GrowspaceDevice[] = [
        { deviceId: 'd1', plants: [] } as any,
      ];
      setDevices([]);
      vi.mocked(dataService.getGrowspaceDevices).mockReturnValue(newDevices);

      syncService.updateDevicesState();

      expect(devices$.get()).toEqual(newDevices);
    });

    it('does not set devices store when device arrays are equal', () => {
      const currentDevices: GrowspaceDevice[] = [
        { deviceId: 'd1', plants: [] } as any,
      ];
      setDevices(currentDevices);
      vi.mocked(dataService.getGrowspaceDevices).mockReturnValue(currentDevices);

      syncService.updateDevicesState();

      expect(devices$.get()).toEqual(currentDevices);
    });

    it('correctly sets plants with all nested plant entities', () => {
      const plant1 = { entity_id: 'sensor.plant1' } as PlantEntity;
      const plant2 = { entity_id: 'sensor.plant2' } as PlantEntity;
      const newDevices: GrowspaceDevice[] = [
        { deviceId: 'd1', plants: [plant1] } as any,
        { deviceId: 'd2', plants: [plant2] } as any,
      ];
      vi.mocked(dataService.getGrowspaceDevices).mockReturnValue(newDevices);

      syncService.updateDevicesState();

      expect(setPlants).toHaveBeenCalledWith([plant1, plant2]);
    });

    it('runs setDeviceSnapshot and setEnvSnapshot for each device with a name', () => {
      const mockHassStates = { 'sensor.temp': {} as any };
      dataService.hass = { states: mockHassStates } as any;

      const newDevices: GrowspaceDevice[] = [
        { deviceId: 'd1', name: 'Growroom 1', environmentAttributes: {} } as any,
      ];
      vi.mocked(dataService.getGrowspaceDevices).mockReturnValue(newDevices);

      syncService.updateDevicesState();

      expect(setDeviceSnapshot).toHaveBeenCalledWith('d1', newDevices[0], mockHassStates);
      expect(setEnvSnapshot).toHaveBeenCalledWith('d1', newDevices[0], mockHassStates);
    });

    it('feeds setSubareaEnvSnapshot for each subarea in subareas$ with the parent device context', () => {
      const mockHassStates = { 'sensor.temp': {} as any };
      dataService.hass = { states: mockHassStates } as any;

      const parentDevice = { deviceId: 'gs1', name: 'Tent 1', environmentAttributes: {} } as any;
      vi.mocked(dataService.getGrowspaceDevices).mockReturnValue([parentDevice]);

      const subarea = { id: 'sa1', name: 'Veg Area', environment_config: {} } as any;
      subareas$.set([subarea]);
      subareasGrowspaceId$.set('gs1');

      syncService.updateDevicesState();

      expect(setSubareaEnvSnapshot).toHaveBeenCalledWith(
        'sa1',
        subarea,
        { growspaceId: 'gs1', growspaceName: 'Tent 1' },
        mockHassStates
      );
    });

    it('feeds setSubareaDeviceSnapshot for each subarea in subareas$', () => {
      const mockHassStates = { 'sensor.temp': {} as any };
      dataService.hass = { states: mockHassStates } as any;

      const parentDevice = { deviceId: 'gs1', name: 'Tent 1', environmentAttributes: {} } as any;
      vi.mocked(dataService.getGrowspaceDevices).mockReturnValue([parentDevice]);

      const subarea = { id: 'sa1', name: 'Veg Area', environment_config: {} } as any;
      subareas$.set([subarea]);
      subareasGrowspaceId$.set('gs1');

      syncService.updateDevicesState();

      expect(setSubareaDeviceSnapshot).toHaveBeenCalledWith('sa1', subarea, mockHassStates);
    });

    it('feeds subarea snapshots from each device payload without subareas$ ever being hydrated', () => {
      const mockHassStates = { 'sensor.temp': {} as any };
      dataService.hass = { states: mockHassStates } as any;

      const subareaA = { id: 'sa_a', name: 'Shelf A', environment_config: {} } as any;
      const subareaB = { id: 'sa_b', name: 'Shelf B', environment_config: {} } as any;
      const devices = [
        {
          deviceId: 'gs1',
          name: 'Tent 1',
          environmentAttributes: {},
          subareas: [subareaA],
        } as any,
        {
          deviceId: 'gs2',
          name: 'Tent 2',
          environmentAttributes: {},
          subareas: [subareaB],
        } as any,
      ];
      vi.mocked(dataService.getGrowspaceDevices).mockReturnValue(devices);

      syncService.updateDevicesState();

      expect(setSubareaEnvSnapshot).toHaveBeenCalledWith(
        'sa_a',
        subareaA,
        { growspaceId: 'gs1', growspaceName: 'Tent 1' },
        mockHassStates
      );
      expect(setSubareaEnvSnapshot).toHaveBeenCalledWith(
        'sa_b',
        subareaB,
        { growspaceId: 'gs2', growspaceName: 'Tent 2' },
        mockHassStates
      );
      expect(setSubareaDeviceSnapshot).toHaveBeenCalledWith('sa_a', subareaA, mockHassStates);
      expect(setSubareaDeviceSnapshot).toHaveBeenCalledWith('sa_b', subareaB, mockHassStates);
    });

    it('prefers the hydrated subareas$ list over the payload list for its growspace only', () => {
      const mockHassStates = { 'sensor.temp': {} as any };
      dataService.hass = { states: mockHassStates } as any;

      const payloadSubarea = { id: 'sa_stale', name: 'Stale Shelf', environment_config: {} } as any;
      const storeSubarea = { id: 'sa_fresh', name: 'Fresh Shelf', environment_config: {} } as any;
      const otherSubarea = { id: 'sa_other', name: 'Other Shelf', environment_config: {} } as any;
      const devices = [
        {
          deviceId: 'gs1',
          name: 'Tent 1',
          environmentAttributes: {},
          subareas: [payloadSubarea],
        } as any,
        {
          deviceId: 'gs2',
          name: 'Tent 2',
          environmentAttributes: {},
          subareas: [otherSubarea],
        } as any,
      ];
      vi.mocked(dataService.getGrowspaceDevices).mockReturnValue(devices);

      // subareas$ hydrated for gs1 — fresher than the cached payload list
      subareas$.set([storeSubarea]);
      subareasGrowspaceId$.set('gs1');

      syncService.updateDevicesState();

      expect(setSubareaEnvSnapshot).toHaveBeenCalledWith(
        'sa_fresh',
        storeSubarea,
        { growspaceId: 'gs1', growspaceName: 'Tent 1' },
        mockHassStates
      );
      expect(setSubareaEnvSnapshot).not.toHaveBeenCalledWith(
        'sa_stale',
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
      // gs2 is untouched by the hydrated list — still payload-sourced
      expect(setSubareaEnvSnapshot).toHaveBeenCalledWith(
        'sa_other',
        otherSubarea,
        { growspaceId: 'gs2', growspaceName: 'Tent 2' },
        mockHassStates
      );
    });

    it('treats a hydrated-but-empty subareas$ list as authoritative for its growspace', () => {
      const mockHassStates = { 'sensor.temp': {} as any };
      dataService.hass = { states: mockHassStates } as any;

      const payloadSubarea = { id: 'sa_removed', name: 'Removed', environment_config: {} } as any;
      const devices = [
        {
          deviceId: 'gs1',
          name: 'Tent 1',
          environmentAttributes: {},
          subareas: [payloadSubarea],
        } as any,
      ];
      vi.mocked(dataService.getGrowspaceDevices).mockReturnValue(devices);

      // The last subarea was just removed via remove_subarea — the payload is stale
      subareas$.set([]);
      subareasGrowspaceId$.set('gs1');

      syncService.updateDevicesState();

      expect(setSubareaEnvSnapshot).not.toHaveBeenCalled();
      expect(setSubareaDeviceSnapshot).not.toHaveBeenCalled();
    });

    it('adds subarea env + device snapshot entity IDs to watched entities', () => {
      const mockHassStates = { 'sensor.temp': {} as any };
      dataService.hass = { states: mockHassStates } as any;

      const subarea = { id: 'sa1', name: 'Shelf', environment_config: {} } as any;
      const devices = [
        { deviceId: 'gs1', name: 'Tent 1', environmentAttributes: {}, subareas: [subarea] } as any,
      ];
      vi.mocked(dataService.getGrowspaceDevices).mockReturnValue(devices);

      const envSnapshot = { temperature: 21 } as any;
      const deviceSnapshot = { lights: {} } as any;
      vi.mocked(subareaEnvSnapshots$.get).mockReturnValueOnce(new Map([['sa1', envSnapshot]]));
      vi.mocked(subareaDeviceSnapshots$.get).mockReturnValueOnce(
        new Map([['sa1', deviceSnapshot]])
      );
      vi.mocked(envSnapshotEntityIds).mockReturnValueOnce(['sensor.sub_temp']);
      vi.mocked(deviceSnapshotEntityIds).mockReturnValueOnce(['light.sub_light']);

      syncService.updateDevicesState();

      expect(envSnapshotEntityIds).toHaveBeenCalledWith(envSnapshot);
      expect(deviceSnapshotEntityIds).toHaveBeenCalledWith(deviceSnapshot);
      const watched = (syncService as any)._watchedEntities as Set<string>;
      expect(watched.has('sensor.sub_temp')).toBe(true);
      expect(watched.has('light.sub_light')).toBe(true);
    });

    it('skips subarea snapshots when devices carry no subareas and subareas$ is not hydrated', () => {
      const mockHassStates = { 'sensor.temp': {} as any };
      dataService.hass = { states: mockHassStates } as any;
      vi.mocked(dataService.getGrowspaceDevices).mockReturnValue([
        { deviceId: 'gs1', name: 'Tent 1', environmentAttributes: {} } as any,
      ]);

      syncService.updateDevicesState();

      expect(setSubareaEnvSnapshot).not.toHaveBeenCalled();
      expect(setSubareaDeviceSnapshot).not.toHaveBeenCalled();
    });

    it('skips setEnvSnapshot for each device without a name', () => {
      const mockHassStates = { 'sensor.temp': {} as any };
      dataService.hass = { states: mockHassStates } as any;

      const newDevices: GrowspaceDevice[] = [
        { deviceId: 'd1', name: '', environmentAttributes: {} } as any,
      ];
      vi.mocked(dataService.getGrowspaceDevices).mockReturnValue(newDevices);

      syncService.updateDevicesState();

      expect(setDeviceSnapshot).toHaveBeenCalledWith('d1', newDevices[0], mockHassStates);
      expect(setEnvSnapshot).not.toHaveBeenCalled();
    });

    it('handles irrigationConfig and irrigationStrategy when present', () => {
      const newDevices: GrowspaceDevice[] = [
        {
          deviceId: 'd1',
          name: 'D1',
          irrigationConfig: { irrigationTimes: [], drainTimes: [] },
          irrigationStrategy: { enabled: true },
          environmentAttributes: { irrigationTanks: [] },
        } as any,
      ];
      vi.mocked(dataService.getGrowspaceDevices).mockReturnValue(newDevices);

      syncService.updateDevicesState();

      expect(setIrrigationConfig).toHaveBeenCalledWith('d1', newDevices[0].irrigationConfig);
      expect(setIrrigationStrategy).toHaveBeenCalledWith('d1', newDevices[0].irrigationStrategy);
      expect(setTankLevels).toHaveBeenCalledWith('d1', []);
    });

    it('skips irrigationConfig and irrigationStrategy when missing', () => {
      const newDevices: GrowspaceDevice[] = [
        {
          deviceId: 'd1',
          name: 'D1',
        } as any,
      ];
      vi.mocked(dataService.getGrowspaceDevices).mockReturnValue(newDevices);

      syncService.updateDevicesState();

      expect(setIrrigationConfig).not.toHaveBeenCalled();
      expect(setIrrigationStrategy).not.toHaveBeenCalled();
      expect(setTankLevels).toHaveBeenCalledWith('d1', []);
    });

    it('adds sensors, plants and pumps to watched entities', () => {
      const newDevices: GrowspaceDevice[] = [
        {
          deviceId: 'd1',
          name: 'D1',
          plants: [{ entity_id: 'sensor.plant_sensor' }],
          irrigationConfig: {
            irrigationTimes: [],
            drainTimes: [],
            irrigationPumpEntity: 'switch.irrigation_pump',
            drainPumpEntity: 'switch.drain_pump',
          },
          environmentAttributes: {
            temperature_sensor: 'sensor.temp',
            non_sensor_string: 'active',
            numeric_attribute: 42,
            boolean_attribute: true,
            array_attribute: ['a', 'b'],
            null_attribute: null,
          },
        } as any,
      ];
      vi.mocked(dataService.getGrowspaceDevices).mockReturnValue(newDevices);

      syncService.updateDevicesState();

      const watched = (syncService as any)._watchedEntities as Set<string>;
      expect(watched.has('sensor.plant_sensor')).toBe(true);
      expect(watched.has('switch.irrigation_pump')).toBe(true);
      expect(watched.has('switch.drain_pump')).toBe(true);
      expect(watched.has('sensor.temp')).toBe(true);

      // Verify that non-sensor/non-string/non-dotted attributes are NOT added
      expect(watched.has('active')).toBe(false);
      expect(watched.has('42')).toBe(false);
    });

    it('skips adding plant to watched entities when plant entity_id is falsy', () => {
      const newDevices: GrowspaceDevice[] = [
        {
          deviceId: 'd1',
          name: 'D1',
          plants: [{ entity_id: undefined } as any, { entity_id: '' } as any],
        } as any,
      ];
      vi.mocked(dataService.getGrowspaceDevices).mockReturnValue(newDevices);

      syncService.updateDevicesState();

      const watched = (syncService as any)._watchedEntities as Set<string>;
      expect(watched.size).toBe(0);
    });

    it('falls back to empty object when dataService.hass is undefined in updateDevicesState', () => {
      dataService.hass = undefined as any;
      const newDevices: GrowspaceDevice[] = [
        { deviceId: 'd1', name: 'Growroom 1', environmentAttributes: {} } as any,
      ];
      vi.mocked(dataService.getGrowspaceDevices).mockReturnValue(newDevices);

      syncService.updateDevicesState();

      expect(setDeviceSnapshot).toHaveBeenCalledWith('d1', newDevices[0], {});
    });

    it('skips auto-selection if gridStore has selectedDevice and defaultApplied is true', () => {
      gridStore.$selectedDevice.set('d1');
      uiStore.$defaultApplied.set(true);

      const newDevices: GrowspaceDevice[] = [{ deviceId: 'd1' } as any];
      vi.mocked(dataService.getGrowspaceDevices).mockReturnValue(newDevices);

      syncService.updateDevicesState();

      expect(gridStore.setSelectedDevice).not.toHaveBeenCalled();
    });

    it('skips auto-selection if devices array is empty', () => {
      gridStore.$selectedDevice.set(null);
      uiStore.$defaultApplied.set(false);

      vi.mocked(dataService.getGrowspaceDevices).mockReturnValue([]);

      syncService.updateDevicesState();

      expect(gridStore.setSelectedDevice).not.toHaveBeenCalled();
    });

    it('returns early if defaultApplied becomes true during auto-selection checking', () => {
      gridStore.$selectedDevice.set(null);
      uiStore.$defaultApplied.set(true);

      const newDevices: GrowspaceDevice[] = [{ deviceId: 'd1' } as any];
      vi.mocked(dataService.getGrowspaceDevices).mockReturnValue(newDevices);

      syncService.updateDevicesState();

      expect(gridStore.setSelectedDevice).not.toHaveBeenCalled();
    });

    it('auto-selects device by default_growspace config match on deviceId', () => {
      gridStore.$selectedDevice.set(null);
      uiStore.$defaultApplied.set(false);
      syncService.setCardConfig({ default_growspace: 'room_id_match' } as any);

      const newDevices: GrowspaceDevice[] = [
        { deviceId: 'd1', name: 'D1' } as any,
        { deviceId: 'room_id_match', name: 'D2' } as any,
      ];
      vi.mocked(dataService.getGrowspaceDevices).mockReturnValue(newDevices);

      syncService.updateDevicesState();

      expect(gridStore.setSelectedDevice).toHaveBeenCalledWith('room_id_match');
      expect(uiStore.setDefaultApplied).toHaveBeenCalledWith(true);
    });

    it('auto-selects device by default_growspace config match on name', () => {
      gridStore.$selectedDevice.set(null);
      uiStore.$defaultApplied.set(false);
      syncService.setCardConfig({ default_growspace: 'room_name_match' } as any);

      const newDevices: GrowspaceDevice[] = [
        { deviceId: 'd1', name: 'D1' } as any,
        { deviceId: 'd2', name: 'room_name_match' } as any,
      ];
      vi.mocked(dataService.getGrowspaceDevices).mockReturnValue(newDevices);

      syncService.updateDevicesState();

      expect(gridStore.setSelectedDevice).toHaveBeenCalledWith('d2');
      expect(uiStore.setDefaultApplied).toHaveBeenCalledWith(true);
    });

    it('falls back to auto-selecting the first device if default_growspace does not match', () => {
      gridStore.$selectedDevice.set(null);
      uiStore.$defaultApplied.set(false);
      syncService.setCardConfig({ default_growspace: 'no_match' } as any);

      const newDevices: GrowspaceDevice[] = [
        { deviceId: 'first_device', name: 'D1' } as any,
        { deviceId: 'second_device', name: 'D2' } as any,
      ];
      vi.mocked(dataService.getGrowspaceDevices).mockReturnValue(newDevices);

      syncService.updateDevicesState();

      expect(gridStore.setSelectedDevice).toHaveBeenCalledWith('first_device');
      expect(uiStore.setDefaultApplied).toHaveBeenCalledWith(true);
    });
  });

  describe('_areDeviceArraysEqual private method', () => {
    it('returns true when array references are identical', () => {
      const devices = [{ deviceId: 'd1' } as any];
      const result = (syncService as any)._areDeviceArraysEqual(devices, devices);
      expect(result).toBe(true);
    });

    it('returns false if either array is null or undefined', () => {
      const devices = [{ deviceId: 'd1' } as any];
      expect((syncService as any)._areDeviceArraysEqual(null as any, devices)).toBe(false);
      expect((syncService as any)._areDeviceArraysEqual(devices, undefined as any)).toBe(false);
    });

    it('returns false if array lengths are different', () => {
      const devices1 = [{ deviceId: 'd1' } as any];
      const devices2 = [{ deviceId: 'd1' } as any, { deviceId: 'd2' } as any];
      expect((syncService as any)._areDeviceArraysEqual(devices1, devices2)).toBe(false);
    });

    it('returns true if both arrays are empty', () => {
      expect((syncService as any)._areDeviceArraysEqual([], [])).toBe(true);
    });

    it('returns true if stringified content is identical', () => {
      const devices1 = [{ deviceId: 'd1' } as any];
      const devices2 = [{ deviceId: 'd1' } as any];
      expect((syncService as any)._areDeviceArraysEqual(devices1, devices2)).toBe(true);
    });

    it('returns false if stringified content is different', () => {
      const devices1 = [{ deviceId: 'd1', name: 'D1' } as any];
      const devices2 = [{ deviceId: 'd1', name: 'D2' } as any];
      expect((syncService as any)._areDeviceArraysEqual(devices1, devices2)).toBe(false);
    });

    it('catches json stringify exception and returns false for circular reference arrays', () => {
      const circularObj: any = { deviceId: 'd1' };
      circularObj.self = circularObj; // circular reference!

      const devices1 = [circularObj];
      const devices2 = [{ deviceId: 'd1' } as any];

      expect((syncService as any)._areDeviceArraysEqual(devices1, devices2)).toBe(false);
    });
  });
});
