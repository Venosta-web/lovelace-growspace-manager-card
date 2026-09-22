/**
 * `<growspace-label-inspector>` — the Selection panel, and the keyboard's
 * equal to every drag.
 *
 * Two rules decide what appears here.
 *
 * **Every precision operation has an alternative to dragging.** A pointer can
 * place a frame to about a tenth of a millimetre on a 50 mm label at typical
 * zoom, which is not good enough for a QR quiet zone or a 0.4 mm rule — and
 * some people cannot drag at all. So the exact millimetre fields, the nudge
 * pad, the ordering buttons and the style controls are not conveniences
 * beside the canvas: they are the canvas's obligations, discharged.
 *
 * **Every control's options come from the capability or the canonical
 * schema**, never from this file. See `constraints.ts` — the whole of that
 * module exists so that a control here cannot offer a value that produces a
 * document the backend refuses or the compiler blocks.
 *
 * The element is edited as a whole and handed back: this panel never mutates
 * the document, never touches the session, and never talks to the backend. It
 * emits one `element-change` carrying the complete replacement, which is what
 * lets the editor decide whether a change is one undo step or part of a run
 * of them.
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { localize, localizeWithParams } from '../../../localize/localize';
import { variables } from '../../../styles/variables';
import type { CapabilityProfile, LabelTemplateCapability } from '../../../slices/labels';
import type { LabelElement, LabelFrame } from '../../../slices/labels/draft-schema';
import {
  DEFAULT_QUANTUM_MM,
  NUDGE_MM,
  setFrameField,
  translateFrame,
  type StockMm,
} from './geometry';
import {
  bindingsFor,
  dividerControls,
  logoControls,
  qrControls,
  rotationsFor,
  textControls,
} from './constraints';

/** The four exact controls, and the order the inspector lists them in. */
const FIELDS: { key: keyof LabelFrame; label: string }[] = [
  { key: 'x_mm', label: 'editor_field_x' },
  { key: 'y_mm', label: 'editor_field_y' },
  { key: 'width_mm', label: 'editor_field_width' },
  { key: 'height_mm', label: 'editor_field_height' },
];

@customElement('growspace-label-inspector')
export class GrowspaceLabelInspector extends LitElement {
  @property({ attribute: false }) capability?: LabelTemplateCapability;
  @property({ attribute: false }) profile: CapabilityProfile | null = null;
  @property({ attribute: false }) element?: LabelElement;
  @property({ attribute: false }) stock: StockMm = { widthMm: 1, heightMm: 1 };
  @property({ type: Number }) quantumMm = DEFAULT_QUANTUM_MM;
  @property({ type: Number }) selectionSize = 0;
  @property({ type: String }) language = 'en';

