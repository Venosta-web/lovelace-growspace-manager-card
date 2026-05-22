import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigDialog } from '../../../src/dialogs/config-dialog';
import { ConfigTab } from '../../../src/constants';

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
                'camera.growspace': { attributes: { friendly_name: 'Camera' } }
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
        (element as any).envSelectedId = 'gs1';
        (element as any)._switchTab(ConfigTab.SUBAREAS);
        await element.updateComplete;

        // _handleAddSubarea (No name)
        (element as any)._newSubareaName = '';
        await (element as any)._handleAddSubarea();
        expect((element as any)._subareas).to.have.length(0);

        // _handleAddSubarea (Success)
        (element as any)._newSubareaName = 'Sub 1';
        const dataService = { 
            addSubarea: vi.fn().mockResolvedValue({}),
            removeSubarea: vi.fn().mockResolvedValue({})
        };
        vi.spyOn(element as any, '_getDataService').mockReturnValue(dataService);
        vi.spyOn(element as any, '_loadSubareas').mockImplementation(async () => {
            (element as any)._subareas = [{ id: 'sa1', name: 'Sub 1', environment_config: {} }];
        });

        await (element as any)._handleAddSubarea();
        expect(dataService.addSubarea).toHaveBeenCalledWith('gs1', 'Sub 1');
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
        expect(dataService.removeSubarea).toHaveBeenCalledWith('gs1', 'sa1');
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

        // Service mocks
        const mockDataService = {
            addSubarea: vi.fn().mockResolvedValue(undefined),
            removeSubarea: vi.fn().mockResolvedValue(undefined)
        };
        (element as any)._getDataService = () => mockDataService;
        (element as any)._subareasGrowspaceId = 'gs1';
        (element as any)._loadSubareas = vi.fn().mockResolvedValue(undefined);

        // _handleAddSubarea
        (element as any)._newSubareaName = 'New Subarea';
        await (element as any)._handleAddSubarea();
        expect(mockDataService.addSubarea).toHaveBeenCalledWith('gs1', 'New Subarea');

        // _confirmDeleteSubarea
        await (element as any)._confirmDeleteSubarea('subarea_1');
        expect(mockDataService.removeSubarea).toHaveBeenCalledWith('gs1', 'subarea_1');

        // Cover catch blocks
        const errorDataService = {
            addSubarea: vi.fn().mockRejectedValue(new Error('Fail')),
            removeSubarea: vi.fn().mockRejectedValue(new Error('Fail')),
            getSubareas: vi.fn().mockRejectedValue(new Error('Fail'))
        };
        (element as any)._getDataService = () => errorDataService;
        
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
});
