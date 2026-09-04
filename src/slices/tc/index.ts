import { atom } from 'nanostores';
import { hassCall } from '../../services/hass-call';
import type { StrainEntry } from '../../types';
import {
  CultureLineMutationSchema,
  CultureLinesResponseSchema,
  CultureMediaResponseSchema,
  CultureMediumDeletionSchema,
  CultureMediumMutationSchema,
  TcManifestSchema,
  type Culture,
  type CultureLine,
  type CultureMedium,
  type CultureMediumDraft,
  type CultureStage,
  type CultureStatus,
  type IntroductionDraft,
  type MediumComponent,
  type MediumVersion,
  type PhenotypeReference,
  type ReplateIntervals,
  type TcManifest,
} from './schema';

export type {
  Culture,
  CultureLine,
  CultureMedium,
  CultureMediumDraft,
  CultureStage,
  CultureStatus,
  IntroductionDraft,
  MediumComponent,
  MediumVersion,
  PhenotypeReference,
  ReplateIntervals,
  TcManifest,
};
export {
  CultureLineMutationSchema,
  CultureLineSchema,
  CultureLinesResponseSchema,
  CultureMediaResponseSchema,
  CultureMediumDraftSchema,
  CultureMediumSchema,
  CultureSchema,
  IntroductionDraftSchema,
  MediumVersionSchema,
  PhenotypeReferenceSchema,
  TcManifestSchema,
} from './schema';

export const TC_DOMAIN = 'growspace_manager_tc';
export const WS_TC_GET_MANIFEST = `${TC_DOMAIN}/get_manifest`;
export const WS_TC_LIST_CULTURE_MEDIA = `${TC_DOMAIN}/culture_media/list`;
export const WS_TC_CREATE_CULTURE_MEDIUM = `${TC_DOMAIN}/culture_media/create`;
export const WS_TC_UPDATE_CULTURE_MEDIUM = `${TC_DOMAIN}/culture_media/update`;
export const WS_TC_DELETE_CULTURE_MEDIUM = `${TC_DOMAIN}/culture_media/delete`;
export const WS_TC_LIST_CULTURE_LINES = `${TC_DOMAIN}/culture_lines/list`;
export const WS_TC_INTRODUCE_CULTURE_LINE = `${TC_DOMAIN}/culture_lines/introduce`;
export const WS_TC_RELINK_PHENOTYPE = `${TC_DOMAIN}/culture_lines/relink_phenotype`;
export const WS_TC_SET_CULTURE_LINE_ARCHIVED = `${TC_DOMAIN}/culture_lines/set_archived`;

/**
 * The manifest feature that has to be present before any of the above is
 * called. An installed TC release is not the claim that it serves media.
 */
export const TC_FEATURE_CULTURE_MEDIA = 'culture_media';

/** The manifest feature gating the culture board and the Introduction form. */
export const TC_FEATURE_CULTURE_LINES = 'culture_lines';

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
  cultureLines$.set([]);
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

// ---------------------------------------------------------------------------
// The culture board
// ---------------------------------------------------------------------------

/**
 * Every Culture Line, each carrying its own vessels.
 *
 * Ordering is the backend's — live lines before archived ones, then by the
 * snapshotted phenotype name — and is not re-sorted here, so two clients never
 * disagree about the order and a line whose phenotype was deleted keeps its
 * place instead of jumping when it goes missing.
 */
export const cultureLines$ = atom<CultureLine[]>([]);

/** Fetch the board and publish it. Re-throws without touching the atom. */
export async function fetchCultureLines(): Promise<CultureLine[]> {
  const { culture_lines: lines } = await hassCall(
    WS_TC_LIST_CULTURE_LINES,
    {},
    CultureLinesResponseSchema
  );
  cultureLines$.set(lines);
  return lines;
}

/**
 * Perform an Introduction: one line, its intervals, and its first vessel.
 *
 * The reply carries the finished line with that vessel already in it, so the
 * board is updated from the answer rather than by re-listing — one round trip,
 * and no window in which the board is missing the line just created.
 */
export async function introduceCultureLine(draft: IntroductionDraft): Promise<CultureLine> {
  const { line } = await hassCall(
    WS_TC_INTRODUCE_CULTURE_LINE,
    { ...draft },
    CultureLineMutationSchema
  );
  cultureLines$.set(_sortedForBoard([...cultureLines$.get(), line]));
  return line;
}

/**
 * Point a line at another phenotype — one of the two ways out of a Missing
 * Phenotype (TC ADR-0006).
 *
 * The whole reference is replaced, snapshot included, because a line that kept
 * the old name would render under a phenotype it no longer refers to.
 */
export async function relinkPhenotype(
  lineId: string,
  phenotypeId: string,
  phenotypeName: string
): Promise<CultureLine> {
  const { line } = await hassCall(
    WS_TC_RELINK_PHENOTYPE,
    { line_id: lineId, phenotype_id: phenotypeId, phenotype_name: phenotypeName },
    CultureLineMutationSchema
  );
  cultureLines$.set(_replaceLine(line));
  return line;
}

