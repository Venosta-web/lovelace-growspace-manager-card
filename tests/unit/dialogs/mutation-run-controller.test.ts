import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MutationRunController,
  type MutationRunEvent,
  type MutationRunHost,
} from '../../../src/dialogs/mutation-run-controller';

/**
 * Minimal fake host. `hostUpdated` is driven manually to simulate Lit's render
 * cycle; the controller must be runnable from state alone.
 */
class FakeHost implements MutationRunHost {
  sm: { status: { kind: string; action?: string; params?: unknown } } = {
    status: { kind: 'idle' },
  };

  dispatch = vi.fn((_event: MutationRunEvent) => {});

  effects: Record<string, (params: unknown) => Promise<void>> = {};

  addController = vi.fn();
  requestUpdate = vi.fn();
  removeController = vi.fn();
  updateComplete = Promise.resolve(true);
}

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('MutationRunController', () => {
  let host: FakeHost;
  let controller: MutationRunController;

  beforeEach(() => {
    host = new FakeHost();
    controller = new MutationRunController(host);
  });

  it('registers itself on the host', () => {
    expect(host.addController).toHaveBeenCalledWith(controller);
  });

  it('does nothing while status is idle', async () => {
    const effect = vi.fn().mockResolvedValue(undefined);
    host.effects = { save: effect };
    host.sm.status = { kind: 'idle' };

    controller.hostUpdated();
    await flush();

    expect(effect).not.toHaveBeenCalled();
    expect(host.dispatch).not.toHaveBeenCalled();
  });

  it('runs the effect exactly once even across multiple re-renders while applying', async () => {
    const effect = vi.fn().mockResolvedValue(undefined);
    host.effects = { save: effect };
    host.sm.status = { kind: 'applying', action: 'save', params: { x: 1 } };

    // Three render cycles fire while the effect is in flight.
    controller.hostUpdated();
    controller.hostUpdated();
    controller.hostUpdated();

    expect(effect).toHaveBeenCalledTimes(1);
    expect(effect).toHaveBeenCalledWith({ x: 1 });

    await flush();
    expect(host.dispatch).toHaveBeenCalledTimes(1);
  });

  it('dispatches SaveResolved on success', async () => {
    const effect = vi.fn().mockResolvedValue(undefined);
    host.effects = { save: effect };
    host.sm.status = { kind: 'applying', action: 'save', params: 42 };

    controller.hostUpdated();
    await flush();

    expect(host.dispatch).toHaveBeenCalledWith({ type: 'SaveResolved' });
  });

  it('dispatches SaveFailed carrying the action and error on rejection', async () => {
    const error = new Error('boom');
    const effect = vi.fn().mockRejectedValue(error);
    host.effects = { 'save-all': effect };
    host.sm.status = { kind: 'applying', action: 'save-all', params: null };

    controller.hostUpdated();
    await flush();

    expect(host.dispatch).toHaveBeenCalledWith({
      type: 'SaveFailed',
      action: 'save-all',
      error,
    });
  });

  it('dispatches SaveFailed when no effect is registered for the action', async () => {
    host.effects = {};
    host.sm.status = { kind: 'applying', action: 'missing', params: null };

    controller.hostUpdated();
    await flush();

    expect(host.dispatch).toHaveBeenCalledTimes(1);
    const call = host.dispatch.mock.calls[0][0];
    expect(call.type).toBe('SaveFailed');
    expect((call as { action: string }).action).toBe('missing');
  });

  it('clears the in-flight guard so a subsequent applying status runs again', async () => {
    const effect = vi.fn().mockResolvedValue(undefined);
    host.effects = { save: effect };

    host.sm.status = { kind: 'applying', action: 'save', params: 'a' };
    controller.hostUpdated();
    await flush();

    host.sm.status = { kind: 'applying', action: 'save', params: 'b' };
    controller.hostUpdated();
    await flush();

    expect(effect).toHaveBeenCalledTimes(2);
    expect(effect).toHaveBeenNthCalledWith(1, 'a');
    expect(effect).toHaveBeenNthCalledWith(2, 'b');
  });
});
