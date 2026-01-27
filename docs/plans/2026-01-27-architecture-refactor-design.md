# Lovelace Growspace Manager Card - Architecture Refactor Design

**Date:** 2026-01-27
**Status:** Design Approved
**Target:** Component complexity reduction and architectural modernization

## Executive Summary

This design addresses component complexity issues in the lovelace-growspace-manager-card (~19K lines, 55 components). Current architecture mixes presentation, business logic, API calls, and subscription management within components, making them difficult to maintain, test, and extend.

The solution introduces a three-layer architecture (Presentational → Container → Business Logic) with ViewModels, command pattern, and centralized subscription management. Migration will be phased over 10-12 weeks, allowing old and new patterns to coexist safely.

**Key Metrics:**
- Average component size: 320 lines → <200 lines (target)
- Largest component: 1727 lines → <400 lines (target)
- Test coverage: Current unknown → 90%+ (target)

---

## Part 1: Core Principles & Structure

### Philosophy: Smart Containers, Dumb Components

Current architecture mixes concerns - components that render UI also manage subscriptions, call APIs, and compute business logic. We separate these into distinct layers.

### Three-Layer Architecture

**1. Presentational Layer (UI Components)**
- Pure Lit components receiving only props
- No store access, no context consumption (except theme/localization)
- Emit custom events for user interactions
- Highly reusable and testable

**2. Container Layer (Smart Components)**
- Consume store context
- Subscribe to ViewModels (composed state)
- Dispatch actions
- Pass data down to presentational components
- Handle events from presentational components

**3. Business Logic Layer (Stores + Actions)**
- Nanostores for state management
- ViewModels: computed atoms combining multiple state slices
- Actions modules: pure functions handling business logic
- Services: API calls, external integrations

### Feature-Based Organization

Instead of organizing by technical type (components/, dialogs/, stores/), organize by domain:

```
src/
  features/
    plants/              # Everything plant-related
      components/        # Presentational components
      containers/        # Smart containers
      viewmodels/        # Computed state for views
      actions/           # Business logic
      types.ts

    environment/         # Sensors, climate control
      components/
      containers/
      viewmodels/
      actions/
      types.ts

    irrigation/          # Watering, nutrients
      components/
      containers/
      viewmodels/
      actions/
      types.ts

  shared/
    ui/                  # Generic presentational components
    layouts/             # Dialog/modal layouts
    controllers/         # Reactive controllers
    commands/            # Command infrastructure
    events/              # Event bus
```

---

## Part 2: ViewModel Pattern

### Problem

Components currently subscribe to 4-8 separate atoms and manually compute derived state:

```typescript
// Current: Component subscribes to many atoms
private _isEditModeController = new StoreController(this, store.ui.$isEditMode);
private _selectedPlantsController = new StoreController(this, store.ui.$selectedPlants);
private _isCompactController = new StoreController(this, store.ui.$isCompactView);
private _overlayModeController = new StoreController(this, store.ui.$gridOverlayMode);

// ... plus business logic in getters
get growthDeviation(): number {
  const strain = this.strainLibrary.find(s => s.strain === this.plant.attributes.strain);
  return calculateGrowthDeviation(this.plant, strain);
}
```

### Solution

ViewModels - single computed atom per view with all needed data pre-computed.

### ViewModel Structure

```typescript
// features/plants/viewmodels/plant-card.viewmodel.ts
export interface PlantCardViewModel {
  // Display data
  displayData: PlantDisplayData;
  isSelected: boolean;
  isDraggable: boolean;

  // Computed indicators
  growthDeviation: number;
  isRecentlyWatered: boolean;
  hasRecommendedPreset: boolean;
  statusLevel: 'ok' | 'warning' | 'danger';

  // UI state
  isEditMode: boolean;
  showActions: boolean;
}

export function createPlantCardViewModel(
  plant: PlantEntity,
  store: GrowspaceStore
): ReadableAtom<PlantCardViewModel> {
  return computed(
    [
      store.ui.$isEditMode,
      store.ui.$selectedPlants,
      store.data.$strainLibrary,
      store.data.$nutrientPresets,
      store.data.$devices
    ],
    (isEditMode, selectedPlants, strains, presets, devices) => {
      const strain = strains.find(s => s.strain === plant.attributes.strain);
      const device = devices.find(d => d.deviceId === plant.attributes.growspace_id);

      return {
        displayData: PlantUtils.getPlantDisplayData(plant, strains),
        isSelected: selectedPlants.has(plant.attributes.plant_id),
        isDraggable: isEditMode,
        growthDeviation: calculateGrowthDeviation(plant, strain),
        isRecentlyWatered: checkWateringStatus(plant),
        hasRecommendedPreset: hasMatchingPreset(plant, presets),
        statusLevel: computeStatusLevel(plant, strain),
        isEditMode,
        showActions: !isEditMode,
      };
    }
  );
}
```

### Container Pattern

Container wraps presentational component, provides ViewModel:

