import { describe, it, expect, vi } from 'vitest';
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
const VPD_HUMIDITY_SENSOR = 'sensor.tent_humidity';
const VPD_SENSOR = 'sensor.tent_vpd';
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

async function mountVpd({
  temperature = true,
  humidity = true,
}: { temperature?: boolean; humidity?: boolean } = {}): Promise<MetricComboChart> {
  const target = {
    deviceId: 'gs-1',
    name: 'Tent',
    environmentAttributes: {
      vpdSensor: VPD_SENSOR,
      ...(temperature ? { temperatureSensor: TEMPERATURE_SENSOR } : {}),
      ...(humidity ? { humiditySensor: VPD_HUMIDITY_SENSOR } : {}),
    },
  } as unknown as GrowspaceDevice;
  const descriptors = computeMetricDescriptors(null, {}, undefined, target);
  const sensorHistory: SensorHistories = {
    [MetricKey.VPD]: [reading(VPD_SENSOR, 20, '1.1'), reading(VPD_SENSOR, 1, '1.4')],
    [MetricKey.TEMPERATURE]: [
      reading(TEMPERATURE_SENSOR, 20, '21.0'),
      reading(TEMPERATURE_SENSOR, 1, '26.0'),
    ],
    [MetricKey.HUMIDITY]: [
      reading(VPD_HUMIDITY_SENSOR, 20, '62'),
      reading(VPD_HUMIDITY_SENSOR, 1, '48'),
    ],
  };

  return await fixture<MetricComboChart>(html`
    <metric-combo-chart
      .device=${target}
      .descriptors=${descriptors}
      .sensorHistory=${sensorHistory}
      .range=${'24h'}
      .primary=${MetricKey.VPD}
      .secondaries=${[{ metric: MetricKey.TEMPERATURE }, { metric: MetricKey.HUMIDITY }]}
    ></metric-combo-chart>
  `);
}

