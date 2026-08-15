/**
 * Config Heatmap Tab Component (ADR-0019, "Applied to Config Dialog")
 *
 * The dumb presentational element for the Config Dialog's 3D-Heatmap tab — the
 * sensor-group list. `@property .vm: HeatmapTabViewModel` in, semantic Tab
 * Intents out, **no `@state()` and no `hass`**. Markup transcribed from the
 * former inline `_renderHeatmapSection`. The group editor itself is the Shell's
 * `<sensor-group-dialog>` modal, not part of this tab.
 *
 * Tab Intents (the Shell translates them):
 *   - `add-group-requested`    (no detail)
 *   - `edit-group-requested`   detail: { group }
 *   - `delete-group-requested` detail: { id }
 */

import { LitElement, html, css, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiPencil, mdiDelete } from '@mdi/js';
import { dialogStyles } from '../../../styles/dialog.styles';
import type { SensorGroup } from '../../../types';
import type { HeatmapTabViewModel } from '../viewmodels/heatmap-tab.viewmodel';

@customElement('config-heatmap-tab')
export class ConfigHeatmapTab extends LitElement {
  @property({ attribute: false }) vm!: HeatmapTabViewModel;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }
    `,
  ];

  private _emit(type: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  render(): TemplateResult {
    return html`
      <div class="detail-card">
        <div
          style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"
        >
          <h3>Sensor Groups</h3>
          <button class="md3-button tonal" @click=${() => this._emit('add-group-requested')}>
            Add Group
          </button>
        </div>
        ${this.vm.showEmpty
          ? html`<div style="text-align:center;padding:20px;color:var(--secondary-text-color);">
              No sensor groups configured.
            </div>`
          : html`
              <div style="display:flex;flex-direction:column;gap:8px;">
                ${this.vm.groups.map((group) => this._renderGroup(group))}
              </div>
            `}
      </div>
    `;
  }

  private _renderGroup(group: SensorGroup): TemplateResult {
    return html`
      <div
        style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);padding:12px;border-radius:8px;"
      >
        <div>
          <div style="font-weight:500;">${group.name}</div>
          <div style="font-size:var(--font-size-supporting);color:var(--secondary-text-color);">
            X: ${group.x}, Y: ${group.y}, Z: ${group.z}
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button
            class="md3-button text"
            @click=${() => this._emit('edit-group-requested', { group })}
            style="padding:8px;min-width:auto;"
            aria-label=${`Edit ${group.name}`}
            title=${`Edit ${group.name}`}
          >
            <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${mdiPencil}"></path>
            </svg>
          </button>
          <button
            class="md3-button text danger"
            @click=${() => this._emit('delete-group-requested', { id: group.id })}
            style="padding:8px;min-width:auto;"
            aria-label=${`Delete ${group.name}`}
            title=${`Delete ${group.name}`}
          >
            <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${mdiDelete}"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'config-heatmap-tab': ConfigHeatmapTab;
  }
}
