/*! growspace-e2e-build source=103d8947e1316a77b9b14a0ac3a810d4f544c041ac6ec5f99baad518fb56034e id=a23a1ab5e95b9a93c136695cf54b040d */
const { A: localize, eT: negotiatedContract, h: hassCall, eU: CONTRACT_INCOMPATIBLE, eV: recoverFromContractRefusal, eW: DraftOpenedSchema, eX: DraftSavedSchema, eY: DraftPreviewSchema, eZ: DraftPublishedSchema, e_: DraftDiscardedSchema, e$: LibraryAnswerSchema, f0: __classPrivateFieldSet, f1: __classPrivateFieldGet, f2: DRAFT_VERSION_CONFLICT, f3: DRAFT_VERSION_MISMATCH, f4: TextStyleSchema, cK: variables, i, _: __decorate, n, t, g: i$1, x, bX: localizeWithParams, E, f5: object, f6: boolean, f7: string, f8: RenderResultSchema, f9: OperationEligibilitySchema, fa: number, fb: record, fc: array, fd: answer, fe: CapabilityProfileSchema, ff: LabelDocumentSchema, w: r, bp: e, fg: getHass, fh: profilesForSize, a0: fetchStrainLibrary, c7: o, j: mdiArrowLeft, fi: mdiUndo, fj: mdiRedo, a2: mdiContentCopy, l: mdiDelete, fk: mdiRestore, fl: mdiContentSaveOutline, ar: mdiRefresh, fm: mdiMagnifyMinusOutline, fn: mdiMagnifyPlusOutline, fo: mdiMagnifyScan, fp: ProvenanceSchema, fq: TemplateDraftSchema, fr: unknown, fs: PublicationCheckSchema, ft: discriminatedUnion, fu: LabelContractIdentitySchema, fv: literal, fw: LabelRefusalSchema, fx: DiagnosticSchema, bW: localizePlural, fy: reconcileChoice, fz: labelSizeState, fA: previewFactoryTemplate, fB: labelSizes } = await import(window.__growspaceEntryUrl ?? './growspace-manager-card.js');
import { g as getPrinters } from './growspace-growspace-dialog-host.container-D7LUYGOB.js';
import './growspace-config-dialog-DWlkePX0.js';
import './growspace-environment-ramp-DFqG_8BQ.js';

/**
 * Reviewed copy for the stable codes the integration sends.
 *
 * The integration localizes what it prints; the card localizes what it is
 * told. A refusal's `reason` and a diagnostic's `message` are English log
 * lines for a developer and never reach a user — every code resolves to a
 * key in this card's catalogue, and a code without one falls back to a
 * generic sentence rather than to the backend's prose.
 *
 * `tests/components/label-localization-contract.test.ts` holds these rules to
 * the catalogue the integration publishes, so a new code without copy fails
 * the card's suite instead of silently reading "That could not be done."
 */
/**
 * The key part of one refusal code.
 *
 * Most commands refuse with `label_template.<snake_case>`; the template
 * management command refuses a library error by its class name,
 * `label_template.<ErrorName>`. Both spellings of one refusal share its copy.
 */
function refusalSuffix(code) {
    return code
        .replace(/^label_template\./, '')
        .replace(/(?<!^)([A-Z])/g, '_$1')
        .toLowerCase();
}
/** Whether the labels catalogue holds `key` in `language` or English. */
function hasLabelCopy(key, language = 'en') {
    return localize(`labels.${key}`, '', '', language) !== `labels.${key}`;
}
/** The first of `keys` the catalogue holds, else `fallback`. */
function labelCopy(keys, fallback, language = 'en') {
    const key = keys.find((candidate) => hasLabelCopy(candidate, language)) ?? fallback;
    return localize(`labels.${key}`, '', '', language);
}
/** One refusal, in the user's words. */
function refusalCopy(code, language = 'en', prefixes = []) {
    const suffix = refusalSuffix(code);
    return labelCopy([...prefixes.map((prefix) => `${prefix}${suffix}`), `refusal_${suffix}`], 'refusal_generic', language);
}

/**
 * What is wrong with a label, in the order it should be fixed, pointing at the
 * control that fixes it.
 *
 * Two sources feed the editor: the **publication check** that every autosave
 * returns (document and content layers, no printer needed) and the **render**
 * (profile compilation, raster, transport). Shown as two lists they read as
 * two opinions; merged, ordered by severity and deduplicated, they are one
 * list of work with the blockers at the top.
 *
 * Each row is resolved to a **destination** — the element and the exact
 * inspector control, profile selection, the calibration flow, a retry — from
 * the diagnostic's own `recovery`, because the backend already decided where
 * a correction lives and a card that re-derived it from the message would be
 * guessing.
 *
 * And no row carries the backend's `message`. Copy is looked up by code, then
 * by layer and severity, from reviewed local strings: the message is a log
 * line for a developer, and a user shown it would be reading an English
 * sentence about element ULIDs.
 *
 * Pure: no DOM, no Lit. Everything here is testable as data.
 */
const SEVERITY_RANK = { error: 0, warning: 1, info: 2 };
/** The validation layers, in the order the backend runs them. */
const LAYER_RANK = {
    document: 0,
    content: 1,
    profile_compilation: 2,
    raster: 3,
    transport: 4,
};
const RECOVERY_DESTINATION = {
    edit_element: 'element',
    edit_content: 'content',
    select_profile: 'profile',
    calibrate: 'calibration',
    restore_template: 'template',
    retry: 'retry',
    none: 'none',
};
/**
 * Codes whose backend recovery the editor cannot perform.
 *
 * A font file missing beside the integration is reported by the raster layer,
 * whose default recovery is "retry" — but asking again renders without the
 * font again. It is an installation matter, so the row explains it and offers
 * no button that would do nothing.
 */
const CODE_DESTINATION = {
    'raster.text_unmeasured': 'none',
};
/**
 * The control a pathless diagnostic is about.
 *
 * Profile and raster diagnostics are judged against the compiled label rather
 * than a document field, so most arrive with an empty path; the code is then
 * the only thing that says which input would change the outcome.
 */
const CODE_CONTROL = {
    'profile.text_below_readable_floor': 'font_size_mm',
    'profile.text_below_comfort_threshold': 'font_size_mm',
    'raster.text_does_not_fit': 'font_size_mm',
    'raster.text_truncated': 'maximum_lines',
    'raster.missing_glyph': 'font',
    'profile.qr_quiet_zone_too_small': 'quiet_zone_modules',
    'raster.qr_quiet_zone_violated': 'quiet_zone_modules',
    'profile.qr_error_correction_unsupported': 'error_correction',
    'profile.qr_below_module_floor': 'width_mm',
    'raster.qr_does_not_fit': 'width_mm',
    'profile.qr_target_too_long': 'binding',
    'profile.image_below_effective_resolution': 'width_mm',
    'profile.divider_below_reproducible_thickness': 'height_mm',
    'profile.ink_outside_printable_area': 'x_mm',
    'profile.ink_outside_safe_area': 'x_mm',
    'profile.outside_printable_area': 'x_mm',
    'raster.ink_overlap': 'x_mm',
    'raster.required_content_occluded': 'x_mm',
};
/**
 * Read the inspector control out of a JSON pointer into the document.
 *
 * `/elements/3/frame/x_mm` edits `x_mm`, `/elements/3/style/font_size_mm`
 * edits `font_size_mm`, and anything under `/elements/3/content` is the
 * content source — whose control is the binding picker or the literal field,
 * which one being the element's own business.
 */
function controlForPath(path) {
    const parts = path.split('/').filter((part) => part !== '');
    if (parts[0] !== 'elements' || parts.length < 3)
        return null;
    const [, , group, field] = parts;
    if (group === 'frame' || group === 'style')
        return field ?? null;
    if (group === 'content')
        return field === 'literal' ? 'literal' : 'binding';
    return null;
}
function severityOf(value) {
    return value === 'error' || value === 'warning' ? value : 'info';
}
function entryOf(item) {
    const destination = CODE_DESTINATION[item.code] ?? RECOVERY_DESTINATION[item.recovery] ?? 'none';
    const control = controlForPath(item.path) ?? CODE_CONTROL[item.code] ?? null;
    // An element-level correction with no element to select is not a
    // destination: there is nothing to go to. Say what is wrong, offer nothing.
    const reachable = (destination === 'element' || destination === 'content') && item.element_id === null
        ? 'none'
        : destination;
    return {
        key: `${item.code}|${item.element_id ?? ''}|${item.path}`,
        code: item.code,
        severity: severityOf(item.severity),
        layer: item.layer,
        elementId: item.element_id,
        control: reachable === 'element' || reachable === 'content' ? control : null,
        destination: reachable,
        parameters: item.parameters,
    };
}
/**
 * One ordered list: errors first, then warnings, then notes; within a
 * severity in the order the layers run; within a layer as the backend listed
 * them. Duplicates — the same code on the same element and path, reported by
 * both the publication check and the render — appear once.
 */
function collectDiagnostics(validation, render) {
    const all = [...(validation?.diagnostics ?? []), ...(render?.diagnostics ?? [])];
    const seen = new Set();
    const entries = [];
    all.forEach((item, index) => {
        const entry = entryOf(item);
        if (seen.has(entry.key))
            return;
        seen.add(entry.key);
        entries.push({ entry, index });
    });
    return entries
        .sort((a, b) => SEVERITY_RANK[a.entry.severity] - SEVERITY_RANK[b.entry.severity] ||
        (LAYER_RANK[a.entry.layer] ?? 9) - (LAYER_RANK[b.entry.layer] ?? 9) ||
        a.index - b.index)
        .map(({ entry }) => entry);
}
/** How many of each, for the heading and for the live region. */
function countBySeverity(entries) {
    const counts = { error: 0, warning: 0, info: 0 };
    for (const entry of entries)
        counts[entry.severity] += 1;
    return counts;
}
/**
 * The localization keys to try for one row, most specific first.
 *
 * A code this card has reviewed copy for gets it; any other falls back to a
 * sentence about its layer and severity, and last to one about its severity
 * alone — never to the backend's message.
 */
function copyKeys(entry) {
    return [
        `diagnostic_${entry.code.replace(/\./g, '_')}`,
        `diagnostic_layer_${entry.layer}_${entry.severity}`,
        `diagnostic_severity_${entry.severity}`,
    ];
}

/**
 * The one way a Label Template command is sent: under the negotiated contract.
 *
 * Its own module because both the draft calls and the print calls go through
 * it, and neither should have to import the other to reach it.
 *
 * The negotiated identity travels with the request, and a backend whose
 * capability has moved refuses it rather than serving a result this card would
 * misread. The one thing done automatically is the capability refresh a
 * `contract_incompatible` refusal names; the refused call is handed back to
 * its caller unperformed.
 */
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
const WS_GET_LABEL_TEMPLATE_LIBRARY = 'growspace_manager/get_label_template_library';
const WS_OPEN_LABEL_TEMPLATE_DRAFT = 'growspace_manager/open_label_template_draft';
const WS_AUTOSAVE_LABEL_TEMPLATE_DRAFT = 'growspace_manager/autosave_label_template_draft';
const WS_PREVIEW_LABEL_TEMPLATE_DRAFT = 'growspace_manager/preview_label_template_draft';
const WS_PUBLISH_LABEL_TEMPLATE_DRAFT = 'growspace_manager/publish_label_template_draft';
const WS_DISCARD_LABEL_TEMPLATE_DRAFT = 'growspace_manager/discard_label_template_draft';
function addressed(address) {
    return {
        label_size_id: address.labelSizeId,
        ...(address.templateId ? { template_id: address.templateId } : {}),
    };
}
/**
 * The authoritative snapshot, and the only place an editor learns that the
 * draft it left behind is still there.
 *
 * Read on every editor open rather than cached, because "survives close,
 * reload, reconnect and another authenticated client" is a claim about what
 * the *server* holds, and a cache is the one thing that could make it false.
 */
