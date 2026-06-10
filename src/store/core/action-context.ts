import type { DataService } from '../../services/data-service';
import { GrowspaceUIStore } from '../ui/ui-store';
import type { GridSliceRef } from '../../slices/grid';

export interface ActionContext {
  dataService: DataService;
  ui: GrowspaceUIStore;
  grid: GridSliceRef;
  closeDialog: () => void;
  refreshData: (force?: boolean) => Promise<void>;
}
