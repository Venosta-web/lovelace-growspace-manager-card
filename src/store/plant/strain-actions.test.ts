import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { addStrain, updateStrain, removeStrain } from './strain-actions';
import type { ActionContext } from '../core/action-context';

vi.mock('./library-actions', () => ({
  fetchStrainLibrary: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../slices/strain', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../slices/strain')>()),
  addStrain: vi.fn().mockResolvedValue(undefined),
  updateStrainMeta: vi.fn().mockResolvedValue(undefined),
  removeStrain: vi.fn().mockResolvedValue(undefined),
}));

import * as strainSlice from '../../slices/strain';

function makeDataService() {
  return new Proxy({} as any, {
    get(target, prop) {
      if (!(prop in target)) target[prop] = vi.fn().mockResolvedValue(undefined);
      return target[prop];
    },
  });
}

function makeContext() {
  const showToast = vi.fn();

  return {
    dataService: makeDataService(),
    ui: { showToast } as unknown as ActionContext['ui'],
    refreshData: vi.fn().mockResolvedValue(undefined),
    closeDialog: vi.fn(),
    undoRedoManager: {} as any,
    optimisticManager: {} as any,
    grid: {} as any,
  } satisfies ActionContext;
}

const strainData = {
  strain: 'Gelato',
  phenotype: '#41',
  breeder: 'Sherbinski',
  type: 'hybrid',
} as any;

// ─── addStrain ────────────────────────────────────────────────────────────────

describe('addStrain', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('returns false without calling API when strain name is missing', async () => {
    const result = await addStrain(ctx, { phenotype: '#1' });

    expect(result).toBe(false);
    expect(strainSlice.addStrain).not.toHaveBeenCalled();
  });

  it('calls slice add, fetches library, toasts success', async () => {
    const result = await addStrain(ctx, strainData);

    expect(result).toBe(true);
    expect(strainSlice.addStrain).toHaveBeenCalledWith(
      expect.objectContaining({ strain: 'Gelato', phenotype: '#41', breeder: 'Sherbinski' })
    );
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Strain added successfully!', 'success');
  });

  it('imports lineage tree when parents are provided', async () => {
    const withLineage = {
      ...strainData,
      parents: { parents: [{ name: 'Sunset Sherbet' }] },
    };

    await addStrain(ctx, withLineage);

    expect((ctx.dataService as any).importStrainLineageTree).toHaveBeenCalledWith(
      'Gelato',
      withLineage.parents
    );
  });

  it('does not import lineage when parents array is empty', async () => {
    await addStrain(ctx, { ...strainData, parents: { parents: [] } });

    expect((ctx.dataService as any).importStrainLineageTree).not.toHaveBeenCalled();
  });

  it('returns false and toasts error when slice throws', async () => {
    vi.mocked(strainSlice.addStrain).mockRejectedValueOnce(new Error('slice-fail'));

    const result = await addStrain(ctx, strainData);

    expect(result).toBe(false);
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(
      expect.stringContaining('slice-fail'),
      'error'
    );
  });
});

// ─── updateStrain ─────────────────────────────────────────────────────────────

describe('updateStrain', () => {
  let ctx: ReturnType<typeof makeContext>;
  beforeEach(() => { ctx = makeContext(); });

  it('returns false without calling API when strain name is missing', async () => {
    const result = await updateStrain(ctx, { phenotype: '#1' });

    expect(result).toBe(false);
    expect(strainSlice.updateStrainMeta).not.toHaveBeenCalled();
  });

  it('calls slice updateStrainMeta, fetches library, toasts success', async () => {
    const result = await updateStrain(ctx, strainData);

    expect(result).toBe(true);
    expect(strainSlice.updateStrainMeta).toHaveBeenCalledWith(
      expect.objectContaining({ strain: 'Gelato' })
    );
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Strain updated successfully!', 'success');
  });

  it('imports lineage tree when parents are provided', async () => {
    const withLineage = {
      ...strainData,
      parents: { parents: [{ name: 'Sunset Sherbet' }] },
    };

    await updateStrain(ctx, withLineage);

    expect((ctx.dataService as any).importStrainLineageTree).toHaveBeenCalledWith(
      'Gelato',
      withLineage.parents
    );
  });

  it('returns false and toasts error when slice throws', async () => {
    vi.mocked(strainSlice.updateStrainMeta).mockRejectedValueOnce(new Error('upd-fail'));

    const result = await updateStrain(ctx, strainData);

    expect(result).toBe(false);
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(
      expect.stringContaining('upd-fail'),
      'error'
    );
  });
});

// ─── removeStrain ─────────────────────────────────────────────────────────────

describe('removeStrain', () => {
  let ctx: ReturnType<typeof makeContext>;

  beforeEach(() => {
    ctx = makeContext();
    strainSlice.setStrainLibrary([
      { key: 'og-kush', strain: 'OG Kush' } as any,
      { key: 'blue-dream', strain: 'Blue Dream' } as any,
    ]);
  });

  afterEach(() => {
    strainSlice.setStrainLibrary([]);
  });

  it('calls slice remove, filters local library, fetches fresh library, returns true', async () => {
    const result = await removeStrain(ctx, 'og-kush');

    expect(strainSlice.removeStrain).toHaveBeenCalledWith('og-kush');
    expect(strainSlice.strainLibrary$.get()).toEqual([
      { key: 'blue-dream', strain: 'Blue Dream' },
    ]);
    expect(result).toBe(true);
  });

  it('returns false and does not update library when slice throws', async () => {
    vi.mocked(strainSlice.removeStrain).mockRejectedValueOnce(new Error('remove-fail'));

    const result = await removeStrain(ctx, 'og-kush');

    expect(result).toBe(false);
    expect(strainSlice.strainLibrary$.get()).toEqual([
      { key: 'og-kush', strain: 'OG Kush' },
      { key: 'blue-dream', strain: 'Blue Dream' },
    ]);
  });
});
