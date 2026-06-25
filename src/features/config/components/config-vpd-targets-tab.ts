/**
 * Config VPD Targets Tab Component (ADR-0019, "Applied to Config Dialog")
 *
 * The dumb presentational element for the Config Dialog's VPD Targets tab — a
 * per-stage accordion of day/night low/high VPD-optimal windows plus a
 * "Reset all to defaults" button. `@property .vm: VpdTargetsTabViewModel` in,
 * semantic Tab Intents out, **no `@state()` and no `hass`**. Markup + `acc-*`
 * accordion styles transcribed from the former inline `_renderVpdTargetsSection`.
 *
 * Threshold edits forward `{ key, period, slot, value }` (value is the raw
 * `md3-number-input` detail string); the Shell merges against the live draft.
 *
 * Tab Intents (the Shell translates them):
 *   - `toggle-stage`        detail: { key }
 *   - `update-vpd-optimal`  detail: { key, period, slot, value }
 *   - `reset-vpd-optimal`   (no detail)
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiTune, mdiChevronDown, mdiWhiteBalanceSunny, mdiWeatherNight } from '@mdi/js';
import { dialogStyles } from '../../../styles/dialog.styles';
import '../../shared/ui/md3-number-input';
import type { VpdStageVM, VpdTargetsTabViewModel } from '../viewmodels/vpd-targets-tab.viewmodel';

@customElement('config-vpd-targets-tab')
export class ConfigVpdTargetsTab extends LitElement {
  @property({ attribute: false }) vm!: VpdTargetsTabViewModel;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }
      .acc-card {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
        border-radius: 10px;
        overflow: hidden;
      }
      .acc-head {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 13px 16px;
        cursor: pointer;
        user-select: none;
        transition: background 0.15s;
      }
      .acc-head:hover {
        background: rgba(255, 255, 255, 0.03);
      }
      .acc-stage-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .acc-head-title {
        flex: 1;
        font-size: 0.9rem;
        font-weight: 500;
      }
      .acc-head-desc {
        font-size: 0.775rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.5));
      }
      .acc-chev {
        width: 20px;
        height: 20px;
        fill: var(--secondary-text-color, rgba(255, 255, 255, 0.5));
        transition: transform 0.2s;
        flex-shrink: 0;
      }
      .acc-chev.open {
        transform: rotate(180deg);
      }
      .acc-body {
        padding: 16px;
        border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.06));
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .acc-cycle-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .acc-cycle-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.8rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.6));
      }
      .acc-cycle-row svg {
        width: 14px;
        height: 14px;
        fill: currentColor;
        flex-shrink: 0;
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
          style="display:flex;align-items:center;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--divider-color,rgba(255,255,255,0.1));padding-bottom:8px;"
        >
          <svg style="width:20px;height:20px;fill:var(--primary-color,#4caf50);" viewBox="0 0 24 24">
            <path d="${mdiTune}"></path>
          </svg>
          <h3 style="margin:0;border:none;padding:0;">VPD Optimal Targets</h3>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${this.vm.stages.map((stage) => this._renderStage(stage))}
        </div>
        <button
          class="md3-button text"
          @click=${() => this._emit('reset-vpd-optimal')}
          style="margin-top:12px;"
        >
          Reset all to defaults
        </button>
      </div>
    `;
  }

  private _renderStage(stage: VpdStageVM): TemplateResult {
    return html`
      <div class="acc-card">
        <div class="acc-head" @click=${() => this._emit('toggle-stage', { key: stage.key })}>
          <div class="acc-stage-dot" style="background:${stage.color};"></div>
          <div class="acc-head-title">${stage.label}</div>
          ${!stage.open
            ? html`
                <div class="acc-head-desc">
                  Day ${stage.day.low.toFixed(2)}–${stage.day.high.toFixed(2)} &nbsp;·&nbsp; Night
                  ${stage.night.low.toFixed(2)}–${stage.night.high.toFixed(2)} kPa
                </div>
              `
            : nothing}
          <svg class="acc-chev ${stage.open ? 'open' : ''}" viewBox="0 0 24 24">
            <path d="${mdiChevronDown}"></path>
          </svg>
        </div>
        ${stage.open
          ? html`
              <div class="acc-body">
                <div class="acc-cycle-grid">
                  ${this._cycle(stage.key, 'day', 'Day', '#ff9800', mdiWhiteBalanceSunny, stage.day)}
                  ${this._cycle(stage.key, 'night', 'Night', '#7986cb', mdiWeatherNight, stage.night)}
                </div>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _cycle(
    key: string,
    period: 'day' | 'night',
    label: string,
    color: string,
    icon: string,
    pair: { low: number; high: number }
  ): TemplateResult {
    const onChange = (slot: 'low' | 'high') => (e: CustomEvent) =>
      this._emit('update-vpd-optimal', { key, period, slot, value: e.detail });
    return html`
      <div>
        <div class="acc-cycle-row" style="color:${color};">
          <svg viewBox="0 0 24 24"><path d="${icon}"></path></svg>
          ${label}
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">
          <md3-number-input label="Low (kPa)" .value=${pair.low} @change=${onChange('low')}></md3-number-input>
          <md3-number-input label="High (kPa)" .value=${pair.high} @change=${onChange('high')}></md3-number-input>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'config-vpd-targets-tab': ConfigVpdTargetsTab;
  }
}
