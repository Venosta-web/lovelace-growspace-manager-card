import { ReactiveController, ReactiveControllerHost } from 'lit';
import { HomeAssistant } from 'custom-card-helpers';
import * as dataStore from '../store/data-store';

export class SubscriptionController implements ReactiveController {
    private host: ReactiveControllerHost;
    private _unsubEvents?: () => void;
    private _hass?: HomeAssistant;
    private _onUpdate?: () => void;

    constructor(host: ReactiveControllerHost, onUpdate?: () => void) {
        this.host = host;
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

    private _handleEvent(event: any) {
        const { event_type, data } = event.data;

        if (event_type === 'plant_added' || event_type === 'plant_updated') {
            this._handlePlantUpdate(data.plant);
        } else if (event_type === 'plant_removed') {
            this._handlePlantRemoval(data.plant_id, data.growspace_id);
        }

        if (this._onUpdate) this._onUpdate();
    }

    // Logic moved from GrowspaceStore, adapted to use dataStore actions
    private _handlePlantUpdate(plantData: any) {
        // 1. Remove old instance (handle moves) - simplified cache update
        dataStore.removePlantFromWsCache(plantData.plant_id);

        // 2. Add to new location
        const gsId = plantData.growspace_id || plantData.attributes?.growspace_id;
        if (gsId) {
            const correctKey = `position_${plantData.row}_${plantData.col}`;
            dataStore.updateWsDataCacheGrid(gsId, (grid) => {
                grid[correctKey] = plantData;
            });
        }
    }

    private _handlePlantRemoval(plantId: string, growspaceId?: string) {
        dataStore.removePlantFromWsCache(plantId, growspaceId);
    }
}
