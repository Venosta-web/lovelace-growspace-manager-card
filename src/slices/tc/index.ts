import { atom } from 'nanostores';
import { hassCall } from '../../services/hass-call';
import {
  CultureMediaResponseSchema,
  CultureMediumDeletionSchema,
  CultureMediumMutationSchema,
  TcManifestSchema,
  type CultureMedium,
  type CultureMediumDraft,
  type MediumComponent,
  type MediumVersion,
  type TcManifest,
} from './schema';

export type { CultureMedium, CultureMediumDraft, MediumComponent, MediumVersion, TcManifest };
export {
  CultureMediaResponseSchema,
  CultureMediumDraftSchema,
  CultureMediumSchema,
  MediumVersionSchema,
  TcManifestSchema,
} from './schema';

export const TC_DOMAIN = 'growspace_manager_tc';
export const WS_TC_GET_MANIFEST = `${TC_DOMAIN}/get_manifest`;
export const WS_TC_LIST_CULTURE_MEDIA = `${TC_DOMAIN}/culture_media/list`;
export const WS_TC_CREATE_CULTURE_MEDIUM = `${TC_DOMAIN}/culture_media/create`;
export const WS_TC_UPDATE_CULTURE_MEDIUM = `${TC_DOMAIN}/culture_media/update`;
export const WS_TC_DELETE_CULTURE_MEDIUM = `${TC_DOMAIN}/culture_media/delete`;

/**
 * The manifest feature that has to be present before any of the above is
 * called. An installed TC release is not the claim that it serves media.
 */
export const TC_FEATURE_CULTURE_MEDIA = 'culture_media';

/**
 * Whether Growspace Manager TC is there to talk to.
 *
 * Home Assistant tells a Lovelace card nothing about which custom integrations
 * are installed, so the card asks TC's own namespace and reads the answer:
 *
 * | reply             | meaning                          |
 * | ----------------- | -------------------------------- |
 * | a manifest        | installed, loaded, ready         |
 * | `unknown_command` | not installed                    |
 * | `not_loaded`      | installed, entry not loaded      |
 * | anything else     | unreachable, or a shape we can't read |
 *
 * Every failure collapses to `absent`: there is no TC surface to render either
 * way, and a card that guessed otherwise would render an empty shell to users
 * who never installed the integration.
 */
export type TcPresence =
  | { status: 'unknown' }
  | { status: 'present'; manifest: TcManifest }
  | { status: 'absent'; reason: string };

export const tcPresence$ = atom<TcPresence>({ status: 'unknown' });

let probe: Promise<TcPresence> | null = null;

/**
 * Probe once per page load, and share the answer.
 *
 * Several cards on one dashboard must not each open the same round trip, and
 * the result is cached for the session in both directions — installing or
 * removing TC is a Home Assistant restart away from the browser, so a reload is
 * the honest boundary for re-asking.
 */
export async function detectTc(): Promise<TcPresence> {
  probe ??= (async (): Promise<TcPresence> => {
    try {
      const manifest = await hassCall(WS_TC_GET_MANIFEST, {}, TcManifestSchema);
      return { status: 'present', manifest };
    } catch (error) {
      return { status: 'absent', reason: error instanceof Error ? error.message : String(error) };
    }
  })();

  const presence = await probe;
  tcPresence$.set(presence);
  return presence;
}

/** Whether a detected TC installation serves a given feature. */
export function tcHasFeature(feature: string): boolean {
  const presence = tcPresence$.get();
  return presence.status === 'present' && presence.manifest.features.includes(feature);
}

/** Forget the cached probe. Tests only — nothing in the card re-detects. */
export function resetTcPresence(): void {
  probe = null;
  tcPresence$.set({ status: 'unknown' });
  cultureMedia$.set([]);
}

// ---------------------------------------------------------------------------
// The Culture Medium library
// ---------------------------------------------------------------------------

/**
 * The library, each medium carrying its whole version history.
 *
 * History arrives with the list rather than per medium: a library is tens of
 * records, and what the view exists to show is that editing forked rather than
 * rewrote. Ordering is the backend's — by name, case regardless — and is not
 * re-sorted here, so two clients never disagree about the order.
 */
export const cultureMedia$ = atom<CultureMedium[]>([]);

/** Fetch the library and publish it. Re-throws without touching the atom. */
export async function fetchCultureMedia(): Promise<CultureMedium[]> {
  const { culture_media: media } = await hassCall(
    WS_TC_LIST_CULTURE_MEDIA,
    {},
    CultureMediaResponseSchema
  );
  cultureMedia$.set(media);
  return media;
}

/**
 * Add a medium at version 1.
 *
 * The reply carries the whole medium, so the atom is updated from it rather
 * than by re-listing — one round trip, and no window in which the library is
 * missing the row the grower just created.
 */
export async function createCultureMedium(draft: CultureMediumDraft): Promise<CultureMedium> {
  const { medium } = await hassCall(
    WS_TC_CREATE_CULTURE_MEDIUM,
    { ...draft },
    CultureMediumMutationSchema
  );
  cultureMedia$.set(_sortedByName([...cultureMedia$.get(), medium]));
  return medium;
}

/**
 * Apply an edit.
 *
 * Whether this forks a Medium Version is the backend's decision, not the
 * card's: it forks when the formulation changed and leaves the history alone
 * when it did not (TC ADR-0004). The card renders whatever came back rather
 * than predicting it, so a rename never invents a version that does not exist.
 */
export async function updateCultureMedium(
  mediumId: string,
  draft: CultureMediumDraft
): Promise<CultureMedium> {
  const { medium } = await hassCall(
    WS_TC_UPDATE_CULTURE_MEDIUM,
    { medium_id: mediumId, ...draft },
    CultureMediumMutationSchema
  );
  cultureMedia$.set(
    _sortedByName(cultureMedia$.get().map((entry) => (entry.id === medium.id ? medium : entry)))
  );
  return medium;
}

/** Remove a medium, and with it its version history. */
export async function deleteCultureMedium(mediumId: string): Promise<void> {
  const { medium_id: removed } = await hassCall(
    WS_TC_DELETE_CULTURE_MEDIUM,
    { medium_id: mediumId },
    CultureMediumDeletionSchema
  );
  cultureMedia$.set(cultureMedia$.get().filter((entry) => entry.id !== removed));
}

/**
 * Re-apply the backend's ordering rule — by name, case regardless — after a
 * local insert, so a row the grower just added lands where a refetch would put
 * it instead of at the end of the list.
 */
function _sortedByName(media: CultureMedium[]): CultureMedium[] {
  return [...media].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
}

/** The formulation a form starts from: the current version, or empty defaults. */
export function draftFromMedium(medium?: CultureMedium): CultureMediumDraft {
  const version = medium?.versions.find((entry) => entry.version === medium.current_version);
  return {
    name: medium?.name ?? '',
    base_salts: version?.base_salts ?? '',
    additives: version ? [...version.additives] : [],
    hormones: version ? [...version.hormones] : [],
    agar_g_per_l: version?.agar_g_per_l ?? 7,
    sugar_g_per_l: version?.sugar_g_per_l ?? 30,
    ph_target: version?.ph_target ?? 5.8,
    notes: version?.notes ?? '',
  };
}
