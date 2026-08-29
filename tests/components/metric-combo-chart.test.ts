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
      .secondary=${MetricKey.EXHAUST}
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
    expect(rows[1].textContent).toMatch(/\d{2}:\d{2}–\d{2}:\d{2}\s*·\s*80\.0 %/);
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
