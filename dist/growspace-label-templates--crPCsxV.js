/*! growspace-e2e-build source=848a8ee57746c1d5414c7ac9a37a2c7fda7e3903790515d3f9ac15829076aeac id=0ef1cee4bb3e730c0b2f7cf05baca25e */
const { eT: negotiatedContract, h: hassCall, eU: CONTRACT_INCOMPATIBLE, eV: recoverFromContractRefusal, eW: DraftOpenedSchema, eX: DraftSavedSchema, eY: DraftPreviewSchema, eZ: DraftPublishedSchema, e_: DraftDiscardedSchema, e$: __classPrivateFieldSet, f0: __classPrivateFieldGet, f1: DRAFT_VERSION_CONFLICT, f2: DRAFT_VERSION_MISMATCH, f3: TextStyleSchema, cK: variables, i, _: __decorate, n, t, g: i$1, A: localize, x, bX: localizeWithParams, E, w: r, c7: o, j: mdiArrowLeft, f4: mdiUndo, f5: mdiRedo, a2: mdiContentCopy, l: mdiDelete, f6: mdiRestore, f7: mdiContentSaveOutline, ar: mdiRefresh, f8: mdiMagnifyMinusOutline, f9: mdiMagnifyPlusOutline, fa: mdiMagnifyScan, fb: object, fc: string, fd: ProvenanceSchema, fe: number, ff: array, fg: TemplateDraftSchema, fh: boolean, fi: unknown, fj: record, fk: PublicationCheckSchema, fl: discriminatedUnion, fm: LabelContractIdentitySchema, fn: literal, fo: LabelRefusalSchema, fp: getHass, fq: reconcileChoice, fr: labelSizeState, fs: previewFactoryTemplate, ft: labelSizes } = await import(window.__growspaceEntryUrl ?? './growspace-manager-card.js');

/**
 * The six calls an editor makes, and the one rule they share.
 *
 * Every one of them is contract-gated: the negotiated identity travels with
 * the request, and a backend whose capability has moved refuses it rather
 * than serving a result this card would misread. That refusal arrives as a
 * *result* — `{ outcome: 'refused' }` — so the caller decides what to do
 * about it, which is the whole reason the draft wire is shaped this way.
 *
 * What this module does **not** do is retry. A refused operation was asked
 * for under one contract, one draft version, or one authority; performing it
 * again under another and presenting the answer as the first one's would be
 * exactly the quiet substitution the compatibility contract forbids. The one
 * thing it does automatically is the capability refresh a
 * `contract_incompatible` refusal names, and even then the refused call is
 * handed back to its caller unperformed.
 */
const WS_OPEN_LABEL_TEMPLATE_DRAFT = 'growspace_manager/open_label_template_draft';
const WS_AUTOSAVE_LABEL_TEMPLATE_DRAFT = 'growspace_manager/autosave_label_template_draft';
const WS_PREVIEW_LABEL_TEMPLATE_DRAFT = 'growspace_manager/preview_label_template_draft';
const WS_PUBLISH_LABEL_TEMPLATE_DRAFT = 'growspace_manager/publish_label_template_draft';
const WS_DISCARD_LABEL_TEMPLATE_DRAFT = 'growspace_manager/discard_label_template_draft';
async function gated(command, payload, schema) {
    const contract = negotiatedContract();
    if (contract === null) {
        throw new Error('The Label Template capability has not been negotiated');
    }
    const answer = await hassCall(command, { contract, ...payload }, schema);
    const refusal = answer.refusal;
    if (refusal?.code === CONTRACT_INCOMPATIBLE) {
        // The recovery the refusal itself names. The refused call is not retried:
        // the user asked for something under one contract and would be shown the
        // result of something else.
        await recoverFromContractRefusal(refusal);
    }
    return answer;
}
function addressed(address) {
    return {
        label_size_id: address.labelSizeId,
        ...(address.templateId ? { template_id: address.templateId } : {}),
    };
}
/**
 * Resume this administrator's draft, or start one.
 *
 * `deriveFrom` is a starting point, not an instruction: when unsaved work is
 * already in the slot the backend returns that instead and says `resumed`,
 * because re-deriving over it would destroy exactly what this call exists to
 * recover.
 */
function openLabelTemplateDraft(address, deriveFrom) {
    return gated(WS_OPEN_LABEL_TEMPLATE_DRAFT, { ...addressed(address), ...(deriveFrom ? { derive_from: deriveFrom } : {}) }, DraftOpenedSchema);
}
/**
 * Store whatever the editor last had, valid or not.
 *
 * `expectedVersion` makes it a compare-and-swap, which is what stops one
 * administrator's second client from writing over the first one's newer work.
 * Omitting it is a save that has not read anything, and the backend takes it
 * at its word — so the editor always sends it.
 */
function autosaveLabelTemplateDraft(address, document, options = { expectedVersion: 0 }) {
    return gated(WS_AUTOSAVE_LABEL_TEMPLATE_DRAFT, {
        ...addressed(address),
        document,
        expected_version: options.expectedVersion,
        ...(options.name !== undefined ? { name: options.name } : {}),
    }, DraftSavedSchema);
}
/**
 * Render the stored draft at exactly one version.
 *
 * The version is not decoration. A render is slow and an editor is fast, so
 * without it an answer could arrive as a picture of a layout the user has
 * already changed, with nothing on screen saying so. Asking for one version
 * means the answer either settles that geometry or is refused.
 */
function previewLabelTemplateDraft(address, expectedDraftVersion, options = {}) {
    return gated(WS_PREVIEW_LABEL_TEMPLATE_DRAFT, {
        ...addressed(address),
        expected_draft_version: expectedDraftVersion,
        ...(options.fixtureFamily ? { fixture_family: options.fixtureFamily } : {}),
        ...(options.density ? { density: options.density } : {}),
        ...(options.locale ? { locale: options.locale } : {}),
    }, DraftPreviewSchema);
}
/**
 * Turn the draft into an immutable revision.
 *
 * `draftId` makes a retry safe without an idempotency key: if the draft is
 * gone because the first attempt actually succeeded and only its answer was
 * lost, the backend finds the revision that draft became and returns it
 * rather than publishing a second one.
 */
function publishLabelTemplateDraft(address, draftId, expectedDraftVersion) {
    return gated(WS_PUBLISH_LABEL_TEMPLATE_DRAFT, {
        ...addressed(address),
        ...(draftId ? { draft_id: draftId } : {}),
        ...(expectedDraftVersion === undefined
            ? {}
            : { expected_draft_version: expectedDraftVersion }),
    }, DraftPublishedSchema);
}
/** Remove unpublished work explicitly, and get back what was removed. */
function discardLabelTemplateDraft(address) {
    return gated(WS_DISCARD_LABEL_TEMPLATE_DRAFT, addressed(address), DraftDiscardedSchema);
}

/**
 * Millimetres on the stock, and where they land on a screen.
 *
 * Two rules hold everything here together.
 *
 * **The document is millimetres and nothing else.** A Label Layout holds no
 * pixels, no DPI and no device, which is what lets one saved revision print
 * on a printer nobody has bought yet. So every edit is computed in
 * millimetres and quantized to the document's own grid before it is written;
 * a value finer than the quantum is *rejected* by the backend rather than
 * rounded, so rounding here is not a nicety, it is the only way an edit
 * survives publication.
 *
 * **Screen pixels are measured, never assumed.** A pointer arrives in CSS
 * pixels, and the map from those to millimetres comes from the stage's own
 * `getBoundingClientRect()` — which already folds in browser zoom, device
 * pixel ratio, and any CSS transform on the way down. That is why dragging
 * behaves identically at 50% and 200% zoom: not because anything corrects for
 * zoom, but because nothing ever assumes a scale in the first place.
 *
 * Nothing in this module mutates. Every function returns a new frame, which
 * is what lets the undo stack hold documents rather than reverse operations.
 */
/** The document grid, in millimetres. The backend publishes it; this is the fallback. */
const DEFAULT_QUANTUM_MM = 0.01;
/** How far an arrow key moves a selection, and how far Shift takes it. */
const NUDGE_MM = 0.5;
const COARSE_NUDGE_MM = 2;
/** Nothing smaller than this is a rectangle anybody meant to make. */
const MINIMUM_EXTENT_MM = 1;
/**
 * Snap one millimetre value onto the document grid.
 *
 * Rounded rather than truncated so a drag does not drift one way over a
 * hundred small moves, and passed through `Number.parseFloat` so the result
 * is 2.5 rather than 2.5000000000000004 — a document is compared by digest,
 * and float noise in the JSON is a different layout to the backend.
 */
function quantize(value, quantumMm = DEFAULT_QUANTUM_MM) {
    const steps = Math.round(value / quantumMm);
    return Number.parseFloat((steps * quantumMm).toFixed(6));
}
/** Quantize all four edges of a frame at once. */
function quantizeFrame(frame, quantumMm = DEFAULT_QUANTUM_MM) {
    return {
        x_mm: quantize(frame.x_mm, quantumMm),
        y_mm: quantize(frame.y_mm, quantumMm),
        width_mm: quantize(frame.width_mm, quantumMm),
        height_mm: quantize(frame.height_mm, quantumMm),
    };
}
/**
 * Keep a frame on the paper.
 *
 * Moving, not shrinking: a drag that reaches the edge stops there with its
 * size intact, which is what a user expects from dragging. A frame too large
 * for the stock is left at the origin oversized rather than silently made to
 * fit — the backend will refuse it with `frame.outside_stock`, and that
 * refusal naming the real problem beats a rectangle that quietly became
 * something the user did not draw.
 */
function clampToStock(frame, stock, quantumMm = DEFAULT_QUANTUM_MM) {
    const x = Math.min(Math.max(frame.x_mm, 0), Math.max(stock.widthMm - frame.width_mm, 0));
    const y = Math.min(Math.max(frame.y_mm, 0), Math.max(stock.heightMm - frame.height_mm, 0));
    return quantizeFrame({ ...frame, x_mm: x, y_mm: y }, quantumMm);
}
/** Move a frame by a millimetre delta, quantized and kept on the paper. */
function translateFrame(frame, deltaXMm, deltaYMm, stock, quantumMm = DEFAULT_QUANTUM_MM) {
    return clampToStock({ ...frame, x_mm: frame.x_mm + deltaXMm, y_mm: frame.y_mm + deltaYMm }, stock, quantumMm);
}
/**
 * Resize a frame by dragging one handle.
 *
 * The opposite edge is the anchor, so pulling the west handle moves the left
 * edge and leaves the right one alone — the behaviour a handle implies. A
 * pull that would invert or collapse the rectangle stops at
 * {@link MINIMUM_EXTENT_MM} instead of flipping it: a negative extent is not
 * a shape a Label Layout can express, and a rectangle that turned inside out
 * under the cursor is never what somebody meant.
 */
function resizeFrame(frame, handle, deltaXMm, deltaYMm, stock, quantumMm = DEFAULT_QUANTUM_MM) {
    let { x_mm: x, y_mm: y, width_mm: width, height_mm: height } = frame;
    if (handle.includes('w')) {
        const right = x + width;
        x = Math.min(Math.max(x + deltaXMm, 0), right - MINIMUM_EXTENT_MM);
        width = right - x;
    }
    else if (handle.includes('e')) {
        width = Math.min(Math.max(width + deltaXMm, MINIMUM_EXTENT_MM), stock.widthMm - x);
    }
    if (handle.includes('n')) {
        const bottom = y + height;
        y = Math.min(Math.max(y + deltaYMm, 0), bottom - MINIMUM_EXTENT_MM);
        height = bottom - y;
    }
    else if (handle.includes('s')) {
        height = Math.min(Math.max(height + deltaYMm, MINIMUM_EXTENT_MM), stock.heightMm - y);
    }
    return quantizeFrame({ x_mm: x, y_mm: y, width_mm: width, height_mm: height }, quantumMm);
}
/**
 * Set one edge directly, the way the exact millimetre controls do.
 *
 * The same clamping as a drag, because a number typed into a field and a
 * rectangle dragged to the same place have to produce the same document. An
 * exact control that could express geometry a drag could not would make the
 * two views of one frame disagree.
 */
function setFrameField(frame, field, value, stock, quantumMm = DEFAULT_QUANTUM_MM) {
    const next = { ...frame, [field]: Math.max(value, 0) };
    if (field === 'width_mm')
        next.width_mm = Math.max(next.width_mm, MINIMUM_EXTENT_MM);
    if (field === 'height_mm')
        next.height_mm = Math.max(next.height_mm, MINIMUM_EXTENT_MM);
    return clampToStock(next, stock, quantumMm);
}
/**
 * Convert a pointer displacement in CSS pixels to one in millimetres.
 *
 * `rect` is the stage's measured box and `stock` the paper it represents, so
 * the ratio between them is the only scale this module ever uses. Nothing
 * here reads `devicePixelRatio`, a zoom level or a transform: a measured box
 * has all three in it already.
 */
function pixelsToMm(deltaXPx, deltaYPx, rect, stock) {
    if (rect.width <= 0 || rect.height <= 0)
        return { deltaXMm: 0, deltaYMm: 0 };
    return {
        deltaXMm: (deltaXPx / rect.width) * stock.widthMm,
        deltaYMm: (deltaYPx / rect.height) * stock.heightMm,
    };
}
/** Where a frame sits on the stage, as percentages the stylesheet can use. */
function frameAsPercentages(frame, stock) {
    const percent = (value, total) => `${total > 0 ? (value / total) * 100 : 0}%`;
    return {
        left: percent(frame.x_mm, stock.widthMm),
        top: percent(frame.y_mm, stock.heightMm),
        width: percent(frame.width_mm, stock.widthMm),
        height: percent(frame.height_mm, stock.heightMm),
    };
}
// ---------------------------------------------------------------------------
// Editing a document without reshaping it
// ---------------------------------------------------------------------------
/**
 * Return the document with one element's frame replaced.
 *
 * A structured clone with one field patched, never a rebuild from a parsed
 * model. The backend's document schema is **closed**: a property this card
 * did not know about and dropped on the way through would come back as a
 * validation error on the user's own work, and a property a newer backend
 * added is exactly the case a rebuild would silently lose.
 */
function withFrame(document, elementId, frame) {
    return {
        ...document,
        elements: document.elements.map((element) => element.id === elementId ? { ...element, frame } : element),
    };
}
/** The element the editor is acting on, or nothing. */
function elementById(document, elementId) {
    if (elementId === null)
        return undefined;
    return document.elements.find((element) => element.id === elementId);
}
/**
 * The element a newly opened draft selects.
 *
 * The required strain-name text element where there is one, because it is the
 * element every publishable layout has and the one this editor is about; the
 * first element otherwise, so a document whose required element the card
 * cannot recognise still opens onto something rather than onto nothing.
 */
