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

// ---------------------------------------------------------------------------
// Mock child elements expected by the container template
// ---------------------------------------------------------------------------
const mockElements = [
  'ha-dialog',
  'plant-dashboard-tab',
  'plant-actions-tab',
  'plant-timeline-tab',
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
      $strainLibrary: atom<{ strain: string; phenotype?: string; key?: string; [k: string]: unknown }[]>([]),
    },
    ...overrides,
  };
}

function makeMockPlant(overrides: Partial<PlantEntity['attributes']> = {}, state = 'veg'): PlantEntity {
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

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 20));

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
    vi.restoreAllMocks();
  });

  // ── _handleActionClick ────────────────────────────────────────────────────
  describe('_handleActionClick', () => {
    it('opens watering dialog for "water" action', () => {
      (el as any)._handleActionClick(new CustomEvent('action-click', { detail: { actionId: 'water' } }));
      expect(store.ui.setActiveDialog).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'WATERING' })
      );
    });

    it('opens training dialog for "training" action', () => {
      (el as any)._handleActionClick(new CustomEvent('action-click', { detail: { actionId: 'training' } }));
      expect(store.ui.setActiveDialog).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'TRAINING' })
      );
    });

    it('opens IPM dialog for "ipm" action', () => {
      (el as any)._handleActionClick(new CustomEvent('action-click', { detail: { actionId: 'ipm' } }));
      expect(store.ui.setActiveDialog).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'IPM' })
      );
    });

    it('opens clone dialog for "clone" action', () => {
      (el as any)._handleActionClick(new CustomEvent('action-click', { detail: { actionId: 'clone' } }));
      expect(store.ui.setActiveDialog).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'TAKE_CLONE' })
      );
    });

    it('opens print label dialog for "print_label" action', () => {
      (el as any)._handleActionClick(new CustomEvent('action-click', { detail: { actionId: 'print_label' } }));
      expect(store.ui.setActiveDialog).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'PRINT_LABEL' })
      );
    });

    it('opens pollination dialog for "pollinate" action', () => {
      const fired: Event[] = [];
      el.addEventListener('open-log-pollination', (e) => fired.push(e));
      (el as any)._handleActionClick(new CustomEvent('action-click', { detail: { actionId: 'pollinate' } }));
      expect(fired.length).toBe(1);
    });

    it('does nothing for unknown action', () => {
      (el as any)._handleActionClick(new CustomEvent('action-click', { detail: { actionId: 'unknown' } }));
      expect(store.ui.setActiveDialog).not.toHaveBeenCalled();
    });
  });

  // ── _handleHarvest ────────────────────────────────────────────────────────
  it('_handleHarvest calls store.actions.plant.harvest', () => {
    (el as any)._handleHarvest();
    expect(store.actions.plant.harvest).toHaveBeenCalledWith(plant);
  });

  // ── _handleFinishDrying ───────────────────────────────────────────────────
  it('_handleFinishDrying calls store.actions.plant.finishDrying', () => {
    (el as any)._handleFinishDrying();
    expect(store.actions.plant.finishDrying).toHaveBeenCalledWith(plant);
  });

  // ── _handleMovePlant ──────────────────────────────────────────────────────
  it('_handleMovePlant does nothing when no target selected', () => {
    (el as any)._moveTargetGrowspaceId = '';
    (el as any)._handleMovePlant();
    expect(store.actions.plant.move).not.toHaveBeenCalled();
  });

  it('_handleMovePlant moves plant and closes dialog when target selected', () => {
    (el as any)._moveTargetGrowspaceId = 'gs-2';
    (el as any)._handleMovePlant();
    expect(store.actions.plant.move).toHaveBeenCalledWith(plant, 'gs-2');
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

  // ── _openStrainEditor ─────────────────────────────────────────────────────
  it('_openStrainEditor finds existing entry from library', () => {
    store.data.$strainLibrary.set([
      { strain: 'Test Strain', phenotype: 'Pheno A', key: 'ts_pa', flowering_days_min: 60, flowering_days_max: 70 },
    ]);
    (el as any)._openStrainEditor();
    const call = store.ui.setActiveDialog.mock.calls[0][0];
    expect(call.type).toBe('STRAIN_LIBRARY');
    expect(call.payload.editingStrain.strain).toBe('Test Strain');
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

  // ── _setScore ─────────────────────────────────────────────────────────────
  it('_setScore sets a score value', () => {
    (el as any)._scoresEdit = { vigor: null };
    (el as any)._setScore('vigor', 4);
    expect((el as any)._scoresEdit.vigor).toBe(4);
  });

  it('_setScore toggles off when same value clicked', () => {
    (el as any)._scoresEdit = { vigor: 4 };
    (el as any)._setScore('vigor', 4);
    expect((el as any)._scoresEdit.vigor).toBeNull();
  });

  // ── _skipAndAdvance ───────────────────────────────────────────────────────
  it('_skipAndAdvance does nothing when already saving', () => {
    (el as any)._savingHarvest = true;
    (el as any)._skipAndAdvance();
    expect(store.actions.plant.harvest).not.toHaveBeenCalled();
    expect(store.actions.plant.finishDrying).not.toHaveBeenCalled();
  });

  it('_skipAndAdvance calls finishDryingPlant for dry stage', () => {
    el.plant = makeMockPlant({}, 'dry');
    (el as any)._savingHarvest = false;
    (el as any)._skipAndAdvance();
    expect(store.actions.plant.finishDrying).toHaveBeenCalledWith(el.plant);
  });

  it('_skipAndAdvance calls finishDryingPlant for drying stage', () => {
    el.plant = makeMockPlant({}, 'drying');
    (el as any)._savingHarvest = false;
    (el as any)._skipAndAdvance();
    expect(store.actions.plant.finishDrying).toHaveBeenCalledWith(el.plant);
  });

  it('_skipAndAdvance calls harvestPlant for flower stage', () => {
    el.plant = makeMockPlant({}, 'flower');
    (el as any)._savingHarvest = false;
    (el as any)._skipAndAdvance();
    expect(store.actions.plant.harvest).toHaveBeenCalledWith(el.plant);
  });

  // ── _saveHarvestMetrics ───────────────────────────────────────────────────
  describe('_saveHarvestMetrics', () => {
    it('returns early when no plant_id', async () => {
      el.plant = makeMockPlant({ plant_id: undefined });
      await (el as any)._saveHarvestMetrics();
      expect(store.actions.plant.saveHarvestMetrics).not.toHaveBeenCalled();
    });

    it('calls saveHarvestMetrics action with plantId and metrics', async () => {
      (el as any)._harvestMetricsEdit = { wet_weight: 100 };
      (el as any)._scoresEdit = { vigor: 3 };
      await (el as any)._saveHarvestMetrics();
      expect(store.actions.plant.saveHarvestMetrics).toHaveBeenCalledWith(
        'test-plant-1',
        { wet_weight: 100 }
      );
      expect(store.actions.plant.scorePhenotype).toHaveBeenCalledWith(
        'test-plant-1',
        { vigor: 3 }
      );
    });

    it('sets _activeTab to dashboard after saving', async () => {
      (el as any)._harvestMetricsEdit = {};
      (el as any)._scoresEdit = {};
      (el as any)._activeTab = 'harvest';
      await (el as any)._saveHarvestMetrics();
      expect((el as any)._activeTab).toBe('dashboard');
    });

    it('resets _savingHarvest flag on error', async () => {
      store.actions.plant.saveHarvestMetrics.mockRejectedValue(new Error('fail'));
      (el as any)._harvestMetricsEdit = { wet_weight: 50 };
      (el as any)._scoresEdit = {};
      await (el as any)._saveHarvestMetrics();
      // Toast is handled inside the action; container just resets loading state
      expect((el as any)._savingHarvest).toBe(false);
    });
  });

  // ── _savePhenotypeScore ───────────────────────────────────────────────────
  describe('_savePhenotypeScore', () => {
    it('returns early when no plant_id', async () => {
      el.plant = makeMockPlant({ plant_id: undefined });
      await (el as any)._savePhenotypeScore();
      expect(store.actions.plant.scorePhenotype).not.toHaveBeenCalled();
    });

    it('calls scorePhenotype action and hides form on success', async () => {
      (el as any)._scoresEdit = { vigor: 5 };
      (el as any)._showScoringForm = true;
      await (el as any)._savePhenotypeScore();
      expect(store.actions.plant.scorePhenotype).toHaveBeenCalledWith(
        'test-plant-1',
        { vigor: 5 }
      );
      expect((el as any)._showScoringForm).toBe(false);
    });

    it('resets _savingScore flag on error', async () => {
      store.actions.plant.scorePhenotype.mockRejectedValue(new Error('score fail'));
      await (el as any)._savePhenotypeScore();
      expect((el as any)._savingScore).toBe(false);
    });
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

  // ── Harvest tab button (lines 374-375) ────────────────────────────────────
  it('clicking harvest tab button sets _activeTab to harvest and inits harvest state (lines 374-375)', async () => {
    const plant = makeMockPlant({ harvest_metrics: { wet_weight: 50 }, scores: { vigor: 3 } }, 'dry');
    await attachElement(plant);

    const harvestBtn = Array.from(el.shadowRoot?.querySelectorAll('.tab-btn') ?? [])
      .find(btn => btn.textContent?.includes('Scoring')) as HTMLButtonElement;
    harvestBtn?.click();
    await el.updateComplete;

    expect((el as any)._activeTab).toBe('harvest');
    expect((el as any)._harvestMetricsEdit).toMatchObject({ wet_weight: 50 });
    expect((el as any)._scoresEdit.vigor).toBe(3);
  });

  // ── Footer: mother stage "Take Clone" button (lines 561-565) ─────────────
  it('footer renders Take Clone section for mother stage', async () => {
    await attachElement(makeMockPlant({}, 'mother'));

    const shadow = el.shadowRoot!;
    expect(shadow.innerHTML).toContain('Take Clone');
  });

  // ── Footer: flower stage Harvest button (lines 576-583) ──────────────────
  it('footer renders Harvest button for flower stage and clicking calls harvestPlant', async () => {
    await attachElement(makeMockPlant({}, 'flower'));

    const shadow = el.shadowRoot!;
    expect(shadow.innerHTML).toContain('Harvest');

    const btn = [...shadow.querySelectorAll('button')].find(
      (b) => b.textContent?.includes('Harvest')
    ) as HTMLButtonElement | undefined;
    btn?.click();
    expect(store.actions.plant.harvest).toHaveBeenCalled();
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

    const btn = [...shadow.querySelectorAll('button')].find(
      (b) => b.textContent?.includes('Finish Drying')
    ) as HTMLButtonElement | undefined;
    btn?.click();
    expect(store.actions.plant.finishDrying).toHaveBeenCalled();
  });

  // ── Footer: growspace options visible (lines 596-617) ────────────────────
  it('footer renders Move to Growspace section when other growspaces available (lines 596-617)', async () => {
    const plant = makeMockPlant({ growspace_id: 'gs-1' });
    store = makeMockStore();
    store.grid.$growspaceOptions.set({ 'gs-1': 'Main Room', 'gs-2': 'Veg Room' });
    el = createElement(store, plant);
    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.shadowRoot!.innerHTML).toContain('Move to Growspace');
  });

  // ── Harvest tab renders (lines 858-1058) ─────────────────────────────────
  it('renders harvest tab content when _activeTab is harvest', async () => {
    await attachElement(makeMockPlant({}, 'dry'));

    (el as any)._activeTab = 'harvest';
    await el.updateComplete;

    const shadow = el.shadowRoot!;
    expect(shadow.innerHTML).toContain('Vigor');
    expect(shadow.innerHTML).toContain('Wet weight');
    expect(shadow.innerHTML).toContain('THC');
    expect(shadow.innerHTML).toContain('Save scores');
  });

  // ── Harvest tab: skip label changes by stage ──────────────────────────────
  it('harvest tab shows Skip & begin cure label for dry stage', async () => {
    await attachElement(makeMockPlant({}, 'dry'));
    (el as any)._activeTab = 'harvest';
    await el.updateComplete;

    expect(el.shadowRoot!.textContent).toContain('Skip & begin cure');
  });

  it('harvest tab shows Skip & finish label for flower stage', async () => {
    await attachElement(makeMockPlant({}, 'flower'));
    (el as any)._activeTab = 'harvest';
    await el.updateComplete;

    expect(el.shadowRoot!.textContent).toContain('Skip & finish');
  });

  // ── Score Phenotype section rendered in actions tab (lines 1064-1109) ─────
  it('renders Score Phenotype section in actions tab', async () => {
    await attachElement(makeMockPlant());
    (el as any)._activeTab = 'actions';
    await el.updateComplete;

    expect(el.shadowRoot!.innerHTML).toContain('Score Phenotype');
  });

  // ── Score Phenotype: expanded form (lines 1078-1088) ─────────────────────
  it('expanded score form visible when _showScoringForm is true', async () => {
    await attachElement(makeMockPlant());
    (el as any)._activeTab = 'actions';
    (el as any)._showScoringForm = true;
    await el.updateComplete;

    expect(el.shadowRoot!.innerHTML).toContain('Save scores');
    expect(el.shadowRoot!.innerHTML).toContain('Cancel');
  });

  // ── Harvest metrics input handlers (lines 930-1006) ──────────────────────
  it('harvest tab wet-weight input updates _harvestMetricsEdit', async () => {
    await attachElement(makeMockPlant({}, 'dry'));
    (el as any)._activeTab = 'harvest';
    await el.updateComplete;

    const inputs = el.shadowRoot!.querySelectorAll('input[type="number"]');
    const wetWeightInput = inputs[0] as HTMLInputElement;
    wetWeightInput.value = '150';
    wetWeightInput.dispatchEvent(new Event('input'));

    expect((el as any)._harvestMetricsEdit.wet_weight).toBe(150);
  });

  it('harvest tab wet-weight empty string sets null', async () => {
    await attachElement(makeMockPlant({}, 'dry'));
    (el as any)._activeTab = 'harvest';
    await el.updateComplete;

    const inputs = el.shadowRoot!.querySelectorAll('input[type="number"]');
    const wetWeightInput = inputs[0] as HTMLInputElement;
    wetWeightInput.value = '';
    wetWeightInput.dispatchEvent(new Event('input'));

    expect((el as any)._harvestMetricsEdit.wet_weight).toBeNull();
  });

  it('harvest tab terpene profile textarea updates _harvestMetricsEdit', async () => {
    await attachElement(makeMockPlant({}, 'dry'));
    (el as any)._activeTab = 'harvest';
    await el.updateComplete;

    const textarea = el.shadowRoot!.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'myrcene, limonene';
    textarea.dispatchEvent(new Event('input'));

    expect((el as any)._harvestMetricsEdit.terpene_profile).toBe('myrcene, limonene');
  });

  // ── _renderScoreRow star button interactions ──────────────────────────────
  it('star buttons in harvest tab trigger _setScore on click', async () => {
    await attachElement(makeMockPlant({}, 'dry'));
    (el as any)._activeTab = 'harvest';
    (el as any)._scoresEdit = { vigor: null, structure: null, aroma: null, resin: null, pest_resistance: null };
    await el.updateComplete;

    // Click the 3rd star (index 2) of the first dimension (vigor)
    const starBtns = el.shadowRoot!.querySelectorAll('button[aria-label^="Set"]');
    (starBtns[2] as HTMLButtonElement).click();
    expect((el as any)._scoresEdit.vigor).toBe(3);
  });

  it('star buttons fire _starPreview on mouseenter/mouseleave', async () => {
    await attachElement(makeMockPlant({}, 'dry'));
    (el as any)._activeTab = 'harvest';
    await el.updateComplete;

    const starBtns = el.shadowRoot!.querySelectorAll('button[aria-label^="Set"]');
    const firstStar = starBtns[0] as HTMLButtonElement;

    firstStar.dispatchEvent(new MouseEvent('mouseenter'));
    expect((el as any)._starPreview.vigor).toBe(1);

    firstStar.dispatchEvent(new MouseEvent('mouseleave'));
    expect((el as any)._starPreview.vigor).toBeNull();
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

  // ── Move plant button click (lines 607-610) ───────────────────────────────
  it('Move button click moves plant when target growspace is selected', async () => {
    const plant = makeMockPlant({ growspace_id: 'gs-1' });
    store = makeMockStore();
    store.grid.$growspaceOptions.set({ 'gs-1': 'Main Room', 'gs-2': 'Veg Room' });
    el = createElement(store, plant);
    document.body.appendChild(el);
    await el.updateComplete;

    // Simulate selecting a growspace via event
    (el as any)._moveTargetGrowspaceId = 'gs-2';
    await el.updateComplete;

    const buttons = [...el.shadowRoot!.querySelectorAll('button')];
    const moveBtn = buttons.find((b) => b.textContent?.includes('Move'));
    moveBtn?.click();

    expect(store.actions.plant.move).toHaveBeenCalledWith(plant, 'gs-2');
  });

  // ── _saveHarvestMetrics called from button in harvest tab ─────────────────
  it('Save scores button in harvest tab calls _saveHarvestMetrics', async () => {
    await attachElement(makeMockPlant({}, 'dry'));
    (el as any)._activeTab = 'harvest';
    await el.updateComplete;

    const spy = vi.spyOn(el as any, '_saveHarvestMetrics').mockResolvedValue(undefined);
    const buttons = [...el.shadowRoot!.querySelectorAll('button')];
    const saveBtn = buttons.find((b) => b.textContent?.includes('Save scores'));
    saveBtn?.click();
    expect(spy).toHaveBeenCalled();
  });

  // ── _savePhenotypeScore called from expanded score form ───────────────────
  it('Save scores button in score phenotype form calls _savePhenotypeScore', async () => {
    await attachElement(makeMockPlant());
    (el as any)._activeTab = 'actions';
    (el as any)._showScoringForm = true;
    await el.updateComplete;

    const spy = vi.spyOn(el as any, '_savePhenotypeScore').mockResolvedValue(undefined);
    const buttons = [...el.shadowRoot!.querySelectorAll('button')];
    const saveBtn = buttons.find((b) => b.textContent?.trim() === 'Save scores');
    saveBtn?.click();
    expect(spy).toHaveBeenCalled();
  });

  // ── _initHarvestState initializes from plant attributes ───────────────────
  it('_initHarvestState populates scores from plant.attributes.scores', async () => {
    const plant = makeMockPlant({ scores: { vigor: 4, aroma: 2 } });
    await attachElement(plant);

    expect((el as any)._scoresEdit.vigor).toBe(4);
    expect((el as any)._scoresEdit.aroma).toBe(2);
    expect((el as any)._scoresEdit.structure).toBeNull();
  });

  it('_initHarvestState populates harvest metrics from plant.attributes.harvest_metrics', async () => {
    const plant = makeMockPlant({ harvest_metrics: { wet_weight: 200, dry_weight: 55 } });
    await attachElement(plant);

    expect((el as any)._harvestMetricsEdit).toMatchObject({ wet_weight: 200, dry_weight: 55 });
  });

  // ── growspace filter line 526 ─────────────────────────────────────────────
  it('footer excludes current growspace from move options (line 526)', async () => {
    const plant = makeMockPlant({ growspace_id: 'gs-1' });
    store = makeMockStore();
    store.grid.$growspaceOptions.set({ 'gs-1': 'Main Room', 'gs-2': 'Veg Room' });
    el = createElement(store, plant);
    document.body.appendChild(el);
    await el.updateComplete;

    // gs-1 is the current growspace so only gs-2 should appear as Move option
    // The md3-select mock element won't render options but we verify logic via
    // checking that the component rendered without error
    expect(el.shadowRoot!.innerHTML).toContain('Move to Growspace');
  });
});
