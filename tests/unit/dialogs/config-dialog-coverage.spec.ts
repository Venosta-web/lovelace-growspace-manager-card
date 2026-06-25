import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigDialog } from '../../../src/dialogs/config-dialog';
import { ConfigTab } from '../../../src/constants';

// Env tabs (Sensors, Climate, Humidity) are nested dumb components behind their
// own shadow roots (ADR-0019, "Applied to Config Dialog"); pierce whichever is active.
async function sensorsShadow(element: ConfigDialog): Promise<ShadowRoot> {
    await element.updateComplete;
    const tab = element.shadowRoot!.querySelector(
        'config-sensors-tab, config-climate-tab, config-humidity-tab'
    ) as HTMLElement & { updateComplete: Promise<boolean> };
    await tab.updateComplete;
    return tab.shadowRoot!;
}

vi.mock('../../../src/slices/subarea', () => ({
    getSubareas: vi.fn().mockResolvedValue([]),
    addSubarea: vi.fn().mockResolvedValue({ id: 'sa-new', name: '', environment_config: {} }),
    removeSubarea: vi.fn().mockResolvedValue(undefined),
    updateSubarea: vi.fn().mockResolvedValue(undefined),
    setSubareas: vi.fn(),
    subareas$: { get: vi.fn().mockReturnValue([]), set: vi.fn(), subscribe: vi.fn() },
}));

import * as subareaSlice from '../../../src/slices/subarea';

// Mocking custom elements that are not defined in the test environment
const mockCustomElements = () => {
    if (!customElements.get('ha-dialog')) {
        customElements.define('ha-dialog', class extends HTMLElement {
            constructor() {
                super();
                this.attachShadow({ mode: 'open' }).innerHTML = '<slot></slot>';
            }
        });
    }
    if (!customElements.get('ha-entity-picker')) {
        customElements.define('ha-entity-picker', class extends HTMLElement { });
    }
    if (!customElements.get('gs-help-tooltip')) {
        customElements.define('gs-help-tooltip', class extends HTMLElement { });
    }
    if (!customElements.get('subarea-config-dialog')) {
        customElements.define('subarea-config-dialog', class extends HTMLElement { 
            set hass(val: any) {}
            set open(val: any) {}
            set growspaceId(val: any) {}
            set subarea(val: any) {}
        });
    }
    if (!customElements.get('sensor-group-dialog')) {
        customElements.define('sensor-group-dialog', class extends HTMLElement {
            set open(val: any) {}
            set hass(val: any) {}
            set sensorGroup(val: any) {}
        });
    }
    if (!customElements.get('md3-number-input')) {
        customElements.define('md3-number-input', class extends HTMLElement {
            set value(val: any) {}
            set label(val: any) {}
        });
    }
    if (!customElements.get('md3-text-input')) {
        customElements.define('md3-text-input', class extends HTMLElement {
            set value(val: any) {}
            set label(val: any) {}
        });
    }
    if (!customElements.get('md3-select')) {
        customElements.define('md3-select', class extends HTMLElement {
            set value(val: any) {}
            set label(val: any) {}
            set options(val: any) {}
        });
    }
};

