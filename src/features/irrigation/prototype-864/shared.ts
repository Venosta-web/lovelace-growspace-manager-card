/**
 * PROTOTYPE — growspace_manager#864. Data helpers shared by the variants.
 * Deliberately no shared layout: each variant owns its own.
 */

import { css, html, nothing, type TemplateResult } from 'lit';
import type { GrowspaceDevice } from '../../../services/types';
import {
  REASON_LABEL,
  cellKey,
  hhmm,
  type ProtoAttempt,
  type ProtoProbe,
  type ProtoScenario,
  type ProtoZone,
} from './state';

export interface CellInfo {
  r: number;
  c: number;
  key: string;
  zone: ProtoZone | undefined;
  plant: { name: string; strain: string } | null;
  probes: ProtoProbe[];
}

export function gridSize(device: GrowspaceDevice | undefined): { rows: number; cols: number } {
  return {
    rows: Math.max(1, Math.min(8, device?.rows ?? 4)),
    cols: Math.max(1, Math.min(8, device?.plantsPerRow ?? 5)),
  };
}

export function cells(s: ProtoScenario, device: GrowspaceDevice | undefined): CellInfo[][] {
  const { rows, cols } = gridSize(device);
  const plants = new Map<string, { name: string; strain: string }>();
  for (const p of device?.plants ?? []) {
    const a = p.attributes as Record<string, unknown>;
    const r = Number(a.row ?? 0) - 1;
    const c = Number(a.col ?? 0) - 1;
    if (r >= 0 && c >= 0) {
      plants.set(cellKey(r, c), {
        name: String(a.friendly_name ?? a.strain ?? ''),
        strain: String(a.strain ?? ''),
      });
    }
  }
  const zoneOf = new Map<string, ProtoZone>();
  for (const z of s.zones) for (const k of z.cells) zoneOf.set(k, z);
  const probesAt = new Map<string, ProtoProbe[]>();
  for (const z of s.zones)
    for (const p of z.probes)
      if (p.cell) {
        const k = cellKey(p.cell[0], p.cell[1]);
        probesAt.set(k, [...(probesAt.get(k) ?? []), p]);
      }
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const key = cellKey(r, c);
      return {
        r,
        c,
        key,
        zone: zoneOf.get(key),
        plant: plants.get(key) ?? null,
        probes: probesAt.get(key) ?? [],
      };
    })
  );
}

export function plantCount(z: ProtoZone, grid: CellInfo[][]): number {
  return grid.flat().filter((c) => c.zone?.id === z.id && c.plant).length;
}

export const cellLabel = (r: number, c: number): string => `${String.fromCharCode(65 + r)}${c + 1}`;

export function outcomeText(a: ProtoAttempt): string {
  switch (a.outcome) {
    case 'completed':
      return 'Delivered';
    case 'open':
      return 'Watering now';
    case 'aborted':
      return `Stopped early${a.reason ? ` — ${a.reason}` : ''}`;
    case 'suppressed':
      return `Not started — ${REASON_LABEL[a.reason ?? ''] ?? a.reason}`;
    case 'not_delivered':
      return `No water — ${a.reason ?? 'pump did not confirm ON'}`;
    case 'interrupted':
      return 'Interrupted by a restart';
  }
}

export function triggerText(a: ProtoAttempt): string {
  if (a.trigger === 'fallback') return 'Replay';
  if (a.trigger === 'manual') return 'Manual Run';
  if (a.trigger === 'schedule') return 'Schedule';
  return a.phase ? `${a.phase} shot` : 'Steering';
}

export function deliveredText(a: ProtoAttempt): string {
  if (a.outcome === 'suppressed' || a.outcome === 'not_delivered') return '—';
  const v = a.meteredL ?? a.estimatedL;
  if (v == null) return '…';
  const kind = a.meteredL != null ? 'metered' : 'est.';
  return `${v.toFixed(2)} L ${kind}`;
}

/** Short/over only exists for metered attempts, ±15 % with a 0.1 L floor (ADR-0064). */
export function meterVerdict(a: ProtoAttempt): 'short' | 'over' | null {
  if (a.meteredL == null || a.estimatedL == null || a.estimatedL < 0.1) return null;
  const r = a.meteredL / a.estimatedL;
  return r < 0.85 ? 'short' : r > 1.15 ? 'over' : null;
}