```typescript
// features/plants/containers/plant-card.container.ts
@customElement('plant-card-container')
export class PlantCardContainer extends LitElement {
  @consume({ context: storeContext })
  private store!: GrowspaceStore;

  @property({ attribute: false }) plant!: PlantEntity;

  private viewModel!: ReadableAtom<PlantCardViewModel>;
  private viewModelController!: StoreController<PlantCardViewModel>;

  connectedCallback() {
    super.connectedCallback();
    this.viewModel = createPlantCardViewModel(this.plant, this.store);
    this.viewModelController = new StoreController(this, this.viewModel);
  }

  render() {
    const vm = this.viewModelController.value;
    return html`
      <plant-card-ui
        .displayData=${vm.displayData}
        .isSelected=${vm.isSelected}
        .statusLevel=${vm.statusLevel}
        .isDraggable=${vm.isDraggable}
        @click=${this._handleClick}
        @toggle-selection=${this._handleToggleSelection}
      ></plant-card-ui>
    `;
  }

  private _handleClick() {
    this.store.actions.plants.openPlantDetails(this.plant.attributes.plant_id);
  }

  private _handleToggleSelection() {
    this.store.actions.plants.toggleSelection(this.plant.attributes.plant_id);
  }
}
```

### Benefits

1. **Single subscription**: Component subscribes to one ViewModel instead of 5-8 atoms
2. **Business logic centralized**: All computation logic in one testable place
3. **Memoized**: Nanostores only recomputes when dependencies change
4. **Type-safe**: Component gets strongly-typed view data

---

## Part 3: Dialog Refactoring

### Problem

Current dialogs are 1300-1700 lines doing everything:
- WebSocket subscription management
- API calls
- Form state management
- Validation logic
- Multiple tabs/views rendering
- Event handling

### Solution

Break dialogs into composable pieces using the Layout → Container → Presentational pattern.

### Dialog Architecture (3 Layers)

**Layer 1: Dialog Layout (Generic Shell)**

```typescript
// shared/layouts/base-dialog.layout.ts
@customElement('base-dialog-layout')
export class BaseDialogLayout extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property() title = '';
  @property() subtitle?: string;
  @property({ type: Boolean }) loading = false;
  @property({ type: Array }) tabs?: TabConfig[];
  @property() activeTab?: string;

  render() {
    return html`
      <ha-dialog open=${this.open} @closed=${this._handleClose}>
        <div slot="heading">
          <h2>${this.title}</h2>
          ${this.subtitle ? html`<p class="subtitle">${this.subtitle}</p>` : nothing}
        </div>

        ${this.tabs ? html`
          <tab-bar .tabs=${this.tabs} .active=${this.activeTab}></tab-bar>
        ` : nothing}

        <div class="dialog-content">
          ${this.loading ? html`<loading-spinner></loading-spinner>` : html`
            <slot></slot>
          `}
        </div>

        <div slot="actions">
          <slot name="actions"></slot>
        </div>
      </ha-dialog>
    `;
  }
}
```

**Layer 2: Dialog Container (Smart Logic)**

```typescript
// features/plants/containers/plant-overview-dialog.container.ts
@customElement('plant-overview-dialog-container')
export class PlantOverviewDialogContainer extends LitElement {
  @consume({ context: storeContext })
  private store!: GrowspaceStore;

  @property() plantId!: string;

  private viewModel!: ReadableAtom<PlantOverviewViewModel>;
  private viewModelController!: StoreController<PlantOverviewViewModel>;

  connectedCallback() {
    super.connectedCallback();
    // Single ViewModel contains all dialog data
    this.viewModel = createPlantOverviewViewModel(this.plantId, this.store);
    this.viewModelController = new StoreController(this, this.viewModel);
  }

  render() {
    const vm = this.viewModelController.value;

    return html`
      <base-dialog-layout
        .open=${vm.isOpen}
        .title=${vm.plant.displayName}
        .subtitle=${vm.plant.strain}
        .tabs=${vm.tabs}
        .activeTab=${vm.activeTab}
      >
        ${this._renderTabContent(vm)}

        <div slot="actions">
          ${vm.showSaveButton ? html`
            <mwc-button @click=${this._handleSave}>Save</mwc-button>
          ` : nothing}
          <mwc-button @click=${this._handleClose}>Close</mwc-button>
        </div>
      </base-dialog-layout>
    `;
  }

  private _renderTabContent(vm: PlantOverviewViewModel) {
    switch (vm.activeTab) {
      case 'dashboard':
        return html`<plant-dashboard-view .data=${vm.dashboardData}></plant-dashboard-view>`;
      case 'timeline':
        return html`<plant-timeline-view .events=${vm.timelineEvents}></plant-timeline-view>`;
      case 'actions':
        return html`<plant-actions-view .plant=${vm.plant}></plant-actions-view>`;
    }
  }

  private _handleSave() {
    this.store.actions.plants.updatePlant(this.plantId, this.viewModelController.value.editedData);
  }
}
```

**Layer 3: Tab Content (Presentational Views)**

