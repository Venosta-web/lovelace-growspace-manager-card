import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigDialog } from '../../../src/dialogs/config-dialog';
import { ConfigTab } from '../../../src/constants';
import { needsExhaustCall } from '../../../src/features/config/environment-save';
import {
  readThreshold,
  DEFAULT_DEHUM_THRESHOLDS,
  HUMIDITY_STAGES,
} from '../../../src/features/config/viewmodels/humidity-tab.viewmodel';
import { html } from 'lit';
import { pickEntity, pickEntityIn, pickerOptions } from '../../harness/entity-picker';

// Env tabs are nested dumb components behind their own shadow roots (ADR-0019,
// "Applied to Config Dialog"); pierce whichever is active. Still-inline env tabs
// (Humidity, etc.) fall back to the dialog's own shadow.
async function sensorsShadow(element: ConfigDialog): Promise<ShadowRoot> {
  await element.updateComplete;
  const tab = element.shadowRoot!.querySelector(
    'config-sensors-tab, config-climate-tab, config-humidity-tab, config-vision-tab, config-growspaces-tab, config-heatmap-tab'
  ) as (HTMLElement & { updateComplete: Promise<boolean> }) | null;
  if (tab) {
    await tab.updateComplete;
    return tab.shadowRoot!;
  }
  return element.shadowRoot!;
}

type EntityMultiSelectElement = HTMLElement & {
  label: string;
  shadowRoot: ShadowRoot;
};

function entityPicker(root: ShadowRoot, label: string): EntityMultiSelectElement | undefined {
  return Array.from(
    root.querySelectorAll<EntityMultiSelectElement>('config-entity-multi-select')
  ).find((picker) => picker.label === label);
}

class HaEntityPickerMock extends HTMLElement {
  get value() {
    return this.getAttribute('value') || '';
  }
  set value(v) {
    this.setAttribute('value', v);
  }

  set label(v) {
    this.setAttribute('label', v);
  }
  get label() {
    return this.getAttribute('label') || '';
  }

  set includeDomains(v) {
    (this as any)._domains = v;
  }
  get includeDomains() {
    return (this as any)._domains;
  }

  set includeDeviceClasses(v) {
    (this as any)._classes = v;
  }
  get includeDeviceClasses() {
    return (this as any)._classes;
  }
}

// Mock Dependencies
vi.mock('../../../src/features/shared/ui/md3-text-input', () => ({
  Md3TextInput: class extends HTMLElement {
    get value() {
      return this.getAttribute('value') || '';
    }
    set value(v) {
      this.setAttribute('value', v);
      // Simulate internal update if needed, but for tests usually we dispatch event manually or check attribute
    }
  },
}));
vi.mock('../../../src/features/shared/ui/md3-number-input', () => ({
  Md3NumberInput: class extends HTMLElement {
    get value() {
      return this.getAttribute('value') || '';
    }
    set value(v) {
      this.setAttribute('value', v);
    }
  },
}));
vi.mock('../../../src/features/shared/ui/md3-select', () => ({
  Md3Select: class extends HTMLElement {},
}));