  static styles = [
    variables,
    css`
      :host {
        display: block;
        min-width: 0;
        /* As in the editor: a shadow root inherits the colour property, and
           a host that set only the token left this panel's prose at the
           document default. */
        color: var(--primary-text-color);
      }

      h3 {
        font-size: var(--font-size-sm, 13px);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        opacity: 0.85;
        margin: var(--spacing-md, 16px) 0 var(--spacing-sm, 8px);
      }

      h3:first-of-type {
        margin-top: 0;
      }

      label {
        display: block;
        font-size: var(--font-size-xs, 11px);
        opacity: 0.85;
        margin-bottom: 2px;
      }

      input,
      select {
        font: inherit;
        color: var(--primary-text-color);
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.04));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: var(--border-radius-sm, 4px);
        padding: 6px 8px;
        width: 100%;
        /* 44 px is the smallest target this editor ships, everywhere. */
        min-height: 44px;
        box-sizing: border-box;
      }

      button {
        font: inherit;
        min-height: 44px;
        min-width: 44px;
        padding: 6px 10px;
        border-radius: var(--border-radius-md, 8px);
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.04));
        color: var(--primary-text-color);
        cursor: pointer;
      }

      button[aria-pressed='true'] {
        border-color: var(--primary-color, #4caf50);
        color: var(--primary-color, #4caf50);
        /* Not colour alone: the pressed option is also underscored, which
           survives forced colours, greyscale and a monochrome display. */
        text-decoration: underline;
        text-underline-offset: 3px;
      }

      button[disabled] {
        cursor: not-allowed;
        opacity: 0.5;
      }

      .fields {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
        gap: var(--spacing-sm, 8px);
      }

      .nudge {
        display: grid;
        grid-template-columns: repeat(3, minmax(44px, 1fr));
        gap: var(--spacing-xs, 4px);
        max-width: 180px;
      }

      /* Keypad layout: up centered above down, left/down/right in a row below. */
      .nudge button:nth-child(1) {
        grid-column: 2;
        grid-row: 1;
      }

      .nudge button:nth-child(2) {
        grid-column: 1;
        grid-row: 2;
      }

      .nudge button:nth-child(3) {
        grid-column: 2;
        grid-row: 2;
      }

      .nudge button:nth-child(4) {
        grid-column: 3;
        grid-row: 2;
      }

      .segmented {
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-xs, 4px);
      }

      .segmented button {
        flex: 1 1 auto;
      }

      .supporting {
        opacity: 0.85;
        font-size: var(--font-size-sm, 13px);
        line-height: 1.45;
        margin: var(--spacing-xs, 4px) 0 0;
      }

      dl.fixed {
        display: grid;
        grid-template-columns: max-content 1fr;
        gap: 2px var(--spacing-md, 16px);
        margin: 0;
        font-size: var(--font-size-xs, 11px);
        opacity: 0.85;
      }

      dl.fixed dd {
        margin: 0;
      }

      @media (forced-colors: active) {
        button[aria-pressed='true'] {
          border: 2px solid ButtonText;
        }
      }
    `,
  ];

  private _t(key: string): string {
    return localize(`labels.${key}`, '', '', this.language);
  }