```typescript
// features/plants/components/plant-dashboard-view.ts
@customElement('plant-dashboard-view')
export class PlantDashboardView extends LitElement {
  @property({ attribute: false }) data!: PlantDashboardData;

  render() {
    return html`
      <div class="stats-grid">
        ${this.data.stats.map(stat => html`
          <stat-card .stat=${stat}></stat-card>
        `)}
      </div>

      <div class="info-sections">
        ${this.data.sections.map(section => html`
          <info-section .section=${section}></info-section>
        `)}
      </div>
    `;
  }
}
```

### Dialog ViewModel Example

```typescript
// features/plants/viewmodels/plant-overview.viewmodel.ts
export interface PlantOverviewViewModel {
  isOpen: boolean;
  plant: PlantViewData;
  activeTab: 'dashboard' | 'timeline' | 'actions';
  tabs: TabConfig[];

  // Tab-specific data
  dashboardData: PlantDashboardData;
  timelineEvents: TimelineEvent[];

  // Form state
  editedData: Partial<PlantAttributes>;
  hasChanges: boolean;
  showSaveButton: boolean;

  // UI flags
  isLoading: boolean;
  error?: string;
}

export function createPlantOverviewViewModel(
  plantId: string,
  store: GrowspaceStore
): ReadableAtom<PlantOverviewViewModel> {
  return computed(
    [
      store.ui.$activeDialog,
      store.data.$devices,
      store.data.$strainLibrary,
      store.history.$plantEvents, // Events fetched by history store
      // ... other dependencies
    ],
    (dialog, devices, strains, events) => {
      const isOpen = dialog.type === 'PLANT_OVERVIEW' && dialog.payload.plantId === plantId;
      const plant = findPlant(plantId, devices);

      if (!isOpen || !plant) {
        return createEmptyViewModel();
      }

      return {
        isOpen,
        plant: transformPlantForView(plant, strains),
        activeTab: dialog.payload.tab || 'dashboard',
        tabs: buildTabConfig(plant),
        dashboardData: buildDashboardData(plant, strains),
        timelineEvents: filterEventsForPlant(events, plantId),
        editedData: dialog.payload.editedData || {},
        hasChanges: hasEditedChanges(dialog.payload.editedData),
        showSaveButton: hasEditedChanges(dialog.payload.editedData),
        isLoading: false,
      };
    }
  );
}
```

### Benefits

1. **1700 lines → 3 files of ~300 lines each**
2. **No WebSocket management in dialog** - history store handles it, ViewModel reads from it
3. **No API calls in dialog** - actions handle it
4. **Reusable layout** - base-dialog-layout used by all dialogs
5. **Testable views** - presentational components easy to test
6. **Type-safe data flow** - ViewModel defines exact shape needed

---

## Part 4: Action & Command Pattern

### Problem

Business logic scattered across:
- Store methods that mix concerns (UI + API + state updates)
- Components calling `dataService` directly
- Inconsistent error handling
- Manual optimistic update management

### Solution

Unified command pattern with action creators.

### Action Architecture

**1. Action Creators (Entry Point)**

```typescript
// features/plants/actions/plant.actions.ts
export const plantActions = {
  /**
   * Update a single plant
   */
  updatePlant: (plantId: string, updates: Partial<PlantAttributes>) => {
    return createCommand<void>({
      execute: async (ctx: ActionContext) => {
        await ctx.dataService.updatePlant({ plant_id: plantId, ...updates });
      },
      onSuccess: (ctx) => {
        ctx.showToast('Plant updated', 'success');
        ctx.refreshData();
      },
      onError: (ctx, error) => {
        ctx.showToast(`Failed to update plant: ${error.message}`, 'error');
      },
    });
  },

  /**
   * Delete plant with undo support
   */
  deletePlant: (plantId: string) => {
    return createUndoableCommand<void>({
      execute: async (ctx: ActionContext) => {
        const plant = findPlant(plantId, ctx.data.$devices.get());
        if (!plant) throw new Error('Plant not found');

        // Optimistic delete
        ctx.optimisticManager.deletePlant(plantId);

        await ctx.dataService.removePlant(plantId);
        return { deletedPlant: plant };
      },
      undo: async (ctx: ActionContext, result) => {
        const { deletedPlant } = result;
        await ctx.dataService.addPlant({
          growspace_id: deletedPlant.attributes.growspace_id,
          row: deletedPlant.attributes.row,
          col: deletedPlant.attributes.col,
          strain: deletedPlant.attributes.strain,
          // ... restore all attributes
        });
      },
      onSuccess: (ctx) => {
        ctx.showToast('Plant deleted', 'success', {
          label: 'Undo',
          callback: () => ctx.undoRedoManager.undo(),
        });
        ctx.refreshData();
      },
      onError: (ctx, error) => {
        ctx.optimisticManager.revertDelete(plantId);
        ctx.showToast(`Failed to delete: ${error.message}`, 'error');
      },
    });
  },

  /**
   * Batch operation - water multiple plants
   */
  batchWaterPlants: (plantIds: string[], amount: number) => {
    return createBatchCommand<void>({
      items: plantIds,
      executeOne: async (ctx: ActionContext, plantId: string) => {
        await ctx.dataService.waterPlant({ plant_id: plantId, amount });
      },
      onProgress: (ctx, completed, total) => {
        ctx.ui.setProgress({ current: completed, total });
      },
      onSuccess: (ctx) => {
        ctx.ui.clearProgress();
        ctx.showToast(`Watered ${plantIds.length} plants`, 'success');
        ctx.refreshData();
      },
      onError: (ctx, error, failedItems) => {
        ctx.ui.clearProgress();
        ctx.showToast(
          `Watered ${plantIds.length - failedItems.length} plants, ${failedItems.length} failed`,
          'warning'
        );
      },
    });
  },

  /**
   * Complex multi-step operation
   */
  transplantPlant: (plantId: string, targetGrowspaceId: string, targetRow: number, targetCol: number) => {
    return createCommand<void>({
      execute: async (ctx: ActionContext) => {
        // Step 1: Validate target position is empty
        const targetDevice = ctx.data.$devices.get().find(d => d.deviceId === targetGrowspaceId);
        if (!targetDevice) throw new Error('Target growspace not found');

        const targetOccupied = targetDevice.plants?.some(
          p => p.attributes.row === targetRow && p.attributes.col === targetCol
        );
        if (targetOccupied) throw new Error('Target position is occupied');

        // Step 2: Update plant location
        await ctx.dataService.updatePlant({
          plant_id: plantId,
          growspace_id: targetGrowspaceId,
          row: targetRow,
          col: targetCol,
        });

        // Step 3: Log the transplant event
        await ctx.dataService.logEvent({
          category: 'transplant',
          plant_id: plantId,
          details: { from: 'source', to: targetGrowspaceId },
        });
      },
      onSuccess: (ctx) => {
        ctx.showToast('Plant transplanted successfully', 'success');
        ctx.ui.setTransplantMode(false);
        ctx.refreshData();
      },
      onError: (ctx, error) => {
        ctx.showToast(`Transplant failed: ${error.message}`, 'error');
      },
    });
  },
};
```

