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
});
