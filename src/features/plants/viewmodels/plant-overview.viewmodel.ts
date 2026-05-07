/**
 * Plant Overview ViewModel
 *
 * Consolidates all business logic and state computations for plant overview dialog.
 * Single computed atom replaces multiple subscriptions and scattered state.
 */

import { computed, type ReadableAtom } from 'nanostores';
import type {
  PlantEntity,
  PlantOverviewEditedAttributes,
  GrowspaceEvent,
  PlantTimelineEvent,
} from '../../../types';
import type { GrowspaceStore } from '../../../store/core/growspace-store';
import { PlantUtils } from '../../../utils/plant-utils';

/**
 * Display-friendly timeline event (simplified from PlantTimelineEvent)
 */
export interface TimelineEvent {
  type: 'milestone' | 'action' | 'note';
  date: string;
  label: string;
  description?: string;
  category?: string;
  icon?: string;
}

/**
 * Plant statistic for display
 */
export interface PlantStat {
  label: string;
  value: string | number;
  unit?: string;
}

/**
 * Action configuration for quick actions
 */
export interface ActionConfig {
  id: string;
  label: string;
  icon: string;
  enabled: boolean;
  tooltip?: string;
}

/**
 * Complete ViewModel state for plant overview dialog
 */
export interface PlantOverviewViewModel {
  // Core data
  plant: PlantEntity;
  editedAttributes: PlantOverviewEditedAttributes;

  // UI state
  activeTab: 'dashboard' | 'actions' | 'timeline' | 'harvest' | 'genetics';
  isEditing: boolean;
  showAllDates: boolean;
  showDeleteConfirmation: boolean;

  // Computed identifiers
  plantId: string;
  stageColor: string;
  stageIcon: string;
  displayName: string;
  displaySubtitle: string;

  // Timeline data (processed)
  timelineEvents: TimelineEvent[];

  // Plant stats (computed)
  plantStats: PlantStat[];

  // Available actions (computed based on stage)
  availableActions: ActionConfig[];

  // Data for selectors
  growspaceOptions: Record<string, string>;

  // Validation
  hasUnsavedChanges: boolean;
  canSave: boolean;
}

/**
 * Process plant timeline events
 */
