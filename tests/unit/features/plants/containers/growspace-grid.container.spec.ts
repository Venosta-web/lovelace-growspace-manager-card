import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { atom } from 'nanostores';
import { fixture, html } from '@open-wc/testing-helpers';
import { ContextProvider } from '@lit/context';
import { storeContext } from '../../../../../src/context';
import '../../../../../src/features/plants/containers/growspace-grid.container';
import type { GrowspaceGridContainer } from '../../../../../src/features/plants/containers/growspace-grid.container';
import type { PlantEntity } from '../../../../../src/types';
import { gridInteraction$, cancel } from '../../../../../src/slices/grid-interaction';
import { activeDialog$ } from '../../../../../src/slices/ui';
import * as uiSlice from '../../../../../src/slices/ui';

// Empty-slot clicks now open the Add-Plant dialog through the slice op the
// container calls directly. `{ spy: true }` keeps every real atom/mutator while
// recording calls; an `importOriginal()` factory would deadlock on the
// slices/ui index↔dialogs cycle.
vi.mock('../../../../../src/slices/ui', { spy: true });

describe('GrowspaceGridContainer', () => {
  let element: GrowspaceGridContainer;
  let mockStore: any;

  const mockPlant = {
    entity_id: 'plant.test1',
    attributes: {
      plant_id: 'plant_test1',
      growspace_id: 'gs1',
    },
  } as unknown as PlantEntity;

  beforeEach(async () => {
    vi.clearAllMocks();
    cancel();

    mockStore = {
      ui: {
        $isEditMode: atom(false),
        $selectedPlants: atom(new Set()),
        $isCompactView: atom(false),
        $isLoading: atom(false),
        $gridOverlayMode: atom('NONE'),
        $taskState: atom({ kind: 'idle' }),
        $language: atom('en'),
        pickArrangementPlant: vi.fn(),
        placeArrangementPlant: vi.fn(),
        announce: vi.fn(),
      },
      data: {
        $devices: atom([]),
      },
      grid: {
        $selectedDevice: atom('gs1'),
      },
      actions: {
        ui: {
          openPlantOverviewDialog: vi.fn(),
          openAddPlantDialog: vi.fn(),
        },
        plant: {
          drop: vi.fn(),
        },
      },
    };

    element = await fixture<GrowspaceGridContainer>(html`
      <growspace-grid-container .store=${mockStore}></growspace-grid-container>
    `);

    element.plants = [
      [mockPlant, null],
      [null, null],
    ];
    element.rows = 2;
    element.cols = 2;

    await element.updateComplete;

    // Drag-drop now routes through the container's private `_handlePlantDrop`
    // (which calls the Plant slice mutators); spy at that routing seam.
    vi.spyOn(element as any, '_handlePlantDrop').mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (element && element.parentNode && element.parentNode.parentNode) {
      element.parentNode.parentNode.removeChild(element.parentNode);
    }
  });

  it('renders grid UI with viewmodel passing correctly', async () => {
    const gridUI = element.shadowRoot?.querySelector('growspace-grid-ui') as any;
    expect(gridUI).to.exist;
    expect(gridUI.rows).to.equal(2);
    expect(gridUI.cols).to.equal(2);
    expect(gridUI.cells.length).to.equal(4);
  });

  it('cell click transitions gridInteraction$ to selected with the plant id', async () => {
    const gridUI = element.shadowRoot?.querySelector('growspace-grid-ui') as HTMLElement;
    gridUI.dispatchEvent(
      new CustomEvent('cell-click', {
        detail: { cell: { plant: mockPlant } },
      })
    );

    const state = gridInteraction$.get();
    expect(state.status).toBe('selected');
    expect((state as { status: 'selected'; plantId: string }).plantId).toBe('plant_test1');
  });

  it('opens plant overview dialog when gridInteraction$ transitions to selected', async () => {
    const gridUI = element.shadowRoot?.querySelector('growspace-grid-ui') as HTMLElement;
    gridUI.dispatchEvent(
      new CustomEvent('cell-click', {
        detail: { cell: { plant: mockPlant } },
      })
    );

    await element.updateComplete;
    expect(activeDialog$.get()).toEqual(expect.objectContaining({ type: 'PLANT_OVERVIEW' }));
    expect((activeDialog$.get() as { payload: { plant: unknown } }).payload.plant).toBe(mockPlant);
  });

  it('delegates empty slot click to store action (0-based indexing)', async () => {
    const gridUI = element.shadowRoot?.querySelector('growspace-grid-ui') as HTMLElement;
    // The UI emits 1-based indices (row 2, col 2)
    gridUI.dispatchEvent(
      new CustomEvent('empty-slot-click', {
        detail: { row: 2, col: 2 },
      })
    );

    // Action expects the target growspace (ADR-0027) + 0-based row/col
    expect(uiSlice.openAddPlantDialog).toHaveBeenCalledWith('gs1', 1, 1);
  });

  it('delegates grid-drop to plant action', async () => {
    const gridUI = element.shadowRoot?.querySelector('growspace-grid-ui') as HTMLElement;
    gridUI.dispatchEvent(
      new CustomEvent('grid-drop', {
        detail: {
          targetRow: 1,
          targetCol: 1,
          targetPlant: null,
          draggedPlant: mockPlant,
        },
      })
    );

    expect((element as any)._handlePlantDrop).toHaveBeenCalledWith(1, 1, null, mockPlant);
  });

  it('uses plant activation to pick up a plant during Arrange', () => {
    mockStore.ui.$taskState.set({
      kind: 'arrange',
      status: 'editing',
      pickedPlantId: null,
      draft: { plant_test1: { row: 0, col: 0 } },
    });
    const gridUI = element.shadowRoot?.querySelector('growspace-grid-ui') as HTMLElement;

    gridUI.dispatchEvent(
      new CustomEvent('cell-click', {
        detail: { cell: { plant: mockPlant, row: 1, col: 1 } },
      })
    );

    expect(mockStore.ui.pickArrangementPlant).toHaveBeenCalledWith('plant_test1', 'plant_test1');
    expect(gridInteraction$.get().status).toBe('idle');
  });

  it('routes pointer or touch placement through the shared Arrangement Draft', async () => {
    mockStore.ui.$taskState.set({
      kind: 'arrange',
      status: 'editing',
      pickedPlantId: null,
      draft: { plant_test1: { row: 0, col: 0 } },
    });
    vi.mocked((element as any)._handlePlantDrop).mockRestore();

    await (element as any)._handlePlantDrop(2, 2, null, mockPlant);

    expect(mockStore.ui.pickArrangementPlant).toHaveBeenCalledWith('plant_test1', 'plant_test1');
    expect(mockStore.ui.placeArrangementPlant).toHaveBeenCalledWith(
      1,
      1,
      expect.objectContaining({ plant_test1: 'plant_test1' })
    );
  });

  it('moves the keyboard target and announces its occupancy during Arrange', () => {
    mockStore.ui.$taskState.set({
      kind: 'arrange',
      status: 'editing',
      pickedPlantId: 'plant_test1',
      draft: { plant_test1: { row: 0, col: 0 } },
    });
    const gridUI = element.shadowRoot?.querySelector('growspace-grid-ui') as any;
    const wrapper = gridUI.shadowRoot.querySelector('.grid-item-wrapper') as HTMLElement;
    const focusCell = vi.spyOn(gridUI, 'focusCell');
    const event = {
      key: 'ArrowRight',
      composedPath: () => [wrapper],
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as KeyboardEvent;

    (element as any)._handleArrangeKeydown(event);

    expect(focusCell).toHaveBeenCalledWith(1, 2);
    expect(mockStore.ui.announce).toHaveBeenCalledWith('Target row 1, column 2: empty.');
  });

  it('recreates viewmodel when plants change', async () => {
    const oldViewModel = element['viewModel'];
    element.plants = [[null, null]];
    await element.updateComplete;

    expect(element['viewModel']).to.not.equal(oldViewModel);
  });

  it('handles transplant-drop from external source', async () => {
    let transplantPayload: any = null;
    element.addEventListener('transplant-drop', (e: any) => {
      transplantPayload = e.detail;
    });

    const gridUI = element.shadowRoot?.querySelector('growspace-grid-ui') as HTMLElement;
    const dragEvent = new CustomEvent('grid-drop', {
      detail: {
        targetRow: 2,
        targetCol: 2,
        targetPlant: null,
        draggedPlant: null,
        originalEvent: {
          dataTransfer: {
            getData: (type: string) =>
              type === 'application/json'
                ? JSON.stringify({
                    type: 'transplant',
                    plant_id: 'p1',
                    source_growspace_id: 'src1',
                  })
                : '',
          },
        },
      },
    });

    gridUI.dispatchEvent(dragEvent);
    expect(transplantPayload).to.deep.equal({
      plant_id: 'p1',
      source_growspace_id: 'src1',
      target_row: 2,
      target_col: 2,
    });
  });

  it('handles grid-mobile-drop', async () => {
    const gridUI = element.shadowRoot?.querySelector('growspace-grid-ui') as HTMLElement;

    // Mock shadowRoot.elementFromPoint
    element.shadowRoot!.elementFromPoint = vi.fn().mockReturnValue({
      closest: () => ({
        classList: { contains: (c: string) => c === 'plant-card-empty' },
        getAttribute: (attr: string) =>
          attr === 'data-row' ? '2' : attr === 'data-col' ? '1' : null,
      }),
    });

    gridUI.dispatchEvent(
      new CustomEvent('grid-mobile-drop', {
        detail: { x: 100, y: 100, plant: mockPlant },
      })
    );

    expect((element as any)._handlePlantDrop).toHaveBeenCalledWith(2, 1, null, mockPlant);
  });

  it('focuses a plant card via focusPlant method', async () => {
    const gridUI = element.shadowRoot?.querySelector('growspace-grid-ui') as any;
    // Mock the UI's shadow root to return a card list
    const mockCard = { focus: vi.fn() };
    gridUI.shadowRoot.querySelectorAll = vi.fn().mockReturnValue([mockCard]);

    element.focusPlant(0);
    expect(mockCard.focus).toHaveBeenCalled();
  });

  it('does not throw when focusPlant is called and no cards are found', async () => {
    const gridUI = element.shadowRoot?.querySelector('growspace-grid-ui') as any;
    gridUI.shadowRoot.querySelectorAll = vi.fn().mockReturnValue([]);

    // Index out of range — should not throw
    expect(() => element.focusPlant(99)).not.toThrow();
  });

  it('renders loading placeholder when viewModelController is not initialized', async () => {
    // Create element without a store so connectedCallback skips init
    const bare = await fixture<GrowspaceGridContainer>(html`
      <growspace-grid-container></growspace-grid-container>
    `);
    await bare.updateComplete;

    const loading = bare.shadowRoot?.querySelector('div');
    expect(loading?.textContent).to.contain('Loading');
  });

  it('handles grid-drop with no draggedPlant and no dataTransfer', async () => {
    const gridUI = element.shadowRoot?.querySelector('growspace-grid-ui') as HTMLElement;
    gridUI.dispatchEvent(
      new CustomEvent('grid-drop', {
        detail: {
          targetRow: 1,
          targetCol: 1,
          targetPlant: null,
          draggedPlant: null,
          originalEvent: null,
        },
      })
    );

    // plant.drop should NOT be called since there's no dragged plant
    expect((element as any)._handlePlantDrop).not.toHaveBeenCalled();
  });

  it('handles grid-drop with originalEvent but no dataTransfer', async () => {
    const gridUI = element.shadowRoot?.querySelector('growspace-grid-ui') as HTMLElement;
    gridUI.dispatchEvent(
      new CustomEvent('grid-drop', {
        detail: {
          targetRow: 1,
          targetCol: 1,
          targetPlant: null,
          draggedPlant: mockPlant,
          originalEvent: { dataTransfer: null },
        },
      })
    );

    // Falls through to regular drop
    expect((element as any)._handlePlantDrop).toHaveBeenCalledWith(1, 1, null, mockPlant);
  });

  it('handles grid-mobile-drop targeting a plant-card-container element', async () => {
    const gridUI = element.shadowRoot?.querySelector('growspace-grid-ui') as HTMLElement;

    const mockCardEl = {
      classList: { contains: () => false },
      tagName: 'PLANT-CARD-CONTAINER',
      plant: mockPlant,
      row: 2,
      col: 3,
    };

    element.shadowRoot!.elementFromPoint = vi.fn().mockReturnValue({
      closest: () => mockCardEl,
    });

    gridUI.dispatchEvent(
      new CustomEvent('grid-mobile-drop', {
        detail: { x: 50, y: 50, plant: mockPlant },
      })
    );

    expect((element as any)._handlePlantDrop).toHaveBeenCalledWith(2, 3, mockPlant, mockPlant);
  });

  it('handles grid-mobile-drop when no target is found at coordinates', async () => {
    const gridUI = element.shadowRoot?.querySelector('growspace-grid-ui') as HTMLElement;

    element.shadowRoot!.elementFromPoint = vi.fn().mockReturnValue(null);

    gridUI.dispatchEvent(
      new CustomEvent('grid-mobile-drop', {
        detail: { x: 50, y: 50, plant: mockPlant },
      })
    );

    expect((element as any)._handlePlantDrop).not.toHaveBeenCalled();
  });

  it('handles grid-mobile-drop when closest returns null', async () => {
    const gridUI = element.shadowRoot?.querySelector('growspace-grid-ui') as HTMLElement;

    element.shadowRoot!.elementFromPoint = vi.fn().mockReturnValue({
      closest: () => null,
    });

    gridUI.dispatchEvent(
      new CustomEvent('grid-mobile-drop', {
        detail: { x: 50, y: 50, plant: mockPlant },
      })
    );

    expect((element as any)._handlePlantDrop).not.toHaveBeenCalled();
  });

  it('handles cell-click when cell has no plant (no-op)', async () => {
    const gridUI = element.shadowRoot?.querySelector('growspace-grid-ui') as HTMLElement;
    gridUI.dispatchEvent(
      new CustomEvent('cell-click', {
        detail: { cell: { plant: null } },
      })
    );

    expect(gridInteraction$.get().status).toBe('idle');
    expect(mockStore.actions.ui.openPlantOverviewDialog).not.toHaveBeenCalled();
  });

  it('handles grid-drop when transplantData is invalid JSON', async () => {
    const gridUI = element.shadowRoot?.querySelector('growspace-grid-ui') as HTMLElement;
    gridUI.dispatchEvent(
      new CustomEvent('grid-drop', {
        detail: {
          targetRow: 1,
          targetCol: 1,
          targetPlant: null,
          draggedPlant: mockPlant,
          originalEvent: {
            dataTransfer: {
              getData: (type: string) => (type === 'application/json' ? '{invalid-json' : ''),
            },
          },
        },
      })
    );

    expect((element as any)._handlePlantDrop).toHaveBeenCalledWith(1, 1, null, mockPlant);
  });

  it('handles grid-drop when transplantData has type other than transplant', async () => {
    const gridUI = element.shadowRoot?.querySelector('growspace-grid-ui') as HTMLElement;
    gridUI.dispatchEvent(
      new CustomEvent('grid-drop', {
        detail: {
          targetRow: 1,
          targetCol: 1,
          targetPlant: null,
          draggedPlant: mockPlant,
          originalEvent: {
            dataTransfer: {
              getData: (type: string) =>
                type === 'application/json' ? JSON.stringify({ type: 'other' }) : '',
            },
          },
        },
      })
    );

    expect((element as any)._handlePlantDrop).toHaveBeenCalledWith(1, 1, null, mockPlant);
  });

  it('handles grid-drop when transplantData is empty string', async () => {
    const gridUI = element.shadowRoot?.querySelector('growspace-grid-ui') as HTMLElement;
    gridUI.dispatchEvent(
      new CustomEvent('grid-drop', {
        detail: {
          targetRow: 1,
          targetCol: 1,
          targetPlant: null,
          draggedPlant: mockPlant,
          originalEvent: {
            dataTransfer: {
              getData: (type: string) => (type === 'application/json' ? '' : ''),
            },
          },
        },
      })
    );

    expect((element as any)._handlePlantDrop).toHaveBeenCalledWith(1, 1, null, mockPlant);
  });

  it('handles grid-mobile-drop when shadowRoot is undefined', async () => {
    const gridUI = element.shadowRoot?.querySelector('growspace-grid-ui') as HTMLElement;

    Object.defineProperty(element, 'shadowRoot', {
      get: () => null,
      configurable: true,
    });

    gridUI.dispatchEvent(
      new CustomEvent('grid-mobile-drop', {
        detail: { x: 50, y: 50, plant: mockPlant },
      })
    );

    expect((element as any)._handlePlantDrop).not.toHaveBeenCalled();
  });

  it('handles grid-mobile-drop targeting plant-card-empty with missing attributes', async () => {
    const gridUI = element.shadowRoot?.querySelector('growspace-grid-ui') as HTMLElement;

    element.shadowRoot!.elementFromPoint = vi.fn().mockReturnValue({
      closest: () => ({
        classList: { contains: (c: string) => c === 'plant-card-empty' },
        getAttribute: () => null,
      }),
    });

    gridUI.dispatchEvent(
      new CustomEvent('grid-mobile-drop', {
        detail: { x: 50, y: 50, plant: mockPlant },
      })
    );

    expect((element as any)._handlePlantDrop).toHaveBeenCalledWith(1, 1, null, mockPlant);
  });

  it('handles grid-mobile-drop when dropTarget does not match expected types', async () => {
    const gridUI = element.shadowRoot?.querySelector('growspace-grid-ui') as HTMLElement;

    element.shadowRoot!.elementFromPoint = vi.fn().mockReturnValue({
      closest: () => ({
        classList: { contains: () => false },
        tagName: 'OTHER-TAG',
      }),
    });

    gridUI.dispatchEvent(
      new CustomEvent('grid-mobile-drop', {
        detail: { x: 50, y: 50, plant: mockPlant },
      })
    );

    expect((element as any)._handlePlantDrop).not.toHaveBeenCalled();
  });
});
