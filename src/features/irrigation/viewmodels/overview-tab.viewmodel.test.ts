import { describe, it, expect } from 'vitest';
import { atom } from 'nanostores';
import {
  createOverviewTabViewModel,
  deriveInfiltration,
  deriveShotSuppression,
  type ShotCompositionPanel,
} from './overview-tab.viewmodel';
import { createGrowspaceDevice } from '../../../services/types';
import type {
  GrowspaceDevice,
  SerializedShotComposition,
  SteeringMetrics,
} from '../../../services/types';
import type { DialogCapabilities } from './dialog-capabilities';

const EMPTY_CAPS = {} as DialogCapabilities;

function metrics(shotComposition: SerializedShotComposition | null): SteeringMetrics {
  return {
    overnightDryback: null,
    latestOvernightEvent: null,
    incycleDrybackCount: 0,
    incycleDrybackAvg: null,
    ecTrend: null,
    ecTrendAvailable: false,
    score: null,
    measuredClassification: null,
    intentDeviation: null,
    shotComposition,
  };
}

function panel(shotComposition: SerializedShotComposition | null): ShotCompositionPanel | null {
  const device = createGrowspaceDevice({
    deviceId: 'gs1',
    name: 'Tent',
    steeringMetrics: metrics(shotComposition),
  });
  const $device = atom<GrowspaceDevice | undefined>(device);
  const $caps = atom<DialogCapabilities>(EMPTY_CAPS);
  return createOverviewTabViewModel($device, $caps).get().shotComposition;
}

describe('overview-tab.viewmodel – Infiltration state', () => {
  it.each([
    ['infiltrating', 'Absorbing'],
    ['settled', 'Settled'],
    ['drying', 'Drying back'],
  ])('renders a badge for %s', (state, label) => {
    expect(deriveInfiltration({ infiltration: state })?.label).toBe(label);
  });

  it.each([
    ['unknown — no fresh sensor sample', { infiltration: 'unknown' }],
    ['a state this card does not recognise', { infiltration: 'liquefying' }],
    ['a backend that predates the field', { last_shot: null }],
    ['a null field', { infiltration: null }],
  ])('shows no badge for %s', (_case, composition) => {
    expect(deriveInfiltration(composition as SerializedShotComposition)).toBeNull();
  });
});

describe('overview-tab.viewmodel – shot suppression', () => {
  it('treats an ordinary cooldown wait as not held', () => {
    const suppression = deriveShotSuppression({ suppressed_by: 'cooldown' });
    expect(suppression?.held).toBe(false);
    expect(suppression?.label).toBe('Waiting out the shot cooldown.');
  });

  it.each([
    ['infiltrating', 'Held — the substrate is still absorbing the last shot.'],
    ['no_pump', 'Held — no irrigation pump is configured.'],
    ['zero_volume', 'Held — the computed shot came out at zero.'],
  ])('marks %s as held with its own reason', (reason, label) => {
    const suppression = deriveShotSuppression({ suppressed_by: reason });
    expect(suppression?.held).toBe(true);
    expect(suppression?.label).toBe(label);
  });

  it('treats an unrecognised reason as held rather than as a countdown', () => {
    const suppression = deriveShotSuppression({ suppressed_by: 'tank_empty' });
    expect(suppression?.held).toBe(true);
    expect(suppression?.label).toBe('Held — tank_empty.');
  });

  it.each([
    ['the last tick fired', { suppressed_by: null }],
    ['a backend that predates the field', { last_shot: null }],
  ])('reports no suppression when %s', (_case, composition) => {
    expect(deriveShotSuppression(composition as SerializedShotComposition)).toBeNull();
  });
});

describe('overview-tab.viewmodel – shot composition panel', () => {
  it('surfaces both fields before any shot has fired', () => {
    const result = panel({
      infiltration: 'infiltrating',
      suppressed_by: 'infiltrating',
      last_shot: null,
    });
    expect(result?.rows).toBeNull();
    expect(result?.infiltration?.label).toBe('Absorbing');
    expect(result?.suppression?.held).toBe(true);
  });

  it('surfaces both fields alongside the rows of a fired shot', () => {
    const result = panel({
      infiltration: 'settled',
      suppressed_by: 'cooldown',
      last_shot: { base_seconds: 30, vwc_factor: 1.1, ec_factor: 1, effective_seconds: 33 },
    });
    expect(result?.rows).toHaveLength(4);
    expect(result?.infiltration?.label).toBe('Settled');
    expect(result?.suppression?.held).toBe(false);
  });

  it('leaves both slots empty against a backend that sends neither field', () => {
    const result = panel({ ec_modulation_enabled: true, last_shot: null });
    expect(result).not.toBeNull();
    expect(result?.infiltration).toBeNull();
    expect(result?.suppression).toBeNull();
  });

  it('renders no panel at all when the payload has no shot composition', () => {
    expect(panel(null)).toBeNull();
  });
});
