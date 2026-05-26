/**
 * Event Bus Controller - Manages event bus subscriptions with automatic cleanup
 *
 * Subscribes to event bus on connect and unsubscribes on disconnect
 */

import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { EventBus, EventHandler, Unsubscribe } from '../events/event-bus';

/**
 * Reactive controller for event bus subscriptions
 */
export class EventBusController<T = any> implements ReactiveController {
  private unsubscribe?: Unsubscribe;

  constructor(
    private host: ReactiveControllerHost,
    private eventBus: EventBus,
    private eventName: string,
    private handler: EventHandler<T>
  ) {
    this.host.addController(this);
  }

  hostConnected(): void {
    // Subscribe to event
    this.unsubscribe = this.eventBus.on(this.eventName, this.handler);
  }

  hostDisconnected(): void {
    // Unsubscribe from event
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }

  /**
   * Manually unsubscribe (useful for conditional subscriptions)
   */
  disconnect(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }

  /**
   * Manually resubscribe
   */
  reconnect(): void {
    this.disconnect();
    this.unsubscribe = this.eventBus.on(this.eventName, this.handler);
  }
}