function fetchLabelTemplateLibrary() {
    return gated(WS_GET_LABEL_TEMPLATE_LIBRARY, {}, LibraryAnswerSchema);
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
        ...(options.profileId ? { profile_id: options.profileId } : {}),
        ...(options.deviceId ? { device_id: options.deviceId } : {}),
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
var _DraftSession_instances, _DraftSession_state, _DraftSession_listeners, _DraftSession_undo, _DraftSession_redo, _DraftSession_timer, _DraftSession_closed, _DraftSession_edits, _DraftSession_savedEdits, _DraftSession_emit, _DraftSession_opened, _DraftSession_standing, _DraftSession_renderedVersion, _DraftSession_renderQueued, _DraftSession_renderRequest, _DraftSession_pendingSave, _DraftSession_schedule, _DraftSession_continueAfterSave, _DraftSession_finishRender;
/**
 * How long the editor waits before persisting a run of edits.
 *
 * The raster is asked for as soon as that save lands, so this is most of the
 * distance between a gesture ending and the render starting — and the target
 * for that distance is 150 ms. The frames themselves are marked stale
 * synchronously, on the edit, which is what keeps the picture honest while
 * this runs.
 */
const AUTOSAVE_DEBOUNCE_MS = 120;
/**
 * The interaction target for a settled raster. Crossing it is not a failure;
 * it is a sentence ("still rendering") rather than silence.
 */
const RENDER_SLOW_MS = 1_000;
/**
 * When a render that has not answered becomes a recoverable refusal.
 *
 * A lost WebSocket answer would otherwise leave the editor "rendering"
 * forever. Timing out loses nothing: the draft is saved independently of its
 * picture, and Retry asks again for the same version.
 */
const RENDER_TIMEOUT_MS = 10_000;
/** The refusal a render that did not answer in time becomes. */
const PREVIEW_TIMEOUT = 'label_template.preview_timeout';
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
        _DraftSession_renderQueued.set(this, false);
        _DraftSession_renderRequest.set(this, 0);
        _DraftSession_pendingSave.set(this, false);
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
            renderSlow: false,
            approval: null,
            target: null,
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
     * Choose the printer and profile the raster is rendered for.
     *
     * A different profile stales the raster at once — it was compiled for
     * another one — and a new one is asked for. A different printer does not:
     * the bitmap is the same whichever device receives it. Nothing about the
     * draft changes either way.
     */
    setTarget(target) {
        const previous = __classPrivateFieldGet(this, _DraftSession_state, "f").target;
        if (previous?.profileId === target.profileId && previous?.deviceId === target.deviceId)
            return;
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, { target });
        if (__classPrivateFieldGet(this, _DraftSession_state, "f").rasterStanding === 'stale' && __classPrivateFieldGet(this, _DraftSession_state, "f").approval !== null) {
            __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, { approval: null });
        }
        if (__classPrivateFieldGet(this, _DraftSession_state, "f").rasterStanding !== 'settled')
            void this.render();
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
        if (__classPrivateFieldGet(this, _DraftSession_state, "f").saving) {
            __classPrivateFieldSet(this, _DraftSession_pendingSave, true, "f");
            return;
        }
        if (draft === null ||
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
                __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, { saving: false, refusal: asRefusal(error, 'retry_save') });
            __classPrivateFieldSet(this, _DraftSession_pendingSave, false, "f");
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
            __classPrivateFieldSet(this, _DraftSession_pendingSave, false, "f");
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
        // A raster is requested only after the exact draft version exists on the
        // server. Rendering before autosave was the old editor's stale-preview
        // trap: it faithfully rendered the version the user had just moved past.
        // And only of a layout that compiles: the backend refuses to picture an
        // invalid one, and the diagnostics that say why are already on screen.
        if (__classPrivateFieldGet(this, _DraftSession_edits, "f") === sending && answer.validation.allowed)
            void this.render();
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_continueAfterSave).call(this);
    }
    /**
     * Ask for a raster of exactly the version the backend now holds.
     *
     * Refused rather than answered when the draft has moved on, which is how a
     * render that raced an autosave cannot land as a settled picture of the
     * wrong geometry.
     */
    async render() {
        var _a;
        const draft = __classPrivateFieldGet(this, _DraftSession_state, "f").draft;
        if (draft === null)
            return;
        if (__classPrivateFieldGet(this, _DraftSession_state, "f").rendering) {
            __classPrivateFieldSet(this, _DraftSession_renderQueued, true, "f");
            return;
        }
        const request = __classPrivateFieldSet(this, _DraftSession_renderRequest, (_a = __classPrivateFieldGet(this, _DraftSession_renderRequest, "f"), ++_a), "f");
        const version = draft.version;
        const target = __classPrivateFieldGet(this, _DraftSession_state, "f").target;
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, { rendering: true, renderSlow: false });
        // One scheduler for both timers, so a test drives the whole render clock
        // rather than half of it.
        const schedule = this.options.schedule ?? setTimeout;
        const slow = schedule(() => {
            if (!__classPrivateFieldGet(this, _DraftSession_closed, "f") && request === __classPrivateFieldGet(this, _DraftSession_renderRequest, "f") && __classPrivateFieldGet(this, _DraftSession_state, "f").rendering) {
                __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, { renderSlow: true });
            }
        }, RENDER_SLOW_MS);
        let timeout;
        let answer;
        try {
            const preview = previewLabelTemplateDraft(this.address, version, {
                fixtureFamily: this.options.fixtureFamily,
                density: this.options.density,
                locale: this.options.locale,
                profileId: target?.profileId,
                deviceId: target?.deviceId,
            });
            const timedOut = new Promise((_resolve, reject) => {
                timeout = schedule(() => reject(new Error(PREVIEW_TIMEOUT)), this.options.renderTimeoutMs ?? RENDER_TIMEOUT_MS);
            });
            answer = await Promise.race([preview, timedOut]);
        }
        catch (error) {
            if (__classPrivateFieldGet(this, _DraftSession_closed, "f"))
                return;
            if (request === __classPrivateFieldGet(this, _DraftSession_renderRequest, "f")) {
                __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, {
                    rendering: false,
                    renderSlow: false,
                    refusal: asRefusal(error, 'retry_preview'),
                });
            }
            __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_finishRender).call(this);
            return;
        }
        finally {
            clearTimeout(slow);
            clearTimeout(timeout);
        }
        if (__classPrivateFieldGet(this, _DraftSession_closed, "f"))
            return;
        // The user may have saved another version while this request was in
        // flight. Its answer is useful to nobody and must never flash on screen.
        if (request !== __classPrivateFieldGet(this, _DraftSession_renderRequest, "f") ||
            __classPrivateFieldGet(this, _DraftSession_state, "f").draft?.version !== version ||
            __classPrivateFieldGet(this, _DraftSession_state, "f").target?.profileId !== target?.profileId) {
            __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, { rendering: false, renderSlow: false });
            __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_finishRender).call(this);
            return;
        }
        if (answer.outcome === 'refused') {
            const { code } = answer.refusal;
            // A mismatch is the mechanism working: the user edited while this was
            // in flight, and a new render will be asked for. It is not something to
            // put in front of them.
            __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, {
                rendering: false,
                renderSlow: false,
                refusal: code === DRAFT_VERSION_MISMATCH ? __classPrivateFieldGet(this, _DraftSession_state, "f").refusal : answer.refusal,
            });
            __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_finishRender).call(this);
            return;
        }
        __classPrivateFieldSet(this, _DraftSession_renderedVersion, answer.draft_version, "f");
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_emit).call(this, {
            rendering: false,
            renderSlow: false,
            render: answer.render,
            approval: answer.approval_id
                ? {
                    approvalId: answer.approval_id,
                    draftVersion: answer.draft_version,
                    rasterIdentity: answer.render.raster_identity,
                }
                : null,
            // A refusal about a render — a timeout, a failed transport — is answered
            // by this one. Any other refusal is still the user's to read.
            refusal: isRenderRefusal(__classPrivateFieldGet(this, _DraftSession_state, "f").refusal) ? null : __classPrivateFieldGet(this, _DraftSession_state, "f").refusal,
        });
        __classPrivateFieldGet(this, _DraftSession_instances, "m", _DraftSession_finishRender).call(this);
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
_DraftSession_state = new WeakMap(), _DraftSession_listeners = new WeakMap(), _DraftSession_undo = new WeakMap(), _DraftSession_redo = new WeakMap(), _DraftSession_timer = new WeakMap(), _DraftSession_closed = new WeakMap(), _DraftSession_edits = new WeakMap(), _DraftSession_savedEdits = new WeakMap(), _DraftSession_opened = new WeakMap(), _DraftSession_renderedVersion = new WeakMap(), _DraftSession_renderQueued = new WeakMap(), _DraftSession_renderRequest = new WeakMap(), _DraftSession_pendingSave = new WeakMap(), _DraftSession_instances = new WeakSet(), _DraftSession_emit = function _DraftSession_emit(patch) {
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
    // A raster of the right geometry for the wrong profile is still a picture
    // of something else: another profile compiles the same millimetres onto
    // other pixels. The raster says which profile it was compiled for, so ask
    // it rather than remembering. (The printer is not in the question: which
    // device receives a bitmap does not change the bitmap.)
    const profileId = state.target?.profileId;
    if (profileId && state.render.render_context?.profile_id !== profileId)
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
}, _DraftSession_continueAfterSave = function _DraftSession_continueAfterSave() {
    if (__classPrivateFieldGet(this, _DraftSession_closed, "f"))
        return;
    const again = __classPrivateFieldGet(this, _DraftSession_pendingSave, "f") || __classPrivateFieldGet(this, _DraftSession_state, "f").dirty;
    __classPrivateFieldSet(this, _DraftSession_pendingSave, false, "f");
    if (again && !__classPrivateFieldGet(this, _DraftSession_state, "f").readOnly && __classPrivateFieldGet(this, _DraftSession_state, "f").refusal?.code !== DRAFT_VERSION_CONFLICT) {
        void this.save();
    }
}, _DraftSession_finishRender = function _DraftSession_finishRender() {
    if (__classPrivateFieldGet(this, _DraftSession_closed, "f"))
        return;
    const again = __classPrivateFieldGet(this, _DraftSession_renderQueued, "f");
    __classPrivateFieldSet(this, _DraftSession_renderQueued, false, "f");
    if (again)
        void this.render();
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
/**
 * The test print a settled raster authorizes, or nothing.
 *
 * Settled and held are both required: a raster the backend did not hold (an
 * older backend) cannot be named, and a held one that is no longer on screen
 * must not be.
 */
function testPrintApproval(state) {
    const approval = state.approval;
    if (approval === null || state.rasterStanding !== 'settled')
        return null;
    if (state.draft?.version !== approval.draftVersion)
        return null;
    return approval;
}
/** The code of a thrown transport failure, shaped as a refusal. */
const TRANSPORT_FAILED = 'label_template.transport_failed';
function isRenderRefusal(refusal) {
    return refusal?.recovery === 'retry_preview';
}
/**
 * Shape a thrown transport error like a refusal, so one banner renders both.
 *
 * `recovery` names what Retry does — save again, or render again — because
 * the two failures look alike and are answered differently.
 */
function asRefusal(error, recovery) {
    const timeout = error instanceof Error && error.message === PREVIEW_TIMEOUT;
    return {
        code: timeout ? PREVIEW_TIMEOUT : TRANSPORT_FAILED,
        // Never shown: the editor maps the stable code to reviewed local copy.
        // Kept because it is the one place a developer can see what threw.
        reason: error instanceof Error ? error.message : String(error),
        recovery,
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
    /** Hand the editor a complete replacement for the element on display. */
    /**
     * Put focus on the control that edits one field, once it is rendered.
     *
     * What a diagnostic's "go to" ends in: not the element, the exact input.
     * Waits for the update because the caller has usually just changed the
     * selection, and the control it names does not exist until this renders
     * the element it belongs to. Answers whether there was such a control.
     */
    async focusControl(field) {
        await this.updateComplete;
        const control = this.renderRoot.querySelector(`[data-field="${CSS.escape(field)}"]`);
        if (!control)
            return false;
        control.focus();
        control.scrollIntoView?.({ block: 'nearest' });
        return true;
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

      /* Darkened toward the theme's own text colour, matching
         growspace-label-editor.ts's button[aria-pressed='true']: holds 4.5:1
         on a light background (2.6:1 undarkened) without dimming the raw
         token's own contrast on a dark one, where it already passes. */
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
 * The recovery wire: calibration, test printing and one production print.
 *
 * Every answer is `ok` or `refused`, like the draft commands beside it. What
 * is new is **the approval**: a preview answers with an `approval_id` naming
 * what the backend held of it, and a print names that ID and the raster
 * identity the operator approved. The card never sends the content back — the
 * content's capture instant is part of the raster identity, so a second
 * capture could never reproduce the picture on screen.
 *
 * Every field the backend emits is declared (ADR 0031), including the ones
 * the card only shows in a log or never reads; a comment says so where that
 * is the case.
 */
/** Where one label reached paper from. Shown, never compared. */
const PrintSourceSchema = object({
    kind: string(),
    reference: string(),
    published: boolean(),
});
/** One label that reached paper, and everything that authorized it. */
const PrintOutcomeSchema = object({
    operation: string(),
    source: PrintSourceSchema,
    raster_identity: string(),
    /** The digest of the exact payload the printer adapter was handed. */
    raster_input_digest: string().nullable(),
    decision: OperationEligibilitySchema,
    result: RenderResultSchema,
});
/** The five numbers read off a calibration label, in millimetres. */
const PlacementMeasurementSchema = object({
    top_mm: number(),
    right_mm: number(),
    bottom_mm: number(),
    left_mm: number(),
    /** Signed: positive where the media ran long. */
    feed_mm: number(),
});
/** The printer, stock and mounting a measurement is of. */
const CalibrationScopeSchema = object({
    device_id: string(),
    printer_class: string(),
    label_size_id: string(),
    orientation: string(),
});
/**
 * Everything a measurement silently depended on.
 *
 * Unread beyond `scope`: the backend compares it and names what moved in
 * `stale_reasons`, which is the only form the card shows it in.
 */
const CalibrationDependenciesSchema = object({
    scope: CalibrationScopeSchema,
    feed_axis: string(),
    dpi: number(),
    printhead_pixels: number(),
    printable_origin_x_mm: number(),
    printable_origin_y_mm: number(),
    printable_width_mm: number(),
    printable_height_mm: number(),
    safe_area_inset_mm: number(),
    density_levels: record(string(), number()),
    limits_digest: string(),
    sheet_version: string(),
    compiler_version: string(),
    renderer_version: string(),
    adapter_version: string(),
    text_toolchain_version: string(),
    qr_model_version: string(),
    safety_policy_version: string(),
    binding_catalogue_version: string(),
    style_token_catalogue_version: string(),
    label_size_catalogue_version: string(),
    capability_generation: number().int(),
    /** Font file to digest. Opaque Region (ADR 0031): keyed by whatever fonts ship. */
    font_identity: record(string(), string()),
    firmware: string().nullable(),
});
/** One immutable Local Calibration record. */
const CalibrationRecordSchema = object({
    id: string(),
    identity: string(),
    recorded_at: string(),
    recorded_by: string().nullable(),
    measurement: PlacementMeasurementSchema,
    dependencies: CalibrationDependenciesSchema,
    sheet_raster_identity: string(),
    printed_density: string(),
    notes: string().nullable(),
});
/**
 * Whether one printer's newest measurement still holds.
 *
 * `state` is a string rather than an enum on purpose: an unknown state from a
 * newer backend must not blank the card, and the card treats anything other
 * than `current` as "not authorized to print".
 */
const CalibrationStatusSchema = object({
    state: string(),
    identity: string().nullable(),
    /** The dependencies that moved since the measurement. Blocking. */
    stale_reasons: array(string()),
    /** Advice, never a refusal: `calibration_older_than_recommended`. */
    warnings: array(string()),
    age_days: number().int().nullable(),
    record: CalibrationRecordSchema.nullable(),
});
/** The geometry the five numbers are checked against. */
const MeasurementBoundsSchema = object({
    printable_width_mm: number(),
    printable_height_mm: number(),
    feed_axis: string(),
    quantum_mm: number(),
});
const CalibrationStatusAnswerSchema = answer({
    profile: CapabilityProfileSchema,
    device_id: string(),
    calibration: CalibrationStatusSchema,
    bounds: MeasurementBoundsSchema,
});
const CalibrationSheetAnswerSchema = answer({
    sheet_id: string(),
    sheet_raster_identity: string(),
    bounds: MeasurementBoundsSchema,
    print: PrintOutcomeSchema,
});
const CalibrationRecordedAnswerSchema = answer({
    record: CalibrationRecordSchema,
    calibration: CalibrationStatusSchema,
});
const PrintedAnswerSchema = answer({ print: PrintOutcomeSchema });
/** One published revision, pinned for the whole of one print. */
const ResolvedTemplateSchema = object({
    ref: object({ kind: string(), id: string() }),
    revision: number().int(),
    name: string(),
    label_size_id: string(),
    layout_digest: string(),
    /** Unread: the raster is the preview, never a drawing of this. */
    document: LabelDocumentSchema,
    /** How it was resolved: `explicit` here, or a default's route. */
    via: string(),
});
const RecordPreviewAnswerSchema = answer({
    template: ResolvedTemplateSchema,
    subject: string(),
    approval_id: string(),
    calibration: CalibrationStatusSchema,
    /** The production print's own answer: the render's plus provenance. */
    decision: OperationEligibilitySchema,
    /**
     * Whether every reason `decision` refuses may be printed past: judgements
     * about a raster that exists, never one that would print something else.
     */
    override_available: boolean().default(false),
    /** The one correction to make first, or `none`. */
    recovery: string(),
    render: RenderResultSchema,
});

/**
 * The six recovery calls: calibrate a printer, test print a draft, print one
 * real label.
 *
 * Contract-gated like the draft calls, through the same {@link gated}, and
 * with the same rule: nothing here retries. A refused print was refused under
 * one approval, one raster identity and one calibration; performing it again
 * under others and presenting the answer as the first one's is exactly the
 * substitution the approval exists to prevent. The caller routes the user to
 * the correction the refusal names — and the user presses Print again.
 */
const WS_GET_LABEL_CALIBRATION_STATUS = 'growspace_manager/get_label_calibration_status';
const WS_PRINT_LABEL_CALIBRATION_SHEET = 'growspace_manager/print_label_calibration_sheet';
const WS_RECORD_LABEL_CALIBRATION = 'growspace_manager/record_label_calibration';
const WS_TEST_PRINT_LABEL_TEMPLATE_DRAFT = 'growspace_manager/test_print_label_template_draft';
const WS_PREVIEW_LABEL_RECORD = 'growspace_manager/preview_label_record';
const WS_PRINT_LABEL_RECORD = 'growspace_manager/print_label_record';
/** Has this printer been measured for this profile, and does it still hold? */
function fetchCalibrationStatus(target) {
    return gated(WS_GET_LABEL_CALIBRATION_STATUS, { profile_id: target.profileId, device_id: target.deviceId }, CalibrationStatusAnswerSchema);
}
/** Put the standardized calibration label on paper. Administrators only. */
function printCalibrationSheet(target) {
    return gated(WS_PRINT_LABEL_CALIBRATION_SHEET, {
        profile_id: target.profileId,
        device_id: target.deviceId,
        ...(target.density ? { density: target.density } : {}),
    }, CalibrationSheetAnswerSchema);
}
/**
 * Record what was read off the sheet the backend printed.
 *
 * Only the sheet's ID travels: its dependencies stayed on the backend, so the
 * numbers cannot be attached to a label that did not print.
 */
function recordCalibration(sheetId, measurement, notes) {
    return gated(WS_RECORD_LABEL_CALIBRATION, { sheet_id: sheetId, measurement, ...({}) }, CalibrationRecordedAnswerSchema);
}
/** Put the draft preview on screen on paper, exactly as approved. */
function testPrintLabelTemplateDraft(address, approval, deviceId) {
    return gated(WS_TEST_PRINT_LABEL_TEMPLATE_DRAFT, {
        label_size_id: address.labelSizeId,
        ...(address.templateId ? { template_id: address.templateId } : {}),
        expected_draft_version: approval.draftVersion,
        approval_id: approval.approvalId,
        expected_raster_identity: approval.rasterIdentity,
        device_id: deviceId,
    }, PrintedAnswerSchema);
}
/** Render one published layout for one saved strain, judged as the print will be. */
function previewLabelRecord(request) {
    return gated(WS_PREVIEW_LABEL_RECORD, {
        template: request.template,
        strain: request.strain,
        ...(request.phenotype ? { phenotype: request.phenotype } : {}),
        ...(request.profileId ? { profile_id: request.profileId } : {}),
        device_id: request.deviceId,
        ...(request.density ? { density: request.density } : {}),
        ...(request.locale ? { locale: request.locale } : {}),
    }, RecordPreviewAnswerSchema);
}
/**
 * Print the record preview the operator approved.
 *
 * `anyway` is the operator's consent to print past the refusals the preview
 * reported as `override_available`; the approval already binds the raster.
 */
function printLabelRecord(approvalId, rasterIdentity, anyway = false) {
    return gated(WS_PRINT_LABEL_RECORD, {
        approval_id: approvalId,
        expected_raster_identity: rasterIdentity,
        ...(anyway ? { override: true } : {}),
    }, PrintedAnswerSchema);
}

/**
 * When a label may go to paper from the editor, and in which words it may not.
 *
 * Each gate answers with the **first** reason, as a stable key the panel
 * localizes and puts beside the disabled control — never a bare disabled
 * button. The order is the order a user fixes things in: who they are, which
 * printer, whether the picture is current, whether the picture may print.
 *
 * Warnings are deliberately absent from every gate. A warning is shown, and
 * stays inspectable, and never has to be acknowledged before one label is
 * printed: a click-through exists to be clicked through, and teaches exactly
 * that. Blockers and stale identities are what disable printing.
 */
/** Why the draft on screen cannot be test printed now, or nothing. */
function testPrintBlockedBy(state, context) {
    if (!context.admin)
        return 'not_admin';
    if (!context.deviceId)
        return 'no_printer';
    if (state.rendering || state.dirty || state.saving)
        return 'rendering';
    if (state.rasterStanding === 'stale')
        return 'stale_preview';
    if (state.rasterStanding === 'absent' || state.render === null)
        return 'no_preview';
    if (testPrintApproval(state) === null)
        return 'not_held';
    if (state.render.eligibility.test_print?.allowed === false)
        return 'blocked';
    return null;
}
/** The five numbers a calibration form collects, in the order a sheet reads. */
const MEASUREMENT_FIELDS = [
    'top_mm',
    'right_mm',
    'bottom_mm',
    'left_mm',
    'feed_mm',
];
/**
 * Check what was typed, the way the backend will, before sending it.
 *
 * The backend remains the authority and its refusal still names the field;
 * this only saves a round trip for the three mistakes that are certain —
 * a missing value, a negative edge, a digit in the wrong box — and for a
 * precision the document model does not have.
 */
function measurementProblems(values, bounds) {
    const problems = [];
    const parsed = {};
    const feedExtent = bounds.feed_axis === 'y' ? bounds.printable_height_mm : bounds.printable_width_mm;
    const extent = {
        top_mm: bounds.printable_height_mm,
        bottom_mm: bounds.printable_height_mm,
        left_mm: bounds.printable_width_mm,
        right_mm: bounds.printable_width_mm,
        feed_mm: feedExtent,
    };
    for (const field of MEASUREMENT_FIELDS) {
        const raw = (values[field] ?? '').trim().replace(',', '.');
        if (raw === '') {
            problems.push({ field, reason: 'required' });
            continue;
        }
        const value = Number(raw);
        if (!Number.isFinite(value)) {
            problems.push({ field, reason: 'not_a_number' });
            continue;
        }
        if (field !== 'feed_mm' && value < 0) {
            problems.push({ field, reason: 'negative' });
            continue;
        }
        if (Math.abs(value) > extent[field]) {
            problems.push({ field, reason: 'too_large' });
            continue;
        }
        const steps = value / bounds.quantum_mm;
        if (Math.abs(steps - Math.round(steps)) > 1e-6) {
            problems.push({ field, reason: 'not_on_quantum' });
            continue;
        }
        parsed[field] = value;
    }
    return {
        measurement: problems.length === 0 ? parsed : null,
        problems,
    };
}

/**
 * `<growspace-label-print-panel>` — getting from a picture to a label.
 *
 * One panel, four steps a user moves through in order, each saying why it is
 * not available yet rather than greying out:
 *
 * 1. **Printer and profile.** Which printer, and which of its Capability
 *    Profiles the raster is compiled for. Changing either stales the raster,
 *    and the session asks for a new one.
 * 2. **Calibration.** Whether this printer has been measured for this profile
 *    and whether that measurement still holds — and, if not, a guided flow:
 *    print the calibration label, read five numbers off it, record them.
 * 3. **Test print.** The draft preview on screen, on paper, exactly as held.
 * 4. **Print one label.** The *published* revision for one saved strain,
 *    previewed and judged exactly as the print will be, then printed.
 *
 * And one note that no step can replace: what is exact (the bitmap), what is
 * calibrated (placement, to a tolerance), and what is physically variable
 * (ink, media, feed). The panel never claims the screen is the paper.
 *
 * Every refusal routes somewhere. A blocker this panel owns — a profile, a
 * calibration, a stale preview — is answered here; one about the layout is
 * handed to the editor as a `recovery` event, because the editor is where the
 * diagnostics and the elements are.
 */
var _GrowspaceLabelPrintPanel_instances, _GrowspaceLabelPrintPanel_announce, _GrowspaceLabelPrintPanel_applyTarget, _GrowspaceLabelPrintPanel_loadCalibration, _GrowspaceLabelPrintPanel_loadStrains, _GrowspaceLabelPrintPanel_refused, _GrowspaceLabelPrintPanel_run, _GrowspaceLabelPrintPanel_printed, _GrowspaceLabelPrintPanel_printSheet, _GrowspaceLabelPrintPanel_recordMeasurement, _GrowspaceLabelPrintPanel_testPrint, _GrowspaceLabelPrintPanel_previewRecord, _GrowspaceLabelPrintPanel_printRecord, _GrowspaceLabelPrintPanel_follow, _GrowspaceLabelPrintPanel_refusalCopy, _GrowspaceLabelPrintPanel_blockerCopy, _GrowspaceLabelPrintPanel_recoveryLabel, _GrowspaceLabelPrintPanel_renderTarget, _GrowspaceLabelPrintPanel_renderCalibration, _GrowspaceLabelPrintPanel_renderCalibrationFlow, _GrowspaceLabelPrintPanel_renderTestPrint, _GrowspaceLabelPrintPanel_renderBlockers, _GrowspaceLabelPrintPanel_renderRecord, _GrowspaceLabelPrintPanel_renderWarnings, _GrowspaceLabelPrintPanel_renderRefusal, _GrowspaceLabelPrintPanel_renderFidelity;
let GrowspaceLabelPrintPanel = class GrowspaceLabelPrintPanel extends i$1 {
    constructor() {
        super(...arguments);
        _GrowspaceLabelPrintPanel_instances.add(this);
        this.language = 'en';
        this._deviceId = null;
        this._profileId = null;
        this._calibration = null;
        this._bounds = null;
        this._step = 'closed';
        this._sheetId = null;
        this._values = {};
        this._problems = {};
        this._strains = [];
        this._strainKey = '';
        this._record = null;
        this._busy = null;
        /** The last thing that happened, said once in the panel's own live region. */
        this._status = '';
        this._refusal = null;
    }
    _t(key, params) {
        return params
            ? localizeWithParams(`labels.${key}`, params, this.language)
            : localize(`labels.${key}`, '', '', this.language);
    }
    /** Whether a key has reviewed copy, rather than echoing itself back. */
    _has(key) {
        return this._t(key) !== `labels.${key}` && this._t(key) !== key;
    }
    get _admin() {
        return getHass()?.user?.is_admin === true;
    }
    get _labelSizeId() {
        return this.session?.address.labelSizeId ?? '';
    }
    get _profiles() {
        return this.capability ? profilesForSize(this.capability, this._labelSizeId) : [];
    }
    get _profile() {
        return this._profiles.find((profile) => profile.id === this._profileId) ?? null;
    }
    connectedCallback() {
        super.connectedCallback();
        void __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_loadStrains).call(this);
    }
    /**
     * Point a newly given session at this panel's printer and profile.
     *
     * On every session, not once: the editor hands over a new one when the user
     * switches templates, and a session nobody told about the printer would
     * keep rendering for the default profile while this panel showed another.
     */
    willUpdate(changed) {
        if (!changed.has('session') && !changed.has('capability'))
            return;
        if (!this.session || !this.capability)
            return;
        const printers = getPrinters(getHass());
        this._deviceId ??= printers[0]?.id ?? null;
        if (!this._profiles.some((profile) => profile.id === this._profileId)) {
            this._profileId = this._profiles[0]?.id ?? null;
        }
        __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_applyTarget).call(this);
    }
    /** Open a step from outside: where the editor's diagnostics send a user. */
    async reveal(destination) {
        await this.updateComplete;
        if (destination === 'calibration') {
            this._step = this._admin ? 'print' : 'closed';
            await this.updateComplete;
            this.renderRoot.querySelector('[data-section="calibration"] h3')?.focus();
            this.renderRoot
                .querySelector('[data-section="calibration"]')
                ?.scrollIntoView?.({ block: 'nearest' });
            return;
        }
        (this._profileSelect ?? this._printerSelect)?.focus();
    }
    /** The published template this draft belongs to, or nothing to print yet. */
    get _publishedRef() {
        const templateId = this.model?.draft?.template_id ?? null;
        return templateId ? { kind: 'named', id: templateId } : null;
    }
    render() {
        const model = this.model;
        if (!model || !this.capability)
            return E;
        return x `
      <h2>${this._t('print_heading')}</h2>
      ${__classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_renderRefusal).call(this)} ${__classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_renderTarget).call(this)} ${__classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_renderCalibration).call(this)}
      ${__classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_renderTestPrint).call(this, model)} ${__classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_renderRecord).call(this)} ${__classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_renderFidelity).call(this, model)}
      <p class="visually-hidden" role="status" aria-live="polite" data-role="print-status">
        ${this._status}
      </p>
    `;
    }
};
_GrowspaceLabelPrintPanel_instances = new WeakSet();
_GrowspaceLabelPrintPanel_announce = function _GrowspaceLabelPrintPanel_announce(message) {
    this._status = message;
};
_GrowspaceLabelPrintPanel_applyTarget = function _GrowspaceLabelPrintPanel_applyTarget() {
    this.session?.setTarget({ profileId: this._profileId, deviceId: this._deviceId });
    this._record = null;
    void __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_loadCalibration).call(this);
};
_GrowspaceLabelPrintPanel_loadCalibration = async function _GrowspaceLabelPrintPanel_loadCalibration() {
    this._calibration = null;
    if (!this._deviceId || !this._profileId)
        return;
    try {
        const answer = await fetchCalibrationStatus({
            profileId: this._profileId,
            deviceId: this._deviceId,
        });
        if (answer.outcome === 'refused') {
            this._refusal = answer.refusal;
            return;
        }
        this._calibration = answer.calibration;
        this._bounds = answer.bounds;
    }
    catch {
        // An older backend without the command: the panel still shows the
        // profile and the test print, and says nothing it cannot know.
        this._calibration = null;
    }
};
_GrowspaceLabelPrintPanel_loadStrains = async function _GrowspaceLabelPrintPanel_loadStrains() {
    try {
        const entries = await fetchStrainLibrary();
        this._strains = entries.map((entry) => ({
            key: entry.key,
            strain: entry.strain,
            phenotype: entry.phenotype,
        }));
        this._strainKey ||= this._strains[0]?.key ?? '';
    }
    catch {
        this._strains = [];
    }
};
_GrowspaceLabelPrintPanel_refused = function _GrowspaceLabelPrintPanel_refused(refusal) {
    this._refusal = refusal;
    __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_announce).call(this, __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_refusalCopy).call(this, refusal));
};
_GrowspaceLabelPrintPanel_run = async function _GrowspaceLabelPrintPanel_run(name, work) {
    if (this._busy)
        return;
    this._busy = name;
    this._refusal = null;
    try {
        await work();
    }
    catch (error) {
        __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_refused).call(this, {
            code: 'label_template.transport_failed',
            reason: error instanceof Error ? error.message : String(error),
            recovery: 'none',
            current: { family: '', major: 0, minor: 0, generation: 0 },
        });
    }
    finally {
        this._busy = null;
    }
};
_GrowspaceLabelPrintPanel_printed = function _GrowspaceLabelPrintPanel_printed(outcome, key) {
    __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_announce).call(this, this._t(key, { reference: outcome.source.reference }));
};
_GrowspaceLabelPrintPanel_printSheet = async function _GrowspaceLabelPrintPanel_printSheet() {
    const profileId = this._profileId;
    const deviceId = this._deviceId;
    if (!profileId || !deviceId)
        return;
    await __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_run).call(this, 'sheet', async () => {
        const answer = await printCalibrationSheet({ profileId, deviceId });
        if (answer.outcome === 'refused')
            return __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_refused).call(this, answer.refusal);
        this._sheetId = answer.sheet_id;
        this._bounds = answer.bounds;
        this._values = {};
        this._problems = {};
        this._step = 'measure';
        __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_announce).call(this, this._t('print_calibration_sheet_printed'));
        await this.updateComplete;
        this.renderRoot.querySelector('input[data-measure="top_mm"]')?.focus();
    });
};
_GrowspaceLabelPrintPanel_recordMeasurement = async function _GrowspaceLabelPrintPanel_recordMeasurement(event) {
    event.preventDefault();
    const bounds = this._bounds;
    const sheetId = this._sheetId;
    if (!bounds || !sheetId)
        return;
    const { measurement, problems } = measurementProblems(this._values, bounds);
    this._problems = Object.fromEntries(problems.map((item) => [item.field, item.reason]));
    if (measurement === null) {
        __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_announce).call(this, this._t('print_measure_problems', { count: problems.length }));
        await this.updateComplete;
        this.renderRoot
            .querySelector(`input[data-measure="${problems[0].field}"]`)
            ?.focus();
        return;
    }
    await __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_run).call(this, 'record', async () => {
        const answer = await recordCalibration(sheetId, measurement);
        if (answer.outcome === 'refused') {
            const field = answer.refusal.field;
            if (field && MEASUREMENT_FIELDS.includes(field)) {
                this._problems = { [field]: 'refused' };
            }
            if (answer.refusal.recovery === 'print_calibration_sheet')
                this._step = 'print';
            return __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_refused).call(this, answer.refusal);
        }
        this._calibration = answer.calibration;
        this._step = 'closed';
        this._sheetId = null;
        this._record = null;
        __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_announce).call(this, this._t('print_calibration_recorded'));
    });
};
_GrowspaceLabelPrintPanel_testPrint = async function _GrowspaceLabelPrintPanel_testPrint() {
    const model = this.model;
    const session = this.session;
    const approval = model ? testPrintApproval(model) : null;
    if (!session || !approval || !this._deviceId)
        return;
    const deviceId = this._deviceId;
    await __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_run).call(this, 'test', async () => {
        const answer = await testPrintLabelTemplateDraft(session.address, approval, deviceId);
        if (answer.outcome === 'refused')
            return __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_refused).call(this, answer.refusal);
        __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_printed).call(this, answer.print, 'print_test_done');
    });
};
_GrowspaceLabelPrintPanel_previewRecord = async function _GrowspaceLabelPrintPanel_previewRecord() {
    const template = this._publishedRef;
    const option = this._strains.find((item) => item.key === this._strainKey);
    if (!template || !option || !this._deviceId)
        return;
    const deviceId = this._deviceId;
    await __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_run).call(this, 'preview', async () => {
        const answer = await previewLabelRecord({
            template,
            strain: option.strain,
            phenotype: option.phenotype,
            profileId: this._profileId,
            deviceId,
        });
        if (answer.outcome === 'refused') {
            this._record = null;
            return __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_refused).call(this, answer.refusal);
        }
        this._record = answer;
        __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_announce).call(this, answer.decision.allowed
            ? this._t('print_record_ready')
            : this._t('print_record_blocked', { count: answer.decision.blocked_by.length }));
    });
};
_GrowspaceLabelPrintPanel_printRecord = async function _GrowspaceLabelPrintPanel_printRecord(anyway = false) {
    const record = this._record;
    if (!record || !(record.decision.allowed || (anyway && record.override_available)))
        return;
    await __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_run).call(this, 'print', async () => {
        const answer = await printLabelRecord(record.approval_id, record.render.raster_identity, anyway);
        if (answer.outcome === 'refused') {
            this._record = null;
            return __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_refused).call(this, answer.refusal);
        }
        __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_printed).call(this, answer.print, 'print_record_done');
    });
};
_GrowspaceLabelPrintPanel_follow = 
/** Go where a refusal or a blocker says to go. */
async function _GrowspaceLabelPrintPanel_follow(recovery) {
    switch (recovery) {
        case 'select_profile':
        case 'choose_printer':
            await this.reveal('profile');
            return;
        case 'calibrate':
        case 'print_calibration_sheet':
            await this.reveal('calibration');
            return;
        case 'refresh_preview':
            if (this._record)
                await __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_previewRecord).call(this);
            else
                await this.session?.render();
            return;
        case 'retry_preview':
            await this.session?.render();
            return;
        default:
            // Layout, content and publishing are the editor's to answer.
            this.dispatchEvent(new CustomEvent('recovery', { detail: { recovery }, bubbles: true, composed: true }));
    }
};
_GrowspaceLabelPrintPanel_refusalCopy = function _GrowspaceLabelPrintPanel_refusalCopy(refusal) {
    return refusalCopy(refusal.code, this.language);
};
_GrowspaceLabelPrintPanel_blockerCopy = function _GrowspaceLabelPrintPanel_blockerCopy(blocker) {
    const key = `print_blocker_${blocker}`;
    return this._has(key) ? this._t(key) : this._t('print_blocker_generic');
};
_GrowspaceLabelPrintPanel_recoveryLabel = function _GrowspaceLabelPrintPanel_recoveryLabel(recovery) {
    const key = `print_recovery_${recovery}`;
    return this._has(key) ? this._t(key) : null;
};
_GrowspaceLabelPrintPanel_renderTarget = function _GrowspaceLabelPrintPanel_renderTarget() {
    const printers = getPrinters(getHass());
    const profile = this._profile;
    return x `
      <section data-section="target" aria-labelledby="print-target">
        <h3 id="print-target">${this._t('print_target')}</h3>
        <div class="row">
          <label>
            ${this._t('print_printer')}
            <select
              data-control="printer"
              .value=${this._deviceId ?? ''}
              @change=${(event) => {
        this._deviceId = event.target.value || null;
        __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_applyTarget).call(this);
    }}
            >
              ${printers.length === 0
        ? x `<option value="">${this._t('print_no_printer')}</option>`
        : printers.map((printer) => x `<option value=${printer.id} ?selected=${printer.id === this._deviceId}>
                        ${printer.name}
                      </option>`)}
            </select>
          </label>
          <label>
            ${this._t('print_profile')}
            <select
              data-control="profile"
              .value=${this._profileId ?? ''}
              @change=${(event) => {
        this._profileId = event.target.value || null;
        __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_applyTarget).call(this);
    }}
            >
              ${this._profiles.map((item) => x `<option value=${item.id} ?selected=${item.id === this._profileId}>
                    ${item.printer_class} · ${item.dpi} dpi
                  </option>`)}
            </select>
          </label>
        </div>
        ${printers.length === 0
        ? x `<p class="reason" data-role="no-printer">${this._t('print_no_printer_hint')}</p>`
        : E}
        ${profile
        ? x `<p class="supporting" data-role="evidence" data-evidence=${profile.evidence}>
              ${this._t(profile.authorizes_production
            ? 'print_evidence_verified'
            : 'print_evidence_provisional')}
            </p>`
        : E}
      </section>
    `;
};
_GrowspaceLabelPrintPanel_renderCalibration = function _GrowspaceLabelPrintPanel_renderCalibration() {
    const status = this._calibration;
    const state = status?.state ?? 'unknown';
    const stateKey = ['current', 'stale', 'absent'].includes(state)
        ? `print_calibration_${state}`
        : 'print_calibration_unknown';
    return x `
      <section data-section="calibration" aria-labelledby="print-calibration">
        <h3 id="print-calibration" tabindex="-1">${this._t('print_calibration')}</h3>
        ${this._deviceId
        ? x `<p class="state" data-role="calibration-state" data-state=${state}>
              ${this._t(stateKey, { days: status?.age_days ?? 0 })}
            </p>`
        : x `<p class="reason">${this._t('print_blocker_no_printer')}</p>`}
        ${status && status.stale_reasons.length > 0
        ? x `<p class="supporting" data-role="stale-reasons">
              ${this._t('print_calibration_moved', { fields: status.stale_reasons.join(', ') })}
            </p>`
        : E}
        ${status?.warnings.includes('calibration_older_than_recommended')
        ? x `<p class="supporting" data-role="calibration-age">
              ${this._t('print_calibration_old', { days: status.age_days ?? 0 })}
            </p>`
        : E}
        ${__classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_renderCalibrationFlow).call(this)}
      </section>
    `;
};
_GrowspaceLabelPrintPanel_renderCalibrationFlow = function _GrowspaceLabelPrintPanel_renderCalibrationFlow() {
    const available = this._admin && !!this._deviceId && !!this._profileId;
    if (this._step === 'closed') {
        return x `
        <button
          data-action="calibrate"
          ?disabled=${!available}
          aria-describedby=${available ? E : 'calibrate-reason'}
          @click=${() => {
            this._step = 'print';
        }}
        >
          ${this._t(this._calibration?.state === 'current'
            ? 'print_calibrate_again'
            : 'print_calibrate_start')}
        </button>
        ${available
            ? E
            : x `<p class="reason" id="calibrate-reason">
              ${this._t(this._admin ? 'print_blocker_no_printer' : 'print_blocker_not_admin')}
            </p>`}
      `;
    }
    if (this._step === 'print') {
        return x `
        <h4>${this._t('print_calibration_step_print')}</h4>
        <p class="supporting">${this._t('print_calibration_step_print_hint')}</p>
        <div class="row">
          <button
            class="primary"
            data-action="print-sheet"
            ?disabled=${!available || this._busy !== null}
            @click=${() => void __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_printSheet).call(this)}
          >
            ${this._t('print_calibration_print_sheet')}
          </button>
          <button data-action="cancel-calibration" @click=${() => (this._step = 'closed')}>
            ${this._t('print_cancel')}
          </button>
        </div>
      `;
    }
    const bounds = this._bounds;
    return x `
      <form @submit=${(event) => void __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_recordMeasurement).call(this, event)} novalidate>
        <h4>${this._t('print_calibration_step_measure')}</h4>
        <p class="supporting">${this._t('print_calibration_step_measure_hint')}</p>
        <div class="measure">
          ${MEASUREMENT_FIELDS.map((field) => {
        const problem = this._problems[field];
        return x `
              <label>
                ${this._t(`print_measure_${field}`)}
                <input
                  type="text"
                  inputmode="decimal"
                  data-measure=${field}
                  aria-invalid=${problem ? 'true' : 'false'}
                  aria-describedby=${`hint-${field}${problem ? ` problem-${field}` : ''}`}
                  .value=${this._values[field] ?? ''}
                  @input=${(event) => {
            this._values = {
                ...this._values,
                [field]: event.target.value,
            };
        }}
                />
                <span class="reason" id=${`hint-${field}`}>
                  ${this._t(field === 'feed_mm' ? 'print_measure_hint_feed' : 'print_measure_hint_edge', {
            quantum: bounds?.quantum_mm ?? 0.01,
        })}
                </span>
                ${problem
            ? x `<p class="problem" id=${`problem-${field}`} data-problem=${problem}>
                      ${this._t(`print_measure_problem_${problem}`)}
                    </p>`
            : E}
              </label>
            `;
    })}
        </div>
        <div class="row">
          <button
            class="primary"
            type="submit"
            data-action="record"
            ?disabled=${this._busy !== null}
          >
            ${this._t('print_calibration_record')}
          </button>
          <button type="button" data-action="reprint" @click=${() => (this._step = 'print')}>
            ${this._t('print_calibration_reprint')}
          </button>
        </div>
      </form>
    `;
};
_GrowspaceLabelPrintPanel_renderTestPrint = function _GrowspaceLabelPrintPanel_renderTestPrint(model) {
    const blocked = testPrintBlockedBy(model, { admin: this._admin, deviceId: this._deviceId });
    const blockers = blocked === 'blocked' ? (model.render?.eligibility.test_print?.blocked_by ?? []) : [];
    return x `
      <section data-section="test-print" aria-labelledby="print-test">
        <h3 id="print-test">${this._t('print_test')}</h3>
        <p class="supporting">${this._t('print_test_hint')}</p>
        <button
          class="primary"
          data-action="test-print"
          ?disabled=${blocked !== null || this._busy !== null}
          aria-describedby=${blocked ? 'test-reason' : E}
          @click=${() => void __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_testPrint).call(this)}
        >
          ${this._t('print_test_action')}
        </button>
        ${blocked
        ? x `<p class="reason" id="test-reason" data-reason=${blocked}>
              ${__classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_blockerCopy).call(this, blocked)}
            </p>`
        : E}
        ${blockers.length > 0 ? __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_renderBlockers).call(this, blockers) : E}
      </section>
    `;
};
_GrowspaceLabelPrintPanel_renderBlockers = function _GrowspaceLabelPrintPanel_renderBlockers(blockers) {
    return x `
      <ul class="blockers" data-role="blockers">
        ${blockers.map((blocker) => x `<li data-blocker=${blocker}>${__classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_blockerCopy).call(this, blocker)}</li>`)}
      </ul>
    `;
};
_GrowspaceLabelPrintPanel_renderRecord = function _GrowspaceLabelPrintPanel_renderRecord() {
    const template = this._publishedRef;
    const record = this._record;
    const ready = !!template && !!this._deviceId && !!this._strainKey;
    const reason = !template
        ? 'unpublished'
        : !this._deviceId
            ? 'no_printer'
            : !this._strainKey
                ? 'no_strain'
                : null;
    const recovery = record && !record.decision.allowed ? record.recovery : null;
    const anyway = !!record && !record.decision.allowed && record.override_available;
    const recoveryLabel = recovery ? __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_recoveryLabel).call(this, recovery) : null;
    return x `
      <section data-section="record" aria-labelledby="print-record">
        <h3 id="print-record">${this._t('print_record')}</h3>
        <p class="supporting">${this._t('print_record_hint')}</p>
        <div class="row">
          <label>
            ${this._t('print_strain')}
            <select
              data-control="strain"
              .value=${this._strainKey}
              @change=${(event) => {
        this._strainKey = event.target.value;
        this._record = null;
    }}
            >
              ${this._strains.length === 0
        ? x `<option value="">${this._t('print_no_strains')}</option>`
        : this._strains.map((option) => x `<option value=${option.key} ?selected=${option.key === this._strainKey}>
                        ${option.phenotype && option.phenotype !== 'default'
            ? `${option.strain} · ${option.phenotype}`
            : option.strain}
                      </option>`)}
            </select>
          </label>
          <button
            data-action="preview-record"
            ?disabled=${!ready || this._busy !== null}
            aria-describedby=${reason ? 'record-reason' : E}
            @click=${() => void __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_previewRecord).call(this)}
          >
            ${this._t('print_record_preview')}
          </button>
        </div>
        ${reason
        ? x `<p class="reason" id="record-reason" data-reason=${reason}>
              ${__classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_blockerCopy).call(this, reason)}
            </p>`
        : E}
        ${record
        ? x `
              ${record.render.raster
            ? x `<img
                    class="record"
                    src=${record.render.raster.image}
                    alt=${this._t('print_record_alt', { subject: record.subject })}
                    width=${record.render.raster.width}
                    height=${record.render.raster.height}
                  />`
            : x `<p class="reason">${this._t('print_blocker_no_raster')}</p>`}
              ${record.decision.allowed
            ? E
            : __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_renderBlockers).call(this, record.decision.blocked_by)}
              ${__classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_renderWarnings).call(this, record)}
              <div class="row">
                <button
                  class="primary"
                  data-action="print-record"
                  ?disabled=${!record.decision.allowed || this._busy !== null}
                  aria-describedby=${record.decision.allowed
            ? E
            : anyway
                ? 'record-anyway'
                : 'record-blocked'}
                  @click=${() => void __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_printRecord).call(this)}
                >
                  ${this._t('print_record_action')}
                </button>
                ${anyway
            ? x `<button
                      data-action="print-record-anyway"
                      aria-describedby="record-anyway"
                      ?disabled=${this._busy !== null}
                      @click=${() => void __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_printRecord).call(this, true)}
                    >
                      ${this._t('print_record_anyway')}
                    </button>`
            : E}
                ${recovery && recoveryLabel
            ? x `<button
                      data-action="follow"
                      data-recovery=${recovery}
                      @click=${() => void __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_follow).call(this, recovery)}
                    >
                      ${recoveryLabel}
                    </button>`
            : E}
              </div>
              ${record.decision.allowed
            ? E
            : x `<p class="reason" id=${anyway ? 'record-anyway' : 'record-blocked'}>
                    ${this._t(anyway ? 'print_record_anyway_hint' : 'print_record_blocked_hint')}
                  </p>`}
            `
        : E}
      </section>
    `;
};
_GrowspaceLabelPrintPanel_renderWarnings = function _GrowspaceLabelPrintPanel_renderWarnings(record) {
    const warnings = record.render.diagnostics.filter((item) => item.severity === 'warning');
    if (warnings.length === 0)
        return E;
    return x `<p class="supporting" data-role="record-warnings">
      ${this._t('print_record_warnings', { count: warnings.length })}
    </p>`;
};
_GrowspaceLabelPrintPanel_renderRefusal = function _GrowspaceLabelPrintPanel_renderRefusal() {
    const refusal = this._refusal;
    if (!refusal)
        return E;
    const label = __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_recoveryLabel).call(this, refusal.recovery);
    return x `
      <div class="refusal" role="alert" data-code=${refusal.code}>
        <p>${__classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_refusalCopy).call(this, refusal)}</p>
        ${refusal.blocked_by && refusal.blocked_by.length > 0
        ? __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_renderBlockers).call(this, refusal.blocked_by)
        : E}
        <div class="row">
          ${label
        ? x `<button
                data-action="follow"
                data-recovery=${refusal.recovery}
                @click=${() => {
            this._refusal = null;
            void __classPrivateFieldGet(this, _GrowspaceLabelPrintPanel_instances, "m", _GrowspaceLabelPrintPanel_follow).call(this, refusal.recovery);
        }}
              >
                ${label}
              </button>`
        : E}
          <button data-action="dismiss-refusal" @click=${() => (this._refusal = null)}>
            ${this._t('editor_dismiss')}
          </button>
        </div>
      </div>
    `;
};
_GrowspaceLabelPrintPanel_renderFidelity = function _GrowspaceLabelPrintPanel_renderFidelity(model) {
    const quantum = this._bounds?.quantum_mm;
    return x `
      <section data-section="fidelity" aria-labelledby="print-fidelity">
        <h3 id="print-fidelity">${this._t('print_fidelity')}</h3>
        <dl class="fidelity">
          <dt>${this._t('print_fidelity_exact')}</dt>
          <dd data-role="fidelity-exact" data-settled=${model.rasterStanding === 'settled'}>
            ${this._t(model.rasterStanding === 'settled'
        ? 'print_fidelity_exact_settled'
        : 'print_fidelity_exact_not_settled')}
          </dd>
          <dt>${this._t('print_fidelity_calibrated')}</dt>
          <dd data-role="fidelity-calibrated">
            ${this._calibration?.state === 'current'
        ? this._t('print_fidelity_calibrated_current', { quantum: quantum ?? 0.01 })
        : this._t('print_fidelity_calibrated_none')}
          </dd>
          <dt>${this._t('print_fidelity_physical')}</dt>
          <dd data-role="fidelity-physical">${this._t('print_fidelity_physical_detail')}</dd>
        </dl>
      </section>
    `;
};
GrowspaceLabelPrintPanel.styles = [
    variables,
    i `
      :host {
        display: block;
        color: var(--primary-text-color);
      }
      section {
        border-top: 1px solid var(--divider-color);
        padding-block: 12px;
      }
      h3 {
        margin: 0 0 8px;
        font-size: 1rem;
      }
      h4 {
        margin: 8px 0 4px;
        font-size: 0.9rem;
      }
      .row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: end;
      }
      label {
        display: grid;
        gap: 4px;
        font-size: 0.875rem;
      }
      select,
      input,
      button {
        font: inherit;
        min-height: 44px;
        min-width: 44px;
        box-sizing: border-box;
      }
      /* A printer called "B1" is a real name, and a 30 px target. */
      select {
        min-width: 12em;
        max-width: 100%;
      }
      button {
        min-width: 44px;
        padding: 0 16px;
        border-radius: 8px;
        border: 1px solid var(--divider-color);
        background: var(--card-background-color, transparent);
        color: inherit;
        cursor: pointer;
      }
      button.primary {
        /* Darkened from the theme's primary so white text holds 4.5:1 on the
           default blue (2.6:1 undarkened) and on any lighter one. */
        background: color-mix(in srgb, var(--primary-color) 70%, black);
        color: var(--text-primary-color, #fff);
        border-color: transparent;
      }
      button:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }
      button:focus-visible,
      select:focus-visible,
      input:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
      .reason,
      .supporting {
        margin: 4px 0 0;
        font-size: 0.875rem;
        color: var(--secondary-text-color);
      }
      .state {
        display: inline-flex;
        gap: 6px;
        align-items: baseline;
        font-weight: 500;
      }
      /* The state is carried by a written word and a shape, never by colour. */
      .state[data-state='current']::before {
        content: '✓';
      }
      .state[data-state='stale']::before,
      .state[data-state='absent']::before {
        content: '!';
      }
      .measure {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 8px;
      }
      .problem {
        margin: 0;
        font-size: 0.8125rem;
        font-weight: 500;
      }
      .problem::before {
        content: '✕ ';
      }
      ul.blockers {
        margin: 4px 0;
        padding-inline-start: 20px;
      }
      .refusal {
        border: 2px solid var(--error-color);
        border-radius: 8px;
        padding: 8px 12px;
        margin-block: 8px;
      }
      img.record {
        display: block;
        max-width: 100%;
        image-rendering: pixelated;
        border: 1px solid var(--divider-color);
      }
      dl.fidelity {
        margin: 0;
        display: grid;
        gap: 4px;
      }
      dl.fidelity dt {
        font-weight: 500;
      }
      dl.fidelity dd {
        margin: 0 0 4px;
        font-size: 0.875rem;
        color: var(--secondary-text-color);
      }
      .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
      }
      @media (prefers-reduced-motion: reduce) {
        * {
          transition: none !important;
        }
      }
    `,
];
__decorate([
    n({ attribute: false })
], GrowspaceLabelPrintPanel.prototype, "capability", void 0);
__decorate([
    n({ attribute: false })
], GrowspaceLabelPrintPanel.prototype, "session", void 0);
__decorate([
    n({ attribute: false })
], GrowspaceLabelPrintPanel.prototype, "model", void 0);
__decorate([
    n({ type: String })
], GrowspaceLabelPrintPanel.prototype, "language", void 0);
__decorate([
    r()
], GrowspaceLabelPrintPanel.prototype, "_deviceId", void 0);
__decorate([
    r()
], GrowspaceLabelPrintPanel.prototype, "_profileId", void 0);
__decorate([
    r()
], GrowspaceLabelPrintPanel.prototype, "_calibration", void 0);
__decorate([
    r()
], GrowspaceLabelPrintPanel.prototype, "_bounds", void 0);
__decorate([
    r()
], GrowspaceLabelPrintPanel.prototype, "_step", void 0);
__decorate([
    r()
], GrowspaceLabelPrintPanel.prototype, "_sheetId", void 0);
__decorate([
    r()
], GrowspaceLabelPrintPanel.prototype, "_values", void 0);
__decorate([
    r()
], GrowspaceLabelPrintPanel.prototype, "_problems", void 0);
__decorate([
    r()
], GrowspaceLabelPrintPanel.prototype, "_strains", void 0);
__decorate([
    r()
], GrowspaceLabelPrintPanel.prototype, "_strainKey", void 0);
__decorate([
    r()
], GrowspaceLabelPrintPanel.prototype, "_record", void 0);
__decorate([
    r()
], GrowspaceLabelPrintPanel.prototype, "_busy", void 0);
__decorate([
    r()
], GrowspaceLabelPrintPanel.prototype, "_status", void 0);
__decorate([
    r()
], GrowspaceLabelPrintPanel.prototype, "_refusal", void 0);
__decorate([
    e('[data-control="profile"]')
], GrowspaceLabelPrintPanel.prototype, "_profileSelect", void 0);
__decorate([
    e('[data-control="printer"]')
], GrowspaceLabelPrintPanel.prototype, "_printerSelect", void 0);
GrowspaceLabelPrintPanel = __decorate([
    t('growspace-label-print-panel')
], GrowspaceLabelPrintPanel);

