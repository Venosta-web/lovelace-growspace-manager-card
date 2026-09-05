import { z } from 'zod';

/**
 * The reply to `growspace_manager_tc/get_manifest`.
 *
 * Growspace Manager TC is an optional companion integration, so this payload is
 * the card's only evidence that it is installed at all. The recorded fixture is
 * `tests/fixtures/contract/tc_manifest_response.json` in the TC repository,
 * which the contract-fixture workflow diffs against this declaration.
 */
export const TcManifestSchema = z.object({
  /** The shape of the TC WebSocket namespace that answered. `1` today. */
  contract_version: z.number(),
  /** The installed TC release, from its `manifest.json`. */
  integration_version: z.string(),
  /**
   * The features this installation can serve. Gate a surface on membership
   * here, never on `integration_version` — an installed release is not the
   * claim that a feature works. Empty until the V1 model tickets land.
   */
  features: z.array(z.string()),
  /**
   * How many records each persisted collection holds. Empty on a fresh
   * install; a key appears per collection as TC gains them, which is what
   * lets the card tell "nothing set up yet" from "set up and empty" without
   * fetching any records.
   */
  collections: z.record(z.string(), z.number()),
});

export type TcManifest = z.infer<typeof TcManifestSchema>;

/**
 * One additive or hormone entry, with its concentration.
 *
 * `unit` is free text because the backend keeps it free text: hormones are
 * dosed in mg/L by some growers and µM by others, and a closed vocabulary would
 * either be wrong for half of them or need a conversion table nobody owns.
 */
export const MediumComponentSchema = z.object({
  name: z.string(),
  amount: z.number(),
  unit: z.string(),
});

/**
 * An immutable snapshot of a Culture Medium's formulation (TC ADR-0004).
 *
 * Flat rather than nested under a `formulation` key, because that is the shape
 * the backend sends, takes on create/update, and stores — one shape for the
 * form, the reply and the history row.
 */
export const MediumVersionSchema = z.object({
  /** 1-based, and only ever increasing within a medium. */
  version: z.number(),
  created_at: z.string(),
  base_salts: z.string(),
  additives: z.array(MediumComponentSchema),
  hormones: z.array(MediumComponentSchema),
  agar_g_per_l: z.number(),
  sugar_g_per_l: z.number(),
  ph_target: z.number(),
  notes: z.string(),
});

/**
 * A named Culture Medium and the whole history of its formulation.
 *
 * `versions` is ordered oldest first and only ever grows — editing forks a new
 * version and rewrites none of the old ones, which is the thing the library
 * view exists to show. `current_version` names the version a new Plating would
 * pin, stated by the backend so the card never has to trust the ordering.
 */
export const CultureMediumSchema = z.object({
  id: z.string(),
  name: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  current_version: z.number(),
  versions: z.array(MediumVersionSchema),
});

/** The reply to `growspace_manager_tc/culture_media/list`. */
export const CultureMediaResponseSchema = z.object({
  culture_media: z.array(CultureMediumSchema),
});

/** The reply to `culture_media/create` and `culture_media/update`. */
export const CultureMediumMutationSchema = z.object({
  medium: CultureMediumSchema,
});

/** The reply to `culture_media/delete`. */
export const CultureMediumDeletionSchema = z.object({
  medium_id: z.string(),
});

export type MediumComponent = z.infer<typeof MediumComponentSchema>;
export type MediumVersion = z.infer<typeof MediumVersionSchema>;
export type CultureMedium = z.infer<typeof CultureMediumSchema>;

/**
 * What a medium form sends: the name plus the formulation, flat.
 *
 * Derived from the version schema rather than declared again, so a field the
 * backend adds to a snapshot cannot silently go missing from the editor.
 */
export const CultureMediumDraftSchema = MediumVersionSchema.omit({
  version: true,
  created_at: true,
}).extend({ name: z.string() });

export type CultureMediumDraft = z.infer<typeof CultureMediumDraftSchema>;

// ---------------------------------------------------------------------------
// The culture board
// ---------------------------------------------------------------------------

/**
 * A phenotype reference: an opaque ID, and the name it had when it was taken.
 *
 * `id` is Growspace Manager's and TC never parses it (TC ADR-0002), so the
 * card is what joins it against the strain library. `name_snapshot` is a
 * display fallback for when that join fails (TC ADR-0006) — never a second
 * source of truth, and never shown while the ID still resolves.
 */
