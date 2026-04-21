import { describe, it, expect, beforeEach } from 'vitest';
import { GrowspaceStore } from '../store/core/growspace-store';
import { openBatchPrintLabelsDialog } from '../store/ui/ui-actions';
import { GrowspaceUIStore } from '../store/ui/ui-store';

// ---------------------------------------------------------------------------
// openBatchPrintLabelsDialog action
// ---------------------------------------------------------------------------

describe('openBatchPrintLabelsDialog', () => {
  let ui: GrowspaceUIStore;
  let ctx: { ui: GrowspaceUIStore };

  beforeEach(() => {
    ui = new GrowspaceUIStore();
    ctx = { ui } as any;
  });

  it('opens BATCH_PRINT_LABELS dialog with selected plant IDs', () => {
    ui.$selectedPlants.set(new Set(['plant-1', 'plant-2', 'plant-3']));

    openBatchPrintLabelsDialog(ctx as any);

    const active = ui.$activeDialog.get();
    expect(active.type).toBe('BATCH_PRINT_LABELS');
    if (active.type === 'BATCH_PRINT_LABELS') {
      expect(active.payload.plantIds).toHaveLength(3);
      expect(active.payload.plantIds).toContain('plant-1');
      expect(active.payload.plantIds).toContain('plant-2');
      expect(active.payload.plantIds).toContain('plant-3');
    }
  });

  it('does nothing when no plants are selected', () => {
    ui.$selectedPlants.set(new Set());

    openBatchPrintLabelsDialog(ctx as any);

    expect(ui.$activeDialog.get().type).toBe('NONE');
  });

  it('opens dialog with a single selected plant', () => {
    ui.$selectedPlants.set(new Set(['solo-plant']));

    openBatchPrintLabelsDialog(ctx as any);

    const active = ui.$activeDialog.get();
    expect(active.type).toBe('BATCH_PRINT_LABELS');
    if (active.type === 'BATCH_PRINT_LABELS') {
      expect(active.payload.plantIds).toEqual(['solo-plant']);
    }
  });
});

// ---------------------------------------------------------------------------
// GrowspaceStore.openBatchPrintLabelsDialog
// ---------------------------------------------------------------------------

describe('GrowspaceStore.openBatchPrintLabelsDialog', () => {
  let store: GrowspaceStore;

  beforeEach(() => {
    store = new GrowspaceStore();
  });

  it('opens BATCH_PRINT_LABELS dialog via store method', () => {
    store.ui.$selectedPlants.set(new Set(['p1', 'p2']));

    store.openBatchPrintLabelsDialog();

    const active = store.ui.$activeDialog.get();
    expect(active.type).toBe('BATCH_PRINT_LABELS');
    if (active.type === 'BATCH_PRINT_LABELS') {
      expect(active.payload.plantIds).toContain('p1');
      expect(active.payload.plantIds).toContain('p2');
    }
  });

  it('does not open dialog when no plants are selected', () => {
    store.openBatchPrintLabelsDialog();

    expect(store.ui.$activeDialog.get().type).toBe('NONE');
  });

  it('dialog payload contains all selected plants', () => {
    const ids = ['alpha', 'beta', 'gamma', 'delta'];
    store.ui.$selectedPlants.set(new Set(ids));

    store.openBatchPrintLabelsDialog();

    const active = store.ui.$activeDialog.get();
    if (active.type === 'BATCH_PRINT_LABELS') {
      expect(active.payload.plantIds).toHaveLength(ids.length);
      for (const id of ids) {
        expect(active.payload.plantIds).toContain(id);
      }
    }
  });

  it('reflects dialogHostState after opening', () => {
    store.ui.$selectedPlants.set(new Set(['p1']));

    store.openBatchPrintLabelsDialog();

    expect(store.$dialogHostState.get().activeDialog.type).toBe('BATCH_PRINT_LABELS');
  });
});