**2. Command Infrastructure**

```typescript
// shared/commands/command.ts
export interface Command<T> {
  execute(ctx: ActionContext): Promise<T>;
  onSuccess?(ctx: ActionContext, result: T): void | Promise<void>;
  onError?(ctx: ActionContext, error: Error): void | Promise<void>;
}

export interface UndoableCommand<T> extends Command<T> {
  undo(ctx: ActionContext, result: T): Promise<void>;
}

export interface BatchCommand<T> extends Command<T> {
  items: string[];
  executeOne(ctx: ActionContext, item: string): Promise<void>;
  onProgress?(ctx: ActionContext, completed: number, total: number): void;
}

/**
 * Execute a command with error handling
 */
export async function executeCommand<T>(
  command: Command<T>,
  ctx: ActionContext
): Promise<T | undefined> {
  try {
    const result = await command.execute(ctx);
    if (command.onSuccess) {
      await command.onSuccess(ctx, result);
    }
    return result;
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    console.error('Command execution failed:', err);
    if (command.onError) {
      await command.onError(ctx, err);
    }
    return undefined;
  }
}

/**
 * Helper to create simple commands
 */
export function createCommand<T>(config: Command<T>): Command<T> {
  return config;
}

/**
 * Helper to create undoable commands
 */
export function createUndoableCommand<T>(config: UndoableCommand<T>): UndoableCommand<T> {
  return config;
}

/**
 * Helper to create batch commands
 */
export function createBatchCommand<T>(config: BatchCommand<T>): BatchCommand<T> {
  return config;
}
```

**3. Integration with Store**

```typescript
// store/core/action-dispatcher.ts
export class ActionDispatcher {
  constructor(private store: GrowspaceStore) {}

  // Lazy-load action modules
  get plants() {
    return {
      updatePlant: (plantId: string, updates: Partial<PlantAttributes>) => {
        const command = plantActions.updatePlant(plantId, updates);
        return executeCommand(command, this.store.context);
      },
      deletePlant: (plantId: string) => {
        const command = plantActions.deletePlant(plantId);
        return executeCommand(command, this.store.context);
      },
      batchWaterPlants: (plantIds: string[], amount: number) => {
        const command = plantActions.batchWaterPlants(plantIds, amount);
        return executeCommand(command, this.store.context);
      },
      transplantPlant: (plantId: string, targetGrowspaceId: string, row: number, col: number) => {
        const command = plantActions.transplantPlant(plantId, targetGrowspaceId, row, col);
        return executeCommand(command, this.store.context);
      },
      openPlantDetails: (plantId: string) => {
        this.store.ui.setActiveDialog({ type: 'PLANT_OVERVIEW', payload: { plantId } });
      },
      toggleSelection: (plantId: string) => {
        this.store.ui.togglePlantSelection(plantId);
      },
    };
  }

  get irrigation() {
    // ... irrigation actions
  }

  get environment() {
    // ... environment actions
  }
}
```

**4. Usage in Components**

