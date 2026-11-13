import { css, html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiWhiteBalanceSunny } from '@mdi/js';
import { dialogStyles } from '../../../styles/dialog.styles';
import type {
  SupplementalLight,
  SupplementalLightEdit,
  SupplementalLightSchedule,
} from '../../../slices/growspace/supplemental-lights';
import '../../shared/ui/gm-entity-picker';
import './config-section-header';

type Endpoint = SupplementalLight['windows'][number]['start'];

const newWindow = (): SupplementalLight['windows'][number] => ({
  start: { anchor: 'lights_on', offset_minutes: 0 },
  end: { anchor: 'lights_off', offset_minutes: 0 },
});

@customElement('supplemental-lights-editor')
export class SupplementalLightsEditor extends LitElement {
  @property({ attribute: false }) entityOptions: string[] = [];
  @property({ attribute: false }) schedule?: SupplementalLightSchedule;
  @property({ attribute: false }) edit?: SupplementalLightEdit;
  @property({ attribute: false }) readError = '';
  @property({ attribute: false }) canEdit = true;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }
      .light-list,
      .edit,
      .window {
        display: grid;
        gap: 12px;
      }
      ul.light-list {
        padding: 0;
        margin: 0;
        list-style: none;
      }
      .light-row,
      .window,
      .release {
        padding-block: 12px;
        border-top: 1px solid var(--divider-color);
      }
      .light-heading,
      .actions {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
      }
      .light-heading strong {
        flex: 1;
        overflow-wrap: anywhere;
      }
      p {
        margin: 4px 0;
        overflow-wrap: anywhere;
      }
      .secondary {
        color: var(--secondary-text-color);
      }
      .endpoint {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 130px), 1fr));
        gap: 8px;
      }
      .endpoint label {
        display: grid;
        gap: 4px;
      }
      .endpoint input,
      .endpoint select {
        min-width: 0;
        min-height: 44px;
        padding-inline: 8px;
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        color: var(--primary-text-color);
        background: var(--card-background-color);
        font: inherit;
      }
      .window {
        min-width: 0;
        margin: 0;
        border: 0;
        border-top: 1px solid var(--divider-color);
        padding-inline: 0;
      }
      .window legend {
        padding: 0 8px 0 0;
        font-weight: 600;
      }
      .md3-button {
        min-height: 44px;
      }
    `,
  ];

  private _changeEdit(edit?: SupplementalLightEdit): void {
    this.dispatchEvent(
      new CustomEvent('supplemental-edit-changed', {
        detail: edit,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _setLight(patch: Partial<SupplementalLight>): void {
    if (!this.edit || this.edit.saving) return;
    this._changeEdit({
      original: this.edit.original,
      light: { ...this.edit.light, ...patch },
    });
  }

  private _save(remove: boolean, releaseAnyway = false): void {
    this.dispatchEvent(
      new CustomEvent('supplemental-save-requested', {
        detail: { remove, releaseAnyway },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _endpointMinutes(endpoint: Endpoint, duration: number): number {
    return (endpoint.anchor === 'lights_off' ? duration : 0) + endpoint.offset_minutes;
  }

  private _preview(window: SupplementalLight['windows'][number]): string {
    const cycle = this.schedule?.cycle;
    if (!cycle) return 'Configure a managed main light to preview this window.';
    const start = this._endpointMinutes(window.start, cycle.duration_minutes);
    const end = this._endpointMinutes(window.end, cycle.duration_minutes);
    if (!Number.isInteger(start) || !Number.isInteger(end)) return 'Enter whole minutes.';
    const clock = (offset: number) => {
      const absolute = cycle.start_minute + offset;
      const minuteOfDay = ((absolute % 1440) + 1440) % 1440;
      const hour = String(Math.floor(minuteOfDay / 60)).padStart(2, '0');
      const minute = String(minuteOfDay % 60).padStart(2, '0');
      const day = Math.floor(absolute / 1440);
      return `${hour}:${minute}${day === 1 ? ' next day' : day === -1 ? ' previous day' : ''}`;
    };
    const range = `${clock(start)}–${clock(end)}`;
    if (start >= end) return `${range}. End must follow start.`;
    if (start < 0 || end > cycle.duration_minutes) return `${range}. Outside the main-light cycle.`;
    return range;
  }

  private _endpoint(endpoint: Endpoint, label: string, update: (endpoint: Endpoint) => void) {
    return html`
      <div class="endpoint">
        <label>
          ${label} anchor
          <select
            .value=${endpoint.anchor}
            ?disabled=${this.edit?.saving}
            @change=${(event: Event) => {
              const value = (event.target as HTMLSelectElement).value;
              update({ ...endpoint, anchor: value === 'lights_off' ? 'lights_off' : 'lights_on' });
            }}
          >
            <option value="lights_on">Main lights-on</option>
            <option value="lights_off">Main lights-off</option>
          </select>
        </label>
        <label>
          ${label} offset (min)
          <input
            type="number"
            min="-1440"
            max="1440"
            step="1"
            .value=${Number.isNaN(endpoint.offset_minutes) ? '' : String(endpoint.offset_minutes)}
            ?disabled=${this.edit?.saving}
            @input=${(event: Event) =>
              update({
                ...endpoint,
                offset_minutes: (event.target as HTMLInputElement).valueAsNumber,
              })}
          />
        </label>
      </div>
    `;
  }

  private _renderEdit(edit: SupplementalLightEdit) {
    const { light, original, saving } = edit;
    const windows = light.windows;
    const setEndpoint = (index: number, key: 'start' | 'end', endpoint: Endpoint) =>
      this._setLight({
        windows: windows.map((window, i) =>
          i === index ? { ...window, [key]: endpoint } : window
        ),
      });
    const offsetsValid = windows.every(({ start, end }) =>
      [start, end].every(
        ({ offset_minutes }) => Number.isInteger(offset_minutes) && Math.abs(offset_minutes) <= 1440
      )
    );
    return html`
      <div class="edit" aria-busy=${saving}>
        <gm-entity-picker
          label="Supplemental light or switch"
          .value=${light.entity_id}
          .options=${this.entityOptions}
          ?disabled=${saving}
          @entity-picked=${(event: CustomEvent<string>) =>
            this._setLight({ entity_id: event.detail })}
        ></gm-entity-picker>
        <label class="checkbox-label">
          <input
            type="checkbox"
            .checked=${light.enabled}
            ?disabled=${saving}
            @change=${(event: Event) =>
              this._setLight({ enabled: (event.target as HTMLInputElement).checked })}
          />
          Enable Supplemental Light
        </label>
        ${windows.map(
          (window, index) => html`
            <fieldset class="window">
              <legend>Window ${index + 1}</legend>
              ${this._endpoint(window.start, 'Start', (endpoint) =>
                setEndpoint(index, 'start', endpoint)
              )}
              ${this._endpoint(window.end, 'End', (endpoint) =>
                setEndpoint(index, 'end', endpoint)
              )}
              <p class="secondary" aria-live="polite">${this._preview(window)}</p>
              ${windows.length > 1
                ? html`<button
                    class="md3-button text"
                    type="button"
                    ?disabled=${saving}
                    @click=${() =>
                      this._setLight({ windows: windows.filter((_, i) => i !== index) })}
                  >
                    Remove window ${index + 1}
                  </button>`
                : nothing}
            </fieldset>
          `
        )}
        <button
          class="md3-button tonal"
          type="button"
          ?disabled=${saving}
          @click=${() => this._setLight({ windows: [...windows, newWindow()] })}
        >
          Add window
        </button>
        ${edit.error ? html`<p role="alert">${edit.error}</p>` : nothing}
        ${edit.release
          ? html`<div class="release">
              <p role="alert">${edit.release.reason} ${edit.release.entityId} may stay on.</p>
              <div class="actions">
                <button
                  class="md3-button tonal"
                  type="button"
                  ?disabled=${saving}
                  @click=${() => {
                    this._changeEdit({ ...edit, release: undefined });
                  }}
                >
                  Keep assignment
                </button>
                <button
                  class="md3-button text"
                  type="button"
                  ?disabled=${saving}
                  @click=${() => edit.release && this._save(edit.release.remove, true)}
                >
                  Release anyway
                </button>
              </div>
            </div>`
          : html`<div class="actions">
              <button
                class="md3-button filled"
                type="button"
                ?disabled=${saving || !light.entity_id || !offsetsValid}
                @click=${() => this._save(false)}
              >
                Save Supplemental Light
              </button>
              <button
                class="md3-button tonal"
                type="button"
                ?disabled=${saving}
                @click=${() => {
                  this._changeEdit();
                }}
              >
                Cancel
              </button>
              ${original
                ? html`<button
                    class="md3-button text"
                    type="button"
                    ?disabled=${saving}
                    @click=${() => this._save(true)}
                  >
                    Delete assignment
                  </button>`
                : nothing}
            </div>`}
      </div>
    `;
  }

  render() {
    return html`
      <div class="detail-card">
        <config-section-header .icon=${mdiWhiteBalanceSunny} label="Supplemental Lights">
        </config-section-header>
        ${this.readError ? html`<p role="status">${this.readError}</p>` : nothing}
        ${this.schedule
          ? html`
              ${this.schedule.lights.length
                ? html`<ul class="light-list">
                    ${this.schedule.lights.map(
                      ({ light, state, active, window, reason, warnings }) => html`
                        <li class="light-row">
                          <div class="light-heading">
                            <strong>${light.entity_id}</strong>
                            <span>Reported ${state}</span>
                            ${this.canEdit
                              ? html`<button
                                  class="md3-button tonal"
                                  type="button"
                                  aria-label=${`Edit ${light.entity_id}`}
                                  ?disabled=${Boolean(this.edit)}
                                  @click=${() => {
                                    this._changeEdit({ original: light.entity_id, light });
                                  }}
                                >
                                  Edit
                                </button>`
                              : nothing}
                          </div>
                          ${window && light.enabled
                            ? html`<p>
                                ${active ? 'Current window' : 'Next window'} ·
                                ${window.start}–${window.end}
                              </p>`
                            : nothing}
                          ${reason ? html`<p class="secondary">${reason}</p>` : nothing}
                          ${warnings.map((warning) => html`<p>${warning}</p>`)}
                        </li>
                      `
                    )}
                  </ul>`
                : nothing}
              ${!this.schedule.cycle
                ? html`<p class="secondary">
                    Save a managed main light before adding a Supplemental Light.
                  </p>`
                : nothing}
              ${this.edit
                ? this._renderEdit(this.edit)
                : this.canEdit
                  ? html`<button
                      class="md3-button tonal"
                      type="button"
                      ?disabled=${!this.schedule.cycle}
                      @click=${() => {
                        this._changeEdit({
                          light: { entity_id: '', enabled: true, windows: [newWindow()] },
                        });
                      }}
                    >
                      Add Supplemental Light
                    </button>`
                  : nothing}
            `
          : !this.readError
            ? html`<p role="status">Loading Supplemental Lights…</p>`
            : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'supplemental-lights-editor': SupplementalLightsEditor;
  }
}
