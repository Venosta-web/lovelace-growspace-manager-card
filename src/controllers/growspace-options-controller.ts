import { ReactiveController, ReactiveControllerHost } from 'lit';
import { HomeAssistant } from 'custom-card-helpers';
import { HassSubscriptionController } from './hass-subscription-controller';

export type GrowspaceOption = { id: string; name: string };

export class GrowspaceOptionsController implements ReactiveController {
  private _host: ReactiveControllerHost;
  private _subscriptionController: HassSubscriptionController;
  private _subscribed = false;

  options: GrowspaceOption[] = [];

  constructor(host: ReactiveControllerHost) {
    this._host = host;
    this._subscriptionController = new HassSubscriptionController(host);
    host.addController(this);
  }

  hostConnected() {}

  hostDisconnected() {
    this._subscriptionController.unsubscribeAll();
    this._subscribed = false;
  }

  update(hass: HomeAssistant): void {
    this._loadFromState(hass);
    this._subscribe(hass);
  }

  private _loadFromState(hass: HomeAssistant): void {
    const entity = hass.states['sensor.growspaces_list'];
    const raw = entity?.attributes?.growspaces;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      this.options = Object.entries(raw as Record<string, string>).map(([id, name]) => ({
        id,
        name: String(name),
      }));
    } else {
      this.options = [];
    }
    this._host.requestUpdate();
  }

  private async _subscribe(hass: HomeAssistant): Promise<void> {
    if (this._subscribed) return;
    this._subscribed = true;

    await this._subscriptionController.subscribeEvents(
      hass,
      (event: unknown) => {
        const e = event as {
          data?: {
            new_state?: {
              entity_id?: string;
              attributes?: { growspaces?: Record<string, string> };
            };
          };
        };
        if (e.data?.new_state?.entity_id !== 'sensor.growspaces_list') return;
        const raw = e.data.new_state.attributes?.growspaces;
        if (raw) {
          this.options = Object.entries(raw).map(([id, name]) => ({ id, name: String(name) }));
        } else {
          this.options = [];
        }
        this._host.requestUpdate();
      },
      'state_changed'
    );
  }
}