describe('ConfigDialog', () => {
  let element: ConfigDialog;
  let mockHass: any;

  beforeEach(async () => {
    if (!customElements.get('config-dialog')) {
      customElements.define('config-dialog', ConfigDialog);
    }
    // Mock ha-dialog
    if (!customElements.get('ha-dialog')) {
      class HaDialogMock extends HTMLElement {
        open = false;
      }
      customElements.define('ha-dialog', HaDialogMock);
    }
    if (!customElements.get('ha-entity-picker')) {
      customElements.define('ha-entity-picker', HaEntityPickerMock);
    }

    element = new ConfigDialog();

    mockHass = {
      states: {
        'sensor.temp': {
          entity_id: 'sensor.temp',
          attributes: { friendly_name: 'Temp Sensor', device_class: 'temperature' },
        },
        'sensor.hum': {
          entity_id: 'sensor.hum',
          attributes: { friendly_name: 'Hum Sensor', device_class: 'humidity' },
        },
        'switch.fan': { entity_id: 'switch.fan', attributes: { friendly_name: 'Fan Switch' } },
        'sensor.vpd': {
          entity_id: 'sensor.vpd',
          attributes: { friendly_name: 'VPD', device_class: 'pressure' },
        },
        'sensor.co2': {
          entity_id: 'sensor.co2',
          attributes: { friendly_name: 'CO2', device_class: 'carbon_dioxide' },
        },
        'sensor.soil': {
          entity_id: 'sensor.soil',
          attributes: { friendly_name: 'Soil', device_class: 'moisture' },
        },
        'sensor.light': { entity_id: 'sensor.light', attributes: { friendly_name: 'Light' } },
        'switch.exhaust': { entity_id: 'switch.exhaust', attributes: { friendly_name: 'Exhaust' } },
        'switch.humidifier': {
          entity_id: 'switch.humidifier',
          attributes: { friendly_name: 'Humidifier' },
        },
        'switch.dehumidifier': {
          entity_id: 'switch.dehumidifier',
          attributes: { friendly_name: 'Dehumidifier' },
        },
        'switch.circulation': {
          entity_id: 'switch.circulation',
          attributes: { friendly_name: 'Circulation' },
        },
        mobile_app_test: { entity_id: 'mobile_app_test', attributes: {} },
      },
      services: {
        notify: {
          mobile_app_phone: {},
          mobile_app_test: {},
          persistent_notification: {},
        },
      },
      localize: (key: string) => `[${key}]`,
      callService: vi.fn().mockResolvedValue(undefined),
    };
    element.hass = mockHass;

    element.growspaceOptions = {
      gs1: 'Growspace 1',
      gs2: 'Growspace 2',
    };

    element.devices = [
      {
        deviceId: 'gs1',
        name: 'Growspace 1',
        rows: 4,
        plantsPerRow: 4,
        notificationTarget: 'mobile_app_phone',
        environmentAttributes: {
          temperatureSensor: 'sensor.temp',
          humiditySensor: 'sensor.hum',
        },
      } as any,
    ];

    element.open = true;
    document.body.appendChild(element);
    await element.updateComplete;
  });

  afterEach(() => {
    if (element.isConnected) document.body.removeChild(element);
  });

  describe('Tabs Navigation', () => {
    it('should switch tabs', async () => {
      const tabs = element.shadowRoot?.querySelectorAll('.cfg-nav-item');
      const growspacesTab = Array.from(tabs || []).find((t) =>
        t.textContent?.includes('Growspaces')
      );
      (growspacesTab as HTMLElement)?.click();
      await element.updateComplete;
      expect(element.currentTab).toBe(ConfigTab.GROWSPACES);
    });
  });

  describe('Add Growspace Tab', () => {
    beforeEach(async () => {
      element.currentTab = ConfigTab.GROWSPACES;
      (element as any)._isAddingGrowspace = true;
      await element.updateComplete;
    });

    it('should render inputs', async () => {
      const nameInput = (await sensorsShadow(element)).querySelector(
        'md3-text-input[label="Growspace Name"]'
      );
      expect(nameInput).toBeTruthy();
    });

    it('should submit new growspace', async () => {
      const listener = vi.fn();
      element.addEventListener('add-growspace-submit', listener);

      // Simulate input
      (element as any).addName = 'New GS';
      (element as any).addRows = 5;

      // Find submit button
      const btn = element.shadowRoot?.querySelector('button.md3-button.primary');
      (btn as HTMLElement)?.click();

      expect(listener).toHaveBeenCalled();
      const detail = listener.mock.calls[0][0].detail;
      expect(detail.name).toBe('New GS');
      expect(detail.rows).toBe(5);
    });

    it('should list mobile app services', async () => {
      const select = (await sensorsShadow(element)).querySelector('select');
      const options = select?.querySelectorAll('option');
      // None + mobile_app_phone = 2
      expect(options?.length).toBeGreaterThanOrEqual(2);
      expect(select?.innerHTML).toContain('phone');
    });
  });

  describe('Edit Growspace Tab', () => {
    beforeEach(async () => {
      element.currentTab = ConfigTab.GROWSPACES;
      await element.updateComplete;
    });

    it('should populate fields when growspace selected', async () => {
      const gsRow = (await sensorsShadow(element)).querySelector('.cfg-gs-row') as HTMLElement;
      gsRow?.click();
      await element.updateComplete;

      expect((element as any).editName).toBe('Growspace 1');
      expect((element as any).editRows).toBe(4);

      const nameInput = (await sensorsShadow(element)).querySelector(
        'md3-text-input[label="Growspace Name"]'
      );
      expect((nameInput as any).value).toBe('Growspace 1');
    });

    it('should submit updates', async () => {
      (element as any).editSelectedId = 'gs1';
      (element as any).editName = 'Updated GS';
      (element as any).envSelectedId = 'gs1';
      (element as any).envTemperatureSensors = ['sensor.temp'];
      (element as any).envHumiditySensors = ['sensor.hum'];
      await element.updateComplete;

      const listener = vi.fn();
      element.addEventListener('edit-growspace-submit', listener);

      const btn = Array.from(element.shadowRoot?.querySelectorAll('button') || []).find((b) =>
        b.textContent?.includes('Save Growspace & Environment')
      );
      (btn as HTMLElement)?.click();

      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0].detail.name).toBe('Updated GS');
    });

    it('should handle delete confirmation flow', async () => {
      (element as any).editSelectedId = 'gs1';
      (element as any).editName = 'GS 1';
      await element.updateComplete;

      // Click Delete
      const delBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || []).find((b) =>
        b.textContent?.includes('Delete')
      );
      (delBtn as HTMLElement)?.click();
      await element.updateComplete;

      // Should show confirmation (now in the nested component)
      expect((await sensorsShadow(element)).querySelector('h3')?.textContent).toContain(
        'Delete Growspace?'
      );

      // Click Confirm
      const listener = vi.fn();
      element.addEventListener('delete-growspace-submit', listener);

      const confirmBtn = Array.from(element.shadowRoot?.querySelectorAll('button') || []).find(
        (b) => b.textContent?.includes('Confirm Delete')
      );
      (confirmBtn as HTMLElement)?.click();

      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0].detail.growspace_id).toBe('gs1');

      // Should reset
      expect((element as any).editSelectedId).toBe('');
    });
  });

  describe('Environment Tab', () => {
    beforeEach(async () => {
      element.initialTab = ConfigTab.SENSORS;
      element.currentTab = ConfigTab.SENSORS;
      await element.updateComplete;
    });

    it('should load initial state', async () => {
      (element as any)._seedFromDevice({
        deviceId: 'gs1',
        environmentAttributes: {
          temperatureSensor: 'sensor.temp',
          temperatureSensors: ['sensor.temp'],
          humiditySensor: 'sensor.hum',
          humiditySensors: ['sensor.hum'],
          dehumidifierControlEnabled: true,
        },
      });
      await element.updateComplete;

      // Check selected growspace
      const gsSelect = element.shadowRoot?.querySelector('select.cfg-context-select');
      expect((gsSelect as HTMLSelectElement)?.value).toBe('gs1');

      // Check temp sensor chip is visible in multi-select
      expect((element as any).envTemperatureSensors).toEqual(['sensor.temp']);
    });

    it('should offer only the device-class-matching entities in the picker', async () => {
      const picker = entityPicker(await sensorsShadow(element), 'Temperature Sensors');
      const values = pickerOptions(picker!.shadowRoot);

      expect(values).toContain('sensor.temp');
      expect(values).not.toContain('sensor.hum'); // Wrong device class
    });

    it('should submit configuration', async () => {
      (element as any).envSelectedId = 'gs1';
      (element as any).envTemperatureSensors = ['sensor.new'];
      (element as any).envHumiditySensors = ['sensor.hum'];
      await element.updateComplete;

      const listener = vi.fn();
      element.addEventListener('configure-environment-submit', listener);

      const btn = element.shadowRoot?.querySelector('button.md3-button.primary');
      (btn as HTMLElement)?.click();

      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0].detail.temperatureSensors).toEqual(['sensor.new']);
    });
  });

  describe('Full Environment Input Coverage', () => {
    beforeEach(async () => {
      element.currentTab = ConfigTab.SENSORS;
      await element.updateComplete;
    });

    it('should update all environment sensors', async () => {
      const updateMultiPicker = async (label: string, value: string) => {
        const picker = entityPicker(await sensorsShadow(element), label);
        if (picker) {
          pickEntity(picker.shadowRoot, value);
          await element.updateComplete;
        }
      };

      const updateSinglePicker = async (label: string, value: string) => {
        const picker = Array.from(
          (await sensorsShadow(element)).querySelectorAll<HTMLElement & { label: string }>(
            'gm-entity-picker'
          )
        ).find((candidate) => candidate.label === label);
        if (picker) {
          pickEntityIn(picker, value);
          await element.updateComplete;
        }
      };

      // All basic sensors are now multi-selects
      await updateMultiPicker('Temperature Sensors', 'sensor.temp');
      expect((element as any).envTemperatureSensors).toEqual(['sensor.temp']);

      await updateMultiPicker('Humidity Sensors', 'sensor.hum');
      expect((element as any).envHumiditySensors).toEqual(['sensor.hum']);

      await updateMultiPicker('VPD Sensors (Optional)', 'sensor.vpd');
      expect((element as any).envVpdSensors).toEqual(['sensor.vpd']);

      await updateSinglePicker('Soil Moisture Sensor', 'sensor.soil');
      expect((element as any).envSoilMoistureSensor).toBe('sensor.soil');

      await updateSinglePicker('CO₂ Sensor', 'sensor.co2');
      expect((element as any).envCo2Sensor).toBe('sensor.co2');

      // Multi (still in SENSORS tab)
      await updateMultiPicker('Light Source / Sensor', 'sensor.light');
      expect((element as any).envLightSensors).toEqual(['sensor.light']);

      // Exhaust / Circulation moved to CLIMATE tab
      element.currentTab = ConfigTab.CLIMATE;
      await element.updateComplete;

      await updateMultiPicker('Exhaust Fan / Switch', 'switch.exhaust');
      expect((element as any).envExhaustFanEntities).toEqual(['switch.exhaust']);

      await updateMultiPicker('Circulation Fan / Switch', 'switch.circulation');
      expect((element as any).envCirculationFanEntities).toEqual(['switch.circulation']);

      // Humidifier / Dehumidifier moved to HUMIDITY tab
      element.currentTab = ConfigTab.HUMIDITY;
      await element.updateComplete;

      await updateMultiPicker('Humidifier', 'switch.humidifier');
      expect((element as any).envHumidifierEntities).toEqual(['switch.humidifier']);

      await updateMultiPicker('Dehumidifier', 'switch.dehumidifier');
      expect((element as any).envDehumidifierEntities).toEqual(['switch.dehumidifier']);
    });

    it('should update thresholds', async () => {
      const numbers = Array.from(element.shadowRoot?.querySelectorAll('md3-number-input') || []);
      // 0: Stress, 1: Mold
      if (numbers[0]) {
        numbers[0].dispatchEvent(new CustomEvent('change', { detail: '1.5' }));
        await element.updateComplete;
        expect((element as any).envStressThreshold).toBe(1.5);
      }
      if (numbers[1]) {
        numbers[1].dispatchEvent(new CustomEvent('change', { detail: '2.5' }));
        await element.updateComplete;
        expect((element as any).envMoldThreshold).toBe(2.5);
      }
    });
  });

  describe('Dehumidifier Tab Complex Logic', () => {
    beforeEach(async () => {
      element.currentTab = ConfigTab.HUMIDITY;
      (element as any)._openHumidityStageId = 'seedling';
      (element as any).envDehumidifierThresholds = {
        seedling: { day: { on: 0.8, off: 1.0 }, night: { on: 0.9, off: 1.1 } },
      };
      await element.updateComplete;
    });

    it('should update control dehumidifier checkbox', async () => {
      const checks = (await sensorsShadow(element)).querySelectorAll('input[type="checkbox"]');
      const dehumCheck = Array.from(checks || []).find((c) => {
        const label = c.closest('label');
        return label?.textContent?.includes('Dehumidifier Control');
      }) as HTMLInputElement;
      if (dehumCheck) {
        dehumCheck.checked = true;
        dehumCheck.dispatchEvent(new Event('change'));
        await element.updateComplete;
      }
      expect((element as any).envDehumidifierControlEnabled).toBe(true);
    });

    it('should switch stages via accordion', async () => {
      const accHeads = (await sensorsShadow(element)).querySelectorAll('.acc-head');
      const vegHead = Array.from(accHeads || []).find((h) => h.textContent?.includes('Vegetative'));
      (vegHead as HTMLElement)?.click();
      await element.updateComplete;

      expect((element as any)._openHumidityStageId).toBe('veg');
    });

    it('should update specific threshold points', async () => {
      // We need to target specific inputs in the Day/Night groups
      // Layout is:
      // - Day Group
      //   - On Input
      //   - Off Input
      // - Night Group
      //   - On Input
      //   - Off Input

      const inputs = Array.from(
        (await sensorsShadow(element)).querySelectorAll('md3-number-input')
      );
      // Order: Day On, Day Off, Night On, Night Off

      // Update Day Off (Index 1)
      inputs[1]?.dispatchEvent(new CustomEvent('change', { detail: '1.2' }));
      await element.updateComplete;
      expect((element as any).envDehumidifierThresholds.seedling.day.off).toBe(1.2);

      // Update Night On (Index 2)
      inputs[2]?.dispatchEvent(new CustomEvent('change', { detail: '0.95' }));
      await element.updateComplete;
      expect((element as any).envDehumidifierThresholds.seedling.night.on).toBe(0.95);
    });

    it('should handle invalid inputs gracefully', async () => {
      const inputs = Array.from(
        (await sensorsShadow(element)).querySelectorAll('md3-number-input')
      );
      const dayOn = inputs[0];

      // Initial value
      const initial = (element as any).envDehumidifierThresholds.seedling.day.on;

      dayOn?.dispatchEvent(new CustomEvent('change', { detail: 'not-a-number' }));
      await element.updateComplete;

      expect((element as any).envDehumidifierThresholds.seedling.day.on).toBe(initial);
    });

    it('should initialize stage if missing during write', async () => {
      (element as any)._openHumidityStageId = 'dry';
      await element.updateComplete;

      const inputs = Array.from(
        (await sensorsShadow(element)).querySelectorAll('md3-number-input')
      );
      // Write to Day On (first input in dry accordion)
      inputs[0]?.dispatchEvent(new CustomEvent('change', { detail: '0.5' }));
      await element.updateComplete;

      // Check deep structure created — key is 'dry' (backend PlantStage.DRY value)
      expect((element as any).envDehumidifierThresholds.dry.day.on).toBe(0.5);
      // Verify other defaults
      expect((element as any).envDehumidifierThresholds.dry.day.off).toBe(0);
    });
  });

  describe('Input Change Handlers (Add/Edit)', () => {
    beforeEach(async () => {
      // Reset
      element.open = true;
      await element.updateComplete;
    });

    it('should update Add Growspace inputs', async () => {
      element.currentTab = ConfigTab.GROWSPACES;
      (element as any)._isAddingGrowspace = true;
      const root = await sensorsShadow(element);

      // Name
      const nameInput = root.querySelector('md3-text-input[label="Growspace Name"]');
      nameInput?.dispatchEvent(new CustomEvent('change', { detail: 'New Name' }));

      // Rows
      const rowsInput = root.querySelector('md3-number-input[label="Rows"]');
      rowsInput?.dispatchEvent(new CustomEvent('change', { detail: '8' }));

      // Plants Per Row
      const pprInput = root.querySelector('md3-number-input[label="Plants per Row"]');
      pprInput?.dispatchEvent(new CustomEvent('change', { detail: '8' }));

      // Notification Service (Select)
      const select = root.querySelector('select');
      if (select) {
        select.value = 'mobile_app_test';
        select.dispatchEvent(new Event('change'));
      }

      await element.updateComplete;

      expect((element as any).addName).toBe('New Name');
      expect((element as any).addRows).toBe(8);
      expect((element as any).addPlantsPerRow).toBe(8);
      expect((element as any).addNotificationService).toBe('mobile_app_test');
    });

    it('should update Edit Growspace inputs', async () => {
      element.currentTab = ConfigTab.GROWSPACES;
      (element as any).editSelectedId = 'gs1'; // Select one to show fields
      const root = await sensorsShadow(element);

      // Name
      const nameInput = root.querySelector('md3-text-input[label="Growspace Name"]');
      nameInput?.dispatchEvent(new CustomEvent('change', { detail: 'Edited Name' }));

      // Rows
      const rowsInput = root.querySelector('md3-number-input[label="Rows"]');
      rowsInput?.dispatchEvent(new CustomEvent('change', { detail: '6' }));

      // Plants Per Row
      const pprInput = root.querySelector('md3-number-input[label="Plants per Row"]');
      pprInput?.dispatchEvent(new CustomEvent('change', { detail: '6' }));

      // Notification Service (Select)
      const notifySelect = root.querySelectorAll('select')?.[0];

      if (notifySelect) {
        notifySelect.value = 'mobile_app_test';
        notifySelect.dispatchEvent(new Event('change'));
      }

      await element.updateComplete;

      expect((element as any).editName).toBe('Edited Name');
      expect((element as any).editRows).toBe(6);
      expect((element as any).editPlantsPerRow).toBe(6);
      expect((element as any).editNotificationService).toBe('mobile_app_test');
    });
  });

  function selectChange(el: HTMLElement) {
    el.dispatchEvent(new Event('change'));
  }
  describe('Config Coverage Gaps', () => {
    it('should populate notification service in add submission', () => {
      const listener = vi.fn();
      element.addEventListener('add-growspace-submit', listener);

      // Must enter adding state before setting add draft fields
      (element as any)._isAddingGrowspace = true;
      (element as any).addName = 'New GS';
      (element as any).addNotificationService = 'mobile_app_test';

      // Trigger submit
      (element as any)._submitAddGrowspace();

      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0].detail.notificationService).toBe('mobile_app_test');
    });

    it('should handle edit population when device is not found', () => {
      // In the SM design, _populateEditFields is a no-op when device is not found.
      // editSelectedId stays empty; no stale state leaks through.
      (element as any)._populateEditFields('non_existent_id');
      expect((element as any).editSelectedId).toBe('');
    });

    it('should close dialog via header button', async () => {
      element.open = true;
      await element.updateComplete;

      const closeBtn = element.shadowRoot?.querySelector('.dialog-header button.text');
      const listener = vi.fn();
      element.addEventListener('close', listener);

      (closeBtn as HTMLElement)?.click();
      expect(listener).toHaveBeenCalled();
    });

    it('should render correct tab content based on property', async () => {
      element.currentTab = ConfigTab.GROWSPACES;
      expect((await sensorsShadow(element)).querySelector('.cfg-master-list')).toBeTruthy();

      element.currentTab = ConfigTab.HUMIDITY;
      expect((await sensorsShadow(element)).querySelector('.acc-card')).toBeTruthy();
    });
  });

  describe('Coverage Gap Fillers', () => {
    it('should switch to sensors tab', async () => {
      const tabs = element.shadowRoot?.querySelectorAll('.cfg-nav-item');
      const sensorsTab = Array.from(tabs || []).find((t) => t.textContent?.includes('Sensors'));
      (sensorsTab as HTMLElement)?.click();
      await element.updateComplete;

      expect((element as any).currentTab).toBe(ConfigTab.SENSORS);
    });

    it('should switch to humidity tab', async () => {
      const tabs = element.shadowRoot?.querySelectorAll('.cfg-nav-item');
      const humidityTab = Array.from(tabs || []).find((t) => t.textContent?.includes('Humidity'));
      (humidityTab as HTMLElement)?.click();
      await element.updateComplete;

      expect((element as any).currentTab).toBe(ConfigTab.HUMIDITY);
    });

    // The threshold-read logic moved to the Humidity VM (ADR-0019); these
    // assert it at its new home (readThreshold) instead of the removed
    // inline `_getThresholdValue` shell helper.
    it('should return 0 for unknown stage threshold value', () => {
      expect(readThreshold({}, DEFAULT_DEHUM_THRESHOLDS, 'unknown_stage', 'day', 'on')).toBe(0);
    });

    it('should return correct threshold value when present', () => {
      const thresholds = { veg: { day: { on: 1.5, off: 1.2 } } };
      expect(readThreshold(thresholds, DEFAULT_DEHUM_THRESHOLDS, 'veg', 'day', 'on')).toBe(1.5);
    });

    it('should handle notification service change event', async () => {
      element.currentTab = ConfigTab.GROWSPACES;
      (element as any)._isAddingGrowspace = true;
      await element.updateComplete;

      // Notification service is a select in the new add form (nested component)
      const notifSelect = (await sensorsShadow(element)).querySelector(
        'select'
      ) as HTMLSelectElement;
      if (notifSelect) {
        notifSelect.value = 'mobile_app_phone';
        notifSelect.dispatchEvent(new Event('change'));
      }
      await element.updateComplete;

      expect((element as any).addNotificationService).toBe('mobile_app_phone');
    });

    it('should update threshold via _updateThreshold', async () => {
      (element as any).envDehumidifierThresholds = {};
      await element.updateComplete;

      (element as any)._updateThreshold('veg', 'day', 'on', 1.8);
      expect((element as any).envDehumidifierThresholds.veg?.day?.on).toBe(1.8);
    });
  });

  describe('Final Coverage Gaps', () => {
    it('should wait when growspaceId has no matching device', async () => {
      element.open = false;
      await element.updateComplete;
      element.growspaceId = 'missing';
      element.open = true;
      await element.updateComplete;
      expect((element as any)._initialStateApplied).toBe(false);
    });

    it('should handle updated with open property toggle', async () => {
      element.open = false;
      await element.updateComplete;
      element.open = true;
      await element.updateComplete;
      element.open = false;
      await element.updateComplete;
    });

    it('should trigger all dehumidifier threshold updates', async () => {
      element.currentTab = ConfigTab.HUMIDITY;
      (element as any)._openHumidityStageId = 'seedling';
      await element.updateComplete;
      const inputs = (await sensorsShadow(element)).querySelectorAll('md3-number-input');
      // Labels are "On Above %" and "Off Below %" in the new accordion
      const offInputs = Array.from(inputs || []).filter((i) =>
        i.getAttribute('label')?.includes('Below')
      );
      const onInputs = Array.from(inputs || []).filter((i) =>
        i.getAttribute('label')?.includes('Above')
      );

      onInputs.forEach((input) =>
        input.dispatchEvent(new CustomEvent('change', { detail: '1.2' }))
      );
      offInputs.forEach((input) =>
        input.dispatchEvent(new CustomEvent('change', { detail: '1.5' }))
      );

      expect((element as any).envDehumidifierThresholds.seedling.day.on).toBe(1.2);
      expect((element as any).envDehumidifierThresholds.seedling.night.off).toBe(1.5);
    });

    it('should trigger add growspace button click handler', async () => {
      element.currentTab = ConfigTab.GROWSPACES;
      const addBtn = (await sensorsShadow(element)).querySelector(
        '.cfg-master-add-btn'
      ) as HTMLElement;
      addBtn?.click();
      await element.updateComplete;
      expect((element as any)._isAddingGrowspace).toBe(true);
    });

    it('should trigger dehumidifier stage switch via accordion', async () => {
      element.currentTab = ConfigTab.HUMIDITY;
      await element.updateComplete;
      const accHeads = (await sensorsShadow(element)).querySelectorAll('.acc-head');
      const vegHead = Array.from(accHeads || []).find((h) => h.textContent?.includes('Vegetative'));
      (vegHead as HTMLElement)?.click();
      await element.updateComplete;
      const inputs = (await sensorsShadow(element)).querySelectorAll('md3-number-input');
      inputs?.[0]?.dispatchEvent(new CustomEvent('change', { detail: '2.0' }));
      expect((element as any).envDehumidifierThresholds.veg.day.on).toBe(2.0);
    });

    it('should handle partial environment attributes in _handleEnvGrowspaceChange', () => {
      const partialDevice = {
        deviceId: 'partial',
        environmentAttributes: {
          temperatureSensor: 's.t',
        },
      } as any;
      element.devices = [partialDevice];
      (element as any)._handleEnvGrowspaceChange({ target: { value: 'partial' } } as any);
      // Multi sensor derived from singular temperatureSensor attribute
      expect((element as any).envTemperatureSensors).toEqual(['s.t']);
      expect((element as any).envHumiditySensors).toEqual([]);
      expect((element as any).envDehumidifierControlEnabled).toBe(false);
    });

    it('should render humidity accordion with all stages', async () => {
      element.currentTab = ConfigTab.HUMIDITY;
      const accCards = (await sensorsShadow(element)).querySelectorAll('.acc-card');
      expect(accCards?.length).toBe(HUMIDITY_STAGES.length);
    });

    it('should handle null thresholds during _updateThreshold', () => {
      (element as any).envDehumidifierThresholds = null as any;
      (element as any)._updateThreshold('seedling', 'day', 'on', 1.0);
      expect((element as any).envDehumidifierThresholds.seedling.day.on).toBe(1.0);
    });
  });
  describe('Additional Coverage Gap Fillers', () => {
    it('should populate edit fields with missing notification target', () => {
      const dev = {
        deviceId: 'no_notify',
        name: 'No Notify',
        rows: 4,
        plantsPerRow: 4,
        // notificationTarget missing
      } as any;
      element.devices = [dev];
      (element as any)._populateEditFields('no_notify');
      expect((element as any).editNotificationService).toBe('');
    });

    it('should handle env growspace change with device missing environmentAttributes', () => {
      const dev = {
        deviceId: 'no_env',
        name: 'No Env',
        // environmentAttributes missing
      } as any;
      element.devices = [dev];
      // set initial dirty state
      (element as any).envTemperatureSensors = ['dirty'];

      (element as any)._handleEnvGrowspaceChange({ target: { value: 'no_env' } } as any);

      // Should fall to else block and reset
      expect((element as any).envTemperatureSensors).toEqual([]);
    });

    it('should use default rows and plants per row if missing in device', () => {
      const dev = {
        deviceId: 'defaults',
        name: 'Defaults',
        // rows, plantsPerRow missing
      } as any;
      element.devices = [dev];
      (element as any)._populateEditFields('defaults');
      expect((element as any).editRows).toBe(4);
      expect((element as any).editPlantsPerRow).toBe(4);
    });
  });

  describe('Ultimate Branch Coverage', () => {
    it('should return early in _submitEditGrowspace if no id selected', () => {
      const listener = vi.fn();
      element.addEventListener('edit-growspace-submit', listener);
      (element as any).edit_selectedId = '';
      (element as any)._submitEditGrowspace();
      expect(listener).not.toHaveBeenCalled();
    });

    it('should return early in _submitDeleteGrowspace if no id selected', () => {
      (element as any).editSelectedId = '';
      (element as any)._showDeleteConfirm = false;
      (element as any)._submitDeleteGrowspace();
      expect((element as any)._showDeleteConfirm).toBe(false);
    });

    it('should handle device not found in _populateEditFields', () => {
      // In the SM design, _populateEditFields is a no-op when device is not found.
      // No stale state leaks; editSelectedId stays empty.
      (element as any)._populateEditFields('missing_id');
      expect((element as any).editSelectedId).toBe('');
    });

    it('should fallback to defaults in _populateEditFields if device properties missing', () => {
      element.devices = [
        {
          deviceId: 'incomplete',
          name: 'Incomplete Device',
          // missing rows, plantsPerRow, notificationTarget
        } as any,
      ];

      (element as any)._populateEditFields('incomplete');

      expect((element as any).editName).toBe('Incomplete Device');
      expect((element as any).editRows).toBe(4); // Default
      expect((element as any).editPlantsPerRow).toBe(4); // Default
      expect((element as any).editNotificationService).toBe(''); // Default
    });

    it('should handle missing environmentAttributes in _handleEnvGrowspaceChange', async () => {
      element.currentTab = ConfigTab.SENSORS;
      element.devices = [
        {
          deviceId: 'no_env',
          name: 'No Env',
          environmentAttributes: undefined,
        } as any,
      ];
      await element.updateComplete;

      // Pre-set some values, expecting them to be reset
      (element as any).envTemperatureSensors = ['old_sensor'];

      const event = { target: { value: 'no_env' } } as any;
      (element as any)._handleEnvGrowspaceChange(event);

      expect((element as any).envSelectedId).toBe('no_env');
      expect((element as any).envTemperatureSensors).toEqual([]);
    });

    it('should fallback to defaults for environment attributes in _handleEnvGrowspaceChange', async () => {
      element.currentTab = ConfigTab.SENSORS;
      element.devices = [
        {
          deviceId: 'partial_env',
          name: 'Partial Env',
          environmentAttributes: {
            // Empty object, should trigger all || '' fallbacks
          },
        } as any,
      ];
      await element.updateComplete;

      // Pre-set to something else to verify reset
      (element as any).envTemperatureSensors = ['old'];
      (element as any).envDehumidifierControlEnabled = true;

      const event = { target: { value: 'partial_env' } } as any;
      (element as any)._handleEnvGrowspaceChange(event);

      expect((element as any).envTemperatureSensors).toEqual([]);
      expect((element as any).envDehumidifierControlEnabled).toBe(false);
      expect((element as any).envDehumidifierThresholds).toEqual({});
    });

    it('should handle missing hass.services.notify in _getMobileAppNotifyServices', () => {
      element.hass = { services: {} } as any;
      const res1 = (element as any)._getMobileAppNotifyServices();
      expect(res1).toEqual([]);

      element.hass = { states: {} } as any; // No services at all
      const res2 = (element as any)._getMobileAppNotifyServices();
      expect(res2).toEqual([]);
    });

    it('should handle missing states in _getEntities', () => {
      element.hass = { states: undefined } as any;
      const res = (element as any)._getEntities(['sensor'], null);
      expect(res).toEqual([]);
    });

    it('should handle an empty growspaceId in willUpdate', async () => {
      element.growspaceId = '';
      await element.updateComplete;
      // No error should occur
    });

    it('should reset _initialStateApplied when dialog closes', async () => {
      element.open = true;
      await element.updateComplete;
      expect((element as any)._initialStateApplied).toBe(true);

      element.open = false;
      await element.updateComplete;
      expect((element as any)._initialStateApplied).toBe(false);
    });

    it('should handle empty value in _handleEditSelection', () => {
      // _handleEditSelection('') calls _populateEditFields('') which returns early,
      // then _handleEnvGrowspaceChange resets the env draft.
      // editSelectedId resets to idle (empty).
      (element as any).editSelectedId = 'old';
      (element as any)._handleEditSelection('');
      expect((element as any).editSelectedId).toBe('');
    });

    it('should cancel delete growspace', () => {
      (element as any)._showDeleteConfirm = true;
      (element as any)._cancelDeleteGrowspace();
      expect((element as any)._showDeleteConfirm).toBe(false);
    });

    it('should handle multi-select chip removal', async () => {
      // The inline `_renderMultiEntitySelect` helper was removed in #368; chip
      // removal is now exercised through the live Sensors tab component.
      element.currentTab = ConfigTab.SENSORS;
      (element as any).envLightSensors = ['sensor.1', 'sensor.2'];
      await element.updateComplete;

      const picker = entityPicker(await sensorsShadow(element), 'Light Source / Sensor');
      const removeBtn = picker?.shadowRoot.querySelector('.chip-remove');
      (removeBtn as HTMLElement)?.click();
      await element.updateComplete;

      expect((element as any).envLightSensors).toEqual(['sensor.2']);
    });

    it('should handle multi-select input change with empty value', async () => {
      element.currentTab = ConfigTab.SENSORS;
      (element as any).envLightSensors = ['sensor.1'];
      await element.updateComplete;

      const picker = entityPicker(await sensorsShadow(element), 'Light Source / Sensor');
      pickEntity(picker!.shadowRoot, ''); // Cleared selection
      await element.updateComplete;

      expect((element as any).envLightSensors).toEqual(['sensor.1']); // Unchanged
    });

    it('should handle initialTab pre-selection in updated', async () => {
      element.open = false;
      element.currentTab = ConfigTab.SENSORS;
      await element.updateComplete;

      element.open = true;
      await element.updateComplete;
      expect((element as any)._initialStateApplied).toBe(true);
    });

    it('should handle legacy singular entity fallbacks in _handleEnvGrowspaceChange', async () => {
      element.currentTab = ConfigTab.SENSORS;
      element.devices = [
        {
          deviceId: 'legacy',
          name: 'Legacy Device',
          environmentAttributes: {
            humidifierEntity: 'switch.humidifier',
            dehumidifierEntity: 'switch.dehumidifier',
            lightSensor: 'sensor.light',
            exhaustEntity: 'switch.exhaust',
            circulationFanEntity: 'switch.circulation',
          },
        } as any,
      ];
      await element.updateComplete;

      const event = { target: { value: 'legacy' } } as any;
      (element as any)._handleEnvGrowspaceChange(event);

      expect((element as any).envHumidifierEntities).toEqual(['switch.humidifier']);
      expect((element as any).envDehumidifierEntities).toEqual(['switch.dehumidifier']);
      expect((element as any).envLightSensors).toEqual(['sensor.light']);
      expect((element as any).envExhaustFanEntities).toEqual(['switch.exhaust']);
      expect((element as any).envCirculationFanEntities).toEqual(['switch.circulation']);
    });
    it('should handle empty multi-entity lists with legacy fallback in _handleEnvGrowspaceChange', async () => {
      element.currentTab = ConfigTab.SENSORS;
      element.devices = [
        {
          deviceId: 'empty_lists',
          name: 'Empty Lists Device',
          environmentAttributes: {
            lightSensors: [],
            lightSensor: 'sensor.legacy_light',
            exhaustFanEntities: [],
            exhaustEntity: 'switch.legacy_exhaust',
            circulationFanEntities: [],
            circulationFanEntity: 'switch.legacy_circulation',
            humidifierEntities: [],
            humidifierEntity: 'switch.legacy_humidifier',
            dehumidifierEntities: [],
            dehumidifierEntity: 'switch.legacy_dehumidifier',
          },
        } as any,
      ];
      await element.updateComplete;

      const event = { target: { value: 'empty_lists' } } as any;
      (element as any)._handleEnvGrowspaceChange(event);

      expect((element as any).envLightSensors).toEqual(['sensor.legacy_light']);
      expect((element as any).envExhaustFanEntities).toEqual(['switch.legacy_exhaust']);
      expect((element as any).envCirculationFanEntities).toEqual(['switch.legacy_circulation']);
      expect((element as any).envHumidifierEntities).toEqual(['switch.legacy_humidifier']);
      expect((element as any).envDehumidifierEntities).toEqual(['switch.legacy_dehumidifier']);
    });
  });

  describe('Sensor Groups (3D Heatmap) Tab', () => {
    beforeEach(async () => {
      element.currentTab = ConfigTab.HEATMAP;
      (element as any).envSensorGroups = [
        {
          id: 'g1',
          name: 'Group 1',
          x: 1,
          y: 1,
          z: 1,
          temperature_sensors: ['sensor.temp'],
          humidity_sensors: [],
          vpd_sensors: [],
        },
      ];
      await element.updateComplete;
    });

    it('should render sensor groups list', async () => {
      const groupName = (await sensorsShadow(element)).querySelector(
        'div[style*="font-weight:500"]'
      );
      expect(groupName?.textContent).toBe('Group 1');
    });

    it('should open add group dialog', async () => {
      const addBtn = Array.from((await sensorsShadow(element)).querySelectorAll('button')).find(
        (b) => b.textContent?.includes('Add Group')
      );
      (addBtn as HTMLElement)?.click();
      await element.updateComplete;

      expect((element as any)._showGroupDialog).toBe(true);
      expect((element as any)._editingGroup).toBeUndefined();
    });

    it('should open edit group dialog', async () => {
      const group = (element as any).envSensorGroups[0];
      (element as any)._editGroup(group);
      await element.updateComplete;

      expect((element as any)._showGroupDialog).toBe(true);
      expect((element as any)._editingGroup?.id).toBe('g1');
    });

    it('should delete a group', async () => {
      const deleteBtn = (await sensorsShadow(element)).querySelector('button.danger');
      (deleteBtn as HTMLElement)?.click();
      await element.updateComplete;

      expect((element as any).envSensorGroups.length).toBe(0);
    });

    it('should handle save-sensor-group event (add new)', async () => {
      const newGroup = {
        id: 'g2',
        name: 'Group 2',
        x: 2,
        y: 2,
        z: 2,
        temperature_sensors: [],
        humidity_sensors: [],
        vpd_sensors: [],
      };
      (element as any)._handleSaveGroup(
        new CustomEvent('save-sensor-group', {
          detail: { group: newGroup },
        })
      );

      expect((element as any).envSensorGroups.length).toBe(2);
      expect((element as any).envSensorGroups[1].id).toBe('g2');
      expect((element as any)._showGroupDialog).toBe(false);
    });

    it('should handle save-sensor-group event (update existing)', async () => {
      const updatedGroup = {
        id: 'g1',
        name: 'Updated Group 1',
        x: 1,
        y: 1,
        z: 1,
        temperature_sensors: ['sensor.temp'],
        humidity_sensors: [],
        vpd_sensors: [],
      };
      (element as any)._handleSaveGroup(
        new CustomEvent('save-sensor-group', {
          detail: { group: updatedGroup },
        })
      );

      expect((element as any).envSensorGroups.length).toBe(1);
      expect((element as any).envSensorGroups[0].name).toBe('Updated Group 1');
    });

    it('should close group dialog on @close event', async () => {
      (element as any)._showGroupDialog = true;
      await element.updateComplete;

      const groupDialog = element.shadowRoot?.querySelector('sensor-group-dialog');
      groupDialog?.dispatchEvent(new Event('close'));
      await element.updateComplete;

      expect((element as any)._showGroupDialog).toBe(false);
    });

    it('should switch to heatmap tab via nav item', async () => {
      element.currentTab = ConfigTab.SENSORS;
      await element.updateComplete;

      const tabs = element.shadowRoot?.querySelectorAll('.cfg-nav-item');
      const heatmapTab = Array.from(tabs || []).find((t) => t.textContent?.includes('Heatmap'));
      (heatmapTab as HTMLElement)?.click();
      await element.updateComplete;

      expect(element.currentTab).toBe(ConfigTab.HEATMAP);
    });
  });

  describe('Vision Checkup config section', () => {
    it('renders vision section in vision tab', async () => {
      (element as any).currentTab = 'vision';
      (element as any).envSelectedId = 'tent1';
      (element as any).envVisionCameraEntities = ['camera.tent1'];
      await element.updateComplete;

      const saveBtn = element.shadowRoot?.querySelector('button.md3-button.primary');
      expect(saveBtn).toBeTruthy();
    });

    it('shows no-cameras info when camera entities empty', async () => {
      (element as any).currentTab = 'vision';
      (element as any).envSelectedId = 'tent1';
      (element as any).envVisionCameraEntities = [];
      await element.updateComplete;

      const toggle = element.shadowRoot?.querySelector('input[type="checkbox"]');
      expect(toggle).toBeFalsy();
    });

    it('shows controls when camera entities are configured', async () => {
      (element as any).currentTab = 'vision';
      (element as any).envSelectedId = 'tent1';
      (element as any).envVisionCameraEntities = ['camera.tent1'];
      await element.updateComplete;

      const toggle = (await sensorsShadow(element)).querySelector('input[type="checkbox"]');
      expect(toggle).toBeTruthy();
      const saveBtn = element.shadowRoot?.querySelector('button.md3-button.primary');
      expect(saveBtn).toBeTruthy();
    });

    it('dispatches vision-checkup-config-submit event on save', async () => {
      const submitSpy = vi.fn();
      element.addEventListener('vision-checkup-config-submit', submitSpy);

      (element as any).currentTab = 'vision';
      (element as any).envSelectedId = 'tent1';
      (element as any).envVisionCameraEntities = ['camera.tent1'];
      (element as any).envVisionEnabled = true;
      (element as any).envVisionEarlyOffset = 90;
      (element as any).envVisionMidHours = 8;
      (element as any).envVisionLateOffset = 45;
      await element.updateComplete;

      const saveBtn = element.shadowRoot?.querySelector('button.md3-button.primary') as HTMLElement;
      saveBtn?.click();

      expect(submitSpy).toHaveBeenCalledOnce();
      const detail = (submitSpy.mock.calls[0][0] as CustomEvent).detail;
      expect(detail.growspaceId).toBe('tent1');
      expect(detail.visionCheckupConfig.enabled).toBe(true);
      expect(detail.visionCheckupConfig.early_check_offset_minutes).toBe(90);
      expect(detail.visionCheckupConfig.mid_check_hours).toBe(8);
      expect(detail.visionCheckupConfig.late_check_offset_minutes).toBe(45);
    });

    it('does not dispatch event when the vision group is untouched', async () => {
      const submitSpy = vi.fn();
      element.addEventListener('vision-checkup-config-submit', submitSpy);

      (element as any).currentTab = 'vision';
      (element as any).envSelectedId = 'tent1';
      // A buffered edit (cameraEntities), not a vision-group one: it must not
      // drag the dedicated vision save along (ADR-0032).
      (element as any).envVisionCameraEntities = ['camera.tent1'];
      await element.updateComplete;

      const saveBtn = element.shadowRoot?.querySelector('button.md3-button.primary') as HTMLElement;
      saveBtn?.click();

      expect(submitSpy).not.toHaveBeenCalled();
    });

    it('does not dispatch event when no growspace selected', async () => {
      const submitSpy = vi.fn();
      element.addEventListener('vision-checkup-config-submit', submitSpy);

      (element as any).currentTab = 'vision';
      (element as any).envSelectedId = '';
      (element as any).envVisionCameraEntities = ['camera.tent1'];
      await element.updateComplete;

      const saveBtn = element.shadowRoot?.querySelector('button.md3-button.primary') as HTMLElement;
      saveBtn?.click();

      expect(submitSpy).not.toHaveBeenCalled();
    });
  });

  describe('Climate save (env→host two-call path)', () => {
    it('carries the edited exhaust config into the submit event so needsExhaustCall is true', async () => {
      element.currentTab = ConfigTab.CLIMATE;
      (element as any).envSelectedId = 'gs1';
      (element as any).envTemperatureSensors = ['sensor.temp'];
      (element as any).envHumiditySensors = ['sensor.hum'];
      await element.updateComplete;

      // Toggle the exhaust panel's Enabled in the nested Climate component.
      const root = await sensorsShadow(element);
      const exhaustEnabled = Array.from(root.querySelectorAll('label.checkbox-label'))
        .filter((l) => l.textContent?.includes('Enabled'))[1]
        .querySelector('input[type="checkbox"]') as HTMLInputElement;
      exhaustEnabled.checked = true;
      exhaustEnabled.dispatchEvent(new Event('change'));
      await element.updateComplete;

      const listener = vi.fn();
      element.addEventListener('configure-environment-submit', listener);
      const saveBtn = element.shadowRoot?.querySelector('button.md3-button.primary') as HTMLElement;
      saveBtn?.click();

      expect(listener).toHaveBeenCalled();
      const detail = listener.mock.calls[0][0].detail;
      expect(detail.exhaustFanConfig.enabled).toBe(true);
      expect(needsExhaustCall(detail)).toBe(true);
    });
  });
});