function defaultSelection(document) {
    const required = document.elements.find((element) => element.kind === 'text' &&
        element.content?.binding === 'strain.name');
    return (required ?? document.elements[0])?.id ?? null;
}

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
var _DraftSession_instances, _DraftSession_state, _DraftSession_listeners, _DraftSession_undo, _DraftSession_redo, _DraftSession_timer, _DraftSession_closed, _DraftSession_edits, _DraftSession_savedEdits, _DraftSession_emit, _DraftSession_opened, _DraftSession_standing, _DraftSession_renderedVersion, _DraftSession_schedule;
/** How long the editor waits before persisting a run of edits. */
const AUTOSAVE_DEBOUNCE_MS = 800;
/** How deep the undo stack goes. Editing is not version control. */
const UNDO_LIMIT = 100;
class DraftSession {
    constructor(address, stock, document, options = {}) {
        _DraftSession_instances.add(this);
        this.address = address;
        this.stock = stock;
        this.options = options;
        _DraftSession_state.set(this, void 0);
        _DraftSession_listeners.set(this, new Set());
        _DraftSession_undo.set(this, []);
        _DraftSession_redo.set(this, []);
        _DraftSession_timer.set(this, null);
        _DraftSession_closed.set(this, false);
        /**
         * Which local edit the last autosave carried.
         *
         * A monotonic counter rather than a comparison of documents: it is what
         * lets the session know the stored draft *is* what the user has, without
         * deep-equality on every keystroke, and it is what the settle rule below
         * is built on.
         */
        _DraftSession_edits.set(this, 0);
        _DraftSession_savedEdits.set(this, 0);
        /** The document this session opened onto. */
        _DraftSession_opened.set(this, void 0);
        _DraftSession_renderedVersion.set(this, null);
        __classPrivateFieldSet(this, _DraftSession_opened, document, "f");
        __classPrivateFieldSet(this, _DraftSession_state, {
            document,
            selectedIds: [],
            selectedId: null,
            draft: null,
            dirty: false,
            saving: false,
            validation: null,
            stale: false,
            orphaned: false,
            readOnly: false,
            render: null,
            rasterStanding: 'absent',
            rendering: false,
            refusal: null,
            name: '',
            canUndo: false,
            canRedo: false,
        }, "f");
    }
    get state() {
        return __classPrivateFieldGet(this, _DraftSession_state, "f");
    }
    get quantumMm() {
        return this.options.quantumMm ?? DEFAULT_QUANTUM_MM;
    }
    subscribe(listener) {
        __classPrivateFieldGet(this, _DraftSession_listeners, "f").add(listener);
        return () => __classPrivateFieldGet(this, _DraftSession_listeners, "f").delete(listener);
    }
    /** Stop the debounce. Nothing in flight is cancelled; its answer is ignored. */
    close() {
        __classPrivateFieldSet(this, _DraftSession_closed, true, "f");
        if (__classPrivateFieldGet(this, _DraftSession_timer, "f") !== null)
            clearTimeout(__classPrivateFieldGet(this, _DraftSession_timer, "f"));
        __classPrivateFieldSet(this, _DraftSession_timer, null, "f");
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
    adopt(draft, validation, stale = false) {
        __classPrivateFieldSet(this, _DraftSession_undo, [], "f");
        __classPrivateFieldSet(this, _DraftSession_redo, [], "f");
        __classPrivateFieldSet(this, _DraftSession_edits, 0, "f");
        __classPrivateFieldSet(this, _DraftSession_savedEdits, 0, "f");
        // What Reset goes back to. The document this session was handed, not the
        // Factory Template behind it: a draft resumed from unsaved work is work
        // somebody wants back, and a Reset that reached past it to the shipped
        // layout would be a second, silent discard wearing a gentler name.
        __classPrivateFieldSet(this, _DraftSession_opened, draft.document, "f");
        // A render belongs to the draft it came from. Adopting another one --
        // after a reload, or after switching templates -- leaves the raster
        // describing something that is no longer on screen.
        __classPrivateFieldSet(this, _DraftSession_renderedVersion, null, "f");
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, {
            draft,
            document: draft.document,
            validation,
            stale,
            readOnly: false,
            orphaned: false,
            dirty: false,
            name: draft.name ?? '',
            refusal: null,
        });
    }
    /** Select exactly this element, or nothing. */
    select(elementId) {
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, { selectedIds: elementId === null ? [] : [elementId] });
    }
    /** Select exactly these, in the order given. */
    selectMany(elementIds) {
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, { selectedIds: [...elementIds] });
    }
    /**
     * Add this element to the selection, or take it out again.
     *
     * The verb a shift-click and a list checkbox share. Re-adding moves it to
     * the end, so the inspector follows the element the user just touched
     * rather than one they picked four clicks ago.
     */
    toggleSelected(elementId) {
        const current = __classPrivateFieldGet(this, _DraftSession_state, "f").selectedIds;
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, {
            selectedIds: current.includes(elementId)
                ? current.filter((id) => id !== elementId)
                : [...current, elementId],
        });
    }
    setName(name) {
        if (__classPrivateFieldGet(this, _DraftSession_state, "f").readOnly)
            return;
        __classPrivateFieldSet(this, _DraftSession_edits, __classPrivateFieldGet(this, _DraftSession_edits, "f") + 1, "f");
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, { name, dirty: true });
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_schedule).call(this);
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
    moveElement(elementId, frame, gesture = null) {
        this.apply(withFrame(__classPrivateFieldGet(this, _DraftSession_state, "f").document, elementId, frame), gesture);
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
    apply(document, gesture = null, selectedIds) {
        if (__classPrivateFieldGet(this, _DraftSession_state, "f").readOnly)
            return;
        const before = __classPrivateFieldGet(this, _DraftSession_state, "f").document;
        if (document === before)
            return;
        const top = __classPrivateFieldGet(this, _DraftSession_undo, "f")[__classPrivateFieldGet(this, _DraftSession_undo, "f").length - 1];
        if (gesture !== null && top?.gesture === gesture) {
            top.after = document;
        }
        else {
            __classPrivateFieldGet(this, _DraftSession_undo, "f").push({ before, after: document, gesture });
            if (__classPrivateFieldGet(this, _DraftSession_undo, "f").length > UNDO_LIMIT)
                __classPrivateFieldGet(this, _DraftSession_undo, "f").shift();
        }
        __classPrivateFieldSet(this, _DraftSession_redo, [], "f");
        __classPrivateFieldSet(this, _DraftSession_edits, __classPrivateFieldGet(this, _DraftSession_edits, "f") + 1, "f");
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, {
            document,
            dirty: true,
            ...(selectedIds === undefined ? {} : { selectedIds: [...selectedIds] }),
        });
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_schedule).call(this);
    }
    /**
     * Put the layout back the way this session found it.
     *
     * An ordinary command, which is the whole point: Reset is the operation
     * users reach for when they have made a mess, and one that could not be
     * undone would be the most dangerous button on the surface. It is also why
     * it is not a discard — the draft, its version and its history all survive.
     */
    reset() {
        this.apply(__classPrivateFieldGet(this, _DraftSession_opened, "f"), null, []);
    }
    /** Whether Reset would change anything. */
    get isReset() {
        return __classPrivateFieldGet(this, _DraftSession_state, "f").document === __classPrivateFieldGet(this, _DraftSession_opened, "f");
    }
    /** Close a gesture so the next edit starts a new undo step. */
    endGesture() {
        const top = __classPrivateFieldGet(this, _DraftSession_undo, "f")[__classPrivateFieldGet(this, _DraftSession_undo, "f").length - 1];
        if (top)
            top.gesture = null;
    }
    undo() {
        if (__classPrivateFieldGet(this, _DraftSession_state, "f").readOnly)
            return;
        const command = __classPrivateFieldGet(this, _DraftSession_undo, "f").pop();
        if (!command)
            return;
        __classPrivateFieldGet(this, _DraftSession_redo, "f").push(command);
        __classPrivateFieldSet(this, _DraftSession_edits, __classPrivateFieldGet(this, _DraftSession_edits, "f") + 1, "f");
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, { document: command.before, dirty: true });
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_schedule).call(this);
    }
    redo() {
        if (__classPrivateFieldGet(this, _DraftSession_state, "f").readOnly)
            return;
        const command = __classPrivateFieldGet(this, _DraftSession_redo, "f").pop();
        if (!command)
            return;
        __classPrivateFieldGet(this, _DraftSession_undo, "f").push(command);
        __classPrivateFieldSet(this, _DraftSession_edits, __classPrivateFieldGet(this, _DraftSession_edits, "f") + 1, "f");
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, { document: command.after, dirty: true });
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_schedule).call(this);
    }
    /**
     * Persist the current document, compare-and-swap on the draft version.
     *
     * The edit counter is captured *before* the call and only adopted when the
     * answer arrives, so an edit made while the save was in flight leaves the
     * session dirty rather than being marked saved by a write that did not
     * include it.
     */
    async save() {
        const draft = __classPrivateFieldGet(this, _DraftSession_state, "f").draft;
        if (draft === null ||
            __classPrivateFieldGet(this, _DraftSession_state, "f").saving ||
            __classPrivateFieldGet(this, _DraftSession_state, "f").readOnly ||
            __classPrivateFieldGet(this, _DraftSession_state, "f").refusal?.code === DRAFT_VERSION_CONFLICT)
            return;
        const sending = __classPrivateFieldGet(this, _DraftSession_edits, "f");
        const document = __classPrivateFieldGet(this, _DraftSession_state, "f").document;
        const name = __classPrivateFieldGet(this, _DraftSession_state, "f").name.trim();
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, { saving: true });
        let answer;
        try {
            answer = await autosaveLabelTemplateDraft(this.address, document, {
                expectedVersion: draft.version,
                ...(draft.template_id === null ? { name: name === '' ? null : name } : {}),
            });
        }
        catch (error) {
            if (!__classPrivateFieldGet(this, _DraftSession_closed, "f"))
                __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, { saving: false, refusal: asRefusal(error) });
            return;
        }
        if (__classPrivateFieldGet(this, _DraftSession_closed, "f"))
            return;
        if (answer.outcome === 'refused') {
            // A version conflict is not a loss: the backend kept the payload on the
            // draft it refused it against, and the user still has it here. What it
            // is not is resolvable by writing again — that would be the overwrite
            // the compare-and-swap exists to prevent.
            __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, { saving: false, refusal: answer.refusal });
            return;
        }
        __classPrivateFieldSet(this, _DraftSession_savedEdits, sending, "f");
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, {
            saving: false,
            draft: answer.draft,
            validation: answer.validation,
            stale: answer.stale,
            dirty: __classPrivateFieldGet(this, _DraftSession_edits, "f") !== sending,
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
    async render() {
        const draft = __classPrivateFieldGet(this, _DraftSession_state, "f").draft;
        if (draft === null || __classPrivateFieldGet(this, _DraftSession_state, "f").rendering)
            return;
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, { rendering: true });
        let answer;
        try {
            answer = await previewLabelTemplateDraft(this.address, draft.version, {
                fixtureFamily: this.options.fixtureFamily,
                density: this.options.density,
                locale: this.options.locale,
            });
        }
        catch (error) {
            if (__classPrivateFieldGet(this, _DraftSession_closed, "f"))
                return;
            __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, { rendering: false, refusal: asRefusal(error) });
            return;
        }
        if (__classPrivateFieldGet(this, _DraftSession_closed, "f"))
            return;
        if (answer.outcome === 'refused') {
            const { code } = answer.refusal;
            // A mismatch is the mechanism working: the user edited while this was
            // in flight, and a new render will be asked for. It is not something to
            // put in front of them.
            __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, {
                rendering: false,
                refusal: code === DRAFT_VERSION_MISMATCH ? __classPrivateFieldGet(this, _DraftSession_state, "f").refusal : answer.refusal,
            });
            return;
        }
        __classPrivateFieldSet(this, _DraftSession_renderedVersion, answer.draft_version, "f");
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, { rendering: false, render: answer.render, refusal: null });
    }
    /**
     * Publish, once the work is saved, valid, current and not overtaken.
     *
     * The gate is {@link publishable}, and every clause of it is a different
     * sentence to the user rather than one disabled button.
     */
    async publish() {
        const draft = __classPrivateFieldGet(this, _DraftSession_state, "f").draft;
        if (draft === null)
            return null;
        const answer = await publishLabelTemplateDraft(this.address, draft.id, draft.version);
        if (__classPrivateFieldGet(this, _DraftSession_closed, "f"))
            return null;
        if (answer.outcome === 'refused') {
            __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, { refusal: answer.refusal });
            return null;
        }
        return { templateId: answer.template.id, name: answer.template.name };
    }
    /** Throw the unpublished work away, explicitly. */
    async discard() {
        const answer = await discardLabelTemplateDraft(this.address);
        if (__classPrivateFieldGet(this, _DraftSession_closed, "f"))
            return null;
        if (answer.outcome === 'refused') {
            __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, { refusal: answer.refusal });
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
    async reload() {
        const answer = await openLabelTemplateDraft(this.address);
        if (__classPrivateFieldGet(this, _DraftSession_closed, "f") || answer.outcome === 'refused') {
            if (answer.outcome === 'refused')
                __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, { refusal: answer.refusal });
            return;
        }
        this.adopt(answer.draft, __classPrivateFieldGet(this, _DraftSession_state, "f").validation, __classPrivateFieldGet(this, _DraftSession_state, "f").stale);
    }
    /** Events only mark local work; they never replace it. */
    observeLibrary(library) {
        const draft = __classPrivateFieldGet(this, _DraftSession_state, "f").draft;
        if (!draft)
            return;
        const stored = library.drafts.find((item) => item.id === draft.id);
        const head = library.templates.find((item) => item.id === draft.template_id);
        const orphaned = draft.template_id !== null && !head;
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, {
            stale: !!head && head.head_revision !== draft.base_revision,
            orphaned,
            readOnly: orphaned || !library.store.readable,
        });
        if (stored && stored.version !== draft.version && !__classPrivateFieldGet(this, _DraftSession_state, "f").saving)
            this.refuse({
                code: DRAFT_VERSION_CONFLICT,
                reason: 'Another client saved this draft. Export your work before reloading the server copy.',
                recovery: 'reload_draft',
                current: { family: '', major: 0, minor: 0, generation: 0 },
            });
    }
    refuse(refusal) {
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, {
            refusal,
            ...(refusal.code === 'label_template.not_authorized' ? { readOnly: true } : {}),
        });
    }
    /** Adopt the server version while retaining an undo step for Factory replacement. */
    replaceFromFactory(draft) {
        const previous = __classPrivateFieldGet(this, _DraftSession_state, "f").document;
        this.adopt(draft, null);
        __classPrivateFieldGet(this, _DraftSession_undo, "f").push({ before: previous, after: draft.document, gesture: null });
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, {});
        void this.render();
    }
    /** Dismiss a refusal the user has read and chosen not to act on. */
    acknowledge() {
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, { refusal: null });
    }
}
_DraftSession_state = new WeakMap(), _DraftSession_listeners = new WeakMap(), _DraftSession_undo = new WeakMap(), _DraftSession_redo = new WeakMap(), _DraftSession_timer = new WeakMap(), _DraftSession_closed = new WeakMap(), _DraftSession_edits = new WeakMap(), _DraftSession_savedEdits = new WeakMap(), _DraftSession_opened = new WeakMap(), _DraftSession_renderedVersion = new WeakMap(), _DraftSession_instances = new WeakSet(), _DraftSession_emit = function _DraftSession_emit(patch) {
    const merged = { ...__classPrivateFieldGet(this, _DraftSession_state, "f"), ...patch };
    // A selection survives only as long as what it names. Deleting, undoing
    // past a duplication, or adopting another draft all leave ids behind that
    // no element answers to, and a toolbar acting on one of those would be
    // acting on nothing while looking as though it acted.
    const present = merged.document.elements.map((element) => element.id);
    const selectedIds = merged.selectedIds.filter((id) => present.includes(id));
    __classPrivateFieldSet(this, _DraftSession_state, {
        ...merged,
        selectedIds,
        selectedId: selectedIds[selectedIds.length - 1] ?? null,
        rasterStanding: __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_standing).call(this, merged),
        canUndo: __classPrivateFieldGet(this, _DraftSession_undo, "f").length > 0,
        canRedo: __classPrivateFieldGet(this, _DraftSession_redo, "f").length > 0,
    }, "f");
    for (const listener of __classPrivateFieldGet(this, _DraftSession_listeners, "f"))
        listener(__classPrivateFieldGet(this, _DraftSession_state, "f"));
}, _DraftSession_standing = function _DraftSession_standing(state) {
    // A render that produced no raster is not a stale picture, it is no
    // picture. Calling it settled would put "this is exactly what the printer
    // would receive" over an empty stage — the one untruth the read-only
    // surface beside this editor exists to avoid, and the state a backend
    // whose printer integration is absent is routinely in.
    if (state.render === null || state.render.raster === null)
        return 'absent';
    if (state.draft === null)
        return 'stale';
    return __classPrivateFieldGet(this, _DraftSession_renderedVersion, "f") === state.draft.version && __classPrivateFieldGet(this, _DraftSession_edits, "f") === __classPrivateFieldGet(this, _DraftSession_savedEdits, "f")
        ? 'settled'
        : 'stale';
}, _DraftSession_schedule = function _DraftSession_schedule() {
    if (__classPrivateFieldGet(this, _DraftSession_closed, "f"))
        return;
    if (__classPrivateFieldGet(this, _DraftSession_timer, "f") !== null)
        clearTimeout(__classPrivateFieldGet(this, _DraftSession_timer, "f"));
    const schedule = this.options.schedule ?? setTimeout;
    __classPrivateFieldSet(this, _DraftSession_timer, schedule(() => {
        __classPrivateFieldSet(this, _DraftSession_timer, null, "f");
        void this.save();
    }, AUTOSAVE_DEBOUNCE_MS), "f");
};
/**
 * Why Publish is unavailable, in the user's terms, or nothing when it is not.
 *
 * Separate from the session so the same reasons can be shown beside a
 * disabled control rather than only discovered by pressing it.
 */
function publishBlockedBy(state) {
    if (state.draft === null)
        return 'no_draft';
    if (state.readOnly || state.orphaned)
        return 'read_only';
    if (state.refusal?.code === DRAFT_VERSION_CONFLICT)
        return 'conflict';
    if (state.dirty || state.saving)
        return 'unsaved';
    if (state.validation !== null && !state.validation.allowed)
        return 'invalid';
    if (state.stale)
        return 'stale';
    if (state.draft.template_id === null && state.name.trim() === '')
        return 'unnamed';
    // A *stale* raster blocks: publishing against it would be approving a
    // picture of a layout other than the one on screen. An **absent** one does
    // not, and the difference is a decision the backend already made. Its
    // publication gate is the document layer alone, deliberately excluding
    // every profile-relative judgement, because a saved revision is meant to
    // print on a printer nobody has bought yet -- so a stock with no
    // characterised printer, or an installation with no printer integration,
    // must still be able to save a perfectly good design.
    if (state.rasterStanding === 'stale')
        return 'stale_preview';
    return null;
}
/** Shape a thrown transport error like a refusal, so one banner renders both. */
function asRefusal(error) {
    return {
        code: 'label_template.transport_failed',
        reason: error instanceof Error ? error.message : String(error),
        recovery: 'none',
        current: { family: '', major: 0, minor: 0, generation: 0 },
    };
}

/**
 * What a control may offer, and where every option came from.
 *
 * The editor's hardest promise is the one that is easiest to break by
 * accident: **a control must not be able to express a label the product
 * cannot print.** A font list typed into a stylesheet, an "any angle"
 * rotation field, a QR error-correction picker with four entries where the
 * printer profile admits three — each of those produces a document the
 * backend refuses, or worse, one it accepts and the compiler then blocks, so
 * the user discovers the constraint after the design rather than while making
 * it.
 *
 * So nothing here is a list this module knows. Every option is resolved from
 * one of exactly two sources, and which one is never a matter of taste:
 *
 * **The capability envelope**, for anything the backend catalogues or
 * measures — fonts, line spacing, monochrome tokens, bindings and their
 * parameters, and the per-profile limits a printer imposes (the readable font
 * floor, the QR quiet zone, the divider's thinnest ink, the rotations the
 * renderer has actually earned).
 *
 * **The canonical document schema**, for the closed enumerations that are
 * part of the layout language rather than of any printer — the three
 * horizontal alignments, the three vertical ones, the four overflow policies.
 * Those are read off the zod schemas in `draft-schema`, not retyped, so a
 * schema change moves the controls with it and a control cannot drift from
 * the wire it writes.
 *
 * The one thing this module does hold is the *shape* of a new element, which
 * is not a constraint but a starting point — and even there every token it
 * reaches for is taken from the catalogue rather than named.
 */