describe('ConfigDialog - Branch Coverage Expansion', () => {
    let element: ConfigDialog;

    beforeEach(async () => {
        mockCustomElements();
        element = new ConfigDialog();
        element.hass = {
            states: {
                'camera.growspace': { attributes: { friendly_name: 'Camera' } },
                'sensor.ph': { attributes: { friendly_name: 'pH Sensor' } },
            },
            callService: vi.fn(),
        } as any;
        element.growspaceOptions = { 'gs1': 'Growspace 1' };
        element.devices = [
            { deviceId: 'gs1', name: 'Growspace 1', rows: 4, plantsPerRow: 4, notificationTarget: 'notify.mobile_app_test' }
        ] as any;
        document.body.appendChild(element);
        element.open = true;
        await element.updateComplete;
    });

    afterEach(() => {
        document.body.removeChild(element);
        vi.clearAllMocks();
    });

    it('should cover Vision Checkup configuration branches', async () => {
        // Set camera entities to enable the vision section
        (element as any).envVisionCameraEntities = ['camera.growspace'];
        element.currentTab = ConfigTab.VISION;
        await element.updateComplete;

        const saveBtn = element.shadowRoot?.querySelector('button.md3-button.primary');
        expect(saveBtn).to.exist;

        // Toggle vision enabled
        const toggle = element.shadowRoot?.querySelector('input[type="checkbox"]') as HTMLInputElement;
        if (toggle) {
            toggle.checked = true;
            toggle.dispatchEvent(new Event('change'));
            expect((element as any).envVisionEnabled).to.be.true;
        }

        // Change offsets
        const inputs = element.shadowRoot?.querySelectorAll('md3-number-input');
        if (inputs && inputs.length >= 3) {
            inputs[0].dispatchEvent(new CustomEvent('change', { detail: '10' }));
            inputs[1].dispatchEvent(new CustomEvent('change', { detail: '5' }));
            inputs[2].dispatchEvent(new CustomEvent('change', { detail: '15' }));

            expect((element as any).envVisionEarlyOffset).to.equal(10);
            expect((element as any).envVisionMidHours).to.equal(5);
            expect((element as any).envVisionLateOffset).to.equal(15);
        }

        // Submit vision config
        const visionSaveBtn = element.shadowRoot?.querySelector('button.md3-button.primary') as HTMLElement;
        expect(visionSaveBtn).to.exist;
        if (visionSaveBtn) {
            // Call directly to ensure coverage of the method itself and its branches
            (element as any)._submitVisionCheckupConfig();
        }
    });

    it('should cover Edit Growspace additional branches', async () => {
        element.currentTab = ConfigTab.GROWSPACES;
        (element as any).editSelectedId = 'gs1';
        (element as any).envSelectedId = 'gs1';
        await element.updateComplete;

        // _submitDeleteGrowspace -> _cancelDeleteGrowspace
        (element as any)._submitDeleteGrowspace();
        expect((element as any)._showDeleteConfirm).to.be.true;
        (element as any)._cancelDeleteGrowspace();
        expect((element as any)._showDeleteConfirm).to.be.false;

        // _handleRemoveEnvironment (Confirm)
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const removeEnvSpy = vi.fn();
        element.addEventListener('remove-environment-submit', removeEnvSpy);
        (element as any)._handleRemoveEnvironment();
        expect(removeEnvSpy).toHaveBeenCalled();

        // _handleRemoveEnvironment (Cancel)
        removeEnvSpy.mockClear();
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        (element as any)._handleRemoveEnvironment();
        expect(removeEnvSpy).not.toHaveBeenCalled();
    });

    it('should cover Subarea management branches', async () => {
        vi.clearAllMocks();
        vi.mocked(subareaSlice.addSubarea).mockResolvedValue({ id: 'sa1', name: 'Sub 1', environment_config: {} });
        vi.mocked(subareaSlice.removeSubarea).mockResolvedValue(undefined);
        vi.mocked(subareaSlice.getSubareas).mockResolvedValue([]);

        (element as any).envSelectedId = 'gs1';
        (element as any)._switchTab(ConfigTab.SUBAREAS);
        await element.updateComplete;

        // _handleAddSubarea (No name — early return)
        (element as any)._newSubareaName = '';
        await (element as any)._handleAddSubarea();
        expect(subareaSlice.addSubarea).not.toHaveBeenCalled();

        // _handleAddSubarea (Success)
        (element as any)._newSubareaName = 'Sub 1';
        (element as any)._subareasGrowspaceId = 'gs1';
        vi.spyOn(element as any, '_loadSubareas').mockImplementation(async () => {
            (element as any)._subareas = [{ id: 'sa1', name: 'Sub 1', environment_config: {} }];
        });

        await (element as any)._handleAddSubarea();
        expect(subareaSlice.addSubarea).toHaveBeenCalledWith('gs1', 'Sub 1');
        expect((element as any)._subareas).to.have.length(1);

        // _handleEditSubarea
        const subarea = (element as any)._subareas[0];
        (element as any)._handleEditSubarea(subarea);
        expect((element as any)._showSubareaConfigDialog).to.be.true;
        expect((element as any)._editingSubarea).to.equal(subarea);

        // _handleDeleteSubarea
        (element as any)._handleDeleteSubarea('sa1');
        expect((element as any)._deleteConfirmSubareaId).to.equal('sa1');

        // _confirmDeleteSubarea
        await (element as any)._confirmDeleteSubarea('sa1');
        expect(subareaSlice.removeSubarea).toHaveBeenCalledWith('gs1', 'sa1');
    });

    it('should cover Humidifier logic branches', async () => {
        element.growspaceOptions = { 'gs1': 'GS 1', 'gs2': 'GS 2' };
        element.currentTab = ConfigTab.HUMIDITY;
        (element as any).envSelectedId = 'gs1';
        (element as any).envHumidifierThresholds = {
            seedling: { day: { on: 0.6, off: 0.4 }, night: { on: 0.7, off: 0.5 } }
        };
        await element.updateComplete;

        // Verify it's rendering (humidity tab is now a nested dumb component).
        const root = await sensorsShadow(element);
        const humidifierHeader = Array.from(root.querySelectorAll('h3'))
            .find(h => h.textContent?.includes('Humidity'));
        expect(humidifierHeader).to.exist;

        // Exercise the component's intent handlers through to the shell.
        const checkbox = root.querySelector('input[type="checkbox"]');
        if (checkbox) {
            (checkbox as HTMLInputElement).checked = true;
            checkbox.dispatchEvent(new Event('change'));
        }

        const accHead = root.querySelector('.acc-head');
        if (accHead) {
            (accHead as HTMLElement).click();
        }

        const numberInput = (await sensorsShadow(element)).querySelector('md3-number-input');
        if (numberInput) {
            numberInput.dispatchEvent(new CustomEvent('change', { detail: '0.5' }));
        }
        await element.updateComplete;

        (element as any)._updateHumidifierThreshold('seedling', 'day', 'on', 0.5);
        await element.updateComplete;

        // _updateHumidifierThreshold(stage, cycle, point, value)
        (element as any)._updateHumidifierThreshold('seedling', 'day', 'on', 65);
        expect((element as any).envHumidifierThresholds.seedling.day.on).to.equal(65);

        (element as any)._updateHumidifierThreshold('seedling', 'day', 'on', NaN);
        expect((element as any).envHumidifierThresholds.seedling.day.on).to.equal(65);
        
        // Open the seedling accordion to verify stage tracking
        (element as any)._openHumidityStageId = 'seedling';
        await element.updateComplete;
        expect((element as any)._openHumidityStageId).to.equal('seedling');

        // Click the open accordion head again → isOpen=true branch → sets id to ''  (line 2141)
        const openHead = Array.from(element.shadowRoot?.querySelectorAll('.acc-head') ?? [])
            .find((h) => h.closest('.acc-card')?.querySelector('.acc-head-title')?.textContent?.includes('Seedling')) as HTMLElement | undefined;
        if (openHead) {
            openHead.click();
            await element.updateComplete;
            expect((element as any)._openHumidityStageId).to.equal('');
        }
    });


    it('should cover Edit Fields population logic', async () => {
        (element as any)._populateEditFields('gs1');
        expect((element as any).editName).to.equal('Growspace 1');
        expect((element as any).editRows).to.equal(4);

        (element as any)._populateEditFields('');
        expect((element as any).editSelectedId).to.equal('');
    });

    it('should cover Subarea event handlers', async () => {
        const subarea = {
            id: 'subarea_1',
            name: 'Subarea 1',
            environment_config: {}
        };

        // UI toggles
        (element as any)._showAddSubarea = true;
        expect((element as any)._showAddSubarea).to.be.true;

        // _handleEditSubarea
        (element as any)._handleEditSubarea(subarea);
        expect((element as any)._showSubareaConfigDialog).to.be.true;
        expect((element as any)._editingSubarea).to.equal(subarea);

        // _handleDeleteSubarea
        (element as any)._handleDeleteSubarea('subarea_1');
        expect((element as any)._deleteConfirmSubareaId).to.equal('subarea_1');

        // Slice mocks for add + remove
        vi.clearAllMocks();
        vi.mocked(subareaSlice.addSubarea).mockResolvedValue({ id: 'sa-new', name: 'New Subarea', environment_config: {} });
        vi.mocked(subareaSlice.removeSubarea).mockResolvedValue(undefined);
        vi.mocked(subareaSlice.getSubareas).mockResolvedValue([]);
        (element as any)._subareasGrowspaceId = 'gs1';
        (element as any)._loadSubareas = vi.fn().mockResolvedValue(undefined);

        // _handleAddSubarea
        (element as any)._newSubareaName = 'New Subarea';
        await (element as any)._handleAddSubarea();
        expect(subareaSlice.addSubarea).toHaveBeenCalledWith('gs1', 'New Subarea');

        // _confirmDeleteSubarea
        await (element as any)._confirmDeleteSubarea('subarea_1');
        expect(subareaSlice.removeSubarea).toHaveBeenCalledWith('gs1', 'subarea_1');

        // Cover catch blocks
        vi.mocked(subareaSlice.addSubarea).mockRejectedValueOnce(new Error('Fail'));
        vi.mocked(subareaSlice.removeSubarea).mockRejectedValueOnce(new Error('Fail'));
        vi.mocked(subareaSlice.getSubareas).mockRejectedValueOnce(new Error('Fail'));
        (element as any)._newSubareaName = 'Fail Subarea'; // must be non-empty to reach try/catch

        await (element as any)._handleAddSubarea();
        await (element as any)._confirmDeleteSubarea('subarea_1');
        await (element as any)._loadSubareas('gs1');

        // Cover early returns
        (element as any)._newSubareaName = '';
        await (element as any)._handleAddSubarea();
        (element as any)._subareasGrowspaceId = '';
        await (element as any)._confirmDeleteSubarea('subarea_1');
    });

    it('should cover additional render logic and branches', async () => {
        // Modal branches
        (element as any)._showGroupDialog = true;
        (element as any)._editingGroup = { id: 'g1', name: 'Group 1', sensors: [] };
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('sensor-group-dialog')).to.exist;
        (element as any)._showGroupDialog = false;

        (element as any)._showSubareaConfigDialog = true;
        (element as any)._editingSubarea = { id: 'sa1', name: 'SA 1', environment_config: {} };
        await element.updateComplete;
        expect(element.shadowRoot?.querySelector('subarea-config-dialog')).to.exist;
        (element as any)._showSubareaConfigDialog = false;

        // Toggle some UI states to trigger different render branches
        element.currentTab = ConfigTab.GROWSPACES;
        (element as any).editSelectedId = 'gs1';
        (element as any)._showDeleteConfirm = true;
        await element.updateComplete;

        const confirmBtn = element.shadowRoot?.querySelector('.md3-button.primary.error');
        expect(confirmBtn).to.exist;

        // Cover _confirmDeleteGrowspace
        (element as any)._confirmDeleteGrowspace();
        expect((element as any)._showDeleteConfirm).to.be.false;

        (element as any)._showDeleteConfirm = true;
        (element as any)._cancelDeleteGrowspace();
        await element.updateComplete;
        expect((element as any)._showDeleteConfirm).to.be.false;
    });

    it('should cover tab visibility and switching branches', async () => {
        // Test allowedTabs filtering
        element.allowedTabs = [ConfigTab.SENSORS, ConfigTab.HUMIDITY];
        await element.updateComplete;

        // Verify only allowed tabs are shown
        const tabs = element.shadowRoot?.querySelectorAll('.cfg-nav-item');
        expect(tabs?.length).toBe(2);

        // Switch through all tabs to cover 'active' class branches
        const allTabs = Object.values(ConfigTab);
        for (const tab of allTabs) {
            element.currentTab = tab as any;
            await element.updateComplete;
            expect(element.currentTab).to.equal(tab);
        }

        // Reset
        element.allowedTabs = undefined;
        await element.updateComplete;
    });

    it('populates vision checkup config fields from device environmentAttributes', async () => {
        element.devices = [
            {
                deviceId: 'gs1',
                name: 'Growspace 1',
                rows: 4,
                plantsPerRow: 4,
                notificationTarget: '',
                environmentAttributes: {
                    temperatureSensors: ['sensor.temp'],
                    humiditySensors: ['sensor.hum'],
                    visionCheckupConfig: {
                        enabled: true,
                        early_check_offset_minutes: 45,
                        mid_check_hours: 4,
                        late_check_offset_minutes: 30,
                    },
                },
            },
        ] as any;

        (element as any)._handleEnvGrowspaceChange({ target: { value: 'gs1' } } as any);
        await element.updateComplete;

        expect((element as any).envVisionEnabled).toBe(true);
        expect((element as any).envVisionEarlyOffset).toBe(45);
        expect((element as any).envVisionMidHours).toBe(4);
        expect((element as any).envVisionLateOffset).toBe(30);
    });

    it('renders lungroom and camera rows in the edit growspace form', async () => {
        element.currentTab = ConfigTab.GROWSPACES;
        (element as any).editSelectedId = 'gs1';
        (element as any)._isAddingGrowspace = false;
        (element as any).envLungroomTempSensors = ['sensor.lungroom'];
        (element as any).envVisionCameraEntities = ['camera.tent'];
        await element.updateComplete;

        // The edit form is rendered; both multi-select containers should be present
        const containers = element.shadowRoot?.querySelectorAll('.multi-select-container');
        expect(containers).toBeDefined();
        expect(containers!.length).toBeGreaterThanOrEqual(2);
    });

    it('renders substrate temp sensors in the SENSORS tab', async () => {
        element.currentTab = ConfigTab.SENSORS;
        (element as any).envSelectedId = 'gs1';
        (element as any).envSubstrateTemperatureSensors = ['sensor.substrate_temp'];
        await element.updateComplete;

        const labels = Array.from((await sensorsShadow(element)).querySelectorAll('.md3-label-multi'));
        const substrateLabel = labels.find((l) => l.textContent?.includes('Substrate'));
        expect(substrateLabel).toBeDefined();
    });

    it('renders stress and mold threshold inputs in the CLIMATE tab', async () => {
        element.currentTab = ConfigTab.CLIMATE;
        (element as any).envSelectedId = 'gs1';
        (element as any).envStressThreshold = 0.75;
        (element as any).envMoldThreshold = 0.85;
        await element.updateComplete;

        // Dispatch change events on md3-number-inputs to exercise the inline handlers
        const inputs = element.shadowRoot?.querySelectorAll('md3-number-input');
        expect(inputs).toBeDefined();
        if (inputs && inputs.length >= 2) {
            inputs[0].dispatchEvent(new CustomEvent('change', { detail: '0.7' }));
            inputs[1].dispatchEvent(new CustomEvent('change', { detail: '0.9' }));
            expect((element as any).envStressThreshold).toBeCloseTo(0.7);
            expect((element as any).envMoldThreshold).toBeCloseTo(0.9);
        }
    });

    it('renders all sensor rows in the IRRIGATION tab and triggers chip-remove for each', async () => {
        element.currentTab = ConfigTab.IRRIGATION;
        (element as any).envSelectedId = 'gs1';
        (element as any).envPhSensors = ['sensor.ph'];
        (element as any).envFeedEcSensors = ['sensor.feed_ec'];
        (element as any).envBulkEcSensors = ['sensor.bulk_ec'];
        (element as any).envPoreEcSensors = ['sensor.pore_ec'];
        (element as any).envRunoffEcSensors = ['sensor.runoff_ec'];
        (element as any).envDrainVolumeSensors = ['sensor.drain'];
        (element as any).envIrrigationFlowSensors = ['sensor.flow'];
        (element as any).envPowerSensors = ['sensor.power'];
        (element as any).envEnergySensors = ['sensor.energy'];
        await element.updateComplete;

        const labels = Array.from(element.shadowRoot?.querySelectorAll('.md3-label-multi') ?? []);
        const labelTexts = labels.map((l) => l.textContent?.trim());
        expect(labelTexts).toContain('pH Sensors');
        expect(labelTexts).toContain('Feed EC Sensors');
        expect(labelTexts).toContain('Bulk EC Sensors');
        expect(labelTexts).toContain('Pore EC Sensors');
        expect(labelTexts).toContain('Power Sensors');
        expect(labelTexts).toContain('Energy Sensors');

        // Click every chip-remove × to invoke all changeHandler arrow fns
        const chipRemoves = Array.from(element.shadowRoot?.querySelectorAll('.chip-remove') ?? []) as HTMLElement[];
        for (const chip of chipRemoves) {
            chip.click();
        }
        await element.updateComplete;

        // All sensor arrays should now be empty
        expect((element as any).envPhSensors).toHaveLength(0);
        expect((element as any).envFeedEcSensors).toHaveLength(0);
        expect((element as any).envBulkEcSensors).toHaveLength(0);
        expect((element as any).envPoreEcSensors).toHaveLength(0);
        expect((element as any).envEnergySensors).toHaveLength(0);
    });

    it('renders a "Substrate EC" section header in the IRRIGATION tab', async () => {
        element.currentTab = ConfigTab.IRRIGATION;
        (element as any).envSelectedId = 'gs1';
        await element.updateComplete;

        const h3s = Array.from(element.shadowRoot?.querySelectorAll('h3') ?? []);
        const headings = h3s.map((h) => h.textContent?.trim());
        expect(headings).toContain('Substrate EC');
    });

    it('renders the tank list and toggles add/edit/delete form in the TANKS tab', async () => {
        element.currentTab = ConfigTab.TANKS;
        (element as any).envSelectedId = 'gs1';
        (element as any).envIrrigationTanks = [
            { sensorEntity: 'sensor.tank1', name: 'Main Tank', volumeLiters: 100, warningLevel: 20 },
        ];
        await element.updateComplete;

        // Tank list item is rendered
        expect(element.shadowRoot?.textContent).toContain('Main Tank');

        // Click the edit tank button (arrow fn at line 1667)
        const editTankBtn = (Array.from(element.shadowRoot?.querySelectorAll('button.md3-button.text:not(.error)') ?? []) as HTMLElement[])
            .find((b) => !b.style.minWidth || b.style.padding === '6px')
            ?? (Array.from(element.shadowRoot?.querySelectorAll('button') ?? []) as HTMLElement[])
                .find((b) => b.style.padding === '6px' && !b.classList.contains('error'));

        // Fall back to direct method call if DOM lookup is ambiguous, but also open the form via button
        const allBtns = Array.from(element.shadowRoot?.querySelectorAll('button') ?? []);
        // The edit pencil button is the second-to-last button in the tank row (before delete)
        const tankRowBtns = allBtns.filter((b) =>
            b.closest('[style*="display:flex;justify-content:space-between"]') !== null &&
            !b.textContent?.includes('Add')
        );
        // Click the edit button (covers arrow fn body at line 1667)
        if (tankRowBtns.length >= 1) {
            tankRowBtns[0].click();
            await element.updateComplete;
        } else {
            (element as any)._editTank(0);
            await element.updateComplete;
        }
        expect((element as any)._showTankForm).toBe(true);
        expect((element as any)._editingTankIndex).toBe(0);

        // Interact with form inputs to cover their @input arrow fns
        const formInputs = Array.from(element.shadowRoot?.querySelectorAll('input.md3-input') ?? []) as HTMLInputElement[];
        if (formInputs.length >= 1) {
            // Sensor entity input
            formInputs[0].value = 'sensor.tank_new';
            formInputs[0].dispatchEvent(new Event('input'));
            expect((element as any)._tankDraft.sensorEntity).toBe('sensor.tank_new');
        }
        if (formInputs.length >= 2) {
            // Name input
            formInputs[1].value = 'Renamed Tank';
            formInputs[1].dispatchEvent(new Event('input'));
            expect((element as any)._tankDraft.name).toBe('Renamed Tank');
        }
        if (formInputs.length >= 3) {
            // Volume input
            formInputs[2].value = '150';
            formInputs[2].dispatchEvent(new Event('input'));
            expect((element as any)._tankDraft.volumeLiters).toBe(150);

            // Volume input empty → null
            formInputs[2].value = '';
            formInputs[2].dispatchEvent(new Event('input'));
            expect((element as any)._tankDraft.volumeLiters).toBeNull();
        }
        if (formInputs.length >= 4) {
            // Warning level input
            formInputs[3].value = '25';
            formInputs[3].dispatchEvent(new Event('input'));
            expect((element as any)._tankDraft.warningLevel).toBe(25);
        }

        // Save edited tank
        (element as any)._tankDraft = { sensorEntity: 'sensor.tank1', name: 'Updated Tank', volumeLiters: 120, warningLevel: 25 };
        (element as any)._saveTank();
        expect((element as any).envIrrigationTanks[0].name).toBe('Updated Tank');
        expect((element as any)._showTankForm).toBe(false);

        // Click the delete tank button (arrow fn at line 1670)
        const deleteTankBtn = Array.from(element.shadowRoot?.querySelectorAll('button.md3-button.text.error') ?? [])
            .find((b) => !b.textContent?.trim()) as HTMLElement | undefined;
        if (deleteTankBtn) {
            deleteTankBtn.click();
            await element.updateComplete;
        } else {
            (element as any)._deleteTank(0);
        }
        expect((element as any).envIrrigationTanks).toHaveLength(0);

        // Open add form, save a new tank (no editing index)
        (element as any)._openAddTank();
        (element as any)._tankDraft = { sensorEntity: 'sensor.tank_new', name: '', volumeLiters: null, warningLevel: 30 };
        (element as any)._saveTank();
        expect((element as any).envIrrigationTanks).toHaveLength(1);
        expect((element as any).envIrrigationTanks[0].name).toBe('Tank');

        // _saveTank with empty sensorEntity is a no-op
        const countBefore = (element as any).envIrrigationTanks.length;
        (element as any)._openAddTank();
        (element as any)._tankDraft = { sensorEntity: '  ', name: 'x', volumeLiters: null, warningLevel: 30 };
        (element as any)._saveTank();
        expect((element as any).envIrrigationTanks).toHaveLength(countBefore);
    });

    it('renders camera entities multi-select in the VISION tab and triggers chip removal', async () => {
        element.currentTab = ConfigTab.VISION;
        (element as any).envSelectedId = 'gs1';
        (element as any).envVisionCameraEntities = [];
        await element.updateComplete;

        // With no cameras: instruction paragraph should appear
        const para = element.shadowRoot?.querySelector('p');
        expect(para?.textContent).toContain('Add camera entities');

        // With cameras: camera entities multi-select renders
        (element as any).envVisionCameraEntities = ['camera.tent'];
        await element.updateComplete;

        const labels = Array.from(element.shadowRoot?.querySelectorAll('.md3-label-multi') ?? []);
        const cameraLabel = labels.find((l) => l.textContent?.includes('Camera'));
        expect(cameraLabel).toBeDefined();

        // Click the chip-remove × to trigger the changeHandler arrow fn (line 1732)
        const chipRemove = element.shadowRoot?.querySelector('.chip-remove') as HTMLElement | null;
        if (chipRemove) {
            chipRemove.click();
            await element.updateComplete;
            expect((element as any).envVisionCameraEntities).toHaveLength(0);
        }
    });

    it('renders edit-group button and wires it in the HEATMAP tab', async () => {
        element.currentTab = ConfigTab.HEATMAP;
        (element as any).envSelectedId = 'gs1';
        (element as any).envSensorGroups = [
            { id: 'g1', name: 'Group A', x: 1, y: 2, z: 3, sensors: [] },
        ];
        await element.updateComplete;

        // Group name rendered
        expect(element.shadowRoot?.textContent).toContain('Group A');

        // Click the edit button DOM element to cover the arrow fn at line 1780.
        // querySelectorAll returns them in DOM order; the header close button is first,
        // so the group edit button is the last non-error text button.
        const textButtons = Array.from(
            element.shadowRoot?.querySelectorAll('button.md3-button.text:not(.error)') ?? []
        );
        const editBtn = textButtons[textButtons.length - 1] as HTMLElement | undefined;
        expect(editBtn).toBeDefined();
        editBtn!.click();
        await element.updateComplete;
        expect((element as any)._showGroupDialog).toBe(true);
        expect((element as any)._editingGroup.id).toBe('g1');
    });

    it('renders add-subarea form: clicking Add Subarea button and Cancel covers inline handlers', async () => {
        (element as any).envSelectedId = 'gs1';
        element.currentTab = ConfigTab.SUBAREAS;
        await element.updateComplete;

        // Click the "Add Subarea" button to cover the arrow fn at line 1811
        const allButtons = Array.from(element.shadowRoot?.querySelectorAll('button') ?? []);
        const addSubareaBtn = allButtons.find((b) => b.textContent?.includes('Add Subarea'));
        expect(addSubareaBtn).toBeDefined();
        addSubareaBtn!.click();
        await element.updateComplete;
        expect((element as any)._showAddSubarea).toBe(true);
        expect((element as any)._newSubareaName).toBe('');

        // Trigger @input on the name field to cover the input arrow fn (line 1820)
        const nameInput = element.shadowRoot?.querySelector('input.md3-input') as HTMLInputElement;
        expect(nameInput).toBeDefined();
        nameInput.value = 'Zone A';
        nameInput.dispatchEvent(new Event('input'));
        await element.updateComplete;
        expect((element as any)._newSubareaName).toBe('Zone A');

        // Trigger @keydown Enter to cover the keydown arrow fn (line 1821)
        vi.spyOn(element as any, '_handleAddSubarea').mockResolvedValue(undefined);
        nameInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        expect((element as any)._handleAddSubarea).toHaveBeenCalled();

        // Click Cancel to cover its arrow fn (line 1824)
        const cancelBtn = Array.from(element.shadowRoot?.querySelectorAll('button') ?? [])
            .find((b) => b.textContent?.trim() === 'Cancel');
        expect(cancelBtn).toBeDefined();
        cancelBtn!.click();
        await element.updateComplete;
        expect((element as any)._showAddSubarea).toBe(false);
    });

    it('renders subarea list: clicking delete enters confirm, No exits, edit button opens dialog', async () => {
        (element as any).envSelectedId = 'gs1';
        element.currentTab = ConfigTab.SUBAREAS;
        (element as any)._subareas = [
            { id: 'sa1', name: 'Zone A', environment_config: {} },
        ];
        (element as any)._subareasGrowspaceId = 'gs1';
        (element as any)._deleteConfirmSubareaId = '';
        // Mock _loadSubareas so the async chain after _confirmDeleteSubarea doesn't clear _subareas
        vi.spyOn(element as any, '_loadSubareas').mockResolvedValue(undefined);
        await element.updateComplete;

        // Normal state: click the delete button (arrow fn at line 1849 → _handleDeleteSubarea)
        const allButtons = Array.from(element.shadowRoot?.querySelectorAll('button') ?? []);
        const deleteBtn = allButtons.find((b) => b.title === 'Delete subarea');
        expect(deleteBtn).toBeDefined();
        deleteBtn!.click();
        await element.updateComplete;
        expect((element as any)._deleteConfirmSubareaId).toBe('sa1');

        // Confirm state: click "No" (arrow fn at line 1844 → resets _deleteConfirmSubareaId)
        const noBtn = Array.from(element.shadowRoot?.querySelectorAll('button') ?? [])
            .find((b) => b.textContent?.trim() === 'No');
        expect(noBtn).toBeDefined();
        noBtn!.click();
        await element.updateComplete;
        expect((element as any)._deleteConfirmSubareaId).toBe('');

        // Re-enter confirm state for Yes click (arrow fn at line 1843 → _confirmDeleteSubarea)
        (element as any)._handleDeleteSubarea('sa1');
        await element.updateComplete;
        const yesBtn = Array.from(element.shadowRoot?.querySelectorAll('button') ?? [])
            .find((b) => b.textContent?.trim() === 'Yes');
        expect(yesBtn).toBeDefined();
        yesBtn!.click();
        await element.updateComplete;

        // Normal state again: click the edit button (arrow fn at line 1846 → _handleEditSubarea)
        (element as any)._subareas = [{ id: 'sa1', name: 'Zone A', environment_config: {} }];
        (element as any)._deleteConfirmSubareaId = '';
        await element.updateComplete;
        const editBtn = Array.from(element.shadowRoot?.querySelectorAll('button') ?? [])
            .find((b) => b.title === 'Edit sensors');
        expect(editBtn).toBeDefined();
        editBtn!.click();
        await element.updateComplete;
        expect((element as any)._showSubareaConfigDialog).toBe(true);
    });

    it('close event from subarea-config-dialog closes the dialog without reloading', async () => {
        (element as any)._showSubareaConfigDialog = true;
        (element as any)._editingSubarea = { id: 'sa1', name: 'Zone A', environment_config: {} };
        await element.updateComplete;

        const dlg = element.shadowRoot?.querySelector('subarea-config-dialog');
        expect(dlg).toBeDefined();

        dlg!.dispatchEvent(new Event('close', { bubbles: true, composed: true }));
        await element.updateComplete;

        expect((element as any)._showSubareaConfigDialog).toBe(false);
        expect((element as any)._editingSubarea).toBeUndefined();
    });

    it('subarea-updated event from subarea-config-dialog closes dialog and reloads', async () => {
        (element as any)._showSubareaConfigDialog = true;
        (element as any)._editingSubarea = { id: 'sa1', name: 'Zone A', environment_config: {} };
        (element as any)._subareasGrowspaceId = 'gs1';
        const loadSpy = vi.fn().mockResolvedValue(undefined);
        vi.spyOn(element as any, '_loadSubareas').mockImplementation(loadSpy);
        await element.updateComplete;

        // The render guard shows the subarea-config-dialog element
        const dlg = element.shadowRoot?.querySelector('subarea-config-dialog');
        expect(dlg).toBeDefined();

        // Simulate the subarea-updated event bubbling up from inside the dialog
        dlg!.dispatchEvent(new CustomEvent('subarea-updated', { bubbles: true, composed: true }));
        await element.updateComplete;

        expect((element as any)._showSubareaConfigDialog).toBe(false);
        expect((element as any)._editingSubarea).toBeUndefined();
        expect(loadSpy).toHaveBeenCalled();
    });

    it('setInitialState populates visionCheckupConfig and triggers loadSubareas on SUBAREAS tab', async () => {
        vi.spyOn(element as any, '_loadSubareas').mockResolvedValue(undefined);

        element.setInitialState(ConfigTab.SUBAREAS, {
            selectedGrowspaceId: 'gs1',
            temperatureSensors: [], humiditySensors: [], vpdSensors: [],
            co2Sensor: '', circulationFanEntities: [], stressThreshold: 0.8,
            moldThreshold: 0.8, lightSensors: [], exhaustFanEntities: [],
            humidifierEntities: [], dehumidifierEntities: [], soilMoistureSensor: '',
            dehumidifierControlEnabled: false, dehumidifierThresholds: {},
            humidifierControlEnabled: false, humidifierThresholds: {},
            sensorGroups: [], sensorCoordinates: {}, irrigationTanks: [],
            cameraEntities: [], lungroomTempSensors: [], substrateTemperatureSensors: [],
            phSensors: [], feedEcSensors: [], substrateEcSensors: [], runoffEcSensors: [],
            drainVolumeSensors: [], irrigationFlowSensors: [], powerSensors: [], energySensors: [],
            visionCheckupConfig: {
                enabled: true,
                early_check_offset_minutes: 30,
                mid_check_hours: 4,
                late_check_offset_minutes: 45,
            },
        } as any);

        expect((element as any).envVisionEnabled).toBe(true);
        expect((element as any).envVisionEarlyOffset).toBe(30);
        expect((element as any).envVisionMidHours).toBe(4);
        expect((element as any).envVisionLateOffset).toBe(45);
        expect((element as any)._loadSubareas).toHaveBeenCalled();
    });

    it('_close() returns early when a sub-dialog is open', () => {
        (element as any)._showGroupDialog = true;
        const closeSpy = vi.fn();
        element.addEventListener('close', closeSpy);
        (element as any)._close();
        expect(closeSpy).not.toHaveBeenCalled();
    });

    it('_submitGrowspaceAndEnv fires _submitEnvironment when sensors are populated', async () => {
        (element as any).envSelectedId = 'gs1';
        (element as any).envTemperatureSensors = ['sensor.temp'];
        (element as any).envHumiditySensors = ['sensor.hum'];
        const envSpy = vi.fn();
        element.addEventListener('configure-environment-submit', envSpy);
        (element as any)._submitGrowspaceAndEnv();
        expect(envSpy).toHaveBeenCalled();
    });

    it('_getEntities skips null state entries', () => {
        (element.hass.states as any)['sensor.broken'] = null;
        const entities = (element as any)._getEntities(['sensor'], null);
        expect(entities).not.toContain('sensor.broken');
        delete (element.hass.states as any)['sensor.broken'];
    });

    it('_cancelTank() resets _showTankForm and _editingTankIndex', async () => {
        (element as any)._openAddTank();
        await element.updateComplete;
        (element as any)._cancelTank();
        await element.updateComplete;
        expect((element as any)._showTankForm).toBe(false);
        expect((element as any)._editingTankIndex).toBeNull();
    });

    it('_handleEnvGrowspaceChange maps irrigationTanks from device attributes', async () => {
        element.devices = [{
            deviceId: 'gs1',
            name: 'Growspace 1',
            rows: 4, plantsPerRow: 4,
            environmentAttributes: {
                temperatureSensors: [],
                irrigationTanks: [
                    { sensorEntity: 'sensor.tank1', name: 'Main Tank', volumeLiters: 100, warningLevel: 20 },
                ],
            },
        }] as any;

        (element as any)._handleEnvGrowspaceChange({ target: { value: 'gs1' } } as any);
        await element.updateComplete;

        expect((element as any).envIrrigationTanks).toHaveLength(1);
        expect((element as any).envIrrigationTanks[0].name).toBe('Main Tank');
    });

    it('chip-remove in edit growspace form clears lungroom and vision camera entities', async () => {
        element.currentTab = ConfigTab.GROWSPACES;
        (element as any).editSelectedId = 'gs1';
        (element as any)._isAddingGrowspace = false;
        (element as any).envLungroomTempSensors = ['sensor.lungroom'];
        (element as any).envVisionCameraEntities = ['camera.tent'];
        await element.updateComplete;

        const chipRemoves = Array.from(element.shadowRoot?.querySelectorAll('.chip-remove') ?? []) as HTMLElement[];
        for (const cr of chipRemoves) cr.click();
        await element.updateComplete;

        expect((element as any).envLungroomTempSensors).toHaveLength(0);
        expect((element as any).envVisionCameraEntities).toHaveLength(0);
    });

    it('chip-remove in SENSORS tab clears substrate temperature sensors', async () => {
        element.currentTab = ConfigTab.SENSORS;
        (element as any).envSelectedId = 'gs1';
        (element as any).envSubstrateTemperatureSensors = ['sensor.substrate'];
        await element.updateComplete;

        const chipRemove = (await sensorsShadow(element)).querySelector('.chip-remove') as HTMLElement | null;
        chipRemove?.click();
        await element.updateComplete;

        expect((element as any).envSubstrateTemperatureSensors).toHaveLength(0);
    });
});

