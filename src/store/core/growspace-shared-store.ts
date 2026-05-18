import { HomeAssistant } from 'custom-card-helpers';

import { DataService } from '../../data-service';
import { GrowspaceDataStore } from './data-store';

export class GrowspaceSharedStore {
  public readonly data: GrowspaceDataStore;
  public readonly dataService: DataService;

  private _hass?: HomeAssistant;
  private _unsubEvents?: () => void;

  constructor() {
    this.dataService = new DataService();
    this.data = new GrowspaceDataStore();
  }

  updateHass(hass: HomeAssistant): void {
    if (this._hass === hass) return;
    this._hass = hass;
    this.dataService.updateHass(hass);
    if (!this._unsubEvents) {
      this._subscribe(hass);
    }
  }

  destroy(): void {
    this._unsubscribe();
  }

  private async _subscribe(hass: HomeAssistant): Promise<void> {
    if (this._unsubEvents || !hass) return;
    try {
      this._unsubEvents = await hass.connection.subscribeEvents(
        (event) => this._handleEvent(event),
        'growspace_manager_updated'
      );
    } catch (err) {
      console.error('[GrowspaceSharedStore] Failed to subscribe to growspace events', err);
    }
  }

  private _unsubscribe(): void {
    if (this._unsubEvents) {
      this._unsubEvents();
      this._unsubEvents = undefined;
    }
  }

  private _handleEvent(event: unknown): void {
    const haEvent = event as { data?: { event_type?: string; data?: Record<string, unknown> } };

    if (
      !haEvent.data ||
      typeof haEvent.data.event_type !== 'string' ||
      typeof haEvent.data.data !== 'object'
    ) {
      console.warn('[GrowspaceSharedStore] Received malformed growspace event', event);
      return;
    }

    const { event_type, data } = haEvent.data;

    if (event_type === 'plant_added' || event_type === 'plant_updated') {
      this._handlePlantUpdate(data.plant);
    } else if (event_type === 'plant_removed') {
      this._handlePlantRemoval(data.plant_id as string, data.growspace_id as string | undefined);
    } else if (event_type === 'growspace_manager_updated') {
      this.dataService.invalidateCache();
      this.data.$staleCounter.set(this.data.$staleCounter.get() + 1);
    }
  }

  private _handlePlantUpdate(plantData: unknown): void {
    const data = plantData as {
      plant_id?: string;
      growspace_id?: string;
      attributes?: { growspace_id?: string };
      row?: number;
      col?: number;
    };
    const plantId = data?.plant_id;

    if (!plantId) {
      console.warn('[GrowspaceSharedStore] Plant update event missing plant_id', plantData);
      return;
    }

    this.data.removePlantFromWsCache(plantId);

    const gsId = data.growspace_id || data.attributes?.growspace_id;
    if (gsId && typeof data.row === 'number' && typeof data.col === 'number') {
      const correctKey = `position_${data.row}_${data.col}`;
      this.data.updateWsDataCacheGrid(gsId, (grid) => {
        grid[correctKey] = plantData;
      });
    }
  }

  private _handlePlantRemoval(plantId: string, growspaceId?: string): void {
    this.data.removePlantFromWsCache(plantId, growspaceId);
  }
}
