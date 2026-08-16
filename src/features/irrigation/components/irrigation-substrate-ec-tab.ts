/**
 * Irrigation Substrate & EC Tab Component (ADR-0019 + ADR-0017)
 *
 * The dumb presentational element for the Substrate & EC tab. `@property .vm` in,
 * semantic Tab Intents out, **no `@state()` of its own**. Markup transcribed
 * verbatim from the former inline `_renderSubstrateEcTab` / `_renderFeedEcRanges`
 * / `_renderUnlockHint` so the rendered output stays byte-identical.
 *
 * ADR-0017 mixed persistence is expressed through DISTINCT intents so the Dialog
 * Shell can route each write path correctly:
 *   - **Immediate-persist** (capability-affecting; Shell calls
 *     `_persistProfile`/`_persistStrategyNow` straight away, NOT buffered):
 *       `substrate-ec-profile-changed`   detail: { partial: Partial<SubstrateProfile> }
 *       `substrate-ec-sizing-mode-changed` detail: { mode: ShotSizingMode }
 *       `substrate-ec-modulation-toggled`  detail: { enabled: boolean }
 *   - **Buffered** (SM draft → footer save-all):
 *       `substrate-ec-pore-band-changed`  detail: { min: number|null, max: number|null }
 *       `substrate-ec-targets-changed`    detail: { ranges: ECTargetRange[] }
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiLockOutline } from '@mdi/js';
import { dialogStyles } from '../../../styles/dialog.styles';
import type { SubstrateMediaType, ShotSizingMode, ECTargetRange } from '../../../services/types';
import type { SubstrateEcTabViewModel } from '../viewmodels/substrate-ec-tab.viewmodel';
import '../../../features/shared/ui/md3-number-input';
import '../../../features/shared/ui/md3-switch';

const MEDIA_OPTIONS: Array<{ id: SubstrateMediaType; label: string }> = [
  { id: 'coco', label: 'Coco' },
  { id: 'rockwool', label: 'Rockwool' },
  { id: 'soil', label: 'Soil' },
];

const STAGE_LABELS: Record<string, string> = {
  seedling: 'Seedling',
  veg: 'Veg',
  flower_early: 'Early Flower',
  flower_mid: 'Mid Flower',
  flower_late: 'Late Flower / Flush',
};

@customElement('irrigation-substrate-ec-tab')
export class IrrigationSubstrateEcTab extends LitElement {
  @property({ attribute: false }) vm!: SubstrateEcTabViewModel;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }
      /* ── Segmented toggle (Shot Sizing Mode), copied from irrigation-dialog ── */
      .seg-btn {
        flex: 1;
        padding: 10px 12px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.15));
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.04);
        color: var(--primary-text-color);
        font-size: 0.85rem;
        cursor: pointer;
      }
      .seg-btn.active {
        border-color: rgba(33, 150, 243, 0.5);
        background: rgba(33, 150, 243, 0.12);
        font-weight: 600;
      }
      .seg-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    `,
  ];

  private _emit(type: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  private _renderUnlockHint(text: string): TemplateResult {
    return html`
      <div
        class="capability-unlock-hint"
        style="display:flex;align-items:center;gap:6px;font-size:0.78rem;color:var(--secondary-text-color);margin-top:6px;"
      >
        <ha-svg-icon .path=${mdiLockOutline} style="width:16px;height:16px;"></ha-svg-icon>
        <span>${text}</span>
      </div>
    `;
  }

  render(): TemplateResult {
    const vm = this.vm;
    if (!vm) return html`${nothing}`;
    const { profile, sizingMode, volumeModeCapable, hasPoreEcSensors } = vm;

    return html`
      <!-- Substrate Profile -->
      <div class="detail-card">
        <h3 style="margin:0 0 12px;">Substrate Profile</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <label style="display:flex;flex-direction:column;gap:4px;font-size:0.85rem;">
            <span style="color:var(--secondary-text-color);">Media type</span>
            <select
              class="md3-input"
              data-field="substrate_media_type"
              .value=${profile.mediaType}
              @change=${(e: Event) =>
                this._emit('substrate-ec-profile-changed', {
                  partial: {
                    mediaType: (e.target as HTMLSelectElement).value as SubstrateMediaType,
                  },
                })}
            >
              ${MEDIA_OPTIONS.map(
                (o) =>
                  html`<option value=${o.id} ?selected=${profile.mediaType === o.id}>
                    ${o.label}
                  </option>`
              )}
            </select>
          </label>
          <md3-number-input
            data-field="substrate_liters_per_pot"
            label="Liters per pot"
            .value=${profile.litersPerPot ? String(profile.litersPerPot) : ''}
            @change=${(e: CustomEvent) =>
              this._emit('substrate-ec-profile-changed', {
                partial: { litersPerPot: parseFloat(e.detail) || 0 },
              })}
          ></md3-number-input>
        </div>
      </div>

      <!-- Shot Sizing Mode -->
      <div class="detail-card">
        <h3 style="margin:0 0 8px;">Shot Sizing Mode</h3>
        <p style="font-size:var(--font-size-supporting);opacity:0.7;margin:0 0 12px;">
          How P1/P2 shot sizes are expressed. Volume Mode sizes shots as a percent of substrate
          volume.
        </p>
        <div style="display:flex;gap:8px;">
          <button
            class="seg-btn ${sizingMode === 'seconds' ? 'active' : ''}"
            data-sizing-mode="seconds"
            @click=${() =>
              sizingMode !== 'seconds' &&
              this._emit('substrate-ec-sizing-mode-changed', { mode: 'seconds' as ShotSizingMode })}
          >
            Seconds
          </button>
          <button
            class="seg-btn ${sizingMode === 'volume' ? 'active' : ''}"
            data-sizing-mode="volume"
            ?disabled=${!volumeModeCapable}
            @click=${() =>
              volumeModeCapable &&
              sizingMode !== 'volume' &&
              this._emit('substrate-ec-sizing-mode-changed', { mode: 'volume' as ShotSizingMode })}
          >
            Volume
          </button>
        </div>
        ${!volumeModeCapable ? this._renderUnlockHint(vm.volumeLockHint) : nothing}
      </div>

      <!-- Pore EC Target Band -->
      <div class="detail-card">
        <h3 style="margin:0 0 8px;">Pore EC Target Band</h3>
        <p style="font-size:var(--font-size-supporting);opacity:0.7;margin:0 0 12px;">
          The substrate (pore) EC range EC Modulation steers toward — distinct from the per-stage
          feed-EC ranges below. Save with the footer button.
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <md3-number-input
            data-field="pore_ec_target_min"
            label="Min pore EC (mS/cm)"
            .value=${vm.poreEcMin != null ? String(vm.poreEcMin) : ''}
            @change=${(e: CustomEvent) =>
              this._emit('substrate-ec-pore-band-changed', {
                min: e.detail === '' ? null : parseFloat(e.detail),
                max: vm.poreEcMax,
              })}
          ></md3-number-input>
          <md3-number-input
            data-field="pore_ec_target_max"
            label="Max pore EC (mS/cm)"
            .value=${vm.poreEcMax != null ? String(vm.poreEcMax) : ''}
            @change=${(e: CustomEvent) =>
              this._emit('substrate-ec-pore-band-changed', {
                min: vm.poreEcMin,
                max: e.detail === '' ? null : parseFloat(e.detail),
              })}
          ></md3-number-input>
        </div>
        ${vm.poreBandInverted
          ? html`<div style="font-size:0.78rem;color:var(--error-color,#f44336);margin-top:6px;">
              Min must be below max.
            </div>`
          : nothing}
      </div>

      <!-- EC Modulation -->
      <div class="detail-card">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div>
            <h3 style="margin:0 0 4px;">EC Modulation</h3>
            <p style="font-size:var(--font-size-supporting);opacity:0.7;margin:0;">
              Nudge feed EC toward the pore-EC band above.
            </p>
          </div>
          <md3-switch
            data-field="ec_modulation_enabled"
            .checked=${vm.ecModulationEnabled}
            ?disabled=${!hasPoreEcSensors}
            @change=${(e: Event) =>
              hasPoreEcSensors &&
              this._emit('substrate-ec-modulation-toggled', {
                enabled: (e.target as HTMLInputElement).checked,
              })}
          ></md3-switch>
        </div>
        ${!hasPoreEcSensors
          ? this._renderUnlockHint('Add a pore EC sensor to enable EC Modulation')
          : nothing}
      </div>

      ${this._renderFeedEcRanges(vm.ecTargetRanges)}
    `;
  }

  /** Per-stage feed-EC target ranges (buffered draft → footer save-all). */
  private _renderFeedEcRanges(ranges: ECTargetRange[]): TemplateResult {
    return html`
      <div
        class="detail-card"
        style="border-top:2px solid var(--divider-color,rgba(255,255,255,0.12));"
      >
        <div
          style="display:flex;align-items:center;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--divider-color,rgba(255,255,255,0.1));padding-bottom:8px;"
        >
          <h3 style="margin:0;border:none;padding:0;">Feed EC Targets per Stage</h3>
        </div>
        <p style="font-size:0.85rem;color:var(--secondary-text-color);margin:0 0 16px;">
          Set feed EC target ranges (min / max) per growth stage. Save with the footer button.
        </p>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th
                style="text-align:left;padding:6px 8px;font-size:var(--font-size-supporting);color:var(--secondary-text-color);"
              >
                Stage
              </th>
              <th
                style="text-align:left;padding:6px 8px;font-size:var(--font-size-supporting);color:var(--secondary-text-color);"
              >
                Min EC (mS/cm)
              </th>
              <th
                style="text-align:left;padding:6px 8px;font-size:var(--font-size-supporting);color:var(--secondary-text-color);"
              >
                Max EC (mS/cm)
              </th>
            </tr>
          </thead>
          <tbody>
            ${ranges.map(
              (range, idx) => html`
                <tr
                  class="ec-target-row"
                  style="border-top:1px solid var(--divider-color,rgba(255,255,255,0.07));"
                >
                  <td style="padding:8px;">
                    <span class="ec-stage-label" style="font-weight:500;"
                      >${STAGE_LABELS[range.stage] ?? range.stage}</span
                    >
                  </td>
                  <td style="padding:8px;">
                    <input
                      class="md3-input"
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      style="width:90px;"
                      .value=${String(range.minEc)}
                      @input=${(e: Event) => {
                        const val = parseFloat((e.target as HTMLInputElement).value) || 0;
                        this._emit('substrate-ec-targets-changed', {
                          ranges: ranges.map((r, i) => (i === idx ? { ...r, minEc: val } : r)),
                        });
                      }}
                    />
                  </td>
                  <td style="padding:8px;">
                    <input
                      class="md3-input"
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      style="width:90px;"
                      .value=${String(range.maxEc)}
                      @input=${(e: Event) => {
                        const val = parseFloat((e.target as HTMLInputElement).value) || 0;
                        this._emit('substrate-ec-targets-changed', {
                          ranges: ranges.map((r, i) => (i === idx ? { ...r, maxEc: val } : r)),
                        });
                      }}
                    />
                  </td>
                </tr>
              `
            )}
          </tbody>
        </table>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'irrigation-substrate-ec-tab': IrrigationSubstrateEcTab;
  }
}