  /**
   * A localized name, or the backend's own identifier when there is none.
   *
   * Binding ids, parameter names and style tokens are catalogue entries, and
   * a minor version may add one. `localize` answers a missing key with the
   * key itself, so without this a new binding would appear in the picker as
   * `labels.binding_plant_cultivar` — which is worse than the id it came
   * with, because the id at least names the thing.
   */
  #name(key: string, fallback: string): string {
    const value = localize(`labels.${key}`, '', '', this.language);
    return value === `labels.${key}` ? fallback : value;
  }

  /** Hand the editor a complete replacement for the element on display. */
  /**
   * Put focus on the control that edits one field, once it is rendered.
   *
   * What a diagnostic's "go to" ends in: not the element, the exact input.
   * Waits for the update because the caller has usually just changed the
   * selection, and the control it names does not exist until this renders
   * the element it belongs to. Answers whether there was such a control.
   */
  async focusControl(field: string): Promise<boolean> {
    await this.updateComplete;
    const control = this.renderRoot.querySelector<HTMLElement>(
      `[data-field="${CSS.escape(field)}"]`
    );
    if (!control) return false;
    control.focus();
    control.scrollIntoView?.({ block: 'nearest' });
    return true;
  }

  #change(element: LabelElement, gesture: string | null = null): void {
    this.dispatchEvent(
      new CustomEvent('element-change', {
        detail: { element, gesture },
        bubbles: true,
        composed: true,
      })
    );
  }

  #frame(frame: LabelFrame, gesture: string | null = null): void {
    if (this.element === undefined) return;
    this.#change({ ...this.element, frame }, gesture);
  }

  // -------------------------------------------------------------------------
  // Geometry
  // -------------------------------------------------------------------------

  #renderGeometry(element: LabelElement): TemplateResult {
    return html`
      <h3>${this._t('editor_position')}</h3>
      <div class="fields">
        ${FIELDS.map(
          (field) => html`
            <div>
              <label for=${field.key}>${this._t(field.label)}</label>
              <input
                id=${field.key}
                type="number"
                inputmode="decimal"
                step=${this.quantumMm}
                min="0"
                data-field=${field.key}
                .value=${String(element.frame[field.key])}
                @change=${(event: Event) =>
                  this.#frame(
                    setFrameField(
                      element.frame,
                      field.key,
                      Number.parseFloat((event.target as HTMLInputElement).value),
                      this.stock,
                      this.quantumMm
                    )
                  )}
              />
            </div>
          `
        )}
      </div>
      <h3>${this._t('editor_nudge')}</h3>
      <div class="nudge" role="group" aria-label=${this._t('editor_nudge')}>
        ${(
          [
            ['up', 0, -NUDGE_MM],
            ['left', -NUDGE_MM, 0],
            ['down', 0, NUDGE_MM],
            ['right', NUDGE_MM, 0],
          ] as const
        ).map(
          ([name, dx, dy]) => html`
            <button
              type="button"
              data-nudge=${name}
              aria-label=${this._t(`editor_nudge_${name}`)}
              @click=${() =>
                this.#frame(translateFrame(element.frame, dx, dy, this.stock, this.quantumMm))}
            >
              ${{ up: '↑', left: '←', down: '↓', right: '→' }[name]}
            </button>
          `
        )}
      </div>
      <p class="supporting">${this._t('editor_nudge_hint')}</p>
    `;
  }

  // -------------------------------------------------------------------------
  // Rotation
  // -------------------------------------------------------------------------

  /**
   * The rotations this printer can actually place.
   *
   * When a profile realises only one, the control becomes a sentence instead
   * of a choice — the alternative is a button that writes a document the
   * compiler answers with `profile.rotation_unsupported`, which teaches the
   * constraint at the worst possible moment.
   */
  #renderRotation(element: LabelElement): TemplateResult {
    const options = rotationsFor(element.kind, this.profile);
    if (options.length <= 1) {
      return html`
        <h3>${this._t('editor_rotation')}</h3>
        <p class="supporting" data-role="rotation-fixed">
          ${localizeWithParams(
            'labels.editor_rotation_fixed',
            { degrees: String(element.rotation) },
            this.language
          )}
        </p>
      `;
    }
    return html`
      <h3>${this._t('editor_rotation')}</h3>
      <div class="segmented" role="group" aria-label=${this._t('editor_rotation')}>
        ${options.map(
          (degrees) => html`
            <button
              type="button"
              data-rotation=${degrees}
              aria-pressed=${element.rotation === degrees}
              @click=${() => this.#change({ ...element, rotation: degrees })}
            >
              ${degrees}°
            </button>
          `
        )}
      </div>
    `;
  }

  // -------------------------------------------------------------------------
  // Content
  // -------------------------------------------------------------------------

  /**
   * Where this element's value comes from.
   *
   * A divider has none — it is a mark, not a container — so this whole
   * section is absent for one, rather than present and empty.
   */
  #renderContent(element: LabelElement): TemplateResult | typeof nothing {
    if (element.kind === 'divider') return nothing;
    const bindings = bindingsFor(this.capability, element.kind);
    const content = element.content;
    const bound = 'binding' in content;
    // Only text takes a literal: a QR of a typed string and a logo of one are
    // not things the v1 catalogue can resolve to ink.
    const literalAllowed = element.kind === 'text';

    return html`
      <h3>${this._t('editor_content')}</h3>
      ${literalAllowed
        ? html`
            <div class="segmented" role="group" aria-label=${this._t('editor_content_source')}>
              <button
                type="button"
                data-source="binding"
                aria-pressed=${bound}
                ?disabled=${bindings.length === 0}
                @click=${() => this.#useBinding(element, bindings[0]?.id)}
              >
                ${this._t('editor_content_binding')}
              </button>
              <button
                type="button"
                data-source="literal"
                aria-pressed=${!bound}
                @click=${() =>
                  this.#change({
                    ...element,
                    kind: 'text',
                    content: { literal: this._t('editor_content_placeholder') },
                  } as LabelElement)}
              >
                ${this._t('editor_content_literal')}
              </button>
            </div>
          `
        : nothing}
      ${bound
        ? this.#renderBinding(element, bindings, content.binding)
        : 'literal' in content
          ? html`
              <p>
                <label for="literal">${this._t('editor_content_literal')}</label>
                <input
                  id="literal"
                  type="text"
                  data-field="literal"
                  .value=${content.literal}
                  @change=${(event: Event) =>
                    this.#change({
                      ...element,
                      content: { literal: (event.target as HTMLInputElement).value },
                    } as LabelElement)}
                />
              </p>
            `
          : html`<p class="supporting" data-role="asset">${this._t('editor_content_asset')}</p>`}
    `;
  }

  #useBinding(element: LabelElement, bindingId: string | undefined): void {
    if (bindingId === undefined || element.kind === 'divider') return;
    const binding = bindingsFor(this.capability, element.kind).find(
      (entry) => entry.id === bindingId
    );
    if (binding === undefined) return;
    const parameters: Record<string, string> = {};
    for (const [name, allowed] of Object.entries(binding.parameters)) {
      const first = allowed[0];
      if (first !== undefined) parameters[name] = first;
    }
    this.#change({ ...element, content: { binding: binding.id, parameters } } as LabelElement);
  }

  #renderBinding(
    element: LabelElement,
    bindings: ReturnType<typeof bindingsFor>,
    current: string
  ): TemplateResult {
    const definition = bindings.find((entry) => entry.id === current);
    const parameters =
      element.kind === 'divider' || !('binding' in element.content)
        ? {}
        : (element.content.parameters ?? {});
    return html`
      <p>
        <label for="binding">${this._t('editor_content_binding')}</label>
        <select
          id="binding"
          data-field="binding"
          .value=${current}
          @change=${(event: Event) =>
            this.#useBinding(element, (event.target as HTMLSelectElement).value)}
        >
          ${bindings.map(
            (entry) => html`
              <option value=${entry.id} ?selected=${entry.id === current}>
                ${this.#name(`binding_${entry.id.replace(/\./g, '_')}`, entry.id)}
              </option>
            `
          )}
        </select>
      </p>
      ${Object.entries(definition?.parameters ?? {}).map(
        ([name, allowed]) => html`
          <p>
            <label for=${`parameter-${name}`}
              >${this.#name(`editor_parameter_${name}`, name)}</label
            >
            <select
              id=${`parameter-${name}`}
              data-parameter=${name}
              @change=${(event: Event) =>
                this.#change({
                  ...element,
                  content: {
                    binding: current,
                    parameters: {
                      ...parameters,
                      [name]: (event.target as HTMLSelectElement).value,
                    },
                  },
                } as LabelElement)}
            >
              ${allowed.map(
                (value) => html`
                  <option value=${value} ?selected=${parameters[name] === value}>
                    ${this.#name(`editor_value_${value}`, value)}
                  </option>
                `
              )}
            </select>
          </p>
        `
      )}
      ${definition === undefined
        ? html`<p class="supporting" data-role="unknown-binding">
            ${localizeWithParams('labels.editor_binding_unknown', { id: current }, this.language)}
          </p>`
        : nothing}
    `;
  }

  // -------------------------------------------------------------------------
  // Style, per kind
  // -------------------------------------------------------------------------

  #renderStyle(element: LabelElement): TemplateResult {
    switch (element.kind) {
      case 'text':
        return this.#renderTextStyle(element);
      case 'logo':
        return this.#renderLogoStyle(element);
      case 'qr':
        return this.#renderQrStyle(element);
      case 'divider':
        return this.#renderDividerStyle(element);
    }
  }

  #renderTextStyle(element: Extract<LabelElement, { kind: 'text' }>): TemplateResult {
    const controls = textControls(this.capability, this.profile);
    const style = element.style;
    const set = (patch: Partial<typeof style>): void =>
      this.#change({ ...element, style: { ...style, ...patch } });

    return html`
      <h3>${this._t('editor_style')}</h3>
      <p>
        <label for="font">${this._t('editor_style_font')}</label>
        <select
          id="font"
          data-field="font"
          @change=${(event: Event) => set({ font: (event.target as HTMLSelectElement).value })}
        >
          ${controls.fonts.map(
            (font) => html`
              <option value=${font.id} ?selected=${font.id === style.font}>
                ${font.description}
              </option>
            `
          )}
        </select>
      </p>
      <div class="fields">
        <div>
          <label for="font_size_mm">${this._t('editor_style_font_size')}</label>
          <input
            id="font_size_mm"
            type="number"
            inputmode="decimal"
            step="0.1"
            min=${controls.readableFloorMm}
            data-field="font_size_mm"
            .value=${String(style.font_size_mm)}
            @change=${(event: Event) =>
              set({ font_size_mm: millimetres(event, style.font_size_mm, this.quantumMm) })}
          />
        </div>
        <div>
          <label for="minimum_font_size_mm">${this._t('editor_style_minimum_font_size')}</label>
          <input
            id="minimum_font_size_mm"
            type="number"
            inputmode="decimal"
            step="0.1"
            min=${controls.readableFloorMm}
            data-field="minimum_font_size_mm"
            .value=${String(style.minimum_font_size_mm)}
            @change=${(event: Event) =>
              set({
                minimum_font_size_mm: millimetres(
                  event,
                  style.minimum_font_size_mm,
                  this.quantumMm
                ),
              })}
          />
        </div>
        <div>
          <label for="maximum_lines">${this._t('editor_style_maximum_lines')}</label>
          <input
            id="maximum_lines"
            type="number"
            inputmode="numeric"
            step="1"
            min="1"
            data-field="maximum_lines"
            .value=${String(style.maximum_lines)}
            @change=${(event: Event) => {
              const value = Number.parseInt((event.target as HTMLInputElement).value, 10);
              if (Number.isFinite(value) && value >= 1) set({ maximum_lines: value });
            }}
          />
        </div>
      </div>
      <p class="supporting" data-role="font-floor">
        ${localizeWithParams(
          'labels.editor_style_font_floor',
          {
            floor: String(controls.readableFloorMm),
            comfort: String(controls.comfortThresholdMm),
          },
          this.language
        )}
      </p>
      ${this.#segmented(
        'editor_style_horizontal',
        'text_align',
        controls.horizontalAlign,
        style.horizontal_align,
        (value) => set({ horizontal_align: value as typeof style.horizontal_align })
      )}
      ${this.#segmented(
        'editor_style_vertical',
        'text_valign',
        controls.verticalAlign,
        style.vertical_align,
        (value) => set({ vertical_align: value as typeof style.vertical_align })
      )}
      <p>
        <label for="line_spacing">${this._t('editor_style_line_spacing')}</label>
        <select
          id="line_spacing"
          data-field="line_spacing"
          @change=${(event: Event) =>
            set({ line_spacing: (event.target as HTMLSelectElement).value })}
        >
          ${controls.lineSpacing.map(
            (spacing) => html`
              <option value=${spacing.id} ?selected=${spacing.id === style.line_spacing}>
                ${this.#name(
                  `editor_spacing_${spacing.id.split('.')[2] ?? spacing.id}`,
                  spacing.id
                )}
              </option>
            `
          )}
        </select>
      </p>
      <p>
        <label for="overflow">${this._t('editor_style_overflow')}</label>
        <select
          id="overflow"
          data-field="overflow"
          @change=${(event: Event) =>
            set({
              overflow: (event.target as HTMLSelectElement).value as typeof style.overflow,
            })}
        >
          ${controls.overflow.map(
            (policy) => html`
              <option value=${policy} ?selected=${policy === style.overflow}>
                ${this._t(`editor_overflow_${policy}`)}
              </option>
            `
          )}
        </select>
      </p>
    `;
  }

  #renderLogoStyle(element: Extract<LabelElement, { kind: 'logo' }>): TemplateResult {
    const controls = logoControls(this.capability, this.profile);
    const style = element.style;
    return html`
      <h3>${this._t('editor_style')}</h3>
      <p>
        <label for="monochrome">${this._t('editor_style_monochrome')}</label>
        <select
          id="monochrome"
          data-field="monochrome"
          @change=${(event: Event) =>
            this.#change({
              ...element,
              style: { ...style, monochrome: (event.target as HTMLSelectElement).value },
            })}
        >
          ${controls.monochrome.map(
            (token) => html`
              <option value=${token.id} ?selected=${token.id === style.monochrome}>
                ${this._t(token.dither ? 'editor_mono_dither' : 'editor_mono_threshold')}
              </option>
            `
          )}
        </select>
      </p>
      <dl class="fixed" data-role="fixed">
        <dt>${this._t('editor_style_fit')}</dt>
        <dd>${style.fit}</dd>
        <dt>${this._t('editor_style_min_dpi')}</dt>
        <dd>${controls.minimumEffectiveDpi}</dd>
      </dl>
      <p class="supporting">${this._t('editor_style_fit_fixed')}</p>
    `;
  }

  #renderQrStyle(element: Extract<LabelElement, { kind: 'qr' }>): TemplateResult {
    const controls = qrControls(this.profile);
    const style = element.style;
    return html`
      <h3>${this._t('editor_style')}</h3>
      <p>
        <label for="error_correction">${this._t('editor_style_error_correction')}</label>
        <select
          id="error_correction"
          data-field="error_correction"
          @change=${(event: Event) =>
            this.#change({
              ...element,
              style: { ...style, error_correction: (event.target as HTMLSelectElement).value },
            })}
        >
          ${controls.errorCorrection.map(
            (level) => html`
              <option value=${level} ?selected=${level === style.error_correction}>
                ${this.#name(`editor_correction_${level}`, level)}
              </option>
            `
          )}
        </select>
      </p>
      <p>
        <label for="quiet_zone_modules">${this._t('editor_style_quiet_zone')}</label>
        <input
          id="quiet_zone_modules"
          type="number"
          inputmode="numeric"
          step="1"
          min=${controls.minimumQuietZoneModules}
          data-field="quiet_zone_modules"
          .value=${String(style.quiet_zone_modules)}
          @change=${(event: Event) => {
            const value = Number.parseInt((event.target as HTMLInputElement).value, 10);
            if (Number.isFinite(value) && value >= 0) {
              this.#change({ ...element, style: { ...style, quiet_zone_modules: value } });
            }
          }}
        />
      </p>
      <p class="supporting" data-role="quiet-zone-floor">
        ${localizeWithParams(
          'labels.editor_style_quiet_zone_floor',
          {
            modules: String(controls.minimumQuietZoneModules),
            bytes: String(controls.maximumEncodedBytes),
          },
          this.language
        )}
      </p>
    `;
  }

  #renderDividerStyle(element: Extract<LabelElement, { kind: 'divider' }>): TemplateResult {
    const controls = dividerControls(this.profile);
    return html`
      <h3>${this._t('editor_style')}</h3>
      <dl class="fixed" data-role="fixed">
        <dt>${this._t('editor_style_fill')}</dt>
        <dd>${element.style.fill}</dd>
      </dl>
      <p class="supporting" data-role="divider-floor">
        ${localizeWithParams(
          'labels.editor_style_divider_floor',
          { thickness: String(controls.minimumThicknessMm) },
          this.language
        )}
      </p>
    `;
  }

  /** One closed enumeration, as buttons that say which is chosen without colour. */
  #segmented(
    labelKey: string,
    group: string,
    options: readonly string[],
    current: string,
    choose: (value: string) => void
  ): TemplateResult {
    // The option keys are the group's own rather than shared, because a
    // horizontal `center` and a vertical `center` are different words in
    // English and in most other languages — and the arrange toolbar's
    // "centre horizontally" is a third meaning again.
    return html`
      <h3>${this._t(labelKey)}</h3>
      <div class="segmented" role="group" aria-label=${this._t(labelKey)}>
        ${options.map(
          (option) => html`
            <button
              type="button"
              data-group=${group}
              data-option=${option}
              aria-pressed=${option === current}
              @click=${() => choose(option)}
            >
              ${this.#name(`editor_${group}_${option}`, option)}
            </button>
          `
        )}
      </div>
    `;
  }

  protected render(): TemplateResult {
    const element = this.element;
    if (element === undefined) {
      return html`<p class="supporting" data-role="empty">
        ${this._t('editor_nothing_selected')}
      </p>`;
    }
    return html`
      <p class="supporting" data-role="subject">
        ${this.selectionSize > 1
          ? localizeWithParams(
              'labels.editor_selection_many',
              { count: String(this.selectionSize), kind: this._t(`editor_kind_${element.kind}`) },
              this.language
            )
          : this._t(`editor_kind_${element.kind}`)}
      </p>
      ${this.#renderGeometry(element)} ${this.#renderRotation(element)}
      ${this.#renderContent(element)} ${this.#renderStyle(element)}
    `;
  }
}

/** A millimetre value from a number field, quantized, falling back to what was there. */
function millimetres(event: Event, fallback: number, quantumMm: number): number {
  const value = Number.parseFloat((event.target as HTMLInputElement).value);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Number.parseFloat((Math.round(value / quantumMm) * quantumMm).toFixed(6));
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-label-inspector': GrowspaceLabelInspector;
  }
}
