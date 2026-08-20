import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FocusTrapController } from '../../../src/features/shared/controllers/focus-trap.controller';
import { PollingController } from '../../../src/features/shared/controllers/polling.controller';
import { EventBusController } from '../../../src/features/shared/controllers/event-bus.controller';

// ---------------------------------------------------------------------------
// FocusTrapController
// ---------------------------------------------------------------------------

describe('FocusTrapController', () => {
  let host: any;
  let mockShadowRoot: any;
  let mockTarget: any;

  beforeEach(() => {
    vi.useFakeTimers();

    mockTarget = document.createElement('button');
    mockTarget.focus = vi.fn();

    mockShadowRoot = {
      querySelector: vi.fn().mockReturnValue(mockTarget),
    };

    host = {
      addController: vi.fn(),
      shadowRoot: mockShadowRoot,
      focus: vi.fn(),
    };

    // Simulate a previously-focused element
    Object.defineProperty(document, 'activeElement', {
      get: () => ({ focus: vi.fn() }),
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('registers itself with the host on construction', () => {
    new FocusTrapController(host, { selector: 'button' });
    expect(host.addController).toHaveBeenCalledOnce();
  });

  it('stores previous focus and schedules focus on hostConnected', () => {
    const ctrl = new FocusTrapController(host, { selector: 'button' });
    ctrl.hostConnected();
    expect(ctrl['previousFocus']).toBeDefined();

    vi.runAllTimers();
    expect(mockTarget.focus).toHaveBeenCalledOnce();
  });

  it('does NOT store previous focus when restoreFocus is false', () => {
    const ctrl = new FocusTrapController(host, { selector: 'button', restoreFocus: false });
    ctrl.hostConnected();
    expect(ctrl['previousFocus']).toBeUndefined();
  });

  it('uses provided delay before focusing', () => {
    const ctrl = new FocusTrapController(host, { selector: 'button', delay: 100 });
    ctrl.hostConnected();
    expect(mockTarget.focus).not.toHaveBeenCalled();

    vi.advanceTimersByTime(99);
    expect(mockTarget.focus).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(mockTarget.focus).toHaveBeenCalledOnce();
  });

  it('restores focus to previous element on hostDisconnected', () => {
    const prevFocus = { focus: vi.fn() };
    const ctrl = new FocusTrapController(host, { selector: 'button' });
    ctrl['previousFocus'] = prevFocus as any;

    ctrl.hostDisconnected();
    // Flush the requestAnimationFrame scheduled inside hostDisconnected
    vi.runAllTimers();
    expect(prevFocus.focus).toHaveBeenCalledOnce();
  });

  it('does NOT restore focus when restoreFocus is false', () => {
    const prevFocus = { focus: vi.fn() };
    const ctrl = new FocusTrapController(host, { selector: 'button', restoreFocus: false });
    ctrl['previousFocus'] = prevFocus as any;

    ctrl.hostDisconnected();
    expect(prevFocus.focus).not.toHaveBeenCalled();
  });

  it('does nothing on hostDisconnected when no previous focus', () => {
    const ctrl = new FocusTrapController(host, { selector: 'button' });
    ctrl['previousFocus'] = undefined;
    // Should not throw
    expect(() => ctrl.hostDisconnected()).not.toThrow();
  });

  it('focusTarget does nothing when element not found', () => {
    mockShadowRoot.querySelector.mockReturnValue(null);
    const ctrl = new FocusTrapController(host, { selector: '#missing' });
    // Should not throw
    expect(() => ctrl.focusTarget()).not.toThrow();
  });

  it('focusTarget does nothing when element has no focus method', () => {
    const noFocusEl = document.createElement('div');
    delete (noFocusEl as any).focus;
    mockShadowRoot.querySelector.mockReturnValue(noFocusEl);
    const ctrl = new FocusTrapController(host, { selector: 'div' });
    expect(() => ctrl.focusTarget()).not.toThrow();
  });

  it('restoreFocus() focuses previous element', () => {
    const prevFocus = { focus: vi.fn() };
    const ctrl = new FocusTrapController(host, { selector: 'button' });
    ctrl['previousFocus'] = prevFocus as any;

    ctrl.restoreFocus();
    expect(prevFocus.focus).toHaveBeenCalledOnce();
  });

  it('restoreFocus() does nothing when no previous element', () => {
    const ctrl = new FocusTrapController(host, { selector: 'button' });
    ctrl['previousFocus'] = undefined;
    expect(() => ctrl.restoreFocus()).not.toThrow();
  });
});

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
