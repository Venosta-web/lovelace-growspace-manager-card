/**
 * Keeps a stable release inside the window HACS reads releases from.
 *
 * HACS lists a repository's releases once, with GitHub's default page of 30,
 * and takes the first stable it finds on that page as the version to install.
 * With `show_beta` off — the default for every new user — a page of 30
 * prereleases leaves it nothing to install: it falls back to the default
 * branch, finds no `growspace-manager-card.js` in a tree whose `dist/` is not
 * tracked, and refuses without logging anything (#975). `dev` publishes several
 * prereleases a day, so the last stable leaves that page within a week of every
 * promotion.
 *
 * The fix is to delete the GitHub release of every prerelease older than the
 * newest `PRERELEASES_KEPT`, which bounds how many releases can stand in front
 * of the newest stable. Only the release object goes: the tag, the commit it
 * names and the bundle committed to it all stay, so semantic-release still
 * computes the next version from its tags and every old version is still
 * reachable in git. Stable releases and drafts are never touched.
 *
 * See docs/adr/0059-prereleases-are-pruned-to-keep-a-stable-in-the-hacs-window.md.
 */

/** What HACS 2.x reads: one `GET /releases` page, at GitHub's default size. */
export const HACS_RELEASE_WINDOW = 30;

/**
 * Well inside the window, so a prune that fails for a few publishes in a row
 * still leaves the stable where HACS can see it.
 */
export const PRERELEASES_KEPT = 20;

const PAGE_SIZE = 100;

/**
 * @param {Array<{ id: number, tag_name: string, prerelease: boolean, draft: boolean }>} releases
 *   in the order GitHub lists them, which is the order HACS reads them in.
 * @returns {{
 *   pruned: typeof releases,
 *   kept: typeof releases,
 *   stable: { tag: string, position: number } | null,
 *   withinWindow: boolean,
 * }} `stable` is the newest stable release and its 1-based position in the
 *   listing once `pruned` is gone.
 */
export function planReleaseWindow(
  releases,
  { keep = PRERELEASES_KEPT, window = HACS_RELEASE_WINDOW } = {}
) {
  if (!Number.isInteger(keep) || keep < 1 || keep > window - 1) {
    throw new Error(`keep must be an integer from 1 to ${window - 1}, got ${keep}`);
  }

  const pruned = [];
  const kept = [];
  let prereleasesSeen = 0;
  for (const release of releases) {
    const prunable = release.prerelease && !release.draft;
    if (prunable && ++prereleasesSeen > keep) pruned.push(release);
    else kept.push(release);
  }

  const index = kept.findIndex((release) => !release.prerelease && !release.draft);
  const stable = index === -1 ? null : { tag: kept[index].tag_name, position: index + 1 };
  return { pruned, kept, stable, withinWindow: stable !== null && stable.position <= window };
}

/**
 * The one piece of the forge this touches. `fetchImpl` is injected so the
 * tests can answer for GitHub.
 */
export function createGitHubReleases({
  repository,
  token,
  fetchImpl = fetch,
  apiUrl = 'https://api.github.com',
}) {
  if (!repository) throw new Error('No repository to read releases from');
  if (!token) throw new Error('No GitHub token; set GITHUB_TOKEN');

  const request = (path, method = 'GET') =>
    fetchImpl(`${apiUrl}/repos/${repository}${path}`, {
      method,
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'x-github-api-version': '2022-11-28',
      },
    });

  return {
    async list() {
      const releases = [];
      for (let page = 1; ; page += 1) {
        const response = await request(`/releases?per_page=${PAGE_SIZE}&page=${page}`);
        if (!response.ok) {
          throw new Error(`Listing releases failed: HTTP ${response.status}`);
        }
        const batch = await response.json();
        releases.push(
          ...batch.map(({ id, tag_name, prerelease, draft }) => ({
            id,
            tag_name,
            prerelease,
            draft,
          }))
        );
        if (batch.length < PAGE_SIZE) return releases;
      }
    },

    /** Deletes the release only; GitHub leaves its tag in place. */
    async remove(release) {
      const response = await request(`/releases/${release.id}`, 'DELETE');
      // Two Release runs close together can both plan the same prune.
      if (response.ok || response.status === 404) return;
      throw new Error(`Deleting ${release.tag_name} failed: HTTP ${response.status}`);
    },
  };
}

/**
 * Lists, plans and — unless `dryRun` — deletes. Throws when the newest stable
 * would still be outside the window, since that is the state a new user
 * cannot install from, and a prune that cannot fix it should say so.
 */
export async function pruneReleaseWindow({
  releases,
  dryRun = false,
  keep = PRERELEASES_KEPT,
  window = HACS_RELEASE_WINDOW,
  log = (line) => console.log(line),
}) {
  const plan = planReleaseWindow(await releases.list(), { keep, window });

  const verb = dryRun ? 'would prune' : 'pruned';
  for (const release of plan.pruned) {
    if (!dryRun) await releases.remove(release);
    log(`${verb} ${release.tag_name} (tag kept)`);
  }
  log(`${verb} ${plan.pruned.length} prerelease(s), kept the newest ${keep}`);

  if (plan.stable === null) {
    throw new Error('There is no stable release for HACS to install');
  }
  const { tag, position } = plan.stable;
  if (!plan.withinWindow) {
    throw new Error(`${tag} is release ${position}, outside the ${window} HACS reads`);
  }
  log(`${tag} is release ${position} of the ${window} HACS reads`);
  return plan;
}
