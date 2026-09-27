/**
 * PROTOTYPE — growspace_manager#864. Throwaway; never merge.
 *
 * Three variants of the Irrigation Zone card surface, mounted inside the real
 * irrigation dialog and plant grid, switchable via `?variant=A|B|C` and
 * `?scenario=…` (see fixture.ts). Inert unless `?variant=` is in the URL and the
 * build is not production. The real dialog and grid call only these hooks.
 */
import { html, nothing, type TemplateResult } from 'lit';
import {
  mdiTableLarge,
  mdiTimelineClockOutline,
  mdiVectorSquare,
  mdiViewGridPlusOutline,
} from '@mdi/js';
import { needsAttention } from './fixture';
import { bind, protoActive, ui, world } from './store';
import { mountSwitcher } from './switcher';
import './variant-a';
import './variant-b';
import './variant-c';

export interface ProtoNavDef {
  id: string;
  label: string;
  group: string;
  icon: string;
  badge?: number;
}

export const zpActive = protoActive;

if (protoActive()) {
  if (document.body) mountSwitcher();
  else window.addEventListener('DOMContentLoaded', mountSwitcher);
}

/** Re-render the host whenever the prototype state changes. */
export function zpBind(host: { requestUpdate(): void }) {
  if (protoActive()) bind(host);
}

const insertAfter = <T extends { id: string }>(list: T[], afterId: string, item: T) => {
  const i = list.findIndex((n) => n.id === afterId);
  return i < 0 ? [...list, item] : [...list.slice(0, i + 1), item, ...list.slice(i + 1)];
};

/** The rail, with each variant's items spliced in. */
export function zpNav<T extends ProtoNavDef>(nav: T[]): T[] {
  if (!protoActive()) return nav;
  const w = world();
  if (w.implicit) return nav;
  const bad = w.zones.filter(needsAttention).length || undefined;
  switch (ui.variant) {
    case 'A':
      return insertAfter(nav, 'config', {
        id: 'zp_zones',
        label: 'Zones',
        group: 'Equipment',
        icon: mdiViewGridPlusOutline,
        badge: w.zones.length,
      } as T);
    case 'B':
      return [
        { id: 'zp_board', label: 'Board', group: 'Zones', icon: mdiTableLarge, badge: bad } as T,
        ...nav,
      ];
    case 'C':
      return insertAfter(
        [
          {
            id: 'zp_today',
            label: 'Today',
            group: 'Crop Steering',
            icon: mdiTimelineClockOutline,
            badge: bad,
          } as T,
          ...nav,
        ],
        'config',
        { id: 'zp_layout', label: 'Zone layout', group: 'Equipment', icon: mdiVectorSquare } as T
      );
  }
}

export const zpNavIds = (): string[] => zpNav([] as ProtoNavDef[]).map((n) => n.id);

/** Replaces (A) or joins (B) the growspace pill in the content header. */
export function zpHeader(pill: TemplateResult): TemplateResult {
  if (!protoActive() || world().implicit) return pill;
  if (ui.variant === 'A') return html`<zp-a-scope></zp-a-scope>`;
  if (ui.variant === 'B') return html`${pill}<zp-b-summary></zp-b-summary>`;
  return pill;
}

/** A whole tab owned by the prototype, or null for a real tab. */
export function zpTab(tab: string): TemplateResult | null {
  if (!protoActive()) return null;
  switch (tab) {
    case 'zp_zones':
      return html`<zp-a-zones></zp-a-zones>`;
    case 'zp_board':
      return html`<zp-b-board></zp-b-board>`;
    case 'zp_today':
      return html`<zp-c-today></zp-c-today>`;
    case 'zp_layout':
      return html`<zp-c-layout></zp-c-layout>`;
  }
  return null;
}

/** Rendered above a real tab's own content. */
export function zpTabTop(tab: string) {
  if (!protoActive()) return nothing;
  const w = world();
  if (tab === 'overview') {
    if (ui.variant === 'A') return html`<zp-a-overview></zp-a-overview>`;
    if (ui.variant === 'B') return html`<zp-b-deliveries></zp-b-deliveries>`;
    return html`<zp-c-overview></zp-c-overview>`;
  }
  if (tab === 'config' && ui.variant === 'A' && w.implicit) return html`<zp-a-split></zp-a-split>`;
  return nothing;
}

/** Decoration layered over one plant-grid cell on the main card. */
export function zpCell(row: number, col: number) {
  if (!protoActive() || ui.variant !== 'C') return nothing;
  return html`<zp-c-cell .cell=${`${row},${col}`}></zp-c-cell>`;
}