// ─── Fan Controller Panel (ConfigTab.CLIMATE) — lines 1862–2038 ──────────────

describe('ConfigDialog - Fan Controller Panel coverage', () => {
    let element: ConfigDialog;

    // The Climate tab is now a nested dumb component (ADR-0019); pierce it.
    function allInputs(root: ShadowRoot) {
        return Array.from(root.querySelectorAll('md3-number-input'));
    }

    function dispatchAllInputs(root: ShadowRoot, value: string) {
        for (const input of allInputs(root)) {
            input.dispatchEvent(new CustomEvent('change', { detail: value }));
        }
    }

    function fanCfg() {
        return (element as any)._sm.environmentDraft.circulationFanConfig;
    }

    beforeEach(async () => {
        mockCustomElements();
        element = new ConfigDialog();
        element.hass = { states: {}, callService: vi.fn() } as any;
        element.growspaceOptions = { gs1: 'Growspace 1' };
        element.devices = [
            { deviceId: 'gs1', name: 'Growspace 1', rows: 4, plantsPerRow: 4, notificationTarget: '' },
        ] as any;
        document.body.appendChild(element);
        element.open = true;
        element.currentTab = ConfigTab.CLIMATE;
        (element as any).envSelectedId = 'gs1';
        await element.updateComplete;
    });

    afterEach(() => {
        document.body.removeChild(element);
        vi.clearAllMocks();
    });

    it('enabled toggle (line 1862) sets circulationFanConfig.enabled', async () => {
        const root = await sensorsShadow(element);
        const checkboxes = Array.from(
            root.querySelectorAll('input[type="checkbox"]')
        ) as HTMLInputElement[];
        const enabledCb = checkboxes.find((cb) => cb.closest('label')?.textContent?.includes('Enabled'));
        expect(enabledCb).toBeDefined();
        enabledCb!.checked = true;
        enabledCb!.dispatchEvent(new Event('change'));
        expect(fanCfg().enabled).toBe(true);
    });

    it('regulation_mode change handler (line 1879) updates regulation_mode', async () => {
        const root = await sensorsShadow(element);
        const select = root.querySelector('md3-select');
        expect(select).toBeDefined();
        select!.dispatchEvent(new CustomEvent('change', { detail: 'humidity' }));
        expect(fanCfg().regulation_mode).toBe('humidity');
    });

    it('VPD mode (default) — vpd_target, vpd_tolerance, min_speed, max_speed handlers fire (lines 1889–2004)', async () => {
        const root = await sensorsShadow(element);
        expect(allInputs(root).length).toBeGreaterThanOrEqual(4);
        dispatchAllInputs(root, '1.5');
        expect(fanCfg().vpd_target).toBeCloseTo(1.5);
        expect(fanCfg().vpd_tolerance).toBeCloseTo(1.5);
        expect(fanCfg().min_speed).toBeCloseTo(1.5);
        expect(fanCfg().max_speed).toBeCloseTo(1.5);
    });

    it('humidity mode — humidity_target / humidity_tolerance handlers fire (lines 1905–1911)', async () => {
        (element as any)._updateFanConfig({ regulation_mode: 'humidity' });
        const root = await sensorsShadow(element);
        dispatchAllInputs(root, '65');
        expect(fanCfg().humidity_target).toBeCloseTo(65);
        expect(fanCfg().humidity_tolerance).toBeCloseTo(65);
    });

    it('temperature mode — temperature_target / temperature_tolerance handlers fire (lines 1921–1929)', async () => {
        (element as any)._updateFanConfig({ regulation_mode: 'temperature' });
        const root = await sensorsShadow(element);
        dispatchAllInputs(root, '26');
        expect(fanCfg().temperature_target).toBeCloseTo(26);
        expect(fanCfg().temperature_tolerance).toBeCloseTo(26);
    });

    it('temperature override toggle expands section (line 1944) and wires critical temp handlers with null branch (lines 1961–1984)', async () => {
        // VPD mode (default) — override button present
        let root = await sensorsShadow(element);
        const overrideBtn = Array.from(root.querySelectorAll('button.md3-button.tonal'))
            .find((b) => b.textContent?.includes('Temperature Override')) as HTMLElement | undefined;
        expect(overrideBtn).toBeDefined();

        overrideBtn!.click();
        root = await sensorsShadow(element);
        expect((element as any)._fanTempOverrideExpanded).toBe(true);

        // Find the override row-col-grid: first `.row-col-grid` with margin-top style
        const overrideGrids = Array.from(
            root.querySelectorAll('.row-col-grid[style*="margin-top"]')
        );
        expect(overrideGrids.length).toBeGreaterThanOrEqual(1);
        const overrideInputs = Array.from(overrideGrids[0].querySelectorAll('md3-number-input'));
        expect(overrideInputs.length).toBe(3);

        // non-empty detail → parseFloat
        overrideInputs[0].dispatchEvent(new CustomEvent('change', { detail: '18' }));
        expect(fanCfg().critical_temp_low).toBeCloseTo(18);
        overrideInputs[1].dispatchEvent(new CustomEvent('change', { detail: '30' }));
        expect(fanCfg().critical_temp_high).toBeCloseTo(30);
        overrideInputs[2].dispatchEvent(new CustomEvent('change', { detail: '2' }));
        expect(fanCfg().critical_temp_hysteresis).toBeCloseTo(2);

        // empty detail → null (covers the else-branch at lines 1963 and 1972)
        overrideInputs[0].dispatchEvent(new CustomEvent('change', { detail: '' }));
        expect(fanCfg().critical_temp_low).toBeNull();
        overrideInputs[1].dispatchEvent(new CustomEvent('change', { detail: '' }));
        expect(fanCfg().critical_temp_high).toBeNull();

        // Collapse
        overrideBtn!.click();
        await element.updateComplete;
        expect((element as any)._fanTempOverrideExpanded).toBe(false);
    });

    it('wind_enabled toggle (lines 2014–2015) expands wind settings; period/amplitude handlers fire (lines 2025–2033)', async () => {
        let root = await sensorsShadow(element);
        const checkboxes = Array.from(
            root.querySelectorAll('input[type="checkbox"]')
        ) as HTMLInputElement[];
        const windCb = checkboxes.find((cb) => cb.closest('label')?.textContent?.includes('Dynamic Wind'));
        expect(windCb).toBeDefined();
        windCb!.checked = true;
        windCb!.dispatchEvent(new Event('change'));
        root = await sensorsShadow(element);
        expect(fanCfg().wind_enabled).toBe(true);

        // Wind inputs are the last margin-top row-col-grid *within the circulation
        // Fan Controller panel* — scope to that card so the sibling Exhaust Fan
        // Controller panel (rendered below it) doesn't shadow the global selector.
        const fanCard = Array.from(root.querySelectorAll('.detail-card'))
            .find((c) => c.querySelector('h3')?.textContent?.trim() === 'Fan Controller');
        expect(fanCard).toBeDefined();
        const marginGrids = Array.from(
            fanCard!.querySelectorAll('.row-col-grid[style*="margin-top"]')
        );
        const windInputs = Array.from(marginGrids[marginGrids.length - 1].querySelectorAll('md3-number-input'));
        expect(windInputs.length).toBe(2);

        windInputs[0].dispatchEvent(new CustomEvent('change', { detail: '90' }));
        expect(fanCfg().wind_period_seconds).toBeCloseTo(90);
        windInputs[1].dispatchEvent(new CustomEvent('change', { detail: '20' }));
        expect(fanCfg().wind_amplitude_pct).toBeCloseTo(20);
    });
});

