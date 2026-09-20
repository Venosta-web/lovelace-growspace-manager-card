/**
 * `<growspace-label-editor>` — the full-screen Label Template task mode.
 *
 * The structure is the one settled in the editing-loop decision: **Label
 * elements** on the left, the **canvas** with its toolbar in the middle, the
 * **Selection** inspector on the right; and on a narrow screen the canvas
 * stays primary with the two panels behind a bottom workbench tab bar,
 * because a phone editing a label is looking at the label.
 *
 * **It draws frames, never ink.** The picture underneath is the backend's own
 * raster, exactly as the read-only surface shows one; what this element adds
 * on top is an outline and eight handles. That is the whole of #224's promise
 * kept — nothing on screen claims to be the printed result except the raster
 * — and it is also what makes staleness visible rather than asserted: the
 * outline has moved and the picture under it has not, which is a thing a user
 * can see without reading a word.
 *
 * Millimetres come from the stage's measured box, so a drag behaves the same
 * at any browser zoom. Nothing here reads a zoom level; there is nothing to
 * correct for when no scale was ever assumed.
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import {
  mdiArrowLeft,
  mdiContentSaveOutline,
  mdiRedo,
  mdiRefresh,
  mdiTrashCanOutline,
  mdiUndo,
} from '@mdi/js';

import { localize, localizeWithParams } from '../../../localize/localize';
import { variables } from '../../../styles/variables';
import type { LabelTemplateCapability } from '../../../slices/labels';
import type { LabelElement, LabelFrame } from '../../../slices/labels/draft-schema';
import { DraftSession, publishBlockedBy, type SessionState } from './draft-session';
import {
  COARSE_NUDGE_MM,
  NUDGE_MM,
  defaultSelection,
  elementById,
  frameAsPercentages,
  pixelsToMm,
  resizeFrame,
  setFrameField,
  translateFrame,
  type ResizeHandle,
  type StockMm,
} from './geometry';

/** The eight handles, in the order a reader goes round a rectangle. */
const HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

/** The four exact controls, and the order the inspector lists them in. */
const FIELDS: { key: keyof LabelFrame; label: string }[] = [
  { key: 'x_mm', label: 'editor_field_x' },
  { key: 'y_mm', label: 'editor_field_y' },
  { key: 'width_mm', label: 'editor_field_width' },
  { key: 'height_mm', label: 'editor_field_height' },
];

/** Which panel a narrow screen is showing beside the canvas. */
type Workbench = 'canvas' | 'elements' | 'selection';

/** One in-flight pointer gesture, in the frame it started from. */
interface Gesture {
  pointerId: number;
  elementId: string;
  handle: ResizeHandle | null;
  originX: number;
  originY: number;
  startFrame: LabelFrame;
  key: string;
}

@customElement('growspace-label-editor')
export class GrowspaceLabelEditor extends LitElement {
  /** The negotiated capability. The quantum and the stock come off it. */
  @property({ attribute: false }) capability?: LabelTemplateCapability;
  /** The live session. Owned by the caller, because it outlives this element. */
  @property({ attribute: false }) session?: DraftSession;
  @property({ type: String }) language = 'en';

  @state() private _model?: SessionState;
  @state() private _workbench: Workbench = 'canvas';

  #unsubscribe?: () => void;
  #gesture: Gesture | null = null;