```typescript
// Container component dispatching actions
private _handleSave() {
  const vm = this.viewModelController.value;
  await this.store.actions.plants.updatePlant(this.plantId, vm.editedData);
}

private _handleDelete() {
  await this.store.actions.plants.deletePlant(this.plantId);
}

private _handleBatchWater() {
  const selectedIds = Array.from(this.store.ui.$selectedPlants.get());
  await this.store.actions.plants.batchWaterPlants(selectedIds, 500);
}
```

### Benefits

1. **Centralized business logic** - All operations in action modules
2. **Consistent error handling** - Built into command pattern
3. **Testable** - Pure functions, easy to mock ActionContext
4. **Undo/Redo support** - Built into undoable commands
5. **Progress tracking** - Built into batch commands
6. **Optimistic updates** - Consistent pattern across all commands
7. **Type-safe** - Generic types ensure correct return values

---

## Part 5: Subscription & Lifecycle Management

### Problem

Components manually managing:
- WebSocket subscriptions in `connectedCallback`/`disconnectedCallback`
- Event listener cleanup
- Polling intervals
- Store subscriptions

### Solution

Move subscriptions to stores, use reactive controllers for component needs.

### 1. Store-Managed Subscriptions

**History Store Handles Events (Not Components)**

```typescript
// store/history/history-store.ts
export class GrowspaceHistoryStore {
  // Atoms for event data
  public readonly $plantEvents: WritableAtom<Map<string, GrowspaceEvent[]>>;
  public readonly $growspaceEvents: WritableAtom<Map<string, GrowspaceEvent[]>>;

  private unsubscribe?: () => Promise<void>;
  private hass?: HomeAssistant;

  constructor(
    private dataService: DataService,
    private dataStore: GrowspaceDataStore
  ) {
    this.$plantEvents = atom(new Map());
    this.$growspaceEvents = atom(new Map());
  }

  /**
   * Initialize WebSocket subscriptions
   */
  public initialize(hass: HomeAssistant) {
    this.hass = hass;
    this._subscribeToEvents();
  }

  /**
   * Cleanup subscriptions
   */
  public destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }

  private async _subscribeToEvents() {
    if (!this.hass || this.unsubscribe) return;

    this.unsubscribe = await this.hass.connection.subscribeEvents(
      (event) => this._handleEvent(event as GrowspaceEvent),
      'growspace_manager_log_entry'
    );
  }

  private _handleEvent(event: GrowspaceEvent) {
    // Update plant-specific events
    if (event.plant_id) {
      const plantEvents = this.$plantEvents.get();
      const existing = plantEvents.get(event.plant_id) || [];
      plantEvents.set(event.plant_id, [event, ...existing].slice(0, 100)); // Keep last 100
      this.$plantEvents.set(new Map(plantEvents));
    }

    // Update growspace-wide events
    if (event.growspace_id) {
      const growspaceEvents = this.$growspaceEvents.get();
      const existing = growspaceEvents.get(event.growspace_id) || [];
      growspaceEvents.set(event.growspace_id, [event, ...existing].slice(0, 100));
      this.$growspaceEvents.set(new Map(growspaceEvents));
    }
  }

  /**
   * Fetch historical events for a plant
   */
  public async fetchPlantHistory(plantId: string): Promise<void> {
    const events = await this.dataService.fetchPlantEvents(plantId);
    const plantEvents = this.$plantEvents.get();
    plantEvents.set(plantId, events);
    this.$plantEvents.set(new Map(plantEvents));
  }
}
```

**Now Components Just Read from Store:**

```typescript
// ViewModel reads events from store (no subscriptions)
export function createPlantOverviewViewModel(
  plantId: string,
  store: GrowspaceStore
): ReadableAtom<PlantOverviewViewModel> {
  return computed(
    [
      store.history.$plantEvents,
      store.data.$devices,
      // ... other deps
    ],
    (plantEvents, devices) => {
      const events = plantEvents.get(plantId) || [];

      return {
        // ... other data
        timelineEvents: events,
      };
    }
  );
}

// Container triggers initial fetch (no subscription management)
@customElement('plant-overview-dialog-container')
export class PlantOverviewDialogContainer extends LitElement {
  connectedCallback() {
    super.connectedCallback();
    // Just trigger fetch - store handles subscriptions
    this.store.history.fetchPlantHistory(this.plantId);
  }

  // No disconnectedCallback needed!
}
```

### 2. Reactive Controllers for Reusable Logic

**Polling Controller (Reusable)**

```typescript
// shared/controllers/polling.controller.ts
export class PollingController implements ReactiveController {
  private intervalId?: number;

  constructor(
    private host: ReactiveControllerHost,
    private callback: () => void | Promise<void>,
    private interval: number
  ) {
    this.host.addController(this);
  }

  hostConnected() {
    this.start();
  }

  hostDisconnected() {
    this.stop();
  }

  start() {
    if (!this.intervalId) {
      this.intervalId = window.setInterval(this.callback, this.interval);
    }
  }

  stop() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
}

// Usage in component
class MyComponent extends LitElement {
  private polling = new PollingController(
    this,
    () => this.store.refreshData(),
    30000 // 30 seconds
  );
}
```