// ─── Remaining branch gaps: lines 2725, 2770, 2969 ───────────────────────────

describe('ConfigDialog - remaining branch coverage (lines 2725, 2770, 2969)', () => {
    let element: ConfigDialog;

    beforeEach(async () => {
        mockCustomElements();
        element = new ConfigDialog();
        element.hass = { states: {}, callService: vi.fn() } as any;
        element.growspaceOptions = { gs1: 'Growspace 1' };
        element.devices = [
            { deviceId: 'gs1', name: 'Growspace 1', rows: 4, plantsPerRow: 4, notificationTarget: '' },
        ] as any;
        document.body.appendChild(element);
        element.open = true;
        await element.updateComplete;
    });

    afterEach(() => {
        document.body.removeChild(element);
        vi.clearAllMocks();
    });

    it('line 2725 false-branch: renders "Select a growspace" placeholder when envId empty and gsSub is idle', async () => {
        // envSelectedId = '' and growspaces sub = idle → growspaceId = '' → guard fires
        (element as any).envSelectedId = '';
        element.currentTab = ConfigTab.SUBAREAS;
        await element.updateComplete;

        expect(element.shadowRoot?.textContent).toContain('Select a growspace');
    });

    it('line 2725 true-branch: falls back to gsSub.growspaceId when envId empty and gsSub is editing', async () => {
        // SELECT_GROWSPACE puts tabs.growspaces.sub into { kind: 'editing', growspaceId: 'gs1', ... }
        (element as any)._t({ type: 'SELECT_GROWSPACE', growspaceId: 'gs1', name: 'Growspace 1', rows: 4, plantsPerRow: 4, notificationService: '' });
        (element as any).envSelectedId = '';
        element.currentTab = ConfigTab.SUBAREAS;
        await element.updateComplete;

        // growspaceId resolves to gsSub.growspaceId ('gs1') → subareas section renders (not placeholder)
        expect(element.shadowRoot?.textContent).not.toContain('Select a growspace');
    });

    it('line 2770 false-branch: non-Enter keydown on subarea name input does not call _handleAddSubarea', async () => {
        (element as any).envSelectedId = 'gs1';
        element.currentTab = ConfigTab.SUBAREAS;
        (element as any)._showAddSubarea = true;
        await element.updateComplete;

        const spy = vi.spyOn(element as any, '_handleAddSubarea').mockResolvedValue(undefined);

        const nameInput = element.shadowRoot?.querySelector('input.md3-input') as HTMLInputElement | null;
        expect(nameInput).toBeDefined();
        nameInput!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));

        expect(spy).not.toHaveBeenCalled();
    });

    it('line 2969 false-branch: rail hidden when allowedTabs has exactly one entry', async () => {
        element.allowedTabs = [ConfigTab.SENSORS];
        await element.updateComplete;

        expect(element.shadowRoot?.querySelector('.cfg-rail')).toBeNull();
    });
});

