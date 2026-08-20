/**
 * AC Infinity Grow Light editor (ADR-0024).
 *
 * The grow light is a *configurator*, not the On/Off actuator the fan editor
 * drives — so this is a distinct editor over a different entity set: the Active
 * Mode select, the on/off schedule `time` entities, the `on_power` number, and
 * the native sunrise switch + duration number. Pure render function (no state),
 * mirroring `renderAcInfinityDevices`.
 */

import { html, type TemplateResult } from 'lit';
import type { AcInfinityGrowLight } from '../../../slices/growspace/schema';
import { optionsWithCurrent } from './ac-infinity-device-editor';
import { renderPortPicker, renderDuplicateWarning } from './ac-infinity-port-picker';
import type { PortDeviceOption } from '../viewmodels/ac-infinity-port-resolver';
import '../../shared/ui/gm-entity-picker';
import '../../shared/ui/md3-number-input';

export interface GrowlightAcInfinityEditorProps {
  devices: AcInfinityGrowLight[];
  /** `select.*` entities (Active Mode). */
  modeOptions: string[];
  /** `time.*` entities (on/off schedule). */
  timeOptions: string[];
  /** `number.*` entities (on_power + sunrise duration). */
  numberOptions: string[];
  /** `switch.*` entities (sunrise enable). */
  switchOptions: string[];
  /**
   * Port Pre-fill (ADR-0028): the pickable `ac_infinity` port devices. Omitted →
   * no picker renders (existing manual flow).
   */
  portDevices?: PortDeviceOption[];
  /** The device each port derives from its saved `mode_entity`, parallel to `devices`. */
  portDeviceIds?: string[];
  /** Roles the last pick failed to resolve, per port index (inline warning). */
  prefillWarnings?: string[][];
  /** Picking a device for a port — the host resolves + fills + warns. */
  onPickDevice?: (index: number, deviceId: string) => void;
  /** Duplicate Port Warning message per port index ('' = none), naming the other role(s). */
  duplicateWarnings?: string[];
  onChange: (devices: AcInfinityGrowLight[]) => void;
}

function blankGrowlight(): AcInfinityGrowLight {
  return {
    mode_entity: '',
    on_time_entity: '',
    off_time_entity: '',
    power_entity: '',
    sunrise_switch_entity: '',
    sunrise_duration_entity: '',
  };
}

export function renderGrowlightAcInfinityDevices(
  p: GrowlightAcInfinityEditorProps
): TemplateResult {
  const { devices, onChange } = p;
  const update = (index: number, patch: Partial<AcInfinityGrowLight>): void =>
    onChange(devices.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  const remove = (index: number): void => onChange(devices.filter((_, i) => i !== index));
  const add = (): void => onChange([...devices, blankGrowlight()]);

  return html`
    <div class="ac-infinity-editor" style="position:relative;margin-top:12px;">
      <div
        class="ac-infinity-editor-label"
        style="font-size:0.857143rem;color:var(--secondary-text-color);margin-bottom:8px;"
      >
        AC Infinity Grow Lights
      </div>
      ${devices.map((device, index) => {
        return html`
          <div
            class="ac-infinity-device detail-card"
            style="padding:12px;margin-bottom:8px;border:1px solid var(--divider-color,rgba(255,255,255,0.12));border-radius:8px;"
          >
            <div
              style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;"
            >
              <span style="font-weight:500;">Grow light port ${index + 1}</span>
              <button
                type="button"
                class="chip-remove"
                aria-label="Remove AC Infinity grow light"
                title="Remove AC Infinity grow light"
                style="display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;padding:0;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;"
                @click=${() => remove(index)}
              >
                ×
              </button>
            </div>
            ${renderPortPicker({
              portDevices: p.portDevices,
              selectedDeviceId: p.portDeviceIds?.[index] ?? '',
              warning: p.prefillWarnings?.[index],
              onPick: (deviceId) => p.onPickDevice?.(index, deviceId),
            })}
            <div style="margin-bottom:8px;">
              <gm-entity-picker
                label="Active Mode (select)"
                .value=${device.mode_entity}
                .options=${optionsWithCurrent(p.modeOptions, device.mode_entity)}
                @entity-picked=${(e: CustomEvent<string>) =>
                  update(index, { mode_entity: e.detail })}
              ></gm-entity-picker>
              ${renderDuplicateWarning(p.duplicateWarnings?.[index])}
            </div>
            <div style="margin-bottom:8px;">
              <gm-entity-picker
                label="Lights-on time (time)"
                .value=${device.on_time_entity}
                .options=${optionsWithCurrent(p.timeOptions, device.on_time_entity)}
                @entity-picked=${(e: CustomEvent<string>) =>
                  update(index, { on_time_entity: e.detail })}
              ></gm-entity-picker>
            </div>
            <div style="margin-bottom:8px;">
              <gm-entity-picker
                label="Lights-off time (time)"
                .value=${device.off_time_entity}
                .options=${optionsWithCurrent(p.timeOptions, device.off_time_entity)}
                @entity-picked=${(e: CustomEvent<string>) =>
                  update(index, { off_time_entity: e.detail })}
              ></gm-entity-picker>
            </div>
            <div style="margin-bottom:8px;">
              <gm-entity-picker
                label="Power (number)"
                .value=${device.power_entity}
                .options=${optionsWithCurrent(p.numberOptions, device.power_entity)}
                @entity-picked=${(e: CustomEvent<string>) =>
                  update(index, { power_entity: e.detail })}
              ></gm-entity-picker>
            </div>
            <div style="margin-bottom:8px;">
              <gm-entity-picker
                label="Sunrise switch (optional)"
                .value=${device.sunrise_switch_entity}
                .options=${optionsWithCurrent(p.switchOptions, device.sunrise_switch_entity)}
                @entity-picked=${(e: CustomEvent<string>) =>
                  update(index, { sunrise_switch_entity: e.detail })}
              ></gm-entity-picker>
            </div>
            <gm-entity-picker
              label="Sunrise duration (number, optional)"
              .value=${device.sunrise_duration_entity}
              .options=${optionsWithCurrent(p.numberOptions, device.sunrise_duration_entity)}
              @entity-picked=${(e: CustomEvent<string>) =>
                update(index, { sunrise_duration_entity: e.detail })}
            ></gm-entity-picker>
          </div>
        `;
      })}
      <button class="md3-button tonal" style="margin-top:4px;" @click=${add}>
        + Add AC Infinity grow light
      </button>
    </div>
  `;
}
