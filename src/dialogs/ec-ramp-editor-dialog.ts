import { LitElement, html, css, nothing, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';
import {
  mdiChartLine,
  mdiPlus,
  mdiPencil,
  mdiDelete,
  mdiContentSave,
  mdiInformation,
  mdiCheck,
  mdiArrowLeft,
} from '@mdi/js';
import { consume } from '@lit/context';
import { hassContext, storeContext } from '../context';
import { ECRampDialogState } from '../lib/types/dialog';
import { dialogStyles } from '../styles/dialog.styles';
import { GrowspaceStore } from '../store/core/growspace-store';
import { StoreController } from '@nanostores/lit';
import type { ECRampCurve, ECRampPoint } from '../schemas/api-schema';
import '../features/shared/ui';

@customElement('ec-ramp-editor-dialog')
export class ECRampEditorDialog extends LitElement {
  @consume({ context: hassContext, subscribe: true })
  public hass!: HomeAssistant;

  @consume({ context: storeContext, subscribe: true })
  public store!: GrowspaceStore;

  @property({ type: Boolean }) open = false;
  @property({ attribute: false }) dialogState: ECRampDialogState | undefined;
  @property({ type: String }) growspaceName = '';

  @state() private _view: 'LIST' | 'EDIT' = 'LIST';
  @state() private _editingCurve: Partial<ECRampCurve> | null = null;
  @state() private _error: string | null = null;

  private _curvesController!: StoreController<Record<string, ECRampCurve>>;

  connectedCallback() {
    super.connectedCallback();
    if (this.store) {
      this._curvesController = new StoreController(this, this.store.data.$ecRampCurves);
      // Fetch curves when dialog opens
      void this.store.actions.library.fetchECRampCurves();
    }
  }

  static styles = [
    dialogStyles,
    css`
      .curve-item {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.05));
        border-radius: 8px;
        margin-bottom: 8px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        cursor: pointer;
        transition: background 0.15s;
      }
      .curve-item:hover {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.08));
      }
      .curve-info {
        flex: 1;
      }
      .curve-name {
        font-weight: 500;
        font-size: 1rem;
      }
      .curve-details {
        font-size: 0.8rem;
        opacity: 0.7;
        margin-top: 2px;
      }
      .curve-actions {
        display: flex;
        gap: 8px;
      }
      .empty-state {
        text-align: center;
        padding: 40px 20px;
        opacity: 0.6;
      }
      .empty-state ha-svg-icon {
        --mdc-icon-size: 48px;
        opacity: 0.5;
        margin-bottom: 16px;
        display: block;
      }
      .error-bar {
        background: var(--error-color, #ff5252);
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        margin-bottom: 16px;
        font-size: 0.9rem;
      }
      .form-section {
        margin-bottom: 24px;
      }
      .form-section h3 {
        margin: 0 0 12px;
        font-size: 0.9rem;
        text-transform: uppercase;
        opacity: 0.6;
        letter-spacing: 1px;
      }
      .points-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }
      .points-header h3 {
        margin: 0;
      }
      .point-row {
        display: grid;
        grid-template-columns: 1fr 1fr auto;
        gap: 8px;
        align-items: center;
        margin-bottom: 8px;
      }
      .points-list {
        max-height: 300px;
        overflow-y: auto;
      }
      .curve-preview {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
        margin-top: 4px;
      }
      .point-badge {
        background: var(--primary-color, #4caf50);
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.7rem;
        opacity: 0.8;
      }
    `,
  ];

  updated(changedProps: PropertyValues) {
    if (changedProps.has('open') && this.open) {
      this._view = 'LIST';
      this._editingCurve = null;
      this._error = null;
      if (this.store) {
        void this.store.actions.library.fetchECRampCurves();
      }
    }
  }

  private _close() {
    this.open = false;
    this._editingCurve = null;
    this._view = 'LIST';
    this._error = null;
    this.dispatchEvent(new CustomEvent('close'));
  }

  // --- LIST VIEW ---

  private _startNew() {
    this._editingCurve = {
      name: '',
      stage: 'flower',
      points: [{ day: 1, target_ec: 1.0 }],
    };
    this._view = 'EDIT';
    this._error = null;
  }

  private _editCurve(curve: ECRampCurve) {
    this._editingCurve = JSON.parse(JSON.stringify(curve));
    this._view = 'EDIT';
    this._error = null;
  }

  private async _deleteCurve(curveId: string) {
    if (!confirm('Are you sure you want to delete this EC ramp curve?')) return;
    try {
      await this.store.actions.library.removeECRampCurve(curveId);
    } catch (err: unknown) {
      this._error = err instanceof Error ? err.message : 'Unknown error';
    }
  }

  // --- EDIT VIEW ---

  private _addPoint() {
    if (!this._editingCurve) return;
    const points = [...(this._editingCurve.points || [])];
    const lastDay = points.length > 0 ? points[points.length - 1].day : 0;
    const lastEc = points.length > 0 ? points[points.length - 1].target_ec : 1.0;
    points.push({ day: lastDay + 7, target_ec: lastEc + 0.2 });
    this._editingCurve = { ...this._editingCurve, points };
  }

  private _removePoint(index: number) {
    if (!this._editingCurve) return;
    const points = [...(this._editingCurve.points || [])];
    points.splice(index, 1);
    this._editingCurve = { ...this._editingCurve, points };
  }

  private _updatePoint(index: number, updates: Partial<ECRampPoint>) {
    if (!this._editingCurve) return;
    const points = [...(this._editingCurve.points || [])];
    points[index] = { ...points[index], ...updates };
    this._editingCurve = { ...this._editingCurve, points };
  }

  private async _saveCurve() {
    if (!this._editingCurve || !this._editingCurve.name?.trim()) {
      this._error = 'Curve name is required';
      return;
    }

    const points = (this._editingCurve.points || []).filter((p) => p.day >= 0 && p.target_ec > 0);
    if (points.length === 0) {
      this._error = 'At least one valid EC point is required';
      return;
    }

    // Sort points by day
    const sortedPoints = [...points].sort((a, b) => a.day - b.day);

    try {
      await this.store.actions.library.saveECRampCurve({
        curve_id: this._editingCurve.id,
        name: this._editingCurve.name.trim(),
        stage: this._editingCurve.stage || 'flower',
        points: sortedPoints,
      });
      this._view = 'LIST';
      this._editingCurve = null;
    } catch (err: unknown) {
      this._error = err instanceof Error ? err.message : 'Unknown error';
    }
  }

  render() {
    if (!this.open) return nothing;

    const title =
      this._view === 'LIST'
        ? 'EC Ramp Curves'
        : this._editingCurve?.id
          ? 'Edit EC Ramp'
          : 'New EC Ramp';
    const subtitle =
      this._view === 'LIST' ? 'Manage EC targets over time' : 'Define daily EC targets';

    return html`
      <gs-dialog
        .open=${this.open}
        .heading=${title}
        .subtitle=${subtitle}
        .iconPath=${mdiChartLine}
        @close=${this._close}
      >
        <gs-help-tooltip
          slot="header-extra"
          content=${this._view === 'LIST'
            ? 'Manage your library of EC Ramp Curves. These curves define the target nutrient concentration for each day of a growth stage.'
            : 'Define target nutrient strength (EC in mS/cm) day-by-day throughout a growth stage. Use points to create a progressive ramp.'}
          placement="bottom"
          label=${title}
        ></gs-help-tooltip>

        <div class="dialog-content-grid">
          ${this._error ? html`<div class="error-bar">${this._error}</div>` : nothing}
          ${this._view === 'LIST' ? this._renderList() : this._renderEdit()}
        </div>

        <div class="button-group">${this._renderFooterButtons()}</div>
      </gs-dialog>
    `;
  }

  private _renderFooterButtons() {
    if (this._view === 'LIST') {
      return html`
        <button class="md3-button tonal" @click=${this._close}>Close</button>
        <button class="md3-button primary" @click=${this._startNew}>
          <ha-svg-icon .path=${mdiPlus} style="margin-right: 8px;"></ha-svg-icon>
          New Curve
        </button>
      `;
    } else {
      return html`
        <button
          class="md3-button tonal"
          @click=${() => {
            this._view = 'LIST';
            this._editingCurve = null;
            this._error = null;
          }}
        >
          <ha-svg-icon .path=${mdiArrowLeft} style="margin-right: 8px;"></ha-svg-icon>
          Back
        </button>
        <button class="md3-button primary" @click=${this._saveCurve}>
          <ha-svg-icon .path=${mdiContentSave} style="margin-right: 8px;"></ha-svg-icon>
          Save Curve
        </button>
      `;
    }
  }

  private _renderList() {
    const curves = this._curvesController?.value || {};
    const curveList = Object.values(curves);

    if (curveList.length === 0) {
      return html`
        <div class="empty-state">
          <ha-svg-icon .path=${mdiInformation}></ha-svg-icon>
          <p>No EC ramp curves defined yet.</p>
          <p style="font-size: 0.9rem;">
            Create curves to schedule EC targets across your grow cycle.
          </p>
        </div>
      `;
    }

    return html`
      <div class="curves-list">
        ${curveList.map(
          (curve: ECRampCurve) => html`
            <div class="curve-item" @click=${() => this._editCurve(curve)}>
              <div class="curve-info">
                <div class="curve-name">${curve.name}</div>
                <div class="curve-details">
                  ${curve.points.length} point${curve.points.length !== 1 ? 's' : ''} • Day
                  ${Math.min(...curve.points.map((p) => p.day))}–${Math.max(
                    ...curve.points.map((p) => p.day)
                  )}
                </div>
                <div class="curve-preview">
                  ${curve.points
                    .slice(0, 6)
                    .map(
                      (p) =>
                        html`<span class="point-badge">D${p.day}: ${p.target_ec.toFixed(1)}</span>`
                    )}
                  ${curve.points.length > 6
                    ? html`<span class="point-badge" style="opacity: 0.5;"
                        >+${curve.points.length - 6} more</span
                      >`
                    : nothing}
                </div>
              </div>
              <div class="curve-actions">
                <button
                  class="md3-button icon"
                  @click=${(e: Event) => {
                    e.stopPropagation();
                    this._editCurve(curve);
                  }}
                  title="Edit"
                >
                  <ha-svg-icon .path=${mdiPencil}></ha-svg-icon>
                </button>
                <button
                  class="md3-button icon"
                  @click=${(e: Event) => {
                    e.stopPropagation();
                    this._deleteCurve(curve.id);
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
    `;
  }

  private _updateCurveInfo(updates: Partial<ECRampCurve>) {
    if (!this._editingCurve) return;
    this._editingCurve = { ...this._editingCurve, ...updates };
  }

  private _renderEdit() {
    if (!this._editingCurve) return nothing;

    const points = this._editingCurve.points || [];

    return html`
      <div class="preset-form">
        <div class="form-section">
          <h3>Curve Info</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <md3-text-input
              label="Curve Name"
              .value=${this._editingCurve.name || ''}
              @change=${(e: CustomEvent) => this._updateCurveInfo({ name: e.detail })}
              placeholder="e.g. Veg Ramp, Bloom Progression"
            ></md3-text-input>
            <div>
              <div
                style="display:flex;align-items:center;gap:4px;margin-bottom:4px;font-size:0.875rem;color:var(--secondary-text-color);"
              >
                <span>Growth Stage</span>
                <gs-help-tooltip
                  content="Which growth phase this curve applies to. The correct curve is automatically applied when a plant enters that stage."
                  placement="right"
                  label="Growth Stage"
                ></gs-help-tooltip>
              </div>
              <md3-select
                label="Growth Stage"
                .value=${this._editingCurve.stage || 'flower'}
                .options=${[
                  { label: 'Seedling', value: 'seedling' },
                  { label: 'Mother', value: 'mother' },
                  { label: 'Vegetative', value: 'veg' },
                  { label: 'Flower', value: 'flower' },
                  { label: 'Cure', value: 'cure' },
                ]}
                @change=${(e: CustomEvent) => this._updateCurveInfo({ stage: e.detail })}
              ></md3-select>
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="points-header">
            <div style="display:flex;align-items:center;gap:6px;">
              <h3>Ramp Points</h3>
              <gs-help-tooltip
                content="Each point sets a target EC (mS/cm) for a specific day of the stage. The system interpolates between points. Add at least 2 points — a start and an end."
                placement="top"
                label="Ramp Points"
              ></gs-help-tooltip>
            </div>
            <button
              class="md3-button text"
              @click=${this._addPoint}
              style="--mdc-button-horizontal-padding: 8px;"
            >
              <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
              Add Point
            </button>
          </div>
          <div
            style="display:flex;align-items:center;gap:4px;font-size:0.875rem;color:var(--secondary-text-color);margin-bottom:4px;"
          >
            <span>Target EC (mS/cm)</span>
            <gs-help-tooltip
              content="Electrical Conductivity measures total dissolved nutrients. 1 mS/cm ≈ 700 ppm. Too high causes nutrient burn; too low causes deficiency. Adjust based on plant response."
              placement="top"
              label="Target EC"
            ></gs-help-tooltip>
          </div>
          <div class="points-list">
            ${points.map(
              (point: ECRampPoint, index: number) => html`
                <div class="point-row">
                  <md3-number-input
                    label="Day"
                    .value=${point.day}
                    @change=${(e: CustomEvent) =>
                      this._updatePoint(index, { day: parseInt(e.detail) || 0 })}
                    min="0"
                  ></md3-number-input>
                  <md3-number-input
                    label="Target EC (mS/cm)"
                    .value=${point.target_ec}
                    @change=${(e: CustomEvent) =>
                      this._updatePoint(index, { target_ec: parseFloat(e.detail) || 0 })}
                    min="0"
                    step="0.1"
                  ></md3-number-input>
                  <button
                    class="md3-button icon"
                    @click=${() => this._removePoint(index)}
                    style="color: var(--error-color);"
                    ?disabled=${points.length <= 1}
                  >
                    <ha-svg-icon .path=${mdiDelete}></ha-svg-icon>
                  </button>
                </div>
              `
            )}
          </div>
          ${points.length === 0
            ? html`<p style="opacity: 0.6; font-size: 0.9rem;">
                Add at least one EC point to define the ramp.
              </p>`
            : nothing}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ec-ramp-editor-dialog': ECRampEditorDialog;
  }
}
