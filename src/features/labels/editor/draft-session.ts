/**
 * One editing session: what the user has, what the server has, and what the
 * picture on screen is actually of.
 *
 * Three states, and the whole of this module is keeping them apart.
 *
 * **Provisional** is the document in the user's hands. It changes on every
 * pointer move, is the only thing the canvas draws frames from, and is not
 * yet anywhere else.
 *
 * **Saved** is what the backend stored, identified by its draft version. It
 * catches up to provisional on a debounce, by compare-and-swap, and a rejected
 * save is not a loss: the backend parks the refused payload on the draft's
 * recovery slot and hands it back, so the work exists in two places rather
 * than none.
 *
 * **Settled** is the raster, and it belongs to exactly one draft version. A
 * render is slow and an editor is fast, so the raster on screen is routinely
 * of a layout the user has already moved past — the session tracks which
 * version produced it and reports the difference as staleness rather than
 * letting the picture imply currency it does not have. Publish is gated on
 * the same fact: an action taken against a stale raster is an action taken
 * against something nobody has looked at.
 *
 * No DOM, no Lit, no timers of its own beyond one debounce handle — which is
 * why the settle rule and the conflict handling can be tested as arithmetic
 * rather than through a rendered component.
 */

import {
  autosaveLabelTemplateDraft,
  discardLabelTemplateDraft,
  openLabelTemplateDraft,
  previewLabelTemplateDraft,
  publishLabelTemplateDraft,
  type DraftAddress,
} from '../../../slices/labels/drafts';
import {
  DRAFT_VERSION_CONFLICT,
  DRAFT_VERSION_MISMATCH,
  type DraftPreview,
  type LabelDocument,
  type LabelFrame,
  type PublicationCheck,
  type TemplateDraft,
} from '../../../slices/labels/draft-schema';
import type { LabelRefusal, RenderResult } from '../../../slices/labels/schema';
import { DEFAULT_QUANTUM_MM, withFrame, type StockMm } from './geometry';

/** How long the editor waits before persisting a run of edits. */
export const AUTOSAVE_DEBOUNCE_MS = 800;

/** How deep the undo stack goes. Editing is not version control. */
export const UNDO_LIMIT = 100;

/** What the raster on screen is of, relative to what the user has. */
export type RasterStanding =
  /** There is no picture: none has been rendered, or the render produced none. */
  | 'absent'
  /** Rendered from the version the user is holding. */
  | 'settled'
  /** Rendered from an older version: the frames have moved since. */
  | 'stale';

export interface SessionState {
  /** The live document, mid-edit. */
  document: LabelDocument;
  /**
   * Everything the toolbar, the keyboard and the canvas act on, in the order
   * the user picked it.
   *
   * A list rather than one id because alignment, distribution and paint
   * ordering are operations on a *set*, and a selection model that held one
   * element would make each of them a different feature bolted beside the
   * editor rather than the same selection acting differently.
   */
  selectedIds: readonly string[];
  /**
   * The element the inspector shows: the last one picked, or nothing.
   *
   * Derived, never set. The inspector edits one element's style and content,
   * so it needs a single subject even while six are selected — and deriving
   * it means the two can never disagree about what is selected.
   */
  selectedId: string | null;
  /** The stored draft, as the backend last described it. */
  draft: TemplateDraft | null;
  /** Whether unsaved edits are waiting on the debounce or in flight. */
  dirty: boolean;
  saving: boolean;
  /** Why the draft cannot be published, when it cannot. */
  validation: PublicationCheck | null;
  /** Somebody published past this draft's base. Not a fault in the layout. */
  stale: boolean;
  /** The last authoritative raster, and what it is of. */
  render: RenderResult | null;
  rasterStanding: RasterStanding;
  rendering: boolean;
  /** The refusal the user has to answer, if any. */
  refusal: LabelRefusal | null;
  /** The name an untitled draft will publish under. */
  name: string;
  canUndo: boolean;
  canRedo: boolean;
}

type Listener = (state: SessionState) => void;

