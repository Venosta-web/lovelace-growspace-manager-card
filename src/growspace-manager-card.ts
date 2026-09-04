import { LitElement, html, CSSResultGroup, TemplateResult, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { provide } from '@lit/context';

import { hassContext, configContext, strainLibraryContext, storeContext } from './lib/context';
import { HomeAssistant, LovelaceCard, LovelaceCardEditor } from 'custom-card-helpers';
import { setHass } from './services/hass-call';
import { fetchAiStatus } from './slices/ai-insight';
import { setMutateListener, undo, canUndo } from './services/mutate';
import * as uiSlice from './slices/ui';
import { fetchStrainLibrary } from './slices/strain';
import { fetchNutrientPresets, fetchIPMPresets, fetchNutrientInventory } from './slices/nutrient';

import type { GrowspaceManagerCardConfig } from './lib/types/config';
import type { StrainEntry } from './features/plants/types';

import './growspace-env-chart';
import type { GrowspaceDialogHost } from './features/ui/containers/growspace-dialog-host.container';
import './features/ui/components/growspace-edit-mode-banner-ui';
import './features/ui/containers/growspace-header.container';
import './features/ui/containers/growspace-toast.container';

import { LibraryExportReadyEvent } from './lib/events';
import './features/shared/layouts/growspace-view-switcher';
import './features/shared/ui'; // Register MD3 components
import './features/shared/ui/error-boundary';
import { sharedStyles } from './styles/shared.styles';
import { uiStyles } from './styles/ui.styles';
import { growspaceCardStyles } from './styles/growspace-card.styles';
import { variables } from './styles/variables';
import { GrowspaceStore } from './store/core/growspace-store';
import { growspaceStoreRegistry } from './store/core/growspace-store-registry';
import { BootstrapController } from './controllers/bootstrap.controller';
import { StoreController } from '@nanostores/lit';
import { startTransplant, completeTransplant, gridInteraction$ } from './slices/grid-interaction';
import { handleKeyboardNavigation, deleteSelectedPlants } from './lib/keyboard-navigation';
import { commitPlantLayout } from './features/tasks/arrangement-service';
import { gridFromLayout, layoutsEqual } from './features/tasks/task-state';
import {
  ComparisonConflictError,
  ComparisonConstraintError,
} from './store/comparisons/metric-comparison-store';
import { WSError } from './services/errors';
import { LAZY_CHUNKS, LazyChunk, loadLazyChunk } from './lib/lazy-chunk';
import { lazyChunkErrorEditor } from './features/shared/ui/lazy-chunk-error';
import { localizeWithParams } from './localize/localize';

@customElement('growspace-manager-card')
export class GrowspaceManagerCard extends LitElement implements LovelaceCard {
  private _sharedStore = growspaceStoreRegistry.acquire();

  @provide({ context: storeContext })
  store = new GrowspaceStore(this._sharedStore);

  private _dialogPortal: GrowspaceDialogHost | null = null;
  private _dialogHostModule?: Promise<
    typeof import('./features/ui/containers/growspace-dialog-host.container') | null
  >;
  private _dialogUnsubscribe?: () => void;
  @state() private _missingChunk: LazyChunk | null = null;
  private _viewModeInitialized = false;
  private _bootstrapCtrl!: BootstrapController;

  protected _viewController = new StoreController(this, this.store.$mainCardState);

  get selectedDevice() {
    return this._viewController.value.grid.selectedDevice;
  }

  @provide({ context: strainLibraryContext })
  @state()
  _strainLibrary: StrainEntry[] = [];

  get devices() {
    return this._viewController.value.grid.devices;
  }

  @provide({ context: hassContext })
  @property({ attribute: false })
  hass!: HomeAssistant;

  @provide({ context: configContext })
  @property({ attribute: false })
  _config!: GrowspaceManagerCardConfig;

  static styles: CSSResultGroup = [variables, sharedStyles, uiStyles, growspaceCardStyles];

  protected firstUpdated() {
    if (this.hass) {
      setHass(this.hass);
      this.store.updateHass(this.hass);
      this._bootstrapCtrl
        ?.updateHass(this.hass)
        .catch((err: unknown) => console.error('[bootstrap updateHass failed]', err));
      fetchAiStatus();
    }
    void fetchStrainLibrary({ cache: true });
    void fetchNutrientPresets({ cache: true });
    void fetchIPMPresets({ cache: true });
    void fetchNutrientInventory({ cache: true });

    // Check for deep link
    this._checkDeepLink();
  }

  private _checkDeepLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const plantId = urlParams.get('plantId');

    // Use a global tracker to prevent multiple instances from processing the same deep link
    const globalTracker = (window as any).GROWSPACE_DEEP_LINK_TRACKED;

    if (plantId && globalTracker !== plantId) {
      (window as any).GROWSPACE_DEEP_LINK_TRACKED = plantId;
      console.log('[GrowspaceCard] Deep link detected for plant:', plantId);

      // Cleanup URL immediately to prevent other instances from picking it up
      const url = new URL(window.location.href);
      url.searchParams.delete('plantId');
      window.history.replaceState({}, '', url.toString());

      uiSlice.handleDeepLink(plantId);
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener(LibraryExportReadyEvent.TYPE, this._handleLibraryExportReady);
    window.addEventListener('keydown', this._handleGlobalKeydown);
    setMutateListener((info, growspaceId) => {
      const label = info.label ?? info.type;
      this.store.ui.showToast(`${label}`, 'success', {
        label: 'Undo',
        callback: () => {
          undo(growspaceId)
            .then(() => {
              this.store.ui.showToast('Action undone', 'info');
            })
            .catch((err: unknown) => console.error('[Undo failed]', err));
        },
      });
    });
    this._dialogUnsubscribe ??= this.store.ui.$activeDialog.subscribe((active) => {
      if (active.type !== 'NONE') void this._ensureDialogPortal();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener(LibraryExportReadyEvent.TYPE, this._handleLibraryExportReady);
    window.removeEventListener('keydown', this._handleGlobalKeydown);
    setMutateListener(null);
    this._dialogUnsubscribe?.();
    this._dialogUnsubscribe = undefined;
    if (this._dialogPortal) {
      this._dialogPortal.remove();
      this._dialogPortal = null;
    }
    this.store.destroy();
    growspaceStoreRegistry.release();
  }

  private async _ensureDialogPortal(): Promise<void> {
    const dialogHost = await (this._dialogHostModule ??= loadLazyChunk(
      LAZY_CHUNKS.dialogHost,
      () => import('./features/ui/containers/growspace-dialog-host.container')
    ));
    // Without the chunk there is no dialog to open, so the card itself carries
    // the message — otherwise every dialog trigger is a click that does nothing.
    // Close the dialog the store believes it opened; nothing will ever render it.
    if (!dialogHost) {
      this._missingChunk = LAZY_CHUNKS.dialogHost;
      this.store.ui.closeDialog();
      return;
    }
    if (!this.isConnected) return;

    // Current Home Assistant form controls consume internal Lit contexts
    // instead of reading a `.hass` property. Keep the portal below HA's root
    // context provider; a body-level sibling leaves those controls without
    // states, registries, config, or internationalization data.
    const host = document.querySelector('home-assistant')?.shadowRoot ?? document.body;

    if (this._dialogPortal) {
      // A cached chunk resolves within a microtask of the card mounting, which
      // can be before Home Assistant's own root exists — that would strand the
      // portal on <body> for the life of the card. Re-home it once it is there.
      if (this._dialogPortal.parentNode !== host) host.appendChild(this._dialogPortal);
      return;
    }

    const portal = document.createElement('growspace-dialog-host') as GrowspaceDialogHost;
    portal.store = this.store;
    if (this.hass) portal.hass = this.hass;
    if (this._config) portal.config = this._config;
    host.appendChild(portal);
    this._dialogPortal = portal;
  }

  private _handleLibraryExportReady = (e: LibraryExportReadyEvent) => {
    this._downloadFile(e.detail.url);
  };

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (changedProps.has('hass')) {
      setHass(this.hass);
      this.store.updateHass(this.hass);
      this._bootstrapCtrl
        ?.updateHass(this.hass)
        .catch((err: unknown) => console.error('[bootstrap updateHass failed]', err));
      if (this._dialogPortal) {
        this._dialogPortal.hass = this.hass;
      }

      // Re-check for pending deep link when hass (and thus devices) updates
      const pendingId = this.store.ui.$pendingDeepLinkPlantId.get();
      if (pendingId) {
        uiSlice.handleDeepLink(pendingId);
      }
    }

    if (this._dialogPortal && (changedProps.has('hass') || changedProps.has('_config'))) {
      this._dialogPortal.config = this._config;
    }

    // Sync strain library to context provider
    const currentStrainLibrary = this._viewController.value?.strainLibrary;
    if (currentStrainLibrary !== this._strainLibrary) {
      this._strainLibrary = (currentStrainLibrary || []) as StrainEntry[];
    }

    const task = this.store.ui.$taskState?.get?.() ?? { kind: 'idle' };
    const selected = this.devices?.find((device) => device.deviceId === this.selectedDevice);
    if (
      task.kind === 'arrange' &&
      task.status === 'editing' &&
      selected?.layoutRevision !== undefined &&
      selected.layoutRevision !== task.expectedLayoutRevision
    ) {
      const message = localizeWithParams('tasks.layout_stale', {}, this.store.ui.$language.get());
      this.store.ui.setArrangementStatus('stale', message);
      this.store.ui.announce(message);
    }
  }

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    // path must match where the editor JS is served relative to the card script
    const editor = await loadLazyChunk(
      LAZY_CHUNKS.managerCardEditor,
      () => import('./growspace-manager-card-editor.js')
    );
    if (!editor) {
      return lazyChunkErrorEditor(LAZY_CHUNKS.managerCardEditor) as unknown as LovelaceCardEditor;
    }
    const el = document.createElement(
      'growspace-manager-card-editor'
    ) as unknown as LovelaceCardEditor;
    return el;
  }

  public static getStubConfig() {
    return {
      default_growspace: '',
    };
  }

  public setConfig(config: GrowspaceManagerCardConfig): void {
    if (!config) throw new Error('Invalid configuration');
    this._config = config;
    if (!this._viewModeInitialized && this._config.initial_view_mode) {
      this.store.ui.setViewMode(this._config.initial_view_mode);
      this._viewModeInitialized = true;
    }

    this._syncBootstrap();
  }

  /**
   * Create the BootstrapController on first config, or push config changes into
   * it. Driven from both setConfig (the HA path) and willUpdate (the carousel
   * sets `_config` directly, bypassing setConfig) so device hydration and
   * auto-selection happen however the config arrives. Idempotent.
   */
  private _syncBootstrap(): void {
    if (!this._config) return;
    if (!this._bootstrapCtrl) {
      this._bootstrapCtrl = new BootstrapController(this, this.store.grid, this._config);
      this.store.setRefreshCallback(() => this._bootstrapCtrl.refresh());
    } else {
      this._bootstrapCtrl.setCardConfig(this._config);
    }
  }

  protected willUpdate(changedProps: PropertyValues): void {
    // The carousel card sets `._config` directly instead of calling setConfig,
    // so wire the BootstrapController off the reactive property change too.
    // willUpdate runs before firstUpdated, so the controller exists in time for
    // firstUpdated's updateHass to drive the initial hydrate + auto-select.
    if (changedProps.has('_config')) {
      this._syncBootstrap();
    }
  }

  public getCardSize(): number {
    return 4;
  }

  public getLayoutOptions() {
    return {
      grid_columns: 12,
      grid_min_columns: 6,
      grid_min_rows: 4,
    };
  }

  // Event handlers
  private _handleKeyboardNav(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      const task = this.store.ui.$taskState?.get?.() ?? { kind: 'idle' };
      if (task.kind !== 'idle') {
        if ((task.kind === 'arrange' || task.kind === 'compare') && task.status === 'saving') {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        this._handleTaskCancel();
        return;
      }
    }
    handleKeyboardNavigation(e.key, this.store);
  }

  private _handleGlobalKeydown = (e: KeyboardEvent) => {
    const isUndo = (e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey;
    if (!isUndo) return;
    const growspaceId = this.store.grid.$selectedDevice.get();
    if (!growspaceId || !canUndo(growspaceId)) return;
    e.preventDefault();
    undo(growspaceId)
      .then(() => {
        this.store.ui.showToast('Action undone', 'info');
      })
      .catch((err: unknown) => console.error('[Undo failed]', err));
  };

  private _downloadFile(url: string) {
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = url.split('/').pop() || 'export.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  private _handleViewModeChanged(e: CustomEvent) {
    this.store.ui.setViewMode(e.detail.mode);
  }

  private _handleGrowspaceChanged(e: CustomEvent) {
    this.store.handleDeviceChange(e.detail);
  }

  private _handleSelectAll() {
    this.store.selectAllPlantsInSelectedDevice();
  }

  private _handleClearSelection() {
    this.store.ui.clearPlantSelection();
  }

  private _handleWaterSelected() {
    this.store.ui.openBatchWateringDialog();
  }

  private _handleExitEditMode() {
    if ((this.store.ui.$taskState?.get?.() ?? { kind: 'idle' }).kind === 'select_plants') {
      this._handleTaskCancel();
    } else this.store.ui.setEditMode(false);
  }

  private _handleTaskCancel = (): void => {
    const task = this.store.ui.$taskState?.get?.() ?? { kind: 'idle' };
    if ((task.kind === 'arrange' || task.kind === 'compare') && task.status === 'saving') {
      return;
    }
    const kind = this.store.ui.exitTask(false);
    if (kind) void this.updateComplete.then(() => this._focusTaskLauncher());
  };

  private _handleTaskDone = async (): Promise<void> => {
    const task = this.store.ui.$taskState?.get?.() ?? { kind: 'idle' };
    if (task.kind === 'select_plants') {
      this.store.ui.exitTask(true);
      await this.updateComplete;
      this._focusTaskLauncher();
      return;
    }
    if (task.kind === 'compare') {
      if (task.status !== 'editing') return;
      if (task.draftMetrics.length === 0 && task.comparisonId === null) {
        this.store.ui.exitTask(true);
      } else if (
        task.comparisonId !== null &&
        [...task.draftMetrics].sort().join('\0') === [...task.originalMetrics].sort().join('\0')
      ) {
        this.store.history.activateEnvGraphs(task.draftMetrics);
        this.store.ui.exitTask(true);
      } else if (task.draftMetrics.length < 2 || task.draftMetrics.length > 4) {
        const message = localizeWithParams(
          'tasks.comparison_limit',
          {},
          this.store.ui.$language.get()
        );
        this.store.ui.setCompareError(message);
        this.store.ui.announce(message);
        return;
      } else {
        this.store.ui.setCompareStatus('saving');
        this.store.ui.announce(
          localizeWithParams('tasks.comparison_saving', {}, this.store.ui.$language.get())
        );
        try {
          await this.store.comparisons.save(
            task.comparisonId,
            task.draftMetrics,
            task.expectedRecordRevision,
            task.originalMetrics
          );
          this.store.history.activateEnvGraphs(task.draftMetrics);
          this.store.ui.exitTask(true);
          this.store.ui.announce(
            localizeWithParams('tasks.comparison_saved', {}, this.store.ui.$language.get())
          );
        } catch (error) {
          const message =
            error instanceof ComparisonConflictError
              ? localizeWithParams('tasks.comparison_conflict', {}, this.store.ui.$language.get())
              : error instanceof ComparisonConstraintError
                ? localizeWithParams(
                    error.constraint === 'claimed'
                      ? 'tasks.comparison_claimed'
                      : 'tasks.comparison_limit',
                    {},
                    this.store.ui.$language.get()
                  )
                : localizeWithParams(
                    'tasks.comparison_save_failed',
                    {},
                    this.store.ui.$language.get()
                  );
          this.store.comparisons.reload();
          this.store.ui.setCompareStatus('editing', message);
          this.store.ui.announce(message);
          return;
        }
      }
      await this.updateComplete;
      this._focusTaskLauncher();
      return;
    }
    if (task.kind !== 'arrange' || task.status !== 'editing') return;
    if (layoutsEqual(task.original, task.draft)) {
      this.store.ui.exitTask(true);
      this.store.ui.announce(
        localizeWithParams('tasks.layout_unchanged', {}, this.store.ui.$language.get())
      );
      await this.updateComplete;
      this._focusTaskLauncher();
      return;
    }
    const growspaceId = this.store.grid.$selectedDevice.get();
    if (!growspaceId) return;
    this.store.ui.setArrangementStatus('saving');
    this.store.ui.announce(
      localizeWithParams('tasks.saving_layout', {}, this.store.ui.$language.get())
    );
    try {
      await commitPlantLayout(growspaceId, task.expectedLayoutRevision, task.draft);
      await this.store.refreshData(true);
      this.store.ui.exitTask(true);
      this.store.ui.announce(
        localizeWithParams('tasks.layout_saved', {}, this.store.ui.$language.get())
      );
      await this.updateComplete;
      this._focusTaskLauncher();
    } catch (error) {
      const conflict = error instanceof WSError && error.code === 'conflict';
      const message = localizeWithParams(
        conflict ? 'tasks.layout_stale' : 'tasks.layout_save_failed',
        {},
        this.store.ui.$language.get()
      );
      this.store.ui.setArrangementStatus(conflict ? 'stale' : 'editing', message);
      this.store.ui.announce(message);
    }
  };

  private _handleDeleteComparison = async (event: CustomEvent<{ id: string }>): Promise<void> => {
    const task = this.store.ui.$taskState?.get?.() ?? { kind: 'idle' };
    if (task.kind !== 'compare' || task.status !== 'editing') return;
    this.store.ui.setCompareStatus('saving');
    this.store.ui.announce(
      localizeWithParams('tasks.comparison_deleting', {}, this.store.ui.$language.get())
    );
    try {
      await this.store.comparisons.delete(event.detail.id, task.expectedRecordRevision);
      const revision = this.store.comparisons.$state.get().recordRevision;
      if (task.comparisonId === event.detail.id) {
        this.store.ui.beginComparisonEdit(null, [], revision);
      } else {
        this.store.ui.updateCompareRevision(revision);
      }
      this.store.ui.setCompareStatus('editing');
      this.store.ui.announce(
        localizeWithParams('tasks.comparison_deleted', {}, this.store.ui.$language.get())
      );
    } catch (error) {
      const message =
        error instanceof ComparisonConflictError
          ? localizeWithParams('tasks.comparison_conflict', {}, this.store.ui.$language.get())
          : localizeWithParams('tasks.comparison_delete_failed', {}, this.store.ui.$language.get());
      this.store.comparisons.reload();
      this.store.ui.setCompareStatus('editing', message);
      this.store.ui.announce(message);
    }
  };

  private _handleReloadLayout = async (): Promise<void> => {
    const task = this.store.ui.$taskState?.get?.() ?? { kind: 'idle' };
    if (task.kind !== 'arrange' || task.status === 'saving') return;
    this.store.ui.exitTask(false);
    await this.store.refreshData(true);
    const device = this.devices.find((candidate) => candidate.deviceId === this.selectedDevice);
    if (device?.capabilities?.atomicPlantLayout) {
      this.store.ui.startArrange(device.plants, device.layoutRevision ?? 0);
    }
  };

  private _focusTaskLauncher(): void {
    const visit = (root: ShadowRoot | HTMLElement): HTMLButtonElement | null => {
      const trigger = root.querySelector<HTMLButtonElement>('#menu-trigger');
      if (trigger) return trigger;
      for (const element of root.querySelectorAll<HTMLElement>('*')) {
        if (element.shadowRoot) {
          const nested = visit(element.shadowRoot);
          if (nested) return nested;
        }
      }
      return null;
    };
    if (this.shadowRoot) visit(this.shadowRoot)?.focus();
  }

  private _handleIPMSelected() {
    uiSlice.openIPMDialog({ growspaceId: this.store.grid.$selectedDevice.get() ?? undefined });
  }

  private _handleToggleExpansion() {
    this.store.ui.toggleHeaderExpansion();
  }

  private _handleTrainingSelected() {
    this.store.ui.openBatchTrainingDialog();
  }

  private _handleBatchAddPlants() {
    this.store.ui.setActiveDialog({
      type: 'ADD_PLANTS',
      payload: { growspaceId: this.store.grid.$selectedDevice.get() ?? undefined },
    });
  }

  private _handlePrintLabelsSelected() {
    this.store.ui.openBatchPrintLabelsDialog();
  }

  private _handleCloneSelected() {
    this.store.ui.openBatchCloneDialog();
  }

  private _handleDeleteSelected = () => {
    deleteSelectedPlants(this.store);
  };

  private _handleTransplantMode = () => {
    if (gridInteraction$.get().status === 'transplanting') {
      completeTransplant();
      this.store.ui.setEditMode(true);
    } else {
      this.store.ui.setEditMode(false);
      startTransplant();
    }
  };

  protected render(): TemplateResult {
    if (!this.hass) {
      return html`<ha-card><div class="error">Home Assistant not available</div></ha-card>`;
    }

    const { devices, selectedDevice, growspaceOptions, gridLayout } =
      this._viewController.value.grid;
    const { effectiveRows, grid } = gridLayout;

    if (this._viewController.value.ui.isLoading) {
      return html`
        <ha-card>
          <div class="loading-container">
            <ha-circular-progress active></ha-circular-progress>
          </div>
        </ha-card>
      `;
    }

    if (!devices.length) {
      return html`<ha-card><div class="no-data">No growspace devices found.</div></ha-card>`;
    }

    const selectedDeviceData = devices.find((d) => d.deviceId === selectedDevice);
    if (!selectedDeviceData) {
      return html`<ha-card><div class="error">No valid growspace selected.</div></ha-card>`;
    }

    const isWide = selectedDeviceData.plantsPerRow > 7;
    const taskState = this._viewController.value.ui.taskState ?? { kind: 'idle' };
    const renderedGrid =
      taskState.kind === 'arrange'
        ? gridFromLayout(
            selectedDeviceData.plants,
            effectiveRows,
            selectedDeviceData.plantsPerRow,
            taskState.draft
          )
        : grid;

    return html`
      <error-boundary
        .fallbackMessage=${'Failed to load Growspace Manager'}
        .onError=${this._handleError}
      >
        <ha-card class=${isWide ? 'wide-growspace' : ''}>
          <div class="sr-only-announcer" aria-live="polite" aria-atomic="true">
            ${this._viewController.value.ui.announcement?.message ?? ''}
          </div>
          <growspace-lazy-chunk-error .chunk=${this._missingChunk}></growspace-lazy-chunk-error>
          <div
            class="unified-growspace-card glass-surface glass-panel"
            role="region"
            aria-label="Growspace: ${selectedDeviceData.name}"
            tabindex="0"
            @keydown=${this._handleKeyboardNav}
            @view-mode-changed=${this._handleViewModeChanged}
            @growspace-changed=${this._handleGrowspaceChanged}
            @toggle-expansion=${this._handleToggleExpansion}
            @select-all=${this._handleSelectAll}
            @clear-selection=${this._handleClearSelection}
            @water-selected=${this._handleWaterSelected}
            @training-selected=${this._handleTrainingSelected}
            @ipm-selected=${this._handleIPMSelected}
            @batch-add-plants=${this._handleBatchAddPlants}
            @print-labels-selected=${this._handlePrintLabelsSelected}
            @clone-selected=${this._handleCloneSelected}
            @delete-selected=${this._handleDeleteSelected}
            @transplant-mode=${this._handleTransplantMode}
            @exit-edit-mode=${this._handleExitEditMode}
            @task-done=${this._handleTaskDone}
            @task-cancel=${this._handleTaskCancel}
            @task-delete-comparison=${this._handleDeleteComparison}
            @task-reload-layout=${this._handleReloadLayout}
          >
            <growspace-view-switcher
              .viewMode=${this._viewController.value.ui.viewMode}
              .hass=${this.hass}
              .device=${selectedDeviceData}
              .growspaceOptions=${growspaceOptions}
              .grid=${renderedGrid}
              .rows=${effectiveRows}
              .isEditMode=${this._viewController.value.ui.isEditMode}
              .isCompact=${this._viewController.value.ui.isCompact}
              .selectedCount=${this._viewController.value.ui.selectedPlants.size}
              .taskState=${taskState}
              .config=${this._config}
              .isLoading=${this._viewController.value.ui.isLoading}
              .focusedPlantIndex=${this._viewController.value.ui.focusedPlantIndex}
            ></growspace-view-switcher>
          </div>
        </ha-card>

        <growspace-toast></growspace-toast>
      </error-boundary>
    `;
  }

  private _handleError = (error: Error, errorInfo: unknown) => {
    // Always log to console
    console.error('Growspace Manager Card caught error:', error, errorInfo);

    // Report to Home Assistant system log
    if (this.hass) {
      this.hass.callService('system_log', 'write', {
        message: `Growspace Manager Card Error: ${error.message}. Info: ${JSON.stringify(errorInfo)}`,
        level: 'error',
        logger: 'lovelace_growspace_manager_card',
      });
    }
  };
}
