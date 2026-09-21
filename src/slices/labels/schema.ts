/**
 * The Label Template capability envelope, and the one preview beside it.
 *
 * Two rules from the compatibility contract shape everything here.
 *
 * **The card never assembles a capability.** Support is one envelope the
 * backend publishes or withholds — never a guess from an integration version,
 * a registered command, or a trial call that happened to succeed. So the
 * envelope is parsed as a whole and refused as a whole: a missing operation,
 * an empty catalogue, or a Label Size naming a Factory Template that is not
 * shipped makes the *whole* capability unusable, because a card that used the
 * readable half would start an editor session that fails somewhere in its
 * middle.
 *
 * **A minor version may add.** Objects here are deliberately not `.strict()`.
 * The backend may add optional fields and catalogue entries within a major
 * version precisely because older clients can ignore them, and a card that
 * rejected the addition would turn a compatible backend into an incompatible
 * one. What the card does check is that everything it *needs* is present and
 * internally consistent.
 */

import { z } from 'zod';

/** The capability family this card implements. Anything else is another product. */
export const LABEL_CAPABILITY_FAMILY = 'growspace.label-templates';

/** The major contract this card speaks. A different one is not negotiable. */
export const LABEL_CONTRACT_MAJOR = 1;

/**
 * The card-side contract identity the backend names as its minimum.
 *
 * The backend publishes `minimum_card_contract` for the case where a
 * restriction cannot be expressed through the envelope itself. A card that
 * does not implement the named contract must stay off the new path rather
 * than discover the restriction mid-operation.
 */
export const LABEL_CARD_CONTRACT = 'growspace.label-templates-card.v1';

/**
 * Every operation the V1 capability has to carry before the card uses any of
 * it. Advertising a partial editor contract is the failure this list exists
 * to catch — see the backend's own `REQUIRED_OPERATIONS`, which it mirrors.
 */
export const REQUIRED_LABEL_OPERATIONS = [
  'discover',
  'lifecycle',
  'validate',
  'preview',
  'calibration',
  'test_print',
  'single_print',
  'batch_preflight',
  'batch_print',
  'batch_retry',
  'portable_export',
  'portable_import',
  'backup',
  'restore',
] as const;

export type LabelOperation = (typeof REQUIRED_LABEL_OPERATIONS)[number];

/** The identity every contract-gated command has to echo back. */
export const LabelContractIdentitySchema = z.object({
  family: z.string(),
  major: z.number().int(),
  minor: z.number().int(),
  generation: z.number().int(),
});
export type LabelContractIdentity = z.infer<typeof LabelContractIdentitySchema>;

export const LabelOperationAvailabilitySchema = z.object({
  available: z.boolean(),
  contract_required: z.boolean(),
});

export const LabelSizeSchema = z.object({
  id: z.string(),
  width_mm: z.number(),
  height_mm: z.number(),
  /** The Classic Request's name for the same stock, which is how the two paths stay legible as one product. */
  classic_key: z.string(),
  factory_template_id: z.string(),
});
export type LabelSize = z.infer<typeof LabelSizeSchema>;

/** How much a profile has proved, in the product's own words. */
export const ProfileEvidenceSchema = z.enum(['provisional', 'product_verified']);
export type ProfileEvidence = z.infer<typeof ProfileEvidenceSchema>;

/** A rectangle of the stock, in the millimetres the compiler works in. */
export const AreaSchema = z.object({
  x_mm: z.number(),
  y_mm: z.number(),
  width_mm: z.number(),
  height_mm: z.number(),
});

/** What one profile refuses, measured or assumed. Declared whole; unread here. */
export const ProfileLimitsSchema = z.object({
  text_readable_floor_mm: z.number(),
  text_comfort_threshold_mm: z.number(),
  divider_minimum_thickness_mm: z.number(),
  image_minimum_effective_dpi: z.number(),
  qr_minimum_dots_per_module: z.number(),
  qr_minimum_quiet_zone_modules: z.number(),
  qr_maximum_encoded_bytes: z.number(),
  qr_error_correction_levels: z.array(z.string()),
  /** Whether these came off paper rather than out of a data sheet. */
  measured: z.boolean(),
});

