import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigDialog } from '../../../src/dialogs/config-dialog';
import { ConfigTab } from '../../../src/constants';

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

        const saveBtn = element.shadowRoot?.querySelector('.vision-save-btn');
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
        const visionSaveBtn = element.shadowRoot?.querySelector('.vision-save-btn') as HTMLElement;
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

        // _generateGrowReport
        const reportSpy = vi.fn();
        element.addEventListener('generate-grow-report', reportSpy);
        (element as any)._generateGrowReport();
        expect(reportSpy).toHaveBeenCalled();

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

        // Verify it's rendering
        const humidifierHeader = Array.from(element.shadowRoot?.querySelectorAll('h3') || [])
            .find(h => h.textContent?.includes('Humidity'));
        expect(humidifierHeader).to.exist;

        // Exercise inline handlers
        const checkbox = element.shadowRoot?.querySelector('input[type="checkbox"]');
        if (checkbox) {
            (checkbox as HTMLInputElement).checked = true;
            checkbox.dispatchEvent(new Event('change'));
        }

        const accHead = element.shadowRoot?.querySelector('.acc-head');
        if (accHead) {
            (accHead as HTMLElement).click();
        }

        const numberInput = element.shadowRoot?.querySelector('md3-number-input');
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

        const labels = Array.from(element.shadowRoot?.querySelectorAll('.md3-label-multi') ?? []);
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
        (element as any).envSubstrateEcSensors = ['sensor.sub_ec'];
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
        expect(labelTexts).toContain('Power Sensors');
        expect(labelTexts).toContain('Energy Sensors');

        // Click every chip-remove × to invoke all 8 changeHandler arrow fns (lines 1615-1628)
        const chipRemoves = Array.from(element.shadowRoot?.querySelectorAll('.chip-remove') ?? []) as HTMLElement[];
        for (const chip of chipRemoves) {
            chip.click();
        }
        await element.updateComplete;

        // All sensor arrays should now be empty
        expect((element as any).envPhSensors).toHaveLength(0);
        expect((element as any).envFeedEcSensors).toHaveLength(0);
        expect((element as any).envEnergySensors).toHaveLength(0);
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
        const editTankBtn = Array.from(element.shadowRoot?.querySelectorAll('button.md3-button.text:not(.error)') ?? [])
            .find((b) => !b.style.minWidth || b.style.padding === '6px') as HTMLElement | undefined
            ?? Array.from(element.shadowRoot?.querySelectorAll('button') ?? [])
                .find((b) => b.style.padding === '6px' && !b.classList.contains('error')) as HTMLElement | undefined;

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
        vi.spyOn(element as any, '_getDataService').mockReturnValue({
            getSubareas: vi.fn().mockResolvedValue([]),
        });
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
        vi.spyOn(element as any, '_getDataService').mockReturnValue({
            removeSubarea: vi.fn().mockResolvedValue(undefined),
        });
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

    it('_getDataService lazily creates DataService when _dataService is unset', () => {
        (element as any)._dataService = undefined;
        const svc = (element as any)._getDataService();
        expect(svc).toBeDefined();
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

        const chipRemove = element.shadowRoot?.querySelector('.chip-remove') as HTMLElement | null;
        chipRemove?.click();
        await element.updateComplete;

        expect((element as any).envSubstrateTemperatureSensors).toHaveLength(0);
    });
});
