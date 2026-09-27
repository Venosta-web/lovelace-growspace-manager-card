/**
 * PROTOTYPE — growspace_manager#864. Throwaway; lives only on the
 * `prototype/864-irrigation-zones` branch. Never merge.
 *
 * Question: what does the card show for Irrigation Zones, a zone in Degraded
 * Control, and requested-vs-delivered water — and how does a single-zone
 * grower's screen stay unchanged?
 *
 * Plan: three structurally different variants of a new "Zones" surface in the
 * real Irrigation dialog (plus the header chip it implies), switchable with
 * `?proto864=A|B|C` and a floating bar, over four stub scenarios. The grid
 * size and the plants come from the real device; zones, probes, attempts, the
 * queue and the cap are stubs shaped like ADR-0055/0057/0059/0061/0062/0064.
 */

import { atom } from 'nanostores';

declare const process: { env: { NODE_ENV?: string } };

export type VariantKey = 'A' | 'B' | 'C';
export type ScenarioKey = 'multi' | 'capped' | 'single' | 'single_unresponsive';

export const VARIANTS: { key: VariantKey; name: string }[] = [
  { key: 'A', name: 'Zone switcher' },
  { key: 'B', name: 'Grid is the map' },
  { key: 'C', name: 'Supply timeline' },
];

export const SCENARIOS: { key: ScenarioKey; name: string }[] = [
  { key: 'multi', name: '3 zones, 13:32' },
  { key: 'capped', name: '3 zones, cap hit, 16:05' },
  { key: 'single', name: '1 zone, healthy' },
  { key: 'single_unresponsive', name: '1 zone, probe_unresponsive' },
];

const STORAGE_KEY = 'gsm-proto-864';

interface ProtoSelection {
  enabled: boolean;
  variant: VariantKey;
  scenario: ScenarioKey;
}

function readSelection(): ProtoSelection {
  const off: ProtoSelection = { enabled: false, variant: 'A', scenario: 'multi' };
  if (process.env.NODE_ENV === 'production') return off;
  let stored: Partial<ProtoSelection> = {};
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    /* prototype */
  }
  const params = new URLSearchParams(window.location.search);
  const v = params.get('proto864');
  const s = params.get('scenario');
  const sel: ProtoSelection = {
    enabled: v ? v !== 'off' : !!stored.enabled,
    variant: (['A', 'B', 'C'].includes(v ?? '') ? v : (stored.variant ?? 'A')) as VariantKey,
    scenario: (SCENARIOS.some((x) => x.key === s)
      ? s
      : (stored.scenario ?? 'multi')) as ScenarioKey,
  };
  persist(sel);
  return sel;
}

function persist(sel: ProtoSelection): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sel));
  } catch {
    /* prototype */
  }
}

export const proto864$ = atom<ProtoSelection>(readSelection());

export function setProto(patch: Partial<ProtoSelection>): void {
  const next = { ...proto864$.get(), ...patch };
  proto864$.set(next);
  persist(next);
  const url = new URL(window.location.href);
  url.searchParams.set('proto864', next.enabled ? next.variant : 'off');
  url.searchParams.set('scenario', next.scenario);
  window.history.replaceState(window.history.state, '', url.toString());
}

export function protoEnabled(): boolean {
  return proto864$.get().enabled;
}

// ─── Stub domain ────────────────────────────────────────────────────────────

export type ProbeHealth = 'ok' | 'stale' | 'unresponsive' | 'implausible' | 'unavailable';
export type ZoneState =
  | 'steering'
  | 'running'
  | 'queued'
  | 'substituting'
  | 'inhibited'
  | 'fallback'
  | 'idle';
export type Calibration = 'unverified' | 'verified' | 'disputed';

export interface ProtoProbe {
  entity: string;
  name: string;
  role: 'control' | 'witness';
  cell: [number, number] | null;
  health: ProbeHealth;
  vwc: number | null;
  /** Learned 24 h offset (control − witness); null when it cannot substitute. */
  offset: number | null;
  since?: string;
}