export function waitText(a: ProtoAttempt): string | null {
  const w = Math.round(a.requestedAt - a.dueAt);
  return w >= 1 ? `waited ${w} min` : null;
}

/** ADR-0055's four moments plus due_at, as one line each. */
export function lifecycle(a: ProtoAttempt): TemplateResult {
  const row = (label: string, v: number | undefined, note = '') =>
    v === undefined
      ? nothing
      : html`<div class="lc-row"><span>${label}</span><span>${hhmm(v)}${note}</span></div>`;
  return html`
    <div class="lc">
      ${row('Due (claim queued)', a.dueAt)} ${row('Requested at the gate', a.requestedAt)}
      ${row('Pump confirmed ON', a.onAt)}
      ${row('OFF read back', a.offAt, a.offReadBack === false ? ' (not read back)' : '')}
      <div class="lc-row">
        <span>Planned</span><span>${a.plannedS} s · ${a.plannedL.toFixed(2)} L</span>
      </div>
      <div class="lc-row"><span>Charged to cap</span><span>${a.chargedL.toFixed(2)} L</span></div>
      ${a.estimatedL != null
        ? html`<div class="lc-row">
            <span>Estimated (ON time × flow)</span><span>${a.estimatedL.toFixed(2)} L</span>
          </div>`
        : nothing}
      ${a.meteredL != null
        ? html`<div class="lc-row">
            <span>Metered</span
            ><span
              >${a.meteredL.toFixed(2)} L
              ${meterVerdict(a) ? html`<b>(${meterVerdict(a)})</b>` : nothing}</span
            >
          </div>`
        : nothing}
      ${a.vwcBefore != null
        ? html`<div class="lc-row"><span>Triggered at</span><span>${a.vwcBefore}% VWC</span></div>`
        : nothing}
      ${a.replayOf
        ? html`<div class="lc-row"><span>Replays</span><span>${a.replayOf} at 80%</span></div>`
        : nothing}
    </div>
  `;
}

export const protoBaseStyles = css`
  :host {
    display: block;
    color: var(--primary-text-color);
    font-size: 14px;
  }
  .proto-note {
    font-size: 11px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--secondary-text-color);
    opacity: 0.8;
    margin: 0 0 12px;
  }
  .lc {
    display: grid;
    gap: 2px;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }
  .lc-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    color: var(--secondary-text-color);
  }
  .lc-row span:last-child {
    color: var(--primary-text-color);
  }
  button.lnk {
    background: none;
    border: none;
    color: var(--gm-info-color, #2196f3);
    cursor: pointer;
    padding: 0;
    font: inherit;
    text-decoration: underline;
  }
  button.btn {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
    color: var(--primary-text-color);
    border-radius: 16px;
    padding: 5px 12px;
    cursor: pointer;
    font: inherit;
    font-size: 13px;
  }
  button.btn.primary {
    background: var(--gm-info-color, #2196f3);
    border-color: transparent;
    color: #fff;
  }
  button.btn[aria-pressed='true'] {
    background: rgba(33, 150, 243, 0.25);
    border-color: var(--gm-info-color, #2196f3);
  }
  .dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  select,
  input[type='text'] {
    background: rgba(255, 255, 255, 0.06);
    color: var(--primary-text-color);
    border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.15));
    border-radius: 6px;
    padding: 4px 6px;
    font: inherit;
    font-size: 13px;
  }
`;

// ─── In-memory edits (stubs for the real zone services) ─────────────────────
// The refusals mirror ADR-0057 (a valve per zone once there are two), ADR-0058
// (a valve belongs to one zone), ADR-0059 (one control probe) and ADR-0060
// (6 zones, 8 valves, 4 probes of a quantity: `envelope_exceeded`).

export const ENVELOPE = { zones: 6, valves: 8, probes: 4 };

export function assignCell(s: ProtoScenario, key: string, zoneId: string): void {
  for (const z of s.zones) z.cells = z.cells.filter((k) => k !== key);
  s.zones.find((z) => z.id === zoneId)?.cells.push(key);
}

