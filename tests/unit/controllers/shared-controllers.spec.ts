import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PollingController } from '../../../src/features/shared/controllers/polling.controller';
import { EventBusController } from '../../../src/features/shared/controllers/event-bus.controller';

// ---------------------------------------------------------------------------
// PollingController
// ---------------------------------------------------------------------------

describe('PollingController', () => {
  let host: any;
  let callback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    host = { addController: vi.fn() };
    callback = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('registers itself with the host on construction', () => {
    new PollingController(host, callback, { interval: 1000 });
    expect(host.addController).toHaveBeenCalledOnce();
  });

  it('starts polling automatically on hostConnected (autoStart default true)', () => {
    const ctrl = new PollingController(host, callback, { interval: 100 });
    ctrl.hostConnected();

    expect(ctrl.running).toBe(true);
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledOnce();
  });

  it('does NOT start polling when autoStart is false', () => {
    const ctrl = new PollingController(host, callback, { interval: 100, autoStart: false });
    ctrl.hostConnected();

    expect(ctrl.running).toBe(false);
    vi.advanceTimersByTime(200);
    expect(callback).not.toHaveBeenCalled();
  });

  it('calls callback immediately when immediate is true', () => {
    const ctrl = new PollingController(host, callback, { interval: 100, immediate: true });
    ctrl.start();

    expect(callback).toHaveBeenCalledOnce(); // immediate call
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(2); // + one interval tick
  });

  it('stop() halts polling and sets running to false', () => {
    const ctrl = new PollingController(host, callback, { interval: 100 });
    ctrl.start();
    ctrl.stop();

    expect(ctrl.running).toBe(false);
    vi.advanceTimersByTime(300);
    expect(callback).not.toHaveBeenCalled();
  });

  it('stop() is idempotent when not running', () => {
    const ctrl = new PollingController(host, callback, { interval: 100 });
    expect(() => ctrl.stop()).not.toThrow();
    expect(ctrl.running).toBe(false);
  });

  it('start() is idempotent when already running', () => {
    const ctrl = new PollingController(host, callback, { interval: 100 });
    ctrl.start();
    ctrl.start(); // second call should be no-op
    vi.advanceTimersByTime(100);
    // Should only have one interval running
    expect(callback).toHaveBeenCalledOnce();
  });

  it('restart() stops and restarts polling', () => {
    const ctrl = new PollingController(host, callback, { interval: 100 });
    ctrl.start();
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledOnce();

    ctrl.restart();
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('stops polling on hostDisconnected', () => {
    const ctrl = new PollingController(host, callback, { interval: 100 });
    ctrl.hostConnected();
    ctrl.hostDisconnected();

    expect(ctrl.running).toBe(false);
    vi.advanceTimersByTime(300);
    expect(callback).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// EventBusController
// ---------------------------------------------------------------------------

describe('EventBusController', () => {
  let host: any;
  let mockEventBus: any;
  let mockUnsubscribe: ReturnType<typeof vi.fn>;
  let handler: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockUnsubscribe = vi.fn();
    handler = vi.fn();
    mockEventBus = {
      on: vi.fn().mockReturnValue(mockUnsubscribe),
    };
    host = { addController: vi.fn() };
  });

  it('registers itself with the host on construction', () => {
    new EventBusController(host, mockEventBus, 'my-event', handler);
    expect(host.addController).toHaveBeenCalledOnce();
  });

  it('subscribes to event bus on hostConnected', () => {
    const ctrl = new EventBusController(host, mockEventBus, 'my-event', handler);
    ctrl.hostConnected();

    expect(mockEventBus.on).toHaveBeenCalledWith('my-event', handler);
    expect(ctrl['unsubscribe']).toBe(mockUnsubscribe);
  });

  it('unsubscribes on hostDisconnected', () => {
    const ctrl = new EventBusController(host, mockEventBus, 'my-event', handler);
    ctrl.hostConnected();
    ctrl.hostDisconnected();

    expect(mockUnsubscribe).toHaveBeenCalledOnce();
    expect(ctrl['unsubscribe']).toBeUndefined();
  });

  it('hostDisconnected is safe when not connected', () => {
    const ctrl = new EventBusController(host, mockEventBus, 'my-event', handler);
    // Never connected — should not throw
    expect(() => ctrl.hostDisconnected()).not.toThrow();
  });

  it('disconnect() unsubscribes manually', () => {
    const ctrl = new EventBusController(host, mockEventBus, 'my-event', handler);
    ctrl.hostConnected();
    ctrl.disconnect();

    expect(mockUnsubscribe).toHaveBeenCalledOnce();
    expect(ctrl['unsubscribe']).toBeUndefined();
  });

  it('disconnect() is safe when not subscribed', () => {
    const ctrl = new EventBusController(host, mockEventBus, 'my-event', handler);
    expect(() => ctrl.disconnect()).not.toThrow();
  });

  it('reconnect() unsubscribes then resubscribes', () => {
    const ctrl = new EventBusController(host, mockEventBus, 'my-event', handler);
    ctrl.hostConnected();
    ctrl.reconnect();

    expect(mockUnsubscribe).toHaveBeenCalledOnce();
    expect(mockEventBus.on).toHaveBeenCalledTimes(2);
  });
});
