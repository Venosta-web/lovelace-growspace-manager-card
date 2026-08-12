/**
 * Config Vision Tab Component (ADR-0019, "Applied to Config Dialog")
 *
 * The dumb presentational element for the Config Dialog's Vision AI tab — a
 * camera-entity picker plus the vision-checkup schedule form (gated on
 * `hasCameras`). `@property .vm: VisionTabViewModel` in, a single
 * `env-draft-changed` Tab Intent out, **no `@state()` and no `hass`**. Markup +
 * multi-select styles transcribed from the former inline `_renderVisionSection`.
 *
 * Tab Intent (the Shell translates it to `UPDATE_ENV_DRAFT`):
 *   - `env-draft-changed`  detail: { partial: Partial<EnvironmentDraft> }
 */

import { LitElement, html, css, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiCamera } from '@mdi/js';
import { dialogStyles } from '../../../styles/dialog.styles';
import '../../shared/ui/md3-number-input';
import type { EnvironmentDraft } from '../../../dialogs/config-dialog-sm';
import type { VisionTabViewModel } from '../viewmodels/vision-tab.viewmodel';

@customElement('config-vision-tab')
export class ConfigVisionTab extends LitElement {
  @property({ attribute: false }) vm!: VisionTabViewModel;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }
      .form-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.875rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
      }
      .checkbox-label input[type='checkbox'] {
        width: 20px;
        height: 20px;
        cursor: pointer;
      }
      .multi-select-container {
        position: relative;
        margin-bottom: 0;
      }
      .multi-select-box {
        background: rgba(var(--card-background-color, 255, 255, 255), 0.05);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border-radius: 4px 4px 0 0;
        border-bottom: 1px solid var(--primary-text-color, rgba(255, 255, 255, 0.4));
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        padding: 26px 16px 6px;
        min-height: 56px;
        box-sizing: border-box;
        position: relative;
        transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
      }
      .md3-label-multi {
        position: absolute;
        top: 8px;
        left: 16px;
        font-size: 0.75rem;
        color: var(--secondary-text-color);
        pointer-events: none;
        z-index: 10;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.1));
        border-radius: 16px;
        padding: 0 4px 0 12px;
        font-size: 0.9rem;
        min-height: 44px;
      }
      .chip-remove {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 44px;
        min-height: 44px;
        padding: 0;
        border: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        cursor: pointer;
        margin-left: 2px;
        font-weight: bold;
        opacity: 0.7;
      }
      .chip-remove:hover {
        opacity: 1;
      }
      .chip-remove:focus-visible {
        outline: 2px solid var(--primary-text-color, #fff);
        outline-offset: -4px;
        opacity: 1;
      }
      .search-input-inner {
        flex: 1;
        min-width: 100px;
        border: none;
        background: transparent;
        color: var(--primary-text-color);
        font-family: inherit;
        font-size: 1rem;
        padding: 0;
        margin: 0;
        height: 24px;
        outline: none;
      }
    `,
  ];

  private _update(partial: Partial<EnvironmentDraft>): void {
    this.dispatchEvent(
      new CustomEvent('env-draft-changed', { detail: { partial }, bubbles: true, composed: true })
    );
  }

  render(): TemplateResult {
    const vm = this.vm;
    return html`
      <div class="detail-card">
        <div
          style="display:flex;align-items:center;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--divider-color,rgba(255,255,255,0.1));padding-bottom:8px;"
        >
          <svg
            style="width:20px;height:20px;fill:var(--primary-color,#4caf50);"
            viewBox="0 0 24 24"
          >
            <path d="${mdiCamera}"></path>
          </svg>
          <h3 style="margin:0;border:none;padding:0;">Vision Checkup</h3>
        </div>
        ${this._cameraSelect(vm)}
        ${!vm.hasCameras
          ? html`<p style="opacity:0.6;font-size:0.85rem;margin:8px 0 0;">
              Add camera entities above to enable vision checkups.
            </p>`
          : html`
              <div class="form-section" style="margin-top:12px;">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    .checked=${vm.visionEnabled}
                    @change=${(e: Event) =>
                      this._update({ visionEnabled: (e.target as HTMLInputElement).checked })}
                  />
                  Enable automatic vision checkups
                </label>
                <md3-number-input
                  label="Early check offset (min after lights on)"
                  .value=${vm.earlyOffset}
                  @change=${(e: CustomEvent) =>
                    this._update({ visionEarlyOffset: Number(e.detail) })}
                  min="1"
                ></md3-number-input>
                <md3-number-input
                  label="Mid check (hours into light cycle)"
                  .value=${vm.midHours}
                  @change=${(e: CustomEvent) => this._update({ visionMidHours: Number(e.detail) })}
                  min="1"
                ></md3-number-input>
                <md3-number-input
                  label="Late check offset (min before lights off)"
                  .value=${vm.lateOffset}
                  @change=${(e: CustomEvent) =>
                    this._update({ visionLateOffset: Number(e.detail) })}
                  min="1"
                ></md3-number-input>
              </div>
            `}
      </div>
    `;
  }

  private _cameraSelect(vm: VisionTabViewModel): TemplateResult {
    const values = vm.cameraEntities;
    return html`
      <div class="multi-select-container">
        <label class="md3-label-multi">Camera Entities</label>
        <div class="multi-select-box">
          ${values.map(
            (val) => html`
              <div class="chip">
                ${val}
                <button
                  type="button"
                  class="chip-remove"
                  aria-label=${`Remove ${val}`}
                  title=${`Remove ${val}`}
                  @click=${() => this._update({ cameraEntities: values.filter((v) => v !== val) })}
                >
                  ×
                </button>
              </div>
            `
          )}
          <input
            class="search-input-inner"
            list="list-multi-cameraEntities"
            placeholder=${values.length === 0 ? 'Add Entity...' : ''}
            @change=${(e: Event) => {
              const input = e.target as HTMLInputElement;
              const val = input.value;
              if (val && !values.includes(val)) this._update({ cameraEntities: [...values, val] });
              input.value = '';
            }}
          />
        </div>
        <datalist id="list-multi-cameraEntities">
          ${vm.cameraOptions.map((eid) => html`<option value="${eid}"></option>`)}
        </datalist>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'config-vision-tab': ConfigVisionTab;
  }
}