/**
 * An editor command, as two documents.
 *
 * Snapshots rather than reverse operations, because a Label Layout is a few
 * kilobytes and an inverse-operation stack is where undo bugs live: every
 * command would need an exact inverse, and one that is subtly wrong corrupts
 * the document rather than failing.
 */
interface Command {
  before: LabelDocument;
  after: LabelDocument;
  /** Continuous gestures coalesce under one label rather than filling the stack. */
  gesture: string | null;
}

export class DraftSession {
  #state: SessionState;
  #listeners = new Set<Listener>();
  #undo: Command[] = [];
  #redo: Command[] = [];
  #timer: ReturnType<typeof setTimeout> | null = null;
  #closed = false;

  /**
   * Which local edit the last autosave carried.
   *
   * A monotonic counter rather than a comparison of documents: it is what
   * lets the session know the stored draft *is* what the user has, without
   * deep-equality on every keystroke, and it is what the settle rule below
   * is built on.
   */
  #edits = 0;
  #savedEdits = 0;

  constructor(
    readonly address: DraftAddress,
    readonly stock: StockMm,
    document: LabelDocument,
    private readonly options: {
      quantumMm?: number;
      fixtureFamily?: string;
      density?: string;
      locale?: string;
      /** Injected in tests so a debounce does not become a sleep. */
      schedule?: (run: () => void, ms: number) => ReturnType<typeof setTimeout>;
    } = {}
  ) {
    this.#opened = document;
    this.#state = {
      document,
      selectedIds: [],
      selectedId: null,
      draft: null,
      dirty: false,
      saving: false,
      validation: null,
      stale: false,
      render: null,
      rasterStanding: 'absent',
      rendering: false,
      refusal: null,
      name: '',
      canUndo: false,
      canRedo: false,
    };
  }

  get state(): SessionState {
    return this.#state;
  }

  get quantumMm(): number {
    return this.options.quantumMm ?? DEFAULT_QUANTUM_MM;
  }

  subscribe(listener: Listener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /**
   * Apply a patch, then derive the facts nothing may set by hand.
   *
   * `rasterStanding` is derived *here*, after the merge, rather than passed in
   * by each caller. Computed at a call site it would read the pre-patch state
   * — the render that has not been stored yet, the draft version that is
   * about to change — and answer about the world as it was one line ago,
   * which is precisely the "looks current, is not" failure this whole
   * mechanism exists to prevent.
   */
  #emit(patch: Partial<SessionState>): void {
    const merged = { ...this.#state, ...patch };
    // A selection survives only as long as what it names. Deleting, undoing
    // past a duplication, or adopting another draft all leave ids behind that
    // no element answers to, and a toolbar acting on one of those would be
    // acting on nothing while looking as though it acted.
    const present = merged.document.elements.map((element) => element.id);
    const selectedIds = merged.selectedIds.filter((id) => present.includes(id));
    this.#state = {
      ...merged,
      selectedIds,
      selectedId: selectedIds[selectedIds.length - 1] ?? null,
      rasterStanding: this.#standing(merged),
      canUndo: this.#undo.length > 0,
      canRedo: this.#redo.length > 0,
    };
    for (const listener of this.#listeners) listener(this.#state);
  }

  /** Stop the debounce. Nothing in flight is cancelled; its answer is ignored. */
  close(): void {
    this.#closed = true;
    if (this.#timer !== null) clearTimeout(this.#timer);
    this.#timer = null;
  }

  // -------------------------------------------------------------------------
  // Adopting what the server has
  // -------------------------------------------------------------------------

  /**
   * Take a stored draft as the truth, discarding nothing the user has typed
   * *into the name field* that the server does not know about yet.
   *
   * Used on open and on an explicit reload. It resets the command stack,
   * because an undo history whose base document has been replaced would walk
   * backwards into a document that was never on this template.
   */
  adopt(draft: TemplateDraft, validation: PublicationCheck | null, stale = false): void {
    this.#undo = [];
    this.#redo = [];
    this.#edits = 0;
    this.#savedEdits = 0;
    // What Reset goes back to. The document this session was handed, not the
    // Factory Template behind it: a draft resumed from unsaved work is work
    // somebody wants back, and a Reset that reached past it to the shipped
    // layout would be a second, silent discard wearing a gentler name.
    this.#opened = draft.document;
    // A render belongs to the draft it came from. Adopting another one --
    // after a reload, or after switching templates -- leaves the raster
    // describing something that is no longer on screen.
    this.#renderedVersion = null;
    this.#emit({
      draft,
      document: draft.document,
      validation,
      stale,
      dirty: false,
      name: draft.name ?? '',
      refusal: null,
    });
  }

  /** Select exactly this element, or nothing. */
  select(elementId: string | null): void {
    this.#emit({ selectedIds: elementId === null ? [] : [elementId] });
  }

  /** Select exactly these, in the order given. */
  selectMany(elementIds: readonly string[]): void {
    this.#emit({ selectedIds: [...elementIds] });
  }

  /**
   * Add this element to the selection, or take it out again.
   *
   * The verb a shift-click and a list checkbox share. Re-adding moves it to
   * the end, so the inspector follows the element the user just touched
   * rather than one they picked four clicks ago.
   */
  toggleSelected(elementId: string): void {
    const current = this.#state.selectedIds;
    this.#emit({
      selectedIds: current.includes(elementId)
        ? current.filter((id) => id !== elementId)
        : [...current, elementId],
    });
  }

  setName(name: string): void {
    this.#emit({ name, dirty: true });
    this.#schedule();
  }

  // -------------------------------------------------------------------------
  // Editing
  // -------------------------------------------------------------------------

  /**
   * Apply one geometry change.
   *
   * `gesture` is what makes a drag one undo step: while the same gesture key
   * keeps arriving, the top command's `after` is rewritten rather than a new
   * one pushed, so undo returns to where the frame was before the drag
   * started rather than to the previous mouse position.
   */
  moveElement(elementId: string, frame: LabelFrame, gesture: string | null = null): void {
    this.apply(withFrame(this.#state.document, elementId, frame), gesture);
  }

  /**
   * Apply one edited document as a single undoable command.
   *
   * Everything that changes a layout goes through here — a drag, a nudge, a
   * typed millimetre, a style change, an alignment of six elements, a
   * duplication, a deletion, a Reset. One entry point rather than one method
   * per operation is what makes undo uniform: the stack holds documents, so a
   * command nobody wrote an inverse for is still exactly as reversible as one
   * somebody did.
   *
   * `selectedIds` rides along because several operations change what is
   * selected as part of what they do — duplication selects the copies,
   * deletion selects nothing — and doing that in a second call would leave
   * one render where the selection and the document disagreed.
   */
  apply(
    document: LabelDocument,
    gesture: string | null = null,
    selectedIds?: readonly string[]
  ): void {
    const before = this.#state.document;
    if (document === before) return;

    const top = this.#undo[this.#undo.length - 1];
    if (gesture !== null && top?.gesture === gesture) {
      top.after = document;
    } else {
      this.#undo.push({ before, after: document, gesture });
      if (this.#undo.length > UNDO_LIMIT) this.#undo.shift();
    }
    this.#redo = [];
    this.#edits += 1;
    this.#emit({
      document,
      dirty: true,
      ...(selectedIds === undefined ? {} : { selectedIds: [...selectedIds] }),
    });
    this.#schedule();
  }

  /**
   * Put the layout back the way this session found it.
   *
   * An ordinary command, which is the whole point: Reset is the operation
   * users reach for when they have made a mess, and one that could not be
   * undone would be the most dangerous button on the surface. It is also why
   * it is not a discard — the draft, its version and its history all survive.
   */
  reset(): void {
    this.apply(this.#opened, null, []);
  }

  /** Whether Reset would change anything. */
  get isReset(): boolean {
    return this.#state.document === this.#opened;
  }

  /** The document this session opened onto. */
  #opened: LabelDocument;

  /** Close a gesture so the next edit starts a new undo step. */
  endGesture(): void {
    const top = this.#undo[this.#undo.length - 1];
    if (top) top.gesture = null;
  }

  undo(): void {
    const command = this.#undo.pop();
    if (!command) return;
    this.#redo.push(command);
    this.#edits += 1;
    this.#emit({ document: command.before, dirty: true });
    this.#schedule();
  }

  redo(): void {
    const command = this.#redo.pop();
    if (!command) return;
    this.#undo.push(command);
    this.#edits += 1;
    this.#emit({ document: command.after, dirty: true });
    this.#schedule();
  }

  // -------------------------------------------------------------------------
  // The settle rule
  // -------------------------------------------------------------------------

  /**
   * What the raster on screen is of.
   *
   * Settled means two things at once: the stored draft is at the version the
   * render came from, *and* nothing has been edited locally since that
   * version was saved. Either alone is not enough — a draft can be at version
   * 7 with three unsaved moves on top of it, and a raster of version 7 is
   * then a picture of the past.
   */
  #standing(state: SessionState): RasterStanding {
    // A render that produced no raster is not a stale picture, it is no
    // picture. Calling it settled would put "this is exactly what the printer
    // would receive" over an empty stage — the one untruth the read-only
    // surface beside this editor exists to avoid, and the state a backend
    // whose printer integration is absent is routinely in.
    if (state.render === null || state.render.raster === null) return 'absent';
    if (state.draft === null) return 'stale';
    return this.#renderedVersion === state.draft.version && this.#edits === this.#savedEdits
      ? 'settled'
      : 'stale';
  }

  #renderedVersion: number | null = null;

  // -------------------------------------------------------------------------
  // Persisting
  // -------------------------------------------------------------------------

  #schedule(): void {
    if (this.#closed) return;
    if (this.#timer !== null) clearTimeout(this.#timer);
    const schedule = this.options.schedule ?? setTimeout;
    this.#timer = schedule(() => {
      this.#timer = null;
      void this.save();
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  /**
   * Persist the current document, compare-and-swap on the draft version.
   *
   * The edit counter is captured *before* the call and only adopted when the
   * answer arrives, so an edit made while the save was in flight leaves the
   * session dirty rather than being marked saved by a write that did not
   * include it.
   */
  async save(): Promise<void> {
    const draft = this.#state.draft;
    if (draft === null || this.#state.saving) return;
    const sending = this.#edits;
    const document = this.#state.document;
    const name = this.#state.name.trim();

    this.#emit({ saving: true });
    const answer = await autosaveLabelTemplateDraft(this.address, document, {
      expectedVersion: draft.version,
      ...(draft.template_id === null ? { name: name === '' ? null : name } : {}),
    });
    if (this.#closed) return;

    if (answer.outcome === 'refused') {
      // A version conflict is not a loss: the backend kept the payload on the
      // draft it refused it against, and the user still has it here. What it
      // is not is resolvable by writing again — that would be the overwrite
      // the compare-and-swap exists to prevent.
      this.#emit({ saving: false, refusal: answer.refusal });
      return;
    }

    this.#savedEdits = sending;
    this.#emit({
      saving: false,
      draft: answer.draft,
      validation: answer.validation,
      stale: answer.stale,
      dirty: this.#edits !== sending,
      refusal: null,
    });
  }

  /**
   * Ask for a raster of exactly the version the backend now holds.
   *
   * Refused rather than answered when the draft has moved on, which is how a
   * render that raced an autosave cannot land as a settled picture of the
   * wrong geometry.
   */
  async render(): Promise<void> {
    const draft = this.#state.draft;
    if (draft === null || this.#state.rendering) return;
    this.#emit({ rendering: true });

    let answer: DraftPreview;
    try {
      answer = await previewLabelTemplateDraft(this.address, draft.version, {
        fixtureFamily: this.options.fixtureFamily,
        density: this.options.density,
        locale: this.options.locale,
      });
    } catch (error) {
      if (this.#closed) return;
      this.#emit({ rendering: false, refusal: asRefusal(error) });
      return;
    }
    if (this.#closed) return;

    if (answer.outcome === 'refused') {
      const { code } = answer.refusal;
      // A mismatch is the mechanism working: the user edited while this was
      // in flight, and a new render will be asked for. It is not something to
      // put in front of them.
      this.#emit({
        rendering: false,
        refusal: code === DRAFT_VERSION_MISMATCH ? this.#state.refusal : answer.refusal,
      });
      return;
    }

    this.#renderedVersion = answer.draft_version;
    this.#emit({ rendering: false, render: answer.render, refusal: null });
  }

  /**
   * Publish, once the work is saved, valid, current and not overtaken.
   *
   * The gate is {@link publishable}, and every clause of it is a different
   * sentence to the user rather than one disabled button.
   */
  async publish(): Promise<{ templateId: string; name: string } | null> {
    const draft = this.#state.draft;
    if (draft === null) return null;
    const answer = await publishLabelTemplateDraft(this.address, draft.id);
    if (this.#closed) return null;
    if (answer.outcome === 'refused') {
      this.#emit({ refusal: answer.refusal });
      return null;
    }
    return { templateId: answer.template.id, name: answer.template.name };
  }

  /** Throw the unpublished work away, explicitly. */
  async discard(): Promise<TemplateDraft | null> {
    const answer = await discardLabelTemplateDraft(this.address);
    if (this.#closed) return null;
    if (answer.outcome === 'refused') {
      this.#emit({ refusal: answer.refusal });
      return null;
    }
    return answer.draft;
  }

  /**
   * Take the server's copy, losing the local edits it refused.
   *
   * The recovery a `draft_version_conflict` names. The payload this client
   * had is not gone — it is on the draft that comes back, in its recovery
   * slot — so this is "show me what won", not "delete what I did".
   */
  async reload(): Promise<void> {
    const answer = await openLabelTemplateDraft(this.address);
    if (this.#closed || answer.outcome === 'refused') {
      if (answer.outcome === 'refused') this.#emit({ refusal: answer.refusal });
      return;
    }
    this.adopt(answer.draft, this.#state.validation, this.#state.stale);
  }

  /** Dismiss a refusal the user has read and chosen not to act on. */
  acknowledge(): void {
    this.#emit({ refusal: null });
  }
}

/**
 * Why Publish is unavailable, in the user's terms, or nothing when it is not.
 *
 * Separate from the session so the same reasons can be shown beside a
 * disabled control rather than only discovered by pressing it.
 */
export function publishBlockedBy(state: SessionState): string | null {
  if (state.draft === null) return 'no_draft';
  if (state.dirty || state.saving) return 'unsaved';
  if (state.validation !== null && !state.validation.allowed) return 'invalid';
  if (state.stale) return 'stale';
  if (state.draft.template_id === null && state.name.trim() === '') return 'unnamed';
  // A *stale* raster blocks: publishing against it would be approving a
  // picture of a layout other than the one on screen. An **absent** one does
  // not, and the difference is a decision the backend already made. Its
  // publication gate is the document layer alone, deliberately excluding
  // every profile-relative judgement, because a saved revision is meant to
  // print on a printer nobody has bought yet -- so a stock with no
  // characterised printer, or an installation with no printer integration,
  // must still be able to save a perfectly good design.
  if (state.rasterStanding === 'stale') return 'stale_preview';
  return null;
}

export function publishable(state: SessionState): boolean {
  return publishBlockedBy(state) === null;
}

/** Shape a thrown transport error like a refusal, so one banner renders both. */
function asRefusal(error: unknown): LabelRefusal {
  return {
    code: 'label_template.transport_failed',
    reason: error instanceof Error ? error.message : String(error),
    recovery: 'none',
    current: { family: '', major: 0, minor: 0, generation: 0 },
  };
}

export { DRAFT_VERSION_CONFLICT };