/** The four variants version 1 has, in the order the editor offers them. */
const ELEMENT_KINDS = ['text', 'logo', 'qr', 'divider'];
/**
 * Clockwise degrees the document language admits, per kind.
 *
 * A divider takes only two: it is a rectangular mark, so 180 describes the
 * same ink as 0 and 270 the same as 90, and admitting them would let two
 * documents mean one label. That is the backend's rule, mirrored here so the
 * control never offers a value the save would refuse.
 */
const ROTATIONS = [0, 90, 180, 270];
const DIVIDER_ROTATIONS = [0, 90];
/** The closed enumerations of the layout language itself, read off the wire shape. */
const HORIZONTAL_ALIGNMENTS = TextStyleSchema.shape.horizontal_align.options;
const VERTICAL_ALIGNMENTS = TextStyleSchema.shape.vertical_align.options;
const OVERFLOW_POLICIES = TextStyleSchema.shape.overflow.options;
/**
 * The profile whose limits the editor holds a design to.
 *
 * Where a stock has several, the one that may put a real record on paper
 * wins, then the one with physical evidence, then whatever is catalogued:
 * designing against the strictest thing that could actually print this label
 * is the only ordering that cannot surprise somebody at the printer. `null`
 * is an ordinary answer — an unprofiled stock has no printer to be safe for,
 * and the editor then offers the document language's own limits alone.
 */
function governingProfile(capability, labelSizeId) {
    const profiles = (capability?.catalogues.profiles ?? []).filter((profile) => profile.label_size_id === labelSizeId);
    return (profiles.find((profile) => profile.authorizes_production) ??
        profiles.find((profile) => profile.evidence === 'product_verified') ??
        profiles[0] ??
        null);
}
/**
 * The rotations this element may actually be given.
 *
 * The document language's set for the kind, narrowed to what the profile's
 * renderer has earned. The shipped Niimbot profile admits `[0]` alone, which
 * is why this returns a list rather than a boolean: a control offering one
 * value says "this printer places elements upright" honestly, where a
 * rotate-by-90 button that produced `profile.rotation_unsupported` on the
 * next render would not.
 */
function rotationsFor(kind, profile) {
    const language = kind === 'divider' ? DIVIDER_ROTATIONS : ROTATIONS;
    if (profile === null)
        return [...language];
    return language.filter((degrees) => profile.supported_element_rotations.includes(degrees));
}
function textControls(capability, profile) {
    return {
        fonts: capability?.catalogues.style_tokens.fonts ?? [],
        lineSpacing: capability?.catalogues.style_tokens.line_spacing ?? [],
        horizontalAlign: HORIZONTAL_ALIGNMENTS,
        verticalAlign: VERTICAL_ALIGNMENTS,
        overflow: OVERFLOW_POLICIES,
        readableFloorMm: profile?.limits.text_readable_floor_mm ?? 0,
        comfortThresholdMm: profile?.limits.text_comfort_threshold_mm ?? 0,
    };
}
const LOGO_FITS = ['contain'];
function logoControls(capability, profile) {
    return {
        monochrome: capability?.catalogues.style_tokens.monochrome ?? [],
        fit: LOGO_FITS,
        minimumEffectiveDpi: profile?.limits.image_minimum_effective_dpi ?? 0,
    };
}
function qrControls(profile) {
    return {
        errorCorrection: profile?.limits.qr_error_correction_levels ?? QR_ERROR_CORRECTION,
        minimumQuietZoneModules: profile?.limits.qr_minimum_quiet_zone_modules ?? 0,
        maximumEncodedBytes: profile?.limits.qr_maximum_encoded_bytes ?? 0,
    };
}
/** The document language's four levels, for a stock no profile governs. */
const QR_ERROR_CORRECTION = ['low', 'medium', 'quartile', 'high'];
const DIVIDER_FILLS = ['black'];
function dividerControls(profile) {
    return {
        minimumThicknessMm: profile?.limits.divider_minimum_thickness_mm ?? 0,
        fill: DIVIDER_FILLS,
    };
}
/**
 * The bindings that may fill an element of this kind, in this document.
 *
 * Filtered by kind because the catalogue says which kinds each binding
 * applies to, and a binding on the wrong kind is `content.binding_kind_mismatch`
 * rather than a design somebody can look at and judge.
 */
function bindingsFor(capability, kind) {
    return (capability?.catalogues.bindings ?? []).filter((binding) => binding.kinds.includes(kind));
}
// ---------------------------------------------------------------------------
// Making one
// ---------------------------------------------------------------------------
/** A new element's side, as a fraction of the stock's shorter axis. */
const NEW_ELEMENT_FRACTION = 0.4;
/**
 * A starting frame for a new element: small, on the paper, and at the origin
 * the safe area suggests.
 *
 * Deliberately not centred on the selection or under the cursor. A new
 * element that lands exactly on top of an existing one is the one placement
 * a user cannot see happening, and the snapping and alignment tools exist to
 * move it from a known starting point to wherever it belongs.
 */
function newElementFrame(stock, square) {
    const side = Math.min(stock.widthMm, stock.heightMm) * NEW_ELEMENT_FRACTION;
    return {
        x_mm: round(stock.widthMm * 0.1),
        y_mm: round(stock.heightMm * 0.1),
        width_mm: round(square ? side : Math.min(stock.widthMm * 0.6, stock.widthMm)),
        height_mm: round(square ? side : Math.max(side * 0.25, 2)),
    };
}
const round = (value) => Number.parseFloat(value.toFixed(2));
/**
 * Build one new element of a kind, from the catalogue and nothing else.
 *
 * Returns `null` when the catalogue cannot fill it — a QR with no QR binding
 * shipped, say. Refusing to add is the honest answer there: an element the
 * backend would reject on the next save is not a starting point, and a card
 * that invented a binding id to fill the gap would be writing a document
 * against a catalogue it does not have.
 *
 * `placeholder` is the text a new text element starts with. It arrives from
 * the caller because it is the one thing in a document that a user reads as
 * prose, so it belongs to the localized surface rather than to this module —
 * and the backend refuses a literal that is blank, so there has to be one.
 */
function newElement(options) {
    const { capability, profile, kind, stock, id, placeholder } = options;
    const frame = newElementFrame(stock, kind === 'qr' || kind === 'logo');
    // Upright, because it is the one rotation every profile realises: a new
    // element that arrived at an angle this printer cannot place would be
    // blocked by the compiler before the user had drawn anything.
    const rotation = rotationsFor(kind, profile)[0] ?? 0;
    const tokens = capability?.catalogues.style_tokens;
    if (kind === 'divider') {
        const thickness = Math.max(dividerControls(profile).minimumThicknessMm, 0.4);
        return {
            id,
            kind,
            frame: { ...frame, height_mm: round(thickness) },
            rotation,
            style: { fill: DIVIDER_FILLS[0] },
        };
    }
    if (kind === 'text') {
        const font = tokens?.fonts[0]?.id;
        const spacing = tokens?.line_spacing[0]?.id;
        if (font === undefined || spacing === undefined)
            return null;
        const floor = Math.max(textControls(capability, profile).comfortThresholdMm, 2.2);
        return {
            id,
            kind,
            frame,
            rotation,
            // A literal rather than the first binding: new text is text somebody is
            // about to write, and a field that silently arrived bound to the
            // breeder would be a guess wearing the authority of a default. The
            // inspector offers every binding the catalogue holds beside it.
            content: { literal: placeholder },
            style: {
                font,
                font_size_mm: round(Math.max(floor * 1.45, floor)),
                horizontal_align: 'left',
                vertical_align: 'center',
                line_spacing: spacing,
                overflow: 'shrink_ellipsis',
                minimum_font_size_mm: round(floor),
                maximum_lines: 1,
            },
        };
    }
    const binding = bindingsFor(capability, kind)[0];
    if (binding === undefined)
        return null;
    if (kind === 'logo') {
        const monochrome = tokens?.monochrome[0]?.id;
        if (monochrome === undefined)
            return null;
        return {
            id,
            kind,
            frame,
            rotation,
            content: { binding: binding.id, parameters: defaultParameters(binding) },
            style: { monochrome, fit: LOGO_FITS[0] },
        };
    }
    const qr = qrControls(profile);
    const correction = qr.errorCorrection[0];
    if (correction === undefined)
        return null;
    return {
        id,
        kind,
        frame,
        rotation,
        content: { binding: binding.id, parameters: defaultParameters(binding) },
        style: {
            error_correction: correction,
            quiet_zone_modules: Math.max(qr.minimumQuietZoneModules, 1),
        },
    };
}
/**
 * Each of a binding's parameters at its first catalogued value.
 *
 * First rather than chosen, because the backend documents the first entry as
 * the parameter's default and fills an omitted one with exactly that — so a
 * document written here and one written by the backend agree.
 */
function defaultParameters(binding) {
    const parameters = {};
    for (const [name, allowed] of Object.entries(binding.parameters)) {
        const first = allowed[0];
        if (first !== undefined)
            parameters[name] = first;
    }
    return parameters;
}
/**
 * Whether this element is the one every publishable layout needs.
 *
 * The editor does not use this to forbid anything — deleting it is allowed,
 * and the backend's own `document.missing_required_strain_name` is what says
 * the layout cannot publish, in one place rather than two. What the editor
 * does with it is *say so* in the elements list, so the consequence is
 * visible before the deletion rather than after the next save.
 */
function isRequiredElement(element) {
    return (element.kind === 'text' &&
        'binding' in element.content &&
        element.content.binding === REQUIRED_BINDING);
}
/** The binding the backend requires exactly one text element to carry. */
const REQUIRED_BINDING = 'strain.name';
/** Whether removing these elements would leave the layout without its required one. */
function wouldDropRequired(document, removing) {
    const remaining = document.elements.filter((element) => !removing.includes(element.id));
    return document.elements.some(isRequiredElement) && !remaining.some(isRequiredElement);
}

/**
 * Acting on more than one element at once, and on where they line up.
 *
 * Everything here is arithmetic over documents: a function takes a document
 * and returns another, never touching the DOM, a session, or a pointer. That
 * is what lets alignment, distribution, paint ordering, duplication and
 * snapping be *proved* rather than demonstrated — each is a rule about
 * rectangles, and a rule about rectangles is a test with numbers in it.
 *
 * Two conventions hold throughout.
 *
 * **Paint order is the array order**, because the canonical document has no
 * `z_index` and refuses one by name. So "bring forward" is a splice, and the
 * end of the array is the front.
 *
 * **Nothing repairs.** A frame that would leave the stock is clamped by
 * {@link clampToStock} on the way out, exactly as a drag is, and nothing else
 * is adjusted: an element too large for the paper stays too large and the
 * backend names it, rather than being quietly resized into something the user
 * did not draw.
 */
/** The elements a selection names, in document order. Unknown ids are dropped. */
function selectedElements(document, ids) {
    return document.elements.filter((element) => ids.includes(element.id));
}
/** The rectangle every one of these frames fits inside. */
function boundsOf(frames) {
    if (frames.length === 0)
        return null;
    const left = Math.min(...frames.map((frame) => frame.x_mm));
    const top = Math.min(...frames.map((frame) => frame.y_mm));
    const right = Math.max(...frames.map((frame) => frame.x_mm + frame.width_mm));
    const bottom = Math.max(...frames.map((frame) => frame.y_mm + frame.height_mm));
    return { xMm: left, yMm: top, widthMm: right - left, heightMm: bottom - top };
}
/**
 * Replace several elements' frames in one pass.
 *
 * One document per *operation* rather than one per element, so an alignment
 * of four elements is one undo step and one autosave rather than four of
 * each. Elements not named are returned untouched, by identity, which keeps
 * the document a shallow patch of the one it came from.
 */
function withFrames(document, frames) {
    return {
        ...document,
        elements: document.elements.map((element) => {
            const frame = frames.get(element.id);
            return frame === undefined ? element : { ...element, frame };
        }),
    };
}
/** Replace one element wholesale — the way a style or content change lands. */
function withElement(document, element) {
    return {
        ...document,
        elements: document.elements.map((existing) => existing.id === element.id ? element : existing),
    };
}
/**
 * Bring a set of elements into line.
 *
 * The rectangle they align to is the selection's own bounding box when there
 * are several, and **the stock** when there is exactly one — which is the
 * difference between "line these up with each other" and "centre this on the
 * label", two things a user means by the same button depending on what they
 * have selected. Anything else would make the single-selection case do
 * nothing at all, since one frame is already aligned with itself.
 */
function align(document, ids, alignment, stock, quantumMm = DEFAULT_QUANTUM_MM) {
    const elements = selectedElements(document, ids);
    if (elements.length === 0)
        return document;
    const box = elements.length === 1
        ? { xMm: 0, yMm: 0, widthMm: stock.widthMm, heightMm: stock.heightMm }
        : boundsOf(elements.map((element) => element.frame));
    const frames = new Map();
    for (const element of elements) {
        const frame = element.frame;
        const moved = { ...frame };
        switch (alignment) {
            case 'left':
                moved.x_mm = box.xMm;
                break;
            case 'center':
                moved.x_mm = box.xMm + (box.widthMm - frame.width_mm) / 2;
                break;
            case 'right':
                moved.x_mm = box.xMm + box.widthMm - frame.width_mm;
                break;
            case 'top':
                moved.y_mm = box.yMm;
                break;
            case 'middle':
                moved.y_mm = box.yMm + (box.heightMm - frame.height_mm) / 2;
                break;
            case 'bottom':
                moved.y_mm = box.yMm + box.heightMm - frame.height_mm;
                break;
        }
        frames.set(element.id, clampToStock(moved, stock, quantumMm));
    }
    return withFrames(document, frames);
}
/**
 * Equalize the gaps between three or more elements.
 *
 * The outermost two do not move — they are what defines the span — and the
 * ones between them are spread so the *gaps* are equal rather than the
 * centres, because elements of different widths spaced by their centres do
 * not look evenly spaced, which is the whole point of the operation.
 *
 * Fewer than three is returned unchanged: two elements have one gap, and a
 * single gap is already equal to itself.
 */
function distribute(document, ids, axis, stock, quantumMm = DEFAULT_QUANTUM_MM) {
    const elements = selectedElements(document, ids);
    if (elements.length < 3)
        return document;
    const horizontal = axis === 'horizontal';
    const start = (frame) => (horizontal ? frame.x_mm : frame.y_mm);
    const extent = (frame) => (horizontal ? frame.width_mm : frame.height_mm);
    const ordered = [...elements].sort((a, b) => start(a.frame) - start(b.frame));
    const first = ordered[0].frame;
    const last = ordered[ordered.length - 1].frame;
    const span = start(last) + extent(last) - start(first);
    const occupied = ordered.reduce((total, element) => total + extent(element.frame), 0);
    const gap = (span - occupied) / (ordered.length - 1);
    const frames = new Map();
    let cursor = start(first);
    for (const element of ordered) {
        const moved = horizontal
            ? { ...element.frame, x_mm: cursor }
            : { ...element.frame, y_mm: cursor };
        frames.set(element.id, clampToStock(moved, stock, quantumMm));
        cursor += extent(element.frame) + gap;
    }
    return withFrames(document, frames);
}
/**
 * Move a set of elements through the paint order.
 *
 * The selection keeps its own relative order whichever way it travels, and
 * `forward`/`backward` move it by exactly one place rather than past every
 * unselected neighbour at once — so repeated presses walk a selection through
 * a stack the way a user watching it expects.
 */
function reorder(document, ids, ordering) {
    const moving = document.elements.filter((element) => ids.includes(element.id));
    if (moving.length === 0 || moving.length === document.elements.length)
        return document;
    const rest = document.elements.filter((element) => !ids.includes(element.id));
    if (ordering === 'front')
        return { ...document, elements: [...rest, ...moving] };
    if (ordering === 'back')
        return { ...document, elements: [...moving, ...rest] };
    const elements = [...document.elements];
    const indices = elements
        .map((element, index) => (ids.includes(element.id) ? index : -1))
        .filter((index) => index >= 0);
    // Forward walks from the front so the leading element of the selection
    // never swaps with one of its own; backward walks from the back for the
    // same reason.
    const walk = ordering === 'forward' ? [...indices].reverse() : indices;
    for (const index of walk) {
        const target = ordering === 'forward' ? index + 1 : index - 1;
        if (target < 0 || target >= elements.length)
            continue;
        if (ids.includes(elements[target].id))
            continue;
        [elements[index], elements[target]] = [elements[target], elements[index]];
    }
    return { ...document, elements };
}
/** How far a duplicate lands from its original, so the copy is visibly a copy. */
const DUPLICATE_OFFSET_MM = 1;
/**
 * Copy elements, offset, and select the copies.
 *
 * Each copy goes in directly above its original rather than at the front of
 * the document: a duplicate that jumped the paint order would come back
 * looking different from the thing it was copied from, which is the one
 * property a duplicate has to keep.
 */
function duplicate(document, ids, mintId, stock, quantumMm = DEFAULT_QUANTUM_MM) {
    const copies = [];
    const elements = [];
    for (const element of document.elements) {
        elements.push(element);
        if (!ids.includes(element.id))
            continue;
        const id = mintId();
        copies.push(id);
        elements.push({
            ...element,
            id,
            frame: clampToStock({
                ...element.frame,
                x_mm: element.frame.x_mm + DUPLICATE_OFFSET_MM,
                y_mm: element.frame.y_mm + DUPLICATE_OFFSET_MM,
            }, stock, quantumMm),
        });
    }
    return { document: { ...document, elements }, ids: copies };
}
/** Remove elements. The layout may stop being publishable; the backend says so. */
function removeElements(document, ids) {
    return {
        ...document,
        elements: document.elements.filter((element) => !ids.includes(element.id)),
    };
}
/** Add one element at the front of the paint order. */
function addElement(document, element) {
    return { ...document, elements: [...document.elements, element] };
}
// ---------------------------------------------------------------------------
// Snapping, and the guides that explain it
// ---------------------------------------------------------------------------
/** How close a dragged edge has to come, in millimetres, before it snaps. */
const SNAP_TOLERANCE_MM = 0.6;
/**
 * Every line a moving frame could line up with.
 *
 * The stock's own edges and midlines, plus each unselected element's edges
 * and midlines. Selected elements are excluded because a frame snapping to
 * one it is being dragged alongside would fight the drag.
 */