export const PhenotypeReferenceSchema = z.object({
  id: z.string(),
  name_snapshot: z.string(),
  snapshot_at: z.string(),
});

/** Which of the line's replate intervals a Culture is measured against. */
export const CultureStageSchema = z.enum(['multiplication', 'rooting']);

/**
 * Where a Culture stands.
 *
 * An Introduction only ever produces `active`; the other two are written by the
 * Maintenance Actions that own them. A Culture is never deleted, so a board
 * that has been worked for a season still holds every vessel that ever existed.
 */
export const CultureStatusSchema = z.enum(['active', 'discarded', 'graduated']);

/** How many days a Culture may sit on one medium, per Culture Stage. */
export const ReplateIntervalsSchema = z.object({
  multiplication: z.number(),
  rooting: z.number(),
});

/**
 * One plantlet group in one vessel.
 *
 * `plantlet_count` is `null` when nobody counted, which is not the same fact as
 * a count of zero — the card renders the two differently for exactly that
 * reason. `last_replated_at` is the anchor the line's interval is measured
 * from; an Introduction sets it, because placing the explant is itself a
 * plating onto fresh medium.
 *
 * `replate_due_at` is that anchor plus the line's interval for this vessel's
 * Culture Stage. The backend derives it and never stores it, and it is `null`
 * for a Culture that has ended — a discarded or graduated vessel is not
 * overdue, it is over. **Whether it has passed is the card's verdict**: TC
 * states a date, and a boolean computed when the payload was built would be
 * stale the moment it sat in an atom.
 */
export const CultureSchema = z.object({
  id: z.string(),
  line_id: z.string(),
  stage: CultureStageSchema,
  status: CultureStatusSchema,
  started_at: z.string(),
  last_replated_at: z.string(),
  plantlet_count: z.number().nullable(),
  location: z.string(),
  replate_due_at: z.string().nullable(),
});

/**
 * One preserved lineage of one phenotype, with the vessels it is kept in.
 *
 * `cultures` always travels with the line — empty rather than absent — so a
 * line whose every Culture has ended reads the same shape as one that never had
 * any. `archived_at` is a stamp or `null` rather than a flag, because when a
 * line was put away is the question anyone asks about it.
 */
export const CultureLineSchema = z.object({
  id: z.string(),
  phenotype: PhenotypeReferenceSchema,
  replate_interval_days: ReplateIntervalsSchema,
  created_at: z.string(),
  updated_at: z.string(),
  archived_at: z.string().nullable(),
  cultures: z.array(CultureSchema),
});

/** The reply to `growspace_manager_tc/culture_lines/list`. */
export const CultureLinesResponseSchema = z.object({
  culture_lines: z.array(CultureLineSchema),
});

/** The reply to `introduce`, `relink_phenotype` and `set_archived`. */
export const CultureLineMutationSchema = z.object({
  line: CultureLineSchema,
});

export type PhenotypeReference = z.infer<typeof PhenotypeReferenceSchema>;
export type CultureStage = z.infer<typeof CultureStageSchema>;
export type CultureStatus = z.infer<typeof CultureStatusSchema>;
export type ReplateIntervals = z.infer<typeof ReplateIntervalsSchema>;
export type Culture = z.infer<typeof CultureSchema>;
export type CultureLine = z.infer<typeof CultureLineSchema>;

/**
 * What the Introduction form sends.
 *
 * The phenotype travels as two flat fields rather than as the reference object
 * the reply carries: the card is choosing a phenotype, and `snapshot_at` is the
 * backend's to stamp — a card that sent one would be claiming to know when the
 * name it is looking at was true.
 */
export const IntroductionDraftSchema = z.object({
  phenotype_id: z.string(),
  phenotype_name: z.string(),
  replate_interval_days: ReplateIntervalsSchema,
  stage: CultureStageSchema,
  plantlet_count: z.number().nullable(),
  location: z.string(),
});

export type IntroductionDraft = z.infer<typeof IntroductionDraftSchema>;

// ---------------------------------------------------------------------------
// Maintenance Actions
// ---------------------------------------------------------------------------

/**
 * The closed vocabulary of acts recorded on a Culture.
 *
 * Closed on the backend and closed here: a spelling the card invented would be
 * rejected on the wire, and one it failed to handle would render a history row
 * with no label. Every member has a dialog and a history line.
 */
