import { addStrain as sliceAddStrain, normalizeStrainFormData } from '../../slices/strain';
import { openCropSteeringDialog } from '../../slices/ui';
import * as libraryActions from '../plant/library-actions';
import * as keyboardActions from '../system/keyboard-actions';
import { ActionContext } from './action-context';
import { ViewMode } from '../../constants';
import type { GrowspaceHistoryStore } from '../history/history-store';

interface IGrowspaceStore {
  context: ActionContext;
  history: GrowspaceHistoryStore;
  refreshData(): void;
}

export class ActionDispatcher {
  constructor(private store: IGrowspaceStore) { }

  private get ctx(): ActionContext {
    return this.store.context;
  }

  // The dialog/selection orchestration that used to live here moved into
  // `slices/ui` (ADR-0001); the entire plant write surface now lives on the
  // Plant slice (callers invoke its mutators directly). What remains delegates
  // to OTHER domains still on the legacy stack — keyboard (system) — plus the
  // env-graph toggle bound to the per-card history store. These follow in the
  // keyboard and history migration steps.
  public readonly ui = {
    handleKeyboardNavigation: (key: string) =>
      keyboardActions.handleKeyboardNavigation(this.ctx, key),
    toggleEnvGraph: (metric: string) => {
      if (metric === 'crop_steering') {
        const gsId = this.ctx.grid.$selectedDevice.get();
        if (gsId) openCropSteeringDialog(gsId);
        return;
      }
      if (!this.store.history) return;
      const isNowActive = this.store.history.toggleEnvGraph(metric);
      if (isNowActive && this.ctx.ui.$viewMode.get() === ViewMode.HEADER) {
        this.ctx.ui.setViewMode(ViewMode.STANDARD);
      }
    },
  };

  public readonly library = {
    fetchStrains: (force = false) => libraryActions.fetchStrainLibrary(this.ctx, force),
    fetchNutrientPresets: (force = false) => libraryActions.fetchNutrientPresets(this.ctx, force),
    fetchIPMPresets: (force = false) => libraryActions.fetchIPMPresets(this.ctx, force),
    fetchNutrientInventory: (force = false) =>
      libraryActions.fetchNutrientInventory(this.ctx, force),
    updateNutrientStock: (id: string, name: string, currentMl: number, initialMl: number) =>
      libraryActions.updateNutrientStock(this.ctx, id, name, currentMl, initialMl),
    removeNutrientStock: (id: string) => libraryActions.removeNutrientStock(this.ctx, id),
    fetchECRampCurves: (force = false) => libraryActions.fetchECRampCurves(this.ctx, force),
    saveECRampCurve: (data: Parameters<typeof libraryActions.saveECRampCurve>[1]) =>
      libraryActions.saveECRampCurve(this.ctx, data),
    removeECRampCurve: (id: string) => libraryActions.removeECRampCurve(this.ctx, id),
    import: async (file: File, _replace: boolean) => {
      try {
        const content = await file.text();
        const strains = JSON.parse(content);
        if (!Array.isArray(strains)) throw new Error('Invalid format');
        for (const strain of strains) {
          if (!strain?.strain) continue;
          await sliceAddStrain(normalizeStrainFormData(strain));
        }
        this.ctx.ui.showToast('Library imported successfully', 'success');
        await libraryActions.fetchStrainLibrary(this.ctx, true);
      } catch (e: unknown) {
        const error = e instanceof Error ? e.message : 'Unknown error';
        console.error('Import failed', e);
        this.ctx.ui.showToast('Import failed: ' + error, 'error');
      }
    },
  };
}
