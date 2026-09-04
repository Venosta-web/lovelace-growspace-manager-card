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
