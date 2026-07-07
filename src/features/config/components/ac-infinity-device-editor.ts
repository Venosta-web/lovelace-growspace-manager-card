/**
 * AC Infinity device editor — a shared, stateless render helper for the Config
 * Dialog's Climate and Humidity tabs (ADR-0022 in the integration).
 *
 * An AC Infinity port exposes no `fan`/`switch` entity; it is driven as a bundle
 * of a mode `select` + a speed `number`. This renders one bordered card per
 * configured bundle (mode picker, speed picker, on-speed 1–10) plus an add
 * button, and reports edits through `onChange` with the full new array. It owns
 * no state — the parent component dispatches the array into the Shared
 * Environment Draft, exactly like the plain entity multi-selects.
 */

import { html, nothing, type TemplateResult } from 'lit';
import type { AcInfinityDevice } from '../../../slices/growspace/schema';
import type { AcInfinityConflict } from './ac-infinity-conflict';
import type { PortDeviceOption } from '../viewmodels/ac-infinity-port-resolver';
import { renderPortPicker, renderDuplicateWarning } from './ac-infinity-port-picker';

export interface AcInfinityEditorProps {
  /** Section heading, e.g. "Exhaust Fan AC Infinity Devices". */
  label: string;
  devices: AcInfinityDevice[];
  /** `select.*` entities for the mode picker. */
  modeOptions: string[];
  /** `number.*` entities for the speed picker. */
  speedOptions: string[];
  /** Unique prefix so the per-card `<datalist>` ids don't collide across roles. */
  idPrefix: string;
  /**
   * Automated Mode Conflicts keyed by `mode_entity` — a port whose mode entity
   * is present here is in a self-running mode and gets a passive warning. Absent
   * key = no conflict (Off/On/unavailable/unknown). Optional so callers without
   * hass access render no warnings.
   */
  conflicts?: Record<string, AcInfinityConflict>;
  /**
   * Port Pre-fill (ADR-0028): the pickable `ac_infinity` port devices, shared
   * across the tab's roles. Omitted → no picker renders (existing manual flow).
   */
  portDevices?: PortDeviceOption[];
  /** The device each port derives from its saved `mode_entity`, parallel to `devices`. */
  portDeviceIds?: string[];
  /** Roles that failed to resolve on the last pick, per port index (inline warning). */
  prefillWarnings?: string[][];
  /** Picking a device for a port — the host resolves + fills + warns. */
  onPickDevice?: (index: number, deviceId: string) => void;
  /** Duplicate Port Warning message per port index ('' = none), naming the other role(s). */
  duplicateWarnings?: string[];
  onChange: (devices: AcInfinityDevice[]) => void;
}

/** The passive, non-blocking Automated Mode Conflict notice under a mode picker. */
function renderConflict(conflict: AcInfinityConflict | undefined): TemplateResult | typeof nothing {
  if (!conflict) return nothing;
  return html`
    <div
      class="ac-infinity-mode-conflict"
      role="alert"
      style="display:flex;gap:6px;margin-top:6px;padding:8px;font-size:0.75rem;line-height:1.35;border-radius:6px;color:var(--warning-color,#e6a700);background:rgba(230,167,0,0.10);border:1px solid rgba(230,167,0,0.35);"
    >
      <span aria-hidden="true">⚠</span>
      <span>
        <strong>${conflict.deviceName}</strong> is in <strong>${conflict.mode}</strong> mode. AC
        Infinity's own automation will keep overriding Growspace Manager. Set this port to Off or On
        in the AC Infinity app before GSM can control it.
      </span>
    </div>
  `;
}

function blankDevice(): AcInfinityDevice {
  return { mode_entity: '', speed_entity: '', on_speed: 10 };
}

/**
 * The picker's option list: the platform-filtered set, plus the device's own
 * currently-saved value (so an already-configured entity that no longer matches
 * the filter — e.g. the integration is unavailable — still renders selected
 * instead of blanking). Empty selection contributes nothing.
 */
export function optionsWithCurrent(options: string[], current: string): string[] {
  if (!current || options.includes(current)) return options;
  return [current, ...options];
}

export function renderAcInfinityDevices(p: AcInfinityEditorProps): TemplateResult {
  const { devices, onChange } = p;
  const update = (index: number, patch: Partial<AcInfinityDevice>): void =>
    onChange(devices.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  const remove = (index: number): void => onChange(devices.filter((_, i) => i !== index));
  const add = (): void => onChange([...devices, blankDevice()]);

  return html`
    <div class="ac-infinity-editor" style="position:relative;margin-top:12px;">
      <div
        class="ac-infinity-editor-label"
        style="font-size:0.75rem;color:var(--secondary-text-color);margin-bottom:8px;"
      >
        ${p.label}
      </div>
      ${devices.map((device, index) => {
        return html`
          <div
            class="ac-infinity-device detail-card"
            style="padding:12px;margin-bottom:8px;border:1px solid var(--divider-color,rgba(255,255,255,0.12));border-radius:8px;"
          >
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <span style="font-weight:500;">Port ${index + 1}</span>
              <span
                class="chip-remove"
                role="button"
                aria-label="Remove AC Infinity device"
                style="cursor:pointer;"
                @click=${() => remove(index)}
                >×</span
              >
            </div>
            ${renderPortPicker({
              portDevices: p.portDevices,
              selectedDeviceId: p.portDeviceIds?.[index] ?? '',
              warning: p.prefillWarnings?.[index],
              onPick: (deviceId) => p.onPickDevice?.(index, deviceId),
            })}
            <div style="margin-bottom:8px;">
              <md3-select
                label="Mode (select)"
                .value=${device.mode_entity}
                .options=${optionsWithCurrent(p.modeOptions, device.mode_entity)}
                @change=${(e: CustomEvent<string>) => update(index, { mode_entity: e.detail })}
              ></md3-select>
              ${renderConflict(p.conflicts?.[device.mode_entity])}
              ${renderDuplicateWarning(p.duplicateWarnings?.[index])}
            </div>
            <div style="margin-bottom:8px;">
              <md3-select
                label="Speed (number)"
                .value=${device.speed_entity}
                .options=${optionsWithCurrent(p.speedOptions, device.speed_entity)}
                @change=${(e: CustomEvent<string>) => update(index, { speed_entity: e.detail })}
              ></md3-select>
            </div>
            <md3-number-input
              label="On-speed (1–10)"
              .value=${device.on_speed}
              step="1"
              min="1"
              max="10"
              @change=${(e: CustomEvent) =>
                update(index, {
                  on_speed: Math.min(10, Math.max(1, Math.round(parseFloat(e.detail) || 1))),
                })}
            ></md3-number-input>
          </div>
        `;
      })}
      <button class="md3-button tonal" style="margin-top:4px;" @click=${add}>
        + Add AC Infinity device
      </button>
    </div>
  `;
}
