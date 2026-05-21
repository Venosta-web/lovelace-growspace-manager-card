import type { DataService } from '../../services/data-service';
import { GrowspaceDataStore } from './data-store';
import { GrowspaceUIStore } from '../ui/ui-store';
import { UndoRedoManager } from '../../services/undo-redo-manager';
import { GrowspaceGridStore } from '../grid/grid-store';
import { OptimisticManager } from '../system/optimistic-manager';

export interface ActionContext {
  dataService: DataService;
  data: GrowspaceDataStore;
  ui: GrowspaceUIStore;
  grid: GrowspaceGridStore;
  undoRedoManager: UndoRedoManager;
  optimisticManager: OptimisticManager;
  closeDialog: () => void;
  refreshData: (force?: boolean) => Promise<void>;
}
