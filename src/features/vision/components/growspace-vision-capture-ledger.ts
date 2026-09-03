/**
 * One capture, as the **two-channel ledger** (growspace_manager_workspace#92,
 * variant B).
 *
 * Layout is the argument. Reading down:
 *
 *   Capture Continuity Break   equipment banner, only when a streak is active
 *   Gate strip                 Frame Quality Result · Baseline State
 *   ── two columns ──          what the camera saw │ what the sensors measured
 *   Fusion band                the ONLY place both channels are named
 *
 * The two columns are siblings in one grid with a rule between them, never
 * nested, so no amount of later editing can make one read as an annotation of
 * the other. The Anomaly Score appears as a sentence in the left column; its
 * decimal exists only inside the "Numbers behind this" disclosure.
 *
 * Dumb by contract (ADR-0019): `vm` in, nothing out, no `hass`, no `@state()`.
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { sharedStyles } from '../../../styles/shared.styles';
import { statusTokens } from '../../../styles/status.styles';
import { visionToneTokens, visionTextStyles } from '../vision-evidence.styles';
import type {
  CaptureViewModel,
  ContinuityViewModel,
  EnvironmentViewModel,
  FusionViewModel,
  GateItemViewModel,
  MeasureRow,
  ToneCue,
  TrendViewModel,
  VisualViewModel,
} from '../vision-evidence.viewmodel';

@customElement('growspace-vision-capture-ledger')
export class GrowspaceVisionCaptureLedger extends LitElement {
  @property({ attribute: false }) vm!: CaptureViewModel;

  static styles = [
    sharedStyles,
    statusTokens,
    visionToneTokens,
    visionTextStyles,
    css`
      :host {
        display: block;
        /* Own container so the ledger reflows on ITS width, not the viewport's:
           it renders inside a dialog whose width is unrelated to the screen. */
        container-type: inline-size;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: 12px;
        overflow: hidden;
        background: var(--surface-container-lowest, rgba(0, 0, 0, 0.2));
      }

      header.capture-head {
        display: flex;
        align-items: baseline;
        gap: 8px;
        flex-wrap: wrap;
        padding: 12px 16px;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
      }

      header.capture-head h4 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
      }

      /* Equipment class. Off the severity ramp on purpose — see the styles module. */
      .continuity {
        display: flex;
        gap: 12px;
        padding: 12px 16px;
        border-inline-start: 3px solid var(--tone);
        background: color-mix(in srgb, var(--tone) 10%, transparent);
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
      }

      .continuity svg.kind {
        width: 20px;
        height: 20px;
        fill: var(--tone);
        flex-shrink: 0;
      }

      .continuity h5 {
        margin: 0;
        font-size: 0.9375rem;
        font-weight: 600;
      }

      .gate {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
        align-items: center;
        padding: 10px 16px;
        background: var(--surface-container-low, rgba(255, 255, 255, 0.04));
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
      }

      .gate-item {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .gate-reasons {
        flex-basis: 100%;
      }

      .channels {
        display: grid;
        grid-template-columns: 1fr 1px 1fr;
      }

      .rule {
        background: var(--divider-color, rgba(255, 255, 255, 0.12));
      }

      /* One column below the width where two columns stop being two columns. */
      @container (max-width: 620px) {
        .channels {
          grid-template-columns: 1fr;
        }
        .rule {
          height: 1px;
          width: auto;
        }
      }

      section.channel {
        padding: 16px;
        min-width: 0;
      }

      section.channel > h5 {
        margin: 0;
        font-size: 0.875rem;
        font-weight: 600;
        display: flex;
        align-items: baseline;
        gap: 8px;
      }

      .verdict {
        font-size: 1.125rem;
        font-weight: 500;
        color: var(--tone);
        margin: 10px 0 0;
      }

      .rank {
        margin-top: 8px;
        padding-inline-start: 10px;
        border-inline-start: 2px solid var(--divider-color, rgba(255, 255, 255, 0.12));
      }

      img.frame {
        display: block;
        width: 100%;
        height: auto;
        max-height: 220px;
        object-fit: cover;
        border-radius: 8px;
        margin-bottom: 10px;
        background: var(--surface-container-low, rgba(255, 255, 255, 0.04));
      }

      .frame-missing {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 96px;
        border-radius: 8px;
        margin-bottom: 10px;
        border: 1px dashed var(--divider-color, rgba(255, 255, 255, 0.2));
        text-align: center;
        padding: 12px;
      }

      .spark {
        margin-top: 10px;
      }

      .spark svg {
        max-width: 100%;
        height: auto;
        display: block;
      }

      .spark-legend {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 2px;
      }

      .env-history {
        display: flex;
        gap: 3px;
        margin-top: 4px;
        flex-wrap: wrap;
      }

      .env-history span {
        width: 14px;
        height: 14px;
        border-radius: 3px;
        flex: none;
      }

      .env-history span.risk {
        background: var(--gm-vision-watch);
      }

      .env-history span.clear {
        background: var(--gm-vision-calm);
      }

      .fusion {
        padding: 16px;
        border-top: 2px solid var(--tone);
        background: var(--surface-container-low, rgba(255, 255, 255, 0.04));
      }

      .fusion-title {
        display: flex;
        align-items: baseline;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 4px;
      }

      .fusion-title strong {
        font-size: 1rem;
        font-weight: 500;
      }

      .report {
        margin-top: 12px;
      }

      .report p {
        margin: 6px 0 0;
      }
    `,
  ];

  private _cue(cue: ToneCue, hide = false): TemplateResult {
    return html`<span class="cue">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d=${cue.icon}></path></svg>
      ${hide ? nothing : html`<span>${cue.label}</span>`}
    </span>`;
  }

  render(): TemplateResult {
    const vm = this.vm;
    return html`
      <header class="capture-head">
        <h4>${vm.cameraName}</h4>
        <span class="xs">${vm.capturedAt}</span>
      </header>
      ${this._continuity(vm.continuity)} ${this._gate()}
      <div class="channels">
        ${this._visual(vm.visual)}
        <div class="rule" role="presentation"></div>
        ${this._environment(vm.environment)}
      </div>
      ${this._fusion(vm.fusion)}
    `;
  }

  private _continuity(continuity: ContinuityViewModel | null): TemplateResult | typeof nothing {
    if (!continuity) return nothing;
    return html`
      <section class="continuity tone-${continuity.tone}" aria-labelledby="continuity-heading">
        <svg class="kind" viewBox="0 0 24 24" aria-hidden="true">
          <path d=${continuity.cue.icon}></path>
        </svg>
        <div>
          <p class="eyebrow">${continuity.kind}</p>
          <h5 id="continuity-heading">${continuity.title}</h5>
          <p class="supporting">${continuity.detail}</p>
          <p class="xs caveat">${continuity.note}</p>
        </div>
      </section>
    `;
  }

  private _gateItem(item: GateItemViewModel): TemplateResult {
    return html`
      <span class="gate-item tone-${item.tone}">
        <span class="dot" aria-hidden="true"></span>
        <span class="supporting"><b>${item.label}:</b> ${item.value}</span>
        ${this._cue(item.cue)}
      </span>
    `;
  }

  private _gate(): TemplateResult {
    const gate = this.vm.gate;
    return html`
      <div class="gate">
        ${this._gateItem(gate.quality)} ${this._gateItem(gate.baseline)}
        ${gate.reasons.length
          ? html`<div class="gate-reasons">
              <ul class="reasons xs">
                ${gate.reasons.map((reason) => html`<li>${reason}</li>`)}
              </ul>
              <p class="xs">${gate.keptNote}</p>
            </div>`
          : nothing}
      </div>
    `;
  }

  private _visual(visual: VisualViewModel): TemplateResult {
    return html`
      <section class="channel tone-${visual.tone}" aria-labelledby="visual-heading">
        <h5 id="visual-heading">${visual.columnTitle}</h5>
        <p class="xs">${visual.columnNote}</p>
        ${visual.imageUrl
          ? html`<img class="frame" src=${visual.imageUrl} alt=${visual.imageAlt} loading="lazy" />`
          : html`<div class="frame-missing">
              <p class="xs">${visual.imageUnavailable ?? visual.imageAlt}</p>
            </div>`}
        <p class="verdict">${visual.title} ${this._cue(visual.cue)}</p>
        <p class="supporting" style="margin-top:6px">${visual.gloss}</p>
        ${visual.rank ? html`<p class="supporting rank">${visual.rank}</p>` : nothing}
        ${visual.confidence
          ? html`<p class="xs" style="margin-top:6px">${visual.confidence}</p>`
          : nothing}
        ${visual.caveat
          ? html`<p class="xs caveat" style="margin-top:8px">${visual.caveat}</p>`
          : nothing}
        ${visual.silentNote
          ? html`<p class="xs caveat" style="margin-top:8px">${visual.silentNote}</p>`
          : nothing}
        ${this._trend(visual.trend)} ${this._numbers(visual)}
      </section>
    `;
  }

  /**
   * The sparkline is decoration over a sentence that already exists: the
   * `role="img"` label names what it shows, and every point it draws is also
   * reachable as a `<title>`. It carries no axis, because a reader who needs the
   * numbers is one disclosure away from them.
   */
  private _trend(trend: TrendViewModel | null): TemplateResult | typeof nothing {
    if (!trend) return nothing;
    const width = 240;
    const height = 44;
    const scored = trend.points.filter((point) => point.score !== null);
    if (scored.length === 0) return nothing;
    const step = trend.points.length > 1 ? width / (trend.points.length - 1) : width;
    const y = (score: number): number => height - 4 - score * (height - 10);
    const path = trend.points
      .map((point, index) =>
        point.score === null
          ? ''
          : `${index === 0 ? 'M' : 'L'}${(index * step).toFixed(1)},${y(point.score).toFixed(1)}`
      )
      .join('');
    return html`
      <div class="spark">
        <svg
          viewBox="0 0 ${width} ${height}"
          role="img"
          aria-label=${trend.accessibleLabel}
          preserveAspectRatio="xMinYMid meet"
        >
          <path
            d=${path}
            fill="none"
            stroke="var(--secondary-text-color, #bbb)"
            stroke-width="1.5"
          />
          ${trend.points.map((point, index) =>
            point.score === null
              ? nothing
              : html`<circle
                  class="tone-${point.tone}"
                  cx=${(index * step).toFixed(1)}
                  cy=${y(point.score).toFixed(1)}
                  r="3"
                  fill="var(--tone)"
                >
                  <title>${point.title}</title>
                </circle>`
          )}
        </svg>
        <div class="spark-legend">
          <span class="xs">${trend.count}</span>
          <span class="xs">${trend.legend}</span>
        </div>
      </div>
    `;
  }

  private _measures(rows: MeasureRow[]): TemplateResult {
    return html`
      <table class="measures">
        <tbody>
          ${rows.map(
            (row) =>
              html`<tr>
                <td>${row.label}</td>
                <td>${row.value}</td>
              </tr>`
          )}
        </tbody>
      </table>
    `;
  }

  /**
   * The only place in the card where the Anomaly Score appears as a decimal —
   * behind a closed disclosure, immediately above the note saying it is not a
   * probability. The surface reader meets the sentence and never the number.
   */
  private _numbers(visual: VisualViewModel): TemplateResult | typeof nothing {
    if (visual.numbers.length === 0 && this.vm.provenance.length === 0) return nothing;
    return html`
      <details>
        <summary>${visual.numbersSummary}</summary>
        ${this._measures([...visual.numbers, ...this.vm.provenance])}
        ${visual.numbersNote
          ? html`<p class="xs" style="margin-top:6px">${visual.numbersNote}</p>`
          : nothing}
      </details>
    `;
  }

  private _environment(environment: EnvironmentViewModel): TemplateResult {
    return html`
      <section class="channel tone-${environment.tone}" aria-labelledby="env-heading">
        <h5 id="env-heading">${environment.columnTitle}</h5>
        <p class="xs">${environment.columnNote}</p>
        <p class="verdict">${environment.title} ${this._cue(environment.cue)}</p>
        <p class="supporting" style="margin-top:6px">${environment.gloss}</p>
        ${environment.reasons.length
          ? html`<ul class="reasons supporting">
              ${environment.reasons.map((reason) => html`<li>${reason}</li>`)}
            </ul>`
          : nothing}
        ${environment.caveat
          ? html`<p class="xs caveat" style="margin-top:8px">${environment.caveat}</p>`
          : nothing}
        ${environment.evaluatedAt
          ? html`<p class="xs" style="margin-top:8px">${environment.evaluatedAt}</p>`
          : nothing}
        <div style="margin-top:10px">
          <p class="xs">${environment.historyTitle}</p>
          ${environment.history.length
            ? html`<div class="env-history">
                ${environment.history.map(
                  (point) =>
                    html`<span
                      class=${point.risk ? 'risk' : 'clear'}
                      role="img"
                      title=${point.title}
                      aria-label=${point.title}
                    ></span>`
                )}
              </div>`
            : nothing}
          <p class="xs" style="margin-top:4px">${environment.historySummary}</p>
        </div>
        <p class="xs caveat" style="margin-top:8px">${environment.neverVisual}</p>
      </section>
    `;
  }

  private _fusion(fusion: FusionViewModel): TemplateResult {
    return html`
      <section class="fusion tone-${fusion.tone}" aria-labelledby="fusion-heading">
        <p class="eyebrow" id="fusion-heading">${fusion.label}</p>
        <div class="fusion-title">
          <strong>${fusion.title}</strong>
          ${this._cue(fusion.cue)}
          ${fusion.chips.map((chip) => html`<span class="chip">${chip}</span>`)}
        </div>
        <p class="supporting" style="margin-top:4px">${fusion.gloss}</p>
        ${fusion.coverageNote
          ? html`<p class="xs" style="margin-top:4px">${fusion.coverageNote}</p>`
          : nothing}
        <p class="xs caveat" style="margin-top:4px">${fusion.caveat}</p>
        ${fusion.report
          ? html`<details class="report">
              <summary>${fusion.report.summary}</summary>
              <p class="supporting">
                <b>${fusion.report.observation.label}:</b> ${fusion.report.observation.text}
              </p>
              <p class="supporting">
                <b>${fusion.report.environmentalRisk.label}:</b> ${fusion.report.environmentalRisk
                  .text}
              </p>
              <p class="supporting">
                <b>${fusion.report.hypothesis.label}:</b> ${fusion.report.hypothesis.text}
              </p>
              ${fusion.report.recommendations.length
                ? html`<p class="supporting" style="margin-top:6px">
                      <b>${fusion.report.recommendationsLabel}</b>
                    </p>
                    <ul class="reasons supporting">
                      ${fusion.report.recommendations.map((item) => html`<li>${item}</li>`)}
                    </ul>`
                : nothing}
              <p class="xs" style="margin-top:6px">${fusion.report.note}</p>
            </details>`
          : nothing}
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-vision-capture-ledger': GrowspaceVisionCaptureLedger;
  }
}