export interface ProtoZone {
  id: string;
  name: string;
  color: string;
  cells: string[];
  valves: string[];
  probes: ProtoProbe[];
  state: ZoneState;
  phase: 'P0' | 'P1' | 'P2' | 'P3' | null;
  vwc: number | null;
  target: number;
  trigger: number;
  degraded?: { cause: string; since: string; alertAt: string };
  fallback?: { mode: 'hold' | 'replay'; referenceDay: string | null; nextShot?: string };
  substitution?: { witness: string; offset: number; since: string };
  claim?: { dueAt: string; ahead: string[] };
  calibration: Calibration;
  calibrationEvidence: number;
  proposal?: { from: number; to: number; ratio: number };
  meter: string | null;
  recipe: string;
  degradedFallback: 'hold' | 'replay';
}

export type AttemptOutcome =
  | 'completed'
  | 'aborted'
  | 'suppressed'
  | 'not_delivered'
  | 'interrupted'
  | 'open';

export interface ProtoAttempt {
  id: string;
  zoneId: string;
  trigger: 'steering' | 'schedule' | 'manual' | 'fallback';
  phase?: 'P1' | 'P2';
  /** Minutes of the local day. */
  dueAt: number;
  requestedAt: number;
  onAt?: number;
  offAt?: number;
  plannedS: number;
  plannedL: number;
  chargedL: number;
  estimatedL: number | null;
  meteredL?: number | null;
  outcome: AttemptOutcome;
  reason?: string;
  /** Merged consecutive suppressions (ADR-0055 item 5). */
  count?: number;
  lastAt?: number;
  vwcBefore?: number | null;
  offReadBack?: boolean;
  replayOf?: string;
}

export interface ProtoScenario {
  key: ScenarioKey;
  now: number;
  lightsOn: number;
  lightsOff: number;
  p2Stop: number;
  layoutRevision: number;
  zones: ProtoZone[];
  attempts: ProtoAttempt[];
  cap: { litersCap: number; cyclesCap: number; hitAt: number | null };
  runningZone: string | null;
  queue: string[];
  valves: string[];
  probeEntities: string[];
  tankPump?: { tankL: number; pumpL: number; days: number } | null;
  unattributedL?: number;
}

export const ZONE_COLORS = ['#4fc3f7', '#ffb74d', '#ba68c8', '#81c784', '#f06292', '#e0e0e0'];

