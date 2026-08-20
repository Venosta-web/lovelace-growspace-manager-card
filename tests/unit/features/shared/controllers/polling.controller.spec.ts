import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PollingController } from '../../../../../src/features/shared/controllers/polling.controller';
import type { ReactiveControllerHost } from 'lit';

function makeHost(): ReactiveControllerHost {
  return { addController: vi.fn(), removeController: vi.fn(), requestUpdate: vi.fn(), updateComplete: Promise.resolve(true) };
}

describe('PollingController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('registers itself with the host', () => {
    const host = makeHost();
    new PollingController(host, vi.fn(), { interval: 1000 });
    expect(host.addController).toHaveBeenCalledOnce();
  });

  it('starts automatically on hostConnected by default', () => {
    const host = makeHost();
    const cb = vi.fn();
    const ctrl = new PollingController(host, cb, { interval: 1000 });

    ctrl.hostConnected();
    expect(ctrl.running).toBe(true);
  });

  it('does not start on hostConnected when autoStart is false', () => {
    const host = makeHost();
    const cb = vi.fn();
    const ctrl = new PollingController(host, cb, { interval: 1000, autoStart: false });

    ctrl.hostConnected();
    expect(ctrl.running).toBe(false);
  });

  it('calls callback at each interval tick', () => {
    const host = makeHost();
    const cb = vi.fn();
    const ctrl = new PollingController(host, cb, { interval: 500 });

    ctrl.start();
    vi.advanceTimersByTime(1500);
    expect(cb).toHaveBeenCalledTimes(3);
  });

  it('calls callback immediately when immediate is true', () => {
    const host = makeHost();
    const cb = vi.fn();
    const ctrl = new PollingController(host, cb, { interval: 1000, immediate: true });

    ctrl.start();
    expect(cb).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('does not call callback immediately when immediate is false', () => {
    const host = makeHost();
    const cb = vi.fn();
    const ctrl = new PollingController(host, cb, { interval: 1000, immediate: false });

    ctrl.start();
    expect(cb).toHaveBeenCalledTimes(0);
  });

  it('stops firing after stop()', () => {
    const host = makeHost();
    const cb = vi.fn();
    const ctrl = new PollingController(host, cb, { interval: 500 });

    ctrl.start();
    vi.advanceTimersByTime(1000);
    ctrl.stop();
    vi.advanceTimersByTime(2000);

    expect(cb).toHaveBeenCalledTimes(2);
    expect(ctrl.running).toBe(false);
  });

  it('stops on hostDisconnected', () => {
    const host = makeHost();
    const cb = vi.fn();
    const ctrl = new PollingController(host, cb, { interval: 500 });

    ctrl.start();
    ctrl.hostDisconnected();
    vi.advanceTimersByTime(2000);

    expect(cb).toHaveBeenCalledTimes(0);
    expect(ctrl.running).toBe(false);
  });

  it('start() is idempotent — double-call does not create two intervals', () => {
    const host = makeHost();
    const cb = vi.fn();
    const ctrl = new PollingController(host, cb, { interval: 500 });

    ctrl.start();
    ctrl.start(); // second call must be a no-op
    vi.advanceTimersByTime(500);

    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('stop() is idempotent — does not throw when already stopped', () => {
    const host = makeHost();
    const ctrl = new PollingController(host, vi.fn(), { interval: 500 });

    expect(() => {
      ctrl.stop();
      ctrl.stop();
    }).not.toThrow();
  });

  it('restart() resumes polling after a stop', () => {
    const host = makeHost();
    const cb = vi.fn();
    const ctrl = new PollingController(host, cb, { interval: 500 });

    ctrl.start();
    vi.advanceTimersByTime(500);
    ctrl.stop();

    ctrl.restart();
    vi.advanceTimersByTime(500);

    expect(cb).toHaveBeenCalledTimes(2);
    expect(ctrl.running).toBe(true);
  });
});