**Focus Management Controller**

```typescript
// shared/controllers/focus-trap.controller.ts
export class FocusTrapController implements ReactiveController {
  private previousFocus?: HTMLElement;

  constructor(
    private host: ReactiveControllerHost & HTMLElement,
    private selector: string
  ) {
    this.host.addController(this);
  }

  hostConnected() {
    this.previousFocus = document.activeElement as HTMLElement;

    requestAnimationFrame(() => {
      const element = this.host.shadowRoot?.querySelector(this.selector) as HTMLElement;
      element?.focus();
    });
  }

  hostDisconnected() {
    this.previousFocus?.focus();
  }
}

// Usage in dialog
class MyDialog extends LitElement {
  private focusTrap = new FocusTrapController(this, 'input[type="text"]');
}
```

### 3. Event Bus for Cross-Component Communication

**Centralized Event Bus**

```typescript
// shared/events/event-bus.ts
type EventHandler<T = any> = (payload: T) => void;

export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  /**
   * Subscribe to an event
   */
  on<T = any>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }

    this.handlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  /**
   * Emit an event
   */
  emit<T = any>(event: string, payload: T): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(payload));
    }
  }

  /**
   * Subscribe once
   */
  once<T = any>(event: string, handler: EventHandler<T>): void {
    const wrappedHandler = (payload: T) => {
      handler(payload);
      this.handlers.get(event)?.delete(wrappedHandler);
    };
    this.on(event, wrappedHandler);
  }
}

// Add to store
export class GrowspaceStore {
  public readonly eventBus = new EventBus();
  // ...
}
```

**Event Bus Controller (Auto-cleanup)**

```typescript
// shared/controllers/event-bus.controller.ts
export class EventBusController<T = any> implements ReactiveController {
  private unsubscribe?: () => void;

  constructor(
    private host: ReactiveControllerHost,
    private eventBus: EventBus,
    private eventName: string,
    private handler: EventHandler<T>
  ) {
    this.host.addController(this);
  }

  hostConnected() {
    this.unsubscribe = this.eventBus.on(this.eventName, this.handler);
  }

  hostDisconnected() {
    this.unsubscribe?.();
  }
}

// Usage
class PlantCard extends LitElement {
  @consume({ context: storeContext })
  private store!: GrowspaceStore;

  // Auto-subscribes on connect, auto-unsubscribes on disconnect
  private eventController = new EventBusController(
    this,
    this.store.eventBus,
    'plant:updated',
    (payload) => this._handlePlantUpdate(payload)
  );
}
```

### 4. Store Initialization & Cleanup

**Proper Store Lifecycle**

```typescript
// growspace-manager-card.ts (simplified)
export class GrowspaceManagerCard extends LitElement {
  @provide({ context: storeContext })
  store = new GrowspaceStore();

  connectedCallback() {
    super.connectedCallback();
    // Initialize store subscriptions
    this.store.initialize(this.hass);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Cleanup all subscriptions
    this.store.destroy();
  }

  updated(changedProps: PropertyValues) {
    if (changedProps.has('hass')) {
      this.store.updateHass(this.hass);
    }
  }
}

// Store manages all subscriptions
export class GrowspaceStore {
  public initialize(hass: HomeAssistant) {
    this.hass = hass;
    this.history.initialize(hass);
    this.data.initialize(hass);
    // Start any background tasks
  }

  public destroy() {
    this.history.destroy();
    this.data.destroy();
    this.eventBus.handlers.clear();
  }
}
```

### Benefits

1. **Zero subscription management in components** - Controllers handle it
2. **Centralized event handling** - History store manages WebSocket
3. **Reusable controllers** - Polling, focus, event bus patterns
4. **Automatic cleanup** - Controllers clean up on disconnect
5. **Event bus for cross-cutting concerns** - No prop drilling
6. **Single source of truth** - Store holds event data, components just read

---

## Part 6: Migration Strategy

### Problem

Cannot rewrite ~19K lines of code, 55 components at once while maintaining stability.

### Solution

Phased migration with clear boundaries, allowing old and new patterns to coexist.

### Phase 1: Foundation (Week 1-2)

**Create Infrastructure (No Breaking Changes)**

1. **New Directory Structure** (parallel to existing)

```
src/
  features/           # NEW - gradually move here
    shared/
      ui/            # Generic presentational components
      layouts/       # Dialog layouts
      controllers/   # Reactive controllers
      commands/      # Command infrastructure

  components/        # OLD - keep as-is during migration
  dialogs/           # OLD - keep as-is
  store/            # OLD - keep as-is
```

2. **Build Core Infrastructure**
   - `shared/commands/command.ts` - Command pattern
   - `shared/layouts/base-dialog.layout.ts` - Reusable dialog shell
   - `shared/controllers/` - Polling, EventBus, FocusTrap controllers
   - `shared/events/event-bus.ts` - Event bus system

3. **Enhance Store with New Methods** (no breaking changes)