export const hhmm = (min: number): string =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(Math.round(min % 60)).padStart(2, '0')}`;

export const t = (s: string): number => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

export function cellKey(r: number, c: number): string {
  return `${r},${c}`;
}

/** Split `rows` into 3 bands for the multi-zone scenarios. */
function bands(rows: number, cols: number): string[][] {
  const all = (rs: number[]) =>
    rs.flatMap((r) => Array.from({ length: cols }, (_, c) => cellKey(r, c)));
  if (rows <= 1) return [all([0]), [], []];
  if (rows === 2) return [all([0]), all([1]), []];
  const first = Array.from({ length: rows - 2 }, (_, i) => i);
  return [all(first), all([rows - 2]), all([rows - 1])];
}

let seq = 0;
function shot(
  zoneId: string,
  at: string,
  plannedS: number,
  flowMlS: number,
  opts: Partial<ProtoAttempt> = {}
): ProtoAttempt {
  const m = t(at);
  const plannedL = +((plannedS * flowMlS) / 1000).toFixed(2);
  const wait = opts.dueAt !== undefined ? m - opts.dueAt : 0;
  const onAt = m + 0.15;
  const outcome = opts.outcome ?? 'completed';
  const ranS = outcome === 'aborted' ? Math.round(plannedS * 0.3) : plannedS;
  const est =
    outcome === 'suppressed' || outcome === 'not_delivered'
      ? null
      : +((ranS * flowMlS) / 1000).toFixed(2);
  return {
    id: `att-${++seq}`,
    zoneId,
    trigger: 'steering',
    dueAt: m - wait,
    requestedAt: m,
    onAt: outcome === 'suppressed' || outcome === 'not_delivered' ? undefined : onAt,
    offAt:
      outcome === 'suppressed' || outcome === 'not_delivered' || outcome === 'open'
        ? undefined
        : onAt + ranS / 60,
    plannedS,
    plannedL,
    chargedL: outcome === 'suppressed' || outcome === 'not_delivered' ? 0 : plannedL,
    estimatedL: est,
    outcome,
    offReadBack: outcome === 'completed' || outcome === 'aborted',
    ...opts,
  };
}

function zoneFlow(id: string): number {
  return id === 'z1' ? 34 : id === 'z2' ? 30 : 28;
}

export function buildScenario(key: ScenarioKey, rows: number, cols: number): ProtoScenario {
  seq = 0;
  const valves = [
    'switch.valve_bench_a',
    'switch.valve_bench_a2',
    'switch.valve_bench_b',
    'switch.valve_bench_c',
    'switch.valve_spare',
  ];
  const probeEntities = [
    'sensor.bench_a_vwc_1',
    'sensor.bench_a_vwc_2',
    'sensor.bench_b_vwc_1',
    'sensor.bench_b_vwc_2',
    'sensor.bench_c_vwc_1',
    'sensor.tent_vwc',
    'sensor.spare_teros12',
  ];
  const lightsOn = t('06:00');
  const lightsOff = t('18:00');
  const p2Stop = t('16:00');

  if (key === 'single' || key === 'single_unresponsive') {
    const all = Array.from({ length: rows * cols }, (_, i) =>
      cellKey(Math.floor(i / cols), i % cols)
    );
    const bad = key === 'single_unresponsive';
    const zone: ProtoZone = {
      id: 'default',
      name: 'Zone 1',
      color: ZONE_COLORS[0],
      cells: all,
      valves: [],
      probes: [
        {
          entity: 'sensor.tent_vwc',
          name: 'Tent VWC',
          role: 'control',
          cell: [Math.min(1, rows - 1), Math.min(2, cols - 1)],
          health: bad ? 'unresponsive' : 'ok',
          vwc: bad ? 41.2 : 52.6,
          offset: null,
          since: bad ? '10:20' : undefined,
        },
      ],
      state: bad ? 'inhibited' : 'steering',
      phase: 'P2',
      vwc: bad ? null : 52.6,
      target: 58,
      trigger: 50,
      degraded: bad ? { cause: 'probe_unresponsive', since: '10:20', alertAt: '10:35' } : undefined,
      fallback: bad ? { mode: 'hold', referenceDay: '24 Sep' } : undefined,
      calibration: 'unverified',
      calibrationEvidence: 0,
      meter: null,
      recipe: 'Flower W4 — Coco 11 L',
      degradedFallback: 'hold',
    };
    const f = 32;
    const attempts: ProtoAttempt[] = [
      shot('default', '06:30', 40, f, { phase: 'P1' }),
      shot('default', '06:50', 40, f, { phase: 'P1' }),
      shot('default', '07:10', 40, f, { phase: 'P1' }),
      shot('default', '07:30', 40, f, { phase: 'P1' }),
      shot('default', '07:50', 40, f, { phase: 'P1' }),
      ...(bad
        ? [
            shot('default', '09:40', 45, f, { phase: 'P2', vwcBefore: 41.2 }),
            shot('default', '10:00', 45, f, { phase: 'P2', vwcBefore: 41.2 }),
            shot('default', '10:20', 45, f, { phase: 'P2', vwcBefore: 41.2 }),
          ]
        : [
            shot('default', '09:55', 45, f, { phase: 'P2', vwcBefore: 49.8 }),
            shot('default', '11:40', 45, f, { phase: 'P2', vwcBefore: 49.9 }),
            shot('default', '13:05', 45, f, { phase: 'P2', vwcBefore: 49.7 }),
          ]),
    ];
    return {
      key,
      now: t('13:32'),
      lightsOn,
      lightsOff,
      p2Stop,
      layoutRevision: 14,
      zones: [zone],
      attempts,
      cap: { litersCap: 20, cyclesCap: 40, hitAt: null },
      runningZone: null,
      queue: [],
      valves,
      probeEntities,
      tankPump: { tankL: 12.4, pumpL: 8.1, days: 2 },
    };
  }

  const [c1, c2, c3] = bands(rows, cols);
  const capped = key === 'capped';
  const z1: ProtoZone = {
    id: 'z1',
    name: 'Bench A',
    color: ZONE_COLORS[0],
    cells: c1,
    valves: ['switch.valve_bench_a', 'switch.valve_bench_a2'],
    probes: [
      {
        entity: 'sensor.bench_a_vwc_1',
        name: 'A-1',
        role: 'control',
        cell: [0, 1],
        health: 'ok',
        vwc: 55.1,
        offset: null,
      },
      {
        entity: 'sensor.bench_a_vwc_2',
        name: 'A-2',
        role: 'witness',
        cell: [Math.min(1, rows - 1), Math.max(0, cols - 2)],
        health: 'ok',
        vwc: 49.3,
        offset: 5.8,
      },
    ],
    state: capped ? 'inhibited' : 'running',
    phase: capped ? 'P3' : 'P2',
    vwc: capped ? 51.2 : 55.1,
    target: 60,
    trigger: 52,
    calibration: capped ? 'disputed' : 'verified',
    calibrationEvidence: capped ? 9 : 10,
    proposal: capped ? { from: 34, to: 44, ratio: 1.3 } : undefined,
    meter: 'sensor.bench_a_flow_total',
    recipe: 'Flower W4 — Coco 11 L',
    degradedFallback: 'hold',
  };
  const z2: ProtoZone = {
    id: 'z2',
    name: 'Bench B',
    color: ZONE_COLORS[1],
    cells: c2,
    valves: ['switch.valve_bench_b'],
    probes: [
      {
        entity: 'sensor.bench_b_vwc_1',
        name: 'B-1',
        role: 'control',
        cell: [rows - 2, 1],
        health: 'stale',
        vwc: null,
        offset: null,
        since: '11:02',
      },
      {
        entity: 'sensor.bench_b_vwc_2',
        name: 'B-2',
        role: 'witness',
        cell: [rows - 2, Math.max(0, cols - 2)],
        health: 'ok',
        vwc: 46.9,
        offset: 2.1,
      },
    ],
    state: capped ? 'inhibited' : 'queued',
    phase: capped ? 'P3' : 'P2',
    vwc: 49.0,
    target: 57,
    trigger: 50,
    substitution: { witness: 'B-2', offset: 2.1, since: '11:02' },
    claim: capped ? undefined : { dueAt: '13:30', ahead: ['Bench A'] },
    calibration: 'unverified',
    calibrationEvidence: 0,
    meter: null,
    recipe: 'Flower W4 — Coco 11 L (r3)',
    degradedFallback: 'hold',
  };
  const z3: ProtoZone = {
    id: 'z3',
    name: 'Bench C',
    color: ZONE_COLORS[2],
    cells: c3,
    valves: ['switch.valve_bench_c'],
    probes: [
      {
        entity: 'sensor.bench_c_vwc_1',
        name: 'C-1',
        role: 'control',
        cell: [rows - 1, 2 % cols],
        health: 'unresponsive',
        vwc: 38.4,
        offset: null,
        since: '10:20',
      },
    ],
    state: 'fallback',
    phase: capped ? 'P3' : 'P2',
    vwc: null,
    target: 55,
    trigger: 48,
    degraded: { cause: 'probe_unresponsive', since: '10:20', alertAt: '10:35' },
    fallback: { mode: 'replay', referenceDay: '24 Sep', nextShot: capped ? undefined : '13:45' },
    calibration: 'unverified',
    calibrationEvidence: 2,
    meter: null,
    recipe: 'Flower W6 — Rockwool',
    degradedFallback: 'replay',
  };

  const f1 = zoneFlow('z1');
  const f2 = zoneFlow('z2');
  const f3 = zoneFlow('z3');
  const m = (a: ProtoAttempt, ratio: number): ProtoAttempt => ({
    ...a,
    meteredL: a.estimatedL != null ? +(a.estimatedL * ratio).toFixed(2) : null,
    chargedL:
      a.estimatedL != null ? Math.max(a.chargedL, +(a.estimatedL * ratio).toFixed(2)) : a.chargedL,
  });
  const r1 = capped ? 1.3 : 1.03;
  const attempts: ProtoAttempt[] = [
    // P1 at lights-on + P0: all three due on the same tick, served in zone order.
    m(shot('z1', '06:30', 45, f1, { phase: 'P1', dueAt: t('06:30') }), r1),
    shot('z2', '06:31', 40, f2, { phase: 'P1', dueAt: t('06:30') }),
    shot('z3', '06:32', 40, f3, { phase: 'P1', dueAt: t('06:30') }),
    m(shot('z1', '06:50', 45, f1, { phase: 'P1', dueAt: t('06:50') }), r1),
    shot('z2', '06:51', 40, f2, { phase: 'P1', dueAt: t('06:50') }),
    shot('z3', '06:52', 40, f3, { phase: 'P1', dueAt: t('06:50') }),
    m(shot('z1', '07:10', 45, f1, { phase: 'P1', dueAt: t('07:10') }), r1),
    shot('z2', '07:11', 40, f2, { phase: 'P1', dueAt: t('07:10') }),
    shot('z3', '07:12', 40, f3, { phase: 'P1', dueAt: t('07:10') }),
    m(shot('z1', '07:30', 45, f1, { phase: 'P1', dueAt: t('07:30') }), r1),
    shot('z2', '07:31', 40, f2, { phase: 'P1', dueAt: t('07:30') }),
    m(shot('z1', '07:50', 45, f1, { phase: 'P1', dueAt: t('07:50') }), r1),
    shot('z2', '09:12', 40, f2, {
      phase: 'P2',
      dueAt: t('09:12'),
      outcome: 'not_delivered',
      reason: 'Pump did not confirm ON within 10 s',
    }),
    shot('z3', '09:40', 45, f3, { phase: 'P2', dueAt: t('09:40'), vwcBefore: 38.4 }),
    shot('z2', '09:45', 40, f2, { phase: 'P2', dueAt: t('09:45'), vwcBefore: 49.6 }),
    shot('z3', '10:00', 45, f3, { phase: 'P2', dueAt: t('10:00'), vwcBefore: 38.4 }),
    m(shot('z1', '10:05', 50, f1, { phase: 'P2', dueAt: t('10:05'), vwcBefore: 51.8 }), r1),
    shot('z3', '10:20', 45, f3, { phase: 'P2', dueAt: t('10:20'), vwcBefore: 38.4 }),
    shot('z3', '11:00', 36, f3, {
      trigger: 'fallback',
      dueAt: t('11:00'),
      replayOf: '24 Sep 11:00 · 45 s',
    }),
    m(shot('z1', '11:40', 50, f1, { phase: 'P2', dueAt: t('11:40'), vwcBefore: 51.9 }), r1),
    shot('z2', '11:42', 40, f2, { phase: 'P2', dueAt: t('11:40'), vwcBefore: 49.8 }),
    shot('z3', '12:15', 36, f3, {
      trigger: 'fallback',
      dueAt: t('12:15'),
      replayOf: '24 Sep 12:15 · 45 s',
    }),
    shot('z1', '12:40', 30, f1, {
      trigger: 'manual',
      dueAt: t('12:40'),
      outcome: 'aborted',
      reason: 'Manual Override switched on',
    }),
  ];
  if (!capped) {
    attempts.push(
      m(
        shot('z1', '13:31', 50, f1, {
          phase: 'P2',
          dueAt: t('13:29'),
          vwcBefore: 51.7,
          outcome: 'open',
        }),
        r1
      )
    );
  } else {
    attempts.push(
      m(shot('z1', '13:31', 50, f1, { phase: 'P2', dueAt: t('13:29'), vwcBefore: 51.7 }), r1),
      shot('z2', '13:32', 40, f2, { phase: 'P2', dueAt: t('13:30'), vwcBefore: 49.9 }),
      shot('z3', '13:45', 36, f3, {
        trigger: 'fallback',
        dueAt: t('13:45'),
        replayOf: '24 Sep 13:45 · 45 s',
      }),
      m(shot('z1', '14:20', 55, f1, { phase: 'P2', dueAt: t('14:20'), vwcBefore: 51.4 }), r1),
      shot('z2', '14:35', 40, f2, { phase: 'P2', dueAt: t('14:35'), vwcBefore: 49.6 }),
      m(shot('z1', '15:12', 55, f1, { phase: 'P2', dueAt: t('15:12'), vwcBefore: 51.0 }), r1),
      shot('z1', '15:20', 55, f1, {
        phase: 'P2',
        dueAt: t('15:20'),
        outcome: 'suppressed',
        reason: 'cap_volume',
        count: 3,
        lastAt: t('15:58'),
      }),
      shot('z2', '15:26', 40, f2, {
        phase: 'P2',
        dueAt: t('15:26'),
        outcome: 'suppressed',
        reason: 'cap_volume',
        count: 2,
        lastAt: t('15:49'),
      }),
      shot('z3', '15:30', 36, f3, {
        trigger: 'fallback',
        dueAt: t('15:30'),
        outcome: 'suppressed',
        reason: 'cap_volume',
        replayOf: '24 Sep 15:30 · 45 s',
      })
    );
  }
  attempts.sort((a, b) => a.requestedAt - b.requestedAt);
  // The capped day runs out on the 15:12 shot: the cap is whatever was charged by then.
  const chargedBy = (m: number) =>
    attempts.filter((a) => a.requestedAt <= m).reduce((n, a) => n + a.chargedL, 0);
  const litersCap = capped ? Math.floor(chargedBy(t('15:12'))) : 48;

  return {
    key,
    now: capped ? t('16:05') : t('13:32'),
    lightsOn,
    lightsOff,
    p2Stop,
    layoutRevision: 14,
    zones: [z1, z2, z3].filter((z) => z.cells.length > 0),
    attempts,
    cap: { litersCap, cyclesCap: 40, hitAt: capped ? t('15:12') : null },
    runningZone: capped ? null : 'z1',
    queue: capped ? [] : ['z2'],
    valves,
    probeEntities,
    tankPump: null,
    unattributedL: capped ? 0.4 : 0,
  };
}

// ─── Derived figures every variant uses ─────────────────────────────────────

export function capUse(s: ProtoScenario): {
  liters: number;
  cycles: number;
  byZone: Record<string, number>;
} {
  const byZone: Record<string, number> = {};
  let liters = 0;
  let cycles = 0;
  for (const a of s.attempts) {
    if (a.chargedL > 0) {
      liters += a.chargedL;
      cycles += 1;
      byZone[a.zoneId] = (byZone[a.zoneId] ?? 0) + a.chargedL;
    }
  }
  return { liters: +liters.toFixed(1), cycles, byZone };
}

export function deliveredToday(s: ProtoScenario, zoneId?: string): number {
  return +s.attempts
    .filter((a) => !zoneId || a.zoneId === zoneId)
    .reduce((n, a) => n + (a.meteredL ?? a.estimatedL ?? 0), 0)
    .toFixed(1);
}

export const REASON_LABEL: Record<string, string> = {
  cap_volume: 'Daily volume cap reached',
  cap_cycles: 'Daily cycle limit reached',
  probe_unresponsive: 'Probe unresponsive — 3 shots, no rise',
  sensor_stale: 'Probe stopped reporting',
  sensor_implausible: 'Probe reading implausible',
  sensor_unavailable: 'Probe unavailable',
  queued: 'Waiting for the pump',
  dark: 'Lights off',
};

export const STATE_LABEL: Record<ZoneState, string> = {
  steering: 'Steering',
  running: 'Watering now',
  queued: 'Waiting for pump',
  substituting: 'Steering on witness',
  inhibited: 'Held',
  fallback: 'Replaying',
  idle: 'Idle',
};

/** The zone's headline state, folding substitution in (it is a notice, not a state). */
export function zoneHeadline(
  z: ProtoZone,
  s: ProtoScenario
): { label: string; tone: 'ok' | 'active' | 'warn' | 'danger' | 'quiet' } {
  if (s.cap.hitAt !== null) return { label: 'Held · daily cap', tone: 'warn' };
  if (z.state === 'fallback')
    return { label: `Replaying ${z.fallback?.referenceDay}`, tone: 'warn' };
  if (z.degraded)
    return {
      label: `Held · ${REASON_LABEL[z.degraded.cause] ?? z.degraded.cause}`,
      tone: 'danger',
    };
  if (z.state === 'running') return { label: 'Watering now', tone: 'active' };
  if (z.state === 'queued') return { label: 'Waiting for pump', tone: 'active' };
  if (z.substitution) return { label: `Steering on ${z.substitution.witness}`, tone: 'warn' };
  return { label: STATE_LABEL[z.state], tone: 'ok' };
}

export const TONE_COLOR: Record<string, string> = {
  ok: 'var(--success-color, #4caf50)',
  active: 'var(--gm-info-color, #2196f3)',
  warn: 'var(--warning-color, #ff9800)',
  danger: 'var(--error-color, #f44336)',
  quiet: 'var(--secondary-text-color)',
};

/** One mutable working copy per scenario so edits survive variant switches. */
const working = new Map<string, ProtoScenario>();
export const protoRevision$ = atom(0);

export function scenarioFor(key: ScenarioKey, rows: number, cols: number): ProtoScenario {
  const id = `${key}:${rows}x${cols}`;
  let s = working.get(id);
  if (!s) {
    s = buildScenario(key, rows, cols);
    working.set(id, s);
  }
  return s;
}

export function touch(): void {
  protoRevision$.set(protoRevision$.get() + 1);
}
