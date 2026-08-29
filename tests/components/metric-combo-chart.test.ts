import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import '../../src/features/environment/components/metric-combo-chart';
import type { MetricComboChart } from '../../src/features/environment/components/metric-combo-chart';
import { MetricKey } from '../../src/features/environment/constants';
import { computeMetricDescriptors } from '../../src/slices/metric-descriptors';
import type { DeviceSnapshot } from '../../src/slices/device-state';
import type { GrowspaceDevice } from '../../src/services/types';
import type { SensorHistories } from '../../src/features/environment/types';

const HOUR_MS = 60 * 60 * 1000;

const TEMPERATURE_SENSOR = 'sensor.tent_temperature';
const EXHAUST_SENSOR = 'sensor.tent_exhaust_speed';

function reading(entityId: string, hoursAgo: number, state: string) {
  return {
    entity_id: entityId,
    state,
    attributes: {},
    last_changed: new Date(Date.now() - hoursAgo * HOUR_MS).toISOString(),
  };
}

function snapshot(): DeviceSnapshot {
  return {
    lightSensors: null,
    exhaustFans: { entityIds: [EXHAUST_SENSOR], value: undefined, icon: '' },
    circulationFans: null,
    humidifiers: null,
    dehumidifiers: null,
  };
}

/** A growspace with a temperature sensor, and an exhaust fan unless withheld. */
function device(exhaust = true): GrowspaceDevice {
  return {
    deviceId: 'gs-1',
    name: 'Tent',
    environmentAttributes: {
      temperatureSensor: TEMPERATURE_SENSOR,
      ...(exhaust ? { exhaustSensor: EXHAUST_SENSOR } : {}),
    },
  } as unknown as GrowspaceDevice;
}

function histories(): SensorHistories {
  return {
    [MetricKey.TEMPERATURE]: [
      reading(TEMPERATURE_SENSOR, 26, '21.0'),
      reading(TEMPERATURE_SENSOR, 12, '24.5'),
      reading(TEMPERATURE_SENSOR, 1, '26.0'),
    ],
    // A speed-sensor fan runs 0–10, so 8 is 80% duty.
    [MetricKey.EXHAUST]: [reading(EXHAUST_SENSOR, 26, '8')],
  };
}

async function mount(withExhaust = true): Promise<MetricComboChart> {
  const target = device(withExhaust);
  const descriptors = computeMetricDescriptors(
    withExhaust ? snapshot() : null,
    {},
    undefined,
    target
  );
  return await fixture<MetricComboChart>(html`
    <metric-combo-chart
      .device=${target}
      .descriptors=${descriptors}
      .sensorHistory=${histories()}
      .range=${'24h'}
      .primary=${MetricKey.TEMPERATURE}
      .secondaries=${[{ metric: MetricKey.EXHAUST }]}
    ></metric-combo-chart>
  `);
}

