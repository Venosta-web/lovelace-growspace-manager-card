import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';
import { IrrigationSteeringTab } from '../../src/features/irrigation/components/irrigation-steering-tab';
import type { SteeringTabViewModel } from '../../src/features/irrigation/viewmodels/steering-tab.viewmodel';
import type { Md3NumberInput } from '../../src/features/shared/ui/md3-number-input';

if (!customElements.get('irrigation-steering-tab')) {
  customElements.define('irrigation-steering-tab', IrrigationSteeringTab);
}

function makeVm(autoAdvanceP2ToP3: boolean): SteeringTabViewModel {
  return {
    declaredMode: null,
    modes: [
      { id: 'vegetative', name: 'Vegetative', desc: 'veg' },
      { id: 'balanced', name: 'Balanced', desc: 'balanced' },
      { id: 'generative', name: 'Generative', desc: 'generative' },
    ],
    confirmMode: null,
    confirmPhase: null,
    activePhase: 'p2',
    draft: {
      enabled: true,
      autoLightTracking: false,
      targetVwcPercent: 45,
      maintenanceDrybackPercent: 3,
      lightsOnTime: '06:00:00',
      p0DurationMinutes: 60,
      p2StopBeforeLightsOffMinutes: 120,
      dynamicShotEnabled: false,
      dynamicAggressiveness: 1,
      dynamicRecovery: 0.1,
      dynamicShotSizeFloor: 0.5,
      dynamicIntervalCeiling: 1.5,
      detectedLightsOnTime: null,
    },
    hasLightSensors: false,
    detectedLightsOnTime: null,
    phaseShots: [
      {
        id: 'p1',
        label: 'P1',
        sizeField: 'p1ShotDurationSeconds',
        sizeLabel: 'P1 Shot Duration (sec)',
        sizeValue: 15,
        intervalField: 'p1ShotIntervalMinutes',
        intervalValue: 15,
        isVolume: false,
      },
      {
        id: 'p2',
        label: 'P2',
        sizeField: 'p2ShotDurationSeconds',
        sizeLabel: 'P2 Shot Duration (sec)',
        sizeValue: 15,
        intervalField: 'p2ShotIntervalMinutes',
        intervalValue: 15,
        isVolume: false,
      },
    ],
    adaptiveEnabled: false,
    soilTriggerPercent: null,
    autoAdvanceP1ToP2: false,
    autoAdvanceP2ToP3,
    haltOnRunoffEcThreshold: null,
  };
}

async function mount(autoAdvanceP2ToP3: boolean): Promise<IrrigationSteeringTab> {
  const element = await fixture<IrrigationSteeringTab>(html`
    <irrigation-steering-tab .vm=${makeVm(autoAdvanceP2ToP3)}></irrigation-steering-tab>
  `);
  await element.updateComplete;
  return element;
}

describe('IrrigationSteeringTab P2 stop buffer dependency', () => {
  it('disables the buffer and names the required toggle when auto-advance is off', async () => {
    const element = await mount(false);
    const buffer = element.shadowRoot!.querySelector<Md3NumberInput>(
      '[data-field="p2StopBeforeLightsOffMinutes"]'
    )!;
    await buffer.updateComplete;

    expect(buffer.disabled).toBe(true);
    expect(buffer.shadowRoot!.querySelector('input')!.disabled).toBe(true);
    expect(element.shadowRoot!.querySelector('.field-dependency-hint')!.textContent).toContain(
      'Enable Auto-advance P2 → P3 in Phase Triggers'
    );
  });

  it('enables the buffer and removes the dependency hint when auto-advance is on', async () => {
    const element = await mount(true);
    const buffer = element.shadowRoot!.querySelector<Md3NumberInput>(
      '[data-field="p2StopBeforeLightsOffMinutes"]'
    )!;
    await buffer.updateComplete;

    expect(buffer.disabled).toBe(false);
    expect(buffer.shadowRoot!.querySelector('input')!.disabled).toBe(false);
    expect(element.shadowRoot!.querySelector('.field-dependency-hint')).toBeNull();
  });
});