export function addZone(s: ProtoScenario): string | ProtoZone {
  if (s.zones.length >= ENVELOPE.zones)
    return `envelope_exceeded: a growspace holds at most ${ENVELOPE.zones} zones`;
  const n = s.zones.length + 1;
  const used = new Set(s.zones.map((z) => z.color));
  const color =
    ['#4fc3f7', '#ffb74d', '#ba68c8', '#81c784', '#f06292', '#e0e0e0'].find((c) => !used.has(c)) ??
    '#e0e0e0';
  const z: ProtoZone = {
    id: `z${Date.now() % 100000}`,
    name: `Zone ${n}`,
    color,
    cells: [],
    valves: [],
    probes: [],
    state: 'idle',
    phase: null,
    vwc: null,
    target: 55,
    trigger: 48,
    calibration: 'unverified',
    calibrationEvidence: 0,
    meter: null,
    recipe: '—',
    degradedFallback: 'hold',
  };
  s.zones.push(z);
  return z;
}

export function removeZone(s: ProtoScenario, id: string): string | null {
  if (s.zones.length <= 1) return 'The last zone cannot be removed.';
  const z = s.zones.find((x) => x.id === id);
  if (!z) return null;
  s.zones = s.zones.filter((x) => x.id !== id);
  s.zones[0].cells.push(...z.cells);
  return `${z.name}'s ${z.cells.length} cells went to ${s.zones[0].name}.`;
}

export function toggleValve(s: ProtoScenario, zoneId: string, valve: string): string | null {
  const z = s.zones.find((x) => x.id === zoneId)!;
  if (z.valves.includes(valve)) {
    z.valves = z.valves.filter((v) => v !== valve);
    return null;
  }
  const owner = s.zones.find((x) => x.valves.includes(valve));
  if (owner) return `${valve} already opens ${owner.name}; a valve belongs to one zone.`;
  if (z.valves.length >= ENVELOPE.valves)
    return `envelope_exceeded: at most ${ENVELOPE.valves} valves per zone`;
  z.valves.push(valve);
  return null;
}

export function placeProbe(
  s: ProtoScenario,
  zoneId: string,
  entity: string,
  cell: [number, number] | null
): string | null {
  const z = s.zones.find((x) => x.id === zoneId)!;
  for (const other of s.zones) other.probes = other.probes.filter((p) => p.entity !== entity);
  if (z.probes.length >= ENVELOPE.probes)
    return `envelope_exceeded: at most ${ENVELOPE.probes} moisture probes per zone`;
  z.probes.push({
    entity,
    name: entity.replace('sensor.', ''),
    role: z.probes.some((p) => p.role === 'control') ? 'witness' : 'control',
    cell,
    health: 'ok',
    vwc: 50,
    offset: null,
  });
  return null;
}

export function makeControl(s: ProtoScenario, zoneId: string, entity: string): void {
  const z = s.zones.find((x) => x.id === zoneId)!;
  for (const p of z.probes) p.role = p.entity === entity ? 'control' : 'witness';
}

export function removeProbe(s: ProtoScenario, zoneId: string, entity: string): void {
  const z = s.zones.find((x) => x.id === zoneId)!;
  const wasControl = z.probes.find((p) => p.entity === entity)?.role === 'control';
  z.probes = z.probes.filter((p) => p.entity !== entity);
  if (wasControl && z.probes[0]) z.probes[0].role = 'control';
}

/** What a save would be refused for, before it is sent. */
export function saveProblems(s: ProtoScenario): string[] {
  const out: string[] = [];
  if (s.zones.length >= 2) {
    for (const z of s.zones)
      if (z.valves.length === 0)
        out.push(`${z.name} needs a valve — with two or more zones, every zone opens its own.`);
  }
  for (const z of s.zones) if (z.cells.length === 0) out.push(`${z.name} owns no cells.`);
  return out;
}

export function saveZones(s: ProtoScenario, conflict: boolean): { ok: boolean; message: string } {
  if (conflict) {
    return {
      ok: false,
      message: `The layout changed since you opened the editor (revision ${s.layoutRevision} → ${s.layoutRevision + 1}: a plant was moved). Nothing was saved — reload to see the new layout, then redo the zone edit.`,
    };
  }
  const problems = saveProblems(s);
  if (problems.length) return { ok: false, message: problems.join(' ') };
  s.layoutRevision += 1;
  return { ok: true, message: `Saved as layout revision ${s.layoutRevision}.` };
}
