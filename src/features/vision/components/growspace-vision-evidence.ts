/**
 * The Vision evidence panel — service state, the checkup list, the frozen legacy
 * tail, and the two lines both V1 surfaces carry permanently.
 *
 * Structure mirrors the contract rather than the screen: `get_vision_status`
 * heads the panel because a disconnected service changes how everything below it
 * must be read; `get_vision_history_v2` supplies one section per Vision Checkup,
 * each holding one `growspace-vision-capture-ledger` per camera and no aggregate
 * verdict of its own, because the checkup envelope has none.
 *
 * `legacy_cloud_v1` rows are rendered **as attribution**, never as evidence:
 * their severity is printed as recorded text and takes no tone, so a cloud-era
 * "high" cannot be mistaken for a V1 fusion outcome.
 *
 * Dumb by contract (ADR-0019): `vm` in, one `vision-retry` intent out.
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiEyeOutline, mdiTuneVariant } from '@mdi/js';
import { sharedStyles } from '../../../styles/shared.styles';
import { statusTokens } from '../../../styles/status.styles';
import { visionToneTokens, visionTextStyles } from '../vision-evidence.styles';
import './growspace-vision-capture-ledger';
import type {
  CheckupViewModel,
  LegacyViewModel,
  ServiceViewModel,
  VisionEvidenceViewModel,
} from '../vision-evidence.viewmodel';

@customElement('growspace-vision-evidence')
export class GrowspaceVisionEvidence extends LitElement {
  @property({ attribute: false }) vm!: VisionEvidenceViewModel;
  @property({ type: Boolean }) loading = false;
  @property({ type: String }) error = '';

  static styles = [
    sharedStyles,
    statusTokens,
    visionToneTokens,
    visionTextStyles,
    css`
      :host {
        display: block;
      }

      .service {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        padding: 10px 0;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        margin-bottom: 16px;
      }

      .service .label {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-weight: 500;
        color: var(--tone);
      }

      .checkup {
        margin-bottom: 24px;
      }

      .checkup > header {
        display: flex;
        align-items: baseline;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 8px;
      }

      .checkup > header h4 {
        margin: 0;
        font-size: 0.9375rem;
        font-weight: 600;
      }

      .ledgers {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .legacy {
        border: 1px dashed var(--divider-color, rgba(255, 255, 255, 0.2));
        border-radius: 12px;
        padding: 12px 16px;
        margin-bottom: 12px;
      }

      .legacy header {
        display: flex;
        align-items: baseline;
        gap: 8px;
        flex-wrap: wrap;
      }

      .scope {
        margin-top: 24px;
        padding-top: 12px;
        border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .scope div {
        display: flex;
        gap: 8px;
        align-items: flex-start;
      }

      .scope svg {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        margin-top: 2px;
        fill: var(--secondary-text-color, rgba(255, 255, 255, 0.7));
      }

      .state {
        text-align: center;
        padding: 32px 16px;
      }

      .state h4 {
        margin: 0 0 8px;
        font-size: 1rem;
      }

      button.retry {
        margin-top: 12px;
        font: inherit;
        padding: 8px 16px;
        border-radius: 999px;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.2));
        background: transparent;
        color: inherit;
        cursor: pointer;
      }

      button.retry:focus-visible {
        outline: 2px solid var(--gm-primary-color, #4caf50);
        outline-offset: 2px;
      }
    `,
  ];

  render(): TemplateResult {
    const vm = this.vm;
    return html`
      ${this._service(vm.service)}
      ${this.error
        ? html`<div class="state" role="alert">
            <p class="supporting">${this.error}</p>
            <button
              class="retry"
              type="button"
              @click=${() =>
                this.dispatchEvent(
                  new CustomEvent('vision-retry', { bubbles: true, composed: true })
                )}
            >
              ${vm.retryLabel}
            </button>
          </div>`
        : nothing}
      ${this.loading && vm.isEmpty && !this.error
        ? html`<div class="state" role="status" aria-live="polite">
            <p class="supporting">${vm.loadingLabel}</p>
          </div>`
        : nothing}
      ${vm.isEmpty && !this.loading && !this.error
        ? html`<div class="state">
            <h4>${vm.emptyTitle}</h4>
            <p class="supporting">${vm.emptyBody}</p>
          </div>`
        : nothing}
      ${vm.checkups.map((checkup) => this._checkup(checkup))}
      ${vm.legacy.map((item) => this._legacy(item))}
      ${vm.moreNote ? html`<p class="xs">${vm.moreNote}</p>` : nothing} ${this._scope()}
    `;
  }

  private _service(service: ServiceViewModel): TemplateResult {
    return html`
      <div class="service tone-${service.tone}" role="status">
        <span class="label">
          <span class="dot" aria-hidden="true"></span>${service.label}
          <span class="cue">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d=${service.cue.icon}></path></svg>
            <span>${service.cue.label}</span>
          </span>
        </span>
        <span class="xs">${service.detail}</span>
      </div>
    `;
  }

  private _checkup(checkup: CheckupViewModel): TemplateResult {
    return html`
      <section class="checkup" aria-labelledby=${`checkup-${checkup.checkupId}`}>
        <header>
          <h4 id=${`checkup-${checkup.checkupId}`}>${checkup.startedAt}</h4>
          <span class="chip">${checkup.window}</span>
          <span class="chip">${checkup.trigger}</span>
          <span class="chip" title=${checkup.statusNote}>${checkup.status}</span>
          <span class="xs">${checkup.cameraCount}</span>
        </header>
        <p class="xs">${checkup.noVerdictNote}</p>
        <div class="ledgers">
          ${checkup.captures.map(
            (capture) =>
              html`<growspace-vision-capture-ledger
                .vm=${capture}
              ></growspace-vision-capture-ledger>`
          )}
        </div>
      </section>
    `;
  }

  /**
   * Frozen cloud-era attribution. The recorded severity is printed as plain text
   * and given no tone at all — restyling it as V1 fusion evidence is the exact
   * thing the `legacy_cloud_v1` discriminator exists to prevent.
   */
  private _legacy(item: LegacyViewModel): TemplateResult {
    return html`
      <article class="legacy">
        <header>
          <span class="chip">${item.label}</span>
          <span class="xs">${item.timestamp} · ${item.checkType}</span>
        </header>
        <p class="xs" style="margin-top:6px">${item.note}</p>
        <p class="supporting" style="margin-top:8px">${item.analysis}</p>
        <p class="xs" style="margin-top:6px">${item.severity}</p>
        ${item.issues.length
          ? html`<p class="xs" style="margin-top:8px"><b>${item.issuesLabel}</b></p>
              <ul class="reasons supporting">
                ${item.issues.map((issue) => html`<li>${issue}</li>`)}
              </ul>`
          : nothing}
        ${item.recommendations.length
          ? html`<p class="xs" style="margin-top:8px"><b>${item.recommendationsLabel}</b></p>
              <ul class="reasons supporting">
                ${item.recommendations.map((rec) => html`<li>${rec}</li>`)}
              </ul>`
          : nothing}
      </article>
    `;
  }

  /** The two lines #75 requires on every V1 surface, permanently. */
  private _scope(): TemplateResult {
    const vm = this.vm;
    return html`
      <div class="scope">
        <div>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d=${mdiEyeOutline}></path></svg>
          <p class="xs"><b>${vm.scopeLineLead}</b> ${vm.scopeLine}</p>
        </div>
        <div>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d=${mdiTuneVariant}></path></svg>
          <p class="xs"><b>${vm.calibrationLineLead}</b> ${vm.calibrationLine}</p>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-vision-evidence': GrowspaceVisionEvidence;
  }
}