// ─── Tank row/form branch gaps: lines 2475, 2507, 2565 ───────────────────────

describe('ConfigDialog - Tank branch coverage (lines 2475, 2507, 2565)', () => {
    let element: ConfigDialog;

    beforeEach(async () => {
        mockCustomElements();
        element = new ConfigDialog();
        element.hass = { states: {}, callService: vi.fn() } as any;
        element.growspaceOptions = { gs1: 'Growspace 1' };
        element.devices = [
            { deviceId: 'gs1', name: 'Growspace 1', rows: 4, plantsPerRow: 4, notificationTarget: '' },
        ] as any;
        document.body.appendChild(element);
        element.open = true;
        element.currentTab = ConfigTab.TANKS;
        (element as any).envSelectedId = 'gs1';
        await element.updateComplete;
    });

    afterEach(() => {
        document.body.removeChild(element);
        vi.clearAllMocks();
    });

    it('line 2471/2474/2475: empty name falls back to "Tank 1"; null volumeLiters → nothing; null warningLevel → 30%', async () => {
        (element as any).envIrrigationTanks = [
            { sensorEntity: 'sensor.tank1', name: '', volumeLiters: null, warningLevel: null },
        ];
        await element.updateComplete;

        // name || 'Tank X' fallback (line 2471)
        expect(element.shadowRoot?.textContent).toContain('Tank 1');
        // warningLevel ?? 30 → 30% (line 2475)
        expect(element.shadowRoot?.textContent).toContain('30%');
        // volumeLiters == null → nothing branch — no "L" suffix (line 2474)
        expect(element.shadowRoot?.textContent).not.toMatch(/\d+ L/);
    });

    it('line 2507: IIFE guard returns nothing when tank sub kind is not adding or editing', async () => {
        // The only valid non-idle states are 'adding' and 'editing', so trigger the dead-code
        // branch by forcing a synthetic state that passes the outer kind !== 'idle' check
        // but fails the inner guard.
        const sm = (element as any)._sm;
        (element as any)._sm = {
            ...sm,
            tabs: {
                ...sm.tabs,
                tanks: { sub: { kind: 'confirm-delete' } },
            },
        };
        await element.updateComplete;

        // Outer condition (kind !== 'idle') is satisfied; inner guard short-circuits to nothing
        expect(element.shadowRoot?.querySelector('.md3-input-group')).toBeNull();
    });

    it('line 2565: warningLevel input cleared → parseFloat(NaN) || 30 stores 30', async () => {
        (element as any)._openAddTank();
        await element.updateComplete;

        // Distinguish warning level input (max="100") from volume input (no max)
        const inputs = Array.from(
            element.shadowRoot?.querySelectorAll('input.md3-input') ?? []
        ) as HTMLInputElement[];
        const warningInput = inputs.find((i) => i.type === 'number' && i.max === '100');
        expect(warningInput).toBeDefined();

        // First set a real value so the assertion below is non-vacuous
        warningInput!.value = '45';
        warningInput!.dispatchEvent(new Event('input'));
        expect((element as any)._sm.tabs.tanks.sub.warningLevel).toBe(45);

        // Now clear it → parseFloat('') = NaN, NaN || 30 = 30
        warningInput!.value = '';
        warningInput!.dispatchEvent(new Event('input'));
        expect((element as any)._sm.tabs.tanks.sub.warningLevel).toBe(30);
    });
});

