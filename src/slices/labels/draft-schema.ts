/**
 * The Template Draft wire, as the card parses it.
 *
 * The card still never draws a layout: the picture on screen is the backend's
 * raster, and nothing in the editor renders ink. What it now parses is the
 * **document** — because an editor that moves a frame has to read one.
 *
 * That document is declared here **whole**, every field the backend emits,
 * per ADR 0031. The temptation was the opposite: parse the four fields the
 * editor touches and let the rest ride along untouched, since the document
 * makes a round trip — in on `open`, out on `autosave` — and zod strips what
 * it does not declare, so an undeclared `style` would be deleted from the
 * user's own work on the way back out. But `z.looseObject` buys that safety
 * by suppressing the compile error that detects a missing declaration, which
 * is the signal ADR 0031 exists to restore. Declaring everything gets both:
 * nothing is stripped because nothing is undeclared, and the contract-fixture
 * completeness check goes red the day the backend adds a field, rather than
 * the card silently deleting it from every draft it saves.
 *
 * The union below is the backend's `growspace.label-layout` v1 document, and
 * its shape is not the card's to choose. `content` is exactly one of three
 * sources; a divider has none at all, because it is a mark rather than a
 * container; and each kind's `style` carries only its own keys. Getting that
 * wrong is caught by the fixture rather than by a user's failed save.
 */

import { z } from 'zod';

import { LabelContractIdentitySchema, LabelRefusalSchema, RenderResultSchema } from './schema';

/** One element's rectangle, in the stock's own millimetres. */
export const LabelFrameSchema = z.object({
  x_mm: z.number(),
  y_mm: z.number(),
  width_mm: z.number(),
  height_mm: z.number(),
});
export type LabelFrame = z.infer<typeof LabelFrameSchema>;

/**
 * Where an element's value comes from: exactly one of three sources.
 *
 * Declared as three alternatives rather than one object with three optional
 * keys, because "exactly one" is the backend's rule and an object carrying
 * two is `content.ambiguous_source` rather than a document with a spare field.
 */
export const ContentSourceSchema = z.union([
  z.object({
    binding: z.string(),
    /** Per-binding options, keyed by the binding's own parameter names. */
    parameters: z.record(z.string(), z.string()).optional(),
  }),
  z.object({ literal: z.string() }),
  z.object({ asset_id: z.string() }),
]);
export type ContentSource = z.infer<typeof ContentSourceSchema>;

/** Printer-safe text styling. Style tokens are catalogue IDs, not CSS. */
export const TextStyleSchema = z.object({
  font: z.string(),
  font_size_mm: z.number(),
  horizontal_align: z.enum(['left', 'center', 'right']),
  vertical_align: z.enum(['top', 'center', 'bottom']),
  line_spacing: z.string(),
  overflow: z.enum(['clip', 'ellipsis', 'shrink', 'shrink_ellipsis']),
  /**
   * Both required, because the canonical schema's text style is closed and
   * these two are in it. They read like the optional half of an auto-fit
   * policy, and declaring them so would parse every draft the backend sends
   * — and then let the editor write a style without them, which comes back
   * as `schema.missing_field` on the user's own save rather than as a
   * compile error here.
   */
  minimum_font_size_mm: z.number(),
  maximum_lines: z.number().int(),
});

export const LogoStyleSchema = z.object({
  monochrome: z.string(),
  fit: z.string(),
});

export const QrStyleSchema = z.object({
  error_correction: z.string(),
  quiet_zone_modules: z.number().int(),
});

export const DividerStyleSchema = z.object({ fill: z.string() });

const commonElement = {
  id: z.string(),
  frame: LabelFrameSchema,
  /** Clockwise degrees. A divider admits only 0 and 90; the backend enforces it. */
  rotation: z.number().int(),
};

/**
 * One Label Element, by kind.
 *
 * A discriminated union rather than one permissive object: a text element's
 * `style` and a QR element's are disjoint key sets, and flattening them into
 * optional fields would let the editor build a document the backend refuses
 * while the card's own types called it fine.
 */
