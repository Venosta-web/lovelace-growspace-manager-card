/**
 * Event Bus Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus, TypedEventBus } from './event-bus';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('on/emit', () => {
    it('should subscribe and emit events', () => {
      const handler = vi.fn();
      eventBus.on('test-event', handler);
      eventBus.emit('test-event', { data: 'test' });

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should support multiple subscribers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('test-event', handler1);
      eventBus.on('test-event', handler2);
      eventBus.emit('test-event', 'payload');

      expect(handler1).toHaveBeenCalledWith('payload');
      expect(handler2).toHaveBeenCalledWith('payload');
    });

    it('should return unsubscribe function', () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.on('test-event', handler);

      eventBus.emit('test-event', 'first');
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();
      eventBus.emit('test-event', 'second');
      expect(handler).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });

  describe('once', () => {
    it('should only handle event once', () => {
      const handler = vi.fn();
      eventBus.once('test-event', handler);

      eventBus.emit('test-event', 'first');
      eventBus.emit('test-event', 'second');

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith('first');
    });
  });

  describe('off', () => {
    it('should remove all handlers for an event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('test-event', handler1);
      eventBus.on('test-event', handler2);
      eventBus.off('test-event');
      eventBus.emit('test-event', 'payload');

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should remove all event handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('event1', handler1);
      eventBus.on('event2', handler2);
      eventBus.clear();

      eventBus.emit('event1', 'test');
      eventBus.emit('event2', 'test');

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('hasSubscribers', () => {
    it('should check if event has subscribers', () => {
      expect(eventBus.hasSubscribers('test-event')).toBe(false);

      const unsubscribe = eventBus.on('test-event', () => {});
      expect(eventBus.hasSubscribers('test-event')).toBe(true);

      unsubscribe();
      expect(eventBus.hasSubscribers('test-event')).toBe(false);
    });
  });

  describe('subscriberCount', () => {
    it('should return number of subscribers', () => {
      expect(eventBus.subscriberCount('test-event')).toBe(0);

      const unsub1 = eventBus.on('test-event', () => {});
      expect(eventBus.subscriberCount('test-event')).toBe(1);

      const unsub2 = eventBus.on('test-event', () => {});
      expect(eventBus.subscriberCount('test-event')).toBe(2);

      unsub1();
      expect(eventBus.subscriberCount('test-event')).toBe(1);

      unsub2();
      expect(eventBus.subscriberCount('test-event')).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should catch handler errors and continue', () => {
      const handler1 = vi.fn(() => {
        throw new Error('Handler 1 error');
      });
      const handler2 = vi.fn();

      eventBus.on('test-event', handler1);
      eventBus.on('test-event', handler2);

      // Should not throw
      expect(() => eventBus.emit('test-event', 'test')).not.toThrow();

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled(); // Should still be called
    });
  });
});

describe('EventBus (additional coverage)', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('setDebug', () => {
    it('enables debug logging without throwing', () => {
      expect(() => eventBus.setDebug(true)).not.toThrow();
      expect(() => eventBus.setDebug(false)).not.toThrow();
    });

    it('logs subscription events in debug mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      eventBus.setDebug(true);
      eventBus.on('debug-event', () => {});
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Subscribed')
      );
      consoleSpy.mockRestore();
    });

    it('logs emit events in debug mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      eventBus.setDebug(true);
      eventBus.on('debug-event', () => {});
      consoleSpy.mockClear();
      eventBus.emit('debug-event', 'payload');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Emitting'),
        expect.anything()
      );
      consoleSpy.mockRestore();
    });

    it('logs a warning when emitting with no handlers in debug mode', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      eventBus.setDebug(true);
      eventBus.emit('no-handlers-event', 'data');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No handlers'));
      warnSpy.mockRestore();
    });

    it('logs unsubscribe in debug mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      eventBus.setDebug(true);
      const unsub = eventBus.on('debug-event', () => {});
      consoleSpy.mockClear();
      unsub();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unsubscribed'));
      consoleSpy.mockRestore();
    });

    it('logs off in debug mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      eventBus.setDebug(true);
      eventBus.on('debug-event', () => {});
      consoleSpy.mockClear();
      eventBus.off('debug-event');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cleared all handlers'));
      consoleSpy.mockRestore();
    });

    it('logs clear in debug mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      eventBus.setDebug(true);
      eventBus.on('e1', () => {});
      consoleSpy.mockClear();
      eventBus.clear();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cleared all handlers'));
      consoleSpy.mockRestore();
    });
  });

  describe('getEvents', () => {
    it('returns empty array when no events are registered', () => {
      expect(eventBus.getEvents()).toEqual([]);
    });

    it('returns all event names with active subscribers', () => {
      eventBus.on('event-a', () => {});
      eventBus.on('event-b', () => {});
      const events = eventBus.getEvents();
      expect(events).toContain('event-a');
      expect(events).toContain('event-b');
    });

    it('removes event name after all subscribers unsubscribe', () => {
      const unsub = eventBus.on('temp-event', () => {});
      expect(eventBus.getEvents()).toContain('temp-event');
      unsub();
      expect(eventBus.getEvents()).not.toContain('temp-event');
    });
  });
});

describe('TypedEventBus', () => {
  interface TestEvents {
    'user:login': { userId: string };
    'user:logout': void;
    'data:updated': { count: number };
  }

  let bus: TypedEventBus<TestEvents>;

  beforeEach(() => {
    bus = new TypedEventBus<TestEvents>();
  });

  it('should work with typed events', () => {
    const handler = vi.fn();
    bus.on('user:login', handler);
    bus.emit('user:login', { userId: '123' });

    expect(handler).toHaveBeenCalledWith({ userId: '123' });
  });

  it('should enforce type safety', () => {
    // This test just verifies the types compile correctly
    const handler = (payload: { userId: string }) => {
      expect(payload.userId).toBeDefined();
    };
    bus.on('user:login', handler);
  });

  it('once fires handler exactly once', () => {
    const handler = vi.fn();
    bus.once('user:login', handler);
    bus.emit('user:login', { userId: 'a' });
    bus.emit('user:login', { userId: 'b' });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ userId: 'a' });
  });

  it('hasSubscribers reflects subscription state', () => {
    expect(bus.hasSubscribers('user:login')).toBe(false);
    const unsub = bus.on('user:login', () => {});
    expect(bus.hasSubscribers('user:login')).toBe(true);
    unsub();
    expect(bus.hasSubscribers('user:login')).toBe(false);
  });

  it('subscriberCount returns correct count', () => {
    expect(bus.subscriberCount('data:updated')).toBe(0);
    const unsub1 = bus.on('data:updated', () => {});
    const unsub2 = bus.on('data:updated', () => {});
    expect(bus.subscriberCount('data:updated')).toBe(2);
    unsub1();
    expect(bus.subscriberCount('data:updated')).toBe(1);
    unsub2();
    expect(bus.subscriberCount('data:updated')).toBe(0);
  });

  it('off removes all handlers for an event', () => {
    const handler = vi.fn();
    bus.on('user:login', handler);
    bus.off('user:login');
    bus.emit('user:login', { userId: 'x' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('clear removes all event handlers', () => {
    const loginHandler = vi.fn();
    const dataHandler = vi.fn();
    bus.on('user:login', loginHandler);
    bus.on('data:updated', dataHandler);
    bus.clear();
    bus.emit('user:login', { userId: 'x' });
    bus.emit('data:updated', { count: 1 });
    expect(loginHandler).not.toHaveBeenCalled();
    expect(dataHandler).not.toHaveBeenCalled();
  });

  it('getEvents returns typed event names', () => {
    bus.on('user:login', () => {});
    bus.on('data:updated', () => {});
    const events = bus.getEvents();
    expect(events).toContain('user:login');
    expect(events).toContain('data:updated');
  });

  it('setDebug enables without throwing', () => {
    expect(() => bus.setDebug(true)).not.toThrow();
    expect(() => bus.setDebug(false)).not.toThrow();
  });
});
