import type { DataService } from '../../services/data-service';
import { GrowspaceUIStore } from '../ui/ui-store';
import { UndoRedoManager } from '../../services/undo-redo-manager';
import type { GridSliceRef } from '../../slices/grid';
import { OptimisticManager } from '../system/optimistic-manager';

export interface ActionContext {
  dataService: DataService;
  ui: GrowspaceUIStore;
  grid: GridSliceRef;
  undoRedoManager: UndoRedoManager;
  optimisticManager: OptimisticManager;
  closeDialog: () => void;
  refreshData: (force?: boolean) => Promise<void>;
}
