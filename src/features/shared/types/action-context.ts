/**
 * Action Context - Provides dependencies to action/command functions
 */

import type { HomeAssistant } from 'custom-card-helpers';
import type { DataService } from '../../../services/data-service';
import type { GrowspaceDataStore } from '../../../store/core/data-store';
import type { GrowspaceUIStore } from '../../../store/ui/ui-store';
import type { GrowspaceHistoryStore } from '../../../store/history/history-store';
import type { GrowspaceGridStore } from '../../../store/grid/grid-store';
import type { UndoRedoManager } from '../../../services/undo-redo-manager';
import type { OptimisticManager } from '../../../store/system/optimistic-manager';
import type { SyncService } from '../../../services/sync-service';

/**
 * Toast notification types
 */
export type ToastType = 'info' | 'error' | 'success' | 'warning';

/**
 * Toast action callback
 */
export interface ToastAction {
  label: string;
  callback: () => void;
}

/**
 * Context provided to all action/command functions
 */
export interface ActionContext {
  // Services
  dataService: DataService;
  hass: HomeAssistant;
  syncService: SyncService;
  undoRedoManager: UndoRedoManager;
  optimisticManager: OptimisticManager;

  // Stores
  data: GrowspaceDataStore;
  ui: GrowspaceUIStore;
  history: GrowspaceHistoryStore;
  grid: GrowspaceGridStore;

  // Helper functions
  showToast(message: string, type: ToastType, action?: ToastAction): void;
  closeDialog(): void;
  refreshData(force?: boolean): Promise<void>;
}
