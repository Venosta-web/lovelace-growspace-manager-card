import type { HomeAssistant } from 'custom-card-helpers';
import { DataService } from '../../data-service';
import { GrowspaceDataStore } from './data-store';
import { GrowspaceUIStore } from '../ui/ui-store';
import { GrowspaceHistoryStore } from '../history/history-store';
import { UndoRedoManager } from '../../services/undo-redo-manager';
import { SyncService } from '../../services/sync-service';
import { GrowspaceGridStore } from '../grid/grid-store';
import { OptimisticManager } from '../system/optimistic-manager';

export interface ActionContext {
  dataService: DataService;
  data: GrowspaceDataStore;
  ui: GrowspaceUIStore;
  history: GrowspaceHistoryStore;
  grid: GrowspaceGridStore;
  undoRedoManager: UndoRedoManager;
  optimisticManager: OptimisticManager;
  syncService: SyncService;
  hass: HomeAssistant;

  // Helpers
  showToast: (
    message: string,
    type: 'info' | 'error' | 'success',
    action?: { label: string; callback: () => void }
  ) => void;
  closeDialog: () => void;
  refreshData: () => Promise<void>;
}