/**
 * Put a line away, or bring it back — the other way out, and reversible.
 *
 * Archiving deletes nothing: the line, its vessels and its history stay, and
 * the backend keeps listing it so that a line the card chose to hide is never
 * confused with one that is gone.
 */
export async function setCultureLineArchived(
  lineId: string,
  archived: boolean
): Promise<CultureLine> {
  const { line } = await hassCall(
    WS_TC_SET_CULTURE_LINE_ARCHIVED,
    { line_id: lineId, archived },
    CultureLineMutationSchema
  );
  cultureLines$.set(_replaceLine(line));
  return line;
}

function _replaceLine(line: CultureLine): CultureLine[] {
  return _sortedForBoard(cultureLines$.get().map((entry) => (entry.id === line.id ? line : entry)));
}

/**
 * Re-apply the backend's ordering rule after a local insert or replace, so a
 * line the grower just introduced — or just archived — lands where a refetch
 * would put it instead of staying where it happened to be.
 */
function _sortedForBoard(lines: CultureLine[]): CultureLine[] {
  return [...lines].sort(
    (a, b) =>
      Number(a.archived_at !== null) - Number(b.archived_at !== null) ||
      a.phenotype.name_snapshot.localeCompare(b.phenotype.name_snapshot, undefined, {
        sensitivity: 'base',
      }) ||
      a.created_at.localeCompare(b.created_at)
  );
}

/**
 * How a line's phenotype resolved against Growspace Manager's strain library.
 *
 * `unresolved` is the honest answer when the library has not loaded: an empty
 * library and a deleted phenotype look identical from the join alone, and
 * reporting every line as missing because a fetch failed would be a worse lie
 * than showing a stale name.
 */
export type PhenotypeResolution =
  | { status: 'resolved'; name: string }
  | { status: 'missing'; name: string }
  | { status: 'unresolved'; name: string };

/**
 * Resolve a line's phenotype reference against a loaded strain library.
 *
 * The join is the card's job because TC cannot do it: phenotype identity is
 * Growspace Manager's (TC ADR-0002), and TC would have to read another
 * integration's storage to look one up. `libraryLoaded` is passed rather than
 * inferred from `names.size`, because a library that really is empty is a fact
 * and a library that has not arrived yet is not.
 */
export function resolvePhenotype(
  reference: PhenotypeReference,
  names: ReadonlyMap<string, string>,
  libraryLoaded: boolean
): PhenotypeResolution {
  const resolved = names.get(reference.id);
  if (resolved !== undefined) return { status: 'resolved', name: resolved };
  if (!libraryLoaded) return { status: 'unresolved', name: reference.name_snapshot };
  return { status: 'missing', name: reference.name_snapshot };
}

/** The intervals an Introduction starts from, in days. */
export function draftIntroduction(): IntroductionDraft {
  return {
    phenotype_id: '',
    phenotype_name: '',
    replate_interval_days: { multiplication: 30, rooting: 21 },
    stage: 'multiplication',
    plantlet_count: null,
    location: '',
  };
}

// ---------------------------------------------------------------------------
// The client-side phenotype join
// ---------------------------------------------------------------------------

/** One phenotype the grower can point a Culture Line at. */
export interface PhenotypeOption {
  /** Growspace Manager's key for the phenotype — opaque to TC. */
  id: string;
  /** What to show, and what to snapshot when a reference is taken. */
  name: string;
}

/**
 * The display name of one strain-library entry.
 *
 * `default` is Growspace Manager's spelling for "this strain has no named
 * phenotype", so it is dropped rather than shown: a picker offering
 * "Blue Dream — default" would be naming an implementation detail.
 */
export function phenotypeLabel(entry: Pick<StrainEntry, 'strain' | 'phenotype'>): string {
  const phenotype = entry.phenotype && entry.phenotype !== 'default' ? entry.phenotype : '';
  return phenotype ? `${entry.strain} — ${phenotype}` : entry.strain;
}

/**
 * The strain library as phenotypes a Culture Line can reference.
 *
 * This is the whole of the TC ↔ Growspace Manager contract from the card's
 * side: a phenotype ID is a stable string, and `key` is the string Growspace
 * Manager already uses for one. Nothing is asked of the integration and
 * nothing is added to it (TC ADR-0002) — the picker is a client-side join over
 * data the card has already fetched.
 */
export function phenotypeOptions(library: StrainEntry[]): PhenotypeOption[] {
  return library.map((entry) => ({ id: entry.key, name: phenotypeLabel(entry) }));
}

/** The same join, indexed for resolving a stored reference back to a name. */
export function phenotypeNameIndex(library: StrainEntry[]): ReadonlyMap<string, string> {
  return new Map(library.map((entry) => [entry.key, phenotypeLabel(entry)]));
}
