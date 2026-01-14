
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GrowspaceHeader } from '../../../src/components/growspace-header';
import { ChartUtils } from '../../../src/utils/chart-utils';
import { html } from 'lit';

// Mock StoreController to be functional
vi.mock('@nanostores/lit', () => ({
    StoreController: class {
        constructor(host: any, atom: any) {
            this.atom = atom;
        }
        atom: any;
        get value() {
            return this.atom?.get?.() || this.atom?.value;
        }
    }
}));

// Mock directives
vi.mock('lit/directives/ref.js', () => ({
    createRef: () => ({ value: null }),
    ref: () => { }
}));

vi.mock('lit/directives/class-map.js', () => ({
    classMap: () => { }
}));

// Mock dependencies
vi.mock('../../../src/utils/metrics-utils', () => ({
    MetricsUtils: {
        computeHeaderMetrics: vi.fn().mockReturnValue({
            mainChips: [],
            deviceChips: [],
            dominant: undefined,
            envAttrs: {}
        })
    }
}));

vi.mock('../../../src/utils/chart-utils', () => ({
    ChartUtils: {
        generateSparklinePath: vi.fn(),
        getSparklineColor: vi.fn(),
        generateVpdSparklineSegments: vi.fn().mockReturnValue([])
    }
}));

vi.mock('../../../src/components/growspace-chip', () => ({
    GrowspaceChip: class extends HTMLElement { }
}));

vi.mock('../../../src/components/ui/nutrient-stock-chip', () => ({
    NutrientStockChip: class extends HTMLElement { }
}));

