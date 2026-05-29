import { expect, test, describe, aroundEach, vi } from 'vitest';
import { GrowspaceGridCard } from '../../src/cards/growspace-grid-card';
import { ViewMode } from '../../src/features/environment/constants';
import type { GrowspaceManagerCardConfig } from '../../src/lib/types/config';
import { aGrowspace, aHass } from '../fixtures';
import { renderCard } from '../harness';
import { gridInteraction$ } from '../../src/slices/grid-interaction';

vi.mock('../../src/features/ui/containers/growspace-dialog-host.container', () => ({}));
vi.mock('../../src/features/ui/containers/growspace-toast.container', () => ({}));
vi.mock('../../src/features/shared/layouts/growspace-view-switcher', () => ({}));
vi.mock('../../src/features/shared/ui/error-boundary', () => ({
  ErrorBoundary: class extends HTMLElement {},
}));
vi.mock('../../src/cards/editors/growspace-grid-card-editor', () => ({
  GrowspaceGridCardEditor: class extends HTMLElement {},
}));

describe('GrowspaceGridCard', () => {
  let element: GrowspaceGridCard;

  aroundEach(async (runTest) => {
    const handle = await renderCard<GrowspaceGridCard>('growspace-grid-card', {
      hass: aHass({ growspaces: [aGrowspace()] }),
      growspace: aGrowspace(),
    });
    element = handle.element;
    await runTest();
    handle.unmount();
    vi.restoreAllMocks();
  });

  test('is defined', () => {
    expect(element).toBeInstanceOf(GrowspaceGridCard);
  });

  test('forces compact mode and standard view on config set', () => {
    const config: GrowspaceManagerCardConfig = {
      type: 'custom:growspace-grid-card',
      default_growspace: 'test_tent',
      compact: false,
      initial_view_mode: 'heatmap' as any,
    };

    const initSpy = vi.spyOn(element.store, 'initializeSelectedDevice');
    const setViewSpy = vi.spyOn(element.store.ui, 'setViewMode');

    element.setConfig(config);

    expect(initSpy).toHaveBeenCalledWith(
      expect.objectContaining({ compact: true, initial_view_mode: ViewMode.STANDARD })
    );
    expect(setViewSpy).toHaveBeenCalledWith(ViewMode.STANDARD);
  });

  test('throws error on invalid config', () => {
    expect(() => element.setConfig(undefined as any)).toThrowError('Invalid configuration');
  });

  test('provides fallback stub config', () => {
    const stub = GrowspaceGridCard.getStubConfig();
    expect(stub.type).toBe('custom:growspace-grid-card');
    expect(stub).toHaveProperty('default_growspace');
  });

  test('returns standard card size', () => {
    expect(element.getCardSize()).toBe(3);
  });

  test('calls store updateHass on updated', async () => {
    const spy = vi.spyOn(element.store, 'updateHass');
    element.hass = { ...element.hass, language: 'de' } as any;
    await element.updateComplete;
    expect(spy).toHaveBeenCalled();
  });

  test('disconnectedCallback destroys store', async () => {
    const spy = vi.spyOn(element.store, 'destroy');
    element.disconnectedCallback();
    expect(spy).toHaveBeenCalled();
  });

  test('stale counter triggers data refresh', async () => {
    const refreshSpy = vi.spyOn(element.store.syncService, 'refreshGrowspaceData');
    element.store.data.$staleCounter.set(element.store.data.$staleCounter.get() + 1);
    await Promise.resolve();
    expect(refreshSpy).toHaveBeenCalled();
  });

  test('event handlers trigger store actions', async () => {
    element.store.ui.$isLoading.set(false);
    element.store.data.$devices.set([
      { deviceId: 'test_tent', name: 'Test Tent', plants: [] } as any,
    ]);
    element.store.grid.$selectedDevice.set('test_tent');
    await element.updateComplete;

    const cardContainer = element.shadowRoot?.querySelector('.unified-growspace-card');

    const handlers = [
      { event: 'select-all', spy: vi.spyOn(element.store.actions.ui, 'selectAllPlants') },
      { event: 'clear-selection', spy: vi.spyOn(element.store.actions.ui, 'clearPlantSelection') },
      { event: 'water-selected', spy: vi.spyOn(element.store.actions.ui, 'openBatchWateringDialog') },
      { event: 'training-selected', spy: vi.spyOn(element.store.actions.ui, 'openBatchTrainingDialog') },
      { event: 'ipm-selected', spy: vi.spyOn(element.store.actions.ui, 'openIPMDialog') },
      { event: 'delete-selected', spy: vi.spyOn(element.store.actions.ui, 'deleteSelectedPlants') },
    ];

    for (const { event, spy } of handlers) {
      cardContainer?.dispatchEvent(new CustomEvent(event));
      expect(spy).toHaveBeenCalled();
    }

    const editModeSpy = vi.spyOn(element.store.ui, 'setEditMode');
    cardContainer?.dispatchEvent(new CustomEvent('exit-edit-mode'));
    expect(editModeSpy).toHaveBeenCalledWith(false);

    const dialogSpy = vi.spyOn(element.store.ui, 'setActiveDialog');
    cardContainer?.dispatchEvent(new CustomEvent('batch-add-plants'));
    expect(dialogSpy).toHaveBeenCalledWith({ type: 'ADD_PLANTS', payload: {} });

    const deviceSpy = vi.spyOn(element.store, 'handleDeviceChange');
    cardContainer?.dispatchEvent(new CustomEvent('growspace-changed', { detail: 'other_tent' }));
    expect(deviceSpy).toHaveBeenCalledWith('other_tent');
  });

  test('transplant-mode event triggers startTransplant flow', async () => {
    element.store.ui.$isLoading.set(false);
    element.store.data.$devices.set([
      { deviceId: 'test_tent', name: 'Test Tent', plants: [] } as any,
    ]);
    element.store.grid.$selectedDevice.set('test_tent');
    await element.updateComplete;

    // Put grid interaction in selected state so startTransplant has an effect
    gridInteraction$.set({ status: 'selected', plantId: 'test_tent_plant_1' });

    const cardContainer = element.shadowRoot?.querySelector('.unified-growspace-card');
    cardContainer?.dispatchEvent(new CustomEvent('transplant-mode'));

    expect(gridInteraction$.get().status).toBe('transplanting');
  });

  test('renders loading state when store is loading', async () => {
    element.store.ui.$isLoading.set(true);
    element.store.ui.$isEditMode.set(false);
    element.store.ui.$viewMode.set(ViewMode.STANDARD);
    element.store.ui.$focusedPlantIndex.set(-1);
    await element.updateComplete;

    const loader = element.shadowRoot?.querySelector('ha-circular-progress');
    expect(loader).toBeTruthy();
  });

  test('renders no-data state when devices array is empty', async () => {
    element.store.ui.$isLoading.set(false);
    element.store.ui.$isEditMode.set(false);
    element.store.ui.$viewMode.set(ViewMode.STANDARD);
    element.store.ui.$focusedPlantIndex.set(-1);
    element.store.data.$devices.set([]);
    await element.updateComplete;

    const noData = element.shadowRoot?.querySelector('.no-data');
    expect(noData).toBeTruthy();
    expect(noData?.textContent).toContain('No growspace devices found.');
  });

  test('renders error state when selected device is not found', async () => {
    element.store.ui.$isLoading.set(false);
    element.store.ui.$isEditMode.set(false);
    element.store.ui.$viewMode.set(ViewMode.STANDARD);
    element.store.ui.$focusedPlantIndex.set(-1);
    element.store.data.$devices.set([
      {
        deviceId: 'wrong_device',
        name: 'Wrong Tent',
        plantsPerRow: 5,
        location: 'indoor',
        systemType: 'soil',
        plants: [],
      } as any,
    ]);
    element.store.grid.$selectedDevice.set('selected_tent');
    await element.updateComplete;

    const errorDiv = element.shadowRoot?.querySelector('.error');
    expect(errorDiv).toBeTruthy();
    expect(errorDiv?.textContent).toContain('No valid growspace selected. Please configure the card.');
  });

  test('renders grid view and handles all mapped UI events', async () => {
    element.store.ui.$isLoading.set(false);
    element.store.ui.$isEditMode.set(false);
    element.store.ui.$viewMode.set(ViewMode.STANDARD);
    element.store.ui.$focusedPlantIndex.set(-1);
    element.store.data.$devices.set([
      {
        deviceId: 'selected_tent',
        name: 'Selected Tent',
        plantsPerRow: 10,
        location: 'indoor',
        systemType: 'soil',
        plants: [],
      } as any,
    ]);
    element.store.grid.$selectedDevice.set('selected_tent');
    await element.updateComplete;

    const cardContainer = element.shadowRoot?.querySelector('.unified-growspace-card');
    expect(cardContainer).toBeTruthy();

    const haCard = element.shadowRoot?.querySelector('ha-card');
    expect(haCard?.classList.contains('wide-growspace')).toBe(true);

    const keyboardSpy = vi
      .spyOn(element.store.actions.ui, 'handleKeyboardNavigation')
      .mockImplementation(() => {});
    const selectAllSpy = vi
      .spyOn(element.store.actions.ui, 'selectAllPlants')
      .mockImplementation(() => {});
    const clearSpy = vi
      .spyOn(element.store.actions.ui, 'clearPlantSelection')
      .mockImplementation(() => {});
    const waterSpy = vi
      .spyOn(element.store.actions.ui, 'openBatchWateringDialog')
      .mockImplementation(() => {});
    const ipmSpy = vi
      .spyOn(element.store.actions.ui, 'openIPMDialog')
      .mockImplementation(() => {});
    const trainingSpy = vi
      .spyOn(element.store.actions.ui, 'openBatchTrainingDialog')
      .mockImplementation(() => {});
    const deleteSpy = vi
      .spyOn(element.store.actions.ui, 'deleteSelectedPlants')
      .mockResolvedValue(undefined as any);
    const deviceChangeSpy = vi
      .spyOn(element.store, 'handleDeviceChange')
      .mockImplementation(() => {});
    const setActiveDialogSpy = vi.spyOn(element.store.ui, 'setActiveDialog');
    const setEditModeSpy = vi.spyOn(element.store.ui, 'setEditMode');

    cardContainer?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    cardContainer?.dispatchEvent(new CustomEvent('growspace-changed', { detail: 'other_tent' }));
    cardContainer?.dispatchEvent(new CustomEvent('select-all'));
    cardContainer?.dispatchEvent(new CustomEvent('clear-selection'));
    cardContainer?.dispatchEvent(new CustomEvent('water-selected'));
    cardContainer?.dispatchEvent(new CustomEvent('training-selected'));
    cardContainer?.dispatchEvent(new CustomEvent('ipm-selected'));
    cardContainer?.dispatchEvent(new CustomEvent('batch-add-plants'));
    cardContainer?.dispatchEvent(new CustomEvent('delete-selected'));
    cardContainer?.dispatchEvent(new CustomEvent('exit-edit-mode'));

    expect(keyboardSpy).toHaveBeenCalledWith('ArrowRight');
    expect(deviceChangeSpy).toHaveBeenCalledWith('other_tent');
    expect(selectAllSpy).toHaveBeenCalled();
    expect(clearSpy).toHaveBeenCalled();
    expect(waterSpy).toHaveBeenCalled();
    expect(trainingSpy).toHaveBeenCalled();
    expect(ipmSpy).toHaveBeenCalled();
    expect(setActiveDialogSpy).toHaveBeenCalledWith({ type: 'ADD_PLANTS', payload: {} });
    expect(deleteSpy).toHaveBeenCalled();
    expect(setEditModeSpy).toHaveBeenCalledWith(false);
  });

  test('calls system_log/write on handle error', () => {
    (element as any)._handleError(new Error('Test Error'), { componentStack: 'Mock' });

    expect(element.hass.callService).toHaveBeenCalledWith(
      'system_log',
      'write',
      expect.objectContaining({
        message: 'Growspace Grid Card Error: Test Error',
        level: 'error',
        logger: 'lovelace_growspace_manager_card',
      })
    );
  });

  test('gets config element correctly', async () => {
    const editor = await GrowspaceGridCard.getConfigElement();
    expect(editor.tagName.toLowerCase()).toBe('growspace-grid-card-editor');
  });

  describe('harness', () => {
    let handle: Awaited<ReturnType<typeof renderCard<GrowspaceGridCard>>>;
    const growspace = aGrowspace();

    aroundEach(async (runTest) => {
      gridInteraction$.set({ status: 'idle' });
      handle = await renderCard<GrowspaceGridCard>('growspace-grid-card', {
        hass: aHass({ growspaces: [growspace] }),
        growspace,
      });
      await runTest();
      handle.unmount();
    });

    test('renders grid from aGrowspace fixture', () => {
      expect(handle.element).toBeInstanceOf(GrowspaceGridCard);
    });

    test('plant-cell click flows through GridInteraction to selected', () => {
      handle.clickPlantCell(1, 1);
      const state = gridInteraction$.get();
      expect(state.status).toBe('selected');
      if (state.status === 'selected') {
        expect(state.plantId).toBe(`${growspace.growspaceId}_plant_1`);
      }
    });

    test('selectViewMode switches the active view mode', () => {
      handle.selectViewMode(ViewMode.COMPACT);
      expect(handle.element.store.ui.$viewMode.get()).toBe(ViewMode.COMPACT);
    });
  });
});
