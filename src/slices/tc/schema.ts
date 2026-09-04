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
