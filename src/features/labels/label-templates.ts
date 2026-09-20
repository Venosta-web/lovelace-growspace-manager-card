/**
 * `<growspace-label-templates>` — the read-only entry to the Label Template path.
 *
 * Everything a user can do here is look, and that is the whole of this
 * ticket: prove that a card which has negotiated the complete capability can
 * show the backend's own raster for a shipped Factory Template, per Label
 * Size, with language that is true about what that raster may authorize.
 * Editing, saving, printing and the lifecycle arrive behind it.
 *
 * Two things it refuses to do, because both would be lies the user cannot see
 * through. It never draws a layout itself — the raster on screen is the
 * bitmap the printer would receive, fetched from the backend, or there is no
 * picture at all. And it never borrows a preview from a neighbouring Label
 * Size: a stock no characterised printer can render says so, and shows
 * nothing.
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { localize, localizeWithParams } from '../../localize/localize';
import { variables } from '../../styles/variables';
import {
  labelSizeState,
  labelSizes,
  previewFactoryTemplate,
  reconcileChoice,
  type FactoryTemplatePreview,
  type LabelSizeState,
  type LabelTemplateCapability,
  type PreviewChoice,
} from '../../slices/labels';

/** The localization key carrying each state's one truthful sentence. */
const STATE_KEYS: Record<Exclude<LabelSizeState, 'classic'>, string> = {
  unprofiled: 'state_unprofiled',
  provisional: 'state_provisional',
  verified: 'state_verified',
  production: 'state_production',
};

@customElement('growspace-label-templates')
export class GrowspaceLabelTemplates extends LitElement {
  /** The negotiated capability. Nothing renders without one. */
  @property({ attribute: false }) capability?: LabelTemplateCapability;
  @property({ type: String }) language = 'en';

  @state() private _choice?: PreviewChoice;
  @state() private _preview: FactoryTemplatePreview | null = null;
  @state() private _loading = false;
  @state() private _failure: string | null = null;

  static styles = [
    variables,
    css`
      :host {
        display: block;
      }

      .sizes,
      .fixtures {
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-sm, 8px);
        margin-bottom: var(--spacing-md, 16px);
      }

      button {
        font: inherit;
        min-height: 44px;
        padding: 8px 14px;
        border-radius: var(--border-radius-md, 8px);
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.04));
        color: var(--primary-text-color);
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
      }

      button[aria-pressed='true'] {
        border-color: var(--primary-color, #4caf50);
        color: var(--primary-color, #4caf50);
      }

      button[disabled] {
        cursor: not-allowed;
        opacity: 0.55;
      }

      .badge {
        font-size: var(--font-size-xs, 11px);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        opacity: 0.8;
      }

      .stage {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 180px;
        padding: var(--spacing-md, 16px);
        background: #fff;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: var(--border-radius-md, 8px);
      }

      .stage img {
        max-width: 100%;
        height: auto;
        image-rendering: pixelated;
      }

      .supporting {
        opacity: 0.75;
        font-size: var(--font-size-sm, 13px);
        line-height: 1.45;
      }

      .refusal {
        color: var(--error-color, #f44336);
      }

      dl.identity {
        display: grid;
        grid-template-columns: max-content 1fr;
        gap: 2px var(--spacing-md, 16px);
        margin: var(--spacing-md, 16px) 0 0;
        font-size: var(--font-size-xs, 11px);
        opacity: 0.75;
      }

      dl.identity dd {
        margin: 0;
        overflow-wrap: anywhere;
      }

      ul.diagnostics {
        margin: var(--spacing-sm, 8px) 0 0;
        padding-left: 1.2em;
        font-size: var(--font-size-xs, 11px);
        opacity: 0.85;
        line-height: 1.5;
      }

      ul.diagnostics code {
        opacity: 0.7;
      }
    `,
  ];

  protected willUpdate(changed: Map<string | number | symbol, unknown>): void {
    if (!changed.has('capability') || !this.capability) return;
    // A capability arriving, or being replaced by one of another generation,
    // re-reconciles the choice against the catalogue that is now current
    // rather than keeping a Label Size the backend may no longer ship.
    this._choice = reconcileChoice(this.capability, this._choice);
    void this._load();
  }

  private _t(key: string): string {
    return localize(`labels.${key}`, '', '', this.language);
  }

  private async _load(): Promise<void> {
    const choice = this._choice;
    if (!this.capability || !choice) return;
    if (labelSizeState(this.capability, choice.labelSizeId) === 'unprofiled') {
      // Nothing to ask for: no profile can render this stock, and the backend
      // would refuse. Saying so without the round trip is the same answer.
      this._preview = null;
      this._failure = null;
      return;
    }

    this._loading = true;
    this._failure = null;
    try {
      this._preview = await previewFactoryTemplate(choice);
    } catch (error) {
      this._preview = null;
      this._failure = error instanceof Error ? error.message : String(error);
    } finally {
      this._loading = false;
    }
  }

  private _choose(partial: Partial<PreviewChoice>): void {
    if (!this.capability) return;
    this._choice = reconcileChoice(this.capability, { ...this._choice, ...partial });
    void this._load();
  }

