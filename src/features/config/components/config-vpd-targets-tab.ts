/**
 * Config VPD Targets Tab Component (ADR-0019, "Applied to Config Dialog")
 *
 * The dumb presentational element for the Config Dialog's VPD Targets tab — a
 * per-stage accordion of day/night low/high VPD-optimal windows plus a
 * "Reset to defaults" button. `@property .vm: VpdTargetsTabViewModel` in,
 * semantic Tab Intents out, **no `@state()` and no `hass`**. The shared
 * `<config-stage-accordion>` owns disclosure behavior while this tab projects
 * its VPD-specific summaries and Day/Night editor interiors.
 *
 * Threshold edits forward `{ key, period, slot, value }` (value is the raw
 * `md3-number-input` detail string); the Shell merges against the live draft.
 *
 * Tab Intents (the Shell translates them):
 *   - `toggle-stage`        detail: { key }
 *   - `update-vpd-optimal`  detail: { key, period, slot, value }
 *   - `reset-vpd-optimal`   (no detail)
 */

import { LitElement, html, css, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiTune, mdiWhiteBalanceSunny, mdiWeatherNight } from '@mdi/js';
import { dialogStyles } from '../../../styles/dialog.styles';
import '../../shared/ui/md3-number-input';
import './config-section-header';
import {
  stageAccordionInteriorSlot,
  stageAccordionSummarySlot,
  type ConfigStageAccordionStage,
  type ConfigStageAccordionToggleDetail,
} from './config-stage-accordion';
import type { VpdStageVM, VpdTargetsTabViewModel } from '../viewmodels/vpd-targets-tab.viewmodel';

type VpdAccordionStage = VpdStageVM & ConfigStageAccordionStage;

@customElement('config-vpd-targets-tab')
export class ConfigVpdTargetsTab extends LitElement {
  @property({ attribute: false }) vm!: VpdTargetsTabViewModel;

  static styles = [
    dialogStyles,
    css`
      :host {
        display: block;
      }
      .acc-head-desc {
        font-size: 0.775rem;
        color: var(--secondary-text-color, rgba(255, 255, 255, 0.5));
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
        /* Preserve the reference VPD editor typography during this enabling extraction. */
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
        <config-section-header .icon=${mdiTune} label="VPD Optimal Targets"></config-section-header>
        ${this._renderStages()}
        <button
          class="md3-button config-reset-button"
          @click=${() => this._emit('reset-vpd-optimal')}
          style="margin-top:12px;"
        >
          Reset to defaults
        </button>
      </div>
    `;
  }

  private _renderStages(): TemplateResult {
    const stages: VpdAccordionStage[] = this.vm.stages.map((stage) => ({
      ...stage,
      id: stage.key,
    }));
    return html`
      <config-stage-accordion
        .stages=${stages}
        @stage-accordion-toggle=${(event: CustomEvent<ConfigStageAccordionToggleDetail>) =>
          this._emit('toggle-stage', { key: event.detail.stage.id })}
      >
        ${stages.map((stage) =>
          stage.open
            ? html`
                <div slot=${stageAccordionInteriorSlot(stage.id)} class="acc-cycle-grid">
                  ${this._cycle(
                    stage.key,
                    'day',
                    'Day',
                    '#ff9800',
                    mdiWhiteBalanceSunny,
                    stage.day
                  )}
                  ${this._cycle(
                    stage.key,
                    'night',
                    'Night',
                    '#7986cb',
                    mdiWeatherNight,
                    stage.night
                  )}
                </div>
              `
            : html`
                <div slot=${stageAccordionSummarySlot(stage.id)} class="acc-head-desc">
                  Day ${stage.day.low.toFixed(2)}–${stage.day.high.toFixed(2)} &nbsp;·&nbsp; Night
                  ${stage.night.low.toFixed(2)}–${stage.night.high.toFixed(2)} kPa
                </div>
              `
        )}
      </config-stage-accordion>
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
          <md3-number-input
            label="Low (kPa)"
            .value=${pair.low}
            @change=${onChange('low')}
          ></md3-number-input>
          <md3-number-input
            label="High (kPa)"
            .value=${pair.high}
            @change=${onChange('high')}
          ></md3-number-input>
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