function processTimelineEvents(
  plant: PlantEntity,
  logbookEvents: GrowspaceEvent[]
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Extract milestones from plant attributes
  const milestoneFields = [
    { key: 'planted_date', label: 'Planted' },
    { key: 'seedling_start', label: 'Seedling' },
    { key: 'mother_start', label: 'Mother' },
    { key: 'clone_start', label: 'Clone' },
    { key: 'veg_start', label: 'Vegetative' },
    { key: 'flower_start', label: 'Flowering' },
    { key: 'dry_start', label: 'Drying' },
    { key: 'cure_start', label: 'Curing' },
    { key: 'harvest_date', label: 'Harvested' },
  ];

  milestoneFields.forEach((field) => {
    const date = (plant.attributes as Record<string, unknown>)?.[field.key];
    if (date && typeof date === 'string') {
      events.push({
        type: 'milestone',
        date,
        label: field.label,
      });
    }
  });

  // Add recorded events from plant attributes (PlantTimelineEvent[])
  const recordedEvents = plant.attributes?.events || [];
  recordedEvents.forEach((evt) => {
    // Convert PlantTimelineEvent to display TimelineEvent
    if (evt.type === 'action') {
      events.push({
        type: 'action',
        date: evt.date,
        label: evt.action,
        description: evt.details,
      });
    } else if (evt.type === 'note') {
      events.push({
        type: 'note',
        date: evt.date,
        label: 'Note',
        description: evt.text,
      });
    } else if (evt.type === 'milestone') {
      events.push({
        type: 'milestone',
        date: evt.date,
        label: evt.label,
      });
    }
  });

  // Add logbook events for this plant
  const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');
  logbookEvents
    .filter((evt) => evt.plant_id === plantId || evt.growspace_id === plant.attributes?.growspace_id)
    .forEach((evt) => {
      events.push({
        type: evt.category === 'note' ? 'note' : 'action',
        date: evt.timestamp || evt.start_time || new Date().toISOString(),
        label: evt.category || 'Event',
        description: evt.notes,
        category: evt.category,
      });
    });

  // Sort by date descending (most recent first)
  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Calculate plant statistics
 */
function calculatePlantStats(plant: PlantEntity): PlantStat[] {
  const stats: PlantStat[] = [];
  const attrs = plant.attributes;

  // Days in stage
  if (attrs?.days_in_stage !== undefined) {
    stats.push({
      label: 'Days in Stage',
      value: attrs.days_in_stage,
      unit: 'd',
    });
  }

  // Total days
  if (attrs?.total_days !== undefined) {
    stats.push({
      label: 'Total Days',
      value: attrs.total_days,
      unit: 'd',
    });
  }

  // Last watered
  if (attrs?.last_watered) {
    const date = new Date(attrs.last_watered);
    const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    stats.push({
      label: 'Last Watered',
      value: daysAgo === 0 ? 'Today' : `${daysAgo}d ago`,
    });
  }

  // Last training
  if (attrs?.last_training_technique) {
    stats.push({
      label: 'Last Training',
      value: attrs.last_training_technique,
    });
  }

  // Last IPM
  if (attrs?.last_ipm_type) {
    stats.push({
      label: 'Last IPM',
      value: attrs.last_ipm_type,
    });
  }

  // Harvest weight
  if (attrs?.harvest_weight_wet !== undefined) {
    stats.push({
      label: 'Harvest Weight (Wet)',
      value: attrs.harvest_weight_wet,
      unit: 'g',
    });
  }

  if (attrs?.harvest_weight_dry !== undefined) {
    stats.push({
      label: 'Harvest Weight (Dry)',
      value: attrs.harvest_weight_dry,
      unit: 'g',
    });
  }

  return stats;
}

/**
 * Determine available actions based on plant stage
 */
function getAvailableActions(plant: PlantEntity): ActionConfig[] {
  const stage = plant.state;

  const actions: ActionConfig[] = [
    {
      id: 'water',
      label: 'Water Plant',
      icon: 'mdiWater',
      enabled: stage !== 'harvested' && stage !== 'dry' && stage !== 'cure',
      tooltip: stage === 'harvested' ? 'Cannot water harvested plant' : undefined,
    },
    {
      id: 'training',
      label: 'Log Training',
      icon: 'mdiDumbbell',
      enabled: stage === 'veg' || stage === 'flower',
      tooltip: stage !== 'veg' && stage !== 'flower' ? 'Training only in veg/flower' : undefined,
    },
    {
      id: 'ipm',
      label: 'Log IPM',
      icon: 'mdiBug',
      enabled: stage !== 'harvested' && stage !== 'dry' && stage !== 'cure',
      tooltip: stage === 'harvested' ? 'Cannot apply IPM to harvested plant' : undefined,
    },
    {
      id: 'clone',
      label: 'Take Clone',
      icon: 'mdiContentCopy',
      enabled: stage === 'mother' || stage === 'veg' || stage === 'flower',
      tooltip: stage !== 'mother' && stage !== 'veg' && stage !== 'flower' ? 'Clone from mother or veg and flower plants' : undefined,
    },
    {
      id: 'print_label',
      label: 'Print Label',
      icon: 'mdiPrinter',
      enabled: stage !== 'harvested',
      tooltip: stage === 'harvested' ? 'Cannot print labels for harvested plants' : undefined,
    },
    {
      id: 'pollinate',
      label: 'Log Pollination',
      icon: 'mdiDna',
      enabled: stage === 'flower' || stage === 'flowering',
      tooltip: stage !== 'flower' && stage !== 'flowering' ? 'Only available in flower stage' : undefined,
    },
  ];

  return actions;
}

/**
 * Check if attributes have unsaved changes
 */
function hasUnsavedChanges(
  plant: PlantEntity,
  editedAttributes: PlantOverviewEditedAttributes
): boolean {
  const original = plant.attributes;

  return (
    editedAttributes.strain !== original?.strain ||
    editedAttributes.phenotype !== original?.phenotype ||
    editedAttributes.row !== original?.row ||
    editedAttributes.col !== original?.col ||
    editedAttributes.veg_start !== original?.veg_start ||
    editedAttributes.flower_start !== original?.flower_start ||
    editedAttributes.seedling_start !== original?.seedling_start ||
    editedAttributes.mother_start !== original?.mother_start ||
    editedAttributes.clone_start !== original?.clone_start ||
    editedAttributes.dry_start !== original?.dry_start ||
    editedAttributes.cure_start !== original?.cure_start
  );
}

/**
 * Validate edited attributes
 */
function canSaveAttributes(editedAttributes: PlantOverviewEditedAttributes): boolean {
  // Must have strain name
  const strain = editedAttributes.strain;
  if (!strain || typeof strain !== 'string' || strain.trim() === '') {
    return false;
  }

  // Row/col must be non-negative if provided
  if (editedAttributes.row !== undefined && editedAttributes.row < 0) {
    return false;
  }
  if (editedAttributes.col !== undefined && editedAttributes.col < 0) {
    return false;
  }

  return true;
}

/**
 * Create ViewModel for plant overview dialog
 */
export function createPlantOverviewViewModel(
  plant: PlantEntity,
  editedAttributes: PlantOverviewEditedAttributes,
  uiState: {
    activeTab: 'dashboard' | 'actions' | 'timeline' | 'harvest' | 'genetics';
    isEditing: boolean;
    showAllDates: boolean;
    showDeleteConfirmation: boolean;
  },
  store: GrowspaceStore,
  logbookEvents: GrowspaceEvent[] = []
): ReadableAtom<PlantOverviewViewModel> {
  return computed(
    [
      // We don't need many store subscriptions for this dialog
      // Most data comes from props (plant, editedAttributes)
      // But we do watch for new logbook events
      store.data.$strainLibrary, // For strain data
      store.grid.$growspaceOptions, // For stage moves
    ],
    (strainLibrary, growspaceOptions) => {
      const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');
      const stageColor = PlantUtils.getPlantStageColor(plant.state);
      const stageIcon = PlantUtils.getPlantStageIcon(plant.state);

      // Ensure displayName is a string (editedAttributes.strain is PlantAttributeValue)
      const strainValue = editedAttributes?.strain;
      const displayName = typeof strainValue === 'string' ? strainValue : 'Unknown Strain';

      const phenoValue = editedAttributes?.phenotype;
      const displaySubtitle = `${plant.state} Stage • ${typeof phenoValue === 'string' ? phenoValue : 'No Phenotype'
        }`;

      const timelineEvents = processTimelineEvents(plant, logbookEvents);

      // Calculate stats
      const plantStats = calculatePlantStats(plant);

      // Available actions
      const availableActions = getAvailableActions(plant);

      // Validation
      const unsavedChanges = hasUnsavedChanges(plant, editedAttributes);
      const canSave = canSaveAttributes(editedAttributes);

      return {
        // Core data
        plant,
        editedAttributes,

        // UI state
        activeTab: uiState.activeTab,
        isEditing: uiState.isEditing,
        showAllDates: uiState.showAllDates,
        showDeleteConfirmation: uiState.showDeleteConfirmation,

        // Computed identifiers
        plantId,
        stageColor,
        stageIcon,
        displayName,
        displaySubtitle,

        // Timeline data
        timelineEvents,

        // Plant stats
        plantStats,

        // Available actions
        availableActions,

        // Data for selectors
        growspaceOptions,

        // Validation
        hasUnsavedChanges: unsavedChanges,
        canSave: canSave && unsavedChanges,
      };
    }
  );
}

/**
 * Create a STABLE ViewModel for plant overview dialog.
 * This version takes atoms for all inputs, allowing it to be used with a
 * single persistent StoreController in the container component.
 */
export function createStablePlantOverviewViewModel(
  $plant: ReadableAtom<PlantEntity | null>,
  $editedAttributes: ReadableAtom<PlantOverviewEditedAttributes>,
  $uiState: ReadableAtom<{
    activeTab: 'dashboard' | 'actions' | 'timeline' | 'harvest' | 'genetics';
    isEditing: boolean;
    showAllDates: boolean;
    showDeleteConfirmation: boolean;
  }>,
  store: GrowspaceStore,
  $logbookEvents: ReadableAtom<GrowspaceEvent[]>
): ReadableAtom<PlantOverviewViewModel> {
  return computed(
    [
      $plant,
      $editedAttributes,
      $uiState,
      $logbookEvents,
      store.data.$strainLibrary,
      store.grid.$growspaceOptions,
    ],
    (plant, editedAttributes, uiState, logbookEvents, strainLibrary, growspaceOptions) => {
      // Fallback for null plant (initial state)
      if (!plant) {
        return {
          plant: {} as PlantEntity,
          editedAttributes: {} as PlantOverviewEditedAttributes,
          activeTab: uiState.activeTab,
          isEditing: false,
          showAllDates: false,
          showDeleteConfirmation: false,
          plantId: '',
          stageColor: '',
          stageIcon: '',
          displayName: '',
          displaySubtitle: '',
          timelineEvents: [],
          plantStats: [],
          availableActions: [],
          growspaceOptions: {},
          hasUnsavedChanges: false,
          canSave: false,
        } as PlantOverviewViewModel;
      }

      const plantId = plant.attributes?.plant_id || plant.entity_id.replace('sensor.', '');
      const stageColor = PlantUtils.getPlantStageColor(plant.state);
      const stageIcon = PlantUtils.getPlantStageIcon(plant.state);

      const strainValue = editedAttributes?.strain;
      const displayName = typeof strainValue === 'string' ? strainValue : 'Unknown Strain';

      const phenoValue = editedAttributes?.phenotype;
      const displaySubtitle = `${plant.state} Stage • ${typeof phenoValue === 'string' ? phenoValue : 'No Phenotype'
        }`;

      const timelineEvents = processTimelineEvents(plant, logbookEvents);
      const plantStats = calculatePlantStats(plant);
      const availableActions = getAvailableActions(plant);
      const unsavedChanges = hasUnsavedChanges(plant, editedAttributes);
      const canSave = canSaveAttributes(editedAttributes);

      return {
        plant,
        editedAttributes,
        activeTab: uiState.activeTab,
        isEditing: uiState.isEditing,
        showAllDates: uiState.showAllDates,
        showDeleteConfirmation: uiState.showDeleteConfirmation,
        plantId,
        stageColor,
        stageIcon,
        displayName,
        displaySubtitle,
        timelineEvents,
        plantStats,
        availableActions,
        growspaceOptions,
        hasUnsavedChanges: unsavedChanges,
        canSave: canSave && unsavedChanges,
      };
    }
  );
}
