/**
 * Shared Port Pre-fill picker (ADR-0028), used by both the actuator editor
 * (`renderAcInfinityDevices`) and the grow-light editor
 * (`renderGrowlightAcInfinityDevices`). Renders the device `<md3-select>` that
 * pre-fills a port's bundle plus the inline warning naming any role a pick
 * failed to resolve. Stateless render helper — the host owns the resolve/fill.
 */

import { html, nothing, type TemplateResult } from 'lit';
import type { PortDeviceOption } from '../viewmodels/ac-infinity-port-resolver';
import '../../shared/ui/md3-select';

export interface PortPickerProps {
  /** The pickable port devices for this tab; omitted/empty → no picker renders. */
  portDevices?: PortDeviceOption[];
  /** The device this port derives from its saved mode entity (picker value on reopen). */
  selectedDeviceId: string;
  /** Roles the last pick failed to resolve — named in the inline warning. */
  warning?: string[];
  onPick: (deviceId: string) => void;
}

/** The inline notice naming the roles a pick failed to resolve. */
function renderPrefillWarning(missing: string[] | undefined): TemplateResult | typeof nothing {
  if (!missing || missing.length === 0) return nothing;
  return html`
    <div
      class="ac-infinity-prefill-warning"
      role="alert"
      style="display:flex;gap:6px;margin-top:6px;padding:8px;font-size:0.75rem;line-height:1.35;border-radius: var(--border-radius-sm, 8px);color:var(--warning-color,#e6a700);background:rgba(230,167,0,0.10);border:1px solid rgba(230,167,0,0.35);"
    >
      <span aria-hidden="true">⚠</span>
      <span>No ${missing.join(' or ')} entity found on this device — cleared it; pick manually below.</span>
    </div>
  `;
}

/**
 * The passive Duplicate Port Warning (ADR-0028) under a mode picker — same
 * visual conventions as the Automated Mode Conflict. `''`/undefined → nothing.
 */
export function renderDuplicateWarning(
  message: string | undefined
): TemplateResult | typeof nothing {
  if (!message) return nothing;
  return html`
    <div
      class="ac-infinity-duplicate-warning"
      role="alert"
      style="display:flex;gap:6px;margin-top:6px;padding:8px;font-size:0.75rem;line-height:1.35;border-radius: var(--border-radius-sm, 8px);color:var(--warning-color,#e6a700);background:rgba(230,167,0,0.10);border:1px solid rgba(230,167,0,0.35);"
    >
      <span aria-hidden="true">⚠</span>
      <span>${message}</span>
    </div>
  `;
}

/** The device picker that pre-fills a port's bundle. Omitted when no port list is supplied. */
export function renderPortPicker(p: PortPickerProps): TemplateResult | typeof nothing {
  if (!p.portDevices || p.portDevices.length === 0) return nothing;
  return html`
    <div style="margin-bottom:8px;">
      <md3-select
        label="AC Infinity device"
        .value=${p.selectedDeviceId}
        .options=${p.portDevices.map((d) => ({ label: d.label, value: d.id }))}
        @change=${(e: CustomEvent<string>) => p.onPick(e.detail)}
      ></md3-select>
      ${renderPrefillWarning(p.warning)}
    </div>
  `;
}