function snapLines(document, stock, excluding) {
    const lines = [
        { axis: 'x', valueMm: 0, source: 'stock-edge' },
        { axis: 'x', valueMm: stock.widthMm, source: 'stock-edge' },
        { axis: 'x', valueMm: stock.widthMm / 2, source: 'stock-center' },
        { axis: 'y', valueMm: 0, source: 'stock-edge' },
        { axis: 'y', valueMm: stock.heightMm, source: 'stock-edge' },
        { axis: 'y', valueMm: stock.heightMm / 2, source: 'stock-center' },
    ];
    for (const element of document.elements) {
        if (excluding.includes(element.id))
            continue;
        const frame = element.frame;
        lines.push({ axis: 'x', valueMm: frame.x_mm, source: 'element-edge' }, { axis: 'x', valueMm: frame.x_mm + frame.width_mm, source: 'element-edge' }, { axis: 'x', valueMm: frame.x_mm + frame.width_mm / 2, source: 'element-center' }, { axis: 'y', valueMm: frame.y_mm, source: 'element-edge' }, { axis: 'y', valueMm: frame.y_mm + frame.height_mm, source: 'element-edge' }, { axis: 'y', valueMm: frame.y_mm + frame.height_mm / 2, source: 'element-center' });
    }
    return lines;
}
/**
 * Pull a moving frame onto the nearest line, per axis, within tolerance.
 *
 * Each axis is decided independently and each considers the frame's leading
 * edge, centre and trailing edge, so a rectangle can align its right edge to
 * a neighbour's left one without its own left edge having to be near
 * anything. The nearest candidate wins; a tie keeps the first, which is the
 * stock's own geometry, because a user who has dragged something to the
 * middle of the paper meant the paper.
 *
 * The returned frame is quantized but **not** clamped — clamping is the
 * caller's, and doing both here would let a snap silently move a frame that
 * the stock had already stopped.
 */
