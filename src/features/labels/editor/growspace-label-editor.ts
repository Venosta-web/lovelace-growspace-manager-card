/**
 * `<growspace-label-editor>` — the full-screen Label Template task mode.
 *
 * The structure is the one settled in the editing-loop decision: **Label
 * elements** on the left, the **canvas** with its toolbars in the middle, the
 * **Selection** inspector on the right; and on a narrow screen the canvas
 * stays primary with the two panels behind a bottom workbench tab bar,
 * because a phone editing a label is looking at the label.
 *
 * **It draws frames, never ink.** The picture underneath is the backend's own
 * raster, exactly as the read-only surface shows one; what this element adds
 * on top is an outline, eight handles and a guide or two. That is what makes
 * staleness visible rather than asserted: the outline has moved and the
 * picture under it has not, which is a thing a user can see without reading a
 * word.
 *
 * Three rules run through everything below.
 *
 * **Millimetres come from the stage's measured box**, so a drag behaves the
 * same at any browser zoom and at any editor zoom. Nothing here reads a zoom
 * level to correct for it; there is nothing to correct when no scale was ever
 * assumed. The zoom control changes how big the stage is, and the map to
 * millimetres follows for free.
 *
 * **Every pointer operation has a keyboard and an inspector equal.** Not as a
 * courtesy: a pointer cannot place a 0.4 mm rule, and some people cannot drag
 * at all. Multi-select, duplication, ordering, alignment, distribution,
 * rotation, nudging and exact geometry are each reachable three ways, and the
 * list panel's checkboxes are the third — an explicit, touch-sized way to
 * select several things without a modifier key a phone does not have.
 *
 * **Nothing is announced by colour alone.** Selection carries an outline, a
 * corner mark and `aria-pressed`; staleness carries a sentence, a desaturated
 * raster and a `data-standing` attribute; a snap carries a drawn guide and a
 * line in the live region.
 */

import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import {
  mdiArrowLeft,
  mdiContentCopy,
  mdiContentSaveOutline,
  mdiDelete,
  mdiMagnifyMinusOutline,
  mdiMagnifyPlusOutline,
  mdiMagnifyScan,
  mdiRedo,
  mdiRefresh,
  mdiRestore,
  mdiUndo,
} from '@mdi/js';

import { localize, localizeWithParams } from '../../../localize/localize';
import { refusalCopy } from '../copy';
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
  translateFrame,
  type ResizeHandle,
  type StockMm,
} from './geometry';
import {
  ELEMENT_KINDS,
  governingProfile,
  isRequiredElement,
  newElement,
  wouldDropRequired,
  type ElementKind,
} from './constraints';
import {
  addElement,
  align,
  distribute,
  duplicate,
  removeElements,
  reorder,
  snapFrame,
  snapLines,
  withElement,
  withFrames,
  type Alignment,
  type Distribution,
  type Ordering,
  type SnapLine,
} from './arrange';
import './growspace-label-inspector';
import './growspace-label-print-panel';
import type { GrowspaceLabelInspector } from './growspace-label-inspector';
import type { GrowspaceLabelPrintPanel } from './growspace-label-print-panel';
import { collectDiagnostics, copyKeys, countBySeverity, type DiagnosticEntry } from './diagnostics';
import { onToolbarFocusIn, onToolbarKeyDown, syncRovingTabindex } from './roving-toolbar';

/** The eight handles, in the order a reader goes round a rectangle. */
const HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

/** The six alignments and the two distributions, as the toolbar orders them. */
const ALIGNMENTS: Alignment[] = ['left', 'center', 'right', 'top', 'middle', 'bottom'];
const DISTRIBUTIONS: Distribution[] = ['horizontal', 'vertical'];
const ORDERINGS: Ordering[] = ['front', 'forward', 'backward', 'back'];

/** Which panel a narrow screen is showing beside the canvas. */
type Workbench = 'canvas' | 'elements' | 'selection';

/** The zoom steps, as multiples of "the stage fills its column". */
const ZOOM_STEPS = [1, 1.5, 2, 3, 4] as const;

/** One in-flight pointer gesture, in the frames it started from. */
interface Gesture {
  pointerId: number;
  handle: ResizeHandle | null;
  originX: number;
  originY: number;
  /** Every moving element's frame as it was when the gesture began. */
  startFrames: Map<string, LabelFrame>;
  /** The element the pointer is actually on, which is what snapping follows. */
  anchorId: string;
  key: string;
}

@customElement('growspace-label-editor')
export class GrowspaceLabelEditor extends LitElement {
  /** The negotiated capability. The quantum, the stock and every limit come off it. */
  @property({ attribute: false }) capability?: LabelTemplateCapability;
  /** The live session. Owned by the caller, because it outlives this element. */
  @property({ attribute: false }) session?: DraftSession;
  @property({ type: String }) language = 'en';

  @state() private _model?: SessionState;
  @state() private _workbench: Workbench = 'canvas';
  @state() private _zoom = 1;
  @state() private _snapping = true;
  /**
   * Whether a plain tap on the canvas adds to the selection.
   *
   * The touch equal of holding Shift, and the accepted design's own answer:
   * a phone has no modifier key, and a finger that had to find a checkbox in
   * a panel behind the canvas could not build a selection while looking at
   * the label it is building one on.
   */
  @state() private _multiSelect = false;
  /** The lines the current gesture is actually lying on, drawn over the stage. */
  @state() private _guides: SnapLine[] = [];
  /** The last thing that happened, for a screen reader that saw none of it. */
  @state() private _announcement = '';

  @query('growspace-label-inspector') private _inspector?: GrowspaceLabelInspector;
  @query('growspace-label-print-panel') private _printPanel?: GrowspaceLabelPrintPanel;

