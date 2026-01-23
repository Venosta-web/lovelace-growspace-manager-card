import { ReactiveController, ReactiveControllerHost } from 'lit';
import { HomeAssistant } from 'custom-card-helpers';
import { GrowspaceDataStore } from '../store/core/data-store';

export class SubscriptionController implements ReactiveController {
  private host: ReactiveControllerHost;
  private _unsubEvents?: () => void;
  private _hass?: HomeAssistant;
  private _onUpdate?: (refresh?: boolean) => void;
  private dataStore: GrowspaceDataStore;

  constructor(host: ReactiveControllerHost, dataStore: GrowspaceDataStore, onUpdate?: (refresh?: boolean) => void) {
    this.host = host;
    this.dataStore = dataStore;
    this._onUpdate = onUpdate;
    host.addController(this);
  }

  hostConnected() {
    if (this._hass) {
      this.subscribe(this._hass);
    }
  }

  hostDisconnected() {
    this.unsubscribe();
  }

  updateHass(hass: HomeAssistant) {
    if (this._hass !== hass) {
      this._hass = hass;
      // Subscribe if not already subscribed
      if (!this._unsubEvents) {
        this.subscribe(hass);
      }
    }
  }

  async subscribe(hass: HomeAssistant) {
    if (this._unsubEvents || !hass) return;
    this._hass = hass;

    try {
      this._unsubEvents = await hass.connection.subscribeEvents(
        (event) => this._handleEvent(event),
        'growspace_manager_updated'
      );
    } catch (err) {
      console.error('Failed to subscribe to growspace events', err);
    }
  }

  unsubscribe() {
    if (this._unsubEvents) {
      this._unsubEvents();
      this._unsubEvents = undefined;
    }
  }

  private _handleEvent(event: unknown) {
    // Type guard for event structure
    const haEvent = event as { data?: { event_type?: string; data?: Record<string, unknown> } };

    if (!haEvent.data || typeof haEvent.data.event_type !== 'string' || typeof haEvent.data.data !== 'object') {
      console.warn('Received malformed growspace event', event);
      return;
    }

    // eslint-disable-next-line camelcase
    const { event_type, data } = haEvent.data;

    // eslint-disable-next-line camelcase
    let requestedRefresh = false;
    if (event_type === 'plant_added' || event_type === 'plant_updated') {
      this._handlePlantUpdate(data.plant);
      // eslint-disable-next-line camelcase
    } else if (event_type === 'plant_removed') {
      this._handlePlantRemoval(data.plant_id as string, data.growspace_id as string | undefined);
    } else if (event_type === 'growspace_manager_updated') {
      requestedRefresh = true;
    }

    if (this._onUpdate) this._onUpdate(requestedRefresh);
  }

  // Logic moved from GrowspaceStore, adapted to use dataStore actions
  private _handlePlantUpdate(plantData: unknown) {
    const data = plantData as { plant_id?: string; growspace_id?: string; attributes?: { growspace_id?: string }; row?: number; col?: number };
    const plantId = data?.plant_id;

    if (!plantId) {
      console.warn('Received plant update event without plant_id', plantData);
      return;
    }

    // 1. Remove old instance (handle moves) - simplified cache update
    this.dataStore.removePlantFromWsCache(plantId);

    // 2. Add to new location
    const gsId = data.growspace_id || data.attributes?.growspace_id;
    if (gsId && typeof data.row === 'number' && typeof data.col === 'number') {
      const correctKey = `position_${data.row}_${data.col}`;
      this.dataStore.updateWsDataCacheGrid(gsId, (grid) => {
        grid[correctKey] = plantData;
      });
    }
  }

  private _handlePlantRemoval(plantId: string, growspaceId?: string) {
    this.dataStore.removePlantFromWsCache(plantId, growspaceId);
  }
}
