/**
 * Plant Overview Container Tests
 *
 * Tests business logic in the container's private methods and rendering branches.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { atom } from 'nanostores';
import { PlantOverviewContainer } from './plant-overview.container';
import './plant-overview.container';
import type { PlantEntity } from '../../../types';
import { strainLibrary$ } from '../../../slices/strain';
import { activeDialog$ } from '../../../slices/ui';
import { advancePlantStage, movePlantToGrowspace } from '../../../slices/plant';

// The container now calls the Plant slice mutators directly. Spread the real
// module so child components that import other Plant-slice exports still load.
vi.mock('../../../slices/plant', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../slices/plant')>()),
  deletePlant: vi.fn().mockResolvedValue(undefined),
  advancePlantStage: vi.fn().mockResolvedValue('dry'),
  movePlantToGrowspace: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../slices/logbook', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../slices/logbook')>();
  return { ...actual, fetchPlantEvents: vi.fn(), fetchGrowspaceEvents: vi.fn() };
});
import * as logbookSlice from '../../../slices/logbook';

// ---------------------------------------------------------------------------
// Mock child elements expected by the container template
// ---------------------------------------------------------------------------
const mockElements = [
  'ha-dialog',
  'plant-dashboard-tab',
  'plant-actions-tab',
  'plant-timeline-tab',
  'plant-harvest-tab',
  'plant-genetics-tab',
  'md3-select',
  'md3-number-input',
];
for (const tag of mockElements) {
  if (!customElements.get(tag)) {
    class MockEl extends HTMLElement {}
    customElements.define(tag, MockEl);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeMockStore(overrides: Record<string, unknown> = {}) {
  return {
    actions: {
      plant: {
        delete: vi.fn(),
        move: vi.fn(),
        harvest: vi.fn(),
        finishDrying: vi.fn(),
        saveHarvestMetrics: vi.fn().mockResolvedValue(undefined),
        scorePhenotype: vi.fn().mockResolvedValue(undefined),
      },
      ui: {
        setActiveDialog: vi.fn(),
        showToast: vi.fn(),
      },
    },
    ui: {
      setActiveDialog: vi.fn(),
      closeDialog: vi.fn(),
      showToast: vi.fn(),
      $activeDialog: { get: vi.fn().mockReturnValue({ type: 'PLANT_OVERVIEW' }) },
    },
    updatePlantFromDialog: vi.fn(),
    refreshData: vi.fn().mockResolvedValue(undefined),
    dataService: {},
    grid: {
      $growspaceOptions: atom<Record<string, string>>({}),
    },
    data: {
      $strainLibrary: atom<
        { strain: string; phenotype?: string; key?: string; [k: string]: unknown }[]
      >([]),
    },
    ...overrides,
  };
}

function makeMockPlant(
  overrides: Partial<PlantEntity['attributes']> = {},
  state = 'veg'
): PlantEntity {
  return {
    entity_id: 'sensor.test_plant',
    state,
    attributes: {
      plant_id: 'test-plant-1',
      strain: 'Test Strain',
      phenotype: 'Pheno A',
      stage: state,
      growspace_id: 'gs-1',
      row: 0,
      col: 0,
      events: [],
      ...overrides,
    } as any,
    context: { id: '', parent_id: null, user_id: null },
    last_changed: '',
    last_updated: '',
  };
}

function createElement(store: ReturnType<typeof makeMockStore>, plant: PlantEntity) {
  const el = document.createElement('plant-overview-container') as PlantOverviewContainer;
  (el as any).store = store;
  (el as any).hass = null; // prevent _fetchLogbookEvents from making real calls
  el.plant = plant;
  el.editedAttributes = {
    strain: plant.attributes?.strain,
    phenotype: plant.attributes?.phenotype ?? '',
    row: 0,
    col: 0,
    veg_start: null,
    flower_start: null,
    seedling_start: null,
    mother_start: null,
    clone_start: null,
    dry_start: null,
    cure_start: null,
  } as any;
  return el;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PlantOverviewContainer – private method logic', () => {
  let store: ReturnType<typeof makeMockStore>;
  let plant: PlantEntity;
  let el: PlantOverviewContainer;

  beforeEach(() => {
    store = makeMockStore();
    plant = makeMockPlant();
    el = createElement(store, plant);
    // Don't attach to DOM for pure method tests — avoids ViewModel setup complexity
    (el as any).plant = plant;
    (el as any).store = store;
  });

  afterEach(() => {
    strainLibrary$.set([]);
    vi.restoreAllMocks();
  });

  // ── _handleActionClick ────────────────────────────────────────────────────
  describe('_handleActionClick', () => {
    it('opens watering dialog for "water" action', () => {
      (el as any)._handleActionClick(
        new CustomEvent('action-click', { detail: { actionId: 'water' } })
      );
      expect(store.ui.setActiveDialog).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'WATERING' })
      );
    });

    it('opens training dialog for "training" action', () => {
      (el as any)._handleActionClick(
        new CustomEvent('action-click', { detail: { actionId: 'training' } })
      );
      expect(store.ui.setActiveDialog).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'TRAINING' })
      );
    });

    it('opens IPM dialog for "ipm" action', () => {
      (el as any)._handleActionClick(
        new CustomEvent('action-click', { detail: { actionId: 'ipm' } })
      );
      expect(store.ui.setActiveDialog).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'IPM' })
      );
    });

    it('opens clone dialog for "clone" action', () => {
      (el as any)._handleActionClick(
        new CustomEvent('action-click', { detail: { actionId: 'clone' } })
      );
      expect(store.ui.setActiveDialog).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'TAKE_CLONE' })
      );
    });

    it('opens print label dialog for "print_label" action', () => {
      (el as any)._handleActionClick(
        new CustomEvent('action-click', { detail: { actionId: 'print_label' } })
      );
      expect(store.ui.setActiveDialog).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'PRINT_LABEL' })
      );
    });

    it('opens pollination dialog for "pollinate" action', () => {
      const fired: Event[] = [];
      el.addEventListener('open-log-pollination', (e) => fired.push(e));
      (el as any)._handleActionClick(
        new CustomEvent('action-click', { detail: { actionId: 'pollinate' } })
      );
      expect(fired.length).toBe(1);
    });

    it('does nothing for unknown action', () => {
      (el as any)._handleActionClick(
        new CustomEvent('action-click', { detail: { actionId: 'unknown' } })
      );
      expect(store.ui.setActiveDialog).not.toHaveBeenCalled();
    });
  });

  // ── _handleHarvest ────────────────────────────────────────────────────────
  it('_handleHarvest calls advancePlantStage', () => {
    (el as any)._handleHarvest();
    expect(advancePlantStage).toHaveBeenCalledWith(plant);
  });

  // ── _handleFinishDrying ───────────────────────────────────────────────────
  it('_handleFinishDrying calls advancePlantStage', () => {
    (el as any)._handleFinishDrying();
    expect(advancePlantStage).toHaveBeenCalledWith(plant);
  });

  // ── _handleMovePlantEvent ─────────────────────────────────────────────
  it('_handleMovePlantEvent moves plant and closes dialog when target selected', () => {
    (el as any)._handleMovePlantEvent(
      new CustomEvent('move-plant', { detail: { targetId: 'gs-2' } })
    );
    expect(movePlantToGrowspace).toHaveBeenCalledWith(plant, 'gs-2');
    expect(store.ui.closeDialog).toHaveBeenCalled();
  });

  // ── _handleTakeClone ──────────────────────────────────────────────────────
  it('_handleTakeClone opens clone dialog', () => {
    (el as any)._handleTakeClone(3);
    expect(store.ui.setActiveDialog).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'TAKE_CLONE' })
    );
  });

  // ── _openLogPollination ───────────────────────────────────────────────────
  it('_openLogPollination dispatches open-log-pollination event with plantId', () => {
    const fired: CustomEvent[] = [];
    el.addEventListener('open-log-pollination', (e) => fired.push(e as CustomEvent));
    (el as any)._openLogPollination();
    expect(fired.length).toBe(1);
    expect(fired[0].detail.plantId).toBe('test-plant-1');
  });

  it('_openLogPollination uses entity_id when plant_id is absent', () => {
    el.plant = makeMockPlant({ plant_id: undefined });
    const fired: CustomEvent[] = [];
    el.addEventListener('open-log-pollination', (e) => fired.push(e as CustomEvent));
    (el as any)._openLogPollination();
    expect(fired[0].detail.plantId).toBe('test_plant');
  });

  // ── _openNutrients ────────────────────────────────────────────────────────
  it('_openNutrients opens NUTRIENTS dialog', () => {
    (el as any)._openNutrients();
    expect(store.ui.setActiveDialog).toHaveBeenCalledWith({ type: 'NUTRIENTS', payload: {} });
  });

  // ── _openStrainEditor ─────────────────────────────────────────────────────
  it('_openStrainEditor finds existing entry from library', () => {
    strainLibrary$.set([
      {
        strain: 'Test Strain',
        phenotype: 'Pheno A',
        key: 'ts_pa',
        flowering_days_min: 60,
        flowering_days_max: 70,
      } as any,
    ]);
    (el as any)._openStrainEditor();
    const call = store.ui.setActiveDialog.mock.calls[0][0];
    expect(call.type).toBe('STRAIN_LIBRARY');
    expect(call.payload.editingStrain.strain).toBe('Test Strain');
    expect(call.payload.editingStrain.key).toBe('ts_pa');
  });

  it('_openStrainEditor creates fallback entry when strain not in library (lines 828-829)', () => {
    store.data.$strainLibrary.set([]); // empty — no match
    (el as any)._openStrainEditor();
    const call = store.ui.setActiveDialog.mock.calls[0][0];
    expect(call.type).toBe('STRAIN_LIBRARY');
    // Fallback entry should be created with phenotype in key
    expect(call.payload.editingStrain?.strain).toBe('Test Strain');
    expect(call.payload.editingStrain?.phenotype).toBe('Pheno A');
    expect(call.payload.editingStrain?.key).toBe('Test Strain_Pheno A');
  });

  it('_openStrainEditor sets undefined entry when strain is empty', () => {
    el.plant = makeMockPlant({ strain: '', phenotype: '' });
    store.data.$strainLibrary.set([]);
    (el as any)._openStrainEditor();
    const call = store.ui.setActiveDialog.mock.calls[0][0];
    expect(call.payload.editingStrain).toBeUndefined();
  });

  // ── _handleHarvestAdvance ─────────────────────────────────────────────────
  it('_handleHarvestAdvance calls finishDrying for finish-drying action', () => {
    (el as any)._handleHarvestAdvance(
      new CustomEvent('harvest-advance', { detail: { action: 'finish-drying' } })
    );
    expect(advancePlantStage).toHaveBeenCalledWith(el.plant);
  });

  it('_handleHarvestAdvance calls harvest for harvest action', () => {
    (el as any)._handleHarvestAdvance(
      new CustomEvent('harvest-advance', { detail: { action: 'harvest' } })
    );
    expect(advancePlantStage).toHaveBeenCalledWith(el.plant);
  });

  // ── _fetchLogbookEvents success path ──────────────────────────────────────
  it('_fetchLogbookEvents sets _logbookEvents and atom on success', async () => {
    const mockEvents = [{ id: 'e1', type: 'watering' }] as any;
    vi.mocked(logbookSlice.fetchPlantEvents).mockResolvedValue(mockEvents);
    (el as any).hass = {};
    await (el as any)._fetchLogbookEvents();
    expect((el as any)._logbookEvents).toBe(mockEvents);
    expect((el as any)._logbookEventsAtom.get()).toBe(mockEvents);
  });
});

// ---------------------------------------------------------------------------
// _handleSave – no lifecycle date validation (ADR-0018: seam owns the format)
// ---------------------------------------------------------------------------
describe('PlantOverviewContainer – _handleSave', () => {
  let store: ReturnType<typeof makeMockStore>;
  let plant: PlantEntity;
  let el: PlantOverviewContainer;

  beforeEach(() => {
    store = makeMockStore();
    plant = makeMockPlant();
    el = createElement(store, plant);
    (el as any).plant = plant;
    (el as any).store = store;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function saveWith(attrs: Record<string, unknown>): CustomEvent | null {
    (el as any)._editedAttributesAtom.set(attrs);
    let dispatched: CustomEvent | null = null;
    el.addEventListener('update-plant', (e) => (dispatched = e as CustomEvent));
    (el as any)._handleSave();
    return dispatched;
  }

  it('dispatches update-plant when adding a flower datetime to a plant with date-only seedling/veg', () => {
    // The original bug scenario: existing fields are date-only, user adds flower.
    // No toast — the seam owns the format, there is no completeness validation.
    const dispatched = saveWith({
      seedling_start: '2026-01-15',
      veg_start: '2026-02-01',
      flower_start: '2026-03-01T14:30',
    });

    expect(store.ui.showToast).not.toHaveBeenCalled();
    expect(dispatched).not.toBeNull();
    expect((dispatched as unknown as CustomEvent).detail.flower_start).toBe('2026-03-01T14:30');
  });

  it('dispatches with existing date-only fields untouched, no toast', () => {
    const dispatched = saveWith({ seedling_start: '2026-01-15', veg_start: '2026-02-01' });

    expect(store.ui.showToast).not.toHaveBeenCalled();
    expect(dispatched).not.toBeNull();
  });

  it('never raises the old "set both date and time" toast (validator removed)', () => {
    // Even values the old guard would have rejected now dispatch unchanged —
    // the validation is gone (ADR-0018).
    const dispatched = saveWith({ flower_start: '2026-03-05', dry_start: '2026-03-05T' });

    expect(store.ui.showToast).not.toHaveBeenCalled();
    expect(dispatched).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Rendering tests – need DOM attachment
// ---------------------------------------------------------------------------
describe('PlantOverviewContainer – rendering branches', () => {
  let store: ReturnType<typeof makeMockStore>;
  let el: PlantOverviewContainer;

  afterEach(() => {
    if (el?.isConnected) document.body.removeChild(el);
    vi.restoreAllMocks();
  });

  async function attachElement(plant: PlantEntity) {
    store = makeMockStore();
    el = createElement(store, plant);
    document.body.appendChild(el);
    await el.updateComplete;
  }

  // ── Harvest tab button ────────────────────────────────────────────────────
  it('clicking harvest tab button sets _activeTab to harvest', async () => {
    const plant = makeMockPlant(
      { harvest_metrics: { wet_weight: 50 }, scores: { vigor: 3 } },
      'dry'
    );
    await attachElement(plant);

    const harvestBtn = Array.from(el.shadowRoot?.querySelectorAll('.tab-btn') ?? []).find((btn) =>
      btn.textContent?.includes('Harvest')
    ) as HTMLButtonElement;
    harvestBtn?.click();
    await el.updateComplete;

    expect((el as any)._activeTab).toBe('harvest');
  });

  // ── Footer: mother stage "Take Clone" button (lines 561-565) ─────────────
  it('footer renders Take Clone section for mother stage', async () => {
    await attachElement(makeMockPlant({}, 'mother'));

    const shadow = el.shadowRoot!;
    expect(shadow.innerHTML).toContain('Take Clone');
  });

  // ── Footer: flower stage Harvest button (lines 576-583) ──────────────────
  it('footer renders Harvest button for flower stage and clicking opens scoring dialog', async () => {
    await attachElement(makeMockPlant({}, 'flower'));

    const shadow = el.shadowRoot!;
    expect(shadow.innerHTML).toContain('Harvest');

    const btn = [...shadow.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Harvest')
    ) as HTMLButtonElement | undefined;
    btn?.click();
    expect(activeDialog$.get()).toEqual(expect.objectContaining({ type: 'HARVEST_SCORING' }));
  });

  // ── Footer: flowering stage Harvest button ────────────────────────────────
  it('footer renders Harvest button for "flowering" stage', async () => {
    await attachElement(makeMockPlant({}, 'flowering'));
    expect(el.shadowRoot!.innerHTML).toContain('Harvest');
  });

  // ── Footer: dry stage "Finish Drying" button (lines 586-593) ─────────────
  it('footer renders Finish Drying button for dry stage and clicking calls finishDryingPlant', async () => {
    await attachElement(makeMockPlant({}, 'dry'));

    const shadow = el.shadowRoot!;
    expect(shadow.innerHTML).toContain('Finish Drying');

    const btn = [...shadow.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Finish Drying')
    ) as HTMLButtonElement | undefined;
    btn?.click();
    expect(advancePlantStage).toHaveBeenCalled();
  });

  // ── Harvest tab renders plant-harvest-tab component ─────────────────────
  it('renders plant-harvest-tab when _activeTab is harvest', async () => {
    await attachElement(makeMockPlant({}, 'dry'));

    (el as any)._activeTab = 'harvest';
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('plant-harvest-tab')).not.toBeNull();
  });

  // ── Footer: Take Clone click handler (lines 561-565) ─────────────────────
  it('Take Clone button click in mother stage opens clone dialog', async () => {
    await attachElement(makeMockPlant({}, 'mother'));

    const buttons = [...el.shadowRoot!.querySelectorAll('button')];
    const takeCloneBtn = buttons.find((b) => b.textContent?.includes('Take Clone'));
    takeCloneBtn?.click();

    expect(store.ui.setActiveDialog).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'TAKE_CLONE' })
    );
  });

  // ── Move plant event from dashboard (lines 607-610) ───────────────────────────────
  it('move-plant event from dashboard-tab moves plant', async () => {
    const plant = makeMockPlant({ growspace_id: 'gs-1' });
    await attachElement(plant);

    const dashboard = el.shadowRoot!.querySelector('plant-dashboard-tab');
    dashboard?.dispatchEvent(
      new CustomEvent('move-plant', {
        detail: { targetId: 'gs-2' },
        bubbles: true,
        composed: true,
      })
    );

    expect(movePlantToGrowspace).toHaveBeenCalledWith(plant, 'gs-2');
  });

  // ── harvest-saved event from harvest tab switches to dashboard ───────────
  it('harvest-saved event from plant-harvest-tab switches _activeTab to dashboard', async () => {
    await attachElement(makeMockPlant({}, 'dry'));
    (el as any)._activeTab = 'harvest';
    await el.updateComplete;

    const harvestTab = el.shadowRoot!.querySelector('plant-harvest-tab')!;
    harvestTab.dispatchEvent(new CustomEvent('harvest-saved', { bubbles: true, composed: true }));
    await el.updateComplete;

    expect((el as any)._activeTab).toBe('dashboard');
  });
});