```typescript
// store/core/growspace-store.ts
export class GrowspaceStore {
  // NEW: Event bus
  public readonly eventBus = new EventBus();

  // NEW: Initialize method
  public initialize(hass: HomeAssistant) {
    this.hass = hass;
    this.history.initialize(hass);
  }

  // KEEP: All existing methods still work
  // Existing code continues to work unchanged
}
```

**Deliverables:**
- Core infrastructure files
- Unit tests for command infrastructure and controllers
- No changes to existing components

**Testing:** Unit tests for command infrastructure, controllers

**Risk:** Low - nothing breaks, just adding new files

---

### Phase 2: Pilot Refactor - Simple Component (Week 2-3)

**Pick ONE simple component to prove the pattern**

**Best Candidate: `plant-card.ts` (320 lines)**

Why?
- Self-contained
- Clear responsibilities
- Used everywhere (high impact)
- Not too complex

**Refactor Steps:**

1. **Create ViewModel**

```typescript
// features/plants/viewmodels/plant-card.viewmodel.ts
export function createPlantCardViewModel(
  plant: PlantEntity,
  store: GrowspaceStore
): ReadableAtom<PlantCardViewModel> {
  // Move all business logic here
}
```

2. **Create Presentational Component**

```typescript
// features/plants/components/plant-card-ui.ts
@customElement('plant-card-ui')
export class PlantCardUI extends LitElement {
  @property() displayData!: PlantDisplayData;
  @property({ type: Boolean }) isSelected = false;
  @property({ type: Boolean }) isDraggable = false;
  // ... only props, no store access
}
```

3. **Create Container**

```typescript
// features/plants/containers/plant-card.container.ts
@customElement('plant-card-container')
export class PlantCardContainer extends LitElement {
  // Wraps plant-card-ui with ViewModel
}
```

4. **Gradual Rollout**

```typescript
// In growspace-grid.ts, add a feature flag
render() {
  const useNewPlantCard = true; // Toggle to test

  return html`
    ${this.plants.map(plant =>
      useNewPlantCard
        ? html`<plant-card-container .plant=${plant}></plant-card-container>`
        : html`<growspace-plant-card .plant=${plant}></growspace-plant-card>`
    )}
  `;
}
```

**Deliverables:**
- PlantCardViewModel with tests
- PlantCardUI presentational component
- PlantCardContainer
- Feature flag for A/B testing

**Testing:**
- Unit test ViewModel
- Playwright test comparing old vs new behavior
- Test with feature flag on/off

**Risk:** Medium - Can quickly rollback with feature flag

---

### Phase 3: Pilot Refactor - Complex Dialog (Week 3-5)

**Pick ONE dialog: `add-plant-dialog.ts` (560 lines)**

Why?
- Medium complexity (not the 1700-line monsters)
- Clear structure (form + validation)
- Frequently used

**Refactor Steps:**

1. **Create ViewModel**

```typescript
// features/plants/viewmodels/add-plant-dialog.viewmodel.ts
export function createAddPlantDialogViewModel(
  store: GrowspaceStore
): ReadableAtom<AddPlantDialogViewModel> {
  // All form state, validation, available strains
}
```

2. **Create Presentational Form**

```typescript
// features/plants/components/add-plant-form.ts
@customElement('add-plant-form')
export class AddPlantForm extends LitElement {
  @property() formData!: PlantFormData;
  @property() strains!: StrainEntry[];
  @property() errors!: FormErrors;

  // Emits events: form-change, form-submit
}
```

3. **Create Container using Layout**

```typescript
// features/plants/containers/add-plant-dialog.container.ts
@customElement('add-plant-dialog-container')
export class AddPlantDialogContainer extends LitElement {
  render() {
    return html`
      <base-dialog-layout
        .open=${vm.isOpen}
        .title=${"Add Plant"}
      >
        <add-plant-form
          .formData=${vm.formData}
          .strains=${vm.strains}
          @form-submit=${this._handleSubmit}
        ></add-plant-form>

        <div slot="actions">
          <mwc-button @click=${this._handleSave}>Add Plant</mwc-button>
        </div>
      </base-dialog-layout>
    `;
  }

  private async _handleSave() {
    await this.store.actions.plants.addPlant(vm.formData);
  }
}
```

4. **Update DialogHost**

```typescript
// components/manager/dialog-host.ts
render() {
  // Add new dialog alongside old ones
  if (dialog.type === 'ADD_PLANT') {
    return useNewDialogs
      ? html`<add-plant-dialog-container></add-plant-dialog-container>`
      : html`<add-plant-dialog .dialog=${dialog}></add-plant-dialog>`;
  }
}
```

**Deliverables:**
- AddPlantDialogViewModel with validation tests
- AddPlantForm presentational component
- AddPlantDialogContainer
- Feature flag integration

**Testing:**
- Unit test ViewModel validation logic
- Integration test form submission
- Playwright visual regression tests

**Risk:** Medium - Feature flag allows rollback

---

### Phase 4: Batch Refactor Remaining Components (Week 5-10)

**Priority Order:**

