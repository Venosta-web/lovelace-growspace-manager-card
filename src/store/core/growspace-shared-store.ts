import { HomeAssistant } from 'custom-card-helpers';

import { DataService } from '../../services/data-service';
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

  private _handleEvent(_event: unknown): void {
    this.dataService.invalidateCache();
    this.data.$staleCounter.set(this.data.$staleCounter.get() + 1);
  }
}
