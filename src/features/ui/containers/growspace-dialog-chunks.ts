import { LAZY_CHUNKS, LazyChunk } from '../../../lib/lazy-chunk';
import type { ActiveDialogState } from '../../../ui-state';

/** Every dialog the host can be asked to open. */
export type DialogType = Exclude<ActiveDialogState['type'], 'NONE'>;

export interface DialogChunk {
  /** The chunk that defines the dialog, and the message if it cannot load. */
  readonly chunk: LazyChunk;
  /** The element the host renders; the dialog is ready once it is defined. */
  readonly tag: string;
  readonly load: () => Promise<unknown>;
}

/**
 * Where each dialog lives.
 *
 * The host used to import every dialog statically, so opening any one of them
 * downloaded all of them — 1.34 MB before minification, for a training log
 * (#969). Each dialog is now reached through its own `import()`, and rollup
 * gives each one a chunk and puts what two of them share in a chunk of its
 * own. A `Record` over the dialog union, so a new dialog type does not compile
 * until it says where its element comes from.
 *
 * Several types may point at one chunk. That is how a family is declared: the
 * label dialogs share the QR encoder, and the nutrient dialogs are one editor
 * rendered four ways.
 */
export const DIALOG_CHUNKS: Record<DialogType, DialogChunk> = {
  ADD_PLANT: {
    chunk: LAZY_CHUNKS.addPlantDialog,
    tag: 'add-plant-dialog',
    load: () => import('../../../dialogs/add-plant-dialog'),
  },
  ADD_PLANTS: {
    chunk: LAZY_CHUNKS.addPlantsDialog,
    tag: 'add-plants-dialog',
    load: () => import('../../../dialogs/add-plants-dialog'),
  },
  PLANT_OVERVIEW: {
    chunk: LAZY_CHUNKS.plantOverview,
    tag: 'plant-overview-container',
    load: () => import('../../plants/containers/plant-overview.container'),
  },
  STRAIN_LIBRARY: {
    chunk: LAZY_CHUNKS.strainLibraryDialog,
    tag: 'strain-library-dialog',
    load: () => import('../../../dialogs/strain-library-dialog'),
  },
  CONFIG: {
    chunk: LAZY_CHUNKS.configDialog,
    tag: 'config-dialog',
    load: () => import('../../../dialogs/config-dialog'),
  },
  GROW_MASTER: {
    chunk: LAZY_CHUNKS.growMasterDialog,
    tag: 'grow-master-dialog',
    load: () => import('../../../dialogs/grow-master-dialog'),
  },
  STRAIN_RECOMMENDATION: {
    chunk: LAZY_CHUNKS.strainRecommendationDialog,
    tag: 'strain-recommendation-dialog',
    load: () => import('../../../dialogs/strain-recommendation-dialog'),
  },
  IRRIGATION: {
    chunk: LAZY_CHUNKS.irrigationDialog,
    tag: 'irrigation-dialog',
    load: () => import('../../../dialogs/irrigation-dialog'),
  },
  LOGBOOK: {
    chunk: LAZY_CHUNKS.logbookDialog,
    tag: 'logbook-dialog',
    load: () => import('../../../dialogs/logbook-dialog'),
  },
  WATERING: {
    chunk: LAZY_CHUNKS.nutrientDialogs,
    tag: 'feed-and-water-dialog',
    load: () => import('../../../dialogs/nutrient-dialogs'),
  },
  NUTRIENTS: {
    chunk: LAZY_CHUNKS.nutrientDialogs,
    tag: 'feed-and-water-dialog',
    load: () => import('../../../dialogs/nutrient-dialogs'),
  },
  NUTRIENT_INVENTORY: {
    chunk: LAZY_CHUNKS.nutrientDialogs,
    tag: 'growspace-nutrient-inventory-dialog-ui',
    load: () => import('../../../dialogs/nutrient-dialogs'),
  },
  NUTRIENT_PRESETS: {
    chunk: LAZY_CHUNKS.nutrientDialogs,
    tag: 'growspace-nutrient-presets-editor',
    load: () => import('../../../dialogs/nutrient-dialogs'),
  },
  IRRIGATION_RECIPES: {
    chunk: LAZY_CHUNKS.recipeLibraryDialog,
    tag: 'recipe-library-dialog',
    load: () => import('../../irrigation/containers/recipe-library-dialog.container'),
  },
  IRRIGATION_PROGRAMS: {
    chunk: LAZY_CHUNKS.programLibraryDialog,
    tag: 'program-library-dialog',
    load: () => import('../../irrigation/containers/program-library-dialog.container'),
  },
  TRAINING: {
    chunk: LAZY_CHUNKS.trainingDialog,
    tag: 'training-dialog',
    load: () => import('../../../dialogs/training-dialog'),
  },
  IPM: {
    chunk: LAZY_CHUNKS.ipmDialog,
    tag: 'growspace-ipm-dialog-ui',
    load: () => import('../components/growspace-ipm-dialog-ui'),
  },
  TAKE_CLONE: {
    chunk: LAZY_CHUNKS.cloneDialog,
    tag: 'clone-dialog',
    load: () => import('../../../dialogs/clone-dialog'),
  },
  BATCH_CLONE: {
    chunk: LAZY_CHUNKS.batchCloneDialog,
    tag: 'batch-clone-dialog',
    load: () => import('../../../dialogs/batch-clone-dialog'),
  },
  HARVEST_SCORING: {
    chunk: LAZY_CHUNKS.harvestScoringDialog,
    tag: 'harvest-scoring-dialog',
    load: () => import('../../../dialogs/harvest-scoring-dialog'),
  },
  SNAPSHOTS: {
    chunk: LAZY_CHUNKS.snapshotsDialog,
    tag: 'snapshots-dialog',
    load: () => import('../../../dialogs/snapshots-dialog'),
  },
  PRINT_LABEL: {
    chunk: LAZY_CHUNKS.labelDialogs,
    tag: 'print-label-dialog',
    load: () => import('../../../dialogs/label-dialogs'),
  },
  BATCH_PRINT_LABELS: {
    chunk: LAZY_CHUNKS.labelDialogs,
    tag: 'batch-print-label-dialog',
    load: () => import('../../../dialogs/label-dialogs'),
  },
  LABEL_TEMPLATES: {
    chunk: LAZY_CHUNKS.labelDialogs,
    tag: 'label-templates-dialog',
    load: () => import('../../../dialogs/label-dialogs'),
  },
  TC: {
    chunk: LAZY_CHUNKS.tcDialog,
    tag: 'tc-dialog',
    load: () => import('../../../dialogs/tc-dialog'),
  },
};

/**
 * The chunk behind a dialog type, or `null` for `NONE` and for a type this
 * build does not know — an open payload is data, and a stale one can name a
 * dialog that no longer exists.
 */
export function dialogChunkFor(type: string): DialogChunk | null {
  return Object.prototype.hasOwnProperty.call(DIALOG_CHUNKS, type)
    ? DIALOG_CHUNKS[type as DialogType]
    : null;
}