**Tier 1 (High Value, Medium Complexity) - Week 5-7**
- `growspace-grid.ts` (639 lines)
- `growspace-header.ts` + sub-headers (1200+ lines combined)
- Remaining simple dialogs (watering, training, etc.)

**Tier 2 (Complex Dialogs) - Week 7-9**
- `plant-overview-dialog.ts` (1317 lines)
- `irrigation-dialog.ts` (1093 lines)
- `config-dialog.ts` (1366 lines)

**Tier 3 (Specialized Components) - Week 9-10**
- `heatmap-3d.ts` (1206 lines)
- `strain-library-dialog.ts` (1727 lines)
- Timeline/logbook components

**Strategy per Component:**
1. Create ViewModel
2. Extract presentational pieces
3. Create container
4. Feature flag rollout
5. Monitor in production
6. Remove old version after 1-2 weeks

---

### Phase 5: Cleanup & Optimization (Week 10-12)

**Remove Old Code**
- Delete old component versions
- Remove feature flags
- Move files from `src/components/` to `src/features/`
- Update all imports

**Performance Optimization**
- Audit ViewModel computed dependencies
- Add memoization where needed
- Lazy-load heavy features (3D heatmap, etc.)

**Documentation**
- Document architecture patterns
- Create component guidelines
- Add Storybook examples (if applicable)

---

### Coexistence Strategy

**Key Principle: Old and new can coexist safely**

```typescript
// Example: New container wrapping old component temporarily
@customElement('plant-overview-dialog-container')
export class PlantOverviewDialogContainer extends LitElement {
  render() {
    const vm = this.viewModelController.value;

    // During migration: Use old component with new ViewModel data
    return html`
      <plant-overview-dialog
        .plant=${vm.plant}
        .growspaceOptions=${vm.growspaceOptions}
        .editedAttributes=${vm.editedData}
        @update=${this._handleUpdate}
      ></plant-overview-dialog>
    `;
  }

  private _handleUpdate(e: CustomEvent) {
    // Adapter: Convert old event to new action
    this.store.actions.plants.updatePlant(this.plantId, e.detail);
  }
}
```

**Benefits:**
- Migrate business logic first (ViewModel)
- Refactor UI later
- Incremental value delivery

---

### Risk Mitigation

**Feature Flags**

```typescript
// shared/config/feature-flags.ts
export const FEATURE_FLAGS = {
  USE_NEW_PLANT_CARD: true,
  USE_NEW_DIALOGS: false,
  USE_EVENT_BUS: true,
} as const;

// Usage
import { FEATURE_FLAGS } from '@/shared/config/feature-flags';

if (FEATURE_FLAGS.USE_NEW_PLANT_CARD) {
  // New implementation
} else {
  // Old implementation
}
```

**Automated Testing**
- Unit tests for ViewModels (100% coverage target)
- Integration tests for actions/commands
- Playwright E2E tests (critical user flows)
- Visual regression tests (Percy/Chromatic if available)

**Gradual Rollout**
- Test in dev environment (1 week)
- Beta users (2 weeks)
- Full rollout
- Monitor error rates

**Rollback Plan**
- Feature flags allow instant rollback
- Keep old code for 2-4 weeks after migration
- Database/API unchanged (no backend migration needed)

---

### Success Metrics

**Code Quality:**
- Average component size: 320 lines → <200 lines (target)
- Max component size: 1727 lines → <400 lines (target)
- Test coverage: Current unknown → 90%+ (target)

**Maintainability:**
- Time to add new feature: Measure before/after
- Time to fix bugs: Measure before/after
- Onboarding new developer: Easier with clear patterns

**Performance:**
- Re-render count: Measure with Lit DevTools
- Memory usage: Monitor store size
- Bundle size: Code-split by feature

---

## Architecture Summary

### Before

- 55 components doing everything
- Business logic scattered across components
- Hard to test, hard to change
- Subscriptions managed in every component
- Inconsistent error handling

### After

**Component Types:**
- **Presentational Components**: Dumb, reusable UI (~150 lines each)
- **Containers**: Connect UI to ViewModels (~100 lines each)
- **ViewModels**: Computed state from stores (~100 lines each)
- **Actions**: Pure business logic functions (~50 lines each)
- **Store**: State + subscriptions centralized

**Architecture Flow:**

```
User Action
  ↓
Container dispatches Action
  ↓
Action executes (updates API + Store)
  ↓
Store atoms update
  ↓
ViewModel recomputes
  ↓
Container re-renders
  ↓
Presentational component updates
```

**Key Principles:**
1. **Separation of Concerns** - Each layer has one job
2. **Unidirectional Data Flow** - Data flows down, events flow up
3. **Single Source of Truth** - Store holds all state
4. **Testability** - Pure functions, easy to mock
5. **Incremental Migration** - Old and new coexist safely

---

## Next Steps

1. Review and approve design
2. Create implementation plan with detailed tasks
3. Set up project tracking (GitHub issues/project board)
4. Begin Phase 1: Foundation infrastructure
5. Weekly check-ins to monitor progress

---

**Document Status:** Design Approved - Ready for Implementation Planning