describe('metric-combo-chart', () => {
  it('draws the secondary as a bar pane beneath the primary Env Graph', async () => {
    const el = await mount();

    expect(el.shadowRoot!.querySelector('growspace-env-chart')).not.toBeNull();
    // 24 buckets over the 24h range, each covered by the fan's held reading.
    expect(el.shadowRoot!.querySelectorAll('.duty-bar').length).toBe(24);
  });

  it('caps the secondary pane with its peak and nothing else', async () => {
    const el = await mount();
    const pane = el.shadowRoot!.querySelector('.duty-pane')!;

    // The fan held 8 of its 0–10 scale for the whole window, so every bucket is
    // 80% duty and the peak is 80%. The cap is the pane's scale, so it is also
    // the pane's only readout: no value axis beside it, and no range total —
    // summed fan duty is not a quantity a grower acts on (ADR-0049).
    const readouts = Array.from(pane.querySelectorAll('.duty-readout')).map((node) =>
      node.textContent!.trim()
    );
    expect(readouts).toEqual(['80%']);
  });

  it('degrades to the primary alone when the secondary has no configured sensor', async () => {
    const el = await mount(false);

    expect(el.shadowRoot!.querySelector('growspace-env-chart')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('.duty-pane')).toBeNull();
  });

  it('closes on its primary header and offers no way to dismantle the pairing', async () => {
    const el = await mount();
    const toggled: unknown[] = [];
    const unlinked: unknown[] = [];
    el.addEventListener('toggle-graph', (event) => toggled.push((event as CustomEvent).detail));
    el.addEventListener('unlink-graph', (event) => unlinked.push(event));
    el.addEventListener('unlink-graphs', (event) => unlinked.push(event));

    const chart = el.shadowRoot!.querySelector('growspace-env-chart')!;
    await (chart as any).updateComplete;
    (chart.shadowRoot!.querySelector('.gs-env-graph-header') as HTMLElement).click();

    expect(toggled).toEqual([MetricKey.TEMPERATURE]);
    expect(unlinked).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Humidity + humidifier and dehumidifier duty
// ---------------------------------------------------------------------------

const HUMIDITY_SENSOR = 'sensor.tent_humidity';
const HUMIDIFIER = 'humidifier.tent_humidifier';
const DEHUMIDIFIER = 'switch.tent_dehumidifier';

/** A growspace running both humidity appliances, unless one is withheld. */
function humidityDevice(dehumidifier = true): GrowspaceDevice {
  return {
    deviceId: 'gs-1',
    name: 'Tent',
    environmentAttributes: {
      humiditySensor: HUMIDITY_SENSOR,
      humidifierEntity: HUMIDIFIER,
      ...(dehumidifier ? { dehumidifierEntity: DEHUMIDIFIER } : {}),
    },
  } as unknown as GrowspaceDevice;
}

function humidityHistories(): SensorHistories {
  return {
    [MetricKey.HUMIDITY]: [reading(HUMIDITY_SENSOR, 26, '55'), reading(HUMIDITY_SENSOR, 12, '62')],
    // A humidifier runs 0–10, so 2.5 held across the window is 25% duty.
    [MetricKey.HUMIDIFIER]: [reading(HUMIDIFIER, 26, '2.5')],
    // A dehumidifier is binary, so a bucket it ran through is 100% duty.
    [MetricKey.DEHUMIDIFIER]: [reading(DEHUMIDIFIER, 26, 'off'), reading(DEHUMIDIFIER, 12, 'on')],
  };
}

async function mountHumidity(withDehumidifier = true): Promise<MetricComboChart> {
  const target = humidityDevice(withDehumidifier);
  return await fixture<MetricComboChart>(html`
    <metric-combo-chart
      .device=${target}
      .descriptors=${computeMetricDescriptors(null, {}, undefined, target)}
      .sensorHistory=${humidityHistories()}
      .range=${'24h'}
      .primary=${MetricKey.HUMIDITY}
      .secondaries=${[{ metric: MetricKey.HUMIDIFIER }, { metric: MetricKey.DEHUMIDIFIER }]}
    ></metric-combo-chart>
  `);
}

describe('metric-combo-chart — a combo with two secondaries', () => {
  it('gives each secondary its own bar pane with its own peak cap', async () => {
    // Humidity drifting with the humidifier idle is a different problem from
    // humidity drifting with it pinned, and the dehumidifier answers the
    // mirror-image question — so neither collapses into the other's pane.
    const el = await mountHumidity();

    const readouts = Array.from(el.shadowRoot!.querySelectorAll('.duty-readout')).map((node) =>
      node.textContent!.trim()
    );
    expect(readouts).toEqual(['25%', '100%']);
  });

  it('degrades to the secondaries the growspace actually has', async () => {
    const el = await mountHumidity(false);

    expect(el.shadowRoot!.querySelector('growspace-env-chart')).not.toBeNull();
    const readouts = Array.from(el.shadowRoot!.querySelectorAll('.duty-readout')).map((node) =>
      node.textContent!.trim()
    );
    expect(readouts).toEqual(['25%']);
  });
});

// ---------------------------------------------------------------------------
// Energy + power — a secondary with no full scale
// ---------------------------------------------------------------------------

const ENERGY_SENSOR = 'sensor.tent_energy';
const POWER_SENSOR = 'sensor.tent_power';

describe('metric-combo-chart — a secondary with no full scale', () => {
  it('caps the pane in the metric own unit rather than as duty', async () => {
    // The tank pattern in another unit: an instantaneous draw over the
    // accumulated consumption. Power scales to its data, so there is no full
    // scale for a percentage to mean anything against.
    const target = {
      deviceId: 'gs-1',
      name: 'Tent',
      environmentAttributes: { energySensors: [ENERGY_SENSOR], powerSensors: [POWER_SENSOR] },
    } as unknown as GrowspaceDevice;

    const el = await fixture<MetricComboChart>(html`
      <metric-combo-chart
        .device=${target}
        .descriptors=${computeMetricDescriptors(null, {}, undefined, target)}
        .sensorHistory=${{
          [MetricKey.ENERGY]: [reading(ENERGY_SENSOR, 26, '12.5')],
          [MetricKey.POWER]: [reading(POWER_SENSOR, 26, '400')],
        }}
        .range=${'24h'}
        .primary=${MetricKey.ENERGY}
        .secondaries=${[{ metric: MetricKey.POWER }]}
      ></metric-combo-chart>
    `);

    const readouts = Array.from(el.shadowRoot!.querySelectorAll('.duty-readout')).map((node) =>
      node.textContent!.trim()
    );
    expect(readouts).toEqual(['400 W']);
  });
});

// ---------------------------------------------------------------------------
// Pore EC + feed and runoff EC — a delta read against a configured limit
// ---------------------------------------------------------------------------

const PORE_EC_SENSOR = 'sensor.tent_pore_ec';
const FEED_EC_SENSOR = 'sensor.tent_feed_ec';
const RUNOFF_EC_SENSOR = 'sensor.tent_runoff_ec';

/** A growspace logging all three EC probes, with a 1.0 mS/cm delta ceiling. */
function ecDevice(): GrowspaceDevice {
  return {
    deviceId: 'gs-1',
    name: 'Tent',
    environmentAttributes: {
      poreEcSensors: [PORE_EC_SENSOR],
      feedEcSensors: [FEED_EC_SENSOR],
      runoffEcSensors: [RUNOFF_EC_SENSOR],
    },
    drainConfig: { enabled: true, maxEcDelta: 1.0, targetRunoffPercent: 20, readings: [] },
  } as unknown as GrowspaceDevice;
}

async function mountPoreEc(): Promise<MetricComboChart> {
  const target = ecDevice();
  return await fixture<MetricComboChart>(html`
    <metric-combo-chart
      .device=${target}
      .descriptors=${computeMetricDescriptors(null, {}, undefined, target)}
      .sensorHistory=${{
        [MetricKey.PORE_EC]: [reading(PORE_EC_SENSOR, 26, '2.8')],
        [MetricKey.FEED_EC]: [reading(FEED_EC_SENSOR, 26, '1.5')],
        // Runoff sits 0.5 above feed all window — half of the configured ceiling.
        [MetricKey.RUNOFF_EC]: [reading(RUNOFF_EC_SENSOR, 26, '2')],
      }}
      .range=${'24h'}
      .primary=${MetricKey.PORE_EC}
      .secondaries=${[
        {
          metric: MetricKey.RUNOFF_EC,
          relativeTo: MetricKey.FEED_EC,
          limitOf: (device: GrowspaceDevice) => device.drainConfig?.maxEcDelta,
        },
      ]}
    ></metric-combo-chart>
  `);
}

describe('metric-combo-chart — a delta pane read against a configured limit', () => {
  it('names the pane by the two metrics it is the difference of', async () => {
    const el = await mountPoreEc();

    expect(el.shadowRoot!.querySelector('.duty-eyebrow')!.textContent!.trim()).toBe(
      'Runoff EC − Feed EC'
    );
  });

  it('caps the pane with the configured limit rather than with its own peak', async () => {
    // The whole point of the pane is whether the delta crosses the ceiling, so
    // the ceiling is the scale — a peak-scaled pane would put a harmless 0.5
    // delta at full height and say nothing.
    const el = await mountPoreEc();
    const pane = el.shadowRoot!.querySelector('.duty-pane')!;

    expect(pane.querySelector('.duty-readout')!.textContent!.trim()).toBe('max 1.0 mS/cm');
    expect(pane.querySelector('.duty-limit')).not.toBeNull();
    // Half the ceiling, in a box 80 units tall.
    expect(pane.querySelector('.duty-bar')!.getAttribute('height')).toBe('40');
  });

  it('scales past the limit so a breach still fits the pane', async () => {
    const target = ecDevice();
    const el = await fixture<MetricComboChart>(html`
      <metric-combo-chart
        .device=${target}
        .descriptors=${computeMetricDescriptors(null, {}, undefined, target)}
        .sensorHistory=${{
          [MetricKey.PORE_EC]: [reading(PORE_EC_SENSOR, 26, '2.8')],
          [MetricKey.FEED_EC]: [reading(FEED_EC_SENSOR, 26, '1.5')],
          // 2.0 over feed — twice the ceiling.
          [MetricKey.RUNOFF_EC]: [reading(RUNOFF_EC_SENSOR, 26, '3.5')],
        }}
        .range=${'24h'}
        .primary=${MetricKey.PORE_EC}
        .secondaries=${[
          {
            metric: MetricKey.RUNOFF_EC,
            relativeTo: MetricKey.FEED_EC,
            limitOf: (device: GrowspaceDevice) => device.drainConfig?.maxEcDelta,
          },
        ]}
      ></metric-combo-chart>
    `);
    const pane = el.shadowRoot!.querySelector('.duty-pane')!;

    // The breach spends the box and the ceiling sits halfway up it, so the rule
    // stays visible under the bar that crossed it.
    expect(pane.querySelector('.duty-bar')!.getAttribute('height')).toBe('80');
    expect(pane.querySelector('.duty-limit')!.getAttribute('y1')).toBe('40');
  });
});
