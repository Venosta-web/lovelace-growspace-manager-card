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

  it('creates, edits, and deletes canonically ordered disjoint comparisons', async () => {
    const store = makeStore();
    await store.configure(undefined, `crud-${crypto.randomUUID()}`);
    await store.save(null, ['temperature', 'humidity'], 0, []);
    const created = store.$state.get().comparisons[0];
    expect(created.metrics).toEqual(['humidity', 'temperature']);

    await expect(
      store.save(null, ['temperature', 'vpd'], store.$state.get().recordRevision, [])
    ).rejects.toThrow('only one comparison');

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
});
