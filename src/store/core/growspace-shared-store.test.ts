import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrowspaceSharedStore } from './growspace-shared-store';

function makeMockHass(subscribeEvents?: (cb: (e: unknown) => void) => Promise<() => void>) {
  return {
    connection: {
      subscribeEvents: subscribeEvents ?? vi.fn().mockResolvedValue(vi.fn()),
    },
  } as any;
}

describe('GrowspaceSharedStore.updateHass', () => {
  let store: GrowspaceSharedStore;

  beforeEach(() => {
    store = new GrowspaceSharedStore();
  });

  it('calls _subscribe on first hass update', async () => {
    const spy = vi.spyOn(store as any, '_subscribe');
    const hass = makeMockHass();
    store.updateHass(hass);
    expect(spy).toHaveBeenCalledWith(hass);
  });

  it('does not call _subscribe again when hass reference is unchanged', () => {
    const hass = makeMockHass();
    store.updateHass(hass);
    const spy = vi.spyOn(store as any, '_subscribe');
    store.updateHass(hass);
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not call _subscribe when already subscribed', async () => {
    const hass = makeMockHass();
    store.updateHass(hass);
    await Promise.resolve();
    const hass2 = makeMockHass();
    const spy = vi.spyOn(store as any, '_subscribe');
    // _unsubEvents is set after first subscribe, so _subscribe should not be called again
    (store as any)._unsubEvents = vi.fn();
    store.updateHass(hass2);
    expect(spy).not.toHaveBeenCalled();
  });

  it('routes WS events through the subscription callback to _handleEvent', async () => {
    let capturedCb: ((e: unknown) => void) | undefined;
    const hass = makeMockHass(async (cb) => {
      capturedCb = cb;
      return vi.fn() as () => void;
    });
    store.updateHass(hass);
    await new Promise((r) => setTimeout(r, 0));

    const handleSpy = vi.spyOn(store as any, '_handleEvent');
    capturedCb!({ type: 'growspace_manager_updated' });
    expect(handleSpy).toHaveBeenCalled();
  });
});

describe('GrowspaceSharedStore._subscribe guard', () => {
  it('returns early when _unsubEvents is already set', async () => {
    const store = new GrowspaceSharedStore();
    const hass = makeMockHass();
    (store as any)._unsubEvents = vi.fn();
    await (store as any)._subscribe(hass);
    expect(hass.connection.subscribeEvents).not.toHaveBeenCalled();
  });
});

describe('GrowspaceSharedStore.destroy', () => {
  it('calls _unsubscribe and clears _unsubEvents', async () => {
    const store = new GrowspaceSharedStore();
    const unsubSpy = vi.fn();
    (store as any)._unsubEvents = unsubSpy;
    store.destroy();
    expect(unsubSpy).toHaveBeenCalled();
    expect((store as any)._unsubEvents).toBeUndefined();
  });

  it('is a no-op when not subscribed', () => {
    const store = new GrowspaceSharedStore();
    expect(() => store.destroy()).not.toThrow();
  });
});

describe('GrowspaceSharedStore.addOnStale', () => {
  let store: GrowspaceSharedStore;

  beforeEach(() => {
    store = new GrowspaceSharedStore();
  });

  it('fires registered callback when a WS event arrives', async () => {
    const cb = vi.fn().mockResolvedValue(undefined);
    store.addOnStale(cb);

    (store as any)._handleEvent({});

    await Promise.resolve();
    expect(cb).toHaveBeenCalledOnce();
  });

  it('fires all registered callbacks when a WS event arrives', async () => {
    const cb1 = vi.fn().mockResolvedValue(undefined);
    const cb2 = vi.fn().mockResolvedValue(undefined);
    store.addOnStale(cb1);
    store.addOnStale(cb2);

    (store as any)._handleEvent({});

    await Promise.resolve();
    expect(cb1).toHaveBeenCalledOnce();
    expect(cb2).toHaveBeenCalledOnce();
  });

  it('does not fire callback after unsubscribe', async () => {
    const cb = vi.fn().mockResolvedValue(undefined);
    const unsub = store.addOnStale(cb);
    unsub();

    (store as any)._handleEvent({});

    await Promise.resolve();
    expect(cb).not.toHaveBeenCalled();
  });
});
