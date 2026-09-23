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
import { labelCopy, refusalCopy } from './copy';
import { copyKeys } from './editor/diagnostics';
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
import { openLabelTemplateDraft } from '../../slices/labels/drafts';
import { DraftSession } from './editor/draft-session';
import './editor/growspace-label-editor';
import './template-library';
// The batch review lives in this chunk too: the batch dialog loads it only
// once the capability says the template path exists.
import './batch/growspace-label-batch';
// And the strain library's single print, loaded the same way by its dialog.
import './record/growspace-label-record-print';
import { getHass } from '../../services/hass-call';
import { TemplateDraftSchema } from '../../slices/labels/draft-schema';
import type { RecoveryDraft } from '../../slices/labels/management';
import { downloadTemplateData } from '../../slices/labels/management';

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
  /**
   * Whether the editor has taken the surface.
   *
   * Reflected, because the host's own layout has to change with it and a
   * shadow stylesheet can only see the host through an attribute.
   */
  @property({ type: Boolean, reflect: true }) editing = false;

  @state() private _choice?: PreviewChoice;
  @state() private _preview: FactoryTemplatePreview | null = null;
  @state() private _loading = false;
  @state() private _failure: string | null = null;
  /**
   * The open editing session, or nothing.
   *
   * Held here rather than inside the editor element so that closing the
   * editor and reopening it lands on the same session -- and so the debounced
   * autosave is not cancelled by a re-render. It is durable on the server
   * either way; what this avoids is a visible round trip for work that never
   * left.
   */
  @state() private _session: DraftSession | null = null;
  @state() private _opening = false;
  @state() private _published: string | null = null;

  static styles = [
    variables,
    css`
      :host {
        display: block;
      }

      /* The editor is a task mode that fills the dialog, and filling it means
         a definite height to fill: its own layout scrolls internally, which a
         pane of automatic height cannot ask for. Without this the canvas, its
         toolbars and both panels became one tall block that scrolled as a
         unit, taking the canvas off screen the moment anybody reached the
         inspector. */
      :host([editing]) {
        display: flex;
        flex-direction: column;
        min-height: 0;
        height: 100%;
      }

      growspace-label-editor {
        min-height: 0;
      }

      /* The catalogue answers to the width it is given, not to the viewport:
         the same pane is a full-screen sheet on a phone and a wide modal on a
         desk, and only its own inline size tells the two apart. */
      :host(:not([editing])) {
        container-type: inline-size;
      }

      .scope {
        margin: 0 0 var(--spacing-md, 16px);
        max-width: 72ch;
      }

      /* Label size is the one choice both panes answer to, so it sits above
         them rather than inside either. */
      .sizes {
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-sm, 8px);
        margin-bottom: var(--spacing-lg, 24px);
      }

      /* On a phone five chips of different widths wrap into a ragged block;
         two even columns read as one set. */
      @container (max-width: 559px) {
        .sizes {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      .panes {
        display: grid;
        gap: 32px;
        align-items: start;
      }

      /* Side by side once there is room for a readable library beside a label
         at its native size. The preview column is sized to the paper rather
         than to half the dialog, so the library gets every pixel the label
         does not need. 440px holds a 400px raster at 1:1 inside the stage's
         padding; a pixelated image scaled by a fraction smears its dots. */
      @container (min-width: 760px) {
        .panes[data-library] {
          grid-template-columns: minmax(300px, 440px) minmax(0, 1fr);
        }

        /* The library can run long; the label it describes stays in view. */
        .factory {
          position: sticky;
          top: 0;
        }
      }

      .factory {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md, 16px);
        min-width: 0;
      }

      .factory > p {
        margin: 0;
      }

      .pane-title {
        margin: 0;
        font-size: var(--font-size-md, 16px);
        font-weight: 500;
        line-height: 1.3;
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
        transition:
          background-color var(--md3-motion-duration-short2, 100ms)
            var(--md3-motion-easing-standard, ease),
          border-color var(--md3-motion-duration-short2, 100ms)
            var(--md3-motion-easing-standard, ease);
      }

      button:not([disabled]):hover {
        border-color: var(--outline-hover, rgba(255, 255, 255, 0.2));
      }

      button:focus-visible {
        outline: 2px solid var(--primary-color, #4caf50);
        outline-offset: 2px;
      }

      button[aria-pressed='true'],
      button[aria-pressed='true']:hover {
        border-color: var(--primary-color, #4caf50);
        background: color-mix(in srgb, var(--primary-color, #4caf50) 12%, transparent);
      }

      button[disabled] {
        cursor: not-allowed;
        opacity: 0.55;
      }

      @media (prefers-reduced-motion: reduce) {
        button {
          transition: none;
        }
      }

      /* A size chip reads as dimension first, capability second. */
      .size {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
        padding: 6px 14px;
        min-width: 0;
        text-align: start;
        overflow-wrap: anywhere;
      }

      .size .dimension {
        font-weight: 500;
        font-variant-numeric: tabular-nums;
      }

      .badge {
        font-size: var(--font-size-xs, 11px);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        opacity: 0.75;
      }

      /* Sample content is one choice of three, so it is drawn as one control
         with three segments rather than as three unrelated buttons. */
      .fixtures {
        display: flex;
        flex-wrap: wrap;
        align-self: start;
        max-width: 100%;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: var(--border-radius-md, 8px);
        overflow: hidden;
      }

      .fixtures button,
      .fixtures button:hover {
        flex: 1 1 auto;
        border: 0;
        border-radius: 0;
        background: transparent;
        padding: 8px 16px;
      }

      .fixtures button + button {
        border-inline-start: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
      }

      .fixtures button:not([disabled]):hover {
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.04));
      }

      .fixtures button[aria-pressed='true'] {
        background: color-mix(in srgb, var(--primary-color, #4caf50) 12%, transparent);
      }

      .fixtures button:focus-visible {
        outline-offset: -2px;
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

      /* Where the paper would be when there is no raster to put on it. The
         column keeps its shape, so a refusal is read where the label was
         expected instead of the pane collapsing around one sentence. */
      .stage-empty {
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: var(--spacing-sm, 8px);
        min-height: 180px;
        padding: var(--spacing-md, 16px);
        box-sizing: border-box;
        border: 1px dashed var(--outline-hover, rgba(255, 255, 255, 0.2));
        border-radius: var(--border-radius-md, 8px);
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.04));
      }

      .stage-empty > * {
        margin: 0;
      }

      .supporting {
        opacity: 0.75;
        font-size: var(--font-size-sm, 13px);
        line-height: 1.45;
      }

      .refusal {
        color: var(--error-color, #f44336);
      }

      /* The pane's one primary action, so it is the one filled control. */
      .edit {
        align-self: start;
        font-weight: 500;
        border-color: var(--primary-color, #4caf50);
        background: var(--primary-color, #4caf50);
        color: var(--on-primary, #1e1e1e);
      }

      .edit:not([disabled]):hover {
        border-color: var(--primary-color, #4caf50);
        background: color-mix(
          in srgb,
          var(--primary-color, #4caf50) 86%,
          var(--on-primary, #1e1e1e)
        );
      }

      .edit[disabled] {
        background: transparent;
        color: var(--primary-text-color);
        border-color: var(--divider-color, rgba(255, 255, 255, 0.12));
      }

      dl.identity {
        display: grid;
        grid-template-columns: max-content minmax(0, 1fr);
        gap: 2px var(--spacing-md, 16px);
        margin: 0;
        font-size: var(--font-size-xs, 11px);
        opacity: 0.75;
      }

      dl.identity dd {
        margin: 0;
        overflow-wrap: anywhere;
      }

      ul.diagnostics {
        margin: 0;
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
              class="size"
              data-size=${size.id}
              aria-pressed=${choice?.labelSizeId === size.id}
              @click=${() => this._choose({ labelSizeId: size.id })}
            >
              <span class="dimension">${size.width_mm}×${size.height_mm}&nbsp;mm</span>
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
    const empty = (content: TemplateResult): TemplateResult =>
      html`<div class="stage-empty">${content}</div>`;
    if (!choice) return empty(html`<p class="supporting">${this._t('preview_loading')}</p>`);

    if (labelSizeState(capability, choice.labelSizeId) === 'unprofiled') {
      return empty(
        html`<p class="supporting" data-state="unprofiled">${this._t('preview_unprofiled')}</p>`
      );
    }
    if (this._loading) {
      return empty(html`<p class="supporting" role="status">${this._t('preview_loading')}</p>`);
    }
    if (this._failure !== null) {
      return empty(
        html`<p class="supporting refusal" role="alert" data-state="failed">
          ${localizeWithParams('labels.preview_failed', { reason: this._failure }, this.language)}
        </p>`
      );
    }

    const preview = this._preview;
    if (!preview) return empty(html`<p class="supporting">${this._t('preview_loading')}</p>`);

    if (preview.outcome === 'refused') {
      return empty(
        html`<p class="supporting refusal" role="alert" data-state="refused">
          ${localizeWithParams(
            'labels.preview_refused_localized',
            { detail: refusalCopy(preview.refusal.code, this.language) },
            this.language
          )}
        </p>`
      );
    }

    const raster = preview.render.raster;
    if (!raster) {
      // The sentence must not point at diagnostics the user cannot see, so
      // the ones that stopped the render are printed with it.
      const blocking = preview.render.diagnostics.filter(
        (item) => item.severity === 'error' || item.code.endsWith('render_failed')
      );
      return empty(html`
        <p class="supporting refusal" role="alert" data-state="no-raster">
          ${this._t('preview_no_raster')}
        </p>
        <ul class="diagnostics">
          ${(blocking.length > 0 ? blocking : preview.render.diagnostics).map(
            (item) =>
              html`<li data-code=${item.code}>
                ${labelCopy(copyKeys(item), 'diagnostic_severity_error', this.language)}
              </li>`
          )}
        </ul>
      `);
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

  // -------------------------------------------------------------------------
  // Entering the editor
  // -------------------------------------------------------------------------

  /**
   * Open a draft for the chosen stock, derived from its Factory Template.
   *
   * Derived is a *starting point*: the backend resumes unsaved work if there
   * is any and says so, because re-deriving over it would destroy exactly
   * what a reload is supposed to recover. The two cases therefore say
   * different things below rather than both silently showing a layout.
   */
  private async _openEditor(
    options: {
      templateId?: string;
      labelSizeId?: string;
      blank?: boolean;
      draft?: RecoveryDraft;
    } = {}
  ): Promise<void> {
    const capability = this.capability;
    const choice = this._choice && {
      ...this._choice,
      labelSizeId: options.labelSizeId ?? this._choice.labelSizeId,
    };
    if (!capability || !choice || this._opening) return;
    this._opening = true;
    this._failure = null;
    try {
      const factory = capability.catalogues.factory_templates.find(
        (template) => template.label_size_id === choice.labelSizeId
      );
      const address = { labelSizeId: choice.labelSizeId, templateId: options.templateId };
      const answer = options.draft
        ? { outcome: 'ok' as const, draft: options.draft }
        : await openLabelTemplateDraft(
            address,
            !options.blank && !options.templateId && factory
              ? { kind: 'factory', id: factory.id }
              : undefined
          );
      if (answer.outcome === 'refused') {
        this._failure = refusalCopy(answer.refusal.code, this.language);
        return;
      }
      const parsed = TemplateDraftSchema.safeParse(answer.draft);
      if (!parsed.success || answer.draft.layout_schema_version !== 1) {
        this._failure = this._t('library_opaque');
        downloadTemplateData(answer.draft, 'label-draft-recovery.json');
        return;
      }
      this._session?.close();
      const size = labelSizes(capability).find((item) => item.id === choice.labelSizeId)!;
      const session = new DraftSession(
        address,
        { widthMm: size.width_mm, heightMm: size.height_mm },
        parsed.data.document,
        {
          quantumMm: capability.limits.coordinate_quantum_mm,
          fixtureFamily: choice.fixtureFamily,
          density: choice.density,
          locale: choice.locale,
        }
      );
      session.adopt(parsed.data, null, options.draft?.stale);
      this._session = session;
      this._published = null;
      this.#announceEditing(true);
      // The first raster, so the canvas opens onto the backend's own picture
      // rather than onto frames floating over nothing.
      void session.render();
    } catch (error) {
      this._failure = error instanceof Error ? error.message : String(error);
    } finally {
      this._opening = false;
    }
  }

  private _closeEditor(): void {
    this._session?.close();
    this._session = null;
    this.#announceEditing(false);
  }

  /**
   * Tell the frame above that this pane wants the whole screen.
   *
   * The dialog owns its own chrome, and the editor is the one surface inside
   * it that is a task mode rather than a panel. An event rather than a shared
   * store, because exactly one dialog is ever listening.
   */
  #announceEditing(editing: boolean): void {
    this.editing = editing;
    this.dispatchEvent(
      new CustomEvent('editing', { detail: { editing }, bubbles: true, composed: true })
    );
  }

  private _onPublished(event: CustomEvent<{ name: string }>): void {
    this._published = event.detail.name;
    this._closeEditor();
  }

  private _renderEditor(session: DraftSession): TemplateResult {
    return html`
      ${this._renderLibrary(session)}
      <growspace-label-editor
        .capability=${this.capability}
        .session=${session}
        .language=${this.language}
        @close-editor=${this._closeEditor}
        @published=${this._onPublished}
        @discarded=${this._closeEditor}
      ></growspace-label-editor>
    `;
  }

  private _renderLibrary(session: DraftSession | null = null): TemplateResult | typeof nothing {
    // A user who loses administrator rights mid-edit still needs the recovery
    // export. The child narrows that state to read-only instead of exposing
    // the management catalogue or mutation controls.
    if (!getHass()?.user?.is_admin && !session) return nothing;
    return html`<growspace-template-library
      .capability=${this.capability}
      .labelSizeId=${this._choice?.labelSizeId ?? ''}
      .language=${this.language}
      .session=${session}
      @open-template=${(event: CustomEvent) => void this._openEditor(event.detail)}
      @close-editor=${this._closeEditor}
    ></growspace-template-library>`;
  }

  protected render(): TemplateResult | typeof nothing {
    const capability = this.capability;
    if (!capability) return nothing;
    // The editor is a task mode, not a panel: it takes the whole surface,
    // because a canvas sharing a dialog with the catalogue it was reached
    // from is neither a usable editor nor a usable catalogue.
    if (this._session !== null) return this._renderEditor(this._session);
    // The claim below is about the raster, so it is made only when there is
    // one. "The preview is exactly what this printer would receive" printed
    // over an empty stage would be the untruth this whole surface avoids.
    const shown =
      this._preview?.outcome === 'rendered' && this._preview.render.raster !== null
        ? labelSizeState(capability, this._preview.render.render_context.label_size_id)
        : undefined;

    const editable =
      this._choice !== undefined &&
      labelSizeState(capability, this._choice.labelSizeId) !== 'unprofiled';

    const library = this._renderLibrary();

    // Size first, because both panes answer to it; then the Factory layout for
    // that size beside the Named Templates saved for it. Reading order and tab
    // order are the same: the label, what to do with it, then the library.
    return html`
      <p class="supporting scope" data-role="scope">${this._t('read_only')}</p>
      ${this._renderSizes(capability)}
      <div class="panes" ?data-library=${library !== nothing}>
        <section class="factory" aria-labelledby="factory-title">
          <h3 class="pane-title" id="factory-title">${this._t('factory_title')}</h3>
          ${this._renderFixtures(capability)} ${this._renderStage(capability)}
          <button
            type="button"
            class="edit"
            data-action="edit"
            ?disabled=${!editable || this._opening}
            @click=${() => void this._openEditor()}
          >
            ${this._opening ? this._t('editor_opening') : this._t('editor_open')}
          </button>
          ${this._renderOutcome(shown)}
        </section>
        ${library}
      </div>
    `;
  }

  /** What was just published, and what the raster on show may authorize. */
  private _renderOutcome(shown: ReturnType<typeof labelSizeState> | undefined): TemplateResult {
    return html`
      ${this._published === null
        ? nothing
        : html`<p class="supporting" role="status" data-role="published">
            ${localizeWithParams(
              'labels.editor_published',
              { name: this._published },
              this.language
            )}
          </p>`}
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
