import { GrowspaceUIStore } from '../ui/ui-store';
import type { GridSliceRef } from '../../slices/grid';

export interface ActionContext {
  ui: GrowspaceUIStore;
  grid: GridSliceRef;
  closeDialog: () => void;
  refreshData: (force?: boolean) => Promise<void>;
}