describe('metric-combo-chart', () => {
  it('overlays instantaneous secondaries behind VPD on labelled value axes', async () => {
    const el = await mountVpd();
    const chart = el.shadowRoot!.querySelector('growspace-env-chart')!;
    await (chart as any).updateComplete;

    expect(el.shadowRoot!.querySelector('.duty-pane')).toBeNull();
    expect(chart.shadowRoot!.querySelectorAll('.gs-secondary-trace')).toHaveLength(2);
    expect(chart.shadowRoot!.querySelector('.gs-value-axis-label.primary')!.textContent).toContain(
      'VPD · kPa'
    );
    expect(
      chart.shadowRoot!.querySelector('.gs-value-axis-label.secondary')!.textContent
    ).toContain('Temperature · °C');
    expect(
      chart.shadowRoot!.querySelector('.gs-value-axis-label.secondary')!.textContent
    ).toContain('Humidity · %');
    expect(
      chart.shadowRoot!.querySelectorAll('.gs-value-axis-label.secondary .series-label')
    ).toHaveLength(2);
  });

  it('keeps VPD and its guide marks visually above the subordinate traces', async () => {
    const el = await mountVpd();
    const chart = el.shadowRoot!.querySelector('growspace-env-chart')!;
    await (chart as any).updateComplete;

    const traces = Array.from(
      chart.shadowRoot!.querySelectorAll<SVGPathElement>('.gs-secondary-trace')
    );
    expect(traces).toHaveLength(2);
    expect(traces.every((trace) => trace.getAttribute('stroke-width') === '1.25')).toBe(true);
    expect(traces.every((trace) => trace.getAttribute('stroke-opacity') === '0.38')).toBe(true);

    const svg = chart.shadowRoot!.querySelector('.chart-svg')!;
    const layers = Array.from(
      svg.querySelectorAll('.gs-secondary-trace, .gs-guide-mark, .gs-vpd-status-trace')
    );
    expect(
      layers.filter((layer) => layer.classList.contains('gs-guide-mark')).length
    ).toBeGreaterThan(0);
    expect(
      layers.filter((layer) => layer.classList.contains('gs-vpd-status-trace')).length
    ).toBeGreaterThan(0);
    expect(
      layers.slice(0, 2).every((layer) => layer.classList.contains('gs-secondary-trace'))
    ).toBe(true);
    expect(chart.shadowRoot!.querySelectorAll('.gs-guide-label').length).toBeGreaterThan(0);
  });

  it('scrubs VPD, temperature, and humidity at one moment with no interval rows', async () => {
    const el = await mountVpd();
    const chart = el.shadowRoot!.querySelector('growspace-env-chart') as HTMLElement & {
      updateComplete: Promise<unknown>;
    };
    await chart.updateComplete;
    const pane = chart.shadowRoot!.querySelector<HTMLElement>('.gs-env-chart-container')!;
    vi.spyOn(pane, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 200,
    } as DOMRect);

    pane.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: 400,
        pointerId: 1,
        pointerType: 'mouse',
      })
    );
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await el.updateComplete;

    const tooltip = el.shadowRoot!.querySelector('chart-scrub-tooltip') as any;
    expect(tooltip).not.toBeNull();
    const seriesRows = tooltip.rows.filter((row: any) =>
      ['VPD', 'Temperature', 'Humidity'].includes(row.title)
    );
    expect(seriesRows.map((row: any) => row.title)).toEqual(['VPD', 'Temperature', 'Humidity']);
    expect(tooltip.rows.every((row: any) => row.time.kind === 'moment')).toBe(true);
  });

  it('keeps the configured instantaneous secondary when the other is unavailable', async () => {
    const el = await mountVpd({ humidity: false });
    const chart = el.shadowRoot!.querySelector('growspace-env-chart')!;
    await (chart as any).updateComplete;

    // The fixture retains stale humidity history on purpose. Configuration is
    // the authority, so that cache must not resurrect an unavailable trace.
    expect(chart.shadowRoot!.querySelectorAll('.gs-secondary-trace')).toHaveLength(1);
    const axis = chart.shadowRoot!.querySelector('.gs-value-axis-label.secondary')!.textContent!;
    expect(axis).toContain('Temperature · °C');
    expect(axis).not.toContain('Humidity');
  });

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

  it('exposes the interval pane as one graphic with its metric, window, scale, and values', async () => {
    const el = await mount();
    const svg = el.shadowRoot!.querySelector('.duty-pane svg')!;

    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe(
      'Exhaust duty, scale 80%, 24h window. range 80.0% to 80.0%, average 80.0%, current 80.0%.'
    );
  });

  it('scrubs the interval pane with one tooltip and one cursor shared by both panes', async () => {
    const el = await mount();
    const pane = el.shadowRoot!.querySelector<HTMLElement>('.duty-pane')!;
    vi.spyOn(pane, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 100,
      height: 64,
    } as DOMRect);

    pane.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: 50,
        pointerId: 1,
        pointerType: 'touch',
      })
    );
    await el.updateComplete;

    const overlays = el.shadowRoot!.querySelectorAll('chart-scrub-tooltip');
    expect(overlays).toHaveLength(1);
    expect(overlays[0].shadowRoot!.textContent).toContain('Temperature');
    expect(overlays[0].shadowRoot!.textContent).toContain('Exhaust');
    expect(overlays[0].shadowRoot!.querySelectorAll('.chart-scrub-cursor')).toHaveLength(1);
    expect(getComputedStyle(pane).touchAction).toBe('pan-y');
  });

  it('delegates primary-pane scrubbing to the same combo tooltip', async () => {
    const el = await mount();
    const chart = el.shadowRoot!.querySelector('growspace-env-chart') as HTMLElement & {
      updateComplete: Promise<unknown>;
    };
    await chart.updateComplete;
    const pane = chart.shadowRoot!.querySelector<HTMLElement>('.gs-env-chart-container')!;
    vi.spyOn(pane, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 200,
    } as DOMRect);

    pane.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: 200,
        pointerId: 1,
        pointerType: 'mouse',
      })
    );
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await el.updateComplete;

    const overlay = el.shadowRoot!.querySelector('chart-scrub-tooltip')!;
    expect(overlay).not.toBeNull();
    expect((overlay as any).position).toBeCloseTo(0.25);
    expect(overlay.shadowRoot!.textContent).toContain('Temperature');
    expect(overlay.shadowRoot!.textContent).toContain('Exhaust');
    expect(chart.shadowRoot!.querySelector('.gs-tooltip')).toBeNull();
  });

  it('clears the shared tooltip and cursor together when the combo is left', async () => {
    const el = await mount();
    const intervalPane = el.shadowRoot!.querySelector<HTMLElement>('.duty-pane')!;
    vi.spyOn(intervalPane, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 100,
      height: 64,
    } as DOMRect);
    intervalPane.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, clientX: 50, pointerId: 1 })
    );
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('chart-scrub-tooltip')).not.toBeNull();

    el.shadowRoot!.querySelector('growspace-env-chart')!.dispatchEvent(
      new PointerEvent('pointerleave', { pointerId: 1 })
    );
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('chart-scrub-tooltip')).toBeNull();
  });

  it('labels instantaneous rows with a moment and interval rows with their bucket span', async () => {
    const el = await mount();
    const pane = el.shadowRoot!.querySelector<HTMLElement>('.duty-pane')!;
    vi.spyOn(pane, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 100,
      height: 64,
    } as DOMRect);
    pane.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, clientX: 50, pointerId: 1 })
    );
    await el.updateComplete;

    const rows = el
      .shadowRoot!.querySelector('chart-scrub-tooltip')!
      .shadowRoot!.querySelectorAll('.chart-scrub-row');
    expect(rows[0].textContent).toMatch(/\d{2}:\d{2}\s*·\s*24\.5 °C/);
    expect(rows[0].textContent).not.toContain('–');
    // Unit spacing is one decision for the whole Env Graph family (#855).
    expect(rows[1].textContent).toMatch(/\d{2}:\d{2}–\d{2}:\d{2}\s*·\s*80\.0%/);
  });

  it('keeps the shared time window anchored while the pointer moves', async () => {
    const el = await mount();
    const chart = el.shadowRoot!.querySelector('growspace-env-chart') as HTMLElement & {
      chartWindow: { startTimeMs: number; durationMillis: number };
    };
    const windowBeforeScrub = chart.chartWindow;
    const now = vi
      .spyOn(Date, 'now')
      .mockReturnValue(windowBeforeScrub.startTimeMs + windowBeforeScrub.durationMillis + 60_000);
    const pane = el.shadowRoot!.querySelector<HTMLElement>('.duty-pane')!;
    vi.spyOn(pane, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 100,
      height: 64,
    } as DOMRect);

    pane.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, clientX: 50, pointerId: 1 })
    );
    await el.updateComplete;
    now.mockRestore();

    expect(chart.chartWindow).toEqual(windowBeforeScrub);
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

  it('scrubs every pane at once from whichever one is hovered', async () => {
    // Two panes over one X axis means one scrub owner (ADR-0049), and that
    // holds however many panes there are: hovering the humidifier's pane must
    // still report what the dehumidifier was doing at the same moment, or the
    // grower is back to reading two charts side by side.
    const el = await mountHumidity();
    const pane = el.shadowRoot!.querySelector<HTMLElement>('.duty-pane')!;
    vi.spyOn(pane, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 100,
      height: 64,
    } as DOMRect);

    pane.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, clientX: 50, pointerId: 1 })
    );
    await el.updateComplete;

    const overlays = el.shadowRoot!.querySelectorAll('chart-scrub-tooltip');
    expect(overlays).toHaveLength(1);
    const rows = Array.from(overlays[0].shadowRoot!.querySelectorAll('.chart-scrub-row')).map(
      (row) => row.textContent
    );
    expect(rows).toHaveLength(3);
    expect(rows.join(' ')).toContain('Humidity');
    expect(rows.join(' ')).toContain('Humidifier');
    expect(rows.join(' ')).toContain('Dehumidifier');
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
  /** An instantaneous draw over the accumulated consumption, at a given power. */
  async function mountPower(watts: string): Promise<MetricComboChart> {
    const target = {
      deviceId: 'gs-1',
      name: 'Tent',
      environmentAttributes: { energySensors: [ENERGY_SENSOR], powerSensors: [POWER_SENSOR] },
    } as unknown as GrowspaceDevice;

    return await fixture<MetricComboChart>(html`
      <metric-combo-chart
        .device=${target}
        .descriptors=${computeMetricDescriptors(null, {}, undefined, target)}
        .sensorHistory=${{
          [MetricKey.ENERGY]: [reading(ENERGY_SENSOR, 26, '12.5')],
          [MetricKey.POWER]: [reading(POWER_SENSOR, 26, watts)],
        }}
        .range=${'24h'}
        .primary=${MetricKey.ENERGY}
        .secondaries=${[{ metric: MetricKey.POWER }]}
      ></metric-combo-chart>
    `);
  }

  function caps(el: MetricComboChart): string[] {
    return Array.from(el.shadowRoot!.querySelectorAll('.duty-readout')).map((node) =>
      node.textContent!.trim()
    );
  }

  it('caps the pane in the metric own unit rather than as duty', async () => {
    // The tank pattern in another unit: power scales to its data, so there is
    // no full scale for a percentage to mean anything against.
    expect(caps(await mountPower('400'))).toEqual(['400 W']);
  });

  it('rounds the cap the way every other scale mark on the chart rounds', async () => {
    // A cap is a scale, not a measurement: `40.0 W` claims a precision the pane
    // does not have, and rounds differently from the value axis beside it (#855).
    expect(caps(await mountPower('40'))).toEqual(['40 W']);
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
