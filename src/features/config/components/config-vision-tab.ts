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
import './config-entity-multi-select';
import './config-section-header';
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
        <config-section-header .icon=${mdiCamera} label="Vision Checkup"></config-section-header>
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
      <config-entity-multi-select
        label="Camera Entities"
        .values=${values}
        .options=${vm.cameraOptions}
        list-id="list-multi-cameraEntities"
        @entity-values-changed=${(event: CustomEvent<{ values: string[] }>) =>
          this._update({ cameraEntities: event.detail.values })}
      ></config-entity-multi-select>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'config-vision-tab': ConfigVisionTab;
  }
}
