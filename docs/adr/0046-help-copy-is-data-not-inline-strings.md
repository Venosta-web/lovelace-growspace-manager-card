# ADR 0046 — Help Copy Is Data, Not Inline Strings

**Status:** Accepted

## Context

The card explains itself through `gs-help-tooltip`: a small info trigger next to
a heading or a field, opening a popover with a sentence or two. There were 30 of
them across 18 files when this decision was taken, every one with its content
written inline at the call site:

```ts
<gs-help-tooltip
  content="Saturation Target: P1 ramps up until substrate VWC reaches this value, then switches to P2 maintenance."
></gs-help-tooltip>
```

Users asked for many more of these, starting with the Irrigation Dialog's
Steering tab — the densest configuration surface in the product, where a dozen
numeric fields drive a control loop whose behaviour is not inferable from the
field labels. That request turns an ad-hoc habit into a system, and a system
needs a decision about where the words live.

Three properties of this particular copy shaped the choice:

1. **It is writing, and writing is reviewed as a body.** Fifteen sentences
   explaining one control loop have to agree with each other on vocabulary and
   register. Scattered across a 650-line render method, they cannot be read
   together, so they cannot be edited together.

2. **It describes backend behaviour, and drifts when that behaviour changes.**
   Several of these sentences are only correct because of a specific branch in
   `steering_phase.py`. When someone changes that branch, the sentence that
   documents it must be findable. `grep` over a copy module finds it; `grep`
   over every dialog's render method finds it too, but only if you know it
   exists.

3. **The accessible label is a second field that must not drift.** The trigger
   takes both `content` and `label`; of the five tooltips already on the
   Steering tab, four passed no `label`, rendering `aria-label="Help: Help"`.
   Nothing had gone wrong — the pairing simply had no home, so it was skipped.

## Decision

**Help copy for a feature area lives in a `help-copy.ts` module in that area, as
plain data.** Entries are `{ label, content }` pairs — the `HelpCopy` interface
exported from `gs-help-tooltip` — grouped one level by the section of UI they
serve.

**The module does not import `lit`.** Where an explainer needs markup (the
Timing section's day diagram), the strings stay in the module and the markup is
composed at the call site. A copy module that returns `TemplateResult`s is a
render module wearing a glossary's clothes: it can no longer be imported by a
spec, or read as prose by someone who does not write TypeScript.

**Numeric fields take help as one object.** `md3-number-input` gained an optional
`help?: HelpCopy` property rather than a `help` / `help-label` string pair, so
label and content cannot be wired to different fields.

**Specs assert copy identity, not presence.** A spec imports the copy module and
asserts each field received the specific constant intended for it.

## Alternatives considered

**Keep it inline.** Consistent with the existing 30 call sites and needs no new
concept. Rejected on property (1): the whole point of the request was to write
substantially more of this copy, and inline strings scale badly in exactly the
dimension — reviewability as prose — that matters most for writing.

**Route it through `localize` / `en.json`.** The obvious move, and the one most
likely to be proposed again, so the reasons for rejecting it are recorded here
rather than left to be re-derived:

- There is one language. `languages` in `localize.ts` contains `en` and nothing
  else, so the indirection currently buys no translation.
- The lookup is `section.key` split on a single `.` — a two-level flat namespace,
  a poor fit for copy that groups by UI section and then by sizing-mode variant.
- Values are bare strings with a positional `search`/`replace` substitution.
  There is no place for the paired accessible label, which is half of what this
  decision is trying to keep together.

If the card is ever translated, this module is a clean source to extract from —
plain data, one file per area, no markup embedded. Extracting *to* `localize`
later costs less than shaping the copy around its constraints now.

**A `docs/` markdown file compiled at build time.** Best for prose review, worst
for everything else: a build step, a generated artefact to keep in sync, and no
type safety on the keys. Not worth it at this size.

## Consequences

- The Steering tab's copy is reviewable in one file, and its specs can assert
  wiring without a DOM.
- Two conventions now coexist: 30 inline tooltips elsewhere, one copy module in
  irrigation. This is deliberate — the migration is not part of this decision,
  and the inline ones are mostly single tooltips on a dialog, where a module
  would be ceremony. A feature area earns a copy module when it has enough copy
  to read as a body.
- Copy that names default values (`Default 1.0`) can go stale against
  `models/irrigation.py`. Accepted: the numbers are what make those two
  sentences useful, and the module is the findable place to fix them.
