import { LitElement, html, css, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { mdiPlus, mdiDelete, mdiWhiteBalanceSunny } from '@mdi/js';
import { dialogStyles } from '../../../styles/dialog.styles';
import '../../shared/ui/gm-entity-picker';
import './config-section-header';
import {
  formatWindowTimestamp,
  resolveSupplementalWindowPreview,
  type SupplementalReleaseBlocker,
} from '../viewmodels/supplemental-lights';
import type {
  SupplementalAnchor,
  SupplementalLight,
  SupplementalLightStatus,
  SupplementalLightWindow,
} from '../../../slices/growspace/schema';

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

@customElement('config-supplemental-lights-editor')
export class ConfigSupplementalLightsEditor extends LitElement {
  @property({ attribute: false }) lights: SupplementalLight[] = [];
  @property({ attribute: false }) statuses: SupplementalLightStatus[] = [];
  @property({ attribute: false }) entityOptions: string[] = [];
  @property({ type: String }) lightsOnTime: string | null = null;
  @property({ type: Number }) photoperiodHours = 18;
  @property({ type: Boolean }) saving = false;
  @property({ type: String }) errorMessage: string | null = null;
  @property({ attribute: false }) releaseBlockers: SupplementalReleaseBlocker[] = [];

  @state() private _draft: SupplementalLight[] = [];
  @state() private _dirty = false;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }
      .supp-list {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .supp-item {
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 10px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .supp-header {
        display: flex;
        align-items: center;
        gap: 8px;
        justify-content: space-between;
      }
      .supp-header gm-entity-picker {
        flex: 1;
      }
      .supp-status {
        font-size: 0.85rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 8px 10px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.04);
      }
      .supp-status-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
      }
      .state-pill {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 0.78rem;
        font-weight: 600;
        background: rgba(255, 255, 255, 0.1);
      }
      .state-pill.on {
        background: rgba(76, 175, 80, 0.22);
        color: #81c784;
      }
      .state-pill.unavailable {
        background: rgba(244, 67, 54, 0.2);
        color: #e57373;
      }
      .window-row {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 8px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.03);
      }
      .window-controls {
        display: grid;
        grid-template-columns: 1fr 90px auto 1fr 90px auto;
        gap: 6px;
        align-items: center;
      }
      @media (max-width: 720px) {
        .window-controls {
          grid-template-columns: 1fr 80px;
        }
      }
      select,
      input[type='number'] {
        background: var(--card-background-color, #1e1e1e);
        color: var(--primary-text-color, #fff);
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.2));
        border-radius: 6px;
        padding: 6px 8px;
        font: inherit;
        font-size: 0.88rem;
      }
      .preview-ok {
        font-size: 0.82rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.75));
      }
      .preview-err,
      .error-banner {
        font-size: 0.85rem;
        color: var(--error-color, #ef5350);
      }
      .warning-banner {
        font-size: 0.85rem;
        color: var(--warning-color, #ffb74d);
        padding: 10px 12px;
        border-radius: 8px;
        border: 1px solid rgba(255, 183, 77, 0.4);
        background: rgba(255, 183, 77, 0.08);
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .actions-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
      }
      .btn-secondary,
      .btn-primary,
      .btn-danger,
      .icon-btn {
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.2));
        border-radius: 8px;
        padding: 7px 12px;
        font: inherit;
        font-size: 0.88rem;
        cursor: pointer;
        background: transparent;
        color: var(--primary-text-color, #fff);
      }
      .btn-primary {
        background: var(--primary-color, #03a9f4);
        border-color: transparent;
        color: #fff;
        font-weight: 600;
      }
      .btn-danger {
        border-color: rgba(244, 67, 54, 0.5);
        color: #ef5350;
      }
      .icon-btn {
        padding: 4px 8px;
      }
      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,
  ];

  protected willUpdate(changed: PropertyValues): void {
    const saveSucceeded =
      changed.has('saving') &&
      changed.get('saving') === true &&
      !this.saving &&
      !this.errorMessage &&
      this.releaseBlockers.length === 0;
    if (saveSucceeded) {
      this._dirty = false;
      this._draft = structuredClone(this.lights);
      return;
    }
    if (
      changed.has('lights') &&
      !this._dirty &&
      !this.saving &&
      !this.errorMessage &&
      this.releaseBlockers.length === 0
    ) {
      this._draft = structuredClone(this.lights);
    }
  }

  private _statusFor(light: SupplementalLight): SupplementalLightStatus | undefined {
    return (
      this.statuses.find((s) => (light.id && s.id === light.id) || s.entity_id === light.entity_id)
    );
  }

  private _setDraft(next: SupplementalLight[]): void {
    this._draft = next;
    this._dirty = true;
  }

  private _addOutput(): void {
    this._setDraft([
      ...this._draft,
      {
        id: newId('supp'),
        entity_id: '',
        enabled: true,
        windows: [
          {
            id: newId('win'),
            start_anchor: 'lights_on',
            start_offset_minutes: 0,
            end_anchor: 'lights_on',
            end_offset_minutes: 60,
          },
        ],
      },
    ]);
  }

  private _removeOutput(index: number): void {
    this._setDraft(this._draft.filter((_, i) => i !== index));
  }

  private _patchOutput(index: number, patch: Partial<SupplementalLight>): void {
    this._setDraft(
      this._draft.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  private _addWindow(outputIndex: number): void {
    const target = this._draft[outputIndex];
    if (!target) return;
    const nextWin: SupplementalLightWindow = {
      id: newId('win'),
      start_anchor: 'lights_on',
      start_offset_minutes: 0,
      end_anchor: 'lights_on',
      end_offset_minutes: 60,
    };
    this._patchOutput(outputIndex, { windows: [...target.windows, nextWin] });
  }

  private _removeWindow(outputIndex: number, winIndex: number): void {
    const target = this._draft[outputIndex];
    if (!target) return;
    this._patchOutput(outputIndex, {
      windows: target.windows.filter((_, i) => i !== winIndex),
    });
  }

  private _patchWindow(
    outputIndex: number,
    winIndex: number,
    patch: Partial<SupplementalLightWindow>
  ): void {
    const target = this._draft[outputIndex];
    if (!target) return;
    this._patchOutput(outputIndex, {
      windows: target.windows.map((w, i) => (i === winIndex ? { ...w, ...patch } : w)),
    });
  }

  private _save(releaseAnyway: boolean): void {
    this.dispatchEvent(
      new CustomEvent('save-supplemental-lights', {
        detail: { supplementalLights: this._draft, releaseAnyway },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _cancelRelease(): void {
    this.dispatchEvent(
      new CustomEvent('cancel-supplemental-release', {
        bubbles: true,
        composed: true,
      })
    );
  }

  render(): TemplateResult {
    return html`
      <div class="detail-card">
        <config-section-header
          .icon=${mdiWhiteBalanceSunny}
          label="Supplemental Lights"
        ></config-section-header>
        <div class="supp-list">
          <p class="anchor-note">
            Schedule auxiliary lights or switches on windows inside the planned main-light cycle.
          </p>

          ${this._draft.map((light, idx) => this._renderOutput(light, idx))}

          <div class="actions-row">
            <button type="button" class="btn-secondary" @click=${this._addOutput}>
              <svg style="width:16px;height:16px;vertical-align:middle" viewBox="0 0 24 24">
                <path fill="currentColor" d=${mdiPlus}></path>
              </svg>
              Add supplemental light
            </button>
            <button
              type="button"
              class="btn-primary"
              ?disabled=${this.saving}
              @click=${() => this._save(false)}
            >
              ${this.saving ? 'Saving…' : 'Save supplemental lights'}
            </button>
          </div>

          ${this.errorMessage
            ? html`<div class="error-banner" role="alert">${this.errorMessage}</div>`
            : nothing}
          ${this.releaseBlockers.length > 0
            ? html`
                <div class="warning-banner" role="alert">
                  <strong>Could not switch off output before releasing:</strong>
                  ${this.releaseBlockers.map((b) => html`<div>${b.message}</div>`)}
                  <div class="actions-row">
                    <button
                      type="button"
                      class="btn-danger"
                      ?disabled=${this.saving}
                      @click=${() => this._save(true)}
                    >
                      Release anyway
                    </button>
                    <button type="button" class="btn-secondary" @click=${this._cancelRelease}>
                      Cancel
                    </button>
                  </div>
                </div>
              `
            : nothing}
        </div>
      </div>
    `;
  }

  private _renderOutput(light: SupplementalLight, idx: number): TemplateResult {
    const status = this._statusFor(light);
    return html`
      <div class="supp-item">
        <div class="supp-header">
          <gm-entity-picker
            label="Light or Switch"
            .value=${light.entity_id}
            .options=${this.entityOptions}
            @entity-picked=${(e: CustomEvent<string>) =>
              this._patchOutput(idx, { entity_id: e.detail })}
          ></gm-entity-picker>
          <button
            type="button"
            class="icon-btn"
            aria-label="Remove supplemental light"
            @click=${() => this._removeOutput(idx)}
          >
            <svg style="width:18px;height:18px;vertical-align:middle" viewBox="0 0 24 24">
              <path fill="currentColor" d=${mdiDelete}></path>
            </svg>
          </button>
        </div>

        <label class="checkbox-label">
          <input
            type="checkbox"
            .checked=${light.enabled}
            @change=${(e: Event) =>
              this._patchOutput(idx, { enabled: (e.target as HTMLInputElement).checked })}
          />
          Enabled
        </label>

        ${status ? this._renderStatus(status) : nothing}

        ${light.windows.map((win, wIdx) => this._renderWindow(idx, win, wIdx))}

        <div class="actions-row">
          <button type="button" class="btn-secondary" @click=${() => this._addWindow(idx)}>
            + Add window
          </button>
        </div>
      </div>
    `;
  }

  private _renderStatus(status: SupplementalLightStatus): TemplateResult {
    const pillClass =
      status.reported_state === 'on'
        ? 'state-pill on'
        : !status.available
          ? 'state-pill unavailable'
          : 'state-pill';
    return html`
      <div class="supp-status">
        <div class="supp-status-row">
          <span class=${pillClass}>State: ${status.reported_state}</span>
          ${status.current_window
            ? html`<span>
                Active: ${formatWindowTimestamp(status.current_window.start)} –
                ${formatWindowTimestamp(status.current_window.end)}
              </span>`
            : status.next_window
              ? html`<span>
                  Next: ${formatWindowTimestamp(status.next_window.start)} –
                  ${formatWindowTimestamp(status.next_window.end)}
                </span>`
              : nothing}
        </div>
        ${status.held_off_reason ? html`<div>${status.held_off_reason}</div>` : nothing}
        ${status.skipped_windows.map(
          (sw) => html`<div class="preview-err">Skipped window ${sw.window_id}: ${sw.reason}</div>`
        )}
      </div>
    `;
  }

  private _renderWindow(
    outputIdx: number,
    win: SupplementalLightWindow,
    winIdx: number
  ): TemplateResult {
    const preview = resolveSupplementalWindowPreview(
      win,
      this.lightsOnTime,
      this.photoperiodHours
    );
    return html`
      <div class="window-row">
        <div class="window-controls">
          <select
            aria-label="Start anchor"
            .value=${win.start_anchor}
            @change=${(e: Event) =>
              this._patchWindow(outputIdx, winIdx, {
                start_anchor: (e.target as HTMLSelectElement).value as SupplementalAnchor,
              })}
          >
            <option value="lights_on">Planned lights-on</option>
            <option value="lights_off">Planned lights-off</option>
          </select>
          <input
            type="number"
            aria-label="Start offset minutes"
            .value=${String(win.start_offset_minutes)}
            @change=${(e: Event) =>
              this._patchWindow(outputIdx, winIdx, {
                start_offset_minutes: Number.parseInt(
                  (e.target as HTMLInputElement).value || '0',
                  10
                ),
              })}
          />
          <span>to</span>
          <select
            aria-label="End anchor"
            .value=${win.end_anchor}
            @change=${(e: Event) =>
              this._patchWindow(outputIdx, winIdx, {
                end_anchor: (e.target as HTMLSelectElement).value as SupplementalAnchor,
              })}
          >
            <option value="lights_on">Planned lights-on</option>
            <option value="lights_off">Planned lights-off</option>
          </select>
          <input
            type="number"
            aria-label="End offset minutes"
            .value=${String(win.end_offset_minutes)}
            @change=${(e: Event) =>
              this._patchWindow(outputIdx, winIdx, {
                end_offset_minutes: Number.parseInt(
                  (e.target as HTMLInputElement).value || '0',
                  10
                ),
              })}
          />
          <button
            type="button"
            class="icon-btn"
            aria-label="Remove window"
            @click=${() => this._removeWindow(outputIdx, winIdx)}
          >
            ×
          </button>
        </div>
        ${preview.valid
          ? html`<div class="preview-ok">Local preview: ${preview.startTime} – ${preview.endTime}</div>`
          : html`<div class="preview-err">${preview.error}</div>`}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'config-supplemental-lights-editor': ConfigSupplementalLightsEditor;
  }
}
