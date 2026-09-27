import { LitElement, html, css, nothing, type CSSResultGroup, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { mdiCheckCircle, mdiCircleOutline, mdiFlagCheckered } from '@mdi/js';

import { variables } from '../../styles/variables';
import { localize, localizeWithParams } from '../../localize/localize';
import type { SetupModule } from '../../slices/growspace';
import type { SetupChecklist, SetupExtraId, SetupStep, SetupStepId } from './setup-checklist';

/** The presets GSM declares (GSM ADR-0064). The card names them; GSM stamps them. */
export const SETUP_PRESET_IDS = [
  'simple_soil_tent',
  'living_soil',
  'coco_crop_steering',
  'hydroponic_room',
  'mother_clone_room',
  'drying_room',
  'curing_room',
] as const;

export type SetupIntent =
  | { kind: 'open-step'; step: SetupStepId }
  | { kind: 'open-strain-library' }
  | { kind: 'set-module'; module: SetupModule; offered: boolean }
  | { kind: 'choose-preset'; preset: string }
  | { kind: 'open-extra'; extra: SetupExtraId };

/**
 * `<growspace-setup-checklist>` — the [[Setup Checklist]], rendered from a
 * derived `SetupChecklist` and nothing else. Every gesture leaves as one
 * `setup-intent` event; the container decides what it opens or saves.
 *
 * The only state it keeps is the pending preset while a re-stamp waits for
 * confirmation — view fluff with no draft semantics, like a dialog expander.
 */
@customElement('growspace-setup-checklist')
export class GrowspaceSetupChecklist extends LitElement {
  @property({ attribute: false }) checklist: SetupChecklist | null = null;
  @property({ type: String }) growspaceName = '';
  @property({ type: String }) language = 'en';
  /** A saving gesture is in flight; every control waits for it. */
  @property({ type: Boolean }) busy = false;
  @property({ type: String }) error = '';

  @state() private _pendingPreset: string | null = null;

  static styles: CSSResultGroup = [
    variables,
    css`
      :host {
        display: block;
      }
      .setup {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
        padding: var(--spacing-lg);
        margin: var(--spacing-md) 0;
        background: var(--surface-container-low);
        border: 1px solid var(--divider-color);
        border-radius: var(--border-radius-lg);
        color: var(--text-primary);
      }
      .setup.panel {
        padding: var(--spacing-md);
      }
      h2 {
        margin: 0;
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-medium);
      }
      h3 {
        margin: 0 0 var(--spacing-sm);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--text-secondary);
      }
      p {
        margin: 0;
      }
      .supporting {
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
        line-height: 1.4;
      }
      .preset {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--spacing-sm);
      }
      .preset label {
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
      }
      select {
        font: inherit;
        font-size: var(--font-size-sm);
        color: var(--text-primary);
        background: var(--surface-container-high);
        border: 1px solid var(--divider-color);
        border-radius: var(--border-radius-sm);
        padding: var(--spacing-xs) var(--spacing-sm);
        min-height: 36px;
      }
      .confirm {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-sm) var(--spacing-md);
        border-radius: var(--border-radius-md);
        background: var(--surface-container);
        font-size: var(--font-size-sm);
      }
      ol {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
      }
      .step {
        display: grid;
        grid-template-columns: 24px 1fr auto;
        align-items: center;
        gap: var(--spacing-sm) var(--spacing-md);
        padding: var(--spacing-sm) var(--spacing-md);
        border-radius: var(--border-radius-md);
        background: var(--surface-container);
      }
      .step svg {
        width: 24px;
        height: 24px;
        fill: var(--text-muted);
      }
      .step.done svg,
      .step.ready svg {
        fill: var(--gm-primary-color);
      }
      .title {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: var(--spacing-xs) var(--spacing-sm);
        font-weight: var(--font-weight-medium);
      }
      .role {
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-regular);
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: var(--spacing-xs);
      }
      button {
        font: inherit;
        font-size: var(--font-size-sm);
        min-height: 36px;
        padding: var(--spacing-xs) var(--spacing-md);
        border-radius: var(--border-radius-full);
        cursor: pointer;
        border: 1px solid var(--divider-color);
        background: transparent;
        color: var(--text-primary);
      }
      button.primary {
        background: var(--gm-primary-color);
        border-color: transparent;
        color: var(--on-primary);
      }
      button:disabled {
        cursor: default;
        opacity: 0.6;
      }
      button:focus-visible,
      select:focus-visible {
        outline: 2px solid var(--gm-primary-color);
        outline-offset: 2px;
      }
      .status {
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
      }
      details summary {
        cursor: pointer;
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
        padding: var(--spacing-xs) 0;
      }
      details ul {
        list-style: none;
        margin: var(--spacing-xs) 0 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
      }
      details li {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--spacing-md);
        font-size: var(--font-size-sm);
      }
      .extras-list {
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-xs);
      }
      .error {
        color: var(--error-color);
        font-size: var(--font-size-sm);
      }
      @media (max-width: 480px) {
        .step {
          grid-template-columns: 24px 1fr;
        }
        .actions {
          grid-column: 2;
          justify-content: flex-start;
        }
      }
    `,
  ];

  private _t(key: string, params: Record<string, string | number> = {}): string {
    return localizeWithParams(`setup.${key}`, params, this.language);
  }

  private _presetName(preset: string): string {
    const key = `setup.preset_${preset}`;
    const label = localize(key, '', '', this.language);
    return label === key ? preset : label;
  }

  private _emit(intent: SetupIntent): void {
    this.dispatchEvent(
      new CustomEvent<SetupIntent>('setup-intent', {
        detail: intent,
        bubbles: true,
        composed: true,
      })
    );
  }

  private _onPresetChange(e: Event): void {
    const select = e.target as HTMLSelectElement;
    const preset = select.value;
    const current = this.checklist?.preset ?? null;
    if (!preset) return;
    if (current === null) {
      this._emit({ kind: 'choose-preset', preset });
      return;
    }
    // Re-stamping discards the grower's own skips (GSM ADR-0064), so it waits
    // for a word; the select shows the declared preset until then.
    select.value = current;
    if (preset !== current) this._pendingPreset = preset;
  }

  private _confirmPreset(): void {
    if (this._pendingPreset) this._emit({ kind: 'choose-preset', preset: this._pendingPreset });
    this._pendingPreset = null;
  }

  protected render(): TemplateResult | typeof nothing {
    const checklist = this.checklist;
    if (!checklist?.visible) return nothing;

    const offered = checklist.steps.filter((s) => s.offered);
    const skipped = checklist.steps.filter((s) => !s.offered);
    const isPanel = checklist.placement === 'panel';

    return html`
      <section
        class="setup ${isPanel ? 'panel' : ''}"
        aria-labelledby="setup-title"
        aria-busy=${this.busy ? 'true' : 'false'}
      >
        <div>
          <h2 id="setup-title">
            ${this._t(isPanel ? 'panel_title' : 'title', { name: this.growspaceName })}
          </h2>
          ${isPanel ? nothing : html`<p class="supporting">${this._t('subtitle')}</p>`}
        </div>
        ${this._renderPreset(checklist.preset)}
        <ol aria-label=${this._t('title', { name: this.growspaceName })}>
          ${offered.map((step) => this._renderStep(step))} ${this._renderReady(checklist.ready)}
        </ol>
        ${skipped.length ? this._renderSkipped(skipped) : nothing}
        ${this.error ? html`<p class="error" role="alert">${this.error}</p>` : nothing}
        ${this._renderExtras(checklist)}
      </section>
    `;
  }

  private _renderPreset(preset: string | null): TemplateResult {
    return html`
      <div class="preset">
        <label for="setup-preset">${this._t('preset_label')}</label>
        <select
          id="setup-preset"
          .value=${preset ?? ''}
          ?disabled=${this.busy}
          aria-describedby="setup-preset-hint"
          @change=${this._onPresetChange}
        >
          ${preset === null
            ? html`<option value="" selected>${this._t('preset_none')}</option>`
            : nothing}
          ${preset !== null && !(SETUP_PRESET_IDS as readonly string[]).includes(preset)
            ? html`<option value=${preset} selected>${this._presetName(preset)}</option>`
            : nothing}
          ${SETUP_PRESET_IDS.map(
            (id) =>
              html`<option value=${id} ?selected=${id === preset}>${this._presetName(id)}</option>`
          )}
        </select>
        <p id="setup-preset-hint" class="supporting">${this._t('preset_hint')}</p>
      </div>
      ${this._pendingPreset && preset
        ? html`
            <div class="confirm" role="group" aria-label=${this._t('preset_label')}>
              <span>
                ${this._t('preset_confirm', { preset: this._presetName(this._pendingPreset) })}
              </span>
              <button class="primary" ?disabled=${this.busy} @click=${this._confirmPreset}>
                ${this._t('preset_apply')}
              </button>
              <button
                ?disabled=${this.busy}
                @click=${() => {
                  this._pendingPreset = null;
                }}
              >
                ${this._t('preset_cancel', { preset: this._presetName(preset) })}
              </button>
            </div>
          `
        : nothing}
    `;
  }

  private _renderStep(step: SetupStep): TemplateResult {
    const titleId = `setup-step-${step.id}`;
    return html`
      <li class="step ${step.done ? 'done' : ''}" aria-labelledby=${titleId}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d=${step.done ? mdiCheckCircle : mdiCircleOutline}></path>
        </svg>
        <div>
          <div class="title">
            <span id=${titleId}>${this._t(`step_${step.id}`)}</span>
            <span class="role">
              ${step.done ? this._t('done') : this._t(step.role === 'core' ? 'core' : 'optional')}
            </span>
          </div>
          <p class="supporting">${this._t(`step_${step.id}_hint`)}</p>
        </div>
        <div class="actions">${this._renderStepActions(step, titleId)}</div>
      </li>
    `;
  }

  private _renderStepActions(step: SetupStep, titleId: string): TemplateResult {
    const open = html`
      <button
        class=${step.done ? '' : 'primary'}
        ?disabled=${this.busy}
        aria-describedby=${titleId}
        @click=${() => this._emit({ kind: 'open-step', step: step.id })}
      >
        ${step.id === 'plants' ? this._t('add_plants') : this._t(step.done ? 'change' : 'set_up')}
      </button>
    `;
    if (step.id === 'plants') {
      return html`${open}
        <button ?disabled=${this.busy} @click=${() => this._emit({ kind: 'open-strain-library' })}>
          ${this._t('strain_library')}
        </button>`;
    }
    const module = step.id;
    return html`${open}
    ${step.done
      ? nothing
      : html`<button
          ?disabled=${this.busy}
          aria-describedby=${titleId}
          @click=${() => this._emit({ kind: 'set-module', module, offered: false })}
        >
          ${this._t('not_used')}
        </button>`}`;
  }

  private _renderReady(ready: boolean): TemplateResult {
    return html`
      <li class="step ${ready ? 'ready' : ''}">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d=${ready ? mdiCheckCircle : mdiFlagCheckered}></path>
        </svg>
        <div>
          <div class="title">
            <span>${this._t('step_ready')}</span>
            ${ready ? html`<span class="role">${this._t('done')}</span>` : nothing}
          </div>
          ${ready ? nothing : html`<p class="supporting">${this._t('step_ready_hint')}</p>`}
        </div>
      </li>
    `;
  }

  private _renderSkipped(skipped: SetupStep[]): TemplateResult {
    return html`
      <details>
        <summary>${this._t('skipped_title', { count: skipped.length })}</summary>
        <ul>
          ${skipped.map(
            (step) => html`
              <li>
                <span>${this._t(`step_${step.id}`)}</span>
                <button
                  ?disabled=${this.busy}
                  @click=${() =>
                    this._emit({
                      kind: 'set-module',
                      module: step.id as SetupModule,
                      offered: true,
                    })}
                >
                  ${this._t('offer_again')}
                </button>
              </li>
            `
          )}
        </ul>
      </details>
    `;
  }

  private _renderExtras(checklist: SetupChecklist): TemplateResult {
    return html`
      <div>
        <h3 id="setup-extras">${this._t('extras_title')}</h3>
        <div class="extras-list" role="group" aria-labelledby="setup-extras">
          ${checklist.extras.map(
            (extra) => html`
              <button @click=${() => this._emit({ kind: 'open-extra', extra: extra.id })}>
                ${this._t(`extra_${extra.id}`)}${extra.ready
                  ? html` · <span class="status">${this._t('extra_ready')}</span>`
                  : nothing}
              </button>
            `
          )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-setup-checklist': GrowspaceSetupChecklist;
  }
  interface HTMLElementEventMap {
    'setup-intent': CustomEvent<SetupIntent>;
  }
}
