import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { atom, computed } from 'nanostores';
import { viewMode$ } from '../../../../src/slices/ui';
import { ViewMode } from '../../../../src/constants';
import { gridInteraction$, cancel } from '../../../../src/slices/grid-interaction';

// ── Child-component mocks ──────────────────────────────────────────────────
vi.mock('../../../../src/features/ui/containers/growspace-header.container', () => ({}));
vi.mock('../../../../src/features/ui/containers/growspace-analytics.container', () => ({}));
vi.mock('../../../../src/features/ui/components/growspace-edit-mode-banner-ui', () => ({}));
vi.mock('../../../../src/features/plants/components/transplant-source-panel', () => ({}));
vi.mock('../../../../src/features/plants/containers/growspace-grid.container', () => ({}));
vi.mock('../../../../src/features/environment/components/heatmap-3d', () => ({}));
vi.mock('../../../../src/features/shared/ui/error-boundary', () => ({}));

@customElement('growspace-header')
class MockHeader extends LitElement {
  static get properties() {
    return { device: { type: Object } };
  }
}
@customElement('growspace-analytics')
class MockAnalytics extends LitElement {
  static get properties() {
    return { device: { type: Object } };
  }
}
@customElement('growspace-edit-mode-banner')
class MockBanner extends LitElement {
  static get properties() {
    return { selectedCount: { type: Number } };
  }
}
@customElement('transplant-source-panel')
class MockTransplantPanel extends LitElement {
  clonePlants: unknown[] = [];
  seedlingPlants: unknown[] = [];
  static get properties() {
    return { clonePlants: { type: Array }, seedlingPlants: { type: Array } };
  }
}
@customElement('growspace-grid-container')
class MockGridContainer extends LitElement {
  static get properties() {
    return { plants: { type: Array }, rows: { type: Number }, cols: { type: Number } };
  }
  focusPlant(_index: number) {}
}
@customElement('heatmap-3d')
class MockHeatmap extends LitElement {
  static get properties() {
    return {
      device: { type: Object },
      hass: { type: Object },
      editMode3DCords: { type: Boolean },
      keyboardRotateEnabled: { type: Boolean },
      keyboardRotateSpeed: { type: Number },
    };
  }
}

import { GrowspaceView } from '../../../../src/features/shared/layouts/growspace-view';

