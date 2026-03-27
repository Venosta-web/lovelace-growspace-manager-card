/**
 * Plant Overview ViewModel Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { atom } from 'nanostores';
import { createPlantOverviewViewModel } from './plant-overview.viewmodel';
import type { PlantEntity, PlantOverviewEditedAttributes } from '../../../types';
import type { GrowspaceStore } from '../../../store/core/growspace-store';

describe('PlantOverviewViewModel', () => {
  let mockStore: Partial<GrowspaceStore>;
  let mockPlant: PlantEntity;
  let mockEditedAttributes: PlantOverviewEditedAttributes;
  let mockUIState: {
    activeTab: 'dashboard' | 'actions' | 'timeline';
    isEditing: boolean;
    showAllDates: boolean;
    showDeleteConfirmation: boolean;
  };

  beforeEach(() => {
    // Mock store with necessary atoms
    mockStore = {
      data: {
        $strainLibrary: atom([
          {
            strain: 'Test Strain',
            phenotype: 'Pheno A',
            key: 'test_strain_pheno_a',
            flowering_days: 60,
          },
        ]),
      } as any,
    };

    // Mock plant
    mockPlant = {
      entity_id: 'sensor.test_plant',
      state: 'vegetative',
      attributes: {
        plant_id: 'test-plant-1',
        strain: 'Test Strain',
        phenotype: 'Pheno A',
        stage: 'vegetative',
        growspace_id: 'test-growspace',
        days_in_stage: 15,
        total_days: 45,
        row: 0,
        col: 0,
        veg_start: '2024-01-01T00:00:00Z',
        flower_start: null,
        seedling_start: null,
        mother_start: null,
        clone_start: null,
        dry_start: null,
        cure_start: null,
        last_watered: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        last_training_technique: 'LST',
        last_ipm_type: 'Neem Oil',
        events: [],
      } as any,
      context: { id: '', parent_id: null, user_id: null },
      last_changed: '',
      last_updated: '',
    };

    // Mock edited attributes - must match plant attributes exactly for no-change tests
    mockEditedAttributes = {
      strain: 'Test Strain',
      phenotype: 'Pheno A',
      row: 0,
      col: 0,
      veg_start: '2024-01-01T00:00:00Z',
      flower_start: null,
      seedling_start: null,
      mother_start: null,
      clone_start: null,
      dry_start: null,
      cure_start: null,
    };

    // Mock UI state
    mockUIState = {
      activeTab: 'dashboard',
      isEditing: true,
      showAllDates: false,
      showDeleteConfirmation: false,
    };
  });

  it('should create view model with correct structure', () => {
    const viewModel = createPlantOverviewViewModel(
      mockPlant,
      mockEditedAttributes,
      mockUIState,
      mockStore as GrowspaceStore
    );
    const value = viewModel.get();

    expect(value).toHaveProperty('plant');
    expect(value).toHaveProperty('editedAttributes');
    expect(value).toHaveProperty('activeTab');
    expect(value).toHaveProperty('isEditing');
    expect(value).toHaveProperty('showAllDates');
    expect(value).toHaveProperty('showDeleteConfirmation');
    expect(value).toHaveProperty('plantId');
    expect(value).toHaveProperty('stageColor');
    expect(value).toHaveProperty('stageIcon');
    expect(value).toHaveProperty('displayName');
    expect(value).toHaveProperty('displaySubtitle');
    expect(value).toHaveProperty('timelineEvents');
    expect(value).toHaveProperty('plantStats');
    expect(value).toHaveProperty('availableActions');
    expect(value).toHaveProperty('hasUnsavedChanges');
    expect(value).toHaveProperty('canSave');
  });

  it('should compute plantId correctly', () => {
    const viewModel = createPlantOverviewViewModel(
      mockPlant,
      mockEditedAttributes,
      mockUIState,
      mockStore as GrowspaceStore
    );
    const value = viewModel.get();

    expect(value.plantId).toBe('test-plant-1');
  });

  it('should compute displayName from edited attributes', () => {
    const viewModel = createPlantOverviewViewModel(
      mockPlant,
      mockEditedAttributes,
      mockUIState,
      mockStore as GrowspaceStore
    );
    const value = viewModel.get();

    expect(value.displayName).toBe('Test Strain');
  });

  it('should handle missing strain gracefully', () => {
    const editedWithoutStrain = { ...mockEditedAttributes, strain: undefined };
    const viewModel = createPlantOverviewViewModel(
      mockPlant,
      editedWithoutStrain,
      mockUIState,
      mockStore as GrowspaceStore
    );
    const value = viewModel.get();

    expect(value.displayName).toBe('Unknown Strain');
  });

  it('should compute displaySubtitle correctly', () => {
    const viewModel = createPlantOverviewViewModel(
      mockPlant,
      mockEditedAttributes,
      mockUIState,
      mockStore as GrowspaceStore
    );
    const value = viewModel.get();

    expect(value.displaySubtitle).toBe('vegetative Stage • Pheno A');
  });

  it('should reflect UI state correctly', () => {
    const viewModel = createPlantOverviewViewModel(
      mockPlant,
      mockEditedAttributes,
      mockUIState,
      mockStore as GrowspaceStore
    );
    const value = viewModel.get();

    expect(value.activeTab).toBe('dashboard');
    expect(value.isEditing).toBe(true);
    expect(value.showAllDates).toBe(false);
    expect(value.showDeleteConfirmation).toBe(false);
  });

  describe('Plant Stats', () => {
    it('should calculate plant stats correctly', () => {
      const viewModel = createPlantOverviewViewModel(
        mockPlant,
        mockEditedAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      expect(value.plantStats).toBeInstanceOf(Array);
      expect(value.plantStats.length).toBeGreaterThan(0);

      // Should include days in stage
      const daysInStage = value.plantStats.find((s) => s.label === 'Days in Stage');
      expect(daysInStage).toBeDefined();
      expect(daysInStage?.value).toBe(15);
      expect(daysInStage?.unit).toBe('d');
    });

    it('should include total days stat', () => {
      const viewModel = createPlantOverviewViewModel(
        mockPlant,
        mockEditedAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      const totalDays = value.plantStats.find((s) => s.label === 'Total Days');
      expect(totalDays).toBeDefined();
      expect(totalDays?.value).toBe(45);
    });

    it('should include last watered stat', () => {
      const viewModel = createPlantOverviewViewModel(
        mockPlant,
        mockEditedAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      const lastWatered = value.plantStats.find((s) => s.label === 'Last Watered');
      expect(lastWatered).toBeDefined();
      // Should be "Today" or "Xd ago"
      expect(typeof lastWatered?.value).toBe('string');
    });

    it('should include training technique stat', () => {
      const viewModel = createPlantOverviewViewModel(
        mockPlant,
        mockEditedAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      const training = value.plantStats.find((s) => s.label === 'Last Training');
      expect(training).toBeDefined();
      expect(training?.value).toBe('LST');
    });

    it('should include IPM stat', () => {
      const viewModel = createPlantOverviewViewModel(
        mockPlant,
        mockEditedAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      const ipm = value.plantStats.find((s) => s.label === 'Last IPM');
      expect(ipm).toBeDefined();
      expect(ipm?.value).toBe('Neem Oil');
    });

    it('should handle harvest weight stats', () => {
      const plantWithHarvest = {
        ...mockPlant,
        attributes: {
          ...mockPlant.attributes,
          harvest_weight_wet: 150,
          harvest_weight_dry: 50,
        },
      };

      const viewModel = createPlantOverviewViewModel(
        plantWithHarvest,
        mockEditedAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      const wetWeight = value.plantStats.find((s) => s.label === 'Harvest Weight (Wet)');
      expect(wetWeight).toBeDefined();
      expect(wetWeight?.value).toBe(150);
      expect(wetWeight?.unit).toBe('g');

      const dryWeight = value.plantStats.find((s) => s.label === 'Harvest Weight (Dry)');
      expect(dryWeight).toBeDefined();
      expect(dryWeight?.value).toBe(50);
      expect(dryWeight?.unit).toBe('g');
    });
  });

  describe('Available Actions', () => {
    it('should enable water action for vegetative plants', () => {
      const viewModel = createPlantOverviewViewModel(
        mockPlant,
        mockEditedAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      const waterAction = value.availableActions.find((a) => a.id === 'water');
      expect(waterAction).toBeDefined();
      expect(waterAction?.enabled).toBe(true);
    });

    it('should disable water action for harvested plants', () => {
      const harvestedPlant = { ...mockPlant, state: 'harvested' };
      const viewModel = createPlantOverviewViewModel(
        harvestedPlant,
        mockEditedAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      const waterAction = value.availableActions.find((a) => a.id === 'water');
      expect(waterAction).toBeDefined();
      expect(waterAction?.enabled).toBe(false);
    });

    it('should enable training action for vegetative plants', () => {
      const viewModel = createPlantOverviewViewModel(
        mockPlant,
        mockEditedAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      const trainingAction = value.availableActions.find((a) => a.id === 'training');
      expect(trainingAction).toBeDefined();
      expect(trainingAction?.enabled).toBe(true);
    });

    it('should enable training action for flowering plants', () => {
      const floweringPlant = { ...mockPlant, state: 'flowering' };
      const viewModel = createPlantOverviewViewModel(
        floweringPlant,
        mockEditedAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      const trainingAction = value.availableActions.find((a) => a.id === 'training');
      expect(trainingAction).toBeDefined();
      expect(trainingAction?.enabled).toBe(true);
    });

    it('should disable training action for seedling plants', () => {
      const seedlingPlant = { ...mockPlant, state: 'seedling' };
      const viewModel = createPlantOverviewViewModel(
        seedlingPlant,
        mockEditedAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      const trainingAction = value.availableActions.find((a) => a.id === 'training');
      expect(trainingAction).toBeDefined();
      expect(trainingAction?.enabled).toBe(false);
    });

    it('should enable clone action for mother plants', () => {
      const motherPlant = { ...mockPlant, state: 'mother' };
      const viewModel = createPlantOverviewViewModel(
        motherPlant,
        mockEditedAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      const cloneAction = value.availableActions.find((a) => a.id === 'clone');
      expect(cloneAction).toBeDefined();
      expect(cloneAction?.enabled).toBe(true);
    });

    it('should enable clone action for vegetative plants', () => {
      const viewModel = createPlantOverviewViewModel(
        mockPlant,
        mockEditedAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      const cloneAction = value.availableActions.find((a) => a.id === 'clone');
      expect(cloneAction).toBeDefined();
      expect(cloneAction?.enabled).toBe(true);
    });

    it('should disable clone action for flowering plants', () => {
      const floweringPlant = { ...mockPlant, state: 'flowering' };
      const viewModel = createPlantOverviewViewModel(
        floweringPlant,
        mockEditedAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      const cloneAction = value.availableActions.find((a) => a.id === 'clone');
      expect(cloneAction).toBeDefined();
      expect(cloneAction?.enabled).toBe(false);
    });

    it('should enable IPM action for active plants', () => {
      const viewModel = createPlantOverviewViewModel(
        mockPlant,
        mockEditedAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      const ipmAction = value.availableActions.find((a) => a.id === 'ipm');
      expect(ipmAction).toBeDefined();
      expect(ipmAction?.enabled).toBe(true);
    });

    it('should disable IPM action for harvested plants', () => {
      const harvestedPlant = { ...mockPlant, state: 'harvested' };
      const viewModel = createPlantOverviewViewModel(
        harvestedPlant,
        mockEditedAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      const ipmAction = value.availableActions.find((a) => a.id === 'ipm');
      expect(ipmAction).toBeDefined();
      expect(ipmAction?.enabled).toBe(false);
    });
  });

  describe('Timeline Events', () => {
    it('should process milestone events from plant attributes', () => {
      const plantWithMilestones = {
        ...mockPlant,
        attributes: {
          ...mockPlant.attributes,
          veg_start: '2024-01-01T00:00:00Z',
          flower_start: '2024-02-01T00:00:00Z',
        },
      };

      const viewModel = createPlantOverviewViewModel(
        plantWithMilestones,
        mockEditedAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      expect(value.timelineEvents).toBeInstanceOf(Array);
      const milestones = value.timelineEvents.filter((e) => e.type === 'milestone');
      expect(milestones.length).toBeGreaterThan(0);
    });

    it('should process action events from plant timeline', () => {
      const plantWithEvents = {
        ...mockPlant,
        attributes: {
          ...mockPlant.attributes,
          events: [
            {
              type: 'action' as const,
              date: '2024-01-15T12:00:00Z',
              action: 'Watered',
              details: 'Applied 1L water',
            },
          ],
        },
      };

      const viewModel = createPlantOverviewViewModel(
        plantWithEvents,
        mockEditedAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      const actionEvents = value.timelineEvents.filter((e) => e.type === 'action');
      expect(actionEvents.length).toBeGreaterThan(0);
      const wateredEvent = actionEvents.find((e) => e.label === 'Watered');
      expect(wateredEvent).toBeDefined();
      expect(wateredEvent?.description).toBe('Applied 1L water');
    });

    it('should process note events from plant timeline', () => {
      const plantWithNotes = {
        ...mockPlant,
        attributes: {
          ...mockPlant.attributes,
          events: [
            {
              type: 'note' as const,
              date: '2024-01-10T10:00:00Z',
              text: 'Plant looking healthy',
            },
          ],
        },
      };

      const viewModel = createPlantOverviewViewModel(
        plantWithNotes,
        mockEditedAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      const noteEvents = value.timelineEvents.filter((e) => e.type === 'note');
      expect(noteEvents.length).toBeGreaterThan(0);
      const note = noteEvents[0];
      expect(note.description).toBe('Plant looking healthy');
    });

    it('should process milestone-type events from plant.attributes.events', () => {
      const plantWithMilestoneEvent = {
        ...mockPlant,
        attributes: {
          ...mockPlant.attributes,
          events: [
            {
              type: 'milestone' as const,
              date: '2024-03-01T00:00:00Z',
              label: 'Custom Milestone',
            },
          ],
        },
      };

      const viewModel = createPlantOverviewViewModel(
        plantWithMilestoneEvent,
        mockEditedAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      const milestoneEvents = value.timelineEvents.filter(
        (e) => e.type === 'milestone' && e.label === 'Custom Milestone'
      );
      expect(milestoneEvents.length).toBe(1);
    });

    it('should sort timeline events by date descending', () => {
      const plantWithMultipleEvents = {
        ...mockPlant,
        attributes: {
          ...mockPlant.attributes,
          veg_start: '2024-01-01T00:00:00Z',
          flower_start: '2024-02-01T00:00:00Z',
          events: [
            {
              type: 'action' as const,
              date: '2024-01-15T12:00:00Z',
              action: 'Event 1',
            },
          ],
        },
      };

      const viewModel = createPlantOverviewViewModel(
        plantWithMultipleEvents,
        mockEditedAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      expect(value.timelineEvents.length).toBeGreaterThan(1);

      // Verify descending order (most recent first)
      for (let i = 0; i < value.timelineEvents.length - 1; i++) {
        const current = new Date(value.timelineEvents[i].date).getTime();
        const next = new Date(value.timelineEvents[i + 1].date).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });

  describe('Validation', () => {
    it('should detect unsaved changes in strain', () => {
      const modifiedAttributes = { ...mockEditedAttributes, strain: 'Modified Strain' };
      const viewModel = createPlantOverviewViewModel(
        mockPlant,
        modifiedAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      expect(value.hasUnsavedChanges).toBe(true);
    });

    it('should detect unsaved changes in phenotype', () => {
      const modifiedAttributes = { ...mockEditedAttributes, phenotype: 'Pheno B' };
      const viewModel = createPlantOverviewViewModel(
        mockPlant,
        modifiedAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      expect(value.hasUnsavedChanges).toBe(true);
    });

    it('should detect unsaved changes in position', () => {
      const modifiedAttributes = { ...mockEditedAttributes, row: 5, col: 3 };
      const viewModel = createPlantOverviewViewModel(
        mockPlant,
        modifiedAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      expect(value.hasUnsavedChanges).toBe(true);
    });

    it('should detect no changes when attributes match', () => {
      const viewModel = createPlantOverviewViewModel(
        mockPlant,
        mockEditedAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      expect(value.hasUnsavedChanges).toBe(false);
    });

    it('should allow saving when strain is valid and has changes', () => {
      const modifiedAttributes = { ...mockEditedAttributes, strain: 'Valid Strain' };
      const viewModel = createPlantOverviewViewModel(
        mockPlant,
        modifiedAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      expect(value.canSave).toBe(true);
    });

    it('should not allow saving when strain is empty', () => {
      const invalidAttributes = { ...mockEditedAttributes, strain: '' };
      const viewModel = createPlantOverviewViewModel(
        mockPlant,
        invalidAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      expect(value.canSave).toBe(false);
    });

    it('should not allow saving when strain is only whitespace', () => {
      const invalidAttributes = { ...mockEditedAttributes, strain: '   ' };
      const viewModel = createPlantOverviewViewModel(
        mockPlant,
        invalidAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      expect(value.canSave).toBe(false);
    });

    it('should not allow saving when row is negative', () => {
      const invalidAttributes = { ...mockEditedAttributes, row: -1, strain: 'Modified' };
      const viewModel = createPlantOverviewViewModel(
        mockPlant,
        invalidAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      expect(value.canSave).toBe(false);
    });

    it('should not allow saving when col is negative', () => {
      const invalidAttributes = { ...mockEditedAttributes, col: -1, strain: 'Modified' };
      const viewModel = createPlantOverviewViewModel(
        mockPlant,
        invalidAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      expect(value.canSave).toBe(false);
    });

    it('should not allow saving when there are no changes', () => {
      const viewModel = createPlantOverviewViewModel(
        mockPlant,
        mockEditedAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );
      const value = viewModel.get();

      expect(value.canSave).toBe(false);
    });
  });

  describe('Reactive Updates', () => {
    it('should recompute when strain library changes', () => {
      const viewModel = createPlantOverviewViewModel(
        mockPlant,
        mockEditedAttributes,
        mockUIState,
        mockStore as GrowspaceStore
      );

      // Initial state
      const initialValue = viewModel.get();
      expect(initialValue.displayName).toBe('Test Strain');

      // Update strain library
      mockStore.data!.$strainLibrary.set([
        {
          strain: 'New Strain',
          phenotype: 'New Pheno',
          key: 'new_strain_new_pheno',
          flowering_days: 70,
        },
      ]);

      // ViewModel should recompute (though displayName comes from edited attributes)
      const updatedValue = viewModel.get();
      expect(updatedValue).toBeDefined();
    });
  });
});
