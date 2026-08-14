/**
 * Irrigation EC Ramp Tab Component (ADR-0019)
 *
 * The dumb presentational element for the Irrigation Dialog's EC Ramp tab.
 * `@property .vm: EcRampTabViewModel` in, semantic Tab Intents out, **no
 * `@state()` of its own** — the LIST/EDIT view, the open curve draft, and the
 * validation error live in the DialogStateMachine and are projected into the VM
 * (b1). Markup is transcribed verbatim from the former inline `_renderEcRampTab`
 * / `_renderEcRampList` / `_renderEcRampEdit` helpers so the rendered output
 * stays byte-identical; the EC-ramp `.curve-*` / `.points-*` styles moved here.
 *
 * Tab Intents (the Dialog Shell owns their translation to SM events):
 *   - `ec-ramp-new-curve`        (no detail)
 *   - `ec-ramp-edit-curve`       detail: { id }
 *   - `ec-ramp-delete-curve`     detail: { id }
 *   - `ec-ramp-cancel-edit`      (no detail)
 *   - `ec-ramp-curve-changed`    detail: { partial: Partial<ECRampCurve> }
 *   - `ec-ramp-add-point`        (no detail)
 *   - `ec-ramp-remove-point`     detail: { index }
 *   - `ec-ramp-update-point`     detail: { index, partial: Partial<ECRampPoint> }
 *   - `ec-ramp-save-curve`       (no detail)
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import {
  mdiPlus,
  mdiPencil,
  mdiDelete,
  mdiArrowLeft,
  mdiContentSave,
  mdiInformation,
} from '@mdi/js';
import { dialogStyles } from '../../../styles/dialog.styles';
import type { ECRampPoint } from '../../../slices/nutrient';
import type {
  EcRampTabViewModel,
  EcRampCurveRowVM,
  EcRampEditVM,
} from '../viewmodels/ec-ramp-tab.viewmodel';

@customElement('irrigation-ec-ramp-tab')
export class IrrigationEcRampTab extends LitElement {
  @property({ attribute: false }) vm!: EcRampTabViewModel;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }
      /* ── EC Ramp tab — copied from irrigation-dialog ── */
      .tab-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .error-bar {
        background: rgba(244, 67, 54, 0.12);
        border: 1px solid rgba(244, 67, 54, 0.4);
        color: var(--error-color, #f44336);
        border-radius: var(--border-radius-sm, 8px);
        padding: 10px 14px;
        font-size: var(--font-size-sm);
      }
      .empty-state {
        text-align: center;
        padding: 32px 16px;
        opacity: 0.7;
      }
      .empty-state ha-svg-icon {
        --mdc-icon-size: 40px;
        opacity: 0.4;
      }
      .curves-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .curve-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 14px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        border-radius: var(--border-radius-md, 12px);
        background: rgba(255, 255, 255, 0.02);
        cursor: pointer;
        transition: border-color 0.2s;
      }
      .curve-item:hover {
        border-color: var(--primary-color, #03a9f4);
      }
      .curve-info {
        min-width: 0;
      }
      .curve-name {
        font-size: 14px;
        font-weight: 500;
      }
      .curve-details {
        font-size: 12px;
        opacity: 0.6;
        margin-top: 2px;
      }
      .curve-actions {
        display: flex;
        gap: 4px;
        flex-shrink: 0;
      }
      .preset-form {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .form-section h3 {
        margin: 0 0 12px;
        font-size: 14px;
      }
      .points-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }
      .points-header h3 {
        margin: 0;
      }
      .points-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .point-row {
        display: grid;
        grid-template-columns: 1fr 1fr auto;
        gap: 12px;
        align-items: end;
      }
    `,
  ];

  private _emit(type: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  render(): TemplateResult {
    const vm = this.vm;
    return html`
      <div class="tab-section">
        ${vm?.error ? html`<div class="error-bar">${vm.error}</div>` : nothing}
        ${vm?.editing ? this._renderEdit(vm.editing) : this._renderList(vm?.curves ?? [])}
      </div>
    `;
  }

  private _renderList(curves: EcRampCurveRowVM[]): TemplateResult {
    if (curves.length === 0) {
      return html`
        <div class="empty-state">
          <ha-svg-icon .path=${mdiInformation}></ha-svg-icon>
          <p>No EC ramp curves defined yet.</p>
          <p style="font-size: var(--font-size-sm);">
            Create curves to schedule EC targets across your grow cycle.
          </p>
        </div>
        <div class="button-group" style="margin-top: 16px;">
          <button class="md3-button primary" @click=${() => this._emit('ec-ramp-new-curve')}>
            <ha-svg-icon .path=${mdiPlus} style="margin-right: 8px;"></ha-svg-icon>
            New Curve
          </button>
        </div>
      `;
    }

    return html`
      <div class="curves-list">
        ${curves.map(
          (curve) => html`
            <div
              class="curve-item"
              @click=${() => this._emit('ec-ramp-edit-curve', { id: curve.id })}
            >
              <div class="curve-info">
                <div class="curve-name">${curve.name}</div>
                <div class="curve-details">${curve.summary}</div>
              </div>
              <div class="curve-actions">
                <button
                  class="md3-button icon"
                  @click=${(e: Event) => {
                    e.stopPropagation();
                    this._emit('ec-ramp-edit-curve', { id: curve.id });
                  }}
                  title="Edit"
                >
                  <ha-svg-icon .path=${mdiPencil}></ha-svg-icon>
                </button>
                <button
                  class="md3-button icon"
                  @click=${(e: Event) => {
                    e.stopPropagation();
                    this._emit('ec-ramp-delete-curve', { id: curve.id });
                  }}
                  title="Delete"
                  style="color: var(--error-color);"
                >
                  <ha-svg-icon .path=${mdiDelete}></ha-svg-icon>
                </button>
              </div>
            </div>
          `
        )}
      </div>
      <div class="button-group" style="margin-top: 16px;">
        <button class="md3-button primary" @click=${() => this._emit('ec-ramp-new-curve')}>
          <ha-svg-icon .path=${mdiPlus} style="margin-right: 8px;"></ha-svg-icon>
          New Curve
        </button>
      </div>
    `;
  }

  private _renderEdit(editing: EcRampEditVM): TemplateResult {
    const curve = editing.draft;
    const points = editing.points;

    return html`
      <div class="preset-form">
        <div class="form-section">
          <h3>Curve Info</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <md3-text-input
              label="Curve Name"
              .value=${curve.name ?? ''}
              @change=${(e: CustomEvent) =>
                this._emit('ec-ramp-curve-changed', { partial: { name: e.detail } })}
              placeholder="e.g. Veg Ramp, Bloom Progression"
            ></md3-text-input>
            <md3-select
              label="Growth Stage"
              .value=${curve.stage ?? 'flower'}
              .options=${[
                { label: 'Seedling', value: 'seedling' },
                { label: 'Mother', value: 'mother' },
                { label: 'Vegetative', value: 'veg' },
                { label: 'Flower', value: 'flower' },
                { label: 'Cure', value: 'cure' },
              ]}
              @change=${(e: CustomEvent) =>
                this._emit('ec-ramp-curve-changed', { partial: { stage: e.detail } })}
            ></md3-select>
          </div>
        </div>

        <div class="form-section">
          <div class="points-header">
            <h3>Ramp Points</h3>
            <button class="md3-button text" @click=${() => this._emit('ec-ramp-add-point')}>
              <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
              Add Point
            </button>
          </div>
          <div class="points-list">
            ${points.map(
              (point: ECRampPoint, index: number) => html`
                <div class="point-row">
                  <md3-number-input
                    label="Day"
                    .value=${point.day}
                    @change=${(e: CustomEvent) =>
                      this._emit('ec-ramp-update-point', {
                        index,
                        partial: { day: parseInt(e.detail) || 0 },
                      })}
                    min="0"
                  ></md3-number-input>
                  <md3-number-input
                    label="Target EC (mS/cm)"
                    .value=${point.target_ec}
                    @change=${(e: CustomEvent) =>
                      this._emit('ec-ramp-update-point', {
                        index,
                        partial: { target_ec: parseFloat(e.detail) || 0 },
                      })}
                    min="0"
                    step="0.1"
                  ></md3-number-input>
                  <button
                    class="md3-button icon"
                    @click=${() => this._emit('ec-ramp-remove-point', { index })}
                    style="color: var(--error-color);"
                    ?disabled=${points.length <= 1}
                  >
                    <ha-svg-icon .path=${mdiDelete}></ha-svg-icon>
                  </button>
                </div>
              `
            )}
          </div>
        </div>
      </div>

      <div class="button-group" style="margin-top: 16px;">
        <button class="md3-button tonal" @click=${() => this._emit('ec-ramp-cancel-edit')}>
          <ha-svg-icon .path=${mdiArrowLeft} style="margin-right: 8px;"></ha-svg-icon>
          Back
        </button>
        <button class="md3-button primary" @click=${() => this._emit('ec-ramp-save-curve')}>
          <ha-svg-icon .path=${mdiContentSave} style="margin-right: 8px;"></ha-svg-icon>
          Save Curve
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'irrigation-ec-ramp-tab': IrrigationEcRampTab;
  }
}