// ─── Misc branch coverage: getters, setters, guards, setInitialState ──────────

describe('ConfigDialog - misc branch coverage (getters/setters/guards/setInitialState)', () => {
    let element: ConfigDialog;

    beforeEach(async () => {
        mockCustomElements();
        element = new ConfigDialog();
        element.hass = { states: {}, callService: vi.fn() } as any;
        element.growspaceOptions = { gs1: 'Growspace 1' };
        element.devices = [
            { deviceId: 'gs1', name: 'Growspace 1', rows: 4, plantsPerRow: 4, notificationTarget: '' },
        ] as any;
        document.body.appendChild(element);
        element.open = true;
        await element.updateComplete;
    });

    afterEach(() => {
        document.body.removeChild(element);
        vi.clearAllMocks();
    });

    it('edit/add getters return defaults when sub-state is idle (lines 291,297,303,309,315,324,333,342)', () => {
        // sub.kind = 'idle' by default — all ternary false-branches fire
        expect((element as any).editName).toBe('');
        expect((element as any).editRows).toBe(0);
        expect((element as any).editPlantsPerRow).toBe(0);
        expect((element as any).editNotificationService).toBe('');
        expect((element as any).addName).toBe('');
        expect((element as any).addRows).toBe(4);
        expect((element as any).addPlantsPerRow).toBe(4);
        expect((element as any).addNotificationService).toBe('');
    });

    it('addRows/addPlantsPerRow/addNotificationService setters trigger START_ADD_GROWSPACE when idle (lines 327,336,345)', () => {
        // sub.kind = 'idle' → setters should call START_ADD_GROWSPACE then UPDATE_ADD_DRAFT
        expect((element as any)._sm.tabs.growspaces.sub.kind).toBe('idle');
        (element as any).addRows = 6;
        expect((element as any)._sm.tabs.growspaces.sub.kind).toBe('adding');
        expect((element as any).addRows).toBe(6);

        // Reset to idle and test the other two setters
        (element as any)._t({ type: 'CANCEL_GROWSPACES' });
        (element as any).addPlantsPerRow = 3;
        expect((element as any)._sm.tabs.growspaces.sub.kind).toBe('adding');
        expect((element as any).addPlantsPerRow).toBe(3);

        (element as any)._t({ type: 'CANCEL_GROWSPACES' });
        (element as any).addNotificationService = 'notify.mobile';
        expect((element as any)._sm.tabs.growspaces.sub.kind).toBe('adding');
        expect((element as any).addNotificationService).toBe('notify.mobile');
    });

    it('_newSubareaName getter returns "" when sub is not adding (line 387)', () => {
        // sub.kind = 'idle' → false branch of ternary
        expect((element as any)._newSubareaName).toBe('');
    });

    it('setInitialState without environmentData leaves draft at defaults (line 943)', () => {
        // No environmentData → envPartial = {} → SM uses initial draft
        element.setInitialState(ConfigTab.SENSORS);
        expect((element as any)._sm.environmentDraft.selectedGrowspaceId).toBe('');
    });

    it('setInitialState with legacy single-sensor fields maps to arrays (lines 948,953,956,958)', () => {
        element.setInitialState(ConfigTab.SENSORS, {
            selectedGrowspaceId: 'gs1',
            // no *Sensors arrays → falls back to legacy single-sensor fields
            temperatureSensor: 'sensor.temp',
            humiditySensor: 'sensor.hum',
            vpdSensor: 'sensor.vpd',
            // no lightSensors / lightSensor
        } as any);
        expect((element as any)._sm.environmentDraft.temperatureSensors).toEqual(['sensor.temp']);
        expect((element as any)._sm.environmentDraft.humiditySensors).toEqual(['sensor.hum']);
        expect((element as any)._sm.environmentDraft.vpdSensors).toEqual(['sensor.vpd']);
    });

    it('_editTank with empty/null fields uses || and ?? fallbacks (lines 1363–1366)', () => {
        (element as any).envIrrigationTanks = [
            { sensorEntity: '', name: '', volumeLiters: null, warningLevel: null },
        ];
        (element as any)._updateFanConfig; // ensure element is set up
        (element as any)._editTank(0);
        const sub = (element as any)._sm.tabs.tanks.sub;
        expect(sub.kind).toBe('editing');
        expect(sub.sensorEntity).toBe('');   // || '' fallback
        expect(sub.name).toBe('');            // || '' fallback
        expect(sub.volumeLiters).toBeNull();  // ?? null fallback
        expect(sub.warningLevel).toBe(30);   // ?? 30 fallback
    });

    it('_saveTank returns early when kind is idle (line 1377)', () => {
        // kind = 'idle' → first guard fires, method returns without committing
        expect((element as any)._sm.tabs.tanks.sub.kind).toBe('idle');
        (element as any)._saveTank(); // should not throw or change state
        expect((element as any)._sm.tabs.tanks.sub.kind).toBe('idle');
    });

    it('_handleSaveGroup updates existing group when found (line 1405 index >= 0 branch)', () => {
        const existing = { id: 'g1', name: 'Group A', sensors: [] };
        (element as any)._t({ type: 'UPDATE_ENV_DRAFT', partial: { sensorGroups: [existing] } });

        const updated = { id: 'g1', name: 'Group A Renamed', sensors: ['sensor.a'] };
        (element as any)._handleSaveGroup(new CustomEvent('save-sensor-group', { detail: { group: updated } }));

        const groups = (element as any)._sm.environmentDraft.sensorGroups;
        expect(groups).toHaveLength(1);
        expect(groups[0].name).toBe('Group A Renamed');
    });

    it('_confirmDeleteGrowspace returns early when not in confirm-delete state (line 1146)', () => {
        const spy = vi.fn();
        element.addEventListener('delete-growspace-submit', spy);
        // sub.kind = 'idle' → guard fires → returns without dispatching
        (element as any)._confirmDeleteGrowspace();
        expect(spy).not.toHaveBeenCalled();
    });

    it('_populateEditFields returns early when devices is undefined (line 1194)', () => {
        (element as any).devices = undefined;
        // Should not throw; the guard at line 1194 prevents the find() call
        expect(() => (element as any)._populateEditFields('gs1')).not.toThrow();
    });

    it('_loadSubareas uses gsSub.growspaceId when envId is empty and sub is editing (line 1420)', async () => {
        (element as any)._t({ type: 'SELECT_GROWSPACE', growspaceId: 'gs1', name: 'GS', rows: 4, plantsPerRow: 4, notificationService: '' });
        (element as any).envSelectedId = '';

        const loadSpy = vi.spyOn(element as any, '_loadSubareas').mockResolvedValue(undefined);
        // Directly test the editId fallback by calling the real method once
        loadSpy.mockRestore();

        const { getSubareas: mockGet } = await import('../../../src/slices/subarea');
        vi.mocked(mockGet).mockResolvedValueOnce([]);
        await (element as any)._loadSubareas();

        // growspaceId = '' || 'gs1' (from gsSub.growspaceId) → loaded with 'gs1'
        expect((element as any)._subareasGrowspaceId).toBe('gs1');
    });

    it('_handleAddSubarea returns early when sub is not adding (line 1441)', async () => {
        // sub.kind = 'idle' → name = '' → early return
        expect((element as any)._sm.tabs.subareas.sub.kind).toBe('idle');
        const { addSubarea: mockAdd } = await import('../../../src/slices/subarea');
        await (element as any)._handleAddSubarea();
        expect(vi.mocked(mockAdd)).not.toHaveBeenCalled();
    });
});