export const CapabilityProfileSchema = z.object({
  id: z.string(),
  label_size_id: z.string(),
  printer_class: z.string(),
  dpi: z.number(),
  printhead_pixels: z.number().int(),
  orientation: z.string(),
  feed_axis: z.string(),
  evidence: ProfileEvidenceSchema,
  /** Whether this profile may put a real record on paper at all. */
  authorizes_production: z.boolean(),
  evidence_recorded_at: z.string().nullable(),
  evidence_reference: z.string().nullable(),
  evidence_invalidated_by: z.array(z.string()),
  stock_area: AreaSchema,
  printable_area: AreaSchema,
  safe_area: AreaSchema,
  /** Semantic density to this device's own value. Unread here; the backend maps it. */
  density_levels: z.record(z.string(), z.number()),
  supported_element_rotations: z.array(z.number()),
  limits: ProfileLimitsSchema,
});
export type CapabilityProfile = z.infer<typeof CapabilityProfileSchema>;

/**
 * A shipped Factory Template, as the catalogue lists it.
 *
 * `layout` stays opaque on purpose. The backend raster is the preview oracle,
 * so a card that parsed the layout in order to draw it would be building the
 * second renderer the whole seam exists to prevent. The digest is what the
 * card uses: it says which layout a raster belongs to.
 */
export const FactoryTemplateSummarySchema = z.object({
  id: z.string(),
  revision: z.number().int(),
  name: z.string(),
  label_size_id: z.string(),
  layout: z.record(z.string(), z.unknown()),
  layout_digest: z.string(),
});
export type FactoryTemplateSummary = z.infer<typeof FactoryTemplateSummarySchema>;

/** One binding a Label Element may carry, and what its absence does. */
export const BindingSchema = z.object({
  id: z.string(),
  kinds: z.array(z.string()),
  contexts: z.array(z.string()),
  /**
   * Per-parameter allowed values, keyed by parameter name.
   *
   * Opaque Region (ADR 0031): the key set is the binding's own, so it is a
   * catalogue rather than a shape, and one binding growing a parameter must
   * not fail the whole capability parse.
   */
  parameters: z.record(z.string(), z.array(z.string())),
  missing_policy: z.string(),
  required: z.boolean(),
});

const CataloguesSchema = z.object({
  label_sizes: z.array(LabelSizeSchema).min(1),
  bindings: z.array(BindingSchema).min(1),
  style_tokens: z.object({
    fonts: z.array(z.object({ id: z.string(), description: z.string() })).min(1),
    line_spacing: z.array(z.object({ id: z.string(), ratio: z.number() })).min(1),
    monochrome: z.array(z.object({ id: z.string(), dither: z.boolean() })).min(1),
  }),
  profiles: z.array(CapabilityProfileSchema),
  factory_templates: z.array(FactoryTemplateSummarySchema).min(1),
  representative_fixtures: z.record(z.string(), z.record(z.string(), z.string())),
});

const BaseCapabilitySchema = z.object({
  contract: LabelContractIdentitySchema,
  minimum_card_contract: z.string(),
  versions: z.record(z.string(), z.union([z.string(), z.number()])),
  operations: z.record(z.string(), LabelOperationAvailabilitySchema),
  catalogues: CataloguesSchema,
  supported: z.object({
    contexts: z.array(z.string()).min(1),
    locales: z.array(z.string()).min(1),
    element_kinds: z.array(z.string()).min(1),
  }),
  limits: z.object({
    coordinate_quantum_mm: z.number(),
    commit_ledger_entries: z.number().int(),
    logo_source_bytes: z.number().int(),
    qr_max_version: z.number().int(),
  }),
});

/**
 * The complete, self-consistent envelope — or nothing.
 *
 * The refinements below are what "resolved consistently" means in practice.
 * Each of them describes an envelope the card could half-use, which is the
 * one thing it must not do.
 */
