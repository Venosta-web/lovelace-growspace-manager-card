import { describe, it, expect, vi } from 'vitest';
import { EventBusController } from '../../../../../src/features/shared/controllers/event-bus.controller';
import { EventBus } from '../../../../../src/features/shared/events/event-bus';
import type { ReactiveControllerHost } from 'lit';

function makeHost(): ReactiveControllerHost {
  return {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  };
}

describe('EventBusController', () => {
  it('registers itself with the host', () => {
    const host = makeHost();
    const bus = new EventBus();
    new EventBusController(host, bus, 'test', vi.fn());
    expect(host.addController).toHaveBeenCalledOnce();
  });

  it('subscribes to the event on hostConnected', () => {
    const host = makeHost();
    const bus = new EventBus();
    const handler = vi.fn();
    const ctrl = new EventBusController(host, bus, 'ping', handler);

    ctrl.hostConnected();
    bus.emit('ping', 'hello');

    expect(handler).toHaveBeenCalledWith('hello');
  });

  it('does not receive events before hostConnected', () => {
    const host = makeHost();
    const bus = new EventBus();
    const handler = vi.fn();
    new EventBusController(host, bus, 'ping', handler);

    bus.emit('ping', 'hello');

    expect(handler).not.toHaveBeenCalled();
  });

  it('stops receiving events after hostDisconnected', () => {
    const host = makeHost();
    const bus = new EventBus();
    const handler = vi.fn();
    const ctrl = new EventBusController(host, bus, 'ping', handler);

    ctrl.hostConnected();
    ctrl.hostDisconnected();
    bus.emit('ping', 'hello');

    expect(handler).not.toHaveBeenCalled();
  });

  it('cleans up the subscription so no handlers remain on the bus after disconnect', () => {
    const host = makeHost();
    const bus = new EventBus();
    const ctrl = new EventBusController(host, bus, 'ping', vi.fn());

    ctrl.hostConnected();
    expect(bus.hasSubscribers('ping')).toBe(true);

    ctrl.hostDisconnected();
    expect(bus.hasSubscribers('ping')).toBe(false);
  });

  it('disconnect() unsubscribes manually', () => {
    const host = makeHost();
    const bus = new EventBus();
    const handler = vi.fn();
    const ctrl = new EventBusController(host, bus, 'ping', handler);

    ctrl.hostConnected();
    ctrl.disconnect();
    bus.emit('ping', 'payload');

    expect(handler).not.toHaveBeenCalled();
  });

  it('disconnect() is idempotent', () => {
    const host = makeHost();
    const bus = new EventBus();
    const ctrl = new EventBusController(host, bus, 'ping', vi.fn());

    ctrl.hostConnected();
    expect(() => {
      ctrl.disconnect();
      ctrl.disconnect();
    }).not.toThrow();
  });

  it('reconnect() resubscribes after a disconnect', () => {
    const host = makeHost();
    const bus = new EventBus();
    const handler = vi.fn();
    const ctrl = new EventBusController(host, bus, 'ping', handler);

    ctrl.hostConnected();
    ctrl.disconnect();
    ctrl.reconnect();
    bus.emit('ping', 42);

    expect(handler).toHaveBeenCalledWith(42);
  });

  it('reconnect() does not create duplicate subscriptions', () => {
    const host = makeHost();
    const bus = new EventBus();
    const handler = vi.fn();
    const ctrl = new EventBusController(host, bus, 'ping', handler);

    ctrl.hostConnected();
    ctrl.reconnect(); // replaces the existing subscription
    bus.emit('ping', 'x');

    expect(handler).toHaveBeenCalledTimes(1);
    expect(bus.subscriberCount('ping')).toBe(1);
  });
});