/**
 * The roving tabindex a `role="toolbar"` promises.
 *
 * A toolbar is one Tab stop: Tab enters it on the button last used and leaves
 * it on the next thing after it, and the arrow keys move between its buttons.
 * Without this every button is its own stop, and the Editor actions alone are
 * eight presses of Tab to get past -- which is what assistive technology was
 * told a toolbar would spare the user.
 *
 * Only Left, Right, Home and End belong to the toolbar. Up and Down are left to
 * bubble on purpose: these toolbars wrap onto several rows on a narrow screen,
 * so "down" names no button reliably, and the editor already gives those keys
 * a meaning -- nudging the selection -- that stays available wherever focus is.
 *
 * Disabled buttons are skipped rather than made focusable. A native `disabled`
 * button cannot take focus at all, so the stop has to move off one that
 * becomes disabled under it, and `syncRovingTabindex` is what moves it.
 */
/** The buttons a toolbar's arrow keys visit, nested groups included, in order. */
function items(toolbar) {
    return [...toolbar.querySelectorAll('button')].filter((button) => !button.disabled);
}
/** Make `current` the toolbar's one Tab stop. */
function rove(toolbar, current) {
    for (const button of toolbar.querySelectorAll('button')) {
        button.tabIndex = button === current ? 0 : -1;
    }
}
/**
 * Give the toolbar exactly one Tab stop.
 *
 * Called after every render, because a render is what disables the button
 * that held the stop -- Delete, once nothing is selected; Undo, once there is
 * nothing to undo -- and a toolbar whose only stop is disabled cannot be
 * reached by Tab at all. The stop stays where the user left it whenever it
 * still can.
 */
