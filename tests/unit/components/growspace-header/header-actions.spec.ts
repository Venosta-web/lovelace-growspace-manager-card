import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { html } from 'lit';
import { fixture, elementUpdated } from '@open-wc/testing-helpers';
import '../../../../src/components/growspace-header/header-actions';
import { GrowspaceHeaderActions } from '../../../../src/components/growspace-header/header-actions';

// Mock dependencies
vi.mock('../../../../src/components/growspace-chip', () => ({
    GrowspaceChip: class extends HTMLElement { }
}));

vi.mock('../../../../src/components/ui/scroll-container', () => ({
    ScrollContainer: class extends HTMLElement { }
}));

import { atom, map } from 'nanostores';

describe('GrowspaceHeaderActions', () => {
    let element: GrowspaceHeaderActions;
    let mockStore: any;
    let mockHass: any;

    beforeEach(async () => {
        const $viewMode = atom('standard');
        const $isEditMode = atom(false);
        const $selectedPlants = atom(new Set<string>());
        const $selectedDevice = atom<string | null>('gs1');
        const $devices = atom<any[]>([{ deviceId: 'gs1', name: 'Growspace 1' }]);

        mockStore = {
            openStrainLibraryDialog: vi.fn(),
            openIrrigationDialog: vi.fn(),
            openGrowMasterDialog: vi.fn(),
            openLogbookDialog: vi.fn(),
            openWateringDialog: vi.fn(),
            openIPMDialog: vi.fn(),
            openNutrientsDialog: vi.fn(),
            openConfigDialog: vi.fn(),
            openAddPlantDialog: vi.fn(),
            openTrainingDialog: vi.fn(),
            ui: {
                $viewMode,
                $isEditMode,
                $selectedPlants,
                setViewMode: vi.fn((mode) => $viewMode.set(mode)),
                setEditMode: vi.fn((val) => $isEditMode.set(val)),
            },
            history: {
                linkGraphs: vi.fn(),
            },
            data: {
                $selectedDevice,
                $devices
            }
        };

        mockHass = {
            callService: vi.fn()
        };

        element = await fixture(html`
            <growspace-header-actions 
                .store=${mockStore} 
                .hass=${mockHass}
                .deviceChips=${[]}
            ></growspace-header-actions>
        `);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should be instantiated', () => {
        expect(element).toBeInstanceOf(GrowspaceHeaderActions);
    });

    describe('Actions', () => {
        // Trigger action manually since button clicks might be hard to simulate if hidden in menu
        // But we can test the private _triggerAction method if we cast to any, or click logic if accessible.
        // The component exposes _triggerAction for internal use, we can test that.

        it('should handle "edit" action', () => {
            (element as any)._triggerAction('edit');
            expect(mockStore.ui.setEditMode).toHaveBeenCalledWith(true);
        });

        it('should handle "compact" action', () => {
            (element as any)._triggerAction('compact');
            expect(mockStore.ui.setViewMode).toHaveBeenCalledWith('compact');
        });

        it('should handle "strains" action', () => {
            (element as any)._triggerAction('strains');
            expect(mockStore.openStrainLibraryDialog).toHaveBeenCalled();
        });

        it('should handle "irrigation" action', () => {
            (element as any)._triggerAction('irrigation');
            expect(mockStore.openIrrigationDialog).toHaveBeenCalled();
        });

        it('should handle "ai" action', () => {
            (element as any)._triggerAction('ai');
            expect(mockStore.openGrowMasterDialog).toHaveBeenCalled();
        });

        it('should handle "logbook" action', () => {
            (element as any)._triggerAction('logbook');
            expect(mockStore.openLogbookDialog).toHaveBeenCalled();
        });

        it('should handle "water" action', () => {
            (element as any)._triggerAction('water');
            expect(mockStore.openWateringDialog).toHaveBeenCalled();
        });

        it('should handle "ipm" action', () => {
            (element as any)._triggerAction('ipm');
            expect(mockStore.openIPMDialog).toHaveBeenCalled();
        });

        it('should handle "nutrients" action', () => {
            (element as any)._triggerAction('nutrients');
            expect(mockStore.openNutrientsDialog).toHaveBeenCalled();
        });

        it('should handle "config" action', () => {
            (element as any)._triggerAction('config');
            expect(mockStore.openConfigDialog).toHaveBeenCalled();
        });

        it('should handle "add_plant" action', () => {
            (element as any)._triggerAction('add_plant');
            expect(mockStore.openAddPlantDialog).toHaveBeenCalled();
        });

        it('should handle "compact" action (standard to compact)', () => {
            mockStore.ui.$viewMode.set('standard');
            (element as any)._triggerAction('compact');
            expect(mockStore.ui.setViewMode).toHaveBeenCalledWith('compact');
        });

        it('should handle "compact" action (compact to standard)', () => {
            mockStore.ui.$viewMode.set('compact');
            (element as any)._triggerAction('compact');
            expect(mockStore.ui.setViewMode).toHaveBeenCalledWith('standard');
        });

        it('should handle "water" action without selected plants', () => {
            mockStore.ui.$selectedPlants.set(new Set());
            (element as any)._triggerAction('water');
            expect(mockStore.openWateringDialog).toHaveBeenCalledWith({
                plantIds: undefined,
                growspaceId: 'gs1',
                mode: 'growspace'
            });
        });

        it('should handle "water" action with selected plants', () => {
            mockStore.ui.$selectedPlants.set(new Set(['p1', 'p2']));
            (element as any)._triggerAction('water');
            expect(mockStore.openWateringDialog).toHaveBeenCalledWith({
                plantIds: ['p1', 'p2'],
                growspaceId: 'gs1',
                mode: 'plant'
            });
        });

        it('should handle "training" action', () => {
            mockStore.ui.$selectedPlants.set(new Set(['p1']));
            (element as any)._triggerAction('training');
            expect(mockStore.openTrainingDialog).toHaveBeenCalledWith(['p1'], 'gs1');
        });

        it('should handle "irrigation" action', () => {
            (element as any)._triggerAction('irrigation');
            expect(mockStore.openIrrigationDialog).toHaveBeenCalled();
        });

        it('should handle "ai" action', () => {
            (element as any)._triggerAction('ai');
            expect(mockStore.openGrowMasterDialog).toHaveBeenCalledWith('gs1');
        });

        it('should handle "strains" action', () => {
            (element as any)._triggerAction('strains');
            expect(mockStore.openStrainLibraryDialog).toHaveBeenCalled();
        });

        it('should handle "logbook" action', () => {
            (element as any)._triggerAction('logbook');
            expect(mockStore.openLogbookDialog).toHaveBeenCalled();
        });

        it('should handle chip drag start', () => {
            const spy = vi.fn();
            element.addEventListener('chip-drag-start', spy);
            (element as any)._handleChipDragStart({ dataTransfer: { setData: vi.fn(), effectAllowed: '' } } as any, 'co2');
            expect(spy).toHaveBeenCalled();
            expect((element as any)._draggedMetric).toBe('co2');
        });

        it('should handle chip drop and link graphs', () => {
            (element as any)._draggedMetric = 'co2';
            (element as any)._handleChipDrop({ preventDefault: vi.fn() } as any, 'vpd');
            expect(mockStore.history.linkGraphs).toHaveBeenCalledWith('co2', 'vpd');
        });

        it('should handle unlink-graphs event', () => {
            const spy = vi.fn();
            element.addEventListener('unlink-graphs', spy);
            (element as any)._unlinkGraphs(1);
            expect(spy).toHaveBeenCalled();
            expect(spy.mock.calls[0][0].detail.groupIndex).toBe(1);
        });

        it('should handle toggle-graph event', () => {
            const spy = vi.fn();
            element.addEventListener('toggle-graph', spy);
            (element as any)._toggleEnvGraph('co2');
            expect(spy).toHaveBeenCalled();
            expect(spy.mock.calls[0][0].detail.metric).toBe('co2');
        });
    });

    describe('Rendering and DOM Interactions', () => {
        it('should render device chips', async () => {
            element.deviceChips = [{
                key: 'temp',
                label: 'Temp',
                value: '25°C',
                icon: '',
                status: 'normal',
                active: false,
                linked: false,
                tooltip: '',
                groupIndex: 0
            }];
            await elementUpdated(element);
            const chip = element.shadowRoot?.querySelector('growspace-chip');
            expect(chip).toBeDefined();
        });

        it('should handle mobile and mobileLink branches', async () => {
            element.isMobile = true;
            element.mobileLink = true;
            await elementUpdated(element);

            expect((element as any)._chipDraggable).toBe('true');

            const mobileLinkBtn = element.shadowRoot?.querySelector('.mobile-link');
            expect(mobileLinkBtn).toBeDefined();
            expect(mobileLinkBtn?.classList.contains('active')).toBe(true);

            const spy = vi.fn();
            element.addEventListener('toggle-mobile-link', spy);
            (mobileLinkBtn as HTMLElement).click();
            expect(spy).toHaveBeenCalled();

            element.mobileLink = false;
            await elementUpdated(element);
            expect((element as any)._chipDraggable).toBe('false');
        });

        it('should handle internal chip interactions', async () => {
            element.deviceChips = [{
                key: 'temp',
                label: 'Temp',
                value: '25°C',
                icon: '',
                status: 'normal',
                active: false,
                linked: false,
                tooltip: '',
                groupIndex: 0
            }];
            await elementUpdated(element);
            const chip = element.shadowRoot?.querySelector('growspace-chip') as HTMLElement;

            // Toggle graph
            const toggleSpy = vi.fn();
            element.addEventListener('toggle-graph', toggleSpy);
            chip.click();
            expect(toggleSpy).toHaveBeenCalledWith(expect.objectContaining({ detail: { metric: 'temp' } }));

            // Unlink
            const unlinkSpy = vi.fn();
            element.addEventListener('unlink-graphs', unlinkSpy);
            chip.dispatchEvent(new CustomEvent('unlink'));
            expect(unlinkSpy).toHaveBeenCalledWith(expect.objectContaining({ detail: { groupIndex: 0 } }));

            // Drag Over
            const preventDefault = vi.fn();
            (element as any)._draggedMetric = 'vpd';
            chip.dispatchEvent(new DragEvent('dragover', { cancelable: true } as any));
            element.shadowRoot?.querySelector('.chips-wrapper')?.dispatchEvent(new DragEvent('dragover', { cancelable: true })); // coverage for _handleDragOver
        });

        it('should test _triggerAction more thoroughly', async () => {
            // Test config with missing device
            mockStore.data.$devices.set([]);
            (element as any)._triggerAction('config');
            expect(mockStore.openConfigDialog).not.toHaveBeenCalled();

            // Test irrigation with missing selected device
            mockStore.data.$selectedDevice.set(null);
            (element as any)._triggerAction('irrigation');
            expect(mockStore.openIrrigationDialog).not.toHaveBeenCalled();

            // Test ipm with fallback device
            mockStore.data.$devices.set([{ deviceId: 'fallback' }]);
            (element as any)._triggerAction('ipm');
            expect(mockStore.openIPMDialog).toHaveBeenCalledWith(expect.objectContaining({ growspaceId: 'fallback' }));

            // Test popover hiding
            const menu = document.createElement('div');
            (menu as any).hidePopover = vi.fn();
            vi.spyOn(element.shadowRoot!, 'getElementById').mockReturnValue(menu);
            (element as any)._triggerAction('edit');
            expect((menu as any).hidePopover).toHaveBeenCalled();
        });

        it('should handle chip drop edge cases', () => {
            const preventDefault = vi.fn();
            const e = { preventDefault } as any;

            // Same metric drop
            (element as any)._draggedMetric = 'temp';
            (element as any)._handleChipDrop(e, 'temp');
            expect(mockStore.history.linkGraphs).not.toHaveBeenCalled();

            // No dragged metric
            (element as any)._draggedMetric = null;
            (element as any)._handleChipDrop(e, 'temp');
            expect(mockStore.history.linkGraphs).not.toHaveBeenCalled();

            // History link
            (element as any)._draggedMetric = 'temp';
            (element as any)._handleChipDrop(e, 'vpd');
            expect(mockStore.history.linkGraphs).toHaveBeenCalledWith('temp', 'vpd');
        });

        it('should handle chip drag start without dataTransfer', () => {
            const e = { dataTransfer: null } as any;
            (element as any)._handleChipDragStart(e, 'temp');
            expect((element as any)._draggedMetric).toBe('temp');
        });

        it('should test menu clicks to cover template handlers', async () => {
            await elementUpdated(element);
            const menuItems = element.shadowRoot?.querySelectorAll('.menu-item');

            // Re-render to ensure we have all items
            expect(menuItems?.length).toBeGreaterThan(5);

            // Click each item once to cover the inline arrow functions
            (menuItems?.[0] as HTMLElement).click(); // Settings
            (menuItems?.[1] as HTMLElement).click(); // Edit
            (menuItems?.[2] as HTMLElement).click(); // Water
            (menuItems?.[3] as HTMLElement).click(); // Irrigation
            (menuItems?.[4] as HTMLElement).click(); // IPM
            (menuItems?.[5] as HTMLElement).click(); // Training
            (menuItems?.[6] as HTMLElement).click(); // Nutrients
            (menuItems?.[7] as HTMLElement).click(); // Add Plant
            (menuItems?.[8] as HTMLElement).click(); // Strains
            (menuItems?.[9] as HTMLElement).click(); // Logbook
            (menuItems?.[10] as HTMLElement).click(); // Ask AI

            expect(mockStore.openGrowMasterDialog).toHaveBeenCalled();
        });

        it('should cover inline drag handlers', async () => {
            element.deviceChips = [{
                key: 'temp',
                label: 'Temp',
                value: '25°C',
                icon: '',
                status: 'normal',
                active: false,
                linked: false,
                tooltip: '',
                groupIndex: 0
            }];
            await elementUpdated(element);
            const chip = element.shadowRoot?.querySelector('growspace-chip') as HTMLElement;

            // Trigger dragstart and drop on the element to cover inline handlers (e) => ...
            chip.dispatchEvent(new DragEvent('dragstart', { dataTransfer: new DataTransfer() } as any));
            chip.dispatchEvent(new DragEvent('drop', { dataTransfer: new DataTransfer() } as any));

            expect((element as any)._draggedMetric).toBe(null); // Reset after drop
        });

        it('should handle missing store in connectedCallback', async () => {
            const detached = document.createElement('growspace-header-actions') as GrowspaceHeaderActions;
            // No store set
            document.body.appendChild(detached);
            expect((detached as any)._viewModeController).toBeUndefined();
            document.body.removeChild(detached);
        });

        it('should handle popover error in _triggerAction', () => {
            const menu = document.createElement('div');
            (menu as any).hidePopover = () => { throw new Error('Popover error'); };
            vi.spyOn(element.shadowRoot!, 'getElementById').mockReturnValue(menu);

            // Should not throw
            expect(() => (element as any)._triggerAction('edit')).not.toThrow();
        });

        it('should handle fallback growspaceId in ipm action', () => {
            mockStore.data.$selectedDevice.set(null);
            mockStore.data.$devices.set([{ deviceId: 'gs-fallback' }]);
            (element as any)._triggerAction('ipm');
            expect(mockStore.openIPMDialog).toHaveBeenCalledWith(expect.objectContaining({ growspaceId: 'gs-fallback' }));

            // Test completely empty devices
            mockStore.data.$devices.set([]);
            (element as any)._triggerAction('ipm');
            expect(mockStore.openIPMDialog).toHaveBeenCalledWith(expect.objectContaining({ growspaceId: '' }));
        });

        it('should handle missing history in chip drop', () => {
            const preventDefault = vi.fn();
            const e = { preventDefault } as any;
            (element as any)._draggedMetric = 'temp';

            const originalHistory = mockStore.history;
            delete mockStore.history;

            (element as any)._handleChipDrop(e, 'vpd');
            expect(originalHistory.linkGraphs).not.toHaveBeenCalled();

            mockStore.history = originalHistory;
        });

        it('should handle undefined selectedDevice in training action', () => {
            mockStore.data.$selectedDevice.set(null);
            (element as any)._triggerAction('training');
            expect(mockStore.openTrainingDialog).toHaveBeenCalledWith([], undefined);
        });

        it('should handle missing menu or hidePopover function', () => {
            // Case where shadowRoot is missing
            const shadowSpy = vi.spyOn(element, 'shadowRoot', 'get').mockReturnValue(null);
            expect(() => (element as any)._triggerAction('add_plant')).not.toThrow();
            shadowSpy.mockRestore(); // Restore to original

            // Case where menu is found but hidePopover is missing
            const div = document.createElement('div');
            const getElementSpy = vi.spyOn(element.shadowRoot!, 'getElementById').mockReturnValue(div);
            expect(() => (element as any)._triggerAction('strains')).not.toThrow();
            getElementSpy.mockRestore();
        });

        it('should cover empty string fallbacks for selected device', () => {
            mockStore.data.$selectedDevice.set(null);
            mockStore.data.$devices.set([]);

            // Line 83: ai action
            (element as any)._triggerAction('ai');
            expect(mockStore.openGrowMasterDialog).toHaveBeenCalledWith('');

            // Line 90: water action
            (element as any)._triggerAction('water');
            expect(mockStore.openWateringDialog).toHaveBeenCalledWith(expect.objectContaining({ growspaceId: undefined }));

            // Line 99: ipm action fallback to ''
            (element as any)._triggerAction('ipm');
            expect(mockStore.openIPMDialog).toHaveBeenCalledWith(expect.objectContaining({ growspaceId: '' }));
        });

        it('should cover _handleDragOver without dragged metric', () => {
            const preventDefault = vi.fn();
            const e = { preventDefault } as any;
            (element as any)._draggedMetric = null;
            (element as any)._handleDragOver(e);
            expect(preventDefault).not.toHaveBeenCalled();
        });
    });
});
