import { afterEach, describe, expect, it } from 'vitest';

import { ComparisonConflictError, MetricComparisonStore } from './metric-comparison-store';

const stores: MetricComparisonStore[] = [];

function makeStore(): MetricComparisonStore {
  const store = new MetricComparisonStore();
  stores.push(store);
  return store;
}

afterEach(() => {
  stores.splice(0).forEach((store) => store.destroy());
});

describe('MetricComparisonStore', () => {
  it('imports valid legacy runtime groups once into session state', async () => {
    const store = makeStore();
    await store.configure(undefined, `legacy-${crypto.randomUUID()}`, [
      ['humidity', 'temperature'],
    ]);
    expect(store.$state.get().comparisons[0].metrics).toEqual(['humidity', 'temperature']);
    expect(store.$state.get().persistence).toBe('session');
  });

  it('does not re-import a legacy group after the saved comparison is deleted', async () => {
    const store = makeStore();
    const growspaceId = `legacy-delete-${crypto.randomUUID()}`;
    const legacy = [['humidity', 'temperature']];
    await store.configure(undefined, growspaceId, legacy);
    const imported = store.$state.get().comparisons[0];
    await store.delete(imported.id, store.$state.get().recordRevision);

    await store.configure(undefined, `other-${crypto.randomUUID()}`);
    await store.configure(undefined, growspaceId, legacy);

    expect(store.$state.get().comparisons).toEqual([]);
  });

  it('creates, edits, and deletes canonically ordered disjoint comparisons', async () => {
    const store = makeStore();
    await store.configure(undefined, `crud-${crypto.randomUUID()}`);
    await store.save(null, ['temperature', 'humidity'], 0, []);
    const created = store.$state.get().comparisons[0];
    expect(created.metrics).toEqual(['humidity', 'temperature']);

    await expect(
      store.save(null, ['temperature', 'vpd'], store.$state.get().recordRevision, [])
    ).rejects.toMatchObject({ constraint: 'claimed' });

    await store.save(
      created.id,
      ['vpd', 'humidity'],
      store.$state.get().recordRevision,
      created.metrics
    );
    expect(store.groupFor('vpd')?.id).toBe(created.id);

    await store.delete(created.id, store.$state.get().recordRevision);
    expect(store.$state.get().comparisons).toEqual([]);
  });

  it('rejects a stale baseline instead of overwriting another mutation', async () => {
    const store = makeStore();
    await store.configure(undefined, `conflict-${crypto.randomUUID()}`);
    await store.save(null, ['a', 'b'], 0, []);
    await expect(store.save(null, ['c', 'd'], 0, [])).rejects.toBeInstanceOf(
      ComparisonConflictError
    );
  });

  it('prunes unavailable readings and removes groups that become too small', async () => {
    const store = makeStore();
    await store.configure(undefined, `prune-${crypto.randomUUID()}`);
    await store.save(null, ['humidity', 'temperature'], 0, []);
    await store.save(null, ['co2', 'vpd'], store.$state.get().recordRevision, []);

    const removed = await store.pruneUnavailableMetrics(['humidity', 'temperature', 'co2']);

    expect(removed).toBe(2);
    expect(store.$state.get().comparisons).toHaveLength(1);
    expect(store.$state.get().comparisons[0].metrics).toEqual(['humidity', 'temperature']);
  });

  it('issues the session-only notice once per comparison store', async () => {
    const store = makeStore();
    await store.configure(undefined, `notice-${crypto.randomUUID()}`);

    expect(store.takeSessionOnlyNotice()).toBe(true);
    expect(store.takeSessionOnlyNotice()).toBe(false);
  });

  it('synchronizes mutations between card instances for the same user and growspace', async () => {
    const first = makeStore();
    const second = makeStore();
    const userId = `user-${crypto.randomUUID()}`;
    const growspaceId = `peer-${crypto.randomUUID()}`;
    await first.configure(userId, growspaceId);
    await second.configure(userId, growspaceId);

    await first.save(null, ['humidity', 'temperature'], 0, []);

    expect(second.$state.get().comparisons).toEqual(first.$state.get().comparisons);
    expect(second.$state.get().recordRevision).toBe(1);
  });

  it('applies a valid cross-tab storage event', async () => {
    const store = makeStore();
    const userId = `user-${crypto.randomUUID()}`;
    const growspaceId = `storage-${crypto.randomUUID()}`;
    const storageKey = `growspace-manager-card:metric-comparisons:${userId}:${growspaceId}`;
    expect(await store.configure(userId, growspaceId)).toBe('durable');
    const record = {
      schema_version: 1,
      record_revision: 3,
      comparisons: [{ id: crypto.randomUUID(), metrics: ['humidity', 'temperature'] }],
    };
    localStorage.setItem(storageKey, JSON.stringify(record));

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: storageKey,
        newValue: JSON.stringify(record),
        storageArea: localStorage,
      })
    );

    expect(store.$state.get()).toMatchObject({
      recordRevision: 3,
      comparisons: record.comparisons,
    });
  });

  it('does not share session comparisons under an anonymous key', async () => {
    const first = makeStore();
    const second = makeStore();
    const growspaceId = `anonymous-${crypto.randomUUID()}`;
    await first.configure(undefined, growspaceId);
    await second.configure(undefined, growspaceId);

    await first.save(null, ['humidity', 'temperature'], 0, []);

    expect(second.$state.get().comparisons).toEqual([]);
  });
});
