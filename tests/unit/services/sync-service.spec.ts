import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncService } from '../../../src/services/sync-service';
import { DataService } from '../../../src/services/data-service';
import { GrowspaceDataStore } from '../../../src/store/core/data-store';
import { GrowspaceUIStore } from '../../../src/store/ui/ui-store';
import { GridSliceRef } from '../../../src/slices/grid';
import { setDeviceSnapshot } from '../../../src/slices/device-state';
import { setEnvSnapshot } from '../../../src/slices/environment';
import { setPlants } from '../../../src/slices/plant';
import { setIrrigationConfig, setIrrigationStrategy, setTankLevels } from '../../../src/slices/irrigation';
import { HomeAssistant } from 'custom-card-helpers';
import { GrowspaceDevice, GrowspaceManagerCardConfig, GrowspaceAPIResponse } from '../../../src/types';
import { atom } from 'nanostores';

vi.mock('../../../src/slices/device-state', () => ({
  setDeviceSnapshot: vi.fn(),
}));

vi.mock('../../../src/slices/environment', () => ({
  setEnvSnapshot: vi.fn(),
}));

vi.mock('../../../src/slices/plant', () => ({
  setPlants: vi.fn(),
}));

vi.mock('../../../src/slices/irrigation', () => ({
  setIrrigationConfig: vi.fn(),
  setIrrigationStrategy: vi.fn(),
  setTankLevels: vi.fn(),
}));

describe('SyncService Boilerplate', () => {
  let syncService: SyncService;
  let dataService: DataService;
  let dataStore: GrowspaceDataStore;
  let uiStore: GrowspaceUIStore;
  let gridStore: GridSliceRef;

  beforeEach(() => {
    vi.clearAllMocks();

    dataService = {
      updateHass: vi.fn(),
      fetchGrowspaceData: vi.fn(),
      getGrowspaceDevices: vi.fn(() => []),
      hass: undefined,
    } as unknown as DataService;

    dataStore = {
      $devices: atom<GrowspaceDevice[]>([]),
      $wsDataCache: atom<Record<string, GrowspaceAPIResponse>>({}),
      setWsDataCache: vi.fn((cache: Record<string, GrowspaceAPIResponse>) => {
        dataStore.$wsDataCache.set(cache);
      }),
      setDevices: vi.fn((devices: GrowspaceDevice[]) => {
        dataStore.$devices.set(devices);
      }),
    } as unknown as GrowspaceDataStore;

    uiStore = {
      $defaultApplied: atom<boolean>(false),
      setDefaultApplied: vi.fn((applied: boolean) => {
        uiStore.$defaultApplied.set(applied);
      }),
      setIsLoading: vi.fn(),
    } as unknown as GrowspaceUIStore;

    gridStore = {
      $selectedDevice: atom<any>(null),
      setSelectedDevice: vi.fn((id: string) => {
        gridStore.$selectedDevice.set(id);
      }),
    } as unknown as GridSliceRef;

    syncService = new SyncService(dataService, dataStore, uiStore, gridStore);
  });

  it('initializes correctly', () => {
    expect(syncService).toBeDefined();
  });
});