  static styles = [
    variables,
    css`
      :host {
        display: flex;
        flex-direction: column;
        min-height: 0;
        height: 100%;
      }

      header.bar {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
        padding: 8px 12px;
        border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        flex-wrap: wrap;
      }

      header.bar .name {
        flex: 1 1 180px;
        min-width: 140px;
      }

      input[type='text'],
      input[type='number'] {
        font: inherit;
        color: var(--primary-text-color);
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.04));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: var(--border-radius-sm, 4px);
        padding: 6px 8px;
        width: 100%;
        min-height: 36px;
        box-sizing: border-box;
      }

      button {
        font: inherit;
        min-height: 40px;
        min-width: 40px;
        padding: 6px 10px;
        border-radius: var(--border-radius-md, 8px);
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        background: var(--secondary-background-color, rgba(255, 255, 255, 0.04));
        color: var(--primary-text-color);
        cursor: pointer;
      }

      button[disabled] {
        cursor: not-allowed;
        opacity: 0.5;
      }

      button.primary:not([disabled]) {
        border-color: var(--primary-color, #4caf50);
        color: var(--primary-color, #4caf50);
      }

      button svg {
        width: 20px;
        height: 20px;
        fill: currentColor;
        display: block;
        margin: 0 auto;
      }

      .layout {
        display: grid;
        grid-template-columns: 200px minmax(0, 1fr) 260px;
        gap: var(--spacing-md, 16px);
        padding: var(--spacing-md, 16px);
        flex: 1;
        min-height: 0;
        overflow: auto;
      }

      aside {
        min-width: 0;
      }

      aside h2,
      aside h3 {
        font-size: var(--font-size-sm, 13px);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        opacity: 0.7;
        margin: 0 0 var(--spacing-sm, 8px);
      }

      .workspace {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm, 8px);
        min-width: 0;
      }

      .toolbar {
        display: flex;
        gap: var(--spacing-xs, 4px);
        flex-wrap: wrap;
        align-items: center;
      }

      .stage-wrap {
        display: flex;
        justify-content: center;
      }

      /* The paper. Its aspect ratio is the stock's, so the millimetre map is
         the same in both axes and a measured box is all the scale there is. */
      .stage {
        position: relative;
        width: 100%;
        max-width: 560px;
        background: #fff;
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        border-radius: var(--border-radius-sm, 4px);
        touch-action: none;
        overflow: hidden;
      }

      .stage img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        image-rendering: pixelated;
      }

      /* Stale is shown, not stated: the raster fades behind the frames that
         have moved past it, so the difference is visible before it is read. */
      .stage img[data-standing='stale'] {
        opacity: 0.35;
        filter: grayscale(1);
      }

      .element {
        position: absolute;
        border: 1px dashed rgba(0, 0, 0, 0.45);
        background: transparent;
        cursor: move;
        padding: 0;
        min-height: 0;
        min-width: 0;
        border-radius: 0;
      }

      .element[aria-pressed='true'] {
        border: 1px solid var(--primary-color, #4caf50);
        box-shadow: 0 0 0 1px var(--primary-color, #4caf50);
      }

      .handle {
        position: absolute;
        width: 14px;
        height: 14px;
        margin: -7px 0 0 -7px;
        border-radius: 50%;
        border: 1px solid var(--primary-color, #4caf50);
        background: #fff;
        padding: 0;
        min-height: 0;
        min-width: 0;
        touch-action: none;
      }

      .nudge {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--spacing-xs, 4px);
        max-width: 160px;
      }

      .nudge button:nth-child(1) {
        grid-column: 2;
      }

      .fields {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-sm, 8px);
      }

      label {
        display: block;
        font-size: var(--font-size-xs, 11px);
        opacity: 0.75;
        margin-bottom: 2px;
      }

      .supporting {
        opacity: 0.75;
        font-size: var(--font-size-sm, 13px);
        line-height: 1.45;
        margin: var(--spacing-sm, 8px) 0 0;
      }

      .refusal {
        border: 1px solid var(--error-color, #f44336);
        border-radius: var(--border-radius-md, 8px);
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        margin: 0 var(--spacing-md, 16px);
        color: var(--error-color, #f44336);
      }

      .refusal button {
        margin-right: var(--spacing-sm, 8px);
      }

      ul.elements,
      ul.diagnostics {
        list-style: none;
        margin: 0;
        padding: 0;
      }

      ul.elements button {
        width: 100%;
        text-align: left;
      }

      ul.diagnostics {
        font-size: var(--font-size-xs, 11px);
        line-height: 1.5;
        opacity: 0.9;
      }

      .tabs {
        display: none;
      }

      @media (max-width: 800px) {
        /* Canvas-primary: the panels are one tap away and never crowd it. */
        .layout {
          grid-template-columns: minmax(0, 1fr);
        }

        aside[hidden-on-narrow] {
          display: none;
        }

        .tabs {
          display: flex;
          gap: var(--spacing-xs, 4px);
          padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
          border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
        }

        .tabs button {
          flex: 1;
        }
      }
    `,
  ];

  connectedCallback(): void {
    super.connectedCallback();
    this.#attach();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
  }

  protected willUpdate(changed: Map<string | number | symbol, unknown>): void {
    if (changed.has('session')) this.#attach();
  }

