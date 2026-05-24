
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionDispatcher } from '../../src/store/core/action-dispatcher';
import * as plantActions from '../../src/store/plant/plant-actions';
import * as strainActions from '../../src/store/plant/strain-actions';
import * as uiActions from '../../src/store/ui/ui-actions';
import * as libraryActions from '../../src/store/plant/library-actions';
import * as snapshotActions from '../../src/store/plant/snapshot-actions';
import * as reportActions from '../../src/store/plant/report-actions';
import * as aiActions from '../../src/store/system/ai-actions';
import * as environmentActions from '../../src/store/growspace/environment-actions';
import * as growspaceActions from '../../src/store/growspace/growspace-actions';
import * as breederActions from '../../src/store/plant/breeder-actions';
import * as geneticsActions from '../../src/store/plant/genetics-actions';
import * as ipmActions from '../../src/store/plant/ipm-actions';
import { PlantEntity } from '../../src/types';

vi.mock('../../src/store/plant/plant-actions', () => ({
    updatePlant: vi.fn(),
    handleDeletePlant: vi.fn(),
    movePlantToGrowspace: vi.fn(),
    handlePlantDrop: vi.fn(),
    movePlantToNextStage: vi.fn(),
    takeClone: vi.fn(),
    updatePlantFromDialog: vi.fn(),
    confirmAddPlant: vi.fn(),
    confirmAddPlants: vi.fn(),
    saveHarvestMetrics: vi.fn(),
    scorePhenotype: vi.fn(),
    printLabel: vi.fn(),
}));

vi.mock('../../src/store/plant/strain-actions', () => ({
    addStrain: vi.fn(),
    updateStrain: vi.fn(),
    removeStrain: vi.fn(),
}));

vi.mock('../../src/store/ui/ui-actions', () => ({
    togglePlantSelection: vi.fn(),
    handlePlantClick: vi.fn(),
    openAddPlantDialog: vi.fn(),
    openPlantOverviewDialog: vi.fn(),
    selectAllPlants: vi.fn(),
    openStrainRecommendationDialog: vi.fn(),
    exportStrainLibrary: vi.fn(),
    showToast: vi.fn(),
    ui: { showToast: vi.fn() } as any,
    setActiveDialog: vi.fn(),
    closeDialog: vi.fn(),
    openNutrientPresetsDialog: vi.fn(),
    openIPMDialog: vi.fn(),
    openLogbookDialog: vi.fn(),
    openConfigDialog: vi.fn(),
    openStrainLibraryDialog: vi.fn(),
    openIrrigationDialog: vi.fn(),
    openGrowMasterDialog: vi.fn(),
    openWateringDialog: vi.fn(),
    openTrainingDialog: vi.fn(),
    openNutrientsDialog: vi.fn(),
    openSnapshotsDialog: vi.fn(),
    openCropSteeringDialog: vi.fn(),
    openECRampDialog: vi.fn(),
    openGrowReportDialog: vi.fn(),
}));

vi.mock('../../src/store/plant/library-actions', () => ({
    fetchStrainLibrary: vi.fn(),
    fetchNutrientPresets: vi.fn(),
    fetchIPMPresets: vi.fn(),
    fetchNutrientInventory: vi.fn(),
    updateNutrientStock: vi.fn(),
    removeNutrientStock: vi.fn(),
    fetchECRampCurves: vi.fn(),
    saveECRampCurve: vi.fn(),
    removeECRampCurve: vi.fn(),
    saveNutrientPreset: vi.fn(),
    removeNutrientPreset: vi.fn(),
}));

vi.mock('../../src/store/plant/snapshot-actions', () => ({
    getSnapshots: vi.fn(),
    captureSnapshot: vi.fn(),
    getVisionHistory: vi.fn(),
    triggerVisionCheckup: vi.fn(),
    updateVisionCheckupConfig: vi.fn(),
}));

vi.mock('../../src/store/plant/report-actions', () => ({
    fetchGrowReport: vi.fn(),
    exportGrowReport: vi.fn(),
}));

vi.mock('../../src/store/system/ai-actions', () => ({
    analyzeGrowspace: vi.fn(),
    getStrainRecommendation: vi.fn(),
}));

vi.mock('../../src/store/growspace/environment-actions', () => ({
    configureEnvironment: vi.fn(),
    removeEnvironment: vi.fn(),
    resetWaterTracking: vi.fn(),
    waterPlant: vi.fn(),
    waterGrowspace: vi.fn(),
}));