  private _renderSizes(capability: LabelTemplateCapability): TemplateResult {
    const choice = this._choice;
    return html`
      <div class="sizes" role="group" aria-label=${this._t('sizes_label')}>
        ${labelSizes(capability).map((size) => {
          const state = labelSizeState(capability, size.id);
          return html`
            <button
              type="button"
              data-size=${size.id}
              aria-pressed=${choice?.labelSizeId === size.id}
              @click=${() => this._choose({ labelSizeId: size.id })}
            >
              <span>${size.width_mm}×${size.height_mm}&nbsp;mm</span>
              <span class="badge">${this._t(STATE_KEYS[state])}</span>
            </button>
          `;
        })}
      </div>
    `;
  }

  private _renderFixtures(capability: LabelTemplateCapability): TemplateResult {
    const families = Object.keys(capability.catalogues.representative_fixtures);
    return html`
      <div class="fixtures" role="group" aria-label=${this._t('fixtures_label')}>
        ${families.map(
          (family) => html`
            <button
              type="button"
              data-fixture=${family}
              aria-pressed=${this._choice?.fixtureFamily === family}
              @click=${() => this._choose({ fixtureFamily: family })}
            >
              <span>${this._t(`fixture_${family}`)}</span>
            </button>
          `
        )}
      </div>
    `;
  }

  /**
   * The raster, the refusal, or the reason there is neither.
   *
   * Every branch says something different on purpose. "Nothing is being
   * shown" and "this is what will print" must never be told apart only by
   * whether a picture happens to be there.
   */
  private _renderStage(capability: LabelTemplateCapability): TemplateResult {
    const choice = this._choice;
    if (!choice) return html`<p class="supporting">${this._t('preview_loading')}</p>`;

    if (labelSizeState(capability, choice.labelSizeId) === 'unprofiled') {
      return html`<p class="supporting" data-state="unprofiled">
        ${this._t('preview_unprofiled')}
      </p>`;
    }
    if (this._loading) {
      return html`<p class="supporting" role="status">${this._t('preview_loading')}</p>`;
    }
    if (this._failure !== null) {
      return html`<p class="supporting refusal" role="alert" data-state="failed">
        ${localizeWithParams('labels.preview_failed', { reason: this._failure }, this.language)}
      </p>`;
    }

    const preview = this._preview;
    if (!preview) return html`<p class="supporting">${this._t('preview_loading')}</p>`;

    if (preview.outcome === 'refused') {
      return html`<p class="supporting refusal" role="alert" data-state="refused">
        ${localizeWithParams(
          'labels.preview_refused',
          { reason: preview.refusal.reason, code: preview.refusal.code },
          this.language
        )}
      </p>`;
    }

    const raster = preview.render.raster;
    if (!raster) {
      // The sentence must not point at diagnostics the user cannot see, so
      // the ones that stopped the render are printed with it.
      const blocking = preview.render.diagnostics.filter(
        (item) => item.severity === 'error' || item.code.endsWith('render_failed')
      );
      return html`
        <p class="supporting refusal" role="alert" data-state="no-raster">
          ${this._t('preview_no_raster')}
        </p>
        <ul class="diagnostics">
          ${(blocking.length > 0 ? blocking : preview.render.diagnostics).map(
            (item) => html`<li><code>${item.code}</code> ${item.message}</li>`
          )}
        </ul>
      `;
    }

    return html`
      <div class="stage">
        <img
          src=${raster.image}
          width=${raster.width}
          height=${raster.height}
          alt=${localizeWithParams(
            'labels.preview_alt',
            { template: preview.template.name },
            this.language
          )}
        />
      </div>
      ${this._renderIdentity(preview)}
    `;
  }

  /**
   * What the raster above actually is.
   *
   * A picture of a label is not evidence until it says which layout, which
   * printer profile and which subject produced it — that is the difference
   * between the authoritative preview and the approximation the Classic
   * dialogs draw.
   */
  private _renderIdentity(
    preview: Extract<FactoryTemplatePreview, { outcome: 'rendered' }>
  ): TemplateResult {
    const context = preview.render.render_context;
    return html`
      <dl class="identity">
        <dt>${this._t('identity_template')}</dt>
        <dd>${preview.template.name} · r${preview.template.revision}</dd>
        <dt>${this._t('identity_profile')}</dt>
        <dd>${context.profile_id}</dd>
        <dt>${this._t('identity_subject')}</dt>
        <dd>${preview.subject}</dd>
        <dt>${this._t('identity_layout')}</dt>
        <dd>${preview.template.layout_digest}</dd>
      </dl>
    `;
  }

  protected render(): TemplateResult | typeof nothing {
    const capability = this.capability;
    if (!capability) return nothing;
    // The claim below is about the raster, so it is made only when there is
    // one. "The preview is exactly what this printer would receive" printed
    // over an empty stage would be the untruth this whole surface avoids.
    const shown =
      this._preview?.outcome === 'rendered' && this._preview.render.raster !== null
        ? labelSizeState(capability, this._preview.render.render_context.label_size_id)
        : undefined;

    return html`
      <p class="supporting" data-role="scope">${this._t('read_only')}</p>
      ${this._renderSizes(capability)} ${this._renderFixtures(capability)}
      ${this._renderStage(capability)}
      ${shown
        ? html`<p class="supporting" data-role="claim" data-state=${shown}>
            ${this._t(STATE_KEYS[shown])} — ${this._t(`${STATE_KEYS[shown]}_detail`)}
          </p>`
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-label-templates': GrowspaceLabelTemplates;
  }
}
