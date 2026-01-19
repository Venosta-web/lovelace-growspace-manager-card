import { ReactiveController, ReactiveControllerHost } from 'lit';
import { HomeAssistant } from 'custom-card-helpers';

export class HassSubscriptionController implements ReactiveController {
  private _host: ReactiveControllerHost;
  private _unsubscribes: Array<() => void> = [];

  constructor(host: ReactiveControllerHost) {
    this._host = host;
    host.addController(this);
  }

  hostConnected() {}

  hostDisconnected() {
    this.unsubscribeAll();
  }

  /**
   * Subscribe to Home Assistant events and automatically manage cleanup.
   */
  async subscribeEvents(
    hass: HomeAssistant,
    callback: (event: any) => void,
    eventType: string
  ): Promise<void> {
    if (!hass || !hass.connection) return;

    try {
      const unsub = await hass.connection.subscribeEvents(callback, eventType);
      this._unsubscribes.push(unsub);
    } catch (err) {
      console.error('HassSubscriptionController: Subscription failed', err);
    }
  }

  /**
   * Generic subscription helper. Accepts any unsubscribe function.
   */
  addUnsubscribe(unsub: () => void): void {
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
      } catch (e) {
        console.warn('HassSubscriptionController: Error during unsubscribe', e);
      }
    });
    this._unsubscribes = [];
  }
}
