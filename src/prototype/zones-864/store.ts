/**
 * PROTOTYPE — growspace_manager#864. Throwaway; never merge.
 *
 * In-memory state shared by every prototype hook. `?variant=` and `?scenario=`
 * are mirrored into the URL so a variant is shareable and reload-stable;
 * everything else (edits, selection) resets on reload by design.
 */
import { buildWorld, type ProtoWorld, type ProtoZone, type Scenario, ZONE_COLORS } from './fixture';

export type Variant = 'A' | 'B' | 'C';
export const VARIANTS: { key: Variant; label: string }[] = [
  { key: 'A', label: 'Zone scope switcher' },
  { key: 'B', label: 'Zone board' },
  { key: 'C', label: 'Map + day timeline' },
];

const params = () => new URLSearchParams(window.location.search);

// Rollup's replace plugin rewrites this token at build time.
declare const process: { env: { NODE_ENV?: string } };
export const protoActive = (): boolean =>
  process.env.NODE_ENV !== 'production' && params().has('variant');

interface UiState {
  variant: Variant;
  scenario: Scenario;
  scope: string; // 'tent' | zone id
  expanded: Set<string>;
  editing: boolean;
  brush: string;
  selectedAttempt: string | null;
  cells: Record<string, string>;
  names: Record<string, string>;
  extraZones: ProtoZone[];
  toast: string | null;
  conflict: boolean;
  savedRevision: number;
  pickedProbe: string | null;
}

const initialVariant = (): Variant => {
  const v = params().get('variant')?.toUpperCase();
  return v === 'B' || v === 'C' ? v : 'A';
};
const initialScenario = (): Scenario => (params().get('scenario') as Scenario) || 'multi';

export const ui: UiState = {
  variant: initialVariant(),
  scenario: initialScenario(),
  scope: 'tent',
  expanded: new Set(),
  editing: false,
  brush: 'default',
  selectedAttempt: null,
  cells: {},
  names: {},
  extraZones: [],
  toast: null,
  conflict: false,
  savedRevision: 12,
  pickedProbe: null,
};

const hosts = new Set<{ requestUpdate(): void }>();
export function bind(host: { requestUpdate(): void }) {
  hosts.add(host);
}

let cached: ProtoWorld | null = null;
export function world(): ProtoWorld {
  if (!cached) {
    cached = buildWorld(ui.scenario, {
      cells: Object.keys(ui.cells).length ? ui.cells : undefined,
      names: ui.names,
      extraZones: ui.extraZones,
    });
  }
  return cached;
}

export function set(patch: Partial<UiState>) {
  Object.assign(ui, patch);
  cached = null;
  const p = params();
  p.set('variant', ui.variant);
  p.set('scenario', ui.scenario);
  history.replaceState(null, '', `${window.location.pathname}?${p.toString()}`);
  for (const h of hosts) h.requestUpdate();
  window.dispatchEvent(new CustomEvent('zp-change'));
}

export function toast(text: string) {
  set({ toast: text });
  window.setTimeout(() => {
    if (ui.toast === text) set({ toast: null });
  }, 3500);
}

export const ENVELOPE_MAX_ZONES = 6;

export function addZone() {
  const w = world();
  if (w.zones.length >= ENVELOPE_MAX_ZONES) {
    toast(`envelope_exceeded — a growspace holds at most ${ENVELOPE_MAX_ZONES} zones (ADR-0060).`);
    return;
  }
  const n = w.zones.length + 1;
  const z: ProtoZone = {
    id: `new${n}`,
    name: `Zone ${n}`,
    color: ZONE_COLORS[(n - 1) % ZONE_COLORS.length],
    cells: [],
    valves: [],
    probes: [],
    phase: 'P0',
    vwc: null,
    targetVwc: 60,
    status: 'steering',
    calibration: 'Unverified',
    flowMlPerSec: 0,
  };
  set({ extraZones: [...ui.extraZones, z], brush: z.id });
}

export function assignCell(cell: string, zoneId: string) {
  const current = { ...ui.cells };
  // Seed the explicit map from the world the first time, so edits compose.
  if (!Object.keys(current).length) {
    for (const z of world().zones) for (const c of z.cells) current[c] = z.id;
  }
  current[cell] = zoneId;
  set({ cells: current });
}

export function saveLayout() {
  if (ui.conflict) {
    toast(
      'layout_revision_conflict — the layout changed on another device (rev 13). Reload to see it.'
    );
    return;
  }
  set({ savedRevision: ui.savedRevision + 1, editing: false });
  toast(`Zones saved · layout revision ${ui.savedRevision}`);
}
