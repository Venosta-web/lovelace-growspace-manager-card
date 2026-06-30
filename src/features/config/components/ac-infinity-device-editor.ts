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

import { html, type TemplateResult } from 'lit';
import type { AcInfinityDevice } from '../../../slices/growspace/schema';

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
  onChange: (devices: AcInfinityDevice[]) => void;
}

function blankDevice(): AcInfinityDevice {
  return { mode_entity: '', speed_entity: '', on_speed: 10 };
}

export function renderAcInfinityDevices(p: AcInfinityEditorProps): TemplateResult {
  const { devices, onChange } = p;
  const update = (index: number, patch: Partial<AcInfinityDevice>): void =>
    onChange(devices.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  const remove = (index: number): void => onChange(devices.filter((_, i) => i !== index));
  const add = (): void => onChange([...devices, blankDevice()]);

  return html`
    <div class="ac-infinity-editor" style="margin-top:12px;">
      <label class="md3-label-multi">${p.label}</label>
      ${devices.map((device, index) => {
        const modeListId = `aci-mode-${p.idPrefix}-${index}`;
        const speedListId = `aci-speed-${p.idPrefix}-${index}`;
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
            <div class="multi-select-container" style="margin-bottom:8px;">
              <label class="md3-label-multi">Mode (select)</label>
              <input
                class="search-input-inner"
                list="${modeListId}"
                .value=${device.mode_entity}
                placeholder="select.…"
                @change=${(e: Event) =>
                  update(index, { mode_entity: (e.target as HTMLInputElement).value })}
              />
              <datalist id="${modeListId}">
                ${p.modeOptions.map((eid) => html`<option value="${eid}"></option>`)}
              </datalist>
            </div>
            <div class="multi-select-container" style="margin-bottom:8px;">
              <label class="md3-label-multi">Speed (number)</label>
              <input
                class="search-input-inner"
                list="${speedListId}"
                .value=${device.speed_entity}
                placeholder="number.…"
                @change=${(e: Event) =>
                  update(index, { speed_entity: (e.target as HTMLInputElement).value })}
              />
              <datalist id="${speedListId}">
                ${p.speedOptions.map((eid) => html`<option value="${eid}"></option>`)}
              </datalist>
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