export const MaintenanceActionTypeSchema = z.enum([
  'replate',
  'discard',
  'note',
  'move_to_rooting',
  'graduate',
]);

/** Why a Culture was ended. Closed, so "lost to contamination" stays countable. */
export const DiscardReasonSchema = z.enum(['contamination', 'spent', 'mistake']);

/**
 * One vessel a Replate produced.
 *
 * The first names the Culture that was replated — its identity survives the
 * transfer — and every further one a Culture the division created, in the order
 * the act asked for them.
 */
export const ReplateVesselSchema = z.object({
  culture_id: z.string(),
  plantlet_count: z.number().nullable(),
  location: z.string(),
});

/**
 * One recorded act on one Culture.
 *
 * Flat, with every field always present: the fields an act does not use are
 * `null` or empty rather than absent, so this is one schema instead of a union
 * of five and a reader counting replates never has to guess whether a missing
 * key means "not applicable" or "an older release did not write it".
 */
export const MaintenanceActionSchema = z.object({
  id: z.string(),
  culture_id: z.string(),
  line_id: z.string(),
  action: MaintenanceActionTypeSchema,
  recorded_at: z.string(),
  note: z.string(),
  /** Replate only: the Medium Version this placement pinned. */
  medium_id: z.string().nullable(),
  medium_version: z.number().nullable(),
  /** Replate only: the vessels the act produced. Empty for every other act. */
  vessels: z.array(ReplateVesselSchema),
  /** Discard only. */
  reason: DiscardReasonSchema.nullable(),
  /** Move to rooting only: the Stage the Culture was moved to. */
  stage: CultureStageSchema.nullable(),
});

/** The reply to `growspace_manager_tc/maintenance/history`. */
export const MaintenanceHistoryResponseSchema = z.object({
  actions: z.array(MaintenanceActionSchema),
});

/**
 * The reply to every one of the five acts.
 *
 * The whole line, because a Replate can divide one Culture into several and the
 * smallest honest unit of change is therefore the line — plus the act that was
 * written, so the card can show what it just did without re-reading the history.
 */
export const MaintenanceMutationSchema = z.object({
  line: CultureLineSchema,
  action: MaintenanceActionSchema,
});

export type MaintenanceActionType = z.infer<typeof MaintenanceActionTypeSchema>;
export type DiscardReason = z.infer<typeof DiscardReasonSchema>;
export type ReplateVessel = z.infer<typeof ReplateVesselSchema>;
export type MaintenanceAction = z.infer<typeof MaintenanceActionSchema>;

/**
 * One vessel a Replate dialog is asking for.
 *
 * `location` is a string here and never `undefined`: the dialog seeds it from
 * the Culture it is replating, so what it sends is always what the grower is
 * looking at. The wire's "absent means inherit" default exists for callers that
 * have nothing to seed from, which a dialog over a known vessel never is.
 */
export const ReplateVesselDraftSchema = z.object({
  plantlet_count: z.number().nullable(),
  location: z.string(),
});

/** What the Replate dialog sends: the medium pin, the vessels, and a note. */
export const ReplateDraftSchema = z.object({
  medium_id: z.string(),
  medium_version: z.number(),
  vessels: z.array(ReplateVesselDraftSchema),
  note: z.string(),
});

export type ReplateVesselDraft = z.infer<typeof ReplateVesselDraftSchema>;
export type ReplateDraft = z.infer<typeof ReplateDraftSchema>;

/** A curated endorsement of a medium itself, never a Medium Version. */
export const PairingSchema = z.object({
  id: z.string(),
  phenotype: PhenotypeReferenceSchema,
  medium_id: z.string(),
  notes: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export const PairingsResponseSchema = z.object({ pairings: z.array(PairingSchema) });
export const PairingMutationSchema = z.object({ pairing: PairingSchema });
export const PairingDeletionSchema = z.object({ pairing_id: z.string() });
export const PairingDraftSchema = z.object({
  phenotype_id: z.string(),
  phenotype_name: z.string(),
  medium_id: z.string(),
  notes: z.string(),
});
export type Pairing = z.infer<typeof PairingSchema>;
export type PairingDraft = z.infer<typeof PairingDraftSchema>;