describe('GrowspaceView', () => {
  let element: GrowspaceView;
  let mockStore: ReturnType<typeof buildMockStore>;
  let devicesAtom: ReturnType<typeof atom<unknown[]>>;

  function buildMockStore() {
    devicesAtom = atom<unknown[]>([]);
    const $viewStandardState = computed([devicesAtom], (devices) => ({ devices }));
    return {
      actions: { ui: { toast: vi.fn() } },
      $viewStandardState,
      hass: { callService: vi.fn() },
      refreshData: vi.fn(),
    };
  }

  async function createElement(): Promise<GrowspaceView> {
    const el = new GrowspaceView();
    Object.defineProperty(el, 'store', { value: mockStore, writable: true });
    document.body.appendChild(el);
    el.device = { deviceId: 'gs1', name: 'GS1', plants: [] } as never;
    el.grid = [];
    el.rows = 4;
    el.cols = 4;
    await el.updateComplete;
    return el;
  }

  beforeEach(() => {
    cancel();
    gridInteraction$.set({ status: 'idle' });
    viewMode$.set(ViewMode.STANDARD);
    mockStore = buildMockStore();
  });

  afterEach(() => {
    if (element?.isConnected) document.body.removeChild(element);
    vi.restoreAllMocks();
  });

  // ── STANDARD mode ─────────────────────────────────────────────────────────

  it('renders header, analytics and grid in STANDARD mode', async () => {
    viewMode$.set(ViewMode.STANDARD);
    element = await createElement();

    expect(element.shadowRoot?.querySelector('growspace-header')).toBeTruthy();
    expect(element.shadowRoot?.querySelector('growspace-analytics')).toBeTruthy();
    expect(element.shadowRoot?.querySelector('growspace-grid-container')).toBeTruthy();
  });

  it('standard header renders growspace-header (non-HEADER variant)', async () => {
    viewMode$.set(ViewMode.STANDARD);
    element = await createElement();

    // The non-HEADER variant renders a bare growspace-header (no .view-mode-container wrapper)
    const header = element.shadowRoot?.querySelector('growspace-header');
    expect(header).toBeTruthy();
    const wrapper = element.shadowRoot?.querySelector('.view-mode-container.header');
    expect(wrapper).toBeNull();
  });

  it('standard grid redispatches growspace-changed from header', async () => {
    viewMode$.set(ViewMode.STANDARD);
    element = await createElement();

    const header = element.shadowRoot?.querySelector('growspace-header');
    const spy = vi.spyOn(element, 'dispatchEvent');

    header?.dispatchEvent(
      new CustomEvent('growspace-changed', { detail: 'gs2', bubbles: true, composed: true })
    );

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'growspace-changed', detail: 'gs2' })
    );
  });

  // ── HEADER mode ───────────────────────────────────────────────────────────

  it('renders header with expand-handle button in HEADER mode', async () => {
    viewMode$.set(ViewMode.HEADER);
    element = await createElement();

    const wrapper = element.shadowRoot?.querySelector('.view-mode-container.header');
    expect(wrapper).toBeTruthy();
    const expandBtn = element.shadowRoot?.querySelector('.expand-handle');
    expect(expandBtn).toBeTruthy();
  });

  it('expand-handle button dispatches toggle-expansion in HEADER mode', async () => {
    viewMode$.set(ViewMode.HEADER);
    element = await createElement();

    const spy = vi.spyOn(element, 'dispatchEvent');
    const btn = element.shadowRoot?.querySelector('.expand-handle') as HTMLElement;
    btn.click();

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'toggle-expansion' })
    );
  });

  it('HEADER mode header redispatches growspace-changed from growspace-header', async () => {
    viewMode$.set(ViewMode.HEADER);
    element = await createElement();

    const header = element.shadowRoot?.querySelector('growspace-header');
    const spy = vi.spyOn(element, 'dispatchEvent');

    header?.dispatchEvent(
      new CustomEvent('growspace-changed', { detail: 'gs3', bubbles: true, composed: true })
    );

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'growspace-changed', detail: 'gs3' })
    );
  });

  // ── COMPACT mode ──────────────────────────────────────────────────────────

  it('renders only grid with compact controls in COMPACT mode', async () => {
    viewMode$.set(ViewMode.COMPACT);
    element = await createElement();

    expect(element.shadowRoot?.querySelector('growspace-header')).toBeNull();
    expect(element.shadowRoot?.querySelector('growspace-analytics')).toBeNull();
    const wrapper = element.shadowRoot?.querySelector('.view-mode-container.compact');
    expect(wrapper).toBeTruthy();
    const exitBtn = element.shadowRoot?.querySelector('.compact-exit-fab');
    expect(exitBtn).toBeTruthy();
  });

  it('compact exit button dispatches view-mode-changed with mode=standard', async () => {
    viewMode$.set(ViewMode.COMPACT);
    element = await createElement();

    const spy = vi.spyOn(element, 'dispatchEvent');
    const btn = element.shadowRoot?.querySelector('.compact-exit-fab') as HTMLElement;
    btn.click();

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'view-mode-changed', detail: { mode: 'standard' } })
    );
  });

  // ── HEATMAP mode ──────────────────────────────────────────────────────────

  it('renders header and heatmap-3d in HEATMAP mode', async () => {
    viewMode$.set(ViewMode.HEATMAP);
    element = await createElement();

    expect(element.shadowRoot?.querySelector('growspace-header')).toBeTruthy();
    expect(element.shadowRoot?.querySelector('heatmap-3d')).toBeTruthy();
    expect(element.shadowRoot?.querySelector('growspace-analytics')).toBeNull();
    expect(element.shadowRoot?.querySelector('growspace-grid-container')).toBeNull();
  });

  it('edit-mode-changed from heatmap-3d updates editMode3DCords', async () => {
    viewMode$.set(ViewMode.HEATMAP);
    element = await createElement();

    const heatmap = element.shadowRoot?.querySelector('heatmap-3d');
    heatmap?.dispatchEvent(
      new CustomEvent('edit-mode-changed', {
        detail: { enabled: true },
        bubbles: true,
        composed: true,
      })
    );

    expect((element as never as { editMode3DCords: boolean }).editMode3DCords).toBe(true);
  });

  it('sensor-position-changed from heatmap-3d is redispatched', async () => {
    viewMode$.set(ViewMode.HEATMAP);
    element = await createElement();

    const heatmap = element.shadowRoot?.querySelector('heatmap-3d');
    const spy = vi.spyOn(element, 'dispatchEvent');

    heatmap?.dispatchEvent(
      new CustomEvent('sensor-position-changed', {
        detail: { sensorId: 's1', x: 1, y: 2 },
        bubbles: true,
        composed: true,
      })
    );

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'sensor-position-changed' })
    );
  });

  // ── Standard grid — optional UI elements ──────────────────────────────────

  it('shows edit-mode banner when isEditMode is true (STANDARD)', async () => {
    viewMode$.set(ViewMode.STANDARD);
    element = await createElement();
    element.isEditMode = true;
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('growspace-edit-mode-banner')).toBeTruthy();
  });

  it('hides edit-mode banner when isEditMode is false (STANDARD)', async () => {
    viewMode$.set(ViewMode.STANDARD);
    element = await createElement();
    element.isEditMode = false;
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('growspace-edit-mode-banner')).toBeNull();
  });

  it('redispatches batch-add-plants from banner', async () => {
    viewMode$.set(ViewMode.STANDARD);
    element = await createElement();
    element.isEditMode = true;
    await element.updateComplete;

    const banner = element.shadowRoot?.querySelector('growspace-edit-mode-banner');
    const spy = vi.spyOn(element, 'dispatchEvent');

    banner?.dispatchEvent(
      new CustomEvent('batch-add-plants', { detail: { quantity: 3 }, bubbles: true, composed: true })
    );

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'batch-add-plants', detail: { quantity: 3 } })
    );
  });

  it('shows transplant-source-panel when gridInteraction$ status is transplanting', async () => {
    viewMode$.set(ViewMode.STANDARD);
    devicesAtom.set([
      {
        name: 'GS1',
        plants: [
          { attributes: { stage: 'clone', plant_id: 'c1' } },
          { attributes: { stage: 'seedling', plant_id: 's1' } },
        ],
      },
    ]);
    element = await createElement();

    gridInteraction$.set({ status: 'transplanting', sourcePlantId: 'c1' });
    element.requestUpdate();
    await element.updateComplete;

    const panel = element.shadowRoot?.querySelector('transplant-source-panel') as
      | MockTransplantPanel
      | null;
    expect(panel).toBeTruthy();
    expect(panel!.clonePlants).toHaveLength(1);
    expect(panel!.seedlingPlants).toHaveLength(1);
  });

  it('hides transplant-source-panel when gridInteraction$ is idle', async () => {
    viewMode$.set(ViewMode.STANDARD);
    element = await createElement();

    gridInteraction$.set({ status: 'idle' });
    element.requestUpdate();
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('transplant-source-panel')).toBeNull();
  });

  it('shows collapse-handle button when config.initial_view_mode is header', async () => {
    viewMode$.set(ViewMode.STANDARD);
    element = await createElement();
    element.config = { initial_view_mode: 'header' } as never;
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('.collapse-handle')).toBeTruthy();
  });

  it('collapse-handle dispatches toggle-expansion', async () => {
    viewMode$.set(ViewMode.STANDARD);
    element = await createElement();
    element.config = { initial_view_mode: 'header' } as never;
    await element.updateComplete;

    const spy = vi.spyOn(element, 'dispatchEvent');
    const btn = element.shadowRoot?.querySelector('.collapse-handle') as HTMLElement;
    btn.click();

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'toggle-expansion' })
    );
  });

  it('hides collapse-handle when config.initial_view_mode is not header', async () => {
    viewMode$.set(ViewMode.STANDARD);
    element = await createElement();
    element.config = { initial_view_mode: 'standard' } as never;
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('.collapse-handle')).toBeNull();
  });

  // ── focusPlant ────────────────────────────────────────────────────────────

  it('focusPlant delegates to growspace-grid-container', async () => {
    viewMode$.set(ViewMode.STANDARD);
    element = await createElement();

    const grid = element.shadowRoot?.querySelector('growspace-grid-container') as MockGridContainer;
    const spy = vi.spyOn(grid, 'focusPlant');

    element.focusPlant(7);

    expect(spy).toHaveBeenCalledWith(7);
  });

  it('focusPlant does not throw when grid is absent', async () => {
    viewMode$.set(ViewMode.HEADER);
    element = await createElement();

    // HEADER mode renders no grid — focusPlant should be a no-op
    expect(() => element.focusPlant(0)).not.toThrow();
  });

  // ── willUpdate / store re-init ─────────────────────────────────────────────

  it('willUpdate re-initialises controllers when store property changes', async () => {
    viewMode$.set(ViewMode.STANDARD);
    element = await createElement();

    const initSpy = vi.spyOn(element as never as { _initControllers(): void }, '_initControllers');
    const newStore = buildMockStore();
    (element as never as { store: unknown }).store = newStore;

    element.requestUpdate('store', mockStore);
    await element.updateComplete;

    expect(initSpy).toHaveBeenCalled();
  });

  // ── _handleTransplantDrop ─────────────────────────────────────────────────

  it('handles transplant drop successfully', async () => {
    vi.useFakeTimers();
    viewMode$.set(ViewMode.STANDARD);
    mockStore.hass.callService.mockResolvedValue({});
    element = await createElement();

    const grid = element.shadowRoot?.querySelector('growspace-grid-container');
    grid?.dispatchEvent(
      new CustomEvent('transplant-drop', {
        detail: { plant_id: 'p1', target_row: 1, target_col: 2 },
      })
    );

    await vi.runAllTimersAsync();

    expect(mockStore.hass.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'update_plant',
      expect.objectContaining({ plant_id: 'p1', growspace_id: 'gs1', row: 1, col: 2 })
    );
    expect(mockStore.actions.ui.toast).toHaveBeenCalledWith(
      'Plant transplanted successfully',
      'success'
    );
    vi.useRealTimers();
  });

  it('handles transplant drop failure gracefully', async () => {
    viewMode$.set(ViewMode.STANDARD);
    mockStore.hass.callService.mockRejectedValue(new Error('network error'));
    element = await createElement();

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const grid = element.shadowRoot?.querySelector('growspace-grid-container');
    grid?.dispatchEvent(
      new CustomEvent('transplant-drop', { detail: { plant_id: 'p1' } })
    );

    await new Promise((r) => setTimeout(r, 0));

    expect(mockStore.actions.ui.toast).toHaveBeenCalledWith('Failed to transplant plant', 'error');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('transplant drop is a no-op when device has no deviceId', async () => {
    viewMode$.set(ViewMode.STANDARD);
    element = await createElement();
    element.device = { deviceId: undefined } as never;

    await (element as never as {
      _handleTransplantDrop(e: CustomEvent): Promise<void>;
    })._handleTransplantDrop(new CustomEvent('transplant-drop', { detail: { plant_id: 'p1' } }));

    expect(mockStore.hass.callService).not.toHaveBeenCalled();
  });

  // ── _redispatch fallback (null detail → target.value) ─────────────────────

  it('_redispatch uses target.value when detail is null', async () => {
    viewMode$.set(ViewMode.STANDARD);
    element = await createElement();

    const spy = vi.spyOn(element, 'dispatchEvent');
    const fakeEvent = {
      stopPropagation: vi.fn(),
      detail: null,
      target: { value: 'fallback-value' },
    } as never;

    (element as never as { _redispatch(e: CustomEvent, t: string): void })._redispatch(
      fakeEvent,
      'some-event'
    );

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'some-event', detail: 'fallback-value' })
    );
  });

  // ── _getPlantsByStage edge cases ───────────────────────────────────────────

  it('_getPlantsByStage returns empty array when devices is falsy', async () => {
    viewMode$.set(ViewMode.STANDARD);
    element = await createElement();
    devicesAtom.set(null as never);

    const result = (
      element as never as { _getPlantsByStage(s: string): unknown[] }
    )._getPlantsByStage('clone');
    expect(result).toEqual([]);
  });

  it('_getPlantsByStage handles devices without plants property', async () => {
    viewMode$.set(ViewMode.STANDARD);
    element = await createElement();
    devicesAtom.set([{ name: 'Empty' }] as never);

    const result = (
      element as never as { _getPlantsByStage(s: string): unknown[] }
    )._getPlantsByStage('seedling');
    expect(result).toEqual([]);
  });

  it('_getPlantsByStage attaches _growspaceName to each returned plant', async () => {
    viewMode$.set(ViewMode.STANDARD);
    element = await createElement();
    devicesAtom.set([
      {
        name: 'Veg Room',
        plants: [
          { attributes: { stage: 'clone', plant_id: 'c1' } },
          { attributes: { stage: 'veg', plant_id: 'v1' } },
        ],
      },
    ] as never);

    const result = (
      element as never as {
        _getPlantsByStage(s: string): Array<{ _growspaceName: string }>;
      }
    )._getPlantsByStage('clone');

    expect(result).toHaveLength(1);
    expect(result[0]._growspaceName).toBe('Veg Room');
  });
});
