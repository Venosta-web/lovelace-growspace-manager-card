/**
 * Event Bus - Centralized event system for cross-component communication
 *
 * Provides a typed, subscription-based event system that allows components
 * to communicate without tight coupling or prop drilling.
 */

/**
 * Event handler function type
 */
export type EventHandler<T = any> = (payload: T) => void;

/**
 * Unsubscribe function type
 */
export type Unsubscribe = () => void;

/**
 * Event Bus for pub/sub communication
 */
export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private debug = false;

  /**
   * Enable/disable debug logging
   */
  setDebug(enabled: boolean): void {
    this.debug = enabled;
  }

  /**
   * Subscribe to an event
   *
   * @param event - Event name to subscribe to
   * @param handler - Handler function to call when event is emitted
   * @returns Unsubscribe function
   */
  on<T = any>(event: string, handler: EventHandler<T>): Unsubscribe {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }

    const handlers = this.handlers.get(event)!;
    handlers.add(handler);

    if (this.debug) {
      console.log(`[EventBus] Subscribed to "${event}" (${handlers.size} handlers)`);
    }

    // Return unsubscribe function
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(event);
      }

      if (this.debug) {
        console.log(`[EventBus] Unsubscribed from "${event}"`);
      }
    };
  }

  /**
   * Emit an event to all subscribers
   *
   * @param event - Event name to emit
   * @param payload - Data to pass to handlers
   */
  emit<T = any>(event: string, payload: T): void {
    const handlers = this.handlers.get(event);

    if (!handlers || handlers.size === 0) {
      if (this.debug) {
        console.warn(`[EventBus] No handlers for event "${event}"`);
      }
      return;
    }

    if (this.debug) {
      console.log(`[EventBus] Emitting "${event}" to ${handlers.size} handlers`, payload);
    }

    // Call all handlers (catch errors to prevent one handler from breaking others)
    handlers.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        console.error(`[EventBus] Handler error for event "${event}":`, error);
      }
    });
  }

  /**
   * Subscribe to an event, but only handle it once
   *
   * @param event - Event name to subscribe to
   * @param handler - Handler function (will be called once and auto-unsubscribed)
   */
  once<T = any>(event: string, handler: EventHandler<T>): void {
    const wrappedHandler = (payload: T) => {
      handler(payload);
      this.handlers.get(event)?.delete(wrappedHandler);

      if (this.debug) {
        console.log(`[EventBus] One-time handler for "${event}" executed and removed`);
      }
    };

    this.on(event, wrappedHandler);
  }

  /**
   * Check if event has any subscribers
   *
   * @param event - Event name to check
   * @returns True if event has subscribers
   */
  hasSubscribers(event: string): boolean {
    const handlers = this.handlers.get(event);
    return !!handlers && handlers.size > 0;
  }

  /**
   * Get number of subscribers for an event
   *
   * @param event - Event name to check
   * @returns Number of subscribers
   */
  subscriberCount(event: string): number {
    return this.handlers.get(event)?.size || 0;
  }

  /**
   * Remove all subscribers for a specific event
   *
   * @param event - Event name to clear
   */
  off(event: string): void {
    this.handlers.delete(event);

    if (this.debug) {
      console.log(`[EventBus] Cleared all handlers for "${event}"`);
    }
  }

  /**
   * Remove all subscribers for all events
   */
  clear(): void {
    const eventCount = this.handlers.size;
    this.handlers.clear();

    if (this.debug) {
      console.log(`[EventBus] Cleared all handlers (${eventCount} events)`);
    }
  }

  /**
   * Get all event names that have subscribers
   *
   * @returns Array of event names
   */
  getEvents(): string[] {
    return Array.from(this.handlers.keys());
  }
}

/**
 * Typed event bus for specific event types
 *
 * Usage:
 * ```typescript
 * interface MyEvents {
 *   'user:login': { userId: string };
 *   'user:logout': void;
 * }
 *
 * const bus = new TypedEventBus<MyEvents>();
 * bus.on('user:login', (payload) => console.log(payload.userId));
 * bus.emit('user:login', { userId: '123' });
 * ```
 */
export class TypedEventBus<TEvents extends Record<string, any>> {
  private bus = new EventBus();

  setDebug(enabled: boolean): void {
    this.bus.setDebug(enabled);
  }

  on<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>
  ): Unsubscribe {
    return this.bus.on(event as string, handler);
  }

  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
    this.bus.emit(event as string, payload);
  }

  once<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): void {
    this.bus.once(event as string, handler);
  }

  hasSubscribers<K extends keyof TEvents>(event: K): boolean {
    return this.bus.hasSubscribers(event as string);
  }

  subscriberCount<K extends keyof TEvents>(event: K): number {
    return this.bus.subscriberCount(event as string);
  }

  off<K extends keyof TEvents>(event: K): void {
    this.bus.off(event as string);
  }

  clear(): void {
    this.bus.clear();
  }

  getEvents(): (keyof TEvents)[] {
    return this.bus.getEvents() as (keyof TEvents)[];
  }
}
