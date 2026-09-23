import assert from 'node:assert/strict';
import test from 'node:test';

import {
  HACS_RELEASE_WINDOW,
  PRERELEASES_KEPT,
  createGitHubReleases,
  planReleaseWindow,
  pruneReleaseWindow,
} from './release-window.mjs';

let nextId = 1;
const prerelease = (tag_name) => ({ id: nextId++, tag_name, prerelease: true, draft: false });
const stable = (tag_name) => ({ id: nextId++, tag_name, prerelease: false, draft: false });
const draft = (tag_name) => ({ id: nextId++, tag_name, prerelease: false, draft: true });
const prereleases = (count, minor = 4) =>
  Array.from({ length: count }, (_, index) => prerelease(`v1.${minor}.0-next.${count - index}`));
const tags = (releases) => releases.map((release) => release.tag_name);

// The listing #975 was filed against: 88 prereleases in front of the stable.
const reported = () => [...prereleases(88), stable('v1.3.1'), ...prereleases(12, 3)];

test('the stable #975 could not reach moves inside the window', () => {
  const plan = planReleaseWindow(reported());

  assert.deepEqual(plan.stable, { tag: 'v1.3.1', position: PRERELEASES_KEPT + 1 });
  assert.equal(plan.withinWindow, true);
  assert.equal(plan.pruned.length, 88 + 12 - PRERELEASES_KEPT);
  assert.deepEqual(
    tags(plan.kept).slice(0, PRERELEASES_KEPT),
    tags(prereleases(88)).slice(0, PRERELEASES_KEPT),
    'the newest prereleases are the ones kept, in the order GitHub lists them'
  );
});

test('a listing already inside the window is left alone', () => {
  const plan = planReleaseWindow([...prereleases(5), stable('v1.3.1'), ...prereleases(10, 3)]);

  assert.deepEqual(plan.pruned, []);
  assert.deepEqual(plan.stable, { tag: 'v1.3.1', position: 6 });
});

test('stable releases and drafts are never pruned, however old', () => {
  const old = [stable('v1.2.0'), draft('v1.2.1-draft'), stable('v1.1.0')];
  const plan = planReleaseWindow([...prereleases(40), stable('v1.3.1'), ...old]);

  for (const release of [stable('v1.3.1'), ...old]) {
    assert.ok(tags(plan.kept).includes(release.tag_name), `${release.tag_name} is kept`);
  }
  assert.ok(plan.pruned.every((release) => release.prerelease && !release.draft));
});

test('drafts count toward the window, because a token with push access lists them', () => {
  const drafts = Array.from({ length: 10 }, (_, index) => draft(`draft-${index}`));
  const plan = planReleaseWindow([...drafts, ...prereleases(30), stable('v1.3.1')]);

  assert.deepEqual(plan.stable, { tag: 'v1.3.1', position: 10 + PRERELEASES_KEPT + 1 });
  assert.equal(plan.withinWindow, false);
});

test('a repository with no stable release has nothing in the window', () => {
  const plan = planReleaseWindow(prereleases(3));

  assert.equal(plan.stable, null);
  assert.equal(plan.withinWindow, false);
});

test('keep must leave room for the stable inside the window', () => {
  for (const keep of [0, HACS_RELEASE_WINDOW, 2.5, Number.NaN]) {
    assert.throws(() => planReleaseWindow([], { keep }), /keep must be an integer/);
  }
  assert.doesNotThrow(() => planReleaseWindow([], { keep: HACS_RELEASE_WINDOW - 1 }));
});

function fakeReleases(listing) {
  const removed = [];
  return {
    removed,
    releases: {
      list: async () => listing,
      remove: async (release) => removed.push(release.tag_name),
    },
  };
}

test('a prune deletes exactly the planned releases and reports where the stable landed', async () => {
  const listing = reported();
  const { releases, removed } = fakeReleases(listing);
  const lines = [];

  const plan = await pruneReleaseWindow({ releases, log: (line) => lines.push(line) });

  assert.deepEqual(removed, tags(plan.pruned));
  assert.ok(lines.includes(`pruned ${plan.pruned[0].tag_name} (tag kept)`));
  assert.equal(lines.at(-1), `v1.3.1 is release ${PRERELEASES_KEPT + 1} of the 30 HACS reads`);
});

