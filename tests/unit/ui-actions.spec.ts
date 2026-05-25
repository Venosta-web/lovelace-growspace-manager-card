import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    setIsCompactView,
    toggleHeaderExpansion,
    togglePlantSelection,
    selectAllPlants,
    clearPlantSelection,
    exitEditMode,
    handlePlantClick,
    handleDeepLink,
    openBatchWateringDialog,
    openBatchTrainingDialog,
    openAddPlantDialog,
    openStrainRecommendationDialog,
    openNutrientPresetsDialog,
    openIPMDialog,
    openLogbookDialog,
    exportStrainLibrary,
    openConfigDialog,
    openStrainLibraryDialog,
    openIrrigationDialog,
    openGrowMasterDialog,
    openWateringDialog,
    openTrainingDialog,
    openNutrientsDialog,
} from '../../src/store/ui/ui-actions';
import { ActionContext } from '../../src/store/core/action-context';
import { ViewMode, ConfigTab } from '../../src/constants';
import * as libraryActions from '../../src/store/plant/library-actions';

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
    saveIPMPreset: vi.fn(),
    saveNutrientPreset: vi.fn(),
    removeNutrientPreset: vi.fn(),
    removeIPMPreset: vi.fn(),
}));

describe('ui-actions', () => {
    let ctx: ActionContext;
    let setActiveDialogSpy: any;
    let setViewModeSpy: any;
    let togglePlantSelectionSpy: any;
    let selectAllPlantsSpy: any;
    let clearPlantSelectionSpy: any;
    let setEditModeSpy: any;
    let setPendingDeepLinkSpy: any;
    let showToastSpy: any;
    let mockUIState: any;

    beforeEach(() => {
        setActiveDialogSpy = vi.fn();
        setViewModeSpy = vi.fn();
        togglePlantSelectionSpy = vi.fn();
        selectAllPlantsSpy = vi.fn();
        clearPlantSelectionSpy = vi.fn();
        setEditModeSpy = vi.fn();
        setPendingDeepLinkSpy = vi.fn();
        showToastSpy = vi.fn();

        mockUIState = {
            $viewMode: { get: vi.fn(() => ViewMode.STANDARD) },
            $isEditMode: { get: vi.fn(() => false) },
            $selectedPlants: { get: vi.fn(() => new Set<string>()) }
        };

        ctx = {
            ui: {
                showToast: vi.fn(),
                setActiveDialog: setActiveDialogSpy,
                setViewMode: setViewModeSpy,
                togglePlantSelection: togglePlantSelectionSpy,
                selectAllPlants: selectAllPlantsSpy,
                clearPlantSelection: clearPlantSelectionSpy,
                setEditMode: setEditModeSpy,
                setPendingDeepLink: setPendingDeepLinkSpy,
                ...mockUIState
            },
            data: {
                $devices: { get: vi.fn(() => []) },
                $optimisticDeletedPlantIds: { get: vi.fn(() => new Set()) },
                $plantToDeviceMap: { get: vi.fn(() => new Map()) }
            },
            grid: {
                $selectedDevice: { get: vi.fn() },
            },
            dataService: {
                fetchStrainLibrary: vi.fn(),
                fetchIPMPresets: vi.fn(),
            },
            showToast: showToastSpy
        } as unknown as ActionContext;
    });

    describe('View Mode Actions', () => {
        it('setIsCompactView should set compact mode when value is true', () => {
            setIsCompactView(ctx, true);
            expect(setViewModeSpy).toHaveBeenCalledWith(ViewMode.COMPACT);
        });

        it('setIsCompactView should restore standard mode when value is false and currently compact', () => {
            mockUIState.$viewMode.get.mockReturnValue(ViewMode.COMPACT);
            setIsCompactView(ctx, false);
            expect(setViewModeSpy).toHaveBeenCalledWith(ViewMode.STANDARD);
        });

        it('toggleHeaderExpansion should toggle to header mode', () => {
            mockUIState.$viewMode.get.mockReturnValue(ViewMode.STANDARD);
            toggleHeaderExpansion(ctx);
            expect(setViewModeSpy).toHaveBeenCalledWith(ViewMode.HEADER);
        });

        it('toggleHeaderExpansion should toggle back to standard mode', () => {
            mockUIState.$viewMode.get.mockReturnValue(ViewMode.HEADER);
            toggleHeaderExpansion(ctx);
            expect(setViewModeSpy).toHaveBeenCalledWith(ViewMode.STANDARD);
        });
    });

    describe('Plant Selection Actions', () => {
        it('togglePlantSelection should toggle selection for string id', () => {
            togglePlantSelection(ctx, 'p1');
            expect(togglePlantSelectionSpy).toHaveBeenCalledWith('p1');
        });

        it('togglePlantSelection should toggle selection for plant entity', () => {
            const plant = { attributes: { plant_id: 'p1' } } as any;
            togglePlantSelection(ctx, plant);
            expect(togglePlantSelectionSpy).toHaveBeenCalledWith('p1');
        });

        it('selectAllPlants should do nothing if no device selected', () => {
            (ctx.grid.$selectedDevice.get as any).mockReturnValue(null);
            selectAllPlants(ctx);
            expect(selectAllPlantsSpy).not.toHaveBeenCalled();
        });

        it('selectAllPlants should select all valid plant ids', () => {
            (ctx.grid.$selectedDevice.get as any).mockReturnValue('dev1');
            (ctx.data.$devices.get as any).mockReturnValue([
                {
                    deviceId: 'dev1',
                    plants: [
                        { attributes: { plant_id: 'p1' } },
                        { attributes: { plant_id: 'p2' } }
                    ]
                }
            ]);

            selectAllPlants(ctx);
            expect(selectAllPlantsSpy).toHaveBeenCalledWith(['p1', 'p2']);
        });

        it('clearPlantSelection should clear selection', () => {
            clearPlantSelection(ctx);
            expect(clearPlantSelectionSpy).toHaveBeenCalled();
        });

        it('exitEditMode should disable edit mode and clear selection', () => {
            exitEditMode(ctx);
            expect(setEditModeSpy).toHaveBeenCalledWith(false);
            expect(clearPlantSelectionSpy).toHaveBeenCalled();
        });
    });

    describe('Navigation & Dialogs', () => {
        it('handlePlantClick should open overview dialog in normal mode', () => {
            const plant = { attributes: { plant_id: 'p1' } } as any;
            handlePlantClick(ctx, plant);
            expect(setActiveDialogSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'PLANT_OVERVIEW' }));
        });

        it('handlePlantClick should toggle selection in edit mode', () => {
            const plant = { attributes: { plant_id: 'p1' } } as any;
            mockUIState.$isEditMode.get.mockReturnValue(true);
            mockUIState.$selectedPlants.get.mockReturnValue(new Set(['p2'])); // One selected to ensure we are in multi-select flow

            handlePlantClick(ctx, plant);
            expect(togglePlantSelectionSpy).toHaveBeenCalledWith('p1');
        });

        it('handleDeepLink should set pending link if devices not ready', () => {
            (ctx.data.$devices.get as any).mockReturnValue([]);
            handleDeepLink(ctx, 'p1');
            expect(setPendingDeepLinkSpy).toHaveBeenCalledWith('p1');
        });

        it('handleDeepLink should open dialog if plant found', () => {
            const plant = { attributes: { plant_id: 'p1' } } as any;
            (ctx.data.$devices.get as any).mockReturnValue([
                { plants: [plant] }
            ]);

            handleDeepLink(ctx, 'p1');

            expect(setActiveDialogSpy).toHaveBeenCalled();
            expect(setPendingDeepLinkSpy).toHaveBeenCalledWith(null);
        });

        it('handleDeepLink should warn provided plant is not found', () => {
            (ctx.data.$devices.get as any).mockReturnValue([
                { plants: [] }
            ]);
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => { });

            handleDeepLink(ctx, 'p1');

            expect(spy).toHaveBeenCalled();
            expect(setPendingDeepLinkSpy).toHaveBeenCalledWith(null);
            spy.mockRestore();
        });
    });


    describe('Batch Actions', () => {
        it('openBatchWateringDialog', () => {
            mockUIState.$selectedPlants.get.mockReturnValue(new Set(['p1']));
            (ctx.data.$plantToDeviceMap.get as any).mockReturnValue(new Map([['p1', 'gs1']]));

            openBatchWateringDialog(ctx);
            expect(setActiveDialogSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'WATERING' }));
        });

        it('openBatchTrainingDialog', () => {
            mockUIState.$selectedPlants.get.mockReturnValue(new Set(['p1']));
            (ctx.data.$plantToDeviceMap.get as any).mockReturnValue(new Map([['p1', 'gs1']]));

            openBatchTrainingDialog(ctx);
            expect(setActiveDialogSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'TRAINING' }));
        });
    });

    describe('Add Plant Dialog', () => {
        it('should open with specific coordinates', () => {
            openAddPlantDialog(ctx, 1, 1);
            expect(libraryActions.fetchStrainLibrary).toHaveBeenCalled();
            expect(setActiveDialogSpy).toHaveBeenCalledWith(expect.objectContaining({
                type: 'ADD_PLANT',
                payload: { row: 1, col: 1 }
            }));
        });

        it('should find first empty slot if no coordinates provided', () => {
            (ctx.grid.$selectedDevice.get as any).mockReturnValue('dev1');
            (ctx.data.$devices.get as any).mockReturnValue([
                {
                    deviceId: 'dev1',
                    rows: 2,
                    plantsPerRow: 2,
                    plants: [
                        { attributes: { row: 1, col: 1 }, entity_id: 'sensor.plant1' } // 0,0 occupied
                    ]
                }
            ]);

            openAddPlantDialog(ctx);
            expect(setActiveDialogSpy).toHaveBeenCalledWith(expect.objectContaining({
                payload: { row: 0, col: 1 } // Next slot
            }));
        });
    });

    describe('Simple Dialogs', () => {
        it('should open strain recommendation', () => {
            openStrainRecommendationDialog(ctx);
            expect(setActiveDialogSpy).toHaveBeenCalledWith({ type: 'STRAIN_RECOMMENDATION', payload: expect.any(Object) });
        });

        it('should open nutrient presets', () => {
            openNutrientPresetsDialog(ctx);
            expect(libraryActions.fetchNutrientPresets).toHaveBeenCalled();
            expect(setActiveDialogSpy).toHaveBeenCalledWith({ type: 'NUTRIENT_PRESETS', payload: {} });
        });

        it('should open IP dialog', () => {
            openIPMDialog(ctx);
            expect(libraryActions.fetchIPMPresets).toHaveBeenCalled();
            expect(setActiveDialogSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'IPM' }));
        });

        it('should open logbook dialog', () => {
            (ctx.grid.$selectedDevice.get as any).mockReturnValue('gs1');
            openLogbookDialog(ctx);
            expect(setActiveDialogSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'LOGBOOK' }));
        });
    });

    describe('Export', () => {
        it('exportStrainLibrary should trigger download', async () => {
            const library = { strains: [] };
            (ctx.dataService.fetchStrainLibrary as any).mockResolvedValue(library);

            // Mock DOM elements
            const linkMock = {
                setAttribute: vi.fn(),
                click: vi.fn(),
                remove: vi.fn()
            };
            const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(linkMock as any);
            const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockReturnValue(linkMock as any);

            await exportStrainLibrary(ctx);

            expect(ctx.dataService.fetchStrainLibrary).toHaveBeenCalled();
            expect(createElementSpy).toHaveBeenCalledWith('a');
            expect(linkMock.click).toHaveBeenCalled();
        });

        it('exportStrainLibrary handle errors', async () => {
            (ctx.dataService.fetchStrainLibrary as any).mockRejectedValue(new Error('fail'));
            const spy = vi.spyOn(console, 'error').mockImplementation(() => { });

            await exportStrainLibrary(ctx);

            expect(ctx.ui.showToast).toHaveBeenCalledWith('Failed to export library', 'error');
            spy.mockRestore();
        });
    });

    describe('openConfigDialog', () => {
        it('should handle undefined device with defaults', () => {
            openConfigDialog(ctx, undefined);

            expect(setActiveDialogSpy).toHaveBeenCalledWith({
                type: 'CONFIG',
                payload: expect.objectContaining({
                    currentTab: ConfigTab.SENSORS,
                    environmentData: expect.objectContaining({
                        selectedGrowspaceId: '',
                        temperatureSensor: '',
                        dehumidifierControlEnabled: false,
                        dehumidifierThresholds: {}
                    })
                })
            });
        });

        it('should map device attributes correctly', () => {
            const mockDevice = {
                deviceId: 'dev1',
                environmentAttributes: {
                    temperatureSensor: 'sensor.temp',
                    humiditySensor: 'sensor.hum',
                    vpdSensor: 'sensor.vpd',
                    co2Sensor: 'sensor.co2',
                    circulationFanEntity: 'fan.circ',
                    lightSensor: 'sensor.light',
                    exhaustEntity: 'fan.exhaust',
                    humidifierEntity: 'humidifier.main',
                    dehumidifierEntity: 'dehumidifier.main',
                    soilMoistureSensor: 'sensor.soil',
                    dehumidifierControlEnabled: true,
                    dehumidifierThresholds: { min: 40, max: 60 }
                }
            } as any;

            openConfigDialog(ctx, mockDevice);

            expect(setActiveDialogSpy).toHaveBeenCalledWith({
                type: 'CONFIG',
                payload: expect.objectContaining({
                    environmentData: expect.objectContaining({
                        selectedGrowspaceId: 'dev1',
                        temperatureSensor: 'sensor.temp',
                        dehumidifierControlEnabled: true,
                        dehumidifierThresholds: { min: 40, max: 60 }
                    })
                })
            });
        });
    });

    describe('openWateringDialog', () => {
        it('should default to growspace mode if no plants provided', () => {
            openWateringDialog(ctx, { growspaceId: 'gs1' });
            expect(setActiveDialogSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    payload: expect.objectContaining({
                        mode: 'growspace',
                        growspaceId: 'gs1'
                    })
                })
            );
        });

        it('should default to plant mode if plants provided', () => {
            openWateringDialog(ctx, { plantIds: ['p1'] });
            expect(setActiveDialogSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    payload: expect.objectContaining({
                        mode: 'plant',
                        plantIds: ['p1']
                    })
                })
            );
        });

        it('should respect explicit mode', () => {
            openWateringDialog(ctx, { plantIds: ['p1'], mode: 'growspace' });
            expect(setActiveDialogSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    payload: expect.objectContaining({
                        mode: 'growspace'
                    })
                })
            );
        });
    });

    describe('Simple Dialogs', () => {
        it('should open strain library', () => {
            openStrainLibraryDialog(ctx);
            expect(setActiveDialogSpy).toHaveBeenCalledWith({ type: 'STRAIN_LIBRARY', payload: {} });
        });

        it('should open irrigation dialog', () => {
            openIrrigationDialog(ctx);
            expect(setActiveDialogSpy).toHaveBeenCalledWith({ type: 'IRRIGATION', payload: {} });
        });

        it('should open irrigation dialog with initialTab and scrollToField', () => {
            openIrrigationDialog(ctx, { initialTab: 'steering', scrollToField: 'lightsOnTime' });
            expect(setActiveDialogSpy).toHaveBeenCalledWith({
                type: 'IRRIGATION',
                payload: { initialTab: 'steering', scrollToField: 'lightsOnTime' },
            });
        });

        it('should open irrigation dialog with only initialTab', () => {
            openIrrigationDialog(ctx, { initialTab: 'steering' });
            expect(setActiveDialogSpy).toHaveBeenCalledWith({
                type: 'IRRIGATION',
                payload: { initialTab: 'steering' },
            });
        });

        it('should open nutrients dialog', () => {
            openNutrientsDialog(ctx);
            expect(setActiveDialogSpy).toHaveBeenCalledWith({ type: 'NUTRIENTS', payload: {} });
        });
    });

    describe('openGrowMasterDialog', () => {
        it('should open with correct initial state', () => {
            openGrowMasterDialog(ctx, 'gs1');
            expect(setActiveDialogSpy).toHaveBeenCalledWith({
                type: 'GROW_MASTER',
                payload: {
                    growspaceId: 'gs1',
                    isLoading: false,
                    response: '',
                    mode: 'single'
                }
            });
        });
    });

    describe('openTrainingDialog', () => {
        it('should pass plantIds and growspaceId', () => {
            openTrainingDialog(ctx, ['p1'], 'gs1');
            expect(setActiveDialogSpy).toHaveBeenCalledWith({
                type: 'TRAINING',
                payload: {
                    isOpen: true,
                    plantIds: ['p1'],
                    growspaceId: 'gs1'
                }
            });
        });
    });
});
