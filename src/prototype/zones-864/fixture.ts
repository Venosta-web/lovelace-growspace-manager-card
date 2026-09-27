/**
 * PROTOTYPE — growspace_manager#864. Throwaway; never merge.
 *
 * Synthetic Irrigation Zone data layered over the demo tent's real 4×5 grid.
 * Nothing here comes from the backend: the zone payload does not exist yet
 * (ADR-0057..0065). Shapes follow the ADRs closely enough to judge a layout.
 */

export type Scenario =
  | 'single'
  | 'single-unresponsive'
  | 'multi'
  | 'multi-degraded'
  | 'multi-fallback'
  | 'multi-capped';

export const SCENARIOS: { key: Scenario; label: string }[] = [
  { key: 'single', label: '1 zone · normal day' },
  { key: 'single-unresponsive', label: '1 zone · probe_unresponsive' },
  { key: 'multi', label: '3 zones · normal day' },
  { key: 'multi-degraded', label: '3 zones · degraded + substituting' },
  { key: 'multi-fallback', label: '3 zones · replay fallback' },
  { key: 'multi-capped', label: '3 zones · daily cap reached' },
];

export type Health = 'ok' | 'stale' | 'unresponsive' | 'implausible';
export type ZoneStatus =
  | 'steering'
  | 'running'
  | 'queued'
  | 'substituting'
  | 'degraded'
  | 'fallback';
export type Outcome = 'completed' | 'suppressed' | 'aborted' | 'running' | 'queued';
export type Trigger = 'steering' | 'manual' | 'fallback';

export interface ProtoProbe {
  entity: string;
  name: string;
  role: 'control' | 'witness';
  cell: string; // "r,c"
  vwc: number | null;
  health: Health;
  substituting?: boolean;
}

export interface ProtoValve {
  entity: string;
  name: string;
}

export interface ProtoZone {
  id: string;
  name: string;
  color: string;
  cells: string[];
  valves: ProtoValve[];
  probes: ProtoProbe[];
  phase: 'P0' | 'P1' | 'P2' | 'P3';
  vwc: number | null;
  targetVwc: number;
  status: ZoneStatus;
  cause?: string;
  since?: number; // minute of day
  referenceDay?: string;
  replayLeft?: number;
  calibration: 'Unverified' | 'Verified' | 'Disputed';
  recipe?: { name: string; revision: number; latest: number; drifted: boolean };
  flowMlPerSec: number;
}

export interface ProtoAttempt {
  id: string;
  zoneId: string;
  at: number; // minute of day the gate decided (or now for queued)
  dueAt?: number; // when the Supply Claim was made, if it waited
  trigger: Trigger;
  phase?: 'P1' | 'P2';
  plannedS: number;
  chargedL: number;
  estimatedL: number;
  meteredL?: number;
  outcome: Outcome;
  reason?: string;
}

export interface ProtoWorld {
  scenario: Scenario;
  implicit: boolean;
  zones: ProtoZone[];
  attempts: ProtoAttempt[];
  supply: { entity: string; name: string; openZone: string | null };
  queue: { zoneId: string; dueAt: number }[];
  cap: { liters: number; capL: number; cycles: number; maxCycles: number; cappedAt?: number };
  now: number;
  lightsOn: number;
  lightsOff: number;
  p2Stop: number;
  rows: number;
  cols: number;
  plants: Record<string, string>; // "r,c" -> strain
  layoutRevision: number;
}

export const DEMO_PLANTS: Record<string, string> = {
  '1,1': 'Wedding Cake',
  '1,2': 'Gelato 33',
  '1,3': 'Gorilla Glue #4',
  '1,4': 'Wedding Cake',
  '1,5': 'Zkittlez',
  '2,1': 'Blue Dream',
  '2,2': 'Northern Lights',
  '2,3': 'Purple Punch',
  '2,4': 'Blue Dream',
  '2,5': 'OG Kush',
  '3,1': 'Bruce Banner',
  '3,2': 'White Widow',
  '3,3': 'Sour Diesel',
  '3,4': 'Amnesia Haze',
  '4,1': 'Gelato 33',
  '4,2': 'Zkittlez',
  '4,3': 'Wedding Cake',
};

export const ZONE_COLORS = ['#26a69a', '#ffa726', '#ab47bc', '#42a5f5', '#ef5350', '#d4e157'];