test('a dry run deletes nothing and says what it would have done', async () => {
  const { releases, removed } = fakeReleases(reported());
  const lines = [];

  await pruneReleaseWindow({ releases, dryRun: true, log: (line) => lines.push(line) });

  assert.deepEqual(removed, []);
  assert.ok(lines.some((line) => line.startsWith('would prune ')));
  assert.ok(!lines.some((line) => line.startsWith('pruned ')));
});

test('a prune that cannot bring a stable into the window fails', async () => {
  const drafts = Array.from({ length: 10 }, (_, index) => draft(`draft-${index}`));
  await assert.rejects(
    pruneReleaseWindow({
      releases: fakeReleases([...drafts, ...prereleases(30), stable('v1.3.1')]).releases,
      log: () => {},
    }),
    /v1\.3\.1 is release 31, outside the 30 HACS reads/
  );
  await assert.rejects(
    pruneReleaseWindow({ releases: fakeReleases(prereleases(3)).releases, log: () => {} }),
    /no stable release/
  );
});

function fakeGitHub(pages, { deleteStatus = 204, listStatus = 200 } = {}) {
  const requests = [];
  const fetchImpl = async (url, init) => {
    requests.push({ url, ...init });
    if (init.method === 'DELETE') return { ok: deleteStatus < 300, status: deleteStatus };
    const page = Number(new URL(url).searchParams.get('page'));
    return {
      ok: listStatus < 300,
      status: listStatus,
      json: async () => pages[page - 1] ?? [],
    };
  };
  return { requests, fetchImpl };
}

const github = (fetchImpl) =>
  createGitHubReleases({ repository: 'owner/card', token: 'secret', fetchImpl });

test('the adapter reads every page, in the order GitHub lists them', async () => {
  const first = Array.from({ length: 100 }, (_, index) => ({
    ...prerelease(`v1.4.0-next.${200 - index}`),
    html_url: 'ignored',
  }));
  const second = [stable('v1.3.1')];
  const { requests, fetchImpl } = fakeGitHub([first, second]);

  const listing = await github(fetchImpl).list();

  assert.equal(listing.length, 101);
  assert.deepEqual(Object.keys(listing[0]).sort(), ['draft', 'id', 'prerelease', 'tag_name']);
  assert.equal(listing.at(-1).tag_name, 'v1.3.1');
  assert.deepEqual(
    requests.map(({ url }) => url),
    [
      'https://api.github.com/repos/owner/card/releases?per_page=100&page=1',
      'https://api.github.com/repos/owner/card/releases?per_page=100&page=2',
    ]
  );
  assert.equal(requests[0].headers.authorization, 'Bearer secret');
});

test('the adapter deletes the release by id, and a release already gone is not an error', async () => {
  const { requests, fetchImpl } = fakeGitHub([]);
  await github(fetchImpl).remove({ id: 42, tag_name: 'v1.4.0-next.1' });
  assert.equal(requests[0].method, 'DELETE');
  assert.equal(requests[0].url, 'https://api.github.com/repos/owner/card/releases/42');

  const gone = fakeGitHub([], { deleteStatus: 404 });
  await github(gone.fetchImpl).remove({ id: 42, tag_name: 'v1.4.0-next.1' });
});

test('the adapter refuses to guess past a failed request or a missing token', async () => {
  const forbidden = fakeGitHub([], { deleteStatus: 403, listStatus: 401 });
  await assert.rejects(github(forbidden.fetchImpl).list(), /Listing releases failed: HTTP 401/);
  await assert.rejects(
    github(forbidden.fetchImpl).remove({ id: 1, tag_name: 'v1.4.0-next.1' }),
    /Deleting v1\.4\.0-next\.1 failed: HTTP 403/
  );
  assert.throws(() => createGitHubReleases({ repository: 'owner/card' }), /No GitHub token/);
  assert.throws(() => createGitHubReleases({ token: 'secret' }), /No repository/);
});