vi.mock('../../src/store/growspace/growspace-actions', () => ({
    addGrowspace: vi.fn(),
    updateGrowspace: vi.fn(),
    removeGrowspace: vi.fn(),
}));

vi.mock('../../src/store/plant/breeder-actions', () => ({
    updateBreeder: vi.fn(),
    deleteBreeder: vi.fn(),
}));

vi.mock('../../src/store/plant/genetics-actions', () => ({
    addSeedBatch: vi.fn(),
    updateSeedBatch: vi.fn(),
    logPollination: vi.fn(),
    updatePollination: vi.fn(),
    deletePollination: vi.fn(),
    fetchGeneticsData: vi.fn(),
    harvestSeeds: vi.fn(),
}));

vi.mock('../../src/store/plant/ipm-actions', () => ({
    applyIPM: vi.fn(),
}));

describe('ActionDispatcher', () => {
    let mockStore: any;
    let dispatcher: ActionDispatcher;

    beforeEach(() => {
        vi.clearAllMocks();

        mockStore = {
            undo: vi.fn(),
            redo: vi.fn(),
            refreshData: vi.fn(),
            canUndo: true,
            canRedo: false,
            context: {
                id: 'mock-ctx',
                dataService: {
                    removeEnvironment: vi.fn(),
                    resetWaterTracking: vi.fn(),
                    importStrainLibrary: vi.fn(),
                },
                ui: { showToast: vi.fn() },
            },
        };

        dispatcher = new ActionDispatcher(mockStore);
    });

    describe('Plant Actions', () => {
        const mockPlant = { attributes: { plant_id: 'p1' } } as PlantEntity;

        it('should delegate update to plantActions', () => {
            dispatcher.plant.update('p1', { strain: 'OG' });
            expect(plantActions.updatePlant).toHaveBeenCalledWith(mockStore.context, 'p1', { strain: 'OG' });
        });

        it('should delegate delete to plantActions', () => {
            dispatcher.plant.delete('p1');
            expect(plantActions.handleDeletePlant).toHaveBeenCalledWith(mockStore.context, 'p1');
        });

        it('should delegate move to plantActions', () => {
            dispatcher.plant.move(mockPlant, 'gs2');
            expect(plantActions.movePlantToGrowspace).toHaveBeenCalledWith(mockStore.context, mockPlant, 'gs2');
        });

        it('should delegate drop to plantActions', () => {
            dispatcher.plant.drop(1, 2, null, mockPlant);
            expect(plantActions.handlePlantDrop).toHaveBeenCalledWith(mockStore.context, 1, 2, null, mockPlant);
        });

        it('should delegate nextStage to plantActions', () => {
            dispatcher.plant.nextStage(mockPlant);
            expect(plantActions.movePlantToNextStage).toHaveBeenCalledWith(mockStore.context, mockPlant);
        });

        it('should delegate harvest to plantActions with metrics', () => {
            const metrics = { yield: 100 };
            dispatcher.plant.harvest(mockPlant, metrics);
            expect(plantActions.movePlantToNextStage).toHaveBeenCalledWith(mockStore.context, mockPlant, metrics);
        });

        it('should delegate harvest without metrics', () => {
            dispatcher.plant.harvest(mockPlant);
            expect(plantActions.movePlantToNextStage).toHaveBeenCalledWith(mockStore.context, mockPlant, undefined);
        });

        it('should delegate finishDrying to plantActions', () => {
            dispatcher.plant.finishDrying(mockPlant);
            expect(plantActions.movePlantToNextStage).toHaveBeenCalledWith(mockStore.context, mockPlant);
        });

        it('should delegate takeClone to plantActions', () => {
            dispatcher.plant.takeClone(mockPlant, 5, 'gs2');
            expect(plantActions.takeClone).toHaveBeenCalledWith(mockStore.context, mockPlant, 5, 'gs2');
        });

        it('should delegate updateFromDialog to plantActions', () => {
            const state = { some: 'state' } as any;
            dispatcher.plant.updateFromDialog(state);
            expect(plantActions.updatePlantFromDialog).toHaveBeenCalledWith(mockStore.context, state);
        });

        it('should delegate add to plantActions', () => {
            dispatcher.plant.add('gs1', 0, 0, 'strain', 'pheno');
            expect(plantActions.confirmAddPlant).toHaveBeenCalledWith(
                mockStore.context,
                { row: 0, col: 0, strain: 'strain', phenotype: 'pheno' }
            );
        });

        it('should delegate addBatch to plantActions', () => {
            const detail = { count: 5 } as any;
            dispatcher.plant.addBatch(detail);
            expect(plantActions.confirmAddPlants).toHaveBeenCalledWith(mockStore.context, detail);
        });

        it('should delegate saveHarvestMetrics to plantActions', () => {
            const metrics = { yield: 200, thc: 22 };
            dispatcher.plant.saveHarvestMetrics('p1', metrics);
            expect(plantActions.saveHarvestMetrics).toHaveBeenCalledWith(mockStore.context, 'p1', metrics);
        });

        it('should delegate scorePhenotype to plantActions', () => {
            const scores = { flavor: 8, potency: 9, yield: null };
            dispatcher.plant.scorePhenotype('p1', scores);
            expect(plantActions.scorePhenotype).toHaveBeenCalledWith(mockStore.context, 'p1', scores);
        });

        it('should delegate printLabel to plantActions', () => {
            const params = { plantId: 'p1', template: 'standard' } as any;
            dispatcher.plant.printLabel(params);
            expect(plantActions.printLabel).toHaveBeenCalledWith(mockStore.context, params);
        });
    });

    describe('Growspace Actions', () => {
        it('should delegate add to growspaceActions', () => {
            const detail = { name: 'New Tent', rows: 4, plantsPerRow: 2, notificationService: 'gs' };
            dispatcher.growspace.add(detail);
            expect(growspaceActions.addGrowspace).toHaveBeenCalledWith(mockStore.context, 'New Tent', 4, 2, 'gs');
        });

        it('should delegate update to growspaceActions', () => {
            const detail = { growspaceId: 'gs1', name: 'Updated', rows: 4, plantsPerRow: 2 };
            dispatcher.growspace.update(detail);
            expect(growspaceActions.updateGrowspace).toHaveBeenCalledWith(mockStore.context, 'gs1', 'Updated', 4, 2);
        });

        it('should delegate remove to growspaceActions', () => {
            dispatcher.growspace.remove('gs1');
            expect(growspaceActions.removeGrowspace).toHaveBeenCalledWith(mockStore.context, 'gs1');
        });

        it('should delegate removeEnvironment to dataService', () => {
            dispatcher.growspace.removeEnvironment('gs1');
            expect(mockStore.context.dataService.removeEnvironment).toHaveBeenCalledWith('gs1');
        });

        it('should delegate resetWaterTracking to dataService', () => {
            dispatcher.growspace.resetWaterTracking('gs1');
            expect(mockStore.context.dataService.resetWaterTracking).toHaveBeenCalledWith('gs1');
        });
    });

    describe('Strain Actions', () => {
        it('should delegate add to strainActions', () => {
            const data = { strain: 'New Strain' };
            dispatcher.strain.add(data);
            expect(strainActions.addStrain).toHaveBeenCalledWith(mockStore.context, data);
        });

        it('should delegate update to strainActions', () => {
            const data = { strain: 'Updated Strain', id: 's1' };
            dispatcher.strain.update(data);
            expect(strainActions.updateStrain).toHaveBeenCalledWith(mockStore.context, data);
        });

        it('should delegate remove to strainActions', () => {
            dispatcher.strain.remove('strain-key');
            expect(strainActions.removeStrain).toHaveBeenCalledWith(mockStore.context, 'strain-key');
        });
    });

    describe('History Actions', () => {
        it('should delegate undo to store', () => {
            dispatcher.history.undo();
            expect(mockStore.undo).toHaveBeenCalled();
        });

        it('should delegate redo to store', () => {
            dispatcher.history.redo();
            expect(mockStore.redo).toHaveBeenCalled();
        });

        it('should expose canUndo from store', () => {
            expect(dispatcher.history.canUndo()).toBe(true);
        });

        it('should expose canRedo from store', () => {
            expect(dispatcher.history.canRedo()).toBe(false);
        });
    });

    describe('UI Actions', () => {
        const mockPlant = { attributes: { plant_id: 'p1' } } as PlantEntity;

        it('should delegate togglePlantSelection to uiActions', () => {
            dispatcher.ui.togglePlantSelection('p1');
            expect(uiActions.togglePlantSelection).toHaveBeenCalledWith(mockStore.context, 'p1');
        });

        it('should delegate handlePlantClick to uiActions', () => {
            dispatcher.ui.handlePlantClick(mockPlant);
            expect(uiActions.handlePlantClick).toHaveBeenCalledWith(mockStore.context, mockPlant);
        });

        it('should delegate openAddPlantDialog to uiActions', () => {
            dispatcher.ui.openAddPlantDialog(1, 2);
            expect(uiActions.openAddPlantDialog).toHaveBeenCalledWith(mockStore.context, 1, 2);
        });

        it('should delegate openPlantOverviewDialog to uiActions', () => {
            const selectedIds = ['p1', 'p2'];
            dispatcher.ui.openPlantOverviewDialog(mockPlant, selectedIds);
            expect(uiActions.openPlantOverviewDialog).toHaveBeenCalledWith(mockStore.context, mockPlant, selectedIds);
        });

        it('should delegate selectAllPlants to uiActions', () => {
            dispatcher.ui.selectAllPlants();
            expect(uiActions.selectAllPlants).toHaveBeenCalledWith(mockStore.context);
        });

        it('should delegate openStrainRecommendationDialog to uiActions', () => {
            dispatcher.ui.openStrainRecommendationDialog();
            expect(uiActions.openStrainRecommendationDialog).toHaveBeenCalledWith(mockStore.context);
        });

        it('should delegate exportStrainLibrary to uiActions', () => {
            dispatcher.ui.exportStrainLibrary();
            expect(uiActions.exportStrainLibrary).toHaveBeenCalledWith(mockStore.context);
        });

        it('should delegate showToast to uiActions', () => {
            dispatcher.ui.showToast('hello', 'success');
            expect(uiActions.showToast).toHaveBeenCalledWith(mockStore.context, 'hello', 'success');
        });

        it('should use default type info for showToast', () => {
            dispatcher.ui.showToast('hello');
            expect(uiActions.showToast).toHaveBeenCalledWith(mockStore.context, 'hello', 'info');
        });

        it('should delegate toast to uiActions', () => {
            dispatcher.ui.toast('msg', 'error');
            expect(uiActions.showToast).toHaveBeenCalledWith(mockStore.context, 'msg', 'error');
        });

        it('should delegate refreshData to store', () => {
            dispatcher.ui.refreshData();
            expect(mockStore.refreshData).toHaveBeenCalled();
        });

        it('should delegate setActiveDialog to uiActions', () => {
            const dialog = { type: 'strain-library' } as any;
            dispatcher.ui.setActiveDialog(dialog);
            expect(uiActions.setActiveDialog).toHaveBeenCalledWith(mockStore.context, dialog);
        });

        it('should delegate closeDialog to uiActions', () => {
            dispatcher.ui.closeDialog();
            expect(uiActions.closeDialog).toHaveBeenCalledWith(mockStore.context);
        });

        it('should delegate openNutrientPresetsDialog to uiActions', () => {
            dispatcher.ui.openNutrientPresetsDialog();
            expect(uiActions.openNutrientPresetsDialog).toHaveBeenCalledWith(mockStore.context);
        });

        it('should delegate openIPMDialog to uiActions', () => {
            const ctx = { growspaceId: 'gs1', plantIds: ['p1'] };
            dispatcher.ui.openIPMDialog(ctx);
            expect(uiActions.openIPMDialog).toHaveBeenCalledWith(mockStore.context, ctx);
        });

        it('should delegate openLogbookDialog to uiActions', () => {
            dispatcher.ui.openLogbookDialog();
            expect(uiActions.openLogbookDialog).toHaveBeenCalledWith(mockStore.context);
        });

        it('should delegate openConfigDialog to uiActions', () => {
            const device = { id: 'dev1' } as any;
            dispatcher.ui.openConfigDialog(device);
            expect(uiActions.openConfigDialog).toHaveBeenCalledWith(mockStore.context, device);
        });

        it('should delegate openStrainLibraryDialog to uiActions', () => {
            dispatcher.ui.openStrainLibraryDialog();
            expect(uiActions.openStrainLibraryDialog).toHaveBeenCalledWith(mockStore.context);
        });

        it('should delegate openIrrigationDialog to uiActions', () => {
            dispatcher.ui.openIrrigationDialog();
            expect(uiActions.openIrrigationDialog).toHaveBeenCalledWith(mockStore.context, undefined);
        });

        it('should delegate openIrrigationDialog with options to uiActions', () => {
            dispatcher.ui.openIrrigationDialog({ initialTab: 'steering', scrollToField: 'lightsOnTime' });
            expect(uiActions.openIrrigationDialog).toHaveBeenCalledWith(mockStore.context, {
                initialTab: 'steering',
                scrollToField: 'lightsOnTime',
            });
        });

        it('should delegate openGrowMasterDialog to uiActions', () => {
            dispatcher.ui.openGrowMasterDialog('gs1');
            expect(uiActions.openGrowMasterDialog).toHaveBeenCalledWith(mockStore.context, 'gs1');
        });

        it('should delegate openWateringDialog to uiActions', () => {
            const options = { plantIds: ['p1'], growspaceId: 'gs1', mode: 'plant' as const };
            dispatcher.ui.openWateringDialog(options);
            expect(uiActions.openWateringDialog).toHaveBeenCalledWith(mockStore.context, options);
        });

        it('should delegate openTrainingDialog to uiActions', () => {
            dispatcher.ui.openTrainingDialog(['p1', 'p2'], 'gs1');
            expect(uiActions.openTrainingDialog).toHaveBeenCalledWith(mockStore.context, ['p1', 'p2'], 'gs1');
        });

        it('should delegate openNutrientsDialog to uiActions', () => {
            dispatcher.ui.openNutrientsDialog();
            expect(uiActions.openNutrientsDialog).toHaveBeenCalledWith(mockStore.context);
        });

        it('should delegate openSnapshotsDialog to uiActions', () => {
            dispatcher.ui.openSnapshotsDialog('gs1');
            expect(uiActions.openSnapshotsDialog).toHaveBeenCalledWith(mockStore.context, 'gs1');
        });

        it('should delegate openCropSteeringDialog to uiActions', () => {
            dispatcher.ui.openCropSteeringDialog('gs1');
            expect(uiActions.openCropSteeringDialog).toHaveBeenCalledWith(mockStore.context, 'gs1');
        });

        it('should delegate openECRampDialog to uiActions', () => {
            dispatcher.ui.openECRampDialog('gs1');
            expect(uiActions.openECRampDialog).toHaveBeenCalledWith(mockStore.context, 'gs1');
        });

        it('should delegate openGrowReportDialog to uiActions', () => {
            dispatcher.ui.openGrowReportDialog('gs1');
            expect(uiActions.openGrowReportDialog).toHaveBeenCalledWith(mockStore.context, 'gs1');
        });
    });

    describe('Library Actions', () => {
        it('should delegate fetchStrains with force=false', () => {
            dispatcher.library.fetchStrains();
            expect(libraryActions.fetchStrainLibrary).toHaveBeenCalledWith(mockStore.context, false);
        });

        it('should delegate fetchStrains with force=true', () => {
            dispatcher.library.fetchStrains(true);
            expect(libraryActions.fetchStrainLibrary).toHaveBeenCalledWith(mockStore.context, true);
        });

        it('should delegate fetchNutrientPresets', () => {
            dispatcher.library.fetchNutrientPresets(true);
            expect(libraryActions.fetchNutrientPresets).toHaveBeenCalledWith(mockStore.context, true);
        });

        it('should delegate fetchIPMPresets', () => {
            dispatcher.library.fetchIPMPresets();
            expect(libraryActions.fetchIPMPresets).toHaveBeenCalledWith(mockStore.context, false);
        });

        it('should delegate fetchNutrientInventory', () => {
            dispatcher.library.fetchNutrientInventory(true);
            expect(libraryActions.fetchNutrientInventory).toHaveBeenCalledWith(mockStore.context, true);
        });

        it('should delegate updateNutrientStock', () => {
            dispatcher.library.updateNutrientStock('n1', 'CalMag', 500, 1000);
            expect(libraryActions.updateNutrientStock).toHaveBeenCalledWith(mockStore.context, 'n1', 'CalMag', 500, 1000);
        });

        it('should delegate removeNutrientStock', () => {
            dispatcher.library.removeNutrientStock('n1');
            expect(libraryActions.removeNutrientStock).toHaveBeenCalledWith(mockStore.context, 'n1');
        });

        it('should delegate fetchECRampCurves', () => {
            dispatcher.library.fetchECRampCurves();
            expect(libraryActions.fetchECRampCurves).toHaveBeenCalledWith(mockStore.context, false);
        });

        it('should delegate saveECRampCurve', () => {
            const data = { id: 'curve1', name: 'Veg Ramp' } as any;
            dispatcher.library.saveECRampCurve(data);
            expect(libraryActions.saveECRampCurve).toHaveBeenCalledWith(mockStore.context, data);
        });

        it('should delegate removeECRampCurve', () => {
            dispatcher.library.removeECRampCurve('curve1');
            expect(libraryActions.removeECRampCurve).toHaveBeenCalledWith(mockStore.context, 'curve1');
        });

        it('should delegate import to strainActions.addStrain for each entry', async () => {
            const strains = [{ name: 'Blue Dream' }, { name: 'OG Kush' }];
            const file = new File([JSON.stringify(strains)], 'library.json');
            await dispatcher.library.import(file, true);
            expect(strainActions.addStrain).toHaveBeenCalledTimes(2);
            expect(strainActions.addStrain).toHaveBeenCalledWith(mockStore.context, strains[0]);
            expect(strainActions.addStrain).toHaveBeenCalledWith(mockStore.context, strains[1]);
        });
    });

    describe('Nutrient Actions', () => {
        it('should delegate savePreset', () => {
            const preset = { id: 'p1', name: 'Veg Mix' } as any;
            dispatcher.nutrient.savePreset(preset);
            expect(libraryActions.saveNutrientPreset).toHaveBeenCalledWith(mockStore.context, preset);
        });

        it('should delegate removePreset', () => {
            dispatcher.nutrient.removePreset('p1');
            expect(libraryActions.removeNutrientPreset).toHaveBeenCalledWith(mockStore.context, 'p1');
        });
    });

    describe('Snapshot Actions', () => {
        it('should delegate list to snapshotActions', () => {
            dispatcher.snapshots.list('gs1');
            expect(snapshotActions.getSnapshots).toHaveBeenCalledWith(mockStore.context, 'gs1');
        });

        it('should delegate capture to snapshotActions', () => {
            dispatcher.snapshots.capture('gs1');
            expect(snapshotActions.captureSnapshot).toHaveBeenCalledWith(mockStore.context, 'gs1');
        });

        it('should delegate visionHistory to snapshotActions', () => {
            dispatcher.snapshots.visionHistory('gs1');
            expect(snapshotActions.getVisionHistory).toHaveBeenCalledWith(mockStore.context, 'gs1');
        });

        it('should delegate triggerCheckup to snapshotActions', () => {
            dispatcher.snapshots.triggerCheckup('gs1');
            expect(snapshotActions.triggerVisionCheckup).toHaveBeenCalledWith(mockStore.context, 'gs1');
        });

        it('should delegate updateCheckupConfig to snapshotActions', () => {
            const config = { enabled: true, interval: 24 } as any;
            dispatcher.snapshots.updateCheckupConfig('gs1', config);
            expect(snapshotActions.updateVisionCheckupConfig).toHaveBeenCalledWith(mockStore.context, 'gs1', config);
        });
    });

    describe('Report Actions', () => {
        it('should delegate fetch to reportActions', () => {
            dispatcher.report.fetch('gs1');
            expect(reportActions.fetchGrowReport).toHaveBeenCalledWith(mockStore.context, 'gs1');
        });

        it('should delegate export to reportActions', () => {
            dispatcher.report.export('gs1', 'pdf');
            expect(reportActions.exportGrowReport).toHaveBeenCalledWith(mockStore.context, 'gs1', 'pdf');
        });
    });

    describe('AI Actions', () => {
        it('should delegate analyzeAll to aiActions with all=true', () => {
            dispatcher.ai.analyzeAll();
            expect(aiActions.analyzeGrowspace).toHaveBeenCalledWith(mockStore.context, '', true);
        });

        it('should delegate askAdvice to aiActions with all=false', () => {
            dispatcher.ai.askAdvice('How are my plants?');
            expect(aiActions.analyzeGrowspace).toHaveBeenCalledWith(mockStore.context, 'How are my plants?', false);
        });

        it('should delegate strainRecommendation to aiActions', () => {
            dispatcher.ai.strainRecommendation('high yield indica');
            expect(aiActions.getStrainRecommendation).toHaveBeenCalledWith(mockStore.context, 'high yield indica');
        });
    });

    describe('Environment Actions', () => {
        it('should delegate configure to environmentActions', () => {
            const data = { growspaceId: 'gs1', tempMin: 20 } as any;
            dispatcher.environment.configure(data);
            expect(environmentActions.configureEnvironment).toHaveBeenCalledWith(mockStore.context, data);
        });

        it('should delegate remove to environmentActions', () => {
            dispatcher.environment.remove('gs1');
            expect(environmentActions.removeEnvironment).toHaveBeenCalledWith(mockStore.context, 'gs1');
        });

        it('should delegate resetWaterTracking to environmentActions', () => {
            dispatcher.environment.resetWaterTracking('gs1');
            expect(environmentActions.resetWaterTracking).toHaveBeenCalledWith(mockStore.context, 'gs1');
        });

        it('should delegate waterPlant to environmentActions', () => {
            const nutrients = { CalMag: 2 };
            dispatcher.environment.waterPlant('p1', 500, nutrients, 'preset1');
            expect(environmentActions.waterPlant).toHaveBeenCalledWith(mockStore.context, 'p1', 500, nutrients, 'preset1');
        });

        it('should delegate waterGrowspace to environmentActions', () => {
            dispatcher.environment.waterGrowspace('gs1', 1000);
            expect(environmentActions.waterGrowspace).toHaveBeenCalledWith(mockStore.context, 'gs1', 1000, undefined, undefined);
        });
    });

    describe('Breeder Actions', () => {
        it('should delegate update to breederActions', () => {
            dispatcher.breeder.update('OldBreeder', 'NewBreeder', 'logo.png');
            expect(breederActions.updateBreeder).toHaveBeenCalledWith(mockStore.context, 'OldBreeder', 'NewBreeder', 'logo.png');
        });

        it('should delegate delete to breederActions', () => {
            dispatcher.breeder.delete('OldBreeder');
            expect(breederActions.deleteBreeder).toHaveBeenCalledWith(mockStore.context, 'OldBreeder');
        });
    });

    describe('Genetics Actions', () => {
        it('should delegate addSeedBatch to geneticsActions', () => {
            const data = { strainId: 's1', count: 10 } as any;
            dispatcher.genetics.addSeedBatch(data);
            expect(geneticsActions.addSeedBatch).toHaveBeenCalledWith(mockStore.context, data);
        });

        it('should delegate updateSeedBatch to geneticsActions', () => {
            const data = { id: 'b1', count: 5 } as any;
            dispatcher.genetics.updateSeedBatch(data);
            expect(geneticsActions.updateSeedBatch).toHaveBeenCalledWith(mockStore.context, data);
        });

        it('should delegate logPollination to geneticsActions', () => {
            const data = { motherId: 'p1', fatherId: 'p2' } as any;
            dispatcher.genetics.logPollination(data);
            expect(geneticsActions.logPollination).toHaveBeenCalledWith(mockStore.context, data);
        });

        it('should delegate updatePollination to geneticsActions', () => {
            const data = { eventId: 'e1', notes: 'updated' } as any;
            dispatcher.genetics.updatePollination(data);
            expect(geneticsActions.updatePollination).toHaveBeenCalledWith(mockStore.context, data);
        });

        it('should delegate deletePollination to geneticsActions', () => {
            dispatcher.genetics.deletePollination('e1');
            expect(geneticsActions.deletePollination).toHaveBeenCalledWith(mockStore.context, 'e1');
        });

        it('should delegate fetchData to geneticsActions', () => {
            dispatcher.genetics.fetchData();
            expect(geneticsActions.fetchGeneticsData).toHaveBeenCalledWith(mockStore.context);
        });

        it('should delegate harvestSeeds to geneticsActions', () => {
            const data = { pollinationEventId: 'e1', seedCount: 15 } as any;
            dispatcher.genetics.harvestSeeds(data);
            expect(geneticsActions.harvestSeeds).toHaveBeenCalledWith(mockStore.context, data);
        });
    });

    describe('IPM Actions', () => {
        it('should delegate apply to ipmActions', () => {
            const detail = { preset: 'neem-oil', plantIds: ['p1'] } as any;
            dispatcher.ipm.apply(detail);
            expect(ipmActions.applyIPM).toHaveBeenCalledWith(mockStore.context, detail);
        });
    });
});
