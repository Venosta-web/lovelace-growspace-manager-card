import { DataService } from '../data-service';
import { GrowspaceDataStore } from './data-store';
import { GrowspaceUIStore } from './ui-store';
import { GrowspaceHistoryStore } from './history-store';
import { UndoRedoManager } from '../services/undo-redo-manager';
import { SyncService } from '../services/sync-service';
import { GrowspaceGridStore } from './grid-store';

export interface ActionContext {
    dataService: DataService;
    data: GrowspaceDataStore;
    ui: GrowspaceUIStore;
    history: GrowspaceHistoryStore;
    grid: GrowspaceGridStore;
    undoRedoManager: UndoRedoManager;
    syncService: SyncService;
    hass: any;

    // Helpers
    showToast: (message: string, type: 'info' | 'error' | 'success', action?: { label: string; callback: () => void }) => void;
    closeDialog: () => void;
    refreshData: () => Promise<void>;
}
