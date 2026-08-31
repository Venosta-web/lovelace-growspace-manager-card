/*! growspace-e2e-build source=0965bd1ff4f3be074c2464b4d2239802448e95390fd50328d1bea113eeadf6e9 id=8e7f19c04d5181654983a0913b27fcdb */
import { x, dj as localize } from './growspace-index-C3H18FdY.js';

class HassSubscriptionController {
    constructor(host) {
        this._unsubscribes = [];
        this._host = host;
        host.addController(this);
    }
    hostConnected() { }
    hostDisconnected() {
        this.unsubscribeAll();
    }
    /**
     * Subscribe to Home Assistant events and automatically manage cleanup.
     */
    async subscribeEvents(hass, callback, eventType) {
        if (!hass || !hass.connection)
            return;
        try {
            const unsub = await hass.connection.subscribeEvents(callback, eventType);
            this._unsubscribes.push(unsub);
        }
        catch (err) {
            console.error('HassSubscriptionController: Subscription failed', err);
        }
    }
    /**
     * Generic subscription helper. Accepts any unsubscribe function.
     */
    addUnsubscribe(unsub) {
        if (typeof unsub === 'function') {
            this._unsubscribes.push(unsub);
        }
    }
    /**
     * Manually unsubscribe all listeners.
     */
    unsubscribeAll() {
        this._unsubscribes.forEach((unsub) => {
            try {
                unsub();
            }
            catch (e) {
                console.warn('HassSubscriptionController: Error during unsubscribe', e);
            }
        });
        this._unsubscribes = [];
    }
}

class GrowspaceOptionsController {
    get hasOptions() {
        return this.options.length > 0;
    }
    renderEmptyState(language) {
        if (this.hasOptions)
            return x ``;
        return x `
      <ha-alert alert-type="info"> ${localize('editor.no_growspaces', '', '', language)} </ha-alert>
    `;
    }
    filterUnavailableFields(schema) {
        return this.hasOptions
            ? schema
            : schema.filter((field) => field.name !== 'default_growspace' && field.name !== 'growspaces');
    }
    constructor(host) {
        this._subscribed = false;
        this.options = [];
        this._host = host;
        this._subscriptionController = new HassSubscriptionController(host);
        host.addController(this);
    }
    hostConnected() { }
    hostDisconnected() {
        this._subscriptionController.unsubscribeAll();
        this._subscribed = false;
    }
    update(hass) {
        this._loadFromState(hass);
        this._subscribe(hass);
    }
    _loadFromState(hass) {
        const entity = hass.states['sensor.growspaces_list'];
        const raw = entity?.attributes?.growspaces;
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
            this.options = Object.entries(raw).map(([id, value]) => ({
                id,
                name: typeof value === 'object' && value !== null
                    ? String(value.name ?? id)
                    : String(value),
            }));
        }
        else {
            this.options = [];
        }
        this._host.requestUpdate();
    }
    async _subscribe(hass) {
        if (this._subscribed)
            return;
        this._subscribed = true;
        await this._subscriptionController.subscribeEvents(hass, (event) => {
            const e = event;
            if (e.data?.new_state?.entity_id !== 'sensor.growspaces_list')
                return;
            const raw = e.data.new_state.attributes?.growspaces;
            if (raw) {
                this.options = Object.entries(raw).map(([id, name]) => ({ id, name: String(name) }));
            }
            else {
                this.options = [];
            }
            this._host.requestUpdate();
        }, 'state_changed');
    }
}

export { GrowspaceOptionsController as G };
//# sourceMappingURL=growspace-growspace-options-controller-D5MKdWG3.js.map
