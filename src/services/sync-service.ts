import { HomeAssistant } from 'custom-card-helpers';
import { DataService } from '../data-service';
import { GrowspaceDataStore } from '../store/core/data-store';
import { GrowspaceUIStore } from '../store/ui/ui-store';
import { GrowspaceGridStore } from '../store/grid/grid-store';
import { GrowspaceAPIResponse, GrowspaceDevice, GrowspaceManagerCardConfig } from '../types';

/**
 * Service responsible for synchronizing data between Home Assistant and the local store.
 * Handles caching, optimizing updates, and managing the initial data fetch.
 */
export class SyncService {
  private _isFetchingWS = false;
  private _lastHassRef: HomeAssistant | undefined;
  private _watchedEntities = new Set<string>();
  /** Per-card config — not shared across card instances. */
  private _cardConfig: GrowspaceManagerCardConfig = {} as GrowspaceManagerCardConfig;

  public setCardConfig(config: GrowspaceManagerCardConfig): void {
    if (config.default_growspace !== this._cardConfig?.default_growspace) {
      this.uiStore.setDefaultApplied(false);
    }
    this._cardConfig = config;
  }

  constructor(
    private dataService: DataService,
    private dataStore: GrowspaceDataStore,
    private uiStore: GrowspaceUIStore,
    private gridStore: GrowspaceGridStore
  ) { }

  /**
   * Updates the Home Assistant reference and triggers data refresh if necessary.
   * Implements optimization to avoid unnecessary processing.
   */
  public updateHass(hass: HomeAssistant): void {
    // Optimization: Referencing check
    if (this._lastHassRef === hass) return;

    this.dataService.updateHass(hass);

    // If cache empty, fetch initial
    const currentCache = this.dataStore.$wsDataCache.get();
    if (Object.keys(currentCache).length === 0 && !this._isFetchingWS) {
      this.refreshGrowspaceData();
      this._lastHassRef = hass;
      return;
    }

    // Deep Optimization: Only update if watched entities changed
    if (this._watchedEntities.size > 0 && this._lastHassRef) {
      let hasChanged = false;
      for (const entityId of this._watchedEntities) {
        const newState = hass.states[entityId];
        const oldState = this._lastHassRef.states[entityId];

        // Fast reference check + check for missing/new states
        if (
          newState !== oldState ||
          (newState === undefined && oldState !== undefined) ||
          (newState !== undefined && oldState === undefined)
        ) {
          hasChanged = true;
          break;
        }
      }
      if (!hasChanged) {
        this._lastHassRef = hass;
        return;
      }
    }

    // Just re-calculate derived state (sync) because entities might have changed
    this.updateDevicesState();
    this.uiStore.setIsLoading(false);
    this._lastHassRef = hass;
  }

  /**
   * Refreshes growspace data from the WebSocket API.
   * Manages loading state and error handling.
   */
  public async refreshGrowspaceData(): Promise<void> {
    if (!this.dataService.hass || this._isFetchingWS) return;
    this._isFetchingWS = true;

    // Show loading spinner if we have no devices yet
    if (this.dataStore.$devices.get().length === 0) {
      this.uiStore.setIsLoading(true);
    }

    try {
      const data = await this.dataService.fetchGrowspaceData();
      this.dataStore.setWsDataCache((data as unknown as Record<string, GrowspaceAPIResponse>) || {});
      this.updateDevicesState();
    } catch (e) {
      console.error('Failed to fetch growspace data', e);
    } finally {
      this._isFetchingWS = false;
      this.uiStore.setIsLoading(false);
    }
  }

  /**
   * Updates the devices state in the store based on cached data and current HA state.
   * Also updates the list of watched entities for optimization.
   */
  public updateDevicesState(): void {
    const devices = this.dataService.getGrowspaceDevices(this.dataStore.$wsDataCache.get());
    const currentDevices = this.dataStore.$devices.get();

    if (!this._areDeviceArraysEqual(currentDevices, devices)) {
      this.dataStore.setDevices(devices);
    }

    // Populate watched entities for next update cycle
    this._watchedEntities.clear();
    devices.forEach((d) => {
      // Plants
      (d.plants || []).forEach((p) => {
        const eid = p.entity_id;
        if (eid) this._watchedEntities.add(eid);
      });
      // Irrigation Config
      if (d.irrigationConfig?.irrigationPumpEntity)
        this._watchedEntities.add(d.irrigationConfig.irrigationPumpEntity);
      if (d.irrigationConfig?.drainPumpEntity)
        this._watchedEntities.add(d.irrigationConfig.drainPumpEntity);
      // Environment Sensors (e.g. temperature_sensor: 'sensor.x')
      if (d.environmentAttributes) {
        Object.values(d.environmentAttributes).forEach((val) => {
          if (typeof val === 'string' && val.includes('.')) {
            this._watchedEntities.add(val);
          }
        });
      }
    });

    const selectedDevice = this.gridStore.$selectedDevice.get();
    // Auto-select if needed
    if ((!selectedDevice || !this.uiStore.$defaultApplied.get()) && devices.length > 0) {
      const config = this._cardConfig;
      // Default to true if not defined
      const autoSelect = true;

      if (this.uiStore.$defaultApplied.get()) return;

      const defaultDevice = devices.find(
        (d) => d.deviceId === config.default_growspace || d.name === config.default_growspace
      );
      if (defaultDevice) {
        this.gridStore.setSelectedDevice(defaultDevice.deviceId);
        this.uiStore.setDefaultApplied(true);
        return;
      }

      // Fallback to first device only if autoSelect is enabled
      if (autoSelect) {
        this.gridStore.setSelectedDevice(devices[0].deviceId);
      }
      this.uiStore.setDefaultApplied(true);
    }
  }

  private _areDeviceArraysEqual(a: GrowspaceDevice[], b: GrowspaceDevice[]): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    if (a.length === 0) return true;

    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch (_) {
      return false;
    }
  }
}