export const LabelElementSchema = z.discriminatedUnion('kind', [
  z.object({
    ...commonElement,
    kind: z.literal('text'),
    content: ContentSourceSchema,
    style: TextStyleSchema,
  }),
  z.object({
    ...commonElement,
    kind: z.literal('logo'),
    content: ContentSourceSchema,
    style: LogoStyleSchema,
  }),
  z.object({
    ...commonElement,
    kind: z.literal('qr'),
    content: ContentSourceSchema,
    style: QrStyleSchema,
  }),
  z.object({
    ...commonElement,
    /** No `content`: a divider is a mark, not a container for one. */
    kind: z.literal('divider'),
    style: DividerStyleSchema,
  }),
]);
export type LabelElement = z.infer<typeof LabelElementSchema>;

export const LabelDocumentSchema = z.object({
  schema: z.string(),
  version: z.number().int(),
  label_size_id: z.string(),
  /** Paint order *is* the array order. There is no `z_index` to declare. */
  elements: z.array(LabelElementSchema),
});
export type LabelDocument = z.infer<typeof LabelDocumentSchema>;

/** Where a draft's content came from, structurally rather than descriptively. */
export const ProvenanceSchema = z.object({
  source: z.string(),
  factory_id: z.string().nullable(),
  factory_revision: z.number().int().nullable(),
  source_template_id: z.string().nullable(),
  source_revision: z.number().int().nullable(),
  draft_id: z.string().nullable(),
  draft_version: z.number().int().nullable(),
});

/**
 * Work the backend declined to take, kept for its owner to recover from.
 *
 * The reason a rejected autosave is not a loss: the payload the server refused
 * is parked here, on the draft it refused it against, so one answer says both
 * what the server holds and that the client's own work survived.
 */
export const RecoveryPayloadSchema = z.object({
  reason: z.string(),
  document: z.unknown(),
  expected_version: z.number().int().nullable(),
  draft_version: z.number().int().nullable(),
  at: z.string(),
  name: z.string().nullable(),
});
export type RecoveryPayload = z.infer<typeof RecoveryPayloadSchema>;

export const TemplateDraftSchema = z.object({
  id: z.string(),
  owner: z.string(),
  label_size_id: z.string(),
  template_id: z.string().nullable(),
  base_revision: z.number().int().nullable(),
  version: z.number().int(),
  name: z.string().nullable(),
  document: LabelDocumentSchema,
  layout_schema_version: z.number().int(),
  created_at: z.string(),
  modified_at: z.string(),
  provenance: ProvenanceSchema,
  recovery: RecoveryPayloadSchema.nullable(),
});
export type TemplateDraft = z.infer<typeof TemplateDraftSchema>;

/** Whether this document may become a revision, and every reason it may not. */
export const PublicationCheckSchema = z.object({
  operation: z.string(),
  allowed: z.boolean(),
  diagnostics: z.array(
    z.object({
      code: z.string(),
      message: z.string(),
      severity: z.string(),
      layer: z.string(),
      path: z.string(),
      element_id: z.string().nullable(),
      recovery: z.string(),
      parameters: z.record(z.string(), z.unknown()),
    })
  ),
});
export type PublicationCheck = z.infer<typeof PublicationCheckSchema>;

/**
 * Every draft command answers `ok` or `refused`.
 *
 * A refusal is a *result* rather than a transport error because the card has
 * to tell "somebody saved over you" from "this does not validate yet" from
 * "you are no longer an administrator", and act differently on each. Home
 * Assistant's error frame carries one code from a vocabulary that
 * {@link ../../services/errors} flattens to `internal_error` when it does not
 * recognise it, which would erase all three distinctions at once.
 */
function answer<T extends z.ZodRawShape>(shape: T) {
  return z.discriminatedUnion('outcome', [
    z.object({ outcome: z.literal('ok'), contract: LabelContractIdentitySchema, ...shape }),
    z.object({ outcome: z.literal('refused'), refusal: LabelRefusalSchema }),
  ]);
}

