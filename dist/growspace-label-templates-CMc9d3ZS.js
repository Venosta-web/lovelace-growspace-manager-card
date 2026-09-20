/*! growspace-e2e-build source=384fd394630140a7919c23ad883a24e7e8b48aadd6e34f5e9897d1400b40cd56 id=6ae349b052a6fb716770f6be4c144ca0 */
const { eT: negotiatedContract, h: hassCall, eU: CONTRACT_INCOMPATIBLE, eV: recoverFromContractRefusal, eW: DraftOpenedSchema, eX: DraftSavedSchema, eY: DraftPreviewSchema, eZ: DraftPublishedSchema, e_: DraftDiscardedSchema, e$: __classPrivateFieldSet, f0: __classPrivateFieldGet, f1: DRAFT_VERSION_MISMATCH, cK: variables, i, _: __decorate, n, w: r, t, g: i$1, A: localize, E, x, c7: o, bX: localizeWithParams, j: mdiArrowLeft, f2: mdiUndo, f3: mdiRedo, f4: mdiContentSaveOutline, ar: mdiRefresh, f5: mdiTrashCanOutline, f6: reconcileChoice, f7: labelSizeState, f8: previewFactoryTemplate, f9: labelSizes } = await import(window.__growspaceEntryUrl ?? './growspace-manager-card.js');

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
function publishLabelTemplateDraft(address, draftId) {
    return gated(WS_PUBLISH_LABEL_TEMPLATE_DRAFT, { ...addressed(address), ...(draftId ? { draft_id: draftId } : {}) }, DraftPublishedSchema);
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
var _DraftSession_instances, _DraftSession_state, _DraftSession_listeners, _DraftSession_undo, _DraftSession_redo, _DraftSession_timer, _DraftSession_closed, _DraftSession_edits, _DraftSession_savedEdits, _DraftSession_emit, _DraftSession_standing, _DraftSession_renderedVersion, _DraftSession_schedule;
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
        _DraftSession_renderedVersion.set(this, null);
        __classPrivateFieldSet(this, _DraftSession_state, {
            document,
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
        // A render belongs to the draft it came from. Adopting another one --
        // after a reload, or after switching templates -- leaves the raster
        // describing something that is no longer on screen.
        __classPrivateFieldSet(this, _DraftSession_renderedVersion, null, "f");
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, {
            draft,
            document: draft.document,
            validation,
            stale,
            dirty: false,
            name: draft.name ?? '',
            refusal: null,
        });
    }
    select(elementId) {
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, { selectedId: elementId });
    }
    setName(name) {
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
        const before = __classPrivateFieldGet(this, _DraftSession_state, "f").document;
        const after = withFrame(before, elementId, frame);
        if (after === before)
            return;
        const top = __classPrivateFieldGet(this, _DraftSession_undo, "f")[__classPrivateFieldGet(this, _DraftSession_undo, "f").length - 1];
        if (gesture !== null && top?.gesture === gesture) {
            top.after = after;
        }
        else {
            __classPrivateFieldGet(this, _DraftSession_undo, "f").push({ before, after, gesture });
            if (__classPrivateFieldGet(this, _DraftSession_undo, "f").length > UNDO_LIMIT)
                __classPrivateFieldGet(this, _DraftSession_undo, "f").shift();
        }
        __classPrivateFieldSet(this, _DraftSession_redo, [], "f");
        __classPrivateFieldSet(this, _DraftSession_edits, __classPrivateFieldGet(this, _DraftSession_edits, "f") + 1, "f");
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, { document: after, dirty: true });
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_schedule).call(this);
    }
    /** Close a gesture so the next edit starts a new undo step. */
    endGesture() {
        const top = __classPrivateFieldGet(this, _DraftSession_undo, "f")[__classPrivateFieldGet(this, _DraftSession_undo, "f").length - 1];
        if (top)
            top.gesture = null;
    }
    undo() {
        const command = __classPrivateFieldGet(this, _DraftSession_undo, "f").pop();
        if (!command)
            return;
        __classPrivateFieldGet(this, _DraftSession_redo, "f").push(command);
        __classPrivateFieldSet(this, _DraftSession_edits, __classPrivateFieldGet(this, _DraftSession_edits, "f") + 1, "f");
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, { document: command.before, dirty: true });
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_schedule).call(this);
    }
    redo() {
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
        if (draft === null || __classPrivateFieldGet(this, _DraftSession_state, "f").saving)
            return;
        const sending = __classPrivateFieldGet(this, _DraftSession_edits, "f");
        const document = __classPrivateFieldGet(this, _DraftSession_state, "f").document;
        const name = __classPrivateFieldGet(this, _DraftSession_state, "f").name.trim();
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, { saving: true });
        const answer = await autosaveLabelTemplateDraft(this.address, document, {
            expectedVersion: draft.version,
            ...(draft.template_id === null ? { name: name === '' ? null : name } : {}),
        });
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
        const answer = await publishLabelTemplateDraft(this.address, draft.id);
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
    /** Dismiss a refusal the user has read and chosen not to act on. */
    acknowledge() {
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, { refusal: null });
    }
}
_DraftSession_state = new WeakMap(), _DraftSession_listeners = new WeakMap(), _DraftSession_undo = new WeakMap(), _DraftSession_redo = new WeakMap(), _DraftSession_timer = new WeakMap(), _DraftSession_closed = new WeakMap(), _DraftSession_edits = new WeakMap(), _DraftSession_savedEdits = new WeakMap(), _DraftSession_renderedVersion = new WeakMap(), _DraftSession_instances = new WeakSet(), _DraftSession_emit = function _DraftSession_emit(patch) {
    const merged = { ...__classPrivateFieldGet(this, _DraftSession_state, "f"), ...patch };
    __classPrivateFieldSet(this, _DraftSession_state, {
        ...merged,
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
var _GrowspaceLabelEditor_instances, _GrowspaceLabelEditor_unsubscribe, _GrowspaceLabelEditor_gesture, _GrowspaceLabelEditor_attach, _GrowspaceLabelEditor_stock_get, _GrowspaceLabelEditor_onPointerDown, _GrowspaceLabelEditor_onPointerMove, _GrowspaceLabelEditor_onPointerUp, _GrowspaceLabelEditor_onKeyDown, _GrowspaceLabelEditor_nudge, _GrowspaceLabelEditor_setField, _GrowspaceLabelEditor_renderStage, _GrowspaceLabelEditor_renderElement, _GrowspaceLabelEditor_renderHandle, _GrowspaceLabelEditor_renderElements, _GrowspaceLabelEditor_renderInspector, _GrowspaceLabelEditor_renderDiagnostics, _GrowspaceLabelEditor_selectFor, _GrowspaceLabelEditor_renderStanding, _GrowspaceLabelEditor_renderRefusal, _GrowspaceLabelEditor_renderBar, _GrowspaceLabelEditor_publish, _GrowspaceLabelEditor_renderToolbar, _GrowspaceLabelEditor_discard;
/** The eight handles, in the order a reader goes round a rectangle. */
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
/** The four exact controls, and the order the inspector lists them in. */
const FIELDS = [
    { key: 'x_mm', label: 'editor_field_x' },
    { key: 'y_mm', label: 'editor_field_y' },
    { key: 'width_mm', label: 'editor_field_width' },
    { key: 'height_mm', label: 'editor_field_height' },
];
let GrowspaceLabelEditor = class GrowspaceLabelEditor extends i$1 {
    constructor() {
        super(...arguments);
        _GrowspaceLabelEditor_instances.add(this);
        this.language = 'en';
        this._workbench = 'canvas';
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
        </section>
        ${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_renderInspector).call(this, model)}
      </div>
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
    if (session.state.selectedId === null) {
        session.select(defaultSelection(session.state.document));
    }
};
_GrowspaceLabelEditor_stock_get = function _GrowspaceLabelEditor_stock_get() {
    const size = this.capability?.catalogues.label_sizes.find((candidate) => candidate.id === this.session?.address.labelSizeId);
    return { widthMm: size?.width_mm ?? 1, heightMm: size?.height_mm ?? 1 };
};
_GrowspaceLabelEditor_onPointerDown = function _GrowspaceLabelEditor_onPointerDown(event, elementId, handle) {
    const session = this.session;
    // The model, because it is what the frames on screen were drawn from: a
    // gesture must start from the geometry the user is pointing at, not from
    // a session state that has moved on since the last render.
    const document = this._model?.document;
    const frame = document && elementById(document, elementId)?.frame;
    if (!session || !frame)
        return;
    event.preventDefault();
    event.stopPropagation();
    event.target.setPointerCapture(event.pointerId);
    session.select(elementId);
    __classPrivateFieldSet(this, _GrowspaceLabelEditor_gesture, {
        pointerId: event.pointerId,
        elementId,
        handle,
        originX: event.clientX,
        originY: event.clientY,
        startFrame: frame,
        key: `${handle ?? 'move'}:${event.pointerId}:${Date.now()}`,
    }, "f");
};
_GrowspaceLabelEditor_onPointerMove = function _GrowspaceLabelEditor_onPointerMove(event) {
    const gesture = __classPrivateFieldGet(this, _GrowspaceLabelEditor_gesture, "f");
    const session = this.session;
    if (!gesture || !session || gesture.pointerId !== event.pointerId)
        return;
    const stage = this.renderRoot.querySelector('.stage');
    if (!stage)
        return;
    // The measured box, every move: a zoom or a resize mid-drag changes it,
    // and reading it once at pointerdown would silently scale the rest.
    const rect = stage.getBoundingClientRect();
    const { deltaXMm, deltaYMm } = pixelsToMm(event.clientX - gesture.originX, event.clientY - gesture.originY, rect, __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "a", _GrowspaceLabelEditor_stock_get));
    const next = gesture.handle === null
        ? translateFrame(gesture.startFrame, deltaXMm, deltaYMm, __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "a", _GrowspaceLabelEditor_stock_get), session.quantumMm)
        : resizeFrame(gesture.startFrame, gesture.handle, deltaXMm, deltaYMm, __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "a", _GrowspaceLabelEditor_stock_get), session.quantumMm);
    session.moveElement(gesture.elementId, next, gesture.key);
};
_GrowspaceLabelEditor_onPointerUp = function _GrowspaceLabelEditor_onPointerUp(event) {
    if (__classPrivateFieldGet(this, _GrowspaceLabelEditor_gesture, "f")?.pointerId !== event.pointerId)
        return;
    __classPrivateFieldSet(this, _GrowspaceLabelEditor_gesture, null, "f");
    this.session?.endGesture();
    void this.session?.render();
};
_GrowspaceLabelEditor_onKeyDown = function _GrowspaceLabelEditor_onKeyDown(event) {
    const session = this.session;
    const model = this._model;
    if (!session || !model)
        return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey)
            session.redo();
        else
            session.undo();
        void session.render();
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
    const element = elementById(model.document, model.selectedId);
    if (!delta || !element)
        return;
    event.preventDefault();
    __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_nudge).call(this, element, delta[0], delta[1]);
};
_GrowspaceLabelEditor_nudge = function _GrowspaceLabelEditor_nudge(element, deltaXMm, deltaYMm) {
    const session = this.session;
    if (!session)
        return;
    session.moveElement(element.id, translateFrame(element.frame, deltaXMm, deltaYMm, __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "a", _GrowspaceLabelEditor_stock_get), session.quantumMm));
    session.endGesture();
    void session.render();
};
_GrowspaceLabelEditor_setField = function _GrowspaceLabelEditor_setField(element, field, raw) {
    const session = this.session;
    const value = Number.parseFloat(raw);
    if (!session || Number.isNaN(value))
        return;
    session.moveElement(element.id, setFrameField(element.frame, field, value, __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "a", _GrowspaceLabelEditor_stock_get), session.quantumMm));
    session.endGesture();
    void session.render();
};
_GrowspaceLabelEditor_renderStage = function _GrowspaceLabelEditor_renderStage(model) {
    const stock = __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "a", _GrowspaceLabelEditor_stock_get);
    const raster = model.render?.raster ?? null;
    return x `
      <div class="stage-wrap">
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
        </div>
      </div>
    `;
};
_GrowspaceLabelEditor_renderElement = function _GrowspaceLabelEditor_renderElement(element, model) {
    const selected = model.selectedId === element.id;
    return x `
      <button
        class="element"
        data-element=${element.id}
        aria-pressed=${selected}
        aria-label=${localizeWithParams('labels.editor_element_alt', { kind: element.kind }, this.language)}
        style=${o(frameAsPercentages(element.frame, __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "a", _GrowspaceLabelEditor_stock_get)))}
        @pointerdown=${(event) => __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_onPointerDown).call(this, event, element.id, null)}
      >
        ${selected ? HANDLES.map((handle) => __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_renderHandle).call(this, element, handle)) : E}
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
_GrowspaceLabelEditor_renderElements = function _GrowspaceLabelEditor_renderElements(model) {
    return x `
      <aside ?hidden-on-narrow=${this._workbench !== 'elements'}>
        <h2>${this._t('editor_elements')}</h2>
        <ul class="elements">
          ${model.document.elements.map((element) => x `
              <li>
                <button
                  data-list-element=${element.id}
                  aria-pressed=${model.selectedId === element.id}
                  @click=${() => this.session?.select(element.id)}
                >
                  ${this._t(`editor_kind_${element.kind}`)}
                </button>
              </li>
            `)}
        </ul>
      </aside>
    `;
};
_GrowspaceLabelEditor_renderInspector = function _GrowspaceLabelEditor_renderInspector(model) {
    const element = elementById(model.document, model.selectedId);
    return x `
      <aside ?hidden-on-narrow=${this._workbench !== 'selection'}>
        <h2>${this._t('editor_selection')}</h2>
        ${element === undefined
        ? x `<p class="supporting">${this._t('editor_nothing_selected')}</p>`
        : x `
              <h3>${this._t('editor_position')}</h3>
              <div class="fields">
                ${FIELDS.map((field) => x `
                    <div>
                      <label for=${field.key}>${this._t(field.label)}</label>
                      <input
                        id=${field.key}
                        type="number"
                        step="0.01"
                        data-field=${field.key}
                        .value=${String(element.frame[field.key])}
                        @change=${(event) => __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_setField).call(this, element, field.key, event.target.value)}
                      />
                    </div>
                  `)}
              </div>
              <h3>${this._t('editor_nudge')}</h3>
              <div class="nudge">
                <button
                  data-nudge="up"
                  aria-label=${this._t('editor_nudge_up')}
                  @click=${() => __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_nudge).call(this, element, 0, -NUDGE_MM)}
                >
                  ↑
                </button>
                <button
                  data-nudge="left"
                  aria-label=${this._t('editor_nudge_left')}
                  @click=${() => __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_nudge).call(this, element, -NUDGE_MM, 0)}
                >
                  ←
                </button>
                <button
                  data-nudge="down"
                  aria-label=${this._t('editor_nudge_down')}
                  @click=${() => __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_nudge).call(this, element, 0, NUDGE_MM)}
                >
                  ↓
                </button>
                <button
                  data-nudge="right"
                  aria-label=${this._t('editor_nudge_right')}
                  @click=${() => __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_nudge).call(this, element, NUDGE_MM, 0)}
                >
                  →
                </button>
              </div>
              <p class="supporting">${this._t('editor_nudge_hint')}</p>
            `}
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
          <svg viewBox="0 0 24 24"><path d=${mdiArrowLeft}></path></svg>
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
_GrowspaceLabelEditor_renderToolbar = function _GrowspaceLabelEditor_renderToolbar(model) {
    return x `
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
          @click=${() => void __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_discard).call(this)}
        >
          <svg viewBox="0 0 24 24"><path d=${mdiTrashCanOutline}></path></svg>
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
GrowspaceLabelEditor = __decorate([
    t('growspace-label-editor')
], GrowspaceLabelEditor);

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
    async _openEditor() {
        const capability = this.capability;
        const choice = this._choice;
        if (!capability || !choice || this._opening)
            return;
        this._opening = true;
        this._failure = null;
        try {
            const factory = capability.catalogues.factory_templates.find((template) => template.label_size_id === choice.labelSizeId);
            const answer = await openLabelTemplateDraft({ labelSizeId: choice.labelSizeId }, factory ? { kind: 'factory', id: factory.id } : undefined);
            if (answer.outcome === 'refused') {
                this._failure = `${answer.refusal.reason} (${answer.refusal.code})`;
                return;
            }
            const size = labelSizes(capability).find((item) => item.id === choice.labelSizeId);
            const session = new DraftSession({ labelSizeId: choice.labelSizeId }, { widthMm: size.width_mm, heightMm: size.height_mm }, answer.draft.document, {
                quantumMm: capability.limits.coordinate_quantum_mm,
                fixtureFamily: choice.fixtureFamily,
                density: choice.density,
                locale: choice.locale,
            });
            session.adopt(answer.draft, null);
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
      ${this._renderSizes(capability)} ${this._renderFixtures(capability)}
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
    this.dispatchEvent(new CustomEvent('editing', { detail: { editing }, bubbles: true, composed: true }));
};
GrowspaceLabelTemplates.styles = [
    variables,
    i `
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
__decorate([
    n({ attribute: false })
], GrowspaceLabelTemplates.prototype, "capability", void 0);
__decorate([
    n({ type: String })
], GrowspaceLabelTemplates.prototype, "language", void 0);
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
//# sourceMappingURL=growspace-label-templates-CMc9d3ZS.js.map
