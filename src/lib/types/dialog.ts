import type { PlantEntity, PlantAttributes, StrainEntry } from '../../features/plants/types';
import type { VisionCheckupConfig } from '../../slices/camera';
import type { EnvironmentDraft } from '../../dialogs/config-dialog-sm';
import type { BufferedEnvironmentDraftKey } from '../../features/config/environment-persistence';
import type {
  AcInfinityDevice,
  CirculationFanConfig,
  ExhaustFanConfig,
} from '../../slices/growspace/schema';

export type { VisionCheckupConfig };
export type { CirculationFanConfig };
export type { ExhaustFanConfig };
export type { AcInfinityDevice };

export interface VisionCheckupResult {
  severity: string;
  check_type: string;
  timestamp: string;
  analysis: string;
  issues_detected: string[];
  recommendations: string[];
  snapshot_paths: string[];
}

export interface AddPlantDialogState {
  /** Target growspace, captured at open time (ADR-0027). */
  growspaceId?: string;
  row: number;
  col: number;
  strain?: string;
  phenotype?: string;
  veg_start?: string;
  flower_start?: string;
  seedling_start?: string;
  mother_start?: string;
  clone_start?: string;
  dry_start?: string;
  cure_start?: string;
  addToLibrary?: boolean;
}

export interface AddPlantsDialogState {
  /** Target growspace, captured at open time (ADR-0027). */
  growspaceId?: string;
  strain?: string;
  phenotype?: string;
  amount?: number;
  start_number?: number;
  veg_start?: string;
  flower_start?: string;
  seedling_start?: string;
  mother_start?: string;
  clone_start?: string;
  dry_start?: string;
  cure_start?: string;
  addToLibrary?: boolean;
  generation?: string;
}

export interface PlantOverviewDialogState {
  plant: PlantEntity;
  editedAttributes: Partial<PlantAttributes>;
  activeTab: 'dashboard' | 'actions' | 'timeline' | 'genetics';
  showAllDates?: boolean;
  selectedPlantIds?: string[];
}

export interface StrainLibraryDialogState {
  editingStrain?: StrainEntry;
  focusLineage?: boolean;
  source?: 'add-plant' | 'add-plants' | 'plant-overview';
  returnPayload?: unknown;
  initialTab?: 'strains' | 'seeds';
  view?: 'strains' | 'editor';
  /** When set, the seeds tab opens directly on this sub-view instead of the list. */
  initialSubView?: 'list' | 'log-pollination';
  /** Pre-fills the receiver plant field in the log-pollination form. */
  prefilledReceiverId?: string;
}

export interface VisionCheckupConfigEventDetail {
  growspaceId: string;
  visionCheckupConfig: VisionCheckupConfig;
}

/**
 * Sparse environment patch (ADR-0032).
 *
 * Only `selectedGrowspaceId` is guaranteed — it routes the command. Every other
 * key is present exactly when the user edited it, and a present key carries a
 * deliberate value, including an empty one. Consumers must branch on key
 * *presence* (`'key' in detail`), never on truthiness or array length, or
 * untouched fields get rewritten and deliberate clears get dropped.
 *
 * The humidity control flags are deliberately absent: they are immediate-persist
 * (`set_humidifier_control` / `set_dehumidifier_control`) and must never be
 * re-sent by the buffered Save.
 */
type MoistureBandKey = 'soilMoistureMin' | 'soilMoistureMax';

type SparseBufferedEnvironmentPatch = Partial<
  Pick<EnvironmentDraft, Exclude<BufferedEnvironmentDraftKey, MoistureBandKey>>
>;

type AtomicMoistureBandPatch =
  | { soilMoistureMin?: never; soilMoistureMax?: never }
  | Pick<EnvironmentDraft, MoistureBandKey>;

export type EnvironmentConfigEventDetail = Pick<EnvironmentDraft, 'selectedGrowspaceId'> &
  SparseBufferedEnvironmentPatch &
  AtomicMoistureBandPatch &
  Partial<Pick<EnvironmentDraft, 'exhaustFanConfig'>>;

export interface ConfigDialogState {
  currentTab:
    | 'growspaces'
    | 'notifications'
    | 'sensors'
    | 'climate'
    | 'growlight'
    | 'humidity'
    | 'irrigation'
    | 'tanks'
    | 'vision'
    | 'heatmap'
    | 'subareas'
    | 'vpd_targets';
  growspaceId: string;
  /** Optional deep-link: a `data-scroll-target` value to scroll into view + pulse. */
  scrollToField?: string;
}

export interface GrowMasterDialogState {
  growspaceId: string;
  isLoading: boolean;
  response: string | null;
  mode: 'single' | 'all';
}

export interface StrainRecommendationDialogState {
  isLoading: boolean;
  response: string | null;
}

export interface WateringDialogState {
  plantIds?: string[];
  growspaceId?: string;
  mode: 'plant' | 'growspace';
}

export interface TrainingDialogState {
  isOpen: boolean;
  plantIds: string[];
  growspaceId?: string;
}

export interface CloneDialogState {
  sourcePlant: PlantEntity;
  defaultGrowspaceId: string;
}

export interface NutrientPresetsDialogState {
  presetId?: string;
}

export interface IPMDialogState {
  presetId?: string;
  growspaceId?: string;
  plantIds?: string[];
}

export type QrTarget = 'web' | 'deeplink';

export interface PrintLabelDialogState {
  plantId?: string;
  strainName?: string;
  phenotype?: string;
  lineage?: string;
  breeder?: string;
  breederLogo?: string;
  deviceId?: string;
  defaultFields?: Partial<LabelFieldVisibility>;
  defaultSizeId?: LabelSizeId;
  defaultDensity?: PrintDensity;
  defaultQrTarget?: QrTarget;
}

export interface BatchPrintLabelsDialogState {
  plantIds: string[];
}

export interface HarvestScoringDialogState {
  /** The plant being harvested. */
  plant: PlantEntity;
  /** Current score values (1–5 or undefined/null for unset). */
  vigor?: number | null;
  internodal_spacing?: number | null;
  terpene_intensity?: number | null;
  resin?: number | null;
  mold_resistance?: number | null;
}

export interface SnapshotsDialogState {
  growspaceId: string;
}

export interface BatchCloneDialogState {
  plantIds: string[];
}

export interface IrrigationDialogState {
  growspaceId?: string;
  initialTab?: string;
  scrollToField?: string;
}

export type LabelSizeId = '50x30' | '40x30' | '50x50' | '50x80' | '50x15';

export type PrintDensity = 'low' | 'normal' | 'high';

export interface LabelFieldVisibility {
  name: boolean;
  phenotype: boolean;
  breeder: boolean;
  lineage: boolean;
  startDate: boolean;
  stageAge: boolean;
  plantId: boolean;
  logo: boolean;
  qr: boolean;
}

export interface LabelFieldValues {
  name: string;
  phenotype: string;
  breeder: string;
  lineage: string;
  startDate: string;
  stageAge: string;
  plantId: string;
  logo: string;
}