export const LibrarySnapshotSchema = z.object({
  entry_id: z.string(),
  /** `null` when the store could not be read; `store.readable` says which. */
  generation: z.number().int().nullable(),
  store: z.object({ readable: z.boolean(), version: z.number().int() }),
  templates: z.array(
    z.object({
      id: z.string(),
      kind: z.string(),
      name: z.string(),
      label_size_id: z.string(),
      head_revision: z.number().int(),
    })
  ),
  /** This administrator's own, and empty for anyone else — the same answer as none. */
  drafts: z.array(
    TemplateDraftSchema.extend({
      stale: z.boolean(),
      head_revision: z.number().int().nullable(),
      orphaned: z.boolean(),
    })
  ),
});
export type LibrarySnapshot = z.infer<typeof LibrarySnapshotSchema>;
export type StoredDraft = LibrarySnapshot['drafts'][number];

export const LibraryAnswerSchema = answer({ library: LibrarySnapshotSchema });
export type LibraryAnswer = z.infer<typeof LibraryAnswerSchema>;

export const DraftOpenedSchema = answer({
  draft: TemplateDraftSchema,
  /** True when unsaved work was still there and this call came back to it. */
  resumed: z.boolean(),
});
export type DraftOpened = z.infer<typeof DraftOpenedSchema>;

export const DraftSavedSchema = answer({
  draft: TemplateDraftSchema,
  validation: PublicationCheckSchema,
  /** Somebody published past this draft's base. Not a fault in the layout. */
  stale: z.boolean(),
  head_revision: z.number().int().nullable(),
  replayed: z.boolean(),
});
export type DraftSaved = z.infer<typeof DraftSavedSchema>;

export const DraftPreviewSchema = answer({
  /** The draft version this raster was rendered from, echoed back. */
  draft_version: z.number().int(),
  label_size_id: z.string(),
  fixture_family: z.string(),
  subject: z.string(),
  render: RenderResultSchema,
});
export type DraftPreview = z.infer<typeof DraftPreviewSchema>;

export const DraftPublishedSchema = answer({
  template: z.object({
    id: z.string(),
    kind: z.string(),
    name: z.string(),
    label_size_id: z.string(),
    head_revision: z.number().int(),
  }),
  revision: z.object({
    revision: z.number().int(),
    name: z.string(),
    operation: z.string(),
    digest: z.string(),
    published_at: z.string(),
    published_by: z.string().nullable(),
    parent_revision: z.number().int().nullable(),
  }),
  generation: z.number().int(),
  replayed: z.boolean(),
  unchanged: z.boolean(),
});
export type DraftPublished = z.infer<typeof DraftPublishedSchema>;

export const DraftDiscardedSchema = answer({
  draft_id: z.string(),
  owner: z.string(),
  label_size_id: z.string(),
  template_id: z.string().nullable(),
  version: z.number().int(),
  /** The work that was removed, so an editor can still offer to undo it. */
  draft: TemplateDraftSchema.nullable(),
  replayed: z.boolean(),
});
export type DraftDiscarded = z.infer<typeof DraftDiscardedSchema>;

// ---------------------------------------------------------------------------
// The refusal codes the editor acts on
// ---------------------------------------------------------------------------

/** Another client wrote first. The refused payload is on the draft that came back. */
export const DRAFT_VERSION_CONFLICT = 'label_template.draft_version_conflict';
/** The draft moved while a render was in flight, so the raster would be of the past. */
export const DRAFT_VERSION_MISMATCH = 'label_template.draft_version_mismatch';
/** Somebody published past this draft's base revision. */
export const DRAFT_STALE = 'label_template.draft_stale';
/** The layout does not validate, so there is nothing to render or publish. */
export const DRAFT_NOT_PUBLISHABLE = 'label_template.draft_not_publishable';
/** There is no draft in the slot that was addressed. */
export const DRAFT_NOT_FOUND = 'label_template.draft_not_found';
/** A Named Template of this Label Size already has the name asked for. */
export const DUPLICATE_NAME = 'label_template.duplicate_name';
/** An untitled draft was published without a name to publish it under. */
export const NAME_REQUIRED = 'label_template.name_required';
/** The acting user is not a Home Assistant administrator. */
export const NOT_AUTHORIZED = 'label_template.not_authorized';