/** Every entity a picker may offer — fake but plausible. */
export const VALVE_CHOICES: ProtoValve[] = [
  { entity: 'switch.zone_valve_1', name: 'Valve 1' },
  { entity: 'switch.zone_valve_2', name: 'Valve 2' },
  { entity: 'switch.zone_valve_3a', name: 'Valve 3A' },
  { entity: 'switch.zone_valve_3b', name: 'Valve 3B' },
  { entity: 'switch.zone_valve_spare', name: 'Spare valve' },
];
export const PROBE_CHOICES = [
  { entity: 'sensor.teros_a_vwc', name: 'TEROS A' },
  { entity: 'sensor.teros_b_vwc', name: 'TEROS B' },
  { entity: 'sensor.teros_c_vwc', name: 'TEROS C' },
  { entity: 'sensor.teros_d_vwc', name: 'TEROS D' },
  { entity: 'sensor.teros_e_vwc', name: 'TEROS E' },
  { entity: 'sensor.teros_f_vwc', name: 'TEROS F' },
];

export const hm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`;

const ROWS = 4;
const COLS = 5;
const NOW = 14 * 60 + 20;
const LIGHTS_ON = 6 * 60;
const LIGHTS_OFF = 18 * 60;
const P2_STOP = 16 * 60;

const allCells = () => {
  const out: string[] = [];
  for (let r = 1; r <= ROWS; r++) for (let c = 1; c <= COLS; c++) out.push(`${r},${c}`);
  return out;
};

function baseZones(): ProtoZone[] {
  return [
    {
      id: 'default',
      name: 'Late flower',
      color: ZONE_COLORS[0],
      cells: ['1,1', '1,2', '1,3', '1,4', '1,5'],
      valves: [VALVE_CHOICES[0]],
      probes: [
        { ...probe(0), role: 'control', cell: '1,3', vwc: 58.2, health: 'ok' },
        { ...probe(1), role: 'witness', cell: '1,1', vwc: 56.9, health: 'ok' },
      ],
      phase: 'P2',
      vwc: 58.2,
      targetVwc: 60,
      status: 'steering',
      calibration: 'Verified',
      recipe: { name: 'Late flower · coco 11 L', revision: 3, latest: 3, drifted: false },
      flowMlPerSec: 32,
    },
    {
      id: 'z2',
      name: 'Mid flower',
      color: ZONE_COLORS[1],
      cells: ['2,1', '2,2', '2,3', '2,4', '2,5'],
      valves: [VALVE_CHOICES[1]],
      probes: [
        { ...probe(2), role: 'control', cell: '2,3', vwc: 61.4, health: 'ok' },
        { ...probe(3), role: 'witness', cell: '2,5', vwc: 60.1, health: 'ok' },
      ],
      phase: 'P2',
      vwc: 61.4,
      targetVwc: 62,
      status: 'steering',
      calibration: 'Unverified',
      recipe: { name: 'Late flower · coco 11 L', revision: 2, latest: 3, drifted: false },
      flowMlPerSec: 32,
    },
    {
      id: 'z3',
      name: 'Early flower',
      color: ZONE_COLORS[2],
      cells: ['3,1', '3,2', '3,3', '3,4', '3,5', '4,1', '4,2', '4,3', '4,4', '4,5'],
      valves: [VALVE_CHOICES[2], VALVE_CHOICES[3]],
      probes: [{ ...probe(4), role: 'control', cell: '3,2', vwc: 64.8, health: 'ok' }],
      phase: 'P2',
      vwc: 64.8,
      targetVwc: 65,
      status: 'steering',
      calibration: 'Disputed',
      recipe: { name: 'Early flower · generative', revision: 1, latest: 1, drifted: true },
      flowMlPerSec: 58,
    },
  ];
}

function probe(i: number) {
  return { entity: PROBE_CHOICES[i].entity, name: PROBE_CHOICES[i].name };
}

/** Shots across the lit day for one zone: P1 ramp, then sparse P2. */
function dayShots(z: ProtoZone, plants: number, offset: number, until: number): ProtoAttempt[] {
  const out: ProtoAttempt[] = [];
  const shotL = +(plants * 0.16).toFixed(2);
  const plannedS = Math.round((shotL * 1000) / z.flowMlPerSec);
  let n = 0;
  const push = (at: number, phase: 'P1' | 'P2') => {
    if (at > until) return;
    out.push({
      id: `${z.id}-${n++}`,
      zoneId: z.id,
      at,
      trigger: 'steering',
      phase,
      plannedS,
      chargedL: shotL,
      estimatedL: +(shotL * 0.97).toFixed(2),
      meteredL:
        z.calibration === 'Unverified'
          ? undefined
          : +(shotL * (z.calibration === 'Disputed' ? 0.78 : 1.02)).toFixed(2),
      outcome: 'completed',
    });
  };
  for (let i = 0; i < 6; i++) push(LIGHTS_ON + 60 + offset + i * 15, 'P1');
  for (const t of [11 * 60 + 40, 12 * 60 + 55, 13 * 60 + 50]) push(t + offset, 'P2');
  return out;
}

function plantsIn(cells: string[]) {
  return cells.filter((c) => DEMO_PLANTS[c]).length;
}

export function buildWorld(
  scenario: Scenario,
  edits: {
    cells?: Record<string, string>;
    names?: Record<string, string>;
    extraZones?: ProtoZone[];
  }
): ProtoWorld {
  const implicit = scenario.startsWith('single');
  let zones = baseZones();
  if (implicit) {
    const z = zones[0];
    zones = [
      {
        ...z,
        id: 'default',
        name: 'Zone 1',
        cells: allCells(),
        valves: [],
        probes: [{ ...probe(0), role: 'control', cell: '2,3', vwc: 59.6, health: 'ok' }],
        recipe: { name: 'Late flower · coco 11 L', revision: 3, latest: 3, drifted: false },
      },
    ];
  } else if (edits.extraZones) {
    zones = [...zones, ...edits.extraZones];
  }

  // Apply grower edits (cell assignment, names) from the editors.
  if (!implicit && edits.cells) {
    for (const z of zones) z.cells = [];
    for (const cell of allCells()) {
      const owner = edits.cells[cell] ?? baseOwner(cell);
      (zones.find((z) => z.id === owner) ?? zones[0]).cells.push(cell);
    }
  }
  if (edits.names) for (const z of zones) if (edits.names[z.id]) z.name = edits.names[z.id];

  let attempts: ProtoAttempt[] = [];
  zones.forEach((z, i) => {
    attempts.push(...dayShots(z, Math.max(1, plantsIn(z.cells)), i * 2, NOW));
  });

  const queue: { zoneId: string; dueAt: number }[] = [];
  let openZone: string | null = null;
  const cap = {
    liters: 0,
    capL: implicit ? 16 : 40,
    cycles: 0,
    maxCycles: 60,
    cappedAt: undefined as number | undefined,
  };

  const findZone = (id: string) => zones.find((z) => z.id === id)!;

  if (!implicit) {
    // A queued claim that waited, and a Manual Run that jumped the queue.
    attempts.push({
      id: 'z2-wait',
      zoneId: 'z2',
      at: 13 * 60 + 52,
      dueAt: 13 * 60 + 50,
      trigger: 'steering',
      phase: 'P2',
      plannedS: 25,
      chargedL: 0.8,
      estimatedL: 0.78,
      outcome: 'completed',
    });
    attempts.push({
      id: 'z3-manual',
      zoneId: 'z3',
      at: 10 * 60 + 5,
      trigger: 'manual',
      plannedS: 30,
      chargedL: 1.74,
      estimatedL: 1.7,
      outcome: 'completed',
    });
    attempts.push({
      id: 'z1-abort',
      zoneId: 'default',
      at: 12 * 60 + 20,
      trigger: 'steering',
      phase: 'P2',
      plannedS: 25,
      chargedL: 0.8,
      estimatedL: 0.21,
      outcome: 'aborted',
      reason: 'emergency_stop',
    });
    // Live now: Zone 1 running, Zone 3 waiting behind it.
    attempts.push({
      id: 'z1-now',
      zoneId: 'default',
      at: NOW - 0.5,
      trigger: 'steering',
      phase: 'P2',
      plannedS: 25,
      chargedL: 0.8,
      estimatedL: 0.4,
      outcome: 'running',
    });
    openZone = 'default';
    findZone('default').status = 'running';
    queue.push({ zoneId: 'z3', dueAt: NOW - 0.2 });
    attempts.push({
      id: 'z3-q',
      zoneId: 'z3',
      at: NOW,
      dueAt: NOW - 0.2,
      trigger: 'steering',
      phase: 'P2',
      plannedS: 30,
      chargedL: 1.74,
      estimatedL: 0,
      outcome: 'queued',
    });
    findZone('z3').status = 'queued';
  } else {
    attempts.push({
      id: 'd-sup',
      zoneId: 'default',
      at: 12 * 60 + 5,
      trigger: 'steering',
      phase: 'P2',
      plannedS: 40,
      chargedL: 0,
      estimatedL: 0,
      outcome: 'suppressed',
      reason: 'tank_low',
    });
  }

  if (scenario === 'single-unresponsive') {
    const z = zones[0];
    z.status = 'degraded';
    z.cause = 'probe_unresponsive';
    z.since = 10 * 60 + 45;
    z.probes[0].health = 'unresponsive';
    z.probes[0].vwc = 52.1;
    z.vwc = 52.1;
    z.phase = 'P1';
    z.referenceDay = '25 Sep';
    attempts = attempts.filter((a) => a.at <= 10 * 60 + 45);
  }

  if (scenario === 'multi-degraded') {
    const z2 = findZone('z2');
    z2.status = 'degraded';
    z2.cause = 'sensor_stale';
    z2.since = 9 * 60 + 10;
    z2.probes[0].health = 'stale';
    z2.probes[0].vwc = null;
    z2.probes[1].health = 'stale';
    z2.probes[1].vwc = null;
    z2.vwc = null;
    z2.referenceDay = '25 Sep';
    attempts = attempts.filter((a) => a.zoneId !== 'z2' || a.at <= z2.since!);
    const z1 = findZone('default');
    z1.status = openZone === 'default' ? 'running' : 'substituting';
    z1.cause = 'sensor_implausible';
    z1.since = 11 * 60;
    z1.probes[0].health = 'implausible';
    z1.probes[0].vwc = 99.9;
    z1.probes[1].substituting = true;
    z1.vwc = 57.4;
  }

  if (scenario === 'multi-fallback') {
    const z2 = findZone('z2');
    z2.status = 'fallback';
    z2.cause = 'sensor_stale';
    z2.since = 9 * 60 + 10;
    z2.referenceDay = '25 Sep';
    z2.replayLeft = 2;
    z2.probes[0].health = 'stale';
    z2.probes[0].vwc = null;
    z2.probes[1].health = 'stale';
    z2.probes[1].vwc = null;
    z2.vwc = null;
    attempts = attempts.filter((a) => a.zoneId !== 'z2' || a.at <= z2.since!);
    let k = 0;
    for (const t of [9 * 60 + 40, 11 * 60 + 35, 12 * 60 + 50, 13 * 60 + 58]) {
      attempts.push({
        id: `z2-fb-${k++}`,
        zoneId: 'z2',
        at: t,
        trigger: 'fallback',
        phase: 'P2',
        plannedS: 20,
        chargedL: 0.64,
        estimatedL: 0.63,
        outcome: 'completed',
      });
    }
  }

  attempts.sort((a, b) => a.at - b.at);

  if (scenario === 'multi-capped') cap.capL = 20;
  for (const a of attempts) {
    if (a.outcome === 'queued' || a.outcome === 'suppressed') continue;
    if (cap.cappedAt !== undefined) {
      a.outcome = 'suppressed';
      a.reason = 'daily_volume_cap';
      continue;
    }
    cap.liters += a.chargedL;
    cap.cycles += 1;
    if (cap.liters >= cap.capL) cap.cappedAt = a.at;
  }
  if (cap.cappedAt !== undefined) {
    // The queue is empty and nothing is running once the cap is reached.
    openZone = null;
    queue.length = 0;
    attempts = attempts.filter((a) => a.outcome !== 'queued');
    for (const a of attempts)
      if (a.outcome === 'running') {
        a.outcome = 'suppressed';
        a.reason = 'daily_volume_cap';
      }
    for (const z of zones)
      if (z.status === 'running' || z.status === 'queued') z.status = 'steering';
  }
  cap.liters = +cap.liters.toFixed(2);

  return {
    scenario,
    implicit,
    zones,
    attempts,
    supply: { entity: 'switch.sim_demo_room_irrigation_pump', name: 'Irrigation pump', openZone },
    queue,
    cap,
    now: NOW,
    lightsOn: LIGHTS_ON,
    lightsOff: LIGHTS_OFF,
    p2Stop: P2_STOP,
    rows: ROWS,
    cols: COLS,
    plants: DEMO_PLANTS,
    layoutRevision: 12,
  };
}

function baseOwner(cell: string) {
  const r = Number(cell.split(',')[0]);
  return r === 1 ? 'default' : r === 2 ? 'z2' : 'z3';
}

export const zoneOf = (w: ProtoWorld, cell: string) => w.zones.find((z) => z.cells.includes(cell));

export const REASON_TEXT: Record<string, string> = {
  daily_volume_cap: 'Daily volume cap reached',
  max_cycles: 'Daily cycle limit reached',
  tank_low: 'Feed tank below minimum',
  emergency_stop: 'Stopped by emergency stop',
  foreign_valve_open: 'Another zone’s valve read open',
};

export const CAUSE_TEXT: Record<string, string> = {
  sensor_stale: 'Probe stopped reporting',
  sensor_implausible: 'Probe reading implausible',
  sensor_unavailable: 'Probe unavailable',
  probe_unresponsive: 'Probe did not respond to 3 shots',
};

export const STATUS_TEXT: Record<ZoneStatus, string> = {
  steering: 'Steering',
  running: 'Watering now',
  queued: 'Waiting for pump',
  substituting: 'Steering on witness',
  degraded: 'Holding — no trustworthy probe',
  fallback: 'Replaying a clean day',
};

export const needsAttention = (z: ProtoZone) =>
  z.status === 'degraded' ||
  z.status === 'fallback' ||
  z.status === 'substituting' ||
  z.cause !== undefined;