  /** What was last said about the diagnostics, so only a change is announced. */
  #diagnosticSummary = '';
  /** Whether the last render was slow, so the sentence is said once. */
  #slowAnnounced = false;

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
        /* The editor owns its foreground rather than inheriting one. A shadow
           root inherits the colour property from wherever it was placed, so a
           host that set only the token and not the property left every
           heading and label at the document default -- black prose on a dark
           dialog. */
        color: var(--primary-text-color);
        /* The narrow-screen rules below ask about *this element's* width, not
           the window's. The editor lives inside a dialog, so a phone and a
           1200 px desktop showing a 400 px dialog are the same problem, and a
           viewport media query answers the wrong question in the second
           case. */
        container-type: inline-size;
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
        min-height: 44px;
        box-sizing: border-box;
      }

      /* Every control in this editor is at least 44 x 44 CSS pixels. A label
         is edited at arm's length on a phone beside a printer as often as at
         a desk, and a 32 px icon button is a miss at that distance. */
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

      button[disabled] {
        cursor: not-allowed;
        opacity: 0.5;
      }

      /* Darkened toward the theme's own text colour rather than toward black:
         --primary-color reads 2.6:1 on this panel's light-theme background
         undarkened, but the theme's text colour is already correct per theme
         (dark-on-light, light-on-dark), so mixing toward it holds 4.5:1 on a
         light background without dimming the raw token's own contrast on a
         dark one, where it already passes. */
      button[aria-pressed='true'] {
        border-color: color-mix(
          in srgb,
          var(--primary-color, #4caf50) 55%,
          var(--primary-text-color, #212121)
        );
        color: color-mix(
          in srgb,
          var(--primary-color, #4caf50) 55%,
          var(--primary-text-color, #212121)
        );
        text-decoration: underline;
        text-underline-offset: 3px;
      }

      button.primary:not([disabled]) {
        border-color: color-mix(
          in srgb,
          var(--primary-color, #4caf50) 55%,
          var(--primary-text-color, #212121)
        );
        color: color-mix(
          in srgb,
          var(--primary-color, #4caf50) 55%,
          var(--primary-text-color, #212121)
        );
      }

      button svg {
        width: 20px;
        height: 20px;
        fill: currentColor;
        display: block;
        margin: 0 auto;
      }

      /* A visible focus ring that does not depend on the theme's own, since a
         Home Assistant theme may remove it. */
      :is(button, input, select, a):focus-visible {
        outline: 3px solid var(--primary-color, #4caf50);
        outline-offset: 2px;
      }

      .layout {
        display: grid;
        grid-template-columns: minmax(180px, 220px) minmax(0, 1fr) minmax(240px, 280px);
        gap: var(--spacing-md, 16px);
        padding: var(--spacing-md, 16px);
        flex: 1;
        min-height: 0;
        overflow: auto;
      }

      .layout:focus-visible {
        outline: 3px solid var(--primary-color, #4caf50);
        outline-offset: -3px;
      }

      aside {
        min-width: 0;
      }

      aside h2,
      aside h3 {
        font-size: var(--font-size-sm, 13px);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        opacity: 0.85;
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

      .toolbar .spacer {
        flex: 1 1 8px;
      }

      .zoom-level {
        font-variant-numeric: tabular-nums;
        min-width: 4ch;
        text-align: center;
      }

      /* The stage scrolls inside its column when zoomed, so a magnified label
         never widens the page — the one thing that would break a 390 px
         viewport outright. */
      .stage-scroll {
        overflow: auto;
        max-width: 100%;
      }

      .stage-wrap {
        margin: 0 auto;
      }

      /* The paper. Its aspect ratio is the stock's, so the millimetre map is
         the same in both axes and a measured box is all the scale there is. */
      .stage {
        position: relative;
        width: 100%;
        /* Its 1 px border is inside its width. Without this the stage was two
           pixels wider than the column holding it, which is a scrollbar under
           a label that already fits. */
        box-sizing: border-box;
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
        border: 1px dashed rgba(0, 0, 0, 0.55);
        background: transparent;
        cursor: move;
        padding: 0;
        min-height: 0;
        min-width: 0;
        border-radius: 0;
      }

      /* Selection is an outline *and* a corner mark, because an outline alone
         is a colour difference and this is white paper under a raster. */
      .element[aria-pressed='true'] {
        border: 2px solid rgba(0, 0, 0, 0.9);
        outline: 1px solid #fff;
      }

      .element[aria-pressed='true']::before {
        content: '';
        position: absolute;
        top: -1px;
        left: -1px;
        width: 8px;
        height: 8px;
        background: rgba(0, 0, 0, 0.9);
      }

      .element[data-required='true'] {
        border-style: solid;
      }

      /* The grips of the selected frame. A sibling laid over it rather than
         children of it: a button inside a button is two controls the
         accessibility tree can only report as one. */
      .handles {
        position: absolute;
        pointer-events: none;
      }

      .handle {
        pointer-events: auto;
        position: absolute;
        /* Drawn small, hit at 44 px: a grip that looked 44 px across would
           cover the element it grips on a 50 mm label. */
        width: 14px;
        height: 14px;
        margin: -7px 0 0 -7px;
        border-radius: 50%;
        border: 1px solid rgba(0, 0, 0, 0.9);
        background: #fff;
        padding: 0;
        min-height: 0;
        min-width: 0;
        touch-action: none;
      }

      .handle::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 44px;
        height: 44px;
        transform: translate(-50%, -50%);
      }

      .guide {
        position: absolute;
        background: rgba(0, 0, 0, 0.85);
        pointer-events: none;
      }

      .guide[data-axis='x'] {
        top: 0;
        bottom: 0;
        width: 1px;
      }

      .guide[data-axis='y'] {
        left: 0;
        right: 0;
        height: 1px;
      }

      label {
        display: block;
        font-size: var(--font-size-xs, 11px);
        opacity: 0.85;
        margin-bottom: 2px;
      }

      .supporting {
        opacity: 0.85;
        font-size: var(--font-size-sm, 13px);
        line-height: 1.45;
        margin: var(--spacing-sm, 8px) 0 0;
      }

      .refusal {
        border: 1px solid var(--error-color, #f44336);
        border-radius: var(--border-radius-md, 8px);
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        margin: 0 var(--spacing-md, 16px);
        /* Same treatment as button[aria-pressed='true'] above: 3.68:1
           undarkened on a light background, mixed toward the theme's own
           text colour to hold 4.5:1 there and stay clear of it on dark. */
        color: color-mix(
          in srgb,
          var(--error-color, #f44336) 55%,
          var(--primary-text-color, #212121)
        );
      }

      .refusal button {
        margin-right: var(--spacing-sm, 8px);
      }

      ul.elements,
      ol.diagnostics {
        list-style: none;
        margin: 0;
        padding: 0;
      }

      ul.elements li {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs, 4px);
        margin-bottom: var(--spacing-xs, 4px);
      }

      /* The target is the label, not the box: a 44 px checkbox is a
         ridiculous thing to look at, and a 24 px one is a miss. */
      ul.elements label.pick {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 44px;
        min-height: 44px;
        margin: 0;
        flex: none;
        cursor: pointer;
      }

      ul.elements input[type='checkbox'] {
        width: 24px;
        height: 24px;
        margin: 0;
      }

      ul.elements .row {
        flex: 1;
        text-align: left;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      ul.elements .required {
        font-size: var(--font-size-xs, 11px);
      }

      .diagnostics-panel h3 {
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-sm, 8px);
        align-items: baseline;
      }

      ol.diagnostics li {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
        padding-block: var(--spacing-xs, 4px);
        border-bottom: 1px solid var(--divider-color);
      }

      ol.diagnostics .copy {
        flex: 1 1 16em;
      }

      ol.diagnostics button {
        min-height: 44px;
      }

      /* Severity is a word and a mark, then a colour: never the colour alone. */
      .severity {
        font-weight: 600;
        white-space: nowrap;
      }
      .severity[data-severity='error']::before {
        content: '✕ ';
      }
      .severity[data-severity='warning']::before {
        content: '▲ ';
      }
      .severity[data-severity='info']::before {
        content: 'ℹ ';
      }
      .severity[data-severity='error'] {
        /* Same treatment as .refusal above: 3.53:1 undarkened on a light
           background. */
        color: color-mix(
          in srgb,
          var(--error-color, #f44336) 55%,
          var(--primary-text-color, #212121)
        );
      }

      /* Visible to a screen reader, invisible to everyone else. Never
         display:none, which removes it from the accessibility tree too. */
      .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        margin: -1px;
        padding: 0;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
        border: 0;
      }

      .tabs {
        display: none;
      }

      @container (max-width: 800px) {
        /* Canvas-primary: the panels are one tap away and never crowd it. */
        .layout {
          grid-template-columns: minmax(0, 1fr);
        }

        aside[hidden-on-narrow],
        section[hidden-on-narrow] {
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

      /* A theme is gone in forced colours, so the states carried by border
         colour above are restated in terms the mode keeps. */
      @media (forced-colors: active) {
        button[aria-pressed='true'],
        button.primary {
          border: 2px solid ButtonText;
        }

        .element[aria-pressed='true'] {
          border: 2px solid Highlight;
        }

        .stage img[data-standing='stale'] {
          opacity: 1;
        }
      }

      /* Nothing here animates by default; this keeps it that way if a theme
         or a future control introduces one. */
      @media (prefers-reduced-motion: reduce) {
        * {
          transition: none !important;
          animation: none !important;
          scroll-behavior: auto !important;
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

  protected updated(): void {
    // Every render, because a render is what disables the button holding a
    // toolbar's one Tab stop, and the stop has to move before anyone tabs in.
    for (const toolbar of this.renderRoot.querySelectorAll<HTMLElement>('[role="toolbar"]')) {
      syncRovingTabindex(toolbar);
    }
  }

  #attach(): void {
    this.#unsubscribe?.();
    const session = this.session;
    if (!session) return;
    this._model = session.state;
    this.#unsubscribe = session.subscribe((state) => {
      this._model = state;
      this.#announceChanges(state);
    });
    if (session.state.selectedIds.length === 0) {
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

  /** The printer profile whose limits every control is held to. */
  get #profile() {
    return governingProfile(this.capability, this.session?.address.labelSizeId ?? '');
  }

  /** Say what just happened, for somebody who cannot see it happen. */
  #announce(message: string): void {
    this._announcement = message;
  }

  /**
   * Announce what changed about the label's problems and its picture.
   *
   * Only a change: a live region that repeats "2 errors" on every autosave is
   * a live region users learn to ignore, which is the same as not having one.
   */
  #announceChanges(state: SessionState): void {
    const counts = countBySeverity(collectDiagnostics(state.validation, state.render));
    const summary = `${counts.error}|${counts.warning}`;
    if (summary !== this.#diagnosticSummary) {
      const first = this.#diagnosticSummary === '';
      this.#diagnosticSummary = summary;
      if (!first) {
        this.#announce(
          counts.error + counts.warning === 0
            ? this._t('editor_diagnostics_clear')
            : localizeWithParams(
                'labels.editor_diagnostics_changed',
                { errors: counts.error, warnings: counts.warning },
                this.language
              )
        );
        return;
      }
    }
    if (state.renderSlow && !this.#slowAnnounced) {
      this.#slowAnnounced = true;
      this.#announce(this._t('editor_raster_slow'));
    } else if (!state.rendering) {
      this.#slowAnnounced = false;
    }
  }

  /** A fresh element identity. Opaque to the backend, unique in the document. */
  #mintId(): string {
    const random = globalThis.crypto;
    return typeof random?.randomUUID === 'function'
      ? random.randomUUID()
      : `element-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  /** Re-render the raster after an edit that has settled. */
  #settled(): void {
    this.session?.endGesture();
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
   *
   * A modifier extends the selection rather than replacing it — the desktop
   * idiom — and dragging any member of a multiple selection drags all of it,
   * because a selection that came apart the moment it was touched would not
   * be a selection.
   */
  #onPointerDown(event: PointerEvent, elementId: string, handle: ResizeHandle | null): void {
    const session = this.session;
    // The model, because it is what the frames on screen were drawn from: a
    // gesture must start from the geometry the user is pointing at, not from
    // a session state that has moved on since the last render.
    const document = this._model?.document;
    if (!session || !document) return;
    event.preventDefault();
    event.stopPropagation();

    // preventDefault above suppresses the browser's native mousedown->focus
    // for this button, so the keyboard nudge (#onKeyDown, bound on .layout)
    // would otherwise never see the keydown bubble up from anywhere.
    const target = event.currentTarget as HTMLElement;
    target.focus({ preventScroll: true });

    const extend = event.shiftKey || event.metaKey || event.ctrlKey || this._multiSelect;
    if (extend) {
      session.toggleSelected(elementId);
      this.#announceSelection();
      return;
    }
    if (!session.state.selectedIds.includes(elementId)) session.select(elementId);

    const moving = handle === null ? session.state.selectedIds : [elementId];
    const startFrames = new Map<string, LabelFrame>();
    for (const id of moving) {
      const frame = elementById(document, id)?.frame;
      if (frame !== undefined) startFrames.set(id, frame);
    }
    if (startFrames.size === 0) return;

    try {
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
    } catch {
      // A pointer that is no longer active refuses capture, and so does a
      // synthetic one. Neither is a reason to abandon the gesture: without
      // capture the drag simply ends when the pointer leaves the element,
      // which is the behaviour capture exists to improve on, not to enable.
    }
    this.#gesture = {
      pointerId: event.pointerId,
      handle,
      originX: event.clientX,
      originY: event.clientY,
      startFrames,
      anchorId: elementId,
      key: `${handle ?? 'move'}:${event.pointerId}:${Date.now()}`,
    };
  }

  #onPointerMove(event: PointerEvent): void {
    const gesture = this.#gesture;
    const session = this.session;
    const model = this._model;
    if (!gesture || !session || !model || gesture.pointerId !== event.pointerId) return;

    const stage = this.renderRoot.querySelector('.stage');
    if (!stage) return;
    // The measured box, every move: a zoom or a resize mid-drag changes it,
    // and reading it once at pointerdown would silently scale the rest.
    const rect = stage.getBoundingClientRect();
    const stock = this.#stock;
    const quantum = session.quantumMm;
    const { deltaXMm, deltaYMm } = pixelsToMm(
      event.clientX - gesture.originX,
      event.clientY - gesture.originY,
      rect,
      stock
    );

    if (gesture.handle !== null) {
      const start = gesture.startFrames.get(gesture.anchorId)!;
      const resized = resizeFrame(start, gesture.handle, deltaXMm, deltaYMm, stock, quantum);
      session.moveElement(gesture.anchorId, resized, gesture.key);
      return;
    }

    // Snap the element under the pointer, then move everything by the delta
    // the snap actually produced — so a multiple selection keeps its internal
    // spacing exactly while still landing on the guide.
    const anchorStart = gesture.startFrames.get(gesture.anchorId)!;
    const anchorMoved = translateFrame(anchorStart, deltaXMm, deltaYMm, stock, quantum);
    let appliedX = anchorMoved.x_mm - anchorStart.x_mm;
    let appliedY = anchorMoved.y_mm - anchorStart.y_mm;
    let guides: SnapLine[] = [];

    if (this._snapping) {
      const lines = snapLines(model.document, stock, [...gesture.startFrames.keys()]);
      const snapped = snapFrame(anchorMoved, lines, undefined, quantum);
      appliedX = snapped.frame.x_mm - anchorStart.x_mm;
      appliedY = snapped.frame.y_mm - anchorStart.y_mm;
      guides = snapped.guides;
    }

    const frames = new Map<string, LabelFrame>();
    for (const [id, start] of gesture.startFrames) {
      frames.set(id, translateFrame(start, appliedX, appliedY, stock, quantum));
    }
    this._guides = guides;
    session.apply(withFrames(model.document, frames), gesture.key);
  }

  #onPointerUp(event: PointerEvent): void {
    if (this.#gesture?.pointerId !== event.pointerId) return;
    this.#gesture = null;
    this._guides = [];
    this.#settled();
  }

  // -------------------------------------------------------------------------
  // Selection
  // -------------------------------------------------------------------------

  #announceSelection(): void {
    const ids = this.session?.state.selectedIds ?? [];
    this.#announce(
      localizeWithParams(
        'labels.editor_announce_selection',
        { count: String(ids.length) },
        this.language
      )
    );
  }

  #selectAll(): void {
    const session = this.session;
    if (!session) return;
    session.selectMany(session.state.document.elements.map((element) => element.id));
    this.#announceSelection();
  }

  // -------------------------------------------------------------------------
  // Editing commands
  // -------------------------------------------------------------------------

  #nudgeSelection(deltaXMm: number, deltaYMm: number): void {
    const session = this.session;
    const model = this._model;
    if (!session || !model || model.selectedIds.length === 0) return;
    const stock = this.#stock;
    const frames = new Map<string, LabelFrame>();
    for (const id of model.selectedIds) {
      const frame = elementById(model.document, id)?.frame;
      if (frame === undefined) continue;
      frames.set(id, translateFrame(frame, deltaXMm, deltaYMm, stock, session.quantumMm));
    }
    session.apply(withFrames(model.document, frames));
    this.#settled();
    this.#announce(
      localizeWithParams(
        'labels.editor_announce_moved',
        { x: String(deltaXMm), y: String(deltaYMm) },
        this.language
      )
    );
  }

  #align(alignment: Alignment): void {
    const session = this.session;
    const model = this._model;
    if (!session || !model) return;
    session.apply(
      align(model.document, model.selectedIds, alignment, this.#stock, session.quantumMm)
    );
    this.#settled();
    this.#announce(this._t(`editor_align_${alignment}`));
  }

  #distribute(axis: Distribution): void {
    const session = this.session;
    const model = this._model;
    if (!session || !model) return;
    session.apply(
      distribute(model.document, model.selectedIds, axis, this.#stock, session.quantumMm)
    );
    this.#settled();
    this.#announce(this._t(`editor_distribute_${axis}`));
  }

  #reorder(ordering: Ordering): void {
    const session = this.session;
    const model = this._model;
    if (!session || !model) return;
    session.apply(reorder(model.document, model.selectedIds, ordering));
    this.#settled();
    this.#announce(this._t(`editor_order_${ordering}`));
  }

  #duplicate(): void {
    const session = this.session;
    const model = this._model;
    if (!session || !model || model.selectedIds.length === 0) return;
    const copied = duplicate(
      model.document,
      model.selectedIds,
      () => this.#mintId(),
      this.#stock,
      session.quantumMm
    );
    session.apply(copied.document, null, copied.ids);
    this.#settled();
    this.#announce(
      localizeWithParams(
        'labels.editor_announce_duplicated',
        { count: String(copied.ids.length) },
        this.language
      )
    );
  }

  #delete(): void {
    const session = this.session;
    const model = this._model;
    if (!session || !model || model.selectedIds.length === 0) return;
    // Deleting the required element is allowed, and the backend's own
    // publication check is what says the layout is no longer publishable --
    // one place, not two. What this adds is the warning *before* rather than
    // the refusal after, since undo is the only way back and a user who did
    // not mean it should not have to discover it at publish time.
    const dropping = wouldDropRequired(model.document, model.selectedIds);
    session.apply(removeElements(model.document, model.selectedIds), null, []);
    this.#settled();
    this.#announce(
      dropping
        ? this._t('editor_announce_deleted_required')
        : localizeWithParams(
            'labels.editor_announce_deleted',
            { count: String(model.selectedIds.length) },
            this.language
          )
    );
  }

  #addElement(kind: ElementKind): void {
    const session = this.session;
    const model = this._model;
    if (!session || !model) return;
    const element = newElement({
      capability: this.capability,
      profile: this.#profile,
      kind,
      stock: this.#stock,
      id: this.#mintId(),
      placeholder: this._t('editor_content_placeholder'),
    });
    if (element === null) {
      this.#announce(
        localizeWithParams(
          'labels.editor_announce_no_binding',
          { kind: this._t(`editor_kind_${kind}`) },
          this.language
        )
      );
      return;
    }
    session.apply(addElement(model.document, element), null, [element.id]);
    this.#settled();
    this.#announce(
      localizeWithParams(
        'labels.editor_announce_added',
        { kind: this._t(`editor_kind_${kind}`) },
        this.language
      )
    );
  }

  #reset(): void {
    this.session?.reset();
    this.#settled();
    this.#announce(this._t('editor_announce_reset'));
  }

  /** One element replaced wholesale, as the inspector hands it back. */
  #onElementChange(event: CustomEvent<{ element: LabelElement; gesture: string | null }>): void {
    const session = this.session;
    const model = this._model;
    if (!session || !model) return;
    session.apply(withElement(model.document, event.detail.element), event.detail.gesture);
    this.#settled();
  }

  #zoomBy(step: number): void {
    const index = ZOOM_STEPS.indexOf(this._zoom as (typeof ZOOM_STEPS)[number]);
    const next =
      ZOOM_STEPS[Math.min(Math.max((index < 0 ? 0 : index) + step, 0), ZOOM_STEPS.length - 1)];
    this._zoom = next;
    this.#announce(
      localizeWithParams(
        'labels.editor_announce_zoom',
        { percent: String(Math.round(next * 100)) },
        this.language
      )
    );
  }

  // -------------------------------------------------------------------------
  // Keyboard
  // -------------------------------------------------------------------------

  /**
   * The keyboard's half of the editor.
   *
   * Every shortcut here duplicates a control that is also on screen — this is
   * an accelerator layer, never the only way to reach something, because a
   * shortcut nobody can discover is not an alternative to dragging.
   */
  #onKeyDown(event: KeyboardEvent): void {
    const session = this.session;
    const model = this._model;
    if (!session || !model) return;
    const accel = event.ctrlKey || event.metaKey;

    if (accel) {
      const key = event.key.toLowerCase();
      if (key === 'z') {
        event.preventDefault();
        if (event.shiftKey) session.redo();
        else session.undo();
        this.#announce(this._t(event.shiftKey ? 'editor_redo' : 'editor_undo'));
        return;
      }
      if (key === 'y') {
        event.preventDefault();
        session.redo();
        void session.render();
        return;
      }
      if (key === 'd') {
        event.preventDefault();
        this.#duplicate();
        return;
      }
      if (key === 'a') {
        event.preventDefault();
        this.#selectAll();
        return;
      }
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      session.select(null);
      this.#announceSelection();
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      // Not while a field has focus: Backspace in a number input deletes a
      // digit, and stealing it would make the exact controls unusable.
      if (isTextEntry(event.composedPath()[0])) return;
      event.preventDefault();
      this.#delete();
      return;
    }
    if (event.key === '[' || event.key === ']') {
      event.preventDefault();
      this.#reorder(event.key === ']' ? 'forward' : 'backward');
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
    if (!delta || model.selectedIds.length === 0) return;
    if (isTextEntry(event.composedPath()[0])) return;
    event.preventDefault();
    this.#nudgeSelection(delta[0], delta[1]);
  }

  // -------------------------------------------------------------------------
  // Rendering: the canvas
  // -------------------------------------------------------------------------

  #renderStage(model: SessionState): TemplateResult {
    const stock = this.#stock;
    const raster = model.render?.raster ?? null;
    return html`
      <div class="stage-scroll">
        <div class="stage-wrap" style=${styleMap({ width: `${this._zoom * 100}%` })}>
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
            ${this._guides.map((guide) => this.#renderGuide(guide, stock))}
          </div>
        </div>
      </div>
    `;
  }

  #renderGuide(guide: SnapLine, stock: StockMm): TemplateResult {
    const total = guide.axis === 'x' ? stock.widthMm : stock.heightMm;
    const offset = `${total > 0 ? (guide.valueMm / total) * 100 : 0}%`;
    return html`<div
      class="guide"
      data-axis=${guide.axis}
      data-source=${guide.source}
      style=${styleMap(guide.axis === 'x' ? { left: offset } : { top: offset })}
    ></div>`;
  }

  #renderElement(element: LabelElement, model: SessionState): TemplateResult {
    const selected = model.selectedIds.includes(element.id);
    const only = selected && model.selectedIds.length === 1;
    return html`
      <button
        class="element"
        data-element=${element.id}
        data-kind=${element.kind}
        data-required=${isRequiredElement(element)}
        aria-pressed=${selected}
        aria-label=${this.#elementName(element)}
        style=${styleMap(frameAsPercentages(element.frame, this.#stock))}
        @pointerdown=${(event: PointerEvent) => this.#onPointerDown(event, element.id, null)}
      ></button>
      ${only
        ? html`<div
            class="handles"
            style=${styleMap(frameAsPercentages(element.frame, this.#stock))}
          >
            ${HANDLES.map((handle) => this.#renderHandle(element, handle))}
          </div>`
        : nothing}
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

  /**
   * What an element is called, in one line.
   *
   * Its kind plus what fills it, because "Text" six times over is a list
   * nobody can navigate — and this string is the element's accessible name on
   * the canvas as well as its label in the panel.
   */
  #elementName(element: LabelElement): string {
    const kind = this._t(`editor_kind_${element.kind}`);
    if (element.kind === 'divider') return kind;
    const content = element.content;
    if ('literal' in content) return `${kind}: “${content.literal}”`;
    if ('asset_id' in content) return `${kind}: ${content.asset_id}`;
    const binding = localize(
      `labels.binding_${content.binding.replace(/\./g, '_')}`,
      '',
      '',
      this.language
    );
    return `${kind}: ${binding.startsWith('labels.') ? content.binding : binding}`;
  }

  // -------------------------------------------------------------------------
  // Rendering: the panels
  // -------------------------------------------------------------------------

  #renderElements(model: SessionState): TemplateResult {
    return html`
      <aside
        ?hidden-on-narrow=${this._workbench !== 'elements'}
        aria-label=${this._t('editor_elements')}
      >
        <h2>${this._t('editor_elements')}</h2>
        <button
          type="button"
          data-action="multi-select"
          aria-pressed=${this._multiSelect}
          @click=${() => {
            this._multiSelect = !this._multiSelect;
            this.#announce(
              this._t(this._multiSelect ? 'editor_multi_select_on' : 'editor_multi_select_off')
            );
          }}
        >
          ${this._t('editor_multi_select')}
        </button>
        <div class="toolbar" role="group" aria-label=${this._t('editor_add')}>
          ${ELEMENT_KINDS.map(
            (kind) => html`
              <button type="button" data-add=${kind} @click=${() => this.#addElement(kind)}>
                + ${this._t(`editor_kind_${kind}`)}
              </button>
            `
          )}
        </div>
        <ul class="elements">
          ${model.document.elements.map((element) => {
            const selected = model.selectedIds.includes(element.id);
            return html`
              <li>
                <label class="pick">
                  <input
                    type="checkbox"
                    id=${`pick-${element.id}`}
                    data-pick=${element.id}
                    .checked=${selected}
                    aria-label=${localizeWithParams(
                      'labels.editor_also_select',
                      { name: this.#elementName(element) },
                      this.language
                    )}
                    @change=${() => {
                      this.session?.toggleSelected(element.id);
                      this.#announceSelection();
                    }}
                  />
                </label>
                <button
                  class="row"
                  data-list-element=${element.id}
                  aria-pressed=${selected}
                  @click=${() => this.session?.select(element.id)}
                >
                  ${this.#elementName(element)}
                  ${isRequiredElement(element)
                    ? html`<span class="required" data-role="required">
                        · ${this._t('editor_required')}
                      </span>`
                    : nothing}
                </button>
              </li>
            `;
          })}
        </ul>
      </aside>
    `;
  }

  #renderInspector(model: SessionState): TemplateResult {
    const element = elementById(model.document, model.selectedId);
    return html`
      <aside
        ?hidden-on-narrow=${this._workbench !== 'selection'}
        aria-label=${this._t('editor_selection')}
      >
        <h2>${this._t('editor_selection')}</h2>
        <growspace-label-inspector
          .capability=${this.capability}
          .profile=${this.#profile}
          .element=${element}
          .stock=${this.#stock}
          .quantumMm=${this.session?.quantumMm ?? 0.01}
          .selectionSize=${model.selectedIds.length}
          .language=${this.language}
          @element-change=${this.#onElementChange}
        ></growspace-label-inspector>
      </aside>
    `;
  }

  /**
   * Every problem with the label, worst first, each one a way to fix it.
   *
   * Severity is a word and a mark as well as a colour, and each row is a
   * button that goes to where the correction lives — the element and its
   * exact control, the printer profile, the calibration flow, or a retry.
   */
  #renderDiagnostics(model: SessionState): TemplateResult | typeof nothing {
    const entries = collectDiagnostics(model.validation, model.render);
    if (entries.length === 0) return nothing;
    const counts = countBySeverity(entries);
    return html`
      <section class="diagnostics-panel" aria-labelledby="editor-diagnostics">
        <h3 id="editor-diagnostics" tabindex="-1">
          ${this._t('editor_diagnostics')}
          <span class="supporting" data-role="diagnostic-counts">
            ${localizeWithParams(
              'labels.editor_diagnostics_counts',
              { errors: counts.error, warnings: counts.warning },
              this.language
            )}
          </span>
        </h3>
        <ol class="diagnostics" data-role="diagnostics">
          ${entries.map((entry) => this.#renderDiagnostic(entry, model))}
        </ol>
      </section>
    `;
  }

  #renderDiagnostic(entry: DiagnosticEntry, model: SessionState): TemplateResult {
    const element = entry.elementId
      ? model.document.elements.find((item) => item.id === entry.elementId)
      : undefined;
    const where = element
      ? localizeWithParams(
          'labels.editor_diagnostic_on',
          { element: this._t(`editor_kind_${element.kind}`) },
          this.language
        )
      : '';
    const action = this.#diagnosticAction(entry);
    return html`
      <li data-severity=${entry.severity} data-diagnostic=${entry.code}>
        <span class="severity" data-severity=${entry.severity}>
          ${this._t(`editor_severity_${entry.severity}`)}
        </span>
        <span class="copy">${this.#diagnosticCopy(entry)} ${where}</span>
        ${action
          ? html`<button
              data-action="go-to"
              data-destination=${entry.destination}
              @click=${() => void this.#goTo(entry)}
            >
              ${action}
            </button>`
          : nothing}
      </li>
    `;
  }

  /** Reviewed local copy for one diagnostic. Never the backend's message. */
  #diagnosticCopy(entry: DiagnosticEntry): string {
    for (const key of copyKeys(entry)) {
      const copy = localize(`labels.${key}`, '', '', this.language);
      if (copy !== `labels.${key}` && copy !== key) return copy;
    }
    return this._t('editor_severity_info');
  }

  #diagnosticAction(entry: DiagnosticEntry): string | null {
    switch (entry.destination) {
      case 'element':
      case 'content':
        return this._t(entry.control ? 'editor_go_to_control' : 'editor_go_to_element');
      case 'profile':
        return this._t('editor_go_to_profile');
      case 'calibration':
        return this._t('editor_go_to_calibration');
      case 'retry':
        return this._t('editor_retry');
      case 'template':
        return this._t('editor_reload');
      default:
        return null;
    }
  }

  /** Take the user to where one diagnostic is corrected, and put focus there. */
  async #goTo(entry: DiagnosticEntry): Promise<void> {
    switch (entry.destination) {
      case 'element':
      case 'content': {
        if (entry.elementId === null) return;
        this.session?.select(entry.elementId);
        this._workbench = 'selection';
        this.#announceSelection();
        await this.updateComplete;
        const focused = entry.control ? await this._inspector?.focusControl(entry.control) : false;
        if (!focused) this._inspector?.focus();
        return;
      }
      case 'profile':
      case 'calibration':
        this._workbench = 'canvas';
        await this.updateComplete;
        await this._printPanel?.reveal(entry.destination);
        return;
      case 'retry':
        await this.session?.render();
        return;
      case 'template':
        await this.session?.reload();
        return;
    }
  }

  /** What the print panel hands back: a correction that lives in the editor. */
  async #onPanelRecovery(event: CustomEvent<{ recovery: string }>): Promise<void> {
    const { recovery } = event.detail;
    if (recovery === 'fix_layout') {
      const first = collectDiagnostics(
        this._model?.validation ?? null,
        this._model?.render ?? null
      )[0];
      if (first) await this.#goTo(first);
      else this.renderRoot.querySelector<HTMLElement>('#editor-diagnostics')?.focus();
      return;
    }
    if (recovery === 'publish') {
      this.renderRoot.querySelector<HTMLElement>('[data-action="publish"]')?.focus();
      this.#announce(this._t('editor_publish_first'));
    }
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
    const key = model.renderSlow
      ? 'editor_raster_slow'
      : model.rendering && model.rasterStanding !== 'settled'
        ? 'editor_raster_rendering'
        : failed
          ? 'editor_raster_failed'
          : model.rasterStanding === 'settled'
            ? 'editor_raster_settled'
            : model.rasterStanding === 'stale'
              ? 'editor_raster_stale'
              : 'editor_raster_absent';
    return html`
      <p
        class="supporting"
        data-role="standing"
        data-standing=${model.rasterStanding}
        aria-busy=${model.rendering ? 'true' : 'false'}
      >
        ${this._t(key)}
      </p>
    `;
  }

  #renderRefusal(model: SessionState): TemplateResult | typeof nothing {
    const refusal = model.refusal;
    if (refusal === null) return nothing;
    // Only the recoveries this editor can actually perform are offered. A verb
    // it does not recognise leaves the reason and the dismissal, which is an
    // honest answer rather than a button that does nothing.
    const reloadable = refusal.recovery === 'reload_draft';
    const retry =
      refusal.recovery === 'retry_preview'
        ? () => void this.session?.render()
        : refusal.recovery === 'retry_save'
          ? () => void this.session?.save()
          : null;
    const copy = refusalCopy(refusal.code, this.language);
    return html`
      <div class="refusal" role="alert" data-code=${refusal.code}>
        <p>${copy}</p>
        ${reloadable
          ? html`<button data-action="reload" @click=${() => void this.session?.reload()}>
              ${this._t('editor_reload')}
            </button>`
          : nothing}
        ${retry
          ? html`<button data-action="retry" @click=${retry}>${this._t('editor_retry')}</button>`
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
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d=${mdiArrowLeft}></path></svg>
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

  // -------------------------------------------------------------------------
  // Rendering: the toolbars
  // -------------------------------------------------------------------------

  #icon(
    action: string,
    labelKey: string,
    path: string,
    onClick: () => void,
    disabled = false
  ): TemplateResult {
    return html`
      <button
        type="button"
        data-action=${action}
        aria-label=${this._t(labelKey)}
        title=${this._t(labelKey)}
        ?disabled=${disabled}
        @click=${onClick}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d=${path}></path></svg>
      </button>
    `;
  }

  #renderToolbar(model: SessionState): TemplateResult {
    const selection = model.selectedIds.length;
    return html`
      <div
        class="toolbar"
        role="toolbar"
        aria-label=${this._t('editor_toolbar')}
        @keydown=${onToolbarKeyDown}
        @focusin=${onToolbarFocusIn}
      >
        ${this.#icon(
          'undo',
          'editor_undo',
          mdiUndo,
          () => {
            this.session?.undo();
          },
          !model.canUndo
        )}
        ${this.#icon(
          'redo',
          'editor_redo',
          mdiRedo,
          () => {
            this.session?.redo();
          },
          !model.canRedo
        )}
        ${this.#icon(
          'duplicate',
          'editor_duplicate',
          mdiContentCopy,
          () => this.#duplicate(),
          selection === 0
        )}
        ${this.#icon('delete', 'editor_delete', mdiDelete, () => this.#delete(), selection === 0)}
        ${this.#icon(
          'reset',
          'editor_reset',
          mdiRestore,
          () => this.#reset(),
          this.session?.isReset ?? true
        )}
        <span class="spacer"></span>
        ${this.#icon(
          'save',
          'editor_save_now',
          mdiContentSaveOutline,
          () => void this.session?.save()
        )}
        ${this.#icon(
          'rerender',
          'editor_rerender',
          mdiRefresh,
          () => void this.session?.render(),
          model.rendering
        )}
        <!-- Spelled out rather than drawn. Discarding throws the whole draft
             away and deleting removes the selected elements, and the two
             trash cans this toolbar would otherwise carry are the same
             picture for two very different losses. -->
        <button
          type="button"
          data-action="discard"
          aria-label=${this._t('editor_discard')}
          title=${this._t('editor_discard')}
          @click=${() => void this.#discard()}
        >
          ${this._t('editor_discard_short')}
        </button>
      </div>
      <div
        class="toolbar"
        role="toolbar"
        aria-label=${this._t('editor_arrange')}
        @keydown=${onToolbarKeyDown}
        @focusin=${onToolbarFocusIn}
      >
        <div role="group" aria-label=${this._t('editor_align')} class="toolbar">
          ${ALIGNMENTS.map(
            (alignment) => html`
              <button
                type="button"
                data-align=${alignment}
                aria-label=${this._t(`editor_align_${alignment}`)}
                title=${this._t(`editor_align_${alignment}`)}
                ?disabled=${selection === 0}
                @click=${() => this.#align(alignment)}
              >
                ${this._t(`editor_align_${alignment}_short`)}
              </button>
            `
          )}
        </div>
        <div role="group" aria-label=${this._t('editor_distribute')} class="toolbar">
          ${DISTRIBUTIONS.map(
            (axis) => html`
              <button
                type="button"
                data-distribute=${axis}
                aria-label=${this._t(`editor_distribute_${axis}`)}
                title=${this._t(`editor_distribute_${axis}`)}
                ?disabled=${selection < 3}
                @click=${() => this.#distribute(axis)}
              >
                ${this._t(`editor_distribute_${axis}_short`)}
              </button>
            `
          )}
        </div>
        <div role="group" aria-label=${this._t('editor_order')} class="toolbar">
          ${ORDERINGS.map(
            (ordering) => html`
              <button
                type="button"
                data-order=${ordering}
                aria-label=${this._t(`editor_order_${ordering}`)}
                title=${this._t(`editor_order_${ordering}`)}
                ?disabled=${selection === 0}
                @click=${() => this.#reorder(ordering)}
              >
                ${this._t(`editor_order_${ordering}_short`)}
              </button>
            `
          )}
        </div>
      </div>
      <div
        class="toolbar"
        role="toolbar"
        aria-label=${this._t('editor_view')}
        @keydown=${onToolbarKeyDown}
        @focusin=${onToolbarFocusIn}
      >
        ${this.#icon(
          'zoom-out',
          'editor_zoom_out',
          mdiMagnifyMinusOutline,
          () => this.#zoomBy(-1),
          this._zoom === ZOOM_STEPS[0]
        )}
        <span class="zoom-level" data-role="zoom">${Math.round(this._zoom * 100)}%</span>
        ${this.#icon(
          'zoom-in',
          'editor_zoom_in',
          mdiMagnifyPlusOutline,
          () => this.#zoomBy(1),
          this._zoom === ZOOM_STEPS[ZOOM_STEPS.length - 1]
        )}
        ${this.#icon('zoom-fit', 'editor_zoom_fit', mdiMagnifyScan, () => {
          this._zoom = ZOOM_STEPS[0];
          this.#announce(this._t('editor_zoom_fit'));
        })}
        <button
          type="button"
          data-action="snap"
          aria-pressed=${this._snapping}
          @click=${() => {
            this._snapping = !this._snapping;
            this.#announce(this._t(this._snapping ? 'editor_snap_on' : 'editor_snap_off'));
          }}
        >
          ${this._t('editor_snap')}
        </button>
        <button type="button" data-action="select-all" @click=${() => this.#selectAll()}>
          ${this._t('editor_select_all')}
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
          <p class="supporting" data-role="keyboard-hint">${this._t('editor_keyboard_hint')}</p>
          ${this.#renderDiagnostics(model)}
          <growspace-label-print-panel
            .capability=${this.capability}
            .session=${this.session}
            .model=${model}
            .language=${this.language}
            @recovery=${this.#onPanelRecovery}
          ></growspace-label-print-panel>
        </section>
        ${this.#renderInspector(model)}
      </div>
      <p class="visually-hidden" role="status" aria-live="polite" data-role="announcement">
        ${this._announcement}
      </p>
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

/** Whether a key event landed in something that eats printable keys itself. */
function isTextEntry(target: EventTarget | undefined): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable
  );
}

declare global {
  interface HTMLElementTagNameMap {
    'growspace-label-editor': GrowspaceLabelEditor;
  }
}