export const LabelTemplateCapabilitySchema = BaseCapabilitySchema.superRefine((value, ctx) => {
  if (value.contract.family !== LABEL_CAPABILITY_FAMILY) {
    ctx.addIssue({
      code: 'custom',
      message: `capability family ${value.contract.family} is not ${LABEL_CAPABILITY_FAMILY}`,
    });
  }
  if (value.contract.major !== LABEL_CONTRACT_MAJOR) {
    ctx.addIssue({
      code: 'custom',
      message: `contract major ${value.contract.major} is not the ${LABEL_CONTRACT_MAJOR} this card implements`,
    });
  }
  if (value.minimum_card_contract !== LABEL_CARD_CONTRACT) {
    ctx.addIssue({
      code: 'custom',
      message: `this card implements ${LABEL_CARD_CONTRACT}, not ${value.minimum_card_contract}`,
    });
  }

  const missing = REQUIRED_LABEL_OPERATIONS.filter(
    (operation) => value.operations[operation]?.available !== true
  );
  if (missing.length > 0) {
    ctx.addIssue({
      code: 'custom',
      message: `operations not available: ${missing.join(', ')}`,
    });
  }

  const shipped = new Set(value.catalogues.factory_templates.map((item) => item.id));
  const unfilled = value.catalogues.label_sizes.filter(
    (size) => !shipped.has(size.factory_template_id)
  );
  if (unfilled.length > 0) {
    ctx.addIssue({
      code: 'custom',
      message: `Label Sizes name unshipped Factory Templates: ${unfilled
        .map((size) => size.id)
        .join(', ')}`,
    });
  }

  const sizes = new Set(value.catalogues.label_sizes.map((size) => size.id));
  const orphaned = value.catalogues.profiles.filter((profile) => !sizes.has(profile.label_size_id));
  if (orphaned.length > 0) {
    ctx.addIssue({
      code: 'custom',
      message: `Capability Profiles name uncatalogued Label Sizes: ${orphaned
        .map((profile) => profile.id)
        .join(', ')}`,
    });
  }
});
export type LabelTemplateCapability = z.infer<typeof LabelTemplateCapabilitySchema>;

// ---------------------------------------------------------------------------
// The Factory Template preview
// ---------------------------------------------------------------------------

/** The authoritative monochrome bitmap, exactly as the renderer produced it. */
export const RasterSchema = z.object({
  content_type: z.string(),
  width: z.number().int(),
  height: z.number().int(),
  image: z.string(),
  byte_length: z.number().int(),
  monochrome: z.boolean(),
});
export type Raster = z.infer<typeof RasterSchema>;

export const DiagnosticSchema = z.object({
  code: z.string(),
  severity: z.enum(['error', 'warning', 'info']),
  message: z.string(),
  /** Which layer decided this: validation, compilation, profile, raster. */
  layer: z.string(),
  element_id: z.string().nullable(),
  /** The document path it points at, empty when it points at the whole label. */
  path: z.string(),
  /**
   * The diagnostic's own numbers.
   *
   * Opaque Region (ADR 0031): the key set belongs to the diagnostic code, and
   * the card renders the backend's already-composed `message` rather than
   * recomposing it — a new code's parameters must not fail the parse.
   */
  parameters: z.record(z.string(), z.unknown()),
  recovery: z.string(),
});
export type LabelDiagnostic = z.infer<typeof DiagnosticSchema>;

export const OperationEligibilitySchema = z.object({
  operation: z.string(),
  allowed: z.boolean(),
  blocked_by: z.array(z.string()),
});

/**
 * The Render Context, which is what makes a raster an oracle rather than a
 * picture. `capability_generation` is the field the card leans on hardest: a
 * result minted under another generation is stale by definition.
 */
export const RenderContextSchema = z.object({
  capability_generation: z.number().int(),
  layout_digest: z.string(),
  label_size_id: z.string(),
  label_size_catalogue_version: z.string(),
  profile_id: z.string(),
  profile_evidence: ProfileEvidenceSchema,
  local_calibration: z.string().nullable(),
  content_identity: z.string(),
  content_context: z.string(),
  content_source: z.string(),
  locale: z.string(),
  time_zone: z.string(),
  as_of: z.string(),
  density: z.string(),
  density_level: z.number(),
  operation: z.string(),
  /** Each face this render resolved, or `unresolved`. Keyed by font file. */
  font_identity: z.record(z.string(), z.string()),
  binding_catalogue_version: z.string(),
  style_token_catalogue_version: z.string(),
  compiler_version: z.string(),
  renderer_version: z.string(),
  adapter_version: z.string(),
  safety_policy_version: z.string(),
  qr_model_version: z.string(),
  text_toolchain_version: z.string(),
});
export type RenderContext = z.infer<typeof RenderContextSchema>;

/** A pixel rectangle on the compiled raster. */
export const PixelFrameSchema = z.object({
  left: z.number(),
  top: z.number(),
  right: z.number(),
  bottom: z.number(),
  width: z.number(),
  height: z.number(),
});

/** Where one Label Element landed, and whether it landed at all. */
export const ElementOutcomeSchema = z.object({
  element_id: z.string(),
  kind: z.string(),
  binding: z.string().nullable(),
  status: z.string(),
  pixel_frame: PixelFrameSchema,
  /**
   * The element kind's own measurements.
   *
   * Opaque Region (ADR 0031): a text element's notes and a divider's have no
   * shape in common, and the card shows the raster rather than these numbers.
   */
  notes: z.record(z.string(), z.unknown()),
});

