# ADR 0029 — Contract Fixture Consumer: Two-Ref Strict Parse

**Status:** Accepted (producer side: growspace_manager ADR 0030)

## Context

The card's `src/api-schema.ts` is one half of an unchecked contract: nothing
verified that what the GSM integration emits is what the card parses, and ~10
bugs in one month were exactly that drift (fields dropped on save, on reopen, on
clear, or never surfaced in the payload). Separately, the rule "a card change
must be safe against both the released and the prerelease GSM backend" (the #439
env-clear pattern) existed only as maintainer memory.

## Decision

1. **Card CI strict-parses the GSM golden contract fixture**
   (`tests/fixtures/contract/growspace_payload.json` in the GSM repo — a
   maximally populated growspace payload, see GSM ADR 0030). Strict means both
   directions fail: an unknown key (GSM added a field the card doesn't know) and
   a missing key (the card expects a field GSM doesn't send).

   > **Amended by ADR 0031.** Strict parsing is not achievable: `hassCall`
   > throws on any parse failure, so production schemas strip unknown keys
   > rather than reject them. The check is a recursive **key-set diff** with an
   > **asymmetric verdict per ref** — `main` tests completeness (fixture
   > keys ⊆ schema keys), the release ref tests backward-safety (the schema's
   > non-optional keys ⊆ fixture keys). A key in the release fixture but absent
   > from the schema is expected, not drift. The rest of this ADR stands.

2. **Two refs, one test.** The fixture is fetched from GSM `main` _and_
   from the latest GSM release tag. Passing against the release fixture is the
   mechanical definition of a **backward-safe card change** — the sanctioned
   exception to the GSM-first landing order. A PR green against `main` but
   red against the release fixture must wait for the next GSM release; that
   failure is a landing-order signal, not a flake.
3. The check joins the required contexts on the `main` ruleset (ADR 0025
   amendment).

## Consequences

- Cross-repo drift now breaks a required check on whichever side moved second,
  instead of surfacing as a vanished value in the UI.
- The card gains a network dependency in CI (fetching two raw files from the GSM
  repo). Acceptable: same forge, same owner, and a fetch failure fails loud, not
  silently green.
- The parse test cannot see dialog lifecycle; the env-draft-seeder bug class is
  covered by the nightly config-dialog round-trip e2e instead (ADR 0025
  amendment).
