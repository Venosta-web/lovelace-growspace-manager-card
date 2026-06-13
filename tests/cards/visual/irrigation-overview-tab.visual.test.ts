import { fixture } from '@open-wc/testing-helpers';
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { html } from 'lit';
import { createGrowspaceDevice } from '../../../src/services/types';
import type { GrowspaceDevice } from '../../../src/services/types';
import type { IrrigationDialog } from '../../../src/dialogs/irrigation-dialog';
// Import the real dialog shell so slotted Overview content actually paints.
import '../../../src/features/shared/ui/gs-dialog';
import '../../../src/dialogs/irrigation-dialog';

function strategy(declared: 'vegetative' | 'balanced' | 'generative') {
  return {
    enabled: true,
    lightsOnTime: '06:00:00',
    p0DurationMinutes: 60,
    p2StopBeforeLightsOffMinutes: 120,
    targetVwcPercent: 55,
    maintenanceDrybackPercent: 2,
    shotDurationSeconds: 10,
    shotIntervalMinutes: 15,
    declaredSteeringMode: declared,
  };
}

function device(
  metrics: NonNullable<GrowspaceDevice['steeringMetrics']>,
  declared: 'vegetative' | 'balanced' | 'generative' = 'generative'
): GrowspaceDevice {
  return createGrowspaceDevice({
    deviceId: 'gs1',
    name: 'Tent 1',
    irrigationConfig: {
      irrigationPumpEntity: 'switch.pump',
      irrigationTimes: [],
      drainTimes: [],
      activeSteeringPhase: 'p2',
    },
    environmentAttributes: { soilMoistureSensor: 'sensor.soil' },
    irrigationStrategy: strategy(declared),
    steeringMetrics: metrics,
  });
}

async function renderOverview(dev: GrowspaceDevice): Promise<IrrigationDialog> {
  const el = await fixture<IrrigationDialog>(html`
    <irrigation-dialog .open=${true} .device=${dev} .initialTab=${'overview'}></irrigation-dialog>
  `);
  await el.updateComplete;
  return el;
}

// Fully-populated Overview: measured score, drybacks, EC trend, shot composition.
test('overview – fully populated measured metrics', async () => {
  const el = await renderOverview(
    device({
      overnightDryback: 12.5,
      latestOvernightEvent: {
        peakVwc: 55.2,
        troughVwc: 42.7,
        dryback: 12.5,
        peakTimestamp: '2026-06-13T06:00:00+00:00',
        troughTimestamp: '2026-06-13T18:00:00+00:00',
      },
      incycleDrybackCount: 6,
      incycleDrybackAvg: 3.4,
      ecTrend: 'rising',
      ecTrendAvailable: true,
      score: 0.6,
      measuredClassification: 'generative',
      intentDeviation: 'on_target',
      shotComposition: {
        ec_modulation_enabled: true,
        ec_modulation_available: true,
        current_vwc_factor: 1.2,
        last_shot: {
          phase: 'p2',
          base_seconds: 10,
          vwc_factor: 1.2,
          ec_factor: 0.9,
          ec_modulation_available: true,
          composed_seconds: 11,
          effective_seconds: 11,
          capped: false,
          timestamp: '2026-06-13T12:00:00+00:00',
        },
      },
    })
  );
  await expect(page.elementLocator(el)).toMatchScreenshot();
});

// Intent deviation: declared generative but substrate reads vegetative.
test('overview – intent deviation banner', async () => {
  const el = await renderOverview(
    device({
      overnightDryback: 4.0,
      latestOvernightEvent: { peakVwc: 58, troughVwc: 54, dryback: 4 },
      incycleDrybackCount: 2,
      incycleDrybackAvg: 1.1,
      ecTrend: 'falling',
      ecTrendAvailable: true,
      score: -0.5,
      measuredClassification: 'vegetative',
      intentDeviation: 'more_vegetative',
      shotComposition: null,
    })
  );
  await expect(page.elementLocator(el)).toMatchScreenshot();
});

// EC trend capability locked: no pore-EC sensors report.
test('overview – EC trend locked with unlock hint', async () => {
  const el = await renderOverview(
    device({
      overnightDryback: null,
      latestOvernightEvent: null,
      incycleDrybackCount: 0,
      incycleDrybackAvg: null,
      ecTrend: null,
      ecTrendAvailable: false,
      score: 0.1,
      measuredClassification: 'balanced',
      intentDeviation: null,
      shotComposition: null,
    })
  );
  await expect(page.elementLocator(el)).toMatchScreenshot();
});