/** What one element really inked, as opposed to the box it was given. */
export const ElementInkSchema = z.object({
  element_id: z.string(),
  kind: z.string(),
  basis: z.string(),
  /** `null` when the element put no ink down at all: an optional value left blank. */
  bounds: PixelFrameSchema.nullable(),
  protected_area: PixelFrameSchema.nullable(),
  mask_digest: z.string(),
  /** Opaque Region (ADR 0031): per-kind measurement detail, as in `notes` above. */
  measurements: z.record(z.string(), z.unknown()),
});

/** Two elements whose ink coincides, and how badly. */
export const OverlapPairSchema = z.object({
  first: z.string(),
  second: z.string(),
  grade: z.string(),
  overlapping_pixels: z.number(),
});

export const RenderResultSchema = z.object({
  status: z.enum(['current', 'failed']),
  printable: z.boolean(),
  cache_identity: z.string(),
  raster_identity: z.string(),
  /** The digest of the bytes handed to the printer adapter; absent on failure. */
  raster_input_digest: z.string().nullable(),
  render_context: RenderContextSchema,
  profile: CapabilityProfileSchema.nullable(),
  raster: RasterSchema.nullable(),
  elements: z.array(ElementOutcomeSchema),
  ink: z.array(ElementInkSchema),
  overlaps: z.array(OverlapPairSchema),
  diagnostics: z.array(DiagnosticSchema),
  eligibility: z.record(z.string(), OperationEligibilitySchema),
});
export type RenderResult = z.infer<typeof RenderResultSchema>;

/**
 * A refusal the card can act on rather than only display.
 *
 * It arrives as a successful result with `outcome: "refused"` rather than as
 * a transport error, because the card has to tell a stale contract from an
 * unprofiled stock from a renderer failure and do something different about
 * each — and Home Assistant's error frame carries a code and a sentence,
 * which is enough for none of them.
 */
export const LabelRefusalSchema = z.object({
  code: z.string(),
  reason: z.string(),
  /**
   * What the card may *do* about this refusal.
   *
   * An open vocabulary rather than an enum, and deliberately so. Recovery
   * verbs are backend words that may grow inside a major version -- the draft
   * commands added four of them -- while `CAPABILITY_GENERATION` tracks the
   * catalogues, not the command set, so nothing would bump to warn a card
   * that pinned the list. A verb this card does not recognise means "show the
   * reason, offer nothing automatic", which is always a safe answer; a pinned
   * enum would instead turn a compatible backend into an unparseable one.
   */
  recovery: z.string(),
  /** The contract the backend is on now, so a refusal carries its own fix. */
  current: LabelContractIdentitySchema,
  /**
   * The identity the command was sent with, echoed back.
   *
   * Opaque Region (ADR 0031): it is whatever the card sent, including the
   * shapes a *future* card will send, and it exists to be shown in a log.
   */
  received: z.unknown().optional(),
  label_size_id: z.string().optional(),
  locale: z.string().optional(),
  /** A refused print: which operation, and every reason, in correction order. */
  operation: z.string().optional(),
  blocked_by: z.array(z.string()).optional(),
  /** A refused measurement: the one entered value it is about. */
  field: z.string().nullable().optional(),
  /** A refused batch print or retry: the job still printing, or the one named. */
  job_id: z.string().optional(),
});
export type LabelRefusal = z.infer<typeof LabelRefusalSchema>;

/** The backend's own code for "your contract identity is no longer current". */
export const CONTRACT_INCOMPATIBLE = 'label_template.contract_incompatible';

export const FactoryTemplatePreviewSchema = z.discriminatedUnion('outcome', [
  z.object({
    outcome: z.literal('rendered'),
    contract: LabelContractIdentitySchema,
    template: z.object({
      id: z.string(),
      revision: z.number().int(),
      name: z.string(),
      label_size_id: z.string(),
      layout_digest: z.string(),
    }),
    subject: z.string(),
    fixture_family: z.string(),
    render: RenderResultSchema,
  }),
  z.object({
    outcome: z.literal('refused'),
    refusal: LabelRefusalSchema,
  }),
]);
export type FactoryTemplatePreview = z.infer<typeof FactoryTemplatePreviewSchema>;