  #attach(): void {
    this.#unsubscribe?.();
    const session = this.session;
    if (!session) return;
    this._model = session.state;
    this.#unsubscribe = session.subscribe((state) => {
      this._model = state;
    });
    if (session.state.selectedId === null) {
      session.select(defaultSelection(session.state.document));
    }
  }

  private _t(key: string): string {
    return localize(`labels.${key}`, '', '', this.language);
  }

  /** The paper this layout sits on, in its own millimetres. */
  get #stock(): StockMm {
    const size = this.capability?.catalogues.label_sizes.find(
      (candidate) => candidate.id === this.session?.address.labelSizeId
    );
    return { widthMm: size?.width_mm ?? 1, heightMm: size?.height_mm ?? 1 };
  }

  // -------------------------------------------------------------------------
  // Pointer and touch
  // -------------------------------------------------------------------------

  /**
   * One handler for mouse, pen and touch.
   *
   * Pointer Events rather than three code paths: the capture below is what
   * keeps a drag alive when the finger or cursor leaves the element, which is
   * most of a drag that reaches the paper's edge.
   */
  #onPointerDown(event: PointerEvent, elementId: string, handle: ResizeHandle | null): void {
    const session = this.session;
    // The model, because it is what the frames on screen were drawn from: a
    // gesture must start from the geometry the user is pointing at, not from
    // a session state that has moved on since the last render.
    const document = this._model?.document;
    const frame = document && elementById(document, elementId)?.frame;
    if (!session || !frame) return;
    event.preventDefault();
    event.stopPropagation();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    session.select(elementId);
    this.#gesture = {
      pointerId: event.pointerId,
      elementId,
      handle,
      originX: event.clientX,
      originY: event.clientY,
      startFrame: frame,
      key: `${handle ?? 'move'}:${event.pointerId}:${Date.now()}`,
    };
  }

  #onPointerMove(event: PointerEvent): void {
    const gesture = this.#gesture;
    const session = this.session;
    if (!gesture || !session || gesture.pointerId !== event.pointerId) return;

    const stage = this.renderRoot.querySelector('.stage');
    if (!stage) return;
    // The measured box, every move: a zoom or a resize mid-drag changes it,
    // and reading it once at pointerdown would silently scale the rest.
    const rect = stage.getBoundingClientRect();
    const { deltaXMm, deltaYMm } = pixelsToMm(
      event.clientX - gesture.originX,
      event.clientY - gesture.originY,
      rect,
      this.#stock
    );

    const next =
      gesture.handle === null
        ? translateFrame(gesture.startFrame, deltaXMm, deltaYMm, this.#stock, session.quantumMm)
        : resizeFrame(
            gesture.startFrame,
            gesture.handle,
            deltaXMm,
            deltaYMm,
            this.#stock,
            session.quantumMm
          );
    session.moveElement(gesture.elementId, next, gesture.key);
  }

  #onPointerUp(event: PointerEvent): void {
    if (this.#gesture?.pointerId !== event.pointerId) return;
    this.#gesture = null;
    this.session?.endGesture();
    void this.session?.render();
  }

  /**
   * Arrow keys nudge, Shift nudges further, Ctrl/Cmd undoes.
   *
   * A whole millimetre grid is reachable from the keyboard because pointing
   * at 0.5 mm is not something every user can do, and the exact controls
   * beside it cover the rest.
   */
  #onKeyDown(event: KeyboardEvent): void {
    const session = this.session;
    const model = this._model;
    if (!session || !model) return;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) session.redo();
      else session.undo();
      void session.render();
      return;
    }

    const step = event.shiftKey ? COARSE_NUDGE_MM : NUDGE_MM;
    const deltas: Record<string, [number, number]> = {
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
    };
    const delta = deltas[event.key];
    const element = elementById(model.document, model.selectedId);
    if (!delta || !element) return;
    event.preventDefault();
    this.#nudge(element, delta[0], delta[1]);
  }

  #nudge(element: LabelElement, deltaXMm: number, deltaYMm: number): void {
    const session = this.session;
    if (!session) return;
    session.moveElement(
      element.id,
      translateFrame(element.frame, deltaXMm, deltaYMm, this.#stock, session.quantumMm)
    );
    session.endGesture();
    void session.render();
  }

  #setField(element: LabelElement, field: keyof LabelFrame, raw: string): void {
    const session = this.session;
    const value = Number.parseFloat(raw);
    if (!session || Number.isNaN(value)) return;
    session.moveElement(
      element.id,
      setFrameField(element.frame, field, value, this.#stock, session.quantumMm)
    );
    session.endGesture();
    void session.render();
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  #renderStage(model: SessionState): TemplateResult {
    const stock = this.#stock;
    const raster = model.render?.raster ?? null;
    return html`
      <div class="stage-wrap">
        <div
          class="stage"
          role="group"
          aria-label=${this._t('editor_canvas')}
          style=${styleMap({ aspectRatio: `${stock.widthMm} / ${stock.heightMm}` })}
          @pointermove=${this.#onPointerMove}
          @pointerup=${this.#onPointerUp}
          @pointercancel=${this.#onPointerUp}
        >
          ${raster
            ? html`<img
                src=${raster.image}
                alt=${this._t('editor_raster_alt')}
                data-standing=${model.rasterStanding}
              />`
            : nothing}
          ${model.document.elements.map((element) => this.#renderElement(element, model))}
        </div>
      </div>
    `;
  }

  #renderElement(element: LabelElement, model: SessionState): TemplateResult {
    const selected = model.selectedId === element.id;
    return html`
      <button
        class="element"
        data-element=${element.id}
        aria-pressed=${selected}
        aria-label=${localizeWithParams(
          'labels.editor_element_alt',
          { kind: element.kind },
          this.language
        )}
        style=${styleMap(frameAsPercentages(element.frame, this.#stock))}
        @pointerdown=${(event: PointerEvent) => this.#onPointerDown(event, element.id, null)}
      >
        ${selected ? HANDLES.map((handle) => this.#renderHandle(element, handle)) : nothing}
      </button>
    `;
  }

  #renderHandle(element: LabelElement, handle: ResizeHandle): TemplateResult {
    const left = handle.includes('w') ? '0%' : handle.includes('e') ? '100%' : '50%';
    const top = handle.includes('n') ? '0%' : handle.includes('s') ? '100%' : '50%';
    return html`
      <button
        class="handle"
        data-handle=${handle}
        aria-label=${localizeWithParams(
          'labels.editor_handle',
          { handle: this._t(`editor_handle_${handle}`) },
          this.language
        )}
        style=${styleMap({ left, top })}
        @pointerdown=${(event: PointerEvent) => this.#onPointerDown(event, element.id, handle)}
      ></button>
    `;
  }

  #renderElements(model: SessionState): TemplateResult {
    return html`
      <aside ?hidden-on-narrow=${this._workbench !== 'elements'}>
        <h2>${this._t('editor_elements')}</h2>
        <ul class="elements">
          ${model.document.elements.map(
            (element) => html`
              <li>
                <button
                  data-list-element=${element.id}
                  aria-pressed=${model.selectedId === element.id}
                  @click=${() => this.session?.select(element.id)}
                >
                  ${this._t(`editor_kind_${element.kind}`)}
                </button>
              </li>
            `
          )}
        </ul>
      </aside>
    `;
  }

  /**
   * The Selection inspector: exact millimetres, and a nudge pad beside them.
   *
   * Constrained on purpose. This ticket's subject is the required strain-name
   * element's geometry, so what the inspector offers is position and size —
   * the styling controls the accepted design also calls for arrive with the
   * tickets that add the other element kinds.
   */
  #renderInspector(model: SessionState): TemplateResult {
    const element = elementById(model.document, model.selectedId);
    return html`
      <aside ?hidden-on-narrow=${this._workbench !== 'selection'}>
        <h2>${this._t('editor_selection')}</h2>
        ${element === undefined
          ? html`<p class="supporting">${this._t('editor_nothing_selected')}</p>`
          : html`
              <h3>${this._t('editor_position')}</h3>
              <div class="fields">
                ${FIELDS.map(
                  (field) => html`
                    <div>
                      <label for=${field.key}>${this._t(field.label)}</label>
                      <input
                        id=${field.key}
                        type="number"
                        step="0.01"
                        data-field=${field.key}
                        .value=${String(element.frame[field.key])}
                        @change=${(event: Event) =>
                          this.#setField(
                            element,
                            field.key,
                            (event.target as HTMLInputElement).value
                          )}
                      />
                    </div>
                  `
                )}
              </div>
              <h3>${this._t('editor_nudge')}</h3>
              <div class="nudge">
                <button
                  data-nudge="up"
                  aria-label=${this._t('editor_nudge_up')}
                  @click=${() => this.#nudge(element, 0, -NUDGE_MM)}
                >
                  ↑
                </button>
                <button
                  data-nudge="left"
                  aria-label=${this._t('editor_nudge_left')}
                  @click=${() => this.#nudge(element, -NUDGE_MM, 0)}
                >
                  ←
                </button>
                <button
                  data-nudge="down"
                  aria-label=${this._t('editor_nudge_down')}
                  @click=${() => this.#nudge(element, 0, NUDGE_MM)}
                >
                  ↓
                </button>
                <button
                  data-nudge="right"
                  aria-label=${this._t('editor_nudge_right')}
                  @click=${() => this.#nudge(element, NUDGE_MM, 0)}
                >
                  →
                </button>
              </div>
              <p class="supporting">${this._t('editor_nudge_hint')}</p>
            `}
        ${this.#renderDiagnostics(model)}
      </aside>
    `;
  }

  /** Why the layout cannot be published, each one naming its own element. */
  #renderDiagnostics(model: SessionState): TemplateResult | typeof nothing {
    const diagnostics = model.validation?.diagnostics ?? [];
    if (diagnostics.length === 0) return nothing;
    return html`
      <h3>${this._t('editor_diagnostics')}</h3>
      <ul class="diagnostics" data-role="diagnostics">
        ${diagnostics.map(
          (item) => html`
            <li>
              <button data-diagnostic=${item.code} @click=${() => this.#selectFor(item.element_id)}>
                ${item.message}
              </button>
            </li>
          `
        )}
      </ul>
    `;
  }

  #selectFor(elementId: string | null): void {
    if (elementId !== null) this.session?.select(elementId);
  }

  /**
   * The one sentence that says what the picture on screen is of.
   *
   * When a render came back without a raster, the sentence has to point at
   * the diagnostics that stopped it rather than leave an empty stage to
   * explain itself — the same rule the read-only surface follows, and the
   * reason `absent` is not merely "nothing yet".
   */
  #renderStanding(model: SessionState): TemplateResult {
    const failed = model.render !== null && model.render.raster === null;
    const key = failed
      ? 'editor_raster_failed'
      : model.rasterStanding === 'settled'
        ? 'editor_raster_settled'
        : model.rasterStanding === 'stale'
          ? 'editor_raster_stale'
          : 'editor_raster_absent';
    const blocking = (model.render?.diagnostics ?? []).filter(
      (item) => item.severity === 'error' || item.code.endsWith('render_failed')
    );
    return html`
      <p class="supporting" data-role="standing" data-standing=${model.rasterStanding}>
        ${this._t(key)}
      </p>
      ${failed && blocking.length > 0
        ? html`<ul class="diagnostics" data-role="render-diagnostics">
            ${blocking.map((item) => html`<li><code>${item.code}</code> ${item.message}</li>`)}
          </ul>`
        : nothing}
    `;
  }

  #renderRefusal(model: SessionState): TemplateResult | typeof nothing {
    const refusal = model.refusal;
    if (refusal === null) return nothing;
    // Only the recoveries this editor can actually perform are offered. A verb
    // it does not recognise leaves the reason and the dismissal, which is an
    // honest answer rather than a button that does nothing.
    const reloadable = refusal.recovery === 'reload_draft';
    return html`
      <div class="refusal" role="alert" data-code=${refusal.code}>
        <p>${refusal.reason}</p>
        ${reloadable
          ? html`<button data-action="reload" @click=${() => void this.session?.reload()}>
              ${this._t('editor_reload')}
            </button>`
          : nothing}
        <button data-action="dismiss" @click=${() => this.session?.acknowledge()}>
          ${this._t('editor_dismiss')}
        </button>
      </div>
    `;
  }

  #renderBar(model: SessionState): TemplateResult {
    const blocked = publishBlockedBy(model);
    const untitled = model.draft?.template_id === null;
    return html`
      <header class="bar">
        <button
          data-action="back"
          aria-label=${this._t('editor_back')}
          @click=${() => this.dispatchEvent(new CustomEvent('close-editor'))}
        >
          <svg viewBox="0 0 24 24"><path d=${mdiArrowLeft}></path></svg>
        </button>
        ${untitled
          ? html`<div class="name">
              <input
                type="text"
                data-field="name"
                aria-label=${this._t('editor_name')}
                placeholder=${this._t('editor_name')}
                .value=${model.name}
                @input=${(event: Event) =>
                  this.session?.setName((event.target as HTMLInputElement).value)}
              />
            </div>`
          : html`<span class="name">${model.draft?.name ?? ''}</span>`}
        <span class="supporting" data-role="save-state">
          ${model.saving
            ? this._t('editor_saving')
            : model.dirty
              ? this._t('editor_unsaved')
              : this._t('editor_saved')}
        </span>
        <button
          class="primary"
          data-action="publish"
          ?disabled=${blocked !== null}
          title=${blocked === null ? '' : this._t(`editor_blocked_${blocked}`)}
          @click=${() => void this.#publish()}
        >
          ${this._t('editor_publish')}
        </button>
      </header>
      ${blocked === null
        ? nothing
        : html`<p class="supporting" data-role="blocked" data-blocked=${blocked}>
            ${this._t(`editor_blocked_${blocked}`)}
          </p>`}
    `;
  }

  async #publish(): Promise<void> {
    const published = await this.session?.publish();
    if (published) {
      this.dispatchEvent(new CustomEvent('published', { detail: published }));
    }
  }

  #renderToolbar(model: SessionState): TemplateResult {
    return html`
      <div class="toolbar" role="toolbar" aria-label=${this._t('editor_toolbar')}>
        <button
          data-action="undo"
          aria-label=${this._t('editor_undo')}
          ?disabled=${!model.canUndo}
          @click=${() => {
            this.session?.undo();
            void this.session?.render();
          }}
        >
          <svg viewBox="0 0 24 24"><path d=${mdiUndo}></path></svg>
        </button>
        <button
          data-action="redo"
          aria-label=${this._t('editor_redo')}
          ?disabled=${!model.canRedo}
          @click=${() => {
            this.session?.redo();
            void this.session?.render();
          }}
        >
          <svg viewBox="0 0 24 24"><path d=${mdiRedo}></path></svg>
        </button>
        <button
          data-action="save"
          aria-label=${this._t('editor_save_now')}
          @click=${() => void this.session?.save()}
        >
          <svg viewBox="0 0 24 24"><path d=${mdiContentSaveOutline}></path></svg>
        </button>
        <button
          data-action="rerender"
          aria-label=${this._t('editor_rerender')}
          ?disabled=${model.rendering}
          @click=${() => void this.session?.render()}
        >
          <svg viewBox="0 0 24 24"><path d=${mdiRefresh}></path></svg>
        </button>
        <button
          data-action="discard"
          aria-label=${this._t('editor_discard')}
          @click=${() => void this.#discard()}
        >
          <svg viewBox="0 0 24 24"><path d=${mdiTrashCanOutline}></path></svg>
        </button>
      </div>
    `;
  }

  async #discard(): Promise<void> {
    const discarded = await this.session?.discard();
    if (discarded) this.dispatchEvent(new CustomEvent('discarded', { detail: discarded }));
  }

  protected render(): TemplateResult | typeof nothing {
    const model = this._model;
    if (!model || !this.capability) return nothing;

    return html`
      ${this.#renderBar(model)} ${this.#renderRefusal(model)}
      <div class="layout" @keydown=${this.#onKeyDown} tabindex="0">
        ${this.#renderElements(model)}
        <section
          class="workspace"
          ?hidden-on-narrow=${this._workbench !== 'canvas'}
          aria-label=${this._t('editor_workspace')}
        >
          ${this.#renderToolbar(model)} ${this.#renderStage(model)} ${this.#renderStanding(model)}
        </section>
        ${this.#renderInspector(model)}
      </div>
      <nav class="tabs" aria-label=${this._t('editor_workbench')}>
        ${(['canvas', 'elements', 'selection'] as Workbench[]).map(
          (tab) => html`
            <button
              data-tab=${tab}
              aria-pressed=${this._workbench === tab}
              @click=${() => {
                this._workbench = tab;
              }}
            >
              ${this._t(`editor_tab_${tab}`)}
            </button>
          `
        )}
      </nav>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-label-editor': GrowspaceLabelEditor;
  }
}