function snapFrame(frame, lines, toleranceMm = SNAP_TOLERANCE_MM, quantumMm = DEFAULT_QUANTUM_MM) {
    const guides = [];
    const snapped = { ...frame };
    for (const axis of ['x', 'y']) {
        const origin = axis === 'x' ? frame.x_mm : frame.y_mm;
        const extent = axis === 'x' ? frame.width_mm : frame.height_mm;
        const offsets = [0, extent / 2, extent];
        let best = null;
        for (const line of lines) {
            if (line.axis !== axis)
                continue;
            for (const offset of offsets) {
                const delta = line.valueMm - (origin + offset);
                const distance = Math.abs(delta);
                if (distance > toleranceMm)
                    continue;
                if (best === null || distance < best.distance)
                    best = { line, delta, distance };
            }
        }
        if (best === null)
            continue;
        guides.push(best.line);
        if (axis === 'x')
            snapped.x_mm = quantize(origin + best.delta, quantumMm);
        else
            snapped.y_mm = quantize(origin + best.delta, quantumMm);
    }
    return { frame: snapped, guides };
}

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
var _GrowspaceLabelInspector_instances, _GrowspaceLabelInspector_name, _GrowspaceLabelInspector_change, _GrowspaceLabelInspector_frame, _GrowspaceLabelInspector_renderGeometry, _GrowspaceLabelInspector_renderRotation, _GrowspaceLabelInspector_renderContent, _GrowspaceLabelInspector_useBinding, _GrowspaceLabelInspector_renderBinding, _GrowspaceLabelInspector_renderStyle, _GrowspaceLabelInspector_renderTextStyle, _GrowspaceLabelInspector_renderLogoStyle, _GrowspaceLabelInspector_renderQrStyle, _GrowspaceLabelInspector_renderDividerStyle, _GrowspaceLabelInspector_segmented;
/** The four exact controls, and the order the inspector lists them in. */
const FIELDS = [
    { key: 'x_mm', label: 'editor_field_x' },
    { key: 'y_mm', label: 'editor_field_y' },
    { key: 'width_mm', label: 'editor_field_width' },
    { key: 'height_mm', label: 'editor_field_height' },
];
let GrowspaceLabelInspector = class GrowspaceLabelInspector extends i$1 {
    constructor() {
        super(...arguments);
        _GrowspaceLabelInspector_instances.add(this);
        this.profile = null;
        this.stock = { widthMm: 1, heightMm: 1 };
        this.quantumMm = DEFAULT_QUANTUM_MM;
        this.selectionSize = 0;
        this.language = 'en';
    }
    _t(key) {
        return localize(`labels.${key}`, '', '', this.language);
    }
    render() {
        const element = this.element;
        if (element === undefined) {
            return x `<p class="supporting" data-role="empty">
        ${this._t('editor_nothing_selected')}
      </p>`;
        }
        return x `
      <p class="supporting" data-role="subject">
        ${this.selectionSize > 1
            ? localizeWithParams('labels.editor_selection_many', { count: String(this.selectionSize), kind: this._t(`editor_kind_${element.kind}`) }, this.language)
            : this._t(`editor_kind_${element.kind}`)}
      </p>
      ${__classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_renderGeometry).call(this, element)} ${__classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_renderRotation).call(this, element)}
      ${__classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_renderContent).call(this, element)} ${__classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_renderStyle).call(this, element)}
    `;
    }
};
_GrowspaceLabelInspector_instances = new WeakSet();
_GrowspaceLabelInspector_name = function _GrowspaceLabelInspector_name(key, fallback) {
    const value = localize(`labels.${key}`, '', '', this.language);
    return value === `labels.${key}` ? fallback : value;
};
_GrowspaceLabelInspector_change = function _GrowspaceLabelInspector_change(element, gesture = null) {
    this.dispatchEvent(new CustomEvent('element-change', {
        detail: { element, gesture },
        bubbles: true,
        composed: true,
    }));
};
_GrowspaceLabelInspector_frame = function _GrowspaceLabelInspector_frame(frame, gesture = null) {
    if (this.element === undefined)
        return;
    __classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_change).call(this, { ...this.element, frame }, gesture);
};
_GrowspaceLabelInspector_renderGeometry = function _GrowspaceLabelInspector_renderGeometry(element) {
    return x `
      <h3>${this._t('editor_position')}</h3>
      <div class="fields">
        ${FIELDS.map((field) => x `
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
                @change=${(event) => __classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_frame).call(this, setFrameField(element.frame, field.key, Number.parseFloat(event.target.value), this.stock, this.quantumMm))}
              />
            </div>
          `)}
      </div>
      <h3>${this._t('editor_nudge')}</h3>
      <div class="nudge" role="group" aria-label=${this._t('editor_nudge')}>
        ${[
        ['up', 0, -NUDGE_MM],
        ['left', -NUDGE_MM, 0],
        ['down', 0, NUDGE_MM],
        ['right', NUDGE_MM, 0],
    ].map(([name, dx, dy]) => x `
            <button
              type="button"
              data-nudge=${name}
              aria-label=${this._t(`editor_nudge_${name}`)}
              @click=${() => __classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_frame).call(this, translateFrame(element.frame, dx, dy, this.stock, this.quantumMm))}
            >
              ${{ up: '↑', left: '←', down: '↓', right: '→' }[name]}
            </button>
          `)}
      </div>
      <p class="supporting">${this._t('editor_nudge_hint')}</p>
    `;
};
_GrowspaceLabelInspector_renderRotation = function _GrowspaceLabelInspector_renderRotation(element) {
    const options = rotationsFor(element.kind, this.profile);
    if (options.length <= 1) {
        return x `
        <h3>${this._t('editor_rotation')}</h3>
        <p class="supporting" data-role="rotation-fixed">
          ${localizeWithParams('labels.editor_rotation_fixed', { degrees: String(element.rotation) }, this.language)}
        </p>
      `;
    }
    return x `
      <h3>${this._t('editor_rotation')}</h3>
      <div class="segmented" role="group" aria-label=${this._t('editor_rotation')}>
        ${options.map((degrees) => x `
            <button
              type="button"
              data-rotation=${degrees}
              aria-pressed=${element.rotation === degrees}
              @click=${() => __classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_change).call(this, { ...element, rotation: degrees })}
            >
              ${degrees}°
            </button>
          `)}
      </div>
    `;
};
_GrowspaceLabelInspector_renderContent = function _GrowspaceLabelInspector_renderContent(element) {
    if (element.kind === 'divider')
        return E;
    const bindings = bindingsFor(this.capability, element.kind);
    const content = element.content;
    const bound = 'binding' in content;
    // Only text takes a literal: a QR of a typed string and a logo of one are
    // not things the v1 catalogue can resolve to ink.
    const literalAllowed = element.kind === 'text';
    return x `
      <h3>${this._t('editor_content')}</h3>
      ${literalAllowed
        ? x `
            <div class="segmented" role="group" aria-label=${this._t('editor_content_source')}>
              <button
                type="button"
                data-source="binding"
                aria-pressed=${bound}
                ?disabled=${bindings.length === 0}
                @click=${() => __classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_useBinding).call(this, element, bindings[0]?.id)}
              >
                ${this._t('editor_content_binding')}
              </button>
              <button
                type="button"
                data-source="literal"
                aria-pressed=${!bound}
                @click=${() => __classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_change).call(this, {
            ...element,
            kind: 'text',
            content: { literal: this._t('editor_content_placeholder') },
        })}
              >
                ${this._t('editor_content_literal')}
              </button>
            </div>
          `
        : E}
      ${bound
        ? __classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_renderBinding).call(this, element, bindings, content.binding)
        : 'literal' in content
            ? x `
              <p>
                <label for="literal">${this._t('editor_content_literal')}</label>
                <input
                  id="literal"
                  type="text"
                  data-field="literal"
                  .value=${content.literal}
                  @change=${(event) => __classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_change).call(this, {
                ...element,
                content: { literal: event.target.value },
            })}
                />
              </p>
            `
            : x `<p class="supporting" data-role="asset">${this._t('editor_content_asset')}</p>`}
    `;
};
_GrowspaceLabelInspector_useBinding = function _GrowspaceLabelInspector_useBinding(element, bindingId) {
    if (bindingId === undefined || element.kind === 'divider')
        return;
    const binding = bindingsFor(this.capability, element.kind).find((entry) => entry.id === bindingId);
    if (binding === undefined)
        return;
    const parameters = {};
    for (const [name, allowed] of Object.entries(binding.parameters)) {
        const first = allowed[0];
        if (first !== undefined)
            parameters[name] = first;
    }
    __classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_change).call(this, { ...element, content: { binding: binding.id, parameters } });
};
_GrowspaceLabelInspector_renderBinding = function _GrowspaceLabelInspector_renderBinding(element, bindings, current) {
    const definition = bindings.find((entry) => entry.id === current);
    const parameters = element.kind === 'divider' || !('binding' in element.content)
        ? {}
        : (element.content.parameters ?? {});
    return x `
      <p>
        <label for="binding">${this._t('editor_content_binding')}</label>
        <select
          id="binding"
          data-field="binding"
          .value=${current}
          @change=${(event) => __classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_useBinding).call(this, element, event.target.value)}
        >
          ${bindings.map((entry) => x `
              <option value=${entry.id} ?selected=${entry.id === current}>
                ${__classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_name).call(this, `binding_${entry.id.replace(/\./g, '_')}`, entry.id)}
              </option>
            `)}
        </select>
      </p>
      ${Object.entries(definition?.parameters ?? {}).map(([name, allowed]) => x `
          <p>
            <label for=${`parameter-${name}`}
              >${__classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_name).call(this, `editor_parameter_${name}`, name)}</label
            >
            <select
              id=${`parameter-${name}`}
              data-parameter=${name}
              @change=${(event) => __classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_change).call(this, {
        ...element,
        content: {
            binding: current,
            parameters: {
                ...parameters,
                [name]: event.target.value,
            },
        },
    })}
            >
              ${allowed.map((value) => x `
                  <option value=${value} ?selected=${parameters[name] === value}>
                    ${__classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_name).call(this, `editor_value_${value}`, value)}
                  </option>
                `)}
            </select>
          </p>
        `)}
      ${definition === undefined
        ? x `<p class="supporting" data-role="unknown-binding">
            ${localizeWithParams('labels.editor_binding_unknown', { id: current }, this.language)}
          </p>`
        : E}
    `;
};
_GrowspaceLabelInspector_renderStyle = function _GrowspaceLabelInspector_renderStyle(element) {
    switch (element.kind) {
        case 'text':
            return __classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_renderTextStyle).call(this, element);
        case 'logo':
            return __classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_renderLogoStyle).call(this, element);
        case 'qr':
            return __classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_renderQrStyle).call(this, element);
        case 'divider':
            return __classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_renderDividerStyle).call(this, element);
    }
};
_GrowspaceLabelInspector_renderTextStyle = function _GrowspaceLabelInspector_renderTextStyle(element) {
    const controls = textControls(this.capability, this.profile);
    const style = element.style;
    const set = (patch) => __classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_change).call(this, { ...element, style: { ...style, ...patch } });
    return x `
      <h3>${this._t('editor_style')}</h3>
      <p>
        <label for="font">${this._t('editor_style_font')}</label>
        <select
          id="font"
          data-field="font"
          @change=${(event) => set({ font: event.target.value })}
        >
          ${controls.fonts.map((font) => x `
              <option value=${font.id} ?selected=${font.id === style.font}>
                ${font.description}
              </option>
            `)}
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
            @change=${(event) => set({ font_size_mm: millimetres(event, style.font_size_mm, this.quantumMm) })}
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
            @change=${(event) => set({
        minimum_font_size_mm: millimetres(event, style.minimum_font_size_mm, this.quantumMm),
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
            @change=${(event) => {
        const value = Number.parseInt(event.target.value, 10);
        if (Number.isFinite(value) && value >= 1)
            set({ maximum_lines: value });
    }}
          />
        </div>
      </div>
      <p class="supporting" data-role="font-floor">
        ${localizeWithParams('labels.editor_style_font_floor', {
        floor: String(controls.readableFloorMm),
        comfort: String(controls.comfortThresholdMm),
    }, this.language)}
      </p>
      ${__classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_segmented).call(this, 'editor_style_horizontal', 'text_align', controls.horizontalAlign, style.horizontal_align, (value) => set({ horizontal_align: value }))}
      ${__classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_segmented).call(this, 'editor_style_vertical', 'text_valign', controls.verticalAlign, style.vertical_align, (value) => set({ vertical_align: value }))}
      <p>
        <label for="line_spacing">${this._t('editor_style_line_spacing')}</label>
        <select
          id="line_spacing"
          data-field="line_spacing"
          @change=${(event) => set({ line_spacing: event.target.value })}
        >
          ${controls.lineSpacing.map((spacing) => x `
              <option value=${spacing.id} ?selected=${spacing.id === style.line_spacing}>
                ${__classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_name).call(this, `editor_spacing_${spacing.id.split('.')[2] ?? spacing.id}`, spacing.id)}
              </option>
            `)}
        </select>
      </p>
      <p>
        <label for="overflow">${this._t('editor_style_overflow')}</label>
        <select
          id="overflow"
          data-field="overflow"
          @change=${(event) => set({
        overflow: event.target.value,
    })}
        >
          ${controls.overflow.map((policy) => x `
              <option value=${policy} ?selected=${policy === style.overflow}>
                ${this._t(`editor_overflow_${policy}`)}
              </option>
            `)}
        </select>
      </p>
    `;
};
_GrowspaceLabelInspector_renderLogoStyle = function _GrowspaceLabelInspector_renderLogoStyle(element) {
    const controls = logoControls(this.capability, this.profile);
    const style = element.style;
    return x `
      <h3>${this._t('editor_style')}</h3>
      <p>
        <label for="monochrome">${this._t('editor_style_monochrome')}</label>
        <select
          id="monochrome"
          data-field="monochrome"
          @change=${(event) => __classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_change).call(this, {
        ...element,
        style: { ...style, monochrome: event.target.value },
    })}
        >
          ${controls.monochrome.map((token) => x `
              <option value=${token.id} ?selected=${token.id === style.monochrome}>
                ${this._t(token.dither ? 'editor_mono_dither' : 'editor_mono_threshold')}
              </option>
            `)}
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
};
_GrowspaceLabelInspector_renderQrStyle = function _GrowspaceLabelInspector_renderQrStyle(element) {
    const controls = qrControls(this.profile);
    const style = element.style;
    return x `
      <h3>${this._t('editor_style')}</h3>
      <p>
        <label for="error_correction">${this._t('editor_style_error_correction')}</label>
        <select
          id="error_correction"
          data-field="error_correction"
          @change=${(event) => __classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_change).call(this, {
        ...element,
        style: { ...style, error_correction: event.target.value },
    })}
        >
          ${controls.errorCorrection.map((level) => x `
              <option value=${level} ?selected=${level === style.error_correction}>
                ${__classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_name).call(this, `editor_correction_${level}`, level)}
              </option>
            `)}
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
          @change=${(event) => {
        const value = Number.parseInt(event.target.value, 10);
        if (Number.isFinite(value) && value >= 0) {
            __classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_change).call(this, { ...element, style: { ...style, quiet_zone_modules: value } });
        }
    }}
        />
      </p>
      <p class="supporting" data-role="quiet-zone-floor">
        ${localizeWithParams('labels.editor_style_quiet_zone_floor', {
        modules: String(controls.minimumQuietZoneModules),
        bytes: String(controls.maximumEncodedBytes),
    }, this.language)}
      </p>
    `;
};
_GrowspaceLabelInspector_renderDividerStyle = function _GrowspaceLabelInspector_renderDividerStyle(element) {
    const controls = dividerControls(this.profile);
    return x `
      <h3>${this._t('editor_style')}</h3>
      <dl class="fixed" data-role="fixed">
        <dt>${this._t('editor_style_fill')}</dt>
        <dd>${element.style.fill}</dd>
      </dl>
      <p class="supporting" data-role="divider-floor">
        ${localizeWithParams('labels.editor_style_divider_floor', { thickness: String(controls.minimumThicknessMm) }, this.language)}
      </p>
    `;
};
_GrowspaceLabelInspector_segmented = function _GrowspaceLabelInspector_segmented(labelKey, group, options, current, choose) {
    // The option keys are the group's own rather than shared, because a
    // horizontal `center` and a vertical `center` are different words in
    // English and in most other languages — and the arrange toolbar's
    // "centre horizontally" is a third meaning again.
    return x `
      <h3>${this._t(labelKey)}</h3>
      <div class="segmented" role="group" aria-label=${this._t(labelKey)}>
        ${options.map((option) => x `
            <button
              type="button"
              data-group=${group}
              data-option=${option}
              aria-pressed=${option === current}
              @click=${() => choose(option)}
            >
              ${__classPrivateFieldGet(this, _GrowspaceLabelInspector_instances, "m", _GrowspaceLabelInspector_name).call(this, `editor_${group}_${option}`, option)}
            </button>
          `)}
      </div>
    `;
};
GrowspaceLabelInspector.styles = [
    variables,
    i `
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

      .nudge button:nth-child(1) {
        grid-column: 2;
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
__decorate([
    n({ attribute: false })
], GrowspaceLabelInspector.prototype, "capability", void 0);
__decorate([
    n({ attribute: false })
], GrowspaceLabelInspector.prototype, "profile", void 0);
__decorate([
    n({ attribute: false })
], GrowspaceLabelInspector.prototype, "element", void 0);
__decorate([
    n({ attribute: false })
], GrowspaceLabelInspector.prototype, "stock", void 0);
__decorate([
    n({ type: Number })
], GrowspaceLabelInspector.prototype, "quantumMm", void 0);
__decorate([
    n({ type: Number })
], GrowspaceLabelInspector.prototype, "selectionSize", void 0);
__decorate([
    n({ type: String })
], GrowspaceLabelInspector.prototype, "language", void 0);
GrowspaceLabelInspector = __decorate([
    t('growspace-label-inspector')
], GrowspaceLabelInspector);
/** A millimetre value from a number field, quantized, falling back to what was there. */
function millimetres(event, fallback, quantumMm) {
    const value = Number.parseFloat(event.target.value);
    if (!Number.isFinite(value) || value <= 0)
        return fallback;
    return Number.parseFloat((Math.round(value / quantumMm) * quantumMm).toFixed(6));
}

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
var _GrowspaceLabelEditor_instances, _GrowspaceLabelEditor_unsubscribe, _GrowspaceLabelEditor_gesture, _GrowspaceLabelEditor_attach, _GrowspaceLabelEditor_stock_get, _GrowspaceLabelEditor_profile_get, _GrowspaceLabelEditor_announce, _GrowspaceLabelEditor_mintId, _GrowspaceLabelEditor_settled, _GrowspaceLabelEditor_onPointerDown, _GrowspaceLabelEditor_onPointerMove, _GrowspaceLabelEditor_onPointerUp, _GrowspaceLabelEditor_announceSelection, _GrowspaceLabelEditor_selectAll, _GrowspaceLabelEditor_nudgeSelection, _GrowspaceLabelEditor_align, _GrowspaceLabelEditor_distribute, _GrowspaceLabelEditor_reorder, _GrowspaceLabelEditor_duplicate, _GrowspaceLabelEditor_delete, _GrowspaceLabelEditor_addElement, _GrowspaceLabelEditor_reset, _GrowspaceLabelEditor_onElementChange, _GrowspaceLabelEditor_zoomBy, _GrowspaceLabelEditor_onKeyDown, _GrowspaceLabelEditor_renderStage, _GrowspaceLabelEditor_renderGuide, _GrowspaceLabelEditor_renderElement, _GrowspaceLabelEditor_renderHandle, _GrowspaceLabelEditor_elementName, _GrowspaceLabelEditor_renderElements, _GrowspaceLabelEditor_renderInspector, _GrowspaceLabelEditor_renderDiagnostics, _GrowspaceLabelEditor_selectFor, _GrowspaceLabelEditor_renderStanding, _GrowspaceLabelEditor_renderRefusal, _GrowspaceLabelEditor_renderBar, _GrowspaceLabelEditor_publish, _GrowspaceLabelEditor_icon, _GrowspaceLabelEditor_renderToolbar, _GrowspaceLabelEditor_discard;
/** The eight handles, in the order a reader goes round a rectangle. */
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
/** The six alignments and the two distributions, as the toolbar orders them. */
const ALIGNMENTS = ['left', 'center', 'right', 'top', 'middle', 'bottom'];
const DISTRIBUTIONS = ['horizontal', 'vertical'];
const ORDERINGS = ['front', 'forward', 'backward', 'back'];
/** The zoom steps, as multiples of "the stage fills its column". */
const ZOOM_STEPS = [1, 1.5, 2, 3, 4];
let GrowspaceLabelEditor = class GrowspaceLabelEditor extends i$1 {
    constructor() {
        super(...arguments);
        _GrowspaceLabelEditor_instances.add(this);
        this.language = 'en';
        this._workbench = 'canvas';
        this._zoom = 1;
        this._snapping = true;
        /**
         * Whether a plain tap on the canvas adds to the selection.
         *
         * The touch equal of holding Shift, and the accepted design's own answer:
         * a phone has no modifier key, and a finger that had to find a checkbox in
         * a panel behind the canvas could not build a selection while looking at
         * the label it is building one on.
         */
        this._multiSelect = false;
        /** The lines the current gesture is actually lying on, drawn over the stage. */
        this._guides = [];
        /** The last thing that happened, for a screen reader that saw none of it. */
        this._announcement = '';
        _GrowspaceLabelEditor_unsubscribe.set(this, void 0);
        _GrowspaceLabelEditor_gesture.set(this, null);
    }
    connectedCallback() {
        super.connectedCallback();
        __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_attach).call(this);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        __classPrivateFieldGet(this, _GrowspaceLabelEditor_unsubscribe, "f")?.call(this);
        __classPrivateFieldSet(this, _GrowspaceLabelEditor_unsubscribe, undefined, "f");
    }
    willUpdate(changed) {
        if (changed.has('session'))
            __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_attach).call(this);
    }
    _t(key) {
        return localize(`labels.${key}`, '', '', this.language);
    }
    render() {
        const model = this._model;
        if (!model || !this.capability)
            return E;
        return x `
      ${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_renderBar).call(this, model)} ${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_renderRefusal).call(this, model)}
      <div class="layout" @keydown=${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_onKeyDown)} tabindex="0">
        ${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_renderElements).call(this, model)}
        <section
          class="workspace"
          ?hidden-on-narrow=${this._workbench !== 'canvas'}
          aria-label=${this._t('editor_workspace')}
        >
          ${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_renderToolbar).call(this, model)} ${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_renderStage).call(this, model)} ${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_renderStanding).call(this, model)}
          <p class="supporting" data-role="keyboard-hint">${this._t('editor_keyboard_hint')}</p>
        </section>
        ${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_renderInspector).call(this, model)}
      </div>
      <p class="visually-hidden" role="status" aria-live="polite" data-role="announcement">
        ${this._announcement}
      </p>
      <nav class="tabs" aria-label=${this._t('editor_workbench')}>
        ${['canvas', 'elements', 'selection'].map((tab) => x `
            <button
              data-tab=${tab}
              aria-pressed=${this._workbench === tab}
              @click=${() => {
            this._workbench = tab;
        }}
            >
              ${this._t(`editor_tab_${tab}`)}
            </button>
          `)}
      </nav>
    `;
    }
};
_GrowspaceLabelEditor_unsubscribe = new WeakMap();
_GrowspaceLabelEditor_gesture = new WeakMap();
_GrowspaceLabelEditor_instances = new WeakSet();
_GrowspaceLabelEditor_attach = function _GrowspaceLabelEditor_attach() {
    __classPrivateFieldGet(this, _GrowspaceLabelEditor_unsubscribe, "f")?.call(this);
    const session = this.session;
    if (!session)
        return;
    this._model = session.state;
    __classPrivateFieldSet(this, _GrowspaceLabelEditor_unsubscribe, session.subscribe((state) => {
        this._model = state;
    }), "f");
    if (session.state.selectedIds.length === 0) {
        session.select(defaultSelection(session.state.document));
    }
};
_GrowspaceLabelEditor_stock_get = function _GrowspaceLabelEditor_stock_get() {
    const size = this.capability?.catalogues.label_sizes.find((candidate) => candidate.id === this.session?.address.labelSizeId);
    return { widthMm: size?.width_mm ?? 1, heightMm: size?.height_mm ?? 1 };
};
_GrowspaceLabelEditor_profile_get = function _GrowspaceLabelEditor_profile_get() {
    return governingProfile(this.capability, this.session?.address.labelSizeId ?? '');
};
_GrowspaceLabelEditor_announce = function _GrowspaceLabelEditor_announce(message) {
    this._announcement = message;
};
_GrowspaceLabelEditor_mintId = function _GrowspaceLabelEditor_mintId() {
    const random = globalThis.crypto;
    return typeof random?.randomUUID === 'function'
        ? random.randomUUID()
        : `element-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};
_GrowspaceLabelEditor_settled = function _GrowspaceLabelEditor_settled() {
    this.session?.endGesture();
    void this.session?.render();
};
_GrowspaceLabelEditor_onPointerDown = function _GrowspaceLabelEditor_onPointerDown(event, elementId, handle) {
    const session = this.session;
    // The model, because it is what the frames on screen were drawn from: a
    // gesture must start from the geometry the user is pointing at, not from
    // a session state that has moved on since the last render.
    const document = this._model?.document;
    if (!session || !document)
        return;
    event.preventDefault();
    event.stopPropagation();
    const extend = event.shiftKey || event.metaKey || event.ctrlKey || this._multiSelect;
    if (extend) {
        session.toggleSelected(elementId);
        __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_announceSelection).call(this);
        return;
    }
    if (!session.state.selectedIds.includes(elementId))
        session.select(elementId);
    const moving = handle === null ? session.state.selectedIds : [elementId];
    const startFrames = new Map();
    for (const id of moving) {
        const frame = elementById(document, id)?.frame;
        if (frame !== undefined)
            startFrames.set(id, frame);
    }
    if (startFrames.size === 0)
        return;
    try {
        event.target.setPointerCapture(event.pointerId);
    }
    catch {
        // A pointer that is no longer active refuses capture, and so does a
        // synthetic one. Neither is a reason to abandon the gesture: without
        // capture the drag simply ends when the pointer leaves the element,
        // which is the behaviour capture exists to improve on, not to enable.
    }
    __classPrivateFieldSet(this, _GrowspaceLabelEditor_gesture, {
        pointerId: event.pointerId,
        handle,
        originX: event.clientX,
        originY: event.clientY,
        startFrames,
        anchorId: elementId,
        key: `${handle ?? 'move'}:${event.pointerId}:${Date.now()}`,
    }, "f");
};
_GrowspaceLabelEditor_onPointerMove = function _GrowspaceLabelEditor_onPointerMove(event) {
    const gesture = __classPrivateFieldGet(this, _GrowspaceLabelEditor_gesture, "f");
    const session = this.session;
    const model = this._model;
    if (!gesture || !session || !model || gesture.pointerId !== event.pointerId)
        return;
    const stage = this.renderRoot.querySelector('.stage');
    if (!stage)
        return;
    // The measured box, every move: a zoom or a resize mid-drag changes it,
    // and reading it once at pointerdown would silently scale the rest.
    const rect = stage.getBoundingClientRect();
    const stock = __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "a", _GrowspaceLabelEditor_stock_get);
    const quantum = session.quantumMm;
    const { deltaXMm, deltaYMm } = pixelsToMm(event.clientX - gesture.originX, event.clientY - gesture.originY, rect, stock);
    if (gesture.handle !== null) {
        const start = gesture.startFrames.get(gesture.anchorId);
        const resized = resizeFrame(start, gesture.handle, deltaXMm, deltaYMm, stock, quantum);
        session.moveElement(gesture.anchorId, resized, gesture.key);
        return;
    }
    // Snap the element under the pointer, then move everything by the delta
    // the snap actually produced — so a multiple selection keeps its internal
    // spacing exactly while still landing on the guide.
    const anchorStart = gesture.startFrames.get(gesture.anchorId);
    const anchorMoved = translateFrame(anchorStart, deltaXMm, deltaYMm, stock, quantum);
    let appliedX = anchorMoved.x_mm - anchorStart.x_mm;
    let appliedY = anchorMoved.y_mm - anchorStart.y_mm;
    let guides = [];
    if (this._snapping) {
        const lines = snapLines(model.document, stock, [...gesture.startFrames.keys()]);
        const snapped = snapFrame(anchorMoved, lines, undefined, quantum);
        appliedX = snapped.frame.x_mm - anchorStart.x_mm;
        appliedY = snapped.frame.y_mm - anchorStart.y_mm;
        guides = snapped.guides;
    }
    const frames = new Map();
    for (const [id, start] of gesture.startFrames) {
        frames.set(id, translateFrame(start, appliedX, appliedY, stock, quantum));
    }
    this._guides = guides;
    session.apply(withFrames(model.document, frames), gesture.key);
};
_GrowspaceLabelEditor_onPointerUp = function _GrowspaceLabelEditor_onPointerUp(event) {
    if (__classPrivateFieldGet(this, _GrowspaceLabelEditor_gesture, "f")?.pointerId !== event.pointerId)
        return;
    __classPrivateFieldSet(this, _GrowspaceLabelEditor_gesture, null, "f");
    this._guides = [];
    __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_settled).call(this);
};
_GrowspaceLabelEditor_announceSelection = function _GrowspaceLabelEditor_announceSelection() {
    const ids = this.session?.state.selectedIds ?? [];
    __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_announce).call(this, localizeWithParams('labels.editor_announce_selection', { count: String(ids.length) }, this.language));
};
_GrowspaceLabelEditor_selectAll = function _GrowspaceLabelEditor_selectAll() {
    const session = this.session;
    if (!session)
        return;
    session.selectMany(session.state.document.elements.map((element) => element.id));
    __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_announceSelection).call(this);
};
_GrowspaceLabelEditor_nudgeSelection = function _GrowspaceLabelEditor_nudgeSelection(deltaXMm, deltaYMm) {
    const session = this.session;
    const model = this._model;
    if (!session || !model || model.selectedIds.length === 0)
        return;
    const stock = __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "a", _GrowspaceLabelEditor_stock_get);
    const frames = new Map();
    for (const id of model.selectedIds) {
        const frame = elementById(model.document, id)?.frame;
        if (frame === undefined)
            continue;
        frames.set(id, translateFrame(frame, deltaXMm, deltaYMm, stock, session.quantumMm));
    }
    session.apply(withFrames(model.document, frames));
    __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_settled).call(this);
    __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_announce).call(this, localizeWithParams('labels.editor_announce_moved', { x: String(deltaXMm), y: String(deltaYMm) }, this.language));
};
_GrowspaceLabelEditor_align = function _GrowspaceLabelEditor_align(alignment) {
    const session = this.session;
    const model = this._model;
    if (!session || !model)
        return;
    session.apply(align(model.document, model.selectedIds, alignment, __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "a", _GrowspaceLabelEditor_stock_get), session.quantumMm));
    __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_settled).call(this);
    __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_announce).call(this, this._t(`editor_align_${alignment}`));
};
_GrowspaceLabelEditor_distribute = function _GrowspaceLabelEditor_distribute(axis) {
    const session = this.session;
    const model = this._model;
    if (!session || !model)
        return;
    session.apply(distribute(model.document, model.selectedIds, axis, __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "a", _GrowspaceLabelEditor_stock_get), session.quantumMm));
    __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_settled).call(this);
    __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_announce).call(this, this._t(`editor_distribute_${axis}`));
};
_GrowspaceLabelEditor_reorder = function _GrowspaceLabelEditor_reorder(ordering) {
    const session = this.session;
    const model = this._model;
    if (!session || !model)
        return;
    session.apply(reorder(model.document, model.selectedIds, ordering));
    __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_settled).call(this);
    __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_announce).call(this, this._t(`editor_order_${ordering}`));
};
_GrowspaceLabelEditor_duplicate = function _GrowspaceLabelEditor_duplicate() {
    const session = this.session;
    const model = this._model;
    if (!session || !model || model.selectedIds.length === 0)
        return;
    const copied = duplicate(model.document, model.selectedIds, () => __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_mintId).call(this), __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "a", _GrowspaceLabelEditor_stock_get), session.quantumMm);
    session.apply(copied.document, null, copied.ids);
    __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_settled).call(this);
    __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_announce).call(this, localizeWithParams('labels.editor_announce_duplicated', { count: String(copied.ids.length) }, this.language));
};
_GrowspaceLabelEditor_delete = function _GrowspaceLabelEditor_delete() {
    const session = this.session;
    const model = this._model;
    if (!session || !model || model.selectedIds.length === 0)
        return;
    // Deleting the required element is allowed, and the backend's own
    // publication check is what says the layout is no longer publishable --
    // one place, not two. What this adds is the warning *before* rather than
    // the refusal after, since undo is the only way back and a user who did
    // not mean it should not have to discover it at publish time.
    const dropping = wouldDropRequired(model.document, model.selectedIds);
    session.apply(removeElements(model.document, model.selectedIds), null, []);
    __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_settled).call(this);
    __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_announce).call(this, dropping
        ? this._t('editor_announce_deleted_required')
        : localizeWithParams('labels.editor_announce_deleted', { count: String(model.selectedIds.length) }, this.language));
};
_GrowspaceLabelEditor_addElement = function _GrowspaceLabelEditor_addElement(kind) {
    const session = this.session;
    const model = this._model;
    if (!session || !model)
        return;
    const element = newElement({
        capability: this.capability,
        profile: __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "a", _GrowspaceLabelEditor_profile_get),
        kind,
        stock: __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "a", _GrowspaceLabelEditor_stock_get),
        id: __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_mintId).call(this),
        placeholder: this._t('editor_content_placeholder'),
    });
    if (element === null) {
        __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_announce).call(this, localizeWithParams('labels.editor_announce_no_binding', { kind: this._t(`editor_kind_${kind}`) }, this.language));
        return;
    }
    session.apply(addElement(model.document, element), null, [element.id]);
    __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_settled).call(this);
    __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_announce).call(this, localizeWithParams('labels.editor_announce_added', { kind: this._t(`editor_kind_${kind}`) }, this.language));
};
_GrowspaceLabelEditor_reset = function _GrowspaceLabelEditor_reset() {
    this.session?.reset();
    __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_settled).call(this);
    __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_announce).call(this, this._t('editor_announce_reset'));
};
_GrowspaceLabelEditor_onElementChange = function _GrowspaceLabelEditor_onElementChange(event) {
    const session = this.session;
    const model = this._model;
    if (!session || !model)
        return;
    session.apply(withElement(model.document, event.detail.element), event.detail.gesture);
    __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_settled).call(this);
};
_GrowspaceLabelEditor_zoomBy = function _GrowspaceLabelEditor_zoomBy(step) {
    const index = ZOOM_STEPS.indexOf(this._zoom);
    const next = ZOOM_STEPS[Math.min(Math.max((index < 0 ? 0 : index) + step, 0), ZOOM_STEPS.length - 1)];
    this._zoom = next;
    __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_announce).call(this, localizeWithParams('labels.editor_announce_zoom', { percent: String(Math.round(next * 100)) }, this.language));
};
_GrowspaceLabelEditor_onKeyDown = function _GrowspaceLabelEditor_onKeyDown(event) {
    const session = this.session;
    const model = this._model;
    if (!session || !model)
        return;
    const accel = event.ctrlKey || event.metaKey;
    if (accel) {
        const key = event.key.toLowerCase();
        if (key === 'z') {
            event.preventDefault();
            if (event.shiftKey)
                session.redo();
            else
                session.undo();
            void session.render();
            __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_announce).call(this, this._t(event.shiftKey ? 'editor_redo' : 'editor_undo'));
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
            __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_duplicate).call(this);
            return;
        }
        if (key === 'a') {
            event.preventDefault();
            __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_selectAll).call(this);
            return;
        }
    }
    if (event.key === 'Escape') {
        event.preventDefault();
        session.select(null);
        __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_announceSelection).call(this);
        return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
        // Not while a field has focus: Backspace in a number input deletes a
        // digit, and stealing it would make the exact controls unusable.
        if (isTextEntry(event.composedPath()[0]))
            return;
        event.preventDefault();
        __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_delete).call(this);
        return;
    }
    if (event.key === '[' || event.key === ']') {
        event.preventDefault();
        __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_reorder).call(this, event.key === ']' ? 'forward' : 'backward');
        return;
    }
    const step = event.shiftKey ? COARSE_NUDGE_MM : NUDGE_MM;
    const deltas = {
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
    };
    const delta = deltas[event.key];
    if (!delta || model.selectedIds.length === 0)
        return;
    if (isTextEntry(event.composedPath()[0]))
        return;
    event.preventDefault();
    __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_nudgeSelection).call(this, delta[0], delta[1]);
};
_GrowspaceLabelEditor_renderStage = function _GrowspaceLabelEditor_renderStage(model) {
    const stock = __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "a", _GrowspaceLabelEditor_stock_get);
    const raster = model.render?.raster ?? null;
    return x `
      <div class="stage-scroll">
        <div class="stage-wrap" style=${o({ width: `${this._zoom * 100}%` })}>
          <div
            class="stage"
            role="group"
            aria-label=${this._t('editor_canvas')}
            style=${o({ aspectRatio: `${stock.widthMm} / ${stock.heightMm}` })}
            @pointermove=${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_onPointerMove)}
            @pointerup=${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_onPointerUp)}
            @pointercancel=${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_onPointerUp)}
          >
            ${raster
        ? x `<img
                  src=${raster.image}
                  alt=${this._t('editor_raster_alt')}
                  data-standing=${model.rasterStanding}
                />`
        : E}
            ${model.document.elements.map((element) => __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_renderElement).call(this, element, model))}
            ${this._guides.map((guide) => __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_renderGuide).call(this, guide, stock))}
          </div>
        </div>
      </div>
    `;
};
_GrowspaceLabelEditor_renderGuide = function _GrowspaceLabelEditor_renderGuide(guide, stock) {
    const total = guide.axis === 'x' ? stock.widthMm : stock.heightMm;
    const offset = `${total > 0 ? (guide.valueMm / total) * 100 : 0}%`;
    return x `<div
      class="guide"
      data-axis=${guide.axis}
      data-source=${guide.source}
      style=${o(guide.axis === 'x' ? { left: offset } : { top: offset })}
    ></div>`;
};
_GrowspaceLabelEditor_renderElement = function _GrowspaceLabelEditor_renderElement(element, model) {
    const selected = model.selectedIds.includes(element.id);
    const only = selected && model.selectedIds.length === 1;
    return x `
      <button
        class="element"
        data-element=${element.id}
        data-kind=${element.kind}
        data-required=${isRequiredElement(element)}
        aria-pressed=${selected}
        aria-label=${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_elementName).call(this, element)}
        style=${o(frameAsPercentages(element.frame, __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "a", _GrowspaceLabelEditor_stock_get)))}
        @pointerdown=${(event) => __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_onPointerDown).call(this, event, element.id, null)}
      >
        ${only ? HANDLES.map((handle) => __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_renderHandle).call(this, element, handle)) : E}
      </button>
    `;
};
_GrowspaceLabelEditor_renderHandle = function _GrowspaceLabelEditor_renderHandle(element, handle) {
    const left = handle.includes('w') ? '0%' : handle.includes('e') ? '100%' : '50%';
    const top = handle.includes('n') ? '0%' : handle.includes('s') ? '100%' : '50%';
    return x `
      <button
        class="handle"
        data-handle=${handle}
        aria-label=${localizeWithParams('labels.editor_handle', { handle: this._t(`editor_handle_${handle}`) }, this.language)}
        style=${o({ left, top })}
        @pointerdown=${(event) => __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_onPointerDown).call(this, event, element.id, handle)}
      ></button>
    `;
};
_GrowspaceLabelEditor_elementName = function _GrowspaceLabelEditor_elementName(element) {
    const kind = this._t(`editor_kind_${element.kind}`);
    if (element.kind === 'divider')
        return kind;
    const content = element.content;
    if ('literal' in content)
        return `${kind}: “${content.literal}”`;
    if ('asset_id' in content)
        return `${kind}: ${content.asset_id}`;
    const binding = localize(`labels.binding_${content.binding.replace(/\./g, '_')}`, '', '', this.language);
    return `${kind}: ${binding.startsWith('labels.') ? content.binding : binding}`;
};
_GrowspaceLabelEditor_renderElements = function _GrowspaceLabelEditor_renderElements(model) {
    return x `
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
        __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_announce).call(this, this._t(this._multiSelect ? 'editor_multi_select_on' : 'editor_multi_select_off'));
    }}
        >
          ${this._t('editor_multi_select')}
        </button>
        <div class="toolbar" role="group" aria-label=${this._t('editor_add')}>
          ${ELEMENT_KINDS.map((kind) => x `
              <button type="button" data-add=${kind} @click=${() => __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_addElement).call(this, kind)}>
                + ${this._t(`editor_kind_${kind}`)}
              </button>
            `)}
        </div>
        <ul class="elements">
          ${model.document.elements.map((element) => {
        const selected = model.selectedIds.includes(element.id);
        return x `
              <li>
                <label class="pick">
                  <input
                    type="checkbox"
                    id=${`pick-${element.id}`}
                    data-pick=${element.id}
                    .checked=${selected}
                    aria-label=${localizeWithParams('labels.editor_also_select', { name: __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_elementName).call(this, element) }, this.language)}
                    @change=${() => {
            this.session?.toggleSelected(element.id);
            __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_announceSelection).call(this);
        }}
                  />
                </label>
                <button
                  class="row"
                  data-list-element=${element.id}
                  aria-pressed=${selected}
                  @click=${() => this.session?.select(element.id)}
                >
                  ${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_elementName).call(this, element)}
                  ${isRequiredElement(element)
            ? x `<span class="required" data-role="required">
                        · ${this._t('editor_required')}
                      </span>`
            : E}
                </button>
              </li>
            `;
    })}
        </ul>
      </aside>
    `;
};
_GrowspaceLabelEditor_renderInspector = function _GrowspaceLabelEditor_renderInspector(model) {
    const element = elementById(model.document, model.selectedId);
    return x `
      <aside
        ?hidden-on-narrow=${this._workbench !== 'selection'}
        aria-label=${this._t('editor_selection')}
      >
        <h2>${this._t('editor_selection')}</h2>
        <growspace-label-inspector
          .capability=${this.capability}
          .profile=${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "a", _GrowspaceLabelEditor_profile_get)}
          .element=${element}
          .stock=${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "a", _GrowspaceLabelEditor_stock_get)}
          .quantumMm=${this.session?.quantumMm ?? 0.01}
          .selectionSize=${model.selectedIds.length}
          .language=${this.language}
          @element-change=${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_onElementChange)}
        ></growspace-label-inspector>
        ${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_renderDiagnostics).call(this, model)}
      </aside>
    `;
};
_GrowspaceLabelEditor_renderDiagnostics = function _GrowspaceLabelEditor_renderDiagnostics(model) {
    const diagnostics = model.validation?.diagnostics ?? [];
    if (diagnostics.length === 0)
        return E;
    return x `
      <h3>${this._t('editor_diagnostics')}</h3>
      <ul class="diagnostics" data-role="diagnostics">
        ${diagnostics.map((item) => x `
            <li>
              <button data-diagnostic=${item.code} @click=${() => __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_selectFor).call(this, item.element_id)}>
                ${item.message}
              </button>
            </li>
          `)}
      </ul>
    `;
};
_GrowspaceLabelEditor_selectFor = function _GrowspaceLabelEditor_selectFor(elementId) {
    if (elementId !== null)
        this.session?.select(elementId);
};
_GrowspaceLabelEditor_renderStanding = function _GrowspaceLabelEditor_renderStanding(model) {
    const failed = model.render !== null && model.render.raster === null;
    const key = failed
        ? 'editor_raster_failed'
        : model.rasterStanding === 'settled'
            ? 'editor_raster_settled'
            : model.rasterStanding === 'stale'
                ? 'editor_raster_stale'
                : 'editor_raster_absent';
    const blocking = (model.render?.diagnostics ?? []).filter((item) => item.severity === 'error' || item.code.endsWith('render_failed'));
    return x `
      <p class="supporting" data-role="standing" data-standing=${model.rasterStanding}>
        ${this._t(key)}
      </p>
      ${failed && blocking.length > 0
        ? x `<ul class="diagnostics" data-role="render-diagnostics">
            ${blocking.map((item) => x `<li><code>${item.code}</code> ${item.message}</li>`)}
          </ul>`
        : E}
    `;
};
_GrowspaceLabelEditor_renderRefusal = function _GrowspaceLabelEditor_renderRefusal(model) {
    const refusal = model.refusal;
    if (refusal === null)
        return E;
    // Only the recoveries this editor can actually perform are offered. A verb
    // it does not recognise leaves the reason and the dismissal, which is an
    // honest answer rather than a button that does nothing.
    const reloadable = refusal.recovery === 'reload_draft';
    return x `
      <div class="refusal" role="alert" data-code=${refusal.code}>
        <p>${refusal.reason}</p>
        ${reloadable
        ? x `<button data-action="reload" @click=${() => void this.session?.reload()}>
              ${this._t('editor_reload')}
            </button>`
        : E}
        <button data-action="dismiss" @click=${() => this.session?.acknowledge()}>
          ${this._t('editor_dismiss')}
        </button>
      </div>
    `;
};
_GrowspaceLabelEditor_renderBar = function _GrowspaceLabelEditor_renderBar(model) {
    const blocked = publishBlockedBy(model);
    const untitled = model.draft?.template_id === null;
    return x `
      <header class="bar">
        <button
          data-action="back"
          aria-label=${this._t('editor_back')}
          @click=${() => this.dispatchEvent(new CustomEvent('close-editor'))}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d=${mdiArrowLeft}></path></svg>
        </button>
        ${untitled
        ? x `<div class="name">
              <input
                type="text"
                data-field="name"
                aria-label=${this._t('editor_name')}
                placeholder=${this._t('editor_name')}
                .value=${model.name}
                @input=${(event) => this.session?.setName(event.target.value)}
              />
            </div>`
        : x `<span class="name">${model.draft?.name ?? ''}</span>`}
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
          @click=${() => void __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_publish).call(this)}
        >
          ${this._t('editor_publish')}
        </button>
      </header>
      ${blocked === null
        ? E
        : x `<p class="supporting" data-role="blocked" data-blocked=${blocked}>
            ${this._t(`editor_blocked_${blocked}`)}
          </p>`}
    `;
};
_GrowspaceLabelEditor_publish = async function _GrowspaceLabelEditor_publish() {
    const published = await this.session?.publish();
    if (published) {
        this.dispatchEvent(new CustomEvent('published', { detail: published }));
    }
};
_GrowspaceLabelEditor_icon = function _GrowspaceLabelEditor_icon(action, labelKey, path, onClick, disabled = false) {
    return x `
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
};
_GrowspaceLabelEditor_renderToolbar = function _GrowspaceLabelEditor_renderToolbar(model) {
    const selection = model.selectedIds.length;
    return x `
      <div class="toolbar" role="toolbar" aria-label=${this._t('editor_toolbar')}>
        ${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_icon).call(this, 'undo', 'editor_undo', mdiUndo, () => {
        this.session?.undo();
        void this.session?.render();
    }, !model.canUndo)}
        ${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_icon).call(this, 'redo', 'editor_redo', mdiRedo, () => {
        this.session?.redo();
        void this.session?.render();
    }, !model.canRedo)}
        ${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_icon).call(this, 'duplicate', 'editor_duplicate', mdiContentCopy, () => __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_duplicate).call(this), selection === 0)}
        ${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_icon).call(this, 'delete', 'editor_delete', mdiDelete, () => __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_delete).call(this), selection === 0)}
        ${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_icon).call(this, 'reset', 'editor_reset', mdiRestore, () => __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_reset).call(this), this.session?.isReset ?? true)}
        <span class="spacer"></span>
        ${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_icon).call(this, 'save', 'editor_save_now', mdiContentSaveOutline, () => void this.session?.save())}
        ${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_icon).call(this, 'rerender', 'editor_rerender', mdiRefresh, () => void this.session?.render(), model.rendering)}
        <!-- Spelled out rather than drawn. Discarding throws the whole draft
             away and deleting removes the selected elements, and the two
             trash cans this toolbar would otherwise carry are the same
             picture for two very different losses. -->
        <button
          type="button"
          data-action="discard"
          aria-label=${this._t('editor_discard')}
          title=${this._t('editor_discard')}
          @click=${() => void __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_discard).call(this)}
        >
          ${this._t('editor_discard_short')}
        </button>
      </div>
      <div class="toolbar" role="toolbar" aria-label=${this._t('editor_arrange')}>
        <div role="group" aria-label=${this._t('editor_align')} class="toolbar">
          ${ALIGNMENTS.map((alignment) => x `
              <button
                type="button"
                data-align=${alignment}
                aria-label=${this._t(`editor_align_${alignment}`)}
                title=${this._t(`editor_align_${alignment}`)}
                ?disabled=${selection === 0}
                @click=${() => __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_align).call(this, alignment)}
              >
                ${this._t(`editor_align_${alignment}_short`)}
              </button>
            `)}
        </div>
        <div role="group" aria-label=${this._t('editor_distribute')} class="toolbar">
          ${DISTRIBUTIONS.map((axis) => x `
              <button
                type="button"
                data-distribute=${axis}
                aria-label=${this._t(`editor_distribute_${axis}`)}
                title=${this._t(`editor_distribute_${axis}`)}
                ?disabled=${selection < 3}
                @click=${() => __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_distribute).call(this, axis)}
              >
                ${this._t(`editor_distribute_${axis}_short`)}
              </button>
            `)}
        </div>
        <div role="group" aria-label=${this._t('editor_order')} class="toolbar">
          ${ORDERINGS.map((ordering) => x `
              <button
                type="button"
                data-order=${ordering}
                aria-label=${this._t(`editor_order_${ordering}`)}
                title=${this._t(`editor_order_${ordering}`)}
                ?disabled=${selection === 0}
                @click=${() => __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_reorder).call(this, ordering)}
              >
                ${this._t(`editor_order_${ordering}_short`)}
              </button>
            `)}
        </div>
      </div>
      <div class="toolbar" role="toolbar" aria-label=${this._t('editor_view')}>
        ${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_icon).call(this, 'zoom-out', 'editor_zoom_out', mdiMagnifyMinusOutline, () => __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_zoomBy).call(this, -1), this._zoom === ZOOM_STEPS[0])}
        <span class="zoom-level" data-role="zoom">${Math.round(this._zoom * 100)}%</span>
        ${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_icon).call(this, 'zoom-in', 'editor_zoom_in', mdiMagnifyPlusOutline, () => __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_zoomBy).call(this, 1), this._zoom === ZOOM_STEPS[ZOOM_STEPS.length - 1])}
        ${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_icon).call(this, 'zoom-fit', 'editor_zoom_fit', mdiMagnifyScan, () => {
        this._zoom = ZOOM_STEPS[0];
        __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_announce).call(this, this._t('editor_zoom_fit'));
    })}
        <button
          type="button"
          data-action="snap"
          aria-pressed=${this._snapping}
          @click=${() => {
        this._snapping = !this._snapping;
        __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_announce).call(this, this._t(this._snapping ? 'editor_snap_on' : 'editor_snap_off'));
    }}
        >
          ${this._t('editor_snap')}
        </button>
        <button type="button" data-action="select-all" @click=${() => __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_selectAll).call(this)}>
          ${this._t('editor_select_all')}
        </button>
      </div>
    `;
};
_GrowspaceLabelEditor_discard = async function _GrowspaceLabelEditor_discard() {
    const discarded = await this.session?.discard();
    if (discarded)
        this.dispatchEvent(new CustomEvent('discarded', { detail: discarded }));
};
GrowspaceLabelEditor.styles = [
    variables,
    i `
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

      button[aria-pressed='true'] {
        border-color: var(--primary-color, #4caf50);
        color: var(--primary-color, #4caf50);
        text-decoration: underline;
        text-underline-offset: 3px;
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

      .handle {
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
        opacity: 0.85;
      }

      ul.diagnostics {
        font-size: var(--font-size-xs, 11px);
        line-height: 1.5;
        opacity: 0.9;
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
__decorate([
    n({ attribute: false })
], GrowspaceLabelEditor.prototype, "capability", void 0);
__decorate([
    n({ attribute: false })
], GrowspaceLabelEditor.prototype, "session", void 0);
__decorate([
    n({ type: String })
], GrowspaceLabelEditor.prototype, "language", void 0);
__decorate([
    r()
], GrowspaceLabelEditor.prototype, "_model", void 0);
__decorate([
    r()
], GrowspaceLabelEditor.prototype, "_workbench", void 0);
__decorate([
    r()
], GrowspaceLabelEditor.prototype, "_zoom", void 0);
__decorate([
    r()
], GrowspaceLabelEditor.prototype, "_snapping", void 0);
__decorate([
    r()
], GrowspaceLabelEditor.prototype, "_multiSelect", void 0);
__decorate([
    r()
], GrowspaceLabelEditor.prototype, "_guides", void 0);
__decorate([
    r()
], GrowspaceLabelEditor.prototype, "_announcement", void 0);
GrowspaceLabelEditor = __decorate([
    t('growspace-label-editor')
], GrowspaceLabelEditor);
/** Whether a key event landed in something that eats printable keys itself. */
function isTextEntry(target) {
    if (!(target instanceof HTMLElement))
        return false;
    return (target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable);
}

/** Administrator library wire. Recovery documents are opaque and never resaved. */
const Reference = object({ kind: string(), id: string() });
const Revision = object({
    revision: number(),
    name: string(),
    digest: string(),
    published_at: string(),
    published_by: string().nullable(),
    operation: string(),
    parent_revision: number().nullable(),
    provenance: ProvenanceSchema,
});
const Template = object({
    id: string(),
    kind: string(),
    name: string(),
    label_size_id: string(),
    head_revision: number(),
    created_at: string(),
    created_by: string().nullable(),
    revisions: array(Revision),
});
const RecoveryDraft = TemplateDraftSchema.omit({ document: true }).extend({
    document: unknown(),
    stale: boolean(),
    orphaned: boolean(),
    head_revision: number().nullable(),
});
const ManagementLibrarySchema = object({
    entry_id: string(),
    generation: number().nullable(),
    store: object({
        readable: boolean(),
        version: number(),
        found_version: number().optional(),
    }),
    factory_templates: array(object({
        id: string(),
        kind: string(),
        label_size_id: string(),
        name: string(),
        revision: number(),
        valid: boolean(),
    })),
    templates: array(Template.extend({
        quarantined: boolean(),
        quarantine: object({
            template_id: string(),
            revision: number(),
            diagnostics: PublicationCheckSchema.shape.diagnostics,
        })
            .nullable(),
    })),
    drafts: array(RecoveryDraft),
    defaults: record(string(), Reference),
    effective_defaults: record(string(), object({
        ref: Reference,
        label_size_id: string(),
        layout_digest: string(),
        revision: number(),
        name: string(),
        via: string(),
    })
        .nullable()),
    tombstones: array(object({
        template: Template,
        deleted_at: string(),
        deleted_by: string(),
        expires_at: string(),
        was_default: boolean(),
    })),
});
const InspectionSchema = object({
    id: string(),
    label_size_id: string(),
    created_at: string(),
    created_by: string().nullable(),
    revisions: array(Revision.extend({ document: unknown() })),
});
const PreflightSchema = object({
    generation: number(),
    ready: boolean(),
    entries: array(object({ id: string(), name: string(), label_size_id: string() })),
    issues: array(object({ template_id: string(), code: string(), reason: string() })),
});
const Answer = discriminatedUnion('outcome', [
    object({
        outcome: literal('ok'),
        contract: LabelContractIdentitySchema,
        library: ManagementLibrarySchema,
        result: unknown(),
    }),
    object({ outcome: literal('refused'), refusal: LabelRefusalSchema }),
]);
/** The caller retains the key after a transport failure and retries identical input. */
async function manageTemplates(operation, payload = {}, mutation) {
    const contract = negotiatedContract();
    if (!contract)
        throw new Error('The Label Template capability has not been negotiated');
    const answer = await hassCall('growspace_manager/manage_label_templates', {
        contract,
        operation,
        payload,
        ...(mutation
            ? { expected_generation: mutation.generation, idempotency_key: mutation.key }
            : {}),
    }, Answer);
    if (answer.outcome === 'refused' && answer.refusal.code === CONTRACT_INCOMPATIBLE)
        await recoverFromContractRefusal(answer.refusal);
    return answer;
}
/** Events invalidate; snapshots explain. Reconnect always invalidates, even without a gap. */
async function watchTemplateLibrary(refresh) {
    const connection = getHass()?.connection;
    if (!connection)
        return () => { };
    connection.addEventListener('ready', refresh);
    try {
        const stop = await connection.subscribeEvents(refresh, 'growspace_manager_label_template_library_changed');
        refresh(); // Close the snapshot/subscribe race.
        return () => {
            stop();
            connection.removeEventListener('ready', refresh);
        };
    }
    catch (error) {
        connection.removeEventListener('ready', refresh);
        throw error;
    }
}
function downloadTemplateData(value, filename) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

let GrowspaceTemplateLibrary = class GrowspaceTemplateLibrary extends i$1 {
    constructor() {
        super(...arguments);
        this.labelSizeId = '';
        this.language = 'en';
        this.session = null;
        this.library = null;
        this.failure = '';
        this.busy = false;
        this.action = null;
        this.inspection = null;
        this.recovery = null;
        this.preflight = null;
        this.bundle = null;
        this.copies = [];
        this.names = {};
        this.reading = 0;
    }
    t(key) {
        return localize(`labels.library_${key}`, '', '', this.language);
    }
    connectedCallback() {
        super.connectedCallback();
        void this.refresh();
        void watchTemplateLibrary(() => void this.refresh())
            .then((stop) => {
            if (this.isConnected)
                this.stop = stop;
            else
                stop();
        })
            .catch((error) => {
            this.failure = String(error);
        });
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this.stop?.();
        this.reading++;
    }
    updated(changed) {
        if (changed.has('session') && this.library && this.session) {
            this.session.observeLibrary(this.library);
        }
    }
    async refresh() {
        const read = ++this.reading;
        try {
            const answer = await manageTemplates('snapshot');
            if (read !== this.reading || !this.isConnected)
                return;
            if (answer.outcome === 'refused') {
                this.failure = answer.refusal.reason;
                this.session?.refuse(answer.refusal);
                return;
            }
            this.library = answer.library;
            this.session?.observeLibrary(answer.library);
        }
        catch (error) {
            if (read === this.reading)
                this.failure = String(error);
        }
    }
    button(label, run, disabled = false) {
        return x `<button
      type="button"
      data-action=${label}
      ?disabled=${this.busy || disabled}
      @click=${run}
    >
      ${this.t(label)}
    </button>`;
    }
    stage(operation, payload, name) {
        if (this.library?.generation == null)
            return;
        const storedDraft = this.library.drafts.find((draft) => payload.template_id
            ? draft.template_id === payload.template_id
            : draft.label_size_id === payload.label_size_id && draft.template_id === null);
        if (['reload', 'replace_factory', 'discard', 'save_as'].includes(operation) && storedDraft)
            payload = { ...payload, expected_draft_version: storedDraft.version };
        if (operation === 'save_as' && this.session) {
            payload = { ...payload, recovery_document: structuredClone(this.session.state.document) };
        }
        this.action = {
            operation,
            payload,
            name,
            generation: this.library.generation,
            key: crypto.randomUUID(),
        };
        this.failure = '';
    }
    async commit() {
        const action = this.action;
        if (!action || this.busy)
            return;
        this.busy = true;
        try {
            const answer = await manageTemplates(action.operation, { ...action.payload, ...(action.name !== undefined ? { name: action.name } : {}) }, { generation: action.generation, key: action.key });
            if (answer.outcome === 'refused') {
                this.failure = answer.refusal.reason;
                this.action = null;
                await this.refresh();
                return;
            }
            this.library = answer.library;
            if (this.session &&
                (action.operation === 'reload' || action.operation === 'replace_factory')) {
                const draft = TemplateDraftSchema.parse(answer.result);
                if (action.operation === 'replace_factory')
                    this.session.replaceFromFactory(draft);
                else
                    this.session.adopt(draft, null);
            }
            if (action.operation === 'save_as') {
                const result = object({ template: object({ id: string(), label_size_id: string() }) })
                    .parse(answer.result);
                this.dispatchEvent(new CustomEvent('open-template', {
                    detail: { templateId: result.template.id, labelSizeId: result.template.label_size_id },
                    bubbles: true,
                    composed: true,
                }));
            }
            if (action.operation === 'discard' && this.session)
                this.dispatchEvent(new CustomEvent('close-editor', { bubbles: true, composed: true }));
            this.session?.observeLibrary(answer.library);
            this.action = null;
            this.inspection = null;
            this.recovery = null;
            if (action.operation === 'import') {
                this.bundle = null;
                this.preflight = null;
            }
            this.failure = '';
        }
        catch (error) {
            this.failure = `${this.t('retry_same')} ${String(error)}`;
        }
        finally {
            this.busy = false;
        }
    }
    async read(operation, payload) {
        this.busy = true;
        try {
            const answer = await manageTemplates(operation, payload);
            if (answer.outcome === 'refused') {
                this.failure = answer.refusal.reason;
                return;
            }
            this.library = answer.library;
            if (operation === 'inspect')
                this.inspection = InspectionSchema.parse(answer.result);
            else
                downloadTemplateData(answer.result, 'label-templates.json');
        }
        catch (error) {
            this.failure = String(error);
        }
        finally {
            this.busy = false;
        }
    }
    async checkImport() {
        this.busy = true;
        this.preflight = null;
        try {
            const answer = await manageTemplates('preflight', {
                bundle: this.bundle,
                as_copy: this.copies,
                names: this.names,
            });
            if (answer.outcome === 'refused') {
                this.failure = answer.refusal.reason;
                return;
            }
            this.library = answer.library;
            this.preflight = PreflightSchema.parse(answer.result);
            this.failure = '';
        }
        catch (error) {
            this.failure = String(error);
        }
        finally {
            this.busy = false;
        }
    }
    async upload(event) {
        const file = event.target.files?.[0];
        if (!file)
            return;
        this.preflight = null;
        this.copies = [];
        this.names = {};
        this.action = null;
        try {
            this.bundle = JSON.parse(await file.text());
            await this.checkImport();
        }
        catch (error) {
            this.bundle = null;
            this.failure = String(error);
        }
    }
    open(templateId, blank = false, draft) {
        this.dispatchEvent(new CustomEvent('open-template', {
            detail: { templateId, labelSizeId: draft?.label_size_id ?? this.labelSizeId, blank, draft },
            bubbles: true,
            composed: true,
        }));
    }
    review() {
        const action = this.action;
        if (!action)
            return E;
        return x `<section class="review" role="region" aria-label=${this.t(action.operation)}>
      <h3>${this.t(action.operation)}</h3>
      <p>${this.t(`${action.operation}_effect`)}</p>
      ${action.name === undefined
            ? E
            : x `<label
            >${this.t('name')}<input
              .value=${action.name}
              @input=${(event) => {
                this.action = {
                    ...action,
                    name: event.target.value,
                    key: crypto.randomUUID(),
                };
            }}
          /></label>`}
      <div class="actions">
        ${this.button('confirm', () => void this.commit(), action.name !== undefined && !action.name.trim())}${this.button('cancel', () => {
            this.action = null;
        })}
      </div>
    </section>`;
    }
    editorActions() {
        const draft = this.session?.state.draft;
        if (!draft)
            return x ``;
        const payload = {
            ...(draft.template_id
                ? { template_id: draft.template_id }
                : { label_size_id: draft.label_size_id }),
            draft_id: draft.id,
        };
        return x `<div class="actions">
      ${this.button('save_as', () => this.stage('save_as', payload, ''))}
      ${this.button('export_work', () => downloadTemplateData({ ...draft, document: this.session?.state.document }, 'label-draft-recovery.json'))}
      ${draft.template_id
            ? x `${this.button('reload', () => this.stage('reload', { template_id: draft.template_id }))}${this.button('replace_factory', () => this.stage('replace_factory', { template_id: draft.template_id }))}`
            : E}
    </div>`;
    }
    exportEditorWork() {
        const draft = this.session?.state.draft;
        if (!draft)
            return E;
        return this.button('export_work', () => downloadTemplateData({ ...draft, document: this.session?.state.document }, 'label-draft-recovery.json'));
    }
    render() {
        if (getHass()?.user && !getHass()?.user?.is_admin)
            return x `<p role="alert">${this.t('admin')}</p>
        ${this.exportEditorWork()}`;
        const library = this.library;
        return x `
      ${this.failure
            ? x `<p class="error" role="alert">${this.failure}</p>
            ${this.button('refresh', () => void this.refresh())}`
            : E}
      ${this.busy ? x `<p role="status">${this.t('working')}</p>` : E} ${this.review()}
      ${!library
            ? x `<p role="status">${this.t('loading')}</p>`
            : !library.store.readable
                ? x `<p role="alert">
              ${this.t('newer_store')} ${library.store.found_version} / ${library.store.version}
            </p>`
                : this.session
                    ? this.editorActions()
                    : this.catalogue(library)}
    `;
    }
    catalogue(library) {
        const templates = library.templates.filter((item) => item.label_size_id === this.labelSizeId);
        const effective = library.effective_defaults[this.labelSizeId];
        return x `<section>
        <h3>${this.t('title')}</h3>
        <p>${this.t('default')}: ${effective?.name ?? this.t('unavailable')}</p>
        <div class="actions">
          ${this.button('blank', () => this.open(undefined, true))}${this.button('clear_default', () => this.stage('clear_default', { label_size_id: this.labelSizeId }), !library.defaults[this.labelSizeId])}
        </div>
        ${templates.length
            ? templates.map((item) => x `<div class="row">
                  <strong>${item.name}</strong> · r${item.head_revision}
                  ${item.quarantined
                ? x `<p class="error">${this.t('quarantined')}</p>
                        <ul>
                          ${item.quarantine?.diagnostics.map((d) => x `<li>${d.message}</li>`)}
                        </ul>`
                : E}
                  <div class="actions">
                    ${this.button('edit', () => this.open(item.id), item.quarantined)}
                    ${this.button('rename', () => this.stage('rename', { template_id: item.id }, item.name))}
                    ${this.button('duplicate', () => this.stage('duplicate', { ref: { kind: 'named', id: item.id } }, ''), item.quarantined)}
                    ${this.button('set_default', () => this.stage('set_default', {
                label_size_id: item.label_size_id,
                ref: { kind: 'named', id: item.id },
            }), item.quarantined)}
                    ${this.button('inspect', () => void this.read('inspect', { template_id: item.id }))}
                    ${this.button('export', () => void this.read('export', { refs: [{ kind: 'named', id: item.id }] }))}
                    ${this.button('replace_factory', () => this.stage('replace_factory', { template_id: item.id }))}
                    ${this.button('delete', () => this.stage('delete', { template_id: item.id }))}
                  </div>
                </div>`)
            : x `<p>${this.t('empty')}</p>`}
      </section>
      ${this.inspection
            ? x `<section>
            <h3>${this.t('inspect')}</h3>
            <small>${this.inspection.id}</small> ${this.inspection.revisions.map((rev) => x `<details>
                  <summary>
                    r${rev.revision} · ${rev.name} · ${rev.operation} · ${rev.published_at}
                  </summary>
                  <pre>${JSON.stringify(rev.document, null, 2)}</pre>
                  ${this.button('restore_revision', () => this.stage('restore_revision', {
                template_id: this.inspection?.id,
                revision: rev.revision,
            }))}
                </details>`)}
            ${this.button('export_history', () => downloadTemplateData(this.inspection, 'label-history-recovery.json'))}
          </section>`
            : E}
      <details>
        <summary>${this.t('drafts')} (${library.drafts.length})</summary>
        <p>${this.t('ownership')}</p>
        ${library.drafts.map((draft) => x `<div class="row">
              <strong>${draft.name ?? draft.template_id ?? draft.label_size_id}</strong>
              <p>
                ${draft.orphaned
            ? this.t('orphaned')
            : draft.stale
                ? this.t('stale')
                : this.t('unfinished')}
              </p>
              <div class="actions">
                ${this.button('resume', () => this.open(draft.template_id ?? undefined, false, draft))}
                ${this.button('export_work', () => downloadTemplateData(draft, 'label-draft-recovery.json'))}
                ${this.button('save_as', () => this.stage('save_as', {
            ...(draft.template_id
                ? { template_id: draft.template_id }
                : { label_size_id: draft.label_size_id }),
            draft_id: draft.id,
        }, ''))}
                ${this.button('discard', () => this.stage('discard', draft.template_id
            ? { template_id: draft.template_id }
            : { label_size_id: draft.label_size_id }))}
                ${draft.recovery
            ? this.button('inspect_recovery', () => {
                this.recovery = draft;
            })
            : E}
              </div>
            </div>`)}
      </details>
      ${this.recovery
            ? x `<section>
            <h3>${this.t('inspect_recovery')}</h3>
            <pre>${JSON.stringify(this.recovery.recovery, null, 2)}</pre>
            ${this.button('export_work', () => downloadTemplateData(this.recovery?.recovery, 'label-rejected-work.json'))}
          </section>`
            : E}
      <details>
        <summary>${this.t('deleted')} (${library.tombstones.length})</summary>
        ${library.tombstones.map((stone) => x `<div class="row">
              <strong>${stone.template.name}</strong>
              <p>${this.t('expires')} ${stone.expires_at}</p>
              <div class="actions">
                ${this.button('restore', () => this.stage('restore', { template_id: stone.template.id }, stone.template.name))}${this.button('inspect', () => void this.read('inspect', { template_id: stone.template.id }))}
              </div>
            </div>`)}
      </details>
      <details>
        <summary>${this.t('transfer')}</summary>
        <p>${this.t('portable')}</p>
        ${this.button('export_all', () => void this.read('export', {}))}
        <label
          >${this.t('choose_file')}<input
            type="file"
            accept="application/json,.json"
            @change=${(event) => void this.upload(event)}
        /></label>
        ${this.preflight
            ? x `${this.preflight.entries.map((entry) => x `<div class="row">
                    <strong>${entry.name}</strong><small>${entry.id}</small>
                    <label
                      >${this.t('name')}<input
                        .value=${this.names[entry.id] ?? entry.name}
                        @input=${(event) => {
                this.names = {
                    ...this.names,
                    [entry.id]: event.target.value,
                };
                this.preflight = this.preflight && { ...this.preflight, ready: false };
            }}
                    /></label>
                    <label
                      ><input
                        type="checkbox"
                        .checked=${this.copies.includes(entry.id)}
                        @change=${(event) => {
                this.copies = event.target.checked
                    ? [...this.copies, entry.id]
                    : this.copies.filter((id) => id !== entry.id);
                this.preflight = this.preflight && { ...this.preflight, ready: false };
            }}
                      />${this.t('as_copy')}</label
                    >
                    <ul>
                      ${this.preflight?.issues
                .filter((issue) => issue.template_id === entry.id)
                .map((issue) => x `<li class="error">${issue.reason}</li>`)}
                    </ul>
                  </div>`)}
              <div class="actions">
                ${this.button('preflight', () => void this.checkImport())}${this.button('import', () => this.stage('import', {
                bundle: this.bundle,
                as_copy: this.copies,
                names: this.names,
            }), !this.preflight.ready || this.preflight.generation !== library.generation)}
              </div>`
            : E}
      </details>`;
    }
};
GrowspaceTemplateLibrary.styles = i `
    :host {
      display: block;
      color: var(--primary-text-color);
    }
    section {
      margin-block: 20px;
    }
    h3 {
      margin: 0 0 8px;
    }
    p {
      line-height: 1.5;
      max-width: 70ch;
    }
    .row {
      padding-block: 12px;
      border-bottom: 1px solid var(--divider-color);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-block: 8px;
    }
    button,
    input {
      font: inherit;
      color: inherit;
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      min-height: 44px;
      padding: 8px 12px;
      box-sizing: border-box;
    }
    button {
      cursor: pointer;
    }
    button:hover {
      background: var(--secondary-background-color);
    }
    button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    :focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    label {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-block: 8px;
    }
    input {
      max-width: 100%;
    }
    input[type='checkbox'] {
      min-height: 24px;
    }
    .review {
      padding: 16px;
      background: var(--secondary-background-color);
      border-radius: 8px;
    }
    .error {
      color: var(--error-color);
    }
    .muted {
      color: var(--secondary-text-color);
    }
    pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      max-height: 240px;
      overflow: auto;
      font-size: 12px;
    }
    small {
      display: block;
      overflow-wrap: anywhere;
    }
    details {
      margin-block: 12px;
    }
    summary {
      min-height: 44px;
      cursor: pointer;
    }
  `;
__decorate([
    n({ attribute: false })
], GrowspaceTemplateLibrary.prototype, "capability", void 0);
__decorate([
    n()
], GrowspaceTemplateLibrary.prototype, "labelSizeId", void 0);
__decorate([
    n()
], GrowspaceTemplateLibrary.prototype, "language", void 0);
__decorate([
    n({ attribute: false })
], GrowspaceTemplateLibrary.prototype, "session", void 0);
__decorate([
    r()
], GrowspaceTemplateLibrary.prototype, "library", void 0);
__decorate([
    r()
], GrowspaceTemplateLibrary.prototype, "failure", void 0);
__decorate([
    r()
], GrowspaceTemplateLibrary.prototype, "busy", void 0);
__decorate([
    r()
], GrowspaceTemplateLibrary.prototype, "action", void 0);
__decorate([
    r()
], GrowspaceTemplateLibrary.prototype, "inspection", void 0);
__decorate([
    r()
], GrowspaceTemplateLibrary.prototype, "recovery", void 0);
__decorate([
    r()
], GrowspaceTemplateLibrary.prototype, "preflight", void 0);
__decorate([
    r()
], GrowspaceTemplateLibrary.prototype, "bundle", void 0);
__decorate([
    r()
], GrowspaceTemplateLibrary.prototype, "copies", void 0);
__decorate([
    r()
], GrowspaceTemplateLibrary.prototype, "names", void 0);
GrowspaceTemplateLibrary = __decorate([
    t('growspace-template-library')
], GrowspaceTemplateLibrary);

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
var _GrowspaceLabelTemplates_instances, _GrowspaceLabelTemplates_announceEditing;
/** The localization key carrying each state's one truthful sentence. */
const STATE_KEYS = {
    unprofiled: 'state_unprofiled',
    provisional: 'state_provisional',
    verified: 'state_verified',
    production: 'state_production',
};
let GrowspaceLabelTemplates = class GrowspaceLabelTemplates extends i$1 {
    constructor() {
        super(...arguments);
        _GrowspaceLabelTemplates_instances.add(this);
        this.language = 'en';
        /**
         * Whether the editor has taken the surface.
         *
         * Reflected, because the host's own layout has to change with it and a
         * shadow stylesheet can only see the host through an attribute.
         */
        this.editing = false;
        this._preview = null;
        this._loading = false;
        this._failure = null;
        /**
         * The open editing session, or nothing.
         *
         * Held here rather than inside the editor element so that closing the
         * editor and reopening it lands on the same session -- and so the debounced
         * autosave is not cancelled by a re-render. It is durable on the server
         * either way; what this avoids is a visible round trip for work that never
         * left.
         */
        this._session = null;
        this._opening = false;
        this._published = null;
    }
    willUpdate(changed) {
        if (!changed.has('capability') || !this.capability)
            return;
        // A capability arriving, or being replaced by one of another generation,
        // re-reconciles the choice against the catalogue that is now current
        // rather than keeping a Label Size the backend may no longer ship.
        this._choice = reconcileChoice(this.capability, this._choice);
        void this._load();
    }
    _t(key) {
        return localize(`labels.${key}`, '', '', this.language);
    }
    async _load() {
        const choice = this._choice;
        if (!this.capability || !choice)
            return;
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
        }
        catch (error) {
            this._preview = null;
            this._failure = error instanceof Error ? error.message : String(error);
        }
        finally {
            this._loading = false;
        }
    }
    _choose(partial) {
        if (!this.capability)
            return;
        this._choice = reconcileChoice(this.capability, { ...this._choice, ...partial });
        void this._load();
    }
    _renderSizes(capability) {
        const choice = this._choice;
        return x `
      <div class="sizes" role="group" aria-label=${this._t('sizes_label')}>
        ${labelSizes(capability).map((size) => {
            const state = labelSizeState(capability, size.id);
            return x `
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
    _renderFixtures(capability) {
        const families = Object.keys(capability.catalogues.representative_fixtures);
        return x `
      <div class="fixtures" role="group" aria-label=${this._t('fixtures_label')}>
        ${families.map((family) => x `
            <button
              type="button"
              data-fixture=${family}
              aria-pressed=${this._choice?.fixtureFamily === family}
              @click=${() => this._choose({ fixtureFamily: family })}
            >
              <span>${this._t(`fixture_${family}`)}</span>
            </button>
          `)}
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
    _renderStage(capability) {
        const choice = this._choice;
        if (!choice)
            return x `<p class="supporting">${this._t('preview_loading')}</p>`;
        if (labelSizeState(capability, choice.labelSizeId) === 'unprofiled') {
            return x `<p class="supporting" data-state="unprofiled">
        ${this._t('preview_unprofiled')}
      </p>`;
        }
        if (this._loading) {
            return x `<p class="supporting" role="status">${this._t('preview_loading')}</p>`;
        }
        if (this._failure !== null) {
            return x `<p class="supporting refusal" role="alert" data-state="failed">
        ${localizeWithParams('labels.preview_failed', { reason: this._failure }, this.language)}
      </p>`;
        }
        const preview = this._preview;
        if (!preview)
            return x `<p class="supporting">${this._t('preview_loading')}</p>`;
        if (preview.outcome === 'refused') {
            return x `<p class="supporting refusal" role="alert" data-state="refused">
        ${localizeWithParams('labels.preview_refused', { reason: preview.refusal.reason, code: preview.refusal.code }, this.language)}
      </p>`;
        }
        const raster = preview.render.raster;
        if (!raster) {
            // The sentence must not point at diagnostics the user cannot see, so
            // the ones that stopped the render are printed with it.
            const blocking = preview.render.diagnostics.filter((item) => item.severity === 'error' || item.code.endsWith('render_failed'));
            return x `
        <p class="supporting refusal" role="alert" data-state="no-raster">
          ${this._t('preview_no_raster')}
        </p>
        <ul class="diagnostics">
          ${(blocking.length > 0 ? blocking : preview.render.diagnostics).map((item) => x `<li><code>${item.code}</code> ${item.message}</li>`)}
        </ul>
      `;
        }
        return x `
      <div class="stage">
        <img
          src=${raster.image}
          width=${raster.width}
          height=${raster.height}
          alt=${localizeWithParams('labels.preview_alt', { template: preview.template.name }, this.language)}
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
    _renderIdentity(preview) {
        const context = preview.render.render_context;
        return x `
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
    async _openEditor(options = {}) {
        const capability = this.capability;
        const choice = this._choice && {
            ...this._choice,
            labelSizeId: options.labelSizeId ?? this._choice.labelSizeId,
        };
        if (!capability || !choice || this._opening)
            return;
        this._opening = true;
        this._failure = null;
        try {
            const factory = capability.catalogues.factory_templates.find((template) => template.label_size_id === choice.labelSizeId);
            const address = { labelSizeId: choice.labelSizeId, templateId: options.templateId };
            const answer = options.draft
                ? { outcome: 'ok', draft: options.draft }
                : await openLabelTemplateDraft(address, !options.blank && !options.templateId && factory
                    ? { kind: 'factory', id: factory.id }
                    : undefined);
            if (answer.outcome === 'refused') {
                this._failure = `${answer.refusal.reason} (${answer.refusal.code})`;
                return;
            }
            const parsed = TemplateDraftSchema.safeParse(answer.draft);
            if (!parsed.success || answer.draft.layout_schema_version !== 1) {
                this._failure = this._t('library_opaque');
                downloadTemplateData(answer.draft, 'label-draft-recovery.json');
                return;
            }
            this._session?.close();
            const size = labelSizes(capability).find((item) => item.id === choice.labelSizeId);
            const session = new DraftSession(address, { widthMm: size.width_mm, heightMm: size.height_mm }, parsed.data.document, {
                quantumMm: capability.limits.coordinate_quantum_mm,
                fixtureFamily: choice.fixtureFamily,
                density: choice.density,
                locale: choice.locale,
            });
            session.adopt(parsed.data, null, options.draft?.stale);
            this._session = session;
            this._published = null;
            __classPrivateFieldGet(this, _GrowspaceLabelTemplates_instances, "m", _GrowspaceLabelTemplates_announceEditing).call(this, true);
            // The first raster, so the canvas opens onto the backend's own picture
            // rather than onto frames floating over nothing.
            void session.render();
        }
        catch (error) {
            this._failure = error instanceof Error ? error.message : String(error);
        }
        finally {
            this._opening = false;
        }
    }
    _closeEditor() {
        this._session?.close();
        this._session = null;
        __classPrivateFieldGet(this, _GrowspaceLabelTemplates_instances, "m", _GrowspaceLabelTemplates_announceEditing).call(this, false);
    }
    _onPublished(event) {
        this._published = event.detail.name;
        this._closeEditor();
    }
    _renderEditor(session) {
        return x `
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
    _renderLibrary(session = null) {
        // A user who loses administrator rights mid-edit still needs the recovery
        // export. The child narrows that state to read-only instead of exposing
        // the management catalogue or mutation controls.
        if (!getHass()?.user?.is_admin && !session)
            return E;
        return x `<growspace-template-library
      .capability=${this.capability}
      .labelSizeId=${this._choice?.labelSizeId ?? ''}
      .language=${this.language}
      .session=${session}
      @open-template=${(event) => void this._openEditor(event.detail)}
      @close-editor=${this._closeEditor}
    ></growspace-template-library>`;
    }
    render() {
        const capability = this.capability;
        if (!capability)
            return E;
        // The editor is a task mode, not a panel: it takes the whole surface,
        // because a canvas sharing a dialog with the catalogue it was reached
        // from is neither a usable editor nor a usable catalogue.
        if (this._session !== null)
            return this._renderEditor(this._session);
        // The claim below is about the raster, so it is made only when there is
        // one. "The preview is exactly what this printer would receive" printed
        // over an empty stage would be the untruth this whole surface avoids.
        const shown = this._preview?.outcome === 'rendered' && this._preview.render.raster !== null
            ? labelSizeState(capability, this._preview.render.render_context.label_size_id)
            : undefined;
        const editable = this._choice !== undefined &&
            labelSizeState(capability, this._choice.labelSizeId) !== 'unprofiled';
        return x `
      <p class="supporting" data-role="scope">${this._t('read_only')}</p>
      ${this._renderSizes(capability)} ${this._renderLibrary()} ${this._renderFixtures(capability)}
      ${this._renderStage(capability)}
      <p>
        <button
          type="button"
          data-action="edit"
          ?disabled=${!editable || this._opening}
          @click=${() => void this._openEditor()}
        >
          ${this._opening ? this._t('editor_opening') : this._t('editor_open')}
        </button>
      </p>
      ${this._published === null
            ? E
            : x `<p class="supporting" role="status" data-role="published">
            ${localizeWithParams('labels.editor_published', { name: this._published }, this.language)}
          </p>`}
      ${shown
            ? x `<p class="supporting" data-role="claim" data-state=${shown}>
            ${this._t(STATE_KEYS[shown])} — ${this._t(`${STATE_KEYS[shown]}_detail`)}
          </p>`
            : E}
    `;
    }
};
_GrowspaceLabelTemplates_instances = new WeakSet();
_GrowspaceLabelTemplates_announceEditing = function _GrowspaceLabelTemplates_announceEditing(editing) {
    this.editing = editing;
    this.dispatchEvent(new CustomEvent('editing', { detail: { editing }, bubbles: true, composed: true }));
};
GrowspaceLabelTemplates.styles = [
    variables,
    i `
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
__decorate([
    n({ attribute: false })
], GrowspaceLabelTemplates.prototype, "capability", void 0);
__decorate([
    n({ type: String })
], GrowspaceLabelTemplates.prototype, "language", void 0);
__decorate([
    n({ type: Boolean, reflect: true })
], GrowspaceLabelTemplates.prototype, "editing", void 0);
__decorate([
    r()
], GrowspaceLabelTemplates.prototype, "_choice", void 0);
__decorate([
    r()
], GrowspaceLabelTemplates.prototype, "_preview", void 0);
__decorate([
    r()
], GrowspaceLabelTemplates.prototype, "_loading", void 0);
__decorate([
    r()
], GrowspaceLabelTemplates.prototype, "_failure", void 0);
__decorate([
    r()
], GrowspaceLabelTemplates.prototype, "_session", void 0);
__decorate([
    r()
], GrowspaceLabelTemplates.prototype, "_opening", void 0);
__decorate([
    r()
], GrowspaceLabelTemplates.prototype, "_published", void 0);
GrowspaceLabelTemplates = __decorate([
    t('growspace-label-templates')
], GrowspaceLabelTemplates);

export { GrowspaceLabelTemplates };
//# sourceMappingURL=growspace-label-templates--crPCsxV.js.map