describe('GrowspaceHeader Coverage', () => {
    let element: GrowspaceHeader;
    let mockStore: any;
    let mockHass: any;

    beforeEach(() => {
        // Create functional mock atoms with value property for StoreController mock
        const createMockAtom = (initialValue: any) => ({
            get: vi.fn().mockReturnValue(initialValue),
            value: initialValue,
            subscribe: vi.fn()
        });

        // Create store with all necessary atoms
        mockStore = {
            ui: {
                setEditMode: vi.fn(),
                setViewMode: vi.fn(),
                setActiveDialog: vi.fn(),
                $activeDialog: { set: vi.fn() },
                $selectedPlants: { get: vi.fn().mockReturnValue(new Set()) },
                $viewMode: createMockAtom('standard'),
                $isEditMode: createMockAtom(false),
                $gridOverlayMode: createMockAtom('none')
            },
            data: {
                $devices: createMockAtom([]),
                $selectedDevice: createMockAtom(null),
                $nutrientInventory: createMockAtom(null)
            },
            history: {
                getRange: vi.fn().mockReturnValue('24h'),
                $historyCache: createMockAtom({}),
                $historyLoading: createMockAtom(false),
                $activeEnvGraphs: createMockAtom(new Set()),
                $linkedGraphGroups: createMockAtom([]),
                loadHistoryOnDemand: vi.fn(),
                linkGraphs: vi.fn(),
                unlinkGraphGroup: vi.fn()
            },
            $devices: createMockAtom([]),
            getDevices: vi.fn().mockReturnValue([]),

            openLogbookDialog: vi.fn(),
            openIPMDialog: vi.fn(),
            openAddPlantDialog: vi.fn(),
        };

        mockHass = {
            callService: vi.fn(),
            states: {}
        };

        element = new GrowspaceHeader();
        (element as any).store = mockStore;
        (element as any).hass = mockHass;

        element.device = {
            device_id: 'gs1',
            name: 'GS1',
            overview_entity_id: 'sensor.overview',
            environment_attributes: { dehumidifier_control_enabled: false }
        } as any;

        // Setup initial controllers
        (element as any)._selectedDeviceController = { value: 'gs1' };
        (element as any)._isEditModeController = { value: false };
        (element as any)._viewModeController = { value: 'standard' };
        (element as any)._devicesController = { value: [] };
        (element as any)._activeEnvGraphsController = { value: new Set() };
        (element as any)._nutrientInventoryController = { value: null };
        (element as any)._historyCacheController = { value: {} };
        (element as any)._resizeController = { isMobile: false, hasTouch: false };
    });

    describe('Sanity Check', () => {
        it('should be instantiated', () => {
            expect(element).toBeInstanceOf(GrowspaceHeader);
        });

        it('should have _triggerAction method', () => {
            expect(GrowspaceHeader.prototype['_triggerAction']).toBeDefined();
            expect((element as any)._triggerAction).toBeDefined();
        });
    });

    describe('_triggerAction Coverage', () => {
        it('should handle "edit" action', () => {
            (element as any)._triggerAction('edit');
            expect(mockStore.ui.setEditMode).toHaveBeenCalledWith(true);
        });

        it('should handle "compact" action', () => {
            (element as any)._triggerAction('compact');
            expect(mockStore.ui.setViewMode).toHaveBeenCalledWith('compact');

            // Toggle back
            (element as any)._viewModeController = { value: 'compact' };
            (element as any)._triggerAction('compact');
            expect(mockStore.ui.setViewMode).toHaveBeenCalledWith('standard');
        });

        it('should handle "strains" action', () => {
            (element as any)._triggerAction('strains');
            expect(mockStore.ui.setActiveDialog).toHaveBeenCalledWith({ type: 'STRAIN_LIBRARY', payload: {} });
        });

        it('should handle "irrigation" action', () => {
            (element as any)._triggerAction('irrigation');
            expect(mockStore.ui.$activeDialog.set).toHaveBeenCalledWith({ type: 'IRRIGATION', payload: {} });
        });

        it('should handle "ai" action', () => {
            (element as any)._triggerAction('ai');
            expect(mockStore.ui.$activeDialog.set).toHaveBeenCalledWith({
                type: 'GROW_MASTER',
                payload: expect.objectContaining({ growspaceId: 'gs1', mode: 'single' })
            });
        });

        it('should handle "logbook" action', () => {
            (element as any)._triggerAction('logbook');
            expect(mockStore.openLogbookDialog).toHaveBeenCalled();
        });

        it('should handle "water" action for growspace', () => {
            (element as any)._triggerAction('water');
            expect(mockStore.ui.$activeDialog.set).toHaveBeenCalledWith({
                type: 'WATERING',
                payload: expect.objectContaining({ mode: 'growspace', growspaceId: 'gs1' })
            });
        });

        it('should handle "water" action for plants', () => {
            mockStore.ui.$selectedPlants.get.mockReturnValue(new Set(['p1']));
            (element as any)._triggerAction('water');
            expect(mockStore.ui.$activeDialog.set).toHaveBeenCalledWith({
                type: 'WATERING',
                payload: expect.objectContaining({ mode: 'plant', plantIds: ['p1'] })
            });
        });

        it('should handle "nutrient_presets" action', () => {
            (element as any)._triggerAction('nutrient_presets');
            expect(mockStore.ui.setActiveDialog).toHaveBeenCalledWith({ type: 'NUTRIENTS', payload: {} });
        });

        it('should handle "control_dehumidifier" action', () => {
            // Need device overview entity
            element.device = { ...element.device, overview_entity_id: 'sensor.overview' } as any;
            (element as any)._envAttrs = { dehumidifier_control_enabled: true };

            (element as any)._triggerAction('control_dehumidifier');

            expect(mockHass.callService).toHaveBeenCalledWith(
                'growspace_manager',
                'update_environment_config',
                expect.objectContaining({
                    growspace_id: 'gs1',
                    dehumidifier_control_enabled: false
                })
            );
        });

        it('should handle "ipm" action', () => {
            (element as any)._triggerAction('ipm');
            expect(mockStore.openIPMDialog).toHaveBeenCalledWith({ growspaceId: 'gs1' });
        });

        it('should handle "nutrient_inventory" action', () => {
            (element as any)._triggerAction('nutrient_inventory');
            expect(mockStore.ui.setActiveDialog).toHaveBeenCalledWith({ type: 'NUTRIENTS', payload: {} });
        });

        it('should handle "nutrients" action', () => {
            (element as any)._triggerAction('nutrients');
            expect(mockStore.ui.setActiveDialog).toHaveBeenCalledWith({ type: 'NUTRIENTS', payload: {} });
        });
    });

    describe('_renderHeroCard VPD Logic', () => {
        it('should generate VPD segments when data is available', () => {
            // Setup
            const isVpd = true;
            (element as any)._historyCacheController = {
                value: {
                    'vpd': [1, 2, 3],
                    'light': [0, 1, 0]
                }
            };

            // Mock generateVpdSparklineSegments
            const spy = (ChartUtils.generateVpdSparklineSegments as any);
            spy.mockReturnValue([{ path: 'M0,0', color: 'red' }]);

            const chip = { key: 'vpd', value: '1.2 kPa' };
            const result = (element as any)._renderHeroCard(chip);

            expect(spy).toHaveBeenCalled();
        });
    });

    describe('Nutrient Inventory Rendering', () => {
        it('should render nutrient stock chips when inventory exists', async () => {
            const inventoryData = {
                stocks: {
                    'n1': { id: 'n1', name: 'CalMag', quantity: 1, unit: 'L' }
                }
            };

            if (!customElements.get('growspace-header-coverage-test-3')) {
                customElements.define('growspace-header-coverage-test-3', class extends GrowspaceHeader { });
            }
            const testEl = document.createElement('growspace-header-coverage-test-3') as GrowspaceHeader;

            // Prepare store with atom returning data -> used by connectedCallback -> used by render
            const specificStore = { ...mockStore };
            specificStore.data.$nutrientInventory = {
                get: vi.fn().mockReturnValue(inventoryData),
                value: inventoryData,
                subscribe: vi.fn() // StoreController needs this
            };

            (testEl as any).store = specificStore;
            (testEl as any).hass = mockHass;
            (testEl as any).config = {};
            (testEl as any).device = element.device;

            // Mock resize controller
            (testEl as any)._resizeController = { isMobile: false, hasTouch: false };
            // Mock main chips to trigger secondary strip render
            (testEl as any)._mainChips = [];

            document.body.appendChild(testEl);
            await testEl.updateComplete;

            testEl.requestUpdate();
            await testEl.updateComplete;

            const secondaryStrip = testEl.shadowRoot?.querySelector('.secondary-strip');
            const stockChip = secondaryStrip?.querySelector('nutrient-stock-chip');

            expect(stockChip).toBeTruthy();

            if (stockChip) {
                (stockChip as HTMLElement).click();
                expect(mockStore.ui.setActiveDialog).toHaveBeenCalledWith({ type: 'NUTRIENTS', payload: {} });
            }

            document.body.removeChild(testEl);
        });
    });
});