function syncRovingTabindex(toolbar) {
    const enabled = items(toolbar);
    const held = enabled.find((button) => button.getAttribute('tabindex') === '0');
    const current = held ?? enabled[0];
    if (current)
        rove(toolbar, current);
}
/** Moves the stop to whichever button took focus, by Tab, arrow or pointer. */
function onToolbarFocusIn(event) {
    const toolbar = event.currentTarget;
    const target = event.target;
    if (target instanceof HTMLButtonElement && !target.disabled && toolbar.contains(target)) {
        rove(toolbar, target);
    }
}
/** Left and Right step through the toolbar, wrapping; Home and End jump to its ends. */
function onToolbarKeyDown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
        return;
    const toolbar = event.currentTarget;
    const enabled = items(toolbar);
    if (enabled.length === 0)
        return;
    const from = enabled.indexOf(event.target);
    if (from === -1)
        return;
    let to;
    switch (event.key) {
        case 'ArrowRight':
            to = (from + 1) % enabled.length;
            break;
        case 'ArrowLeft':
            to = (from - 1 + enabled.length) % enabled.length;
            break;
        case 'Home':
            to = 0;
            break;
        case 'End':
            to = enabled.length - 1;
            break;
        default:
            return;
    }
    // Stopped here, not merely prevented: the editor's own keydown handler on
    // `.layout` reads these same arrows as a nudge of the selection.
    event.preventDefault();
    event.stopPropagation();
    rove(toolbar, enabled[to]);
    enabled[to].focus();
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
var _GrowspaceLabelEditor_instances, _GrowspaceLabelEditor_diagnosticSummary, _GrowspaceLabelEditor_slowAnnounced, _GrowspaceLabelEditor_unsubscribe, _GrowspaceLabelEditor_gesture, _GrowspaceLabelEditor_attach, _GrowspaceLabelEditor_stock_get, _GrowspaceLabelEditor_profile_get, _GrowspaceLabelEditor_announce, _GrowspaceLabelEditor_announceChanges, _GrowspaceLabelEditor_mintId, _GrowspaceLabelEditor_settled, _GrowspaceLabelEditor_onPointerDown, _GrowspaceLabelEditor_onPointerMove, _GrowspaceLabelEditor_onPointerUp, _GrowspaceLabelEditor_announceSelection, _GrowspaceLabelEditor_selectAll, _GrowspaceLabelEditor_nudgeSelection, _GrowspaceLabelEditor_align, _GrowspaceLabelEditor_distribute, _GrowspaceLabelEditor_reorder, _GrowspaceLabelEditor_duplicate, _GrowspaceLabelEditor_delete, _GrowspaceLabelEditor_addElement, _GrowspaceLabelEditor_reset, _GrowspaceLabelEditor_onElementChange, _GrowspaceLabelEditor_zoomBy, _GrowspaceLabelEditor_onKeyDown, _GrowspaceLabelEditor_renderStage, _GrowspaceLabelEditor_renderGuide, _GrowspaceLabelEditor_renderElement, _GrowspaceLabelEditor_renderHandle, _GrowspaceLabelEditor_elementName, _GrowspaceLabelEditor_renderElements, _GrowspaceLabelEditor_renderInspector, _GrowspaceLabelEditor_renderDiagnostics, _GrowspaceLabelEditor_renderDiagnostic, _GrowspaceLabelEditor_diagnosticCopy, _GrowspaceLabelEditor_diagnosticAction, _GrowspaceLabelEditor_goTo, _GrowspaceLabelEditor_onPanelRecovery, _GrowspaceLabelEditor_renderStanding, _GrowspaceLabelEditor_renderRefusal, _GrowspaceLabelEditor_renderBar, _GrowspaceLabelEditor_publish, _GrowspaceLabelEditor_icon, _GrowspaceLabelEditor_renderToolbar, _GrowspaceLabelEditor_discard;
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
        /** What was last said about the diagnostics, so only a change is announced. */
        _GrowspaceLabelEditor_diagnosticSummary.set(this, '');
        /** Whether the last render was slow, so the sentence is said once. */
        _GrowspaceLabelEditor_slowAnnounced.set(this, false);
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
    updated() {
        // Every render, because a render is what disables the button holding a
        // toolbar's one Tab stop, and the stop has to move before anyone tabs in.
        for (const toolbar of this.renderRoot.querySelectorAll('[role="toolbar"]')) {
            syncRovingTabindex(toolbar);
        }
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
          ${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_renderDiagnostics).call(this, model)}
          <growspace-label-print-panel
            .capability=${this.capability}
            .session=${this.session}
            .model=${model}
            .language=${this.language}
            @recovery=${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_onPanelRecovery)}
          ></growspace-label-print-panel>
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
_GrowspaceLabelEditor_diagnosticSummary = new WeakMap();
_GrowspaceLabelEditor_slowAnnounced = new WeakMap();
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
        __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_announceChanges).call(this, state);
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
_GrowspaceLabelEditor_announceChanges = function _GrowspaceLabelEditor_announceChanges(state) {
    const counts = countBySeverity(collectDiagnostics(state.validation, state.render));
    const summary = `${counts.error}|${counts.warning}`;
    if (summary !== __classPrivateFieldGet(this, _GrowspaceLabelEditor_diagnosticSummary, "f")) {
        const first = __classPrivateFieldGet(this, _GrowspaceLabelEditor_diagnosticSummary, "f") === '';
        __classPrivateFieldSet(this, _GrowspaceLabelEditor_diagnosticSummary, summary, "f");
        if (!first) {
            __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_announce).call(this, counts.error + counts.warning === 0
                ? this._t('editor_diagnostics_clear')
                : localizeWithParams('labels.editor_diagnostics_changed', { errors: counts.error, warnings: counts.warning }, this.language));
            return;
        }
    }
    if (state.renderSlow && !__classPrivateFieldGet(this, _GrowspaceLabelEditor_slowAnnounced, "f")) {
        __classPrivateFieldSet(this, _GrowspaceLabelEditor_slowAnnounced, true, "f");
        __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_announce).call(this, this._t('editor_raster_slow'));
    }
    else if (!state.rendering) {
        __classPrivateFieldSet(this, _GrowspaceLabelEditor_slowAnnounced, false, "f");
    }
};
_GrowspaceLabelEditor_mintId = function _GrowspaceLabelEditor_mintId() {
    const random = globalThis.crypto;
    return typeof random?.randomUUID === 'function'
        ? random.randomUUID()
        : `element-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};
_GrowspaceLabelEditor_settled = function _GrowspaceLabelEditor_settled() {
    this.session?.endGesture();
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
    // preventDefault above suppresses the browser's native mousedown->focus
    // for this button, so the keyboard nudge (#onKeyDown, bound on .layout)
    // would otherwise never see the keydown bubble up from anywhere.
    const target = event.currentTarget;
    target.focus({ preventScroll: true });
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
      ></button>
      ${only
        ? x `<div
            class="handles"
            style=${o(frameAsPercentages(element.frame, __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "a", _GrowspaceLabelEditor_stock_get)))}
          >
            ${HANDLES.map((handle) => __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_renderHandle).call(this, element, handle))}
          </div>`
        : E}
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
      </aside>
    `;
};
_GrowspaceLabelEditor_renderDiagnostics = function _GrowspaceLabelEditor_renderDiagnostics(model) {
    const entries = collectDiagnostics(model.validation, model.render);
    if (entries.length === 0)
        return E;
    const counts = countBySeverity(entries);
    return x `
      <section class="diagnostics-panel" aria-labelledby="editor-diagnostics">
        <h3 id="editor-diagnostics" tabindex="-1">
          ${this._t('editor_diagnostics')}
          <span class="supporting" data-role="diagnostic-counts">
            ${localizeWithParams('labels.editor_diagnostics_counts', { errors: counts.error, warnings: counts.warning }, this.language)}
          </span>
        </h3>
        <ol class="diagnostics" data-role="diagnostics">
          ${entries.map((entry) => __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_renderDiagnostic).call(this, entry, model))}
        </ol>
      </section>
    `;
};
_GrowspaceLabelEditor_renderDiagnostic = function _GrowspaceLabelEditor_renderDiagnostic(entry, model) {
    const element = entry.elementId
        ? model.document.elements.find((item) => item.id === entry.elementId)
        : undefined;
    const where = element
        ? localizeWithParams('labels.editor_diagnostic_on', { element: this._t(`editor_kind_${element.kind}`) }, this.language)
        : '';
    const action = __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_diagnosticAction).call(this, entry);
    return x `
      <li data-severity=${entry.severity} data-diagnostic=${entry.code}>
        <span class="severity" data-severity=${entry.severity}>
          ${this._t(`editor_severity_${entry.severity}`)}
        </span>
        <span class="copy">${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_diagnosticCopy).call(this, entry)} ${where}</span>
        ${action
        ? x `<button
              data-action="go-to"
              data-destination=${entry.destination}
              @click=${() => void __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_goTo).call(this, entry)}
            >
              ${action}
            </button>`
        : E}
      </li>
    `;
};
_GrowspaceLabelEditor_diagnosticCopy = function _GrowspaceLabelEditor_diagnosticCopy(entry) {
    for (const key of copyKeys(entry)) {
        const copy = localize(`labels.${key}`, '', '', this.language);
        if (copy !== `labels.${key}` && copy !== key)
            return copy;
    }
    return this._t('editor_severity_info');
};
_GrowspaceLabelEditor_diagnosticAction = function _GrowspaceLabelEditor_diagnosticAction(entry) {
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
};
_GrowspaceLabelEditor_goTo = 
/** Take the user to where one diagnostic is corrected, and put focus there. */
async function _GrowspaceLabelEditor_goTo(entry) {
    switch (entry.destination) {
        case 'element':
        case 'content': {
            if (entry.elementId === null)
                return;
            this.session?.select(entry.elementId);
            this._workbench = 'selection';
            __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_announceSelection).call(this);
            await this.updateComplete;
            const focused = entry.control ? await this._inspector?.focusControl(entry.control) : false;
            if (!focused)
                this._inspector?.focus();
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
};
_GrowspaceLabelEditor_onPanelRecovery = 
/** What the print panel hands back: a correction that lives in the editor. */
async function _GrowspaceLabelEditor_onPanelRecovery(event) {
    const { recovery } = event.detail;
    if (recovery === 'fix_layout') {
        const first = collectDiagnostics(this._model?.validation ?? null, this._model?.render ?? null)[0];
        if (first)
            await __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_goTo).call(this, first);
        else
            this.renderRoot.querySelector('#editor-diagnostics')?.focus();
        return;
    }
    if (recovery === 'publish') {
        this.renderRoot.querySelector('[data-action="publish"]')?.focus();
        __classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_announce).call(this, this._t('editor_publish_first'));
    }
};
_GrowspaceLabelEditor_renderStanding = function _GrowspaceLabelEditor_renderStanding(model) {
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
    return x `
      <p
        class="supporting"
        data-role="standing"
        data-standing=${model.rasterStanding}
        aria-busy=${model.rendering ? 'true' : 'false'}
      >
        ${this._t(key)}
      </p>
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
    const retry = refusal.recovery === 'retry_preview'
        ? () => void this.session?.render()
        : refusal.recovery === 'retry_save'
            ? () => void this.session?.save()
            : null;
    const copy = refusalCopy(refusal.code, this.language);
    return x `
      <div class="refusal" role="alert" data-code=${refusal.code}>
        <p>${copy}</p>
        ${reloadable
        ? x `<button data-action="reload" @click=${() => void this.session?.reload()}>
              ${this._t('editor_reload')}
            </button>`
        : E}
        ${retry
        ? x `<button data-action="retry" @click=${retry}>${this._t('editor_retry')}</button>`
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
      <div
        class="toolbar"
        role="toolbar"
        aria-label=${this._t('editor_toolbar')}
        @keydown=${onToolbarKeyDown}
        @focusin=${onToolbarFocusIn}
      >
        ${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_icon).call(this, 'undo', 'editor_undo', mdiUndo, () => {
        this.session?.undo();
    }, !model.canUndo)}
        ${__classPrivateFieldGet(this, _GrowspaceLabelEditor_instances, "m", _GrowspaceLabelEditor_icon).call(this, 'redo', 'editor_redo', mdiRedo, () => {
        this.session?.redo();
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
      <div
        class="toolbar"
        role="toolbar"
        aria-label=${this._t('editor_arrange')}
        @keydown=${onToolbarKeyDown}
        @focusin=${onToolbarFocusIn}
      >
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
      <div
        class="toolbar"
        role="toolbar"
        aria-label=${this._t('editor_view')}
        @keydown=${onToolbarKeyDown}
        @focusin=${onToolbarFocusIn}
      >
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
__decorate([
    e('growspace-label-inspector')
], GrowspaceLabelEditor.prototype, "_inspector", void 0);
__decorate([
    e('growspace-label-print-panel')
], GrowspaceLabelEditor.prototype, "_printPanel", void 0);
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
                this.failure = refusalCopy(answer.refusal.code, this.language);
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
    button(label, run, disabled = false, variant) {
        return x `<button
      type="button"
      class=${variant ?? E}
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
                this.failure = refusalCopy(answer.refusal.code, this.language);
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
                this.failure = refusalCopy(answer.refusal.code, this.language);
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
                this.failure = refusalCopy(answer.refusal.code, this.language);
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
        return x `<section class="catalogue" aria-labelledby="library-title">
        <div class="catalogue-head">
          <div>
            <h3 id="library-title">${this.t('title')}</h3>
            <p class="muted">
              ${this.t('default')}: <strong>${effective?.name ?? this.t('unavailable')}</strong>
            </p>
          </div>
          <div class="actions">
            ${this.button('blank', () => this.open(undefined, true))}${this.button('clear_default', () => this.stage('clear_default', { label_size_id: this.labelSizeId }), !library.defaults[this.labelSizeId], 'quiet')}
          </div>
        </div>
        ${templates.length
            ? templates.map((item) => x `<div class="row template">
                  <div class="template-name">
                    <strong>${item.name}</strong
                    ><span class="revision">r${item.head_revision}</span>
                  </div>
                  ${item.quarantined
                ? x `<p class="error">${this.t('quarantined')}</p>
                        <ul>
                          ${item.quarantine?.diagnostics.map((d) => x `<li>${d.message}</li>`)}
                        </ul>`
                : E}
                  <div class="actions">
                    ${this.button('edit', () => this.open(item.id), item.quarantined, 'tonal')}
                    ${this.button('rename', () => this.stage('rename', { template_id: item.id }, item.name), false, 'quiet')}
                    ${this.button('duplicate', () => this.stage('duplicate', { ref: { kind: 'named', id: item.id } }, ''), item.quarantined, 'quiet')}
                    ${this.button('set_default', () => this.stage('set_default', {
                label_size_id: item.label_size_id,
                ref: { kind: 'named', id: item.id },
            }), item.quarantined, 'quiet')}
                    ${this.button('inspect', () => void this.read('inspect', { template_id: item.id }), false, 'quiet')}
                    ${this.button('export', () => void this.read('export', { refs: [{ kind: 'named', id: item.id }] }), false, 'quiet')}
                    ${this.button('replace_factory', () => this.stage('replace_factory', { template_id: item.id }), false, 'quiet')}
                    ${this.button('delete', () => this.stage('delete', { template_id: item.id }), false, 'danger')}
                  </div>
                </div>`)
            : x `<p class="empty">${this.t('empty')}</p>`}
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
      <details class="fold">
        <summary>${this.t('drafts')} <span class="count">${library.drafts.length}</span></summary>
        <div class="fold-body">
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
                  ${this.button('resume', () => this.open(draft.template_id ?? undefined, false, draft), false, 'tonal')}
                  ${this.button('export_work', () => downloadTemplateData(draft, 'label-draft-recovery.json'), false, 'quiet')}
                  ${this.button('save_as', () => this.stage('save_as', {
            ...(draft.template_id
                ? { template_id: draft.template_id }
                : { label_size_id: draft.label_size_id }),
            draft_id: draft.id,
        }, ''), false, 'quiet')}
                  ${draft.recovery
            ? this.button('inspect_recovery', () => {
                this.recovery = draft;
            }, false, 'quiet')
            : E}
                  ${this.button('discard', () => this.stage('discard', draft.template_id
            ? { template_id: draft.template_id }
            : { label_size_id: draft.label_size_id }), false, 'danger')}
                </div>
              </div>`)}
        </div>
      </details>
      ${this.recovery
            ? x `<section>
            <h3>${this.t('inspect_recovery')}</h3>
            <pre>${JSON.stringify(this.recovery.recovery, null, 2)}</pre>
            ${this.button('export_work', () => downloadTemplateData(this.recovery?.recovery, 'label-rejected-work.json'))}
          </section>`
            : E}
      <details class="fold">
        <summary>
          ${this.t('deleted')} <span class="count">${library.tombstones.length}</span>
        </summary>
        <div class="fold-body">
          ${library.tombstones.map((stone) => x `<div class="row">
                <strong>${stone.template.name}</strong>
                <p>${this.t('expires')} ${stone.expires_at}</p>
                <div class="actions">
                  ${this.button('restore', () => this.stage('restore', { template_id: stone.template.id }, stone.template.name), false, 'tonal')}${this.button('inspect', () => void this.read('inspect', { template_id: stone.template.id }), false, 'quiet')}
                </div>
              </div>`)}
        </div>
      </details>
      <details class="fold">
        <summary>${this.t('transfer')}</summary>
        <div class="fold-body">
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
        </div>
      </details>`;
    }
};
GrowspaceTemplateLibrary.styles = i `
    :host {
      display: block;
      color: var(--primary-text-color);
      min-width: 0;
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

    /* ---- The catalogue: a header, a list of templates, then the folds. ---- */

    .catalogue {
      margin: 0;
    }
    .catalogue-head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--divider-color);
    }
    .catalogue-head h3 {
      margin: 0 0 2px;
      font-size: var(--font-size-md, 16px);
      font-weight: 500;
      line-height: 1.3;
    }
    .catalogue-head p {
      margin: 0;
      font-size: var(--font-size-sm, 13px);
    }
    .catalogue-head strong {
      font-weight: 500;
      color: var(--primary-text-color);
    }
    .catalogue-head .actions {
      margin: 0;
    }
    .template {
      padding-block: 16px;
    }
    .template-name {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 4px 8px;
      overflow-wrap: anywhere;
    }
    .template-name strong {
      font-weight: 500;
    }
    .revision {
      font-size: var(--font-size-xs, 11px);
      font-variant-numeric: tabular-nums;
      color: var(--secondary-text-color);
    }
    .template .actions {
      margin: 12px 0 0;
      gap: 4px;
    }
    .template > p,
    .template > ul {
      margin: 8px 0 0;
    }

    /* Row actions: one tonal primary, the rest quiet, the destructive one
       set apart at the far end so it is never the neighbour of a routine
       click. */
    button.tonal {
      border-color: color-mix(in srgb, var(--primary-color, #4caf50) 55%, transparent);
      background: color-mix(in srgb, var(--primary-color, #4caf50) 12%, transparent);
      font-weight: 500;
      padding-inline: 16px;
    }
    button.tonal:hover {
      background: color-mix(in srgb, var(--primary-color, #4caf50) 20%, transparent);
    }
    button.quiet,
    button.danger {
      border-color: transparent;
      background: transparent;
      padding-inline: 10px;
    }
    button.quiet:hover {
      background: var(--secondary-background-color);
    }
    button.danger {
      margin-inline-start: auto;
      color: var(--error-color, #f44336);
    }
    button.danger:hover {
      background: color-mix(in srgb, var(--error-color, #f44336) 10%, transparent);
    }
    .empty {
      margin: 0;
      padding-block: 16px;
      border-bottom: 1px solid var(--divider-color);
      color: var(--secondary-text-color);
    }

    /* Drafts, deleted templates and transfer are rarer than the list above,
       so they fold away as three rows of one list rather than three blocks. */
    details.fold {
      margin: 0;
      border-bottom: 1px solid var(--divider-color);
    }
    section:not(.catalogue) + details.fold {
      border-top: 1px solid var(--divider-color);
    }
    details.fold > summary {
      display: flex;
      align-items: center;
      gap: 12px;
      list-style: none;
      font-weight: 500;
    }
    details.fold > summary::-webkit-details-marker {
      display: none;
    }
    details.fold > summary::before {
      content: '';
      flex: none;
      width: 6px;
      height: 6px;
      margin-inline: 3px 1px;
      border-right: 2px solid currentColor;
      border-bottom: 2px solid currentColor;
      transform: rotate(-45deg);
      opacity: 0.7;
      transition: transform var(--md3-motion-duration-short4, 200ms)
        var(--md3-motion-easing-standard, ease);
    }
    details.fold[open] > summary::before {
      transform: rotate(45deg);
    }
    .count {
      min-width: 20px;
      padding: 0 6px;
      border-radius: var(--border-radius-full, 9999px);
      background: color-mix(in srgb, currentColor 12%, transparent);
      color: var(--secondary-text-color);
      font-size: var(--font-size-xs, 11px);
      font-variant-numeric: tabular-nums;
      line-height: 20px;
      text-align: center;
      font-weight: 400;
    }
    .fold-body {
      padding: 0 0 16px 22px;
    }
    .fold-body > p:first-child {
      margin-top: 0;
      color: var(--secondary-text-color);
    }
    .fold-body .row:last-child {
      border-bottom: 0;
    }
    .fold-body .row > p {
      margin: 4px 0 0;
      color: var(--secondary-text-color);
    }
    .fold-body .row > .actions {
      margin: 12px 0 0;
      gap: 4px;
    }
    @media (prefers-reduced-motion: reduce) {
      details.fold > summary::before {
        transition: none;
      }
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
 * The batch wire: one reviewed preflight, a job that prints it, and a retry
 * of the failures.
 *
 * Every answer is `ok` or `refused`, like the single-print commands beside
 * it. What is new is that the **preflight is held**: `preflight_label_batch`
 * answers with a `preflight_id`, and a print names that ID and — when the
 * review had warnings — the preflight `identity` it consented to. The card
 * never sends a record back, because every raster carries the instant the
 * batch was captured and no second request could reproduce it.
 *
 * Printing is a **job**, read back while it runs: each attempt is `pending`,
 * `printed` or `failed`, in the copy-major order the preflight planned.
 *
 * Every field the backend emits is declared (ADR 0031).
 */
/** One captured plant and the authoritative raster the preflight produced. */
const BatchRecordSchema = object({
    /** Zero-based, in the order the plants were submitted. */
    index: number().int(),
    /** The plant ID this record captured. */
    subject: string(),
    snapshot_identity: string(),
    decision: OperationEligibilitySchema,
    render: RenderResultSchema,
});
/**
 * One physical label in the plan: one record, one copy.
 *
 * `status` is a string rather than an enum for the reason calibration state
 * is: a newer backend's word must not blank a batch mid-print. The card
 * treats anything it does not know as not yet printed.
 */
const BatchAttemptSchema = object({
    id: string(),
    /** Zero-based position in the copy-major plan: A1, B1, A2, B2. */
    position: number().int(),
    record_index: number().int(),
    subject: string(),
    snapshot_identity: string(),
    /** One-based. */
    copy_index: number().int(),
    status: string(),
});
/** One render diagnostic, attributed to the record it came from. */
const BatchDiagnosticSchema = object({
    record_index: number().int(),
    subject: string(),
    snapshot_identity: string(),
    diagnostic: DiagnosticSchema,
});
/** The printer settings and calibration the whole batch was judged against. */
const BatchPrinterSchema = object({
    device_id: string(),
    density: string(),
    firmware: string().nullable(),
    calibration_identity: string().nullable(),
    calibration_state: string(),
    calibration_stale_reasons: array(string()),
    /** Advice that needs acknowledging like any other batch warning. */
    calibration_warnings: array(string()),
});
/** The complete, immutable review boundary for one batch. */
const BatchPreflightSchema = object({
    /** What warning consent is bound to. Any change to the batch changes it. */
    identity: string(),
    /** Whether every record authorizes the batch as a whole. */
    allowed: boolean(),
    acknowledgement_required: boolean(),
    /** Every distinct hard refusal across the records. */
    blocked_by: array(string()),
    /**
     * Whether every refusal is about how far the printer has been proven — an
     * unverified profile, a missing or stale calibration — so the user may
     * print anyway. Absent from a backend older than the override.
     */
    override_available: boolean().default(false),
    source: PrintSourceSchema,
    profile: CapabilityProfileSchema,
    printer: BatchPrinterSchema,
    records: array(BatchRecordSchema),
    attempts: array(BatchAttemptSchema),
    diagnostics: array(BatchDiagnosticSchema),
});
const BatchPreflightAnswerSchema = answer({
    template: ResolvedTemplateSchema,
    preflight_id: string(),
    /** The one correction to make first, or `none`. */
    recovery: string(),
    preflight: BatchPreflightSchema,
});
/** One attempt as a job reports it: the plan entry and its latest outcome. */
const BatchJobAttemptSchema = BatchAttemptSchema.extend({
    /** The printer's own words when it failed. Shown as detail, never as copy. */
    error: string().nullable(),
    /** What reached paper, once it did. */
    raster_identity: string().nullable(),
    raster_input_digest: string().nullable(),
});
/** A whole-batch gate that refused after the job had started. */
const BatchJobRefusalSchema = object({
    operation: string(),
    blocked_by: array(string()),
    reason: string(),
    recovery: string(),
});
/** One print or retry of a held preflight, as it stands right now. */
const BatchJobSchema = object({
    id: string(),
    preflight_id: string(),
    preflight_identity: string(),
    /** The job this one retries, or `null` for the first print. */
    retry_of: string().nullable(),
    /** `running`, `finished` or `refused`; open for the reason `status` is. */
    state: string(),
    /** The attempts this job sends, in plan order. */
    selected: array(string()),
    /** Every attempt of the plan, not only the selected ones. */
    attempts: array(BatchJobAttemptSchema),
    refusal: BatchJobRefusalSchema.nullable(),
});
const BatchJobAnswerSchema = answer({ job: BatchJobSchema });

/**
 * The four batch calls: preflight, print, watch, retry.
 *
 * Contract-gated through the same {@link gated} as the single-print calls,
 * and under the same rule: nothing here retries on its own. A refused batch
 * was refused under one preflight identity; printing it again under another
 * is a new review, and "retry" means only the attempts that failed.
 */
const WS_PREFLIGHT_LABEL_BATCH = 'growspace_manager/preflight_label_batch';
const WS_PRINT_LABEL_BATCH = 'growspace_manager/print_label_batch';
const WS_GET_LABEL_BATCH_JOB = 'growspace_manager/get_label_batch_job';
const WS_RETRY_LABEL_BATCH = 'growspace_manager/retry_label_batch';
const MAX_BATCH_COPIES = 10;
/** Capture and render every plant, and hold the review. Prints nothing. */
function preflightLabelBatch(request) {
    return gated(WS_PREFLIGHT_LABEL_BATCH, {
        template: request.template,
        plant_ids: request.plantIds,
        copies: request.copies,
        ...(request.profileId ? { profile_id: request.profileId } : {}),
        device_id: request.deviceId,
        ...(request.density ? { density: request.density } : {}),
        ...(request.locale ? { locale: request.locale } : {}),
    }, BatchPreflightAnswerSchema);
}
/**
 * Start printing the reviewed batch.
 *
 * `acknowledgement` is the preflight identity the user consented to, sent
 * only when they did; the backend refuses consent that belongs to another
 * review. `override` is the same identity, sent only when the user chose to
 * print past an unproven printer.
 */
function printLabelBatch(preflightId, acknowledgement, override = null) {
    return gated(WS_PRINT_LABEL_BATCH, { preflight_id: preflightId, ...consent(acknowledgement, override) }, BatchJobAnswerSchema);
}
function consent(acknowledgement, override) {
    return {
        ...(acknowledgement ? { acknowledgement } : {}),
        ...(override ? { override } : {}),
    };
}
/** Read one job as it stands. */
function fetchLabelBatchJob(jobId) {
    return gated(WS_GET_LABEL_BATCH_JOB, { job_id: jobId }, BatchJobAnswerSchema);
}
/** Print one finished job's failed attempts again, from the same review. */
function retryLabelBatch(jobId, acknowledgement, override = null) {
    return gated(WS_RETRY_LABEL_BATCH, { job_id: jobId, ...consent(acknowledgement, override) }, BatchJobAnswerSchema);
}

/**
 * What a batch review, a running job and a retry mean — without a DOM.
 *
 * The view renders what these decide. Kept apart because every rule here is
 * a claim the ticket makes about the batch (where review starts, what consent
 * covers, what retry sends) and each is easier to hold in a unit test than
 * behind a dialog.
 */
/**
 * Blockers about the whole batch rather than about one record.
 *
 * A record's own problems are its diagnostics; these are the printer, the
 * profile and the calibration, identical for every record, so they are shown
 * once above the records instead of making every record read as broken.
 */
const RECORD_BLOCKERS = new Set(['blocking_diagnostics', 'no_raster']);
const SEVERITY_ORDER = { error: 0, warning: 1, info: 2 };
/**
 * The diagnostics of one record, errors first.
 *
 * Within a severity the backend's own order is kept; across them, the one
 * thing that stops the batch is never below a list of things that do not.
 */
function recordDiagnostics(preflight, index) {
    return preflight.diagnostics
        .filter((item) => item.record_index === index)
        .map((item, order) => ({ item, order }))
        .sort((a, b) => (SEVERITY_ORDER[a.item.diagnostic.severity] ?? 3) -
        (SEVERITY_ORDER[b.item.diagnostic.severity] ?? 3) || a.order - b.order)
        .map(({ item }) => item);
}
/** The worst thing about one record. A record with no picture is an error. */
function recordSeverity(preflight, index) {
    const record = preflight.records[index];
    if (!record)
        return 'ok';
    const diagnostics = recordDiagnostics(preflight, index);
    if (record.render.raster === null ||
        record.decision.blocked_by.some((blocker) => RECORD_BLOCKERS.has(blocker)) ||
        diagnostics.some((item) => item.diagnostic.severity === 'error')) {
        return 'error';
    }
    return diagnostics.some((item) => item.diagnostic.severity === 'warning') ? 'warning' : 'ok';
}
/** The batch-wide reasons the whole job cannot print, in correction order. */
function batchBlockers(preflight) {
    return preflight.blocked_by.filter((blocker) => !RECORD_BLOCKERS.has(blocker));
}
/** How many records carry an error, and how many only a warning. */
function severityCounts(preflight) {
    const counts = { error: 0, warning: 0, ok: 0 };
    preflight.records.forEach((_, index) => {
        counts[recordSeverity(preflight, index)] += 1;
    });
    return counts;
}
/** Where review starts: the first error, else the first warning, else the first record. */
function initialFocus(preflight) {
    const severities = preflight.records.map((_, index) => recordSeverity(preflight, index));
    const error = severities.indexOf('error');
    if (error >= 0)
        return error;
    const warning = severities.indexOf('warning');
    return warning >= 0 ? warning : 0;
}
/**
 * The next record of one severity from `from`, wrapping, or `null` if none.
 *
 * Wrapping because "next warning" from the last one should reach the first
 * rather than stop, and `null` rather than `from` so the view can disable the
 * control when there is nowhere else to go.
 */
function nextFlagged(preflight, from, severity, direction) {
    const count = preflight.records.length;
    for (let step = 1; step <= count; step += 1) {
        const index = (((from + direction * step) % count) + count) % count;
        if (recordSeverity(preflight, index) === severity) {
            return index === from ? null : index;
        }
    }
    return null;
}
function acknowledgementState(preflight, acknowledged) {
    if (!preflight.acknowledgement_required)
        return 'not_required';
    if (acknowledged === null)
        return 'missing';
    return acknowledged === preflight.identity ? 'current' : 'stale';
}
/** How many warnings consent covers: every record warning and calibration advice. */
function warningCount(preflight) {
    return (preflight.diagnostics.filter((item) => item.diagnostic.severity === 'warning').length +
        preflight.printer.calibration_warnings.length);
}
/**
 * Whether printing may be asked for; the backend decides again regardless.
 *
 * `anyway` asks whether printing past the refusals would be allowed: only
 * when every refusal is about an unproven printer, and never instead of
 * acknowledging warnings.
 */
function mayPrint(preflight, acknowledged, changedSinceReview, anyway = false) {
    if (changedSinceReview)
        return false;
    if (!preflight.allowed && !(anyway && preflight.override_available))
        return false;
    const consent = acknowledgementState(preflight, acknowledged);
    return consent === 'not_required' || consent === 'current';
}
/** Where one job is, counted over the attempts it sends. */
function jobProgress(job) {
    const selected = new Set(job.selected);
    let printed = 0;
    let failed = 0;
    let pending = 0;
    let printedOverall = 0;
    for (const attempt of job.attempts) {
        if (attempt.status === 'printed')
            printedOverall += 1;
        if (!selected.has(attempt.id))
            continue;
        if (attempt.status === 'printed')
            printed += 1;
        else if (attempt.status === 'failed')
            failed += 1;
        else
            pending += 1;
    }
    return {
        selected: selected.size,
        printed,
        failed,
        pending,
        printedOverall,
        total: job.attempts.length,
        finished: job.state !== 'running',
    };
}
/** The attempts a retry would send, in their original order. */
function failedAttempts(job) {
    return job.attempts.filter((attempt) => attempt.status === 'failed');
}
/** Whether a retry may be asked for. */
function mayRetry(job) {
    return job.state === 'finished' && failedAttempts(job).length > 0;
}

/**
 * `<growspace-label-batch>` — one batch of plant labels, reviewed, printed,
 * watched and retried through the Label Template path.
 *
 * Four phases, each the answer to one question:
 *
 * 1. **Setup.** Which published template, printer, profile and copy count.
 * 2. **Review.** The backend's preflight of every plant: every record's
 *    raster, its problems, and the exact order the labels will print in.
 *    Review opens on the first error, else the first warning, and the user
 *    can jump between them. A hard error anywhere prevents all output;
 *    warnings are acknowledged against the exact preflight identity, and any
 *    change to the setup afterwards visibly voids that acknowledgement.
 * 3. **Printing.** The job, polled: every record and copy, pending, printed
 *    or failed, in plan order.
 * 4. **Done.** What reached paper and what did not. Retry sends only the
 *    failed copies, from the snapshots and settings already reviewed — and
 *    says so, because "retry" that re-read a plant would print a label
 *    nobody looked at.
 *
 * Every rule about what may be pressed is in `batch-review.ts`; the backend
 * decides again on every call regardless.
 *
 * A plant's own "Print label" is this same view over a one-plant batch
 * (`single`): the same preflight, consent and print routes, so the backend
 * needs nothing new. Only the words change — there is nothing to move
 * between, no print order worth explaining, and "the batch" is not what a
 * user printing one plant's label is looking at.
 */
var _GrowspaceLabelBatch_instances, _GrowspaceLabelBatch_poll, _GrowspaceLabelBatch_first, _GrowspaceLabelBatch_say, _GrowspaceLabelBatch_plant, _GrowspaceLabelBatch_refusalCopy, _GrowspaceLabelBatch_blockerCopy, _GrowspaceLabelBatch_factoryOptions, _GrowspaceLabelBatch_loadTemplates, _GrowspaceLabelBatch_edit, _GrowspaceLabelBatch_preflight, _GrowspaceLabelBatch_goTo, _GrowspaceLabelBatch_acknowledge, _GrowspaceLabelBatch_print, _GrowspaceLabelBatch_printAnyway, _GrowspaceLabelBatch_retry, _GrowspaceLabelBatch_override, _GrowspaceLabelBatch_consent, _GrowspaceLabelBatch_start, _GrowspaceLabelBatch_take, _GrowspaceLabelBatch_schedulePoll, _GrowspaceLabelBatch_stopPolling, _GrowspaceLabelBatch_readJob, _GrowspaceLabelBatch_recover, _GrowspaceLabelBatch_transportRefusal, _GrowspaceLabelBatch_announce, _GrowspaceLabelBatch_renderSetup, _GrowspaceLabelBatch_renderRefusal, _GrowspaceLabelBatch_renderReview, _GrowspaceLabelBatch_renderAnyway, _GrowspaceLabelBatch_renderNavigation, _GrowspaceLabelBatch_renderRecord, _GrowspaceLabelBatch_renderPlan, _GrowspaceLabelBatch_renderConsent, _GrowspaceLabelBatch_renderJob;
/** How often a running job is read back. */
const BATCH_POLL_MS = 750;
let GrowspaceLabelBatch = class GrowspaceLabelBatch extends i$1 {
    constructor() {
        super(...arguments);
        _GrowspaceLabelBatch_instances.add(this);
        /** The plants to print, in the order their labels are wanted. */
        this.plantIds = [];
        this.language = 'en';
        /** One plant's label rather than a batch: the same flow, worded for one. */
        this.single = false;
        this._templates = [];
        this._templateKey = '';
        this._deviceId = '';
        this._profileId = '';
        this._copies = 1;
        this._busy = false;
        this._refusal = null;
        this._review = null;
        /** The setup moved after the review was taken; it no longer describes the job. */
        this._changed = false;
        /** The preflight identity the user consented to, if any. */
        this._acknowledged = null;
        /** The preflight identity the user chose to print anyway, if any. */
        this._overridden = null;
        this._focus = 0;
        this._job = null;
        this._announcement = '';
        _GrowspaceLabelBatch_poll.set(this, null);
    }
    connectedCallback() {
        super.connectedCallback();
        void __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_loadTemplates).call(this);
        const printers = getPrinters(getHass());
        if (!this._deviceId)
            this._deviceId = printers[0]?.id ?? '';
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_stopPolling).call(this);
    }
    willUpdate(changed) {
        if (changed.has('capability') && this.capability && this._templates.length === 0) {
            this._templates = __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_factoryOptions).call(this);
            this._templateKey ||= this._templates[0]?.key ?? '';
        }
        if (changed.has('capability') || changed.has('_templateKey')) {
            const profiles = this._profiles;
            if (!profiles.some((profile) => profile.id === this._profileId)) {
                this._profileId = profiles[0]?.id ?? '';
            }
        }
    }
    // -------------------------------------------------------------------------
    // Copy
    // -------------------------------------------------------------------------
    _t(key, params) {
        return params
            ? localizeWithParams(`labels.${key}`, params, this.language)
            : localize(`labels.${key}`, '', '', this.language);
    }
    _has(key) {
        return this._t(key) !== `labels.${key}` && this._t(key) !== key;
    }
    get _template() {
        return this._templates.find((item) => item.key === this._templateKey) ?? null;
    }
    get _profiles() {
        const template = this._template;
        return this.capability && template
            ? profilesForSize(this.capability, template.labelSizeId)
            : [];
    }
    // -------------------------------------------------------------------------
    // Rendering
    // -------------------------------------------------------------------------
    render() {
        const printing = this._job !== null && !jobProgress(this._job).finished;
        return x `
      ${__classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_renderSetup).call(this, printing)} ${__classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_renderRefusal).call(this)}
      ${this._review ? __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_renderReview).call(this, this._review, printing) : E}
      ${this._job ? __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_renderJob).call(this, this._job) : E}
      <p class="visually-hidden" role="status" aria-live="polite">${this._announcement}</p>
    `;
    }
};
_GrowspaceLabelBatch_poll = new WeakMap();
_GrowspaceLabelBatch_instances = new WeakSet();
_GrowspaceLabelBatch_first = function _GrowspaceLabelBatch_first(keys, fallback) {
    const found = keys.find((key) => this._has(key));
    return found ? this._t(found) : this._t(fallback);
};
_GrowspaceLabelBatch_say = function _GrowspaceLabelBatch_say(key, params = {}, count) {
    if (this.single) {
        const single = key.replace(/^batch_/, 'single_');
        if (count !== undefined && this._has(`${single}_other`)) {
            return localizePlural(`labels.${single}`, count, params, this.language);
        }
        if (this._has(single))
            return this._t(single, params);
    }
    return this._t(key, params);
};
_GrowspaceLabelBatch_plant = function _GrowspaceLabelBatch_plant(plantId) {
    return this.describePlant?.(plantId) || plantId;
};
_GrowspaceLabelBatch_refusalCopy = function _GrowspaceLabelBatch_refusalCopy(refusal) {
    return refusalCopy(refusal.code, this.language, this.single ? ['single_refusal_', 'batch_refusal_'] : ['batch_refusal_']);
};
_GrowspaceLabelBatch_blockerCopy = function _GrowspaceLabelBatch_blockerCopy(blocker) {
    return __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_first).call(this, [`batch_blocker_${blocker}`, `print_blocker_${blocker}`], 'print_blocker_generic');
};
_GrowspaceLabelBatch_factoryOptions = function _GrowspaceLabelBatch_factoryOptions() {
    return (this.capability?.catalogues.factory_templates ?? []).map((item) => ({
        key: `factory:${item.id}`,
        kind: 'factory',
        id: item.id,
        name: item.name,
        labelSizeId: item.label_size_id,
    }));
};
_GrowspaceLabelBatch_loadTemplates = async function _GrowspaceLabelBatch_loadTemplates() {
    try {
        const answer = await fetchLabelTemplateLibrary();
        if (answer.outcome !== 'ok')
            return;
        const named = answer.library.templates
            .filter((item) => item.head_revision > 0)
            .map((item) => ({
            key: `named:${item.id}`,
            kind: item.kind,
            id: item.id,
            name: item.name,
            labelSizeId: item.label_size_id,
        }));
        this._templates = [...named, ...__classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_factoryOptions).call(this)];
        if (!this._templates.some((item) => item.key === this._templateKey)) {
            this._templateKey = this._templates[0]?.key ?? '';
        }
    }
    catch {
        // The Factory Templates are enough to print from; the library is extra.
    }
};
_GrowspaceLabelBatch_edit = function _GrowspaceLabelBatch_edit(apply) {
    apply();
    // Anything the preflight was taken under now differs from the screen.
    if (this._review)
        this._changed = true;
};
_GrowspaceLabelBatch_preflight = 
// -------------------------------------------------------------------------
// Review
// -------------------------------------------------------------------------
async function _GrowspaceLabelBatch_preflight() {
    const template = this._template;
    if (!template || !this._deviceId || this.plantIds.length === 0)
        return;
    this._busy = true;
    this._refusal = null;
    try {
        const answer = await preflightLabelBatch({
            template: { kind: template.kind, id: template.id },
            plantIds: this.plantIds,
            copies: this._copies,
            profileId: this._profileId || null,
            deviceId: this._deviceId,
        });
        if (answer.outcome === 'refused') {
            this._refusal = answer.refusal;
            return;
        }
        this._review = answer;
        this._changed = false;
        this._job = null;
        this._focus = initialFocus(answer.preflight);
        const counts = severityCounts(answer.preflight);
        __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_announce).call(this, this.single
            ? this._t(`single_reviewed_${recordSeverity(answer.preflight, 0)}`)
            : this._t('batch_reviewed', {
                records: answer.preflight.records.length,
                labels: answer.preflight.attempts.length,
                errors: counts.error,
                warnings: counts.warning,
            }));
        await this.updateComplete;
        this.renderRoot.querySelector('[data-role="record"] h4')?.focus();
    }
    catch {
        this._refusal = __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_transportRefusal).call(this);
    }
    finally {
        this._busy = false;
    }
};
_GrowspaceLabelBatch_goTo = function _GrowspaceLabelBatch_goTo(index) {
    if (index === null)
        return;
    this._focus = index;
};
_GrowspaceLabelBatch_acknowledge = function _GrowspaceLabelBatch_acknowledge(checked) {
    this._acknowledged = checked && this._review ? this._review.preflight.identity : null;
};
_GrowspaceLabelBatch_print = 
// -------------------------------------------------------------------------
// Printing
// -------------------------------------------------------------------------
async function _GrowspaceLabelBatch_print() {
    const review = this._review;
    if (!review || !mayPrint(review.preflight, this._acknowledged, this._changed))
        return;
    await __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_start).call(this, () => printLabelBatch(review.preflight_id, __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_consent).call(this)));
};
_GrowspaceLabelBatch_printAnyway = 
/** Print past an unproven printer, with consent bound to this exact review. */
async function _GrowspaceLabelBatch_printAnyway() {
    const review = this._review;
    if (!review || !mayPrint(review.preflight, this._acknowledged, this._changed, true))
        return;
    const identity = review.preflight.identity;
    this._overridden = identity;
    await __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_start).call(this, () => printLabelBatch(review.preflight_id, __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_consent).call(this), identity));
};
_GrowspaceLabelBatch_retry = async function _GrowspaceLabelBatch_retry() {
    const job = this._job;
    if (!job || !mayRetry(job))
        return;
    await __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_start).call(this, () => retryLabelBatch(job.id, __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_consent).call(this), __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_override).call(this)));
};
_GrowspaceLabelBatch_override = function _GrowspaceLabelBatch_override() {
    const identity = this._review?.preflight.identity;
    return identity && this._overridden === identity ? identity : null;
};
_GrowspaceLabelBatch_consent = function _GrowspaceLabelBatch_consent() {
    const review = this._review;
    if (!review)
        return null;
    return acknowledgementState(review.preflight, this._acknowledged) === 'current'
        ? this._acknowledged
        : null;
};
_GrowspaceLabelBatch_start = async function _GrowspaceLabelBatch_start(call) {
    this._busy = true;
    this._refusal = null;
    try {
        const answer = await call();
        if (answer.outcome === 'refused') {
            this._refusal = answer.refusal;
            return;
        }
        __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_take).call(this, answer.job);
    }
    catch {
        this._refusal = __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_transportRefusal).call(this);
    }
    finally {
        this._busy = false;
    }
};
_GrowspaceLabelBatch_take = function _GrowspaceLabelBatch_take(job) {
    this._job = job;
    const progress = jobProgress(job);
    if (progress.finished) {
        __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_stopPolling).call(this);
        __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_announce).call(this, job.state === 'refused'
            ? this._t('batch_job_refused')
            : __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_say).call(this, 'batch_done', { printed: progress.printedOverall, failed: progress.failed }));
        return;
    }
    __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_schedulePoll).call(this);
};
_GrowspaceLabelBatch_schedulePoll = function _GrowspaceLabelBatch_schedulePoll() {
    __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_stopPolling).call(this);
    __classPrivateFieldSet(this, _GrowspaceLabelBatch_poll, setTimeout(() => void __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_readJob).call(this), BATCH_POLL_MS), "f");
};
_GrowspaceLabelBatch_stopPolling = function _GrowspaceLabelBatch_stopPolling() {
    if (__classPrivateFieldGet(this, _GrowspaceLabelBatch_poll, "f") !== null)
        clearTimeout(__classPrivateFieldGet(this, _GrowspaceLabelBatch_poll, "f"));
    __classPrivateFieldSet(this, _GrowspaceLabelBatch_poll, null, "f");
};
_GrowspaceLabelBatch_readJob = async function _GrowspaceLabelBatch_readJob() {
    const job = this._job;
    if (!job || !this.isConnected)
        return;
    try {
        const answer = await fetchLabelBatchJob(job.id);
        if (answer.outcome === 'refused') {
            this._refusal = answer.refusal;
            __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_stopPolling).call(this);
            return;
        }
        __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_take).call(this, answer.job);
    }
    catch {
        // A missed read is not a failed label; ask again.
        __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_schedulePoll).call(this);
    }
};
_GrowspaceLabelBatch_recover = 
// -------------------------------------------------------------------------
// Recovery
// -------------------------------------------------------------------------
async function _GrowspaceLabelBatch_recover(recovery) {
    switch (recovery) {
        case 'preflight_again':
            this._acknowledged = null;
            this._overridden = null;
            await __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_preflight).call(this);
            return;
        case 'acknowledge_warnings':
            this.renderRoot.querySelector('[data-role="acknowledge"] input')?.focus();
            return;
        case 'choose_printer':
            this.renderRoot.querySelector('select[name="printer"]')?.focus();
            return;
        case 'select_profile':
            this.renderRoot.querySelector('select[name="profile"]')?.focus();
            return;
        case 'choose_template':
            this.renderRoot.querySelector('select[name="template"]')?.focus();
            return;
        default:
            return;
    }
};
_GrowspaceLabelBatch_transportRefusal = function _GrowspaceLabelBatch_transportRefusal() {
    return {
        code: 'label_template.transport_failed',
        reason: '',
        recovery: 'none',
        current: { family: '', major: 0, minor: 0, generation: 0 },
    };
};
_GrowspaceLabelBatch_announce = function _GrowspaceLabelBatch_announce(message) {
    this._announcement = message;
};
_GrowspaceLabelBatch_renderSetup = function _GrowspaceLabelBatch_renderSetup(printing) {
    const printers = getPrinters(getHass());
    const locked = this._busy || printing;
    return x `
      <section data-section="setup" aria-labelledby="batch-setup">
        <h3 id="batch-setup">${__classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_say).call(this, 'batch_setup', { plants: this.plantIds.length })}</h3>
        <div class="grid">
          <label>
            ${this._t('batch_template')}
            <select
              name="template"
              .value=${this._templateKey}
              ?disabled=${locked}
              @change=${(e) => __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_edit).call(this, () => {
        this._templateKey = e.target.value;
    })}
            >
              ${this._templates.map((item) => x `<option value=${item.key} ?selected=${item.key === this._templateKey}>
                    ${item.name} (${item.labelSizeId})
                  </option>`)}
            </select>
          </label>
          <label>
            ${this._t('print_printer')}
            <select
              name="printer"
              .value=${this._deviceId}
              ?disabled=${locked}
              @change=${(e) => __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_edit).call(this, () => {
        this._deviceId = e.target.value;
    })}
            >
              ${printers.length === 0
        ? x `<option value="">${this._t('print_no_printer')}</option>`
        : printers.map((printer) => x `<option value=${printer.id} ?selected=${printer.id === this._deviceId}>
                        ${printer.name}
                      </option>`)}
            </select>
          </label>
          <label>
            ${this._t('print_profile')}
            <select
              name="profile"
              .value=${this._profileId}
              ?disabled=${locked}
              @change=${(e) => __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_edit).call(this, () => {
        this._profileId = e.target.value;
    })}
            >
              ${this._profiles.map((profile) => x `<option value=${profile.id} ?selected=${profile.id === this._profileId}>
                    ${profile.printer_class} · ${profile.dpi} dpi
                  </option>`)}
            </select>
          </label>
          <label>
            ${__classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_say).call(this, 'batch_copies')}
            <input
              name="copies"
              type="number"
              min="1"
              max=${MAX_BATCH_COPIES}
              .value=${String(this._copies)}
              ?disabled=${locked}
              @change=${(e) => {
        const value = Number.parseInt(e.target.value, 10);
        const copies = Number.isNaN(value)
            ? 1
            : Math.min(Math.max(value, 1), MAX_BATCH_COPIES);
        e.target.value = String(copies);
        __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_edit).call(this, () => {
            this._copies = copies;
        });
    }}
            />
          </label>
        </div>
        ${printers.length === 0
        ? x `<p class="supporting" data-role="no-printer">
              ${this._t('print_no_printer_hint')}
            </p>`
        : E}
        <div class="row">
          <button
            class=${this._review ? '' : 'primary'}
            data-action="preflight"
            ?disabled=${locked || !this._template || !this._deviceId || this.plantIds.length === 0}
            @click=${() => void __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_preflight).call(this)}
          >
            ${__classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_say).call(this, this._review ? 'batch_review_again' : 'batch_review', { labels: this.plantIds.length * this._copies }, this.plantIds.length * this._copies)}
          </button>
        </div>
      </section>
    `;
};
_GrowspaceLabelBatch_renderRefusal = function _GrowspaceLabelBatch_renderRefusal() {
    const refusal = this._refusal;
    if (!refusal)
        return E;
    const action = this._has(`batch_recovery_${refusal.recovery}`)
        ? this._t(`batch_recovery_${refusal.recovery}`)
        : null;
    return x `<div class="refusal" role="alert" data-role="refusal" data-code=${refusal.code}>
      <p class="supporting">${__classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_refusalCopy).call(this, refusal)}</p>
      ${refusal.blocked_by?.length
        ? x `<ul>
            ${refusal.blocked_by.map((blocker) => x `<li>${__classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_blockerCopy).call(this, blocker)}</li>`)}
          </ul>`
        : E}
      ${action
        ? x `<button data-action="recover" @click=${() => void __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_recover).call(this, refusal.recovery)}>
            ${action}
          </button>`
        : E}
    </div>`;
};
_GrowspaceLabelBatch_renderReview = function _GrowspaceLabelBatch_renderReview(review, printing) {
    const preflight = review.preflight;
    const counts = severityCounts(preflight);
    const blockers = batchBlockers(preflight);
    return x `
      <section data-section="review" aria-labelledby="batch-review">
        <h3 id="batch-review">
          ${__classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_say).call(this, 'batch_review_heading', {
        records: preflight.records.length,
        labels: preflight.attempts.length,
    })}
        </h3>
        <p class="supporting" data-role="summary">
          ${__classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_say).call(this, 'batch_review_summary', {
        template: review.template.name,
        revision: review.template.revision,
        errors: counts.error,
        warnings: counts.warning,
    })}
        </p>
        ${this._changed
        ? x `<p class="stale" role="alert" data-role="changed">
              ${__classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_say).call(this, 'batch_changed_since_review')}
            </p>`
        : E}
        ${!preflight.allowed
        ? x `<div class="error" data-role="blocked">
              <p class="supporting">${__classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_say).call(this, 'batch_blocked')}</p>
              ${blockers.length
            ? x `<ul>
                    ${blockers.map((blocker) => x `<li>${__classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_blockerCopy).call(this, blocker)}</li>`)}
                  </ul>`
            : E}
              ${this._has(`batch_recovery_${review.recovery}`)
            ? x `<p class="supporting">${this._t(`batch_recovery_${review.recovery}`)}</p>`
            : E}
              ${preflight.override_available ? __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_renderAnyway).call(this, review, printing) : E}
            </div>`
        : E}
        ${this.single ? E : __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_renderNavigation).call(this, review)} ${__classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_renderRecord).call(this, review)}
        ${__classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_renderPlan).call(this, review, this._job)} ${__classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_renderConsent).call(this, review)}
        <div class="row">
          <button
            class="primary"
            data-action="print"
            ?disabled=${this._busy ||
        printing ||
        this._job !== null ||
        !mayPrint(preflight, this._acknowledged, this._changed)}
            @click=${() => void __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_print).call(this)}
          >
            ${__classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_say).call(this, 'batch_print', { labels: preflight.attempts.length }, preflight.attempts.length)}
          </button>
        </div>
      </section>
    `;
};
_GrowspaceLabelBatch_renderAnyway = function _GrowspaceLabelBatch_renderAnyway(review, printing) {
    const preflight = review.preflight;
    return x `<div class="row" data-role="print-anyway">
      <p class="supporting">${__classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_say).call(this, 'batch_print_anyway_hint')}</p>
      <button
        data-action="print-anyway"
        ?disabled=${this._busy ||
        printing ||
        this._job !== null ||
        !mayPrint(preflight, this._acknowledged, this._changed, true)}
        @click=${() => void __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_printAnyway).call(this)}
      >
        ${this._t('batch_print_anyway')}
      </button>
    </div>`;
};
_GrowspaceLabelBatch_renderNavigation = function _GrowspaceLabelBatch_renderNavigation(review) {
    const preflight = review.preflight;
    const count = preflight.records.length;
    const at = this._focus;
    const jump = (severity, direction) => nextFlagged(preflight, at, severity, direction);
    return x `<nav class="row" aria-label=${this._t('batch_navigation')} data-role="navigation">
      <button
        data-action="previous-record"
        ?disabled=${at === 0}
        @click=${() => __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_goTo).call(this, at - 1)}
      >
        ${this._t('batch_previous_record')}
      </button>
      <span data-role="position">${this._t('batch_position', { at: at + 1, count })}</span>
      <button
        data-action="next-record"
        ?disabled=${at >= count - 1}
        @click=${() => __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_goTo).call(this, at + 1)}
      >
        ${this._t('batch_next_record')}
      </button>
      <button
        data-action="previous-error"
        ?disabled=${jump('error', -1) === null}
        @click=${() => __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_goTo).call(this, jump('error', -1))}
      >
        ${this._t('batch_previous_error')}
      </button>
      <button
        data-action="next-error"
        ?disabled=${jump('error', 1) === null}
        @click=${() => __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_goTo).call(this, jump('error', 1))}
      >
        ${this._t('batch_next_error')}
      </button>
      <button
        data-action="previous-warning"
        ?disabled=${jump('warning', -1) === null}
        @click=${() => __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_goTo).call(this, jump('warning', -1))}
      >
        ${this._t('batch_previous_warning')}
      </button>
      <button
        data-action="next-warning"
        ?disabled=${jump('warning', 1) === null}
        @click=${() => __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_goTo).call(this, jump('warning', 1))}
      >
        ${this._t('batch_next_warning')}
      </button>
    </nav>`;
};
_GrowspaceLabelBatch_renderRecord = function _GrowspaceLabelBatch_renderRecord(review) {
    const preflight = review.preflight;
    const record = preflight.records[this._focus];
    if (!record)
        return E;
    const severity = recordSeverity(preflight, record.index);
    const diagnostics = recordDiagnostics(preflight, record.index);
    const name = __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_plant).call(this, record.subject);
    return x `<div
      class="record"
      data-role="record"
      data-index=${record.index}
      data-severity=${severity}
    >
      <div class="raster">
        ${record.render.raster
        ? x `<img
              src=${record.render.raster.image}
              alt=${this._t('batch_record_alt', { plant: name })}
            />`
        : x `<p class="supporting error">${this._t('print_blocker_no_raster')}</p>`}
      </div>
      <div>
        <h4 tabindex="-1">${name}</h4>
        <p class="supporting ${severity === 'ok' ? '' : severity}">
          ${__classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_say).call(this, `batch_record_${severity}`, { count: diagnostics.length }, diagnostics.length)}
        </p>
        ${diagnostics.length
        ? x `<ul data-role="diagnostics">
              ${diagnostics.map((item) => x `<li class=${item.diagnostic.severity}>
                    <strong>${this._t(`batch_severity_${item.diagnostic.severity}`)}:</strong>
                    ${__classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_first).call(this, copyKeys(item.diagnostic), 'diagnostic_severity_warning')}
                  </li>`)}
            </ul>`
        : E}
      </div>
    </div>`;
};
_GrowspaceLabelBatch_renderPlan = function _GrowspaceLabelBatch_renderPlan(review, job) {
    const statuses = new Map(job?.attempts.map((attempt) => [attempt.id, attempt]) ?? []);
    return x `<div>
      <h4 id="batch-plan">${__classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_say).call(this, 'batch_plan')}</h4>
      ${this.single ? E : x `<p class="supporting">${this._t('batch_plan_hint')}</p>`}
      <ol class="plan" data-role="plan" aria-labelledby="batch-plan">
        ${review.preflight.attempts.map((attempt) => {
        const current = statuses.get(attempt.id);
        const status = current?.status ?? 'queued';
        return x `<li data-attempt=${attempt.id} data-status=${status}>
            ${__classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_say).call(this, 'batch_attempt', {
            plant: __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_plant).call(this, attempt.subject),
            copy: attempt.copy_index,
        })}
            —
            <span class="status" data-status=${status}
              >${__classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_first).call(this, [`batch_status_${status}`], 'batch_status_pending')}</span
            >
            ${current?.error
            ? x `<span class="supporting" data-role="attempt-error">(${current.error})</span>`
            : E}
          </li>`;
    })}
      </ol>
    </div>`;
};
_GrowspaceLabelBatch_renderConsent = function _GrowspaceLabelBatch_renderConsent(review) {
    const preflight = review.preflight;
    const consent = acknowledgementState(preflight, this._acknowledged);
    if (consent === 'not_required')
        return E;
    return x `<div data-role="acknowledge" data-state=${consent}>
      ${consent === 'stale'
        ? x `<p class="stale" role="alert" data-role="acknowledgement-stale">
            ${__classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_say).call(this, 'batch_acknowledgement_stale')}
          </p>`
        : E}
      <label class="consent">
        <input
          type="checkbox"
          .checked=${consent === 'current'}
          ?disabled=${this._busy ||
        this._job !== null ||
        !(preflight.allowed || preflight.override_available)}
          @change=${(e) => __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_acknowledge).call(this, e.target.checked)}
        />
        ${__classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_say).call(this, 'batch_acknowledge', {
        warnings: warningCount(preflight),
        review: preflight.identity.replace(/^sha256:/, '').slice(0, 8),
    }, warningCount(preflight))}
      </label>
    </div>`;
};
_GrowspaceLabelBatch_renderJob = function _GrowspaceLabelBatch_renderJob(job) {
    const progress = jobProgress(job);
    const failed = failedAttempts(job);
    return x `<section data-section="job" aria-labelledby="batch-job" data-state=${job.state}>
      <h3 id="batch-job">
        ${__classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_say).call(this, job.retry_of ? 'batch_job_retry' : 'batch_job', { labels: progress.selected }, progress.selected)}
      </h3>
      <progress
        max=${Math.max(progress.selected, 1)}
        .value=${progress.printed + progress.failed}
        aria-label=${this._t('batch_progress', {
        done: progress.printed + progress.failed,
        total: progress.selected,
    })}
      ></progress>
      <p class="supporting" data-role="progress">
        ${this._t('batch_progress_counts', {
        printed: progress.printed,
        failed: progress.failed,
        pending: progress.pending,
    })}
      </p>
      ${job.state === 'refused' && job.refusal
        ? x `<div class="refusal" role="alert" data-role="job-refused">
            <p class="supporting">${this._t('batch_job_refused')}</p>
            <ul>
              ${job.refusal.blocked_by.map((blocker) => x `<li>${__classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_blockerCopy).call(this, blocker)}</li>`)}
            </ul>
            <button data-action="recover" @click=${() => void __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_recover).call(this, 'preflight_again')}>
              ${this._t('batch_recovery_preflight_again')}
            </button>
          </div>`
        : E}
      ${progress.finished && job.state !== 'refused'
        ? x `<p class="supporting" data-role="done">
            ${failed.length === 0
            ? __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_say).call(this, 'batch_all_printed', { labels: progress.printedOverall }, progress.printedOverall)
            : this._t('batch_partial', {
                printed: progress.printedOverall,
                failed: failed.length,
            })}
          </p>`
        : E}
      ${mayRetry(job)
        ? x `<div data-role="retry">
            <p class="supporting">${__classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_say).call(this, 'batch_retry_hint')}</p>
            <button
              class="primary"
              data-action="retry"
              ?disabled=${this._busy}
              @click=${() => void __classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_retry).call(this)}
            >
              ${__classPrivateFieldGet(this, _GrowspaceLabelBatch_instances, "m", _GrowspaceLabelBatch_say).call(this, 'batch_retry', { labels: failed.length }, failed.length)}
            </button>
          </div>`
        : E}
    </section>`;
};
GrowspaceLabelBatch.styles = i `
    :host {
      display: block;
      color: var(--primary-text-color);
    }
    section {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 12px 0;
      border-bottom: 1px solid var(--divider-color);
    }
    section:last-of-type {
      border-bottom: 0;
    }
    h3 {
      margin: 0;
      font-size: 1rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 10px;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.85rem;
    }
    select,
    input[type='number'] {
      min-height: 40px;
      padding: 6px 8px;
      border-radius: 8px;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color, transparent);
      color: inherit;
      font: inherit;
    }
    button {
      min-height: 40px;
      padding: 6px 14px;
      border-radius: 8px;
      border: 1px solid var(--divider-color);
      background: var(--secondary-background-color, transparent);
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    button.primary {
      /* Darkened from the theme's primary so white text holds 4.5:1 on the
         default blue (2.6:1 undarkened) and on any lighter one. */
      background: color-mix(in srgb, var(--primary-color) 70%, black);
      border-color: transparent;
      color: var(--text-primary-color, #fff);
    }
    button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    button:focus-visible,
    select:focus-visible,
    input:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    label.consent {
      flex-direction: row;
      align-items: flex-start;
      gap: 10px;
      font-size: inherit;
      line-height: 1.45;
    }
    label.consent input {
      flex: none;
      width: 20px;
      height: 20px;
      margin: 2px 0 0;
    }
    .supporting {
      margin: 0;
      opacity: 0.8;
      line-height: 1.45;
    }
    /* Marked by the border, not the text: error-red body copy is under 4.5:1
       on Home Assistant's dark surfaces. An error inside a record says so in
       words ("Error:"), so it needs no colour of its own either. */
    .refusal,
    [data-role='blocked'] {
      display: flex;
      flex-direction: column;
      gap: 8px;
      border: 2px solid var(--error-color);
      border-radius: 8px;
      padding: 8px 12px;
    }
    .warning {
      color: var(--warning-color);
    }
    .stale {
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid var(--warning-color);
    }
    .record {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
      gap: 12px;
      align-items: start;
    }
    .raster {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 120px;
      padding: 8px;
    }
    .raster img {
      display: block;
      max-width: 100%;
      image-rendering: pixelated;
      border: 1px solid var(--divider-color);
    }
    ul,
    ol {
      margin: 0;
      padding-left: 1.25rem;
    }
    .plan {
      max-height: 220px;
      overflow-y: auto;
    }
    .plan li {
      padding: 2px 0;
    }
    .status {
      font-weight: 600;
    }
    .status[data-status='failed'] {
      color: var(--error-color);
    }
    .status[data-status='printed'] {
      color: var(--success-color);
    }
    progress {
      width: 100%;
    }
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
    @media (max-width: 600px) {
      .record {
        grid-template-columns: 1fr;
      }
    }
  `;
__decorate([
    n({ attribute: false })
], GrowspaceLabelBatch.prototype, "capability", void 0);
__decorate([
    n({ attribute: false })
], GrowspaceLabelBatch.prototype, "plantIds", void 0);
__decorate([
    n({ attribute: false })
], GrowspaceLabelBatch.prototype, "describePlant", void 0);
__decorate([
    n({ type: String })
], GrowspaceLabelBatch.prototype, "language", void 0);
__decorate([
    n({ type: Boolean })
], GrowspaceLabelBatch.prototype, "single", void 0);
__decorate([
    r()
], GrowspaceLabelBatch.prototype, "_templates", void 0);
__decorate([
    r()
], GrowspaceLabelBatch.prototype, "_templateKey", void 0);
__decorate([
    r()
], GrowspaceLabelBatch.prototype, "_deviceId", void 0);
__decorate([
    r()
], GrowspaceLabelBatch.prototype, "_profileId", void 0);
__decorate([
    r()
], GrowspaceLabelBatch.prototype, "_copies", void 0);
__decorate([
    r()
], GrowspaceLabelBatch.prototype, "_busy", void 0);
__decorate([
    r()
], GrowspaceLabelBatch.prototype, "_refusal", void 0);
__decorate([
    r()
], GrowspaceLabelBatch.prototype, "_review", void 0);
__decorate([
    r()
], GrowspaceLabelBatch.prototype, "_changed", void 0);
__decorate([
    r()
], GrowspaceLabelBatch.prototype, "_acknowledged", void 0);
__decorate([
    r()
], GrowspaceLabelBatch.prototype, "_overridden", void 0);
__decorate([
    r()
], GrowspaceLabelBatch.prototype, "_focus", void 0);
__decorate([
    r()
], GrowspaceLabelBatch.prototype, "_job", void 0);
__decorate([
    r()
], GrowspaceLabelBatch.prototype, "_announcement", void 0);
GrowspaceLabelBatch = __decorate([
    t('growspace-label-batch')
], GrowspaceLabelBatch);

/**
 * `<growspace-label-record-print>` — one strain-library label, printed through
 * a Label Template.
 *
 * The strain library's "Print label" once the integration serves the complete
 * Label Template capability. Three steps, in order:
 *
 * 1. **Setup.** Which published template, printer and profile. The template
 *    starts on the Label Size's Effective Default, the same one a plant or a
 *    batch would print.
 * 2. **Preview.** The backend renders the published revision for this saved
 *    strain and judges it exactly as the print will be. What is on screen is
 *    the bitmap the printer receives, with every reason it may not print.
 * 3. **Print.** The approved raster, by its approval and raster identity. The
 *    card never sends the content again, so it cannot print a label nobody
 *    looked at. Where every refusal is one the backend lets an operator print
 *    past, **Print anyway** sends the same approval with that consent.
 *
 * A refusal — of the preview or of the print — is shown with the recovery it
 * names, and nothing else happens. In particular nothing here falls back to
 * the Classic `print_label` service: a template that could not print is an
 * answer to show, not a reason to print a different label instead.
 */
var _GrowspaceLabelRecordPrint_instances, _GrowspaceLabelRecordPrint_first, _GrowspaceLabelRecordPrint_blockerCopy, _GrowspaceLabelRecordPrint_recoveryAction, _GrowspaceLabelRecordPrint_recoveryGuidance, _GrowspaceLabelRecordPrint_factoryOptions, _GrowspaceLabelRecordPrint_loadTemplates, _GrowspaceLabelRecordPrint_invalidate, _GrowspaceLabelRecordPrint_edit, _GrowspaceLabelRecordPrint_announce, _GrowspaceLabelRecordPrint_refused, _GrowspaceLabelRecordPrint_run, _GrowspaceLabelRecordPrint_preview, _GrowspaceLabelRecordPrint_print, _GrowspaceLabelRecordPrint_recover, _GrowspaceLabelRecordPrint_renderSetup, _GrowspaceLabelRecordPrint_renderRecovery, _GrowspaceLabelRecordPrint_renderRefusal, _GrowspaceLabelRecordPrint_renderPreview;
/** Recoveries this view performs: a fresh preview, or a setup control to change. */
const PREVIEW_AGAIN = new Set(['refresh_preview', 'retry_preview', 'retry_print']);
const SETUP_CONTROL = {
    choose_printer: 'printer',
    select_profile: 'profile',
    choose_template: 'template',
};
let GrowspaceLabelRecordPrint = class GrowspaceLabelRecordPrint extends i$1 {
    constructor() {
        super(...arguments);
        _GrowspaceLabelRecordPrint_instances.add(this);
        /** The saved strain to print, by the library's own name for it. */
        this.strain = '';
        this.phenotype = null;
        this.language = 'en';
        /** The library's published Named Templates; the Factory Templates come from the capability. */
        this._named = [];
        /** What each Label Size prints by default, as the library resolved it. */
        this._defaults = {};
        this._templateKey = '';
        this._deviceId = '';
        this._profileId = '';
        this._busy = null;
        this._record = null;
        this._printed = null;
        this._refusal = null;
        this._announcement = '';
    }
    connectedCallback() {
        super.connectedCallback();
        void __classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_loadTemplates).call(this);
        if (!this._deviceId)
            this._deviceId = getPrinters(getHass())[0]?.id ?? '';
    }
    willUpdate(changed) {
        if (changed.has('capability') || changed.has('_named') || changed.has('_defaults')) {
            const templates = this._templates;
            const preferred = this._preferred;
            if (this._record === null && templates.some((item) => item.key === preferred)) {
                this._templateKey = preferred;
            }
            else if (!templates.some((item) => item.key === this._templateKey)) {
                this._templateKey = templates[0]?.key ?? '';
            }
        }
        if (changed.has('capability') ||
            changed.has('_templateKey') ||
            changed.has('_named') ||
            changed.has('_defaults')) {
            if (!this._profiles.some((profile) => profile.id === this._profileId)) {
                this._profileId = this._profiles[0]?.id ?? '';
            }
        }
        // A preview is of one strain; another strain is another label.
        if (changed.has('strain') || changed.has('phenotype'))
            __classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_invalidate).call(this);
    }
    // -------------------------------------------------------------------------
    // Copy
    // -------------------------------------------------------------------------
    _t(key, params) {
        return params
            ? localizeWithParams(`labels.${key}`, params, this.language)
            : localize(`labels.${key}`, '', '', this.language);
    }
    _has(key) {
        return this._t(key) !== `labels.${key}` && this._t(key) !== key;
    }
    /**
     * Where every other print starts: the Effective Default of the size a
     * Classic label defaults to, which is the first one shipped.
     */
    get _preferred() {
        const size = this.capability?.catalogues.factory_templates[0]?.label_size_id;
        const ref = size ? this._defaults[size] : undefined;
        return ref ? `${ref.kind}:${ref.id}` : '';
    }
    get _templates() {
        return [...this._named, ...__classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_factoryOptions).call(this)];
    }
    get _template() {
        return this._templates.find((item) => item.key === this._templateKey) ?? null;
    }
    get _profiles() {
        const template = this._template;
        return this.capability && template
            ? profilesForSize(this.capability, template.labelSizeId)
            : [];
    }
    // -------------------------------------------------------------------------
    // Rendering
    // -------------------------------------------------------------------------
    render() {
        if (!this.capability)
            return E;
        return x `
      ${__classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_renderSetup).call(this)} ${__classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_renderRefusal).call(this)}
      ${this._record ? __classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_renderPreview).call(this, this._record) : E}
      ${this._printed
            ? x `<p class="supporting" data-role="printed">
            ${this._t('print_record_done', { reference: this._printed.source.reference })}
          </p>`
            : E}
      <p class="visually-hidden" role="status" aria-live="polite" data-role="status">
        ${this._announcement}
      </p>
    `;
    }
};
_GrowspaceLabelRecordPrint_instances = new WeakSet();
_GrowspaceLabelRecordPrint_first = function _GrowspaceLabelRecordPrint_first(keys, fallback) {
    const found = keys.find((key) => this._has(key));
    return found ? this._t(found) : this._t(fallback);
};
_GrowspaceLabelRecordPrint_blockerCopy = function _GrowspaceLabelRecordPrint_blockerCopy(blocker) {
    return __classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_first).call(this, [`print_blocker_${blocker}`], 'print_blocker_generic');
};
_GrowspaceLabelRecordPrint_recoveryAction = function _GrowspaceLabelRecordPrint_recoveryAction(recovery) {
    if (PREVIEW_AGAIN.has(recovery))
        return this._t('print_recovery_refresh_preview');
    if (SETUP_CONTROL[recovery])
        return this._t(`batch_recovery_${recovery}`);
    return null;
};
_GrowspaceLabelRecordPrint_recoveryGuidance = function _GrowspaceLabelRecordPrint_recoveryGuidance(recovery) {
    const key = `record_recovery_${recovery}`;
    return this._has(key) ? this._t(key) : null;
};
_GrowspaceLabelRecordPrint_factoryOptions = function _GrowspaceLabelRecordPrint_factoryOptions() {
    return (this.capability?.catalogues.factory_templates ?? []).map((item) => ({
        key: `factory:${item.id}`,
        kind: 'factory',
        id: item.id,
        name: item.name,
        labelSizeId: item.label_size_id,
    }));
};
_GrowspaceLabelRecordPrint_loadTemplates = async function _GrowspaceLabelRecordPrint_loadTemplates() {
    try {
        const answer = await fetchLabelTemplateLibrary();
        if (answer.outcome !== 'ok')
            return;
        const named = answer.library.templates
            .filter((item) => item.head_revision > 0)
            .map((item) => ({
            key: `named:${item.id}`,
            kind: item.kind,
            id: item.id,
            name: item.name,
            labelSizeId: item.label_size_id,
        }));
        this._named = named;
        this._defaults = Object.fromEntries(Object.entries(answer.library.effective_defaults).map(([size, item]) => [size, item?.ref]));
    }
    catch {
        // The Factory Templates are enough to print from; the library is extra.
    }
};
_GrowspaceLabelRecordPrint_invalidate = function _GrowspaceLabelRecordPrint_invalidate() {
    this._record = null;
    this._printed = null;
};
_GrowspaceLabelRecordPrint_edit = function _GrowspaceLabelRecordPrint_edit(apply) {
    apply();
    __classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_invalidate).call(this);
};
_GrowspaceLabelRecordPrint_announce = function _GrowspaceLabelRecordPrint_announce(message) {
    this._announcement = message;
};
_GrowspaceLabelRecordPrint_refused = function _GrowspaceLabelRecordPrint_refused(refusal) {
    this._refusal = refusal;
    __classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_announce).call(this, refusalCopy(refusal.code, this.language));
};
_GrowspaceLabelRecordPrint_run = async function _GrowspaceLabelRecordPrint_run(name, work) {
    if (this._busy)
        return;
    this._busy = name;
    this._refusal = null;
    try {
        await work();
    }
    catch {
        __classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_refused).call(this, {
            code: 'label_template.transport_failed',
            reason: '',
            recovery: name === 'print' ? 'retry_print' : 'retry_preview',
            current: { family: '', major: 0, minor: 0, generation: 0 },
        });
    }
    finally {
        this._busy = null;
    }
};
_GrowspaceLabelRecordPrint_preview = async function _GrowspaceLabelRecordPrint_preview() {
    const template = this._template;
    const deviceId = this._deviceId;
    if (!template || !deviceId || !this.strain)
        return;
    this._printed = null;
    await __classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_run).call(this, 'preview', async () => {
        const answer = await previewLabelRecord({
            template: { kind: template.kind, id: template.id },
            strain: this.strain,
            phenotype: this.phenotype,
            profileId: this._profileId || null,
            deviceId,
        });
        if (answer.outcome === 'refused') {
            this._record = null;
            return __classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_refused).call(this, answer.refusal);
        }
        this._record = answer;
        __classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_announce).call(this, answer.decision.allowed
            ? this._t('print_record_ready')
            : this._t('print_record_blocked', { count: answer.decision.blocked_by.length }));
        await this.updateComplete;
        this.renderRoot.querySelector('[data-section="preview"] h3')?.focus();
    });
};
_GrowspaceLabelRecordPrint_print = async function _GrowspaceLabelRecordPrint_print(anyway = false) {
    const record = this._record;
    if (!record || !(record.decision.allowed || (anyway && record.override_available)))
        return;
    await __classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_run).call(this, 'print', async () => {
        const answer = await printLabelRecord(record.approval_id, record.render.raster_identity, anyway);
        // Printed or refused, this approval has been spent: the next label is
        // previewed again, never printed from a picture already used.
        this._record = null;
        if (answer.outcome === 'refused')
            return __classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_refused).call(this, answer.refusal);
        this._printed = answer.print;
        __classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_announce).call(this, this._t('print_record_done', { reference: answer.print.source.reference }));
    });
};
_GrowspaceLabelRecordPrint_recover = async function _GrowspaceLabelRecordPrint_recover(recovery) {
    if (PREVIEW_AGAIN.has(recovery)) {
        this._refusal = null;
        await __classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_preview).call(this);
        return;
    }
    const control = SETUP_CONTROL[recovery];
    if (control)
        this.renderRoot.querySelector(`select[name="${control}"]`)?.focus();
};
_GrowspaceLabelRecordPrint_renderSetup = function _GrowspaceLabelRecordPrint_renderSetup() {
    const printers = getPrinters(getHass());
    const locked = this._busy !== null;
    const reason = !this.strain
        ? 'no_strain'
        : !this._deviceId
            ? 'no_printer'
            : !this._template
                ? 'no_template'
                : null;
    return x `
      <section data-section="setup" aria-labelledby="record-setup">
        <h3 id="record-setup">${this._t('record_setup')}</h3>
        <p class="supporting">${this._t('record_setup_hint')}</p>
        <div class="grid">
          <label>
            ${this._t('batch_template')}
            <select
              name="template"
              .value=${this._templateKey}
              ?disabled=${locked}
              @change=${(e) => __classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_edit).call(this, () => {
        this._templateKey = e.target.value;
    })}
            >
              ${this._templates.map((item) => x `<option value=${item.key} ?selected=${item.key === this._templateKey}>
                    ${item.name} (${item.labelSizeId})
                  </option>`)}
            </select>
          </label>
          <label>
            ${this._t('print_printer')}
            <select
              name="printer"
              .value=${this._deviceId}
              ?disabled=${locked}
              @change=${(e) => __classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_edit).call(this, () => {
        this._deviceId = e.target.value;
    })}
            >
              ${printers.length === 0
        ? x `<option value="">${this._t('print_no_printer')}</option>`
        : printers.map((printer) => x `<option value=${printer.id} ?selected=${printer.id === this._deviceId}>
                        ${printer.name}
                      </option>`)}
            </select>
          </label>
          <label>
            ${this._t('print_profile')}
            <select
              name="profile"
              .value=${this._profileId}
              ?disabled=${locked}
              @change=${(e) => __classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_edit).call(this, () => {
        this._profileId = e.target.value;
    })}
            >
              ${this._profiles.map((profile) => x `<option value=${profile.id} ?selected=${profile.id === this._profileId}>
                    ${profile.printer_class} · ${profile.dpi} dpi
                  </option>`)}
            </select>
          </label>
        </div>
        ${printers.length === 0
        ? x `<p class="supporting" data-role="no-printer">
              ${this._t('record_no_printer_hint')}
            </p>`
        : E}
        <div class="row">
          <button
            class=${this._record ? '' : 'primary'}
            data-action="preview"
            ?disabled=${locked || reason !== null}
            aria-describedby=${reason ? 'record-reason' : E}
            @click=${() => void __classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_preview).call(this)}
          >
            ${this._t(this._record ? 'print_recovery_refresh_preview' : 'record_preview')}
          </button>
        </div>
        ${reason
        ? x `<p class="supporting" id="record-reason" data-reason=${reason}>
              ${__classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_first).call(this, [`record_blocker_${reason}`], `print_blocker_${reason}`)}
            </p>`
        : E}
      </section>
    `;
};
_GrowspaceLabelRecordPrint_renderRecovery = function _GrowspaceLabelRecordPrint_renderRecovery(recovery) {
    const action = __classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_recoveryAction).call(this, recovery);
    if (action) {
        return x `<div class="row">
        <button
          data-action="recover"
          data-recovery=${recovery}
          ?disabled=${this._busy !== null}
          @click=${() => void __classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_recover).call(this, recovery)}
        >
          ${action}
        </button>
      </div>`;
    }
    const guidance = __classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_recoveryGuidance).call(this, recovery);
    return guidance
        ? x `<p class="supporting" data-role="guidance" data-recovery=${recovery}>${guidance}</p>`
        : E;
};
_GrowspaceLabelRecordPrint_renderRefusal = function _GrowspaceLabelRecordPrint_renderRefusal() {
    const refusal = this._refusal;
    if (!refusal)
        return E;
    return x `<div class="refusal" role="alert" data-role="refusal" data-code=${refusal.code}>
      <p class="supporting">${refusalCopy(refusal.code, this.language)}</p>
      ${refusal.blocked_by?.length
        ? x `<ul>
            ${refusal.blocked_by.map((blocker) => x `<li>${__classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_blockerCopy).call(this, blocker)}</li>`)}
          </ul>`
        : E}
      ${__classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_renderRecovery).call(this, refusal.recovery)}
    </div>`;
};
_GrowspaceLabelRecordPrint_renderPreview = function _GrowspaceLabelRecordPrint_renderPreview(record) {
    const decision = record.decision;
    // Errors first: they are why a label does not print, warnings only advise.
    const problems = record.render.diagnostics
        .filter((item) => item.severity === 'error' || item.severity === 'warning')
        .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));
    const warnings = problems.filter((item) => item.severity === 'warning').length;
    const anyway = !decision.allowed && record.override_available;
    return x `
      <section data-section="preview" aria-labelledby="record-preview">
        <h3 id="record-preview" tabindex="-1">
          ${this._t('record_preview_heading', {
        template: record.template.name,
        revision: record.template.revision,
    })}
        </h3>
        <div class="raster">
          ${record.render.raster
        ? x `<img
                src=${record.render.raster.image}
                alt=${this._t('print_record_alt', { subject: record.subject })}
                width=${record.render.raster.width}
                height=${record.render.raster.height}
              />`
        : x `<p class="supporting error" data-role="no-raster">
                ${this._t('print_blocker_no_raster')}
              </p>`}
        </div>
        ${decision.allowed
        ? x `<p class="supporting" data-role="decision" data-allowed="true">
              ${this._t('print_record_ready')}
            </p>`
        : x `<div class="error" data-role="decision" data-allowed="false">
              <p class="supporting">
                ${this._t('print_record_blocked', { count: decision.blocked_by.length })}
              </p>
              <ul data-role="blockers">
                ${decision.blocked_by.map((blocker) => x `<li data-blocker=${blocker}>${__classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_blockerCopy).call(this, blocker)}</li>`)}
              </ul>
            </div>`}
        ${decision.allowed ? E : __classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_renderRecovery).call(this, record.recovery)}
        ${problems.length
        ? x `<div data-role="diagnostics">
              ${warnings
            ? x `<p class="supporting">
                    ${this._t('print_record_warnings', { count: warnings })}
                  </p>`
            : E}
              <ul>
                ${problems.map((item) => x `<li data-severity=${item.severity}>
                      <strong>${this._t(`batch_severity_${item.severity}`)}:</strong>
                      ${__classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_first).call(this, copyKeys(item), `diagnostic_severity_${item.severity}`)}
                    </li>`)}
              </ul>
            </div>`
        : E}
        <div class="row">
          <button
            class="primary"
            data-action="print"
            ?disabled=${!decision.allowed || this._busy !== null}
            aria-describedby=${decision.allowed
        ? E
        : anyway
            ? 'record-anyway'
            : 'record-blocked'}
            @click=${() => void __classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_print).call(this)}
          >
            ${this._t('print_record_action')}
          </button>
          ${anyway
        ? x `<button
                data-action="print-anyway"
                aria-describedby="record-anyway"
                ?disabled=${this._busy !== null}
                @click=${() => void __classPrivateFieldGet(this, _GrowspaceLabelRecordPrint_instances, "m", _GrowspaceLabelRecordPrint_print).call(this, true)}
              >
                ${this._t('print_record_anyway')}
              </button>`
        : E}
        </div>
        ${decision.allowed
        ? E
        : x `<p class="supporting" id=${anyway ? 'record-anyway' : 'record-blocked'}>
              ${this._t(anyway ? 'print_record_anyway_hint' : 'print_record_blocked_hint')}
            </p>`}
      </section>
    `;
};
GrowspaceLabelRecordPrint.styles = i `
    :host {
      display: block;
      color: var(--primary-text-color);
    }
    section {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 12px 0;
      border-bottom: 1px solid var(--divider-color);
    }
    section:last-of-type {
      border-bottom: 0;
    }
    h3 {
      margin: 0;
      font-size: 1rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 10px;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.85rem;
    }
    select {
      min-height: 44px;
      max-width: 100%;
      padding: 6px 8px;
      border-radius: 8px;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color, transparent);
      color: inherit;
      font: inherit;
    }
    button {
      min-height: 44px;
      min-width: 44px;
      max-width: 100%;
      padding: 6px 14px;
      border-radius: 8px;
      border: 1px solid var(--divider-color);
      background: var(--secondary-background-color, transparent);
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    button.primary {
      /* Darkened from the theme's primary so white text holds 4.5:1 on the
         default blue (2.6:1 undarkened) and on any lighter one. */
      background: color-mix(in srgb, var(--primary-color) 70%, black);
      border-color: transparent;
      color: var(--text-primary-color, #fff);
    }
    button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    button:focus-visible,
    select:focus-visible,
    h3:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .supporting {
      margin: 0;
      line-height: 1.45;
      color: var(--secondary-text-color);
    }
    /* Marked by the border, not the text: error-red body copy is under 4.5:1
       on Home Assistant's dark surfaces. */
    .refusal,
    .error {
      display: flex;
      flex-direction: column;
      gap: 8px;
      border: 2px solid var(--error-color);
      border-radius: 8px;
      padding: 8px 12px;
    }
    .raster {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 120px;
      padding: 8px;
    }
    .raster img {
      display: block;
      max-width: 100%;
      height: auto;
      image-rendering: pixelated;
      border: 1px solid var(--divider-color);
    }
    ul {
      margin: 0;
      padding-left: 1.25rem;
    }
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
  `;
__decorate([
    n({ attribute: false })
], GrowspaceLabelRecordPrint.prototype, "capability", void 0);
__decorate([
    n({ type: String })
], GrowspaceLabelRecordPrint.prototype, "strain", void 0);
__decorate([
    n({ attribute: false })
], GrowspaceLabelRecordPrint.prototype, "phenotype", void 0);
__decorate([
    n({ type: String })
], GrowspaceLabelRecordPrint.prototype, "language", void 0);
__decorate([
    r()
], GrowspaceLabelRecordPrint.prototype, "_named", void 0);
__decorate([
    r()
], GrowspaceLabelRecordPrint.prototype, "_defaults", void 0);
__decorate([
    r()
], GrowspaceLabelRecordPrint.prototype, "_templateKey", void 0);
__decorate([
    r()
], GrowspaceLabelRecordPrint.prototype, "_deviceId", void 0);
__decorate([
    r()
], GrowspaceLabelRecordPrint.prototype, "_profileId", void 0);
__decorate([
    r()
], GrowspaceLabelRecordPrint.prototype, "_busy", void 0);
__decorate([
    r()
], GrowspaceLabelRecordPrint.prototype, "_record", void 0);
__decorate([
    r()
], GrowspaceLabelRecordPrint.prototype, "_printed", void 0);
__decorate([
    r()
], GrowspaceLabelRecordPrint.prototype, "_refusal", void 0);
__decorate([
    r()
], GrowspaceLabelRecordPrint.prototype, "_announcement", void 0);
GrowspaceLabelRecordPrint = __decorate([
    t('growspace-label-record-print')
], GrowspaceLabelRecordPrint);

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
        const empty = (content) => x `<div class="stage-empty">${content}</div>`;
        if (!choice)
            return empty(x `<p class="supporting">${this._t('preview_loading')}</p>`);
        if (labelSizeState(capability, choice.labelSizeId) === 'unprofiled') {
            return empty(x `<p class="supporting" data-state="unprofiled">${this._t('preview_unprofiled')}</p>`);
        }
        if (this._loading) {
            return empty(x `<p class="supporting" role="status">${this._t('preview_loading')}</p>`);
        }
        if (this._failure !== null) {
            return empty(x `<p class="supporting refusal" role="alert" data-state="failed">
          ${localizeWithParams('labels.preview_failed', { reason: this._failure }, this.language)}
        </p>`);
        }
        const preview = this._preview;
        if (!preview)
            return empty(x `<p class="supporting">${this._t('preview_loading')}</p>`);
        if (preview.outcome === 'refused') {
            return empty(x `<p class="supporting refusal" role="alert" data-state="refused">
          ${localizeWithParams('labels.preview_refused_localized', { detail: refusalCopy(preview.refusal.code, this.language) }, this.language)}
        </p>`);
        }
        const raster = preview.render.raster;
        if (!raster) {
            // The sentence must not point at diagnostics the user cannot see, so
            // the ones that stopped the render are printed with it.
            const blocking = preview.render.diagnostics.filter((item) => item.severity === 'error' || item.code.endsWith('render_failed'));
            return empty(x `
        <p class="supporting refusal" role="alert" data-state="no-raster">
          ${this._t('preview_no_raster')}
        </p>
        <ul class="diagnostics">
          ${(blocking.length > 0 ? blocking : preview.render.diagnostics).map((item) => x `<li data-code=${item.code}>
                ${labelCopy(copyKeys(item), 'diagnostic_severity_error', this.language)}
              </li>`)}
        </ul>
      `);
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
        const library = this._renderLibrary();
        // Size first, because both panes answer to it; then the Factory layout for
        // that size beside the Named Templates saved for it. Reading order and tab
        // order are the same: the label, what to do with it, then the library.
        return x `
      <p class="supporting scope" data-role="scope">${this._t('read_only')}</p>
      ${this._renderSizes(capability)}
      <div class="panes" ?data-library=${library !== E}>
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
    _renderOutcome(shown) {
        return x `
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
//# sourceMappingURL=growspace-label-templates-ilFijCJn.js.map
