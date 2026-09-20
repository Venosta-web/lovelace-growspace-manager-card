/**
 * Whether this installation has a Label Template path at all — and nothing
 * about it that the backend did not say.
 *
 * Label printing exists today as the Classic dialogs, and it keeps working
 * unchanged. What this module decides is the one question above them: may the
 * card offer the template path? The compatibility contract answers it in one
 * word — the complete capability envelope is published, or it is not — and
 * deliberately forbids every cheaper answer. An integration version number, a
 * command that happens to be registered, a trial call that happens to
 * succeed: none of those is a promise that an editor session started now can
 * be finished.
 *
 * Three outcomes, and the difference between the last two is the point:
 *
 * | outcome        | what happened                                   | what the user gets |
 * | -------------- | ----------------------------------------------- | ------------------ |
 * | `classic`      | no answer, or no capability published           | the Classic dialogs, exactly as before |
 * | `incompatible` | an answer this card cannot use                  | one actionable compatibility state |
 * | `available`    | the complete, self-consistent V1 envelope       | the template path |
 *
 * `classic` is silence: an old backend, or a new one holding its capability
 * back because some part of it is not ready. Neither is a fault to report,
 * and neither costs the user anything they had.
 *
 * `incompatible` is the backend answering with something this card cannot
 * use — a partial envelope, another major contract, a card contract it does
 * not implement. That is worth saying out loud, and it is never rewritten
 * into `classic`: quietly printing through the compatibility path after a new
 * operation was refused could change content, layout, validation and physical
 * output while presenting itself as recovery.
 */

import { atom } from 'nanostores';
import { z } from 'zod';
import { hassCall } from '../../services/hass-call';
import {
  CONTRACT_INCOMPATIBLE,
  FactoryTemplatePreviewSchema,
  LabelTemplateCapabilitySchema,
  type CapabilityProfile,
  type FactoryTemplatePreview,
  type LabelContractIdentity,
  type LabelRefusal,
  type LabelSize,
  type LabelTemplateCapability,
} from './schema';

export * from './schema';
// The draft *shapes* are re-exported here; the draft *calls* are not, and
// deliberately: `drafts.ts` imports the negotiated contract from this module,
// so re-exporting it would close an import cycle for no gain. Import the six
// commands from `slices/labels/drafts` directly.
export * from './draft-schema';

export const WS_GET_LABEL_TEMPLATE_CAPABILITY = 'growspace_manager/get_label_template_capability';
export const WS_PREVIEW_LABEL_FACTORY_TEMPLATE = 'growspace_manager/preview_label_factory_template';

/** What this card may offer, and why. */
export type LabelTemplateSupport =
  | { status: 'unknown' }
  | { status: 'classic'; reason: string }
  | { status: 'incompatible'; reason: string }
  | { status: 'available'; capability: LabelTemplateCapability };

export const labelTemplateSupport$ = atom<LabelTemplateSupport>({ status: 'unknown' });

let probe: Promise<LabelTemplateSupport> | null = null;

/**
 * Ask once per page load, and share the answer.
 *
 * The same policy the Tissue Culture presence probe follows, for the same
 * reason: several cards on one dashboard must not each open the same round
 * trip, and a capability that changed under a loaded page is recovered from
 * on the next command rather than polled for. The difference is what a
 * failure means — TC's probe collapses every failure to "not installed",
 * while this one has to keep "nothing published" apart from "published
 * something I cannot use".
 */
export async function detectLabelTemplateSupport(): Promise<LabelTemplateSupport> {
  probe ??= (async (): Promise<LabelTemplateSupport> => {
    let raw: unknown;
    try {
      raw = await hassCall(WS_GET_LABEL_TEMPLATE_CAPABILITY, {}, z.unknown());
    } catch (error) {
      // An old backend has no such command; a new one that is not ready
      // refuses to publish a partial capability. Over the wire those are the
      // same silence, and the contract gives them the same answer: the
      // Classic Path, with nothing said about a template feature the user has
      // no way to want yet.
      return {
        status: 'classic',
        reason: error instanceof Error ? error.message : String(error),
      };
    }

    const parsed = LabelTemplateCapabilitySchema.safeParse(raw);
    if (!parsed.success) {
      return { status: 'incompatible', reason: summarizeIssues(parsed.error) };
    }
    return { status: 'available', capability: parsed.data };
  })();

  const support = await probe;
  labelTemplateSupport$.set(support);
  return support;
}

/**
 * Say what was wrong with the envelope, briefly.
 *
 * The first few issues, not all of them: one message a user or a log reader
 * can act on beats the complete machine-readable list, and the whole envelope
 * was refused whatever the count.
 */
function summarizeIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 4)
    .map((issue) =>
      issue.path.length > 0 ? `${issue.path.join('.')}: ${issue.message}` : issue.message
    )
    .join('; ');
}

/** Forget the cached probe. Tests only — nothing in the card re-detects. */
export function resetLabelTemplateSupport(): void {
  probe = null;
  labelTemplateSupport$.set({ status: 'unknown' });
  previews.clear();
}

/** The negotiated identity every contract-gated command has to carry. */
export function negotiatedContract(): LabelContractIdentity | null {
  const support = labelTemplateSupport$.get();
  return support.status === 'available' ? support.capability.contract : null;
}

// ---------------------------------------------------------------------------
// Reading the catalogue
// ---------------------------------------------------------------------------

/**
 * The profiles that can render one stock.
 *
 * A Label Size with none is an ordinary state while the shipped profile set
 * is still growing: it has a Factory Template, it is catalogued, and no
 * printer this product has characterised can put it on paper. The card says
 * that rather than previewing the size next to it.
 */
export function profilesForSize(
  capability: LabelTemplateCapability,
  labelSizeId: string
): CapabilityProfile[] {
  return capability.catalogues.profiles.filter((profile) => profile.label_size_id === labelSizeId);
}

/**
 * What the product may truthfully claim about one Label Size right now.
 *
 * The five words are the compatibility contract's, and they are distinct on
 * purpose: `classic` promises nothing about fidelity, `unprofiled` is honest
 * that no preview is possible, `provisional` is a raster-exact preview from a
 * profile that may not print production labels, `verified` has the physical
 * evidence but still needs current local calibration, and `production` is the
 * only one that may put a real record on paper.
 */
export type LabelSizeState = 'classic' | 'unprofiled' | 'provisional' | 'verified' | 'production';

export function labelSizeState(
  capability: LabelTemplateCapability,
  labelSizeId: string
): Exclude<LabelSizeState, 'classic'> {
  const profiles = profilesForSize(capability, labelSizeId);
  if (profiles.length === 0) return 'unprofiled';
  if (profiles.some((profile) => profile.authorizes_production)) return 'production';
  if (profiles.some((profile) => profile.evidence === 'product_verified')) return 'verified';
  return 'provisional';
}

/** The Label Sizes, in the order the backend catalogued them. */
export function labelSizes(capability: LabelTemplateCapability): LabelSize[] {
  return capability.catalogues.label_sizes;
}

// ---------------------------------------------------------------------------
// The Factory Template preview
// ---------------------------------------------------------------------------

export interface PreviewChoice {
  labelSizeId: string;
  fixtureFamily: string;
  density: string;
  locale: string;
}

export const DEFAULT_FIXTURE_FAMILY = 'typical';
export const DEFAULT_DENSITY = 'normal';

/**
 * Keep a choice only while the current capability still catalogues it.
 *
 * This is what "a capability-generation change invalidates choices" means
 * without throwing away what the user was looking at: a Label Size, fixture
 * family or locale that survived the change is kept, and one that did not is
 * replaced by something the new catalogue actually has. Silently keeping a
 * value the backend no longer knows would produce a refusal on the next
 * command and no explanation of it.
 */
export function reconcileChoice(
  capability: LabelTemplateCapability,
  choice: Partial<PreviewChoice> = {}
): PreviewChoice {
  const sizes = labelSizes(capability);
  const families = Object.keys(capability.catalogues.representative_fixtures);
  const locales = capability.supported.locales;
  const known = <T>(value: T | undefined, allowed: readonly T[], fallback: T): T =>
    value !== undefined && allowed.includes(value) ? value : fallback;

  return {
    labelSizeId: known(
      choice.labelSizeId,
      sizes.map((size) => size.id),
      sizes[0].id
    ),
    fixtureFamily: known(
      choice.fixtureFamily,
      families,
      families.includes(DEFAULT_FIXTURE_FAMILY) ? DEFAULT_FIXTURE_FAMILY : families[0]
    ),
    density: choice.density ?? DEFAULT_DENSITY,
    locale: known(choice.locale, locales, locales[0]),
  };
}

const previews = new Map<string, FactoryTemplatePreview>();

function cacheKey(generation: number, choice: PreviewChoice): string {
  return [generation, choice.labelSizeId, choice.fixtureFamily, choice.density, choice.locale].join(
    '|'
  );
}

/**
 * Preview one shipped Factory Template, cached under the generation that made it.
 *
 * The generation is part of the key rather than something checked afterwards,
 * so a capability change cannot serve a raster minted under the old one: the
 * new generation simply misses. What the old generation left behind is
 * dropped by {@link recoverFromContractRefusal}, which is the only thing that
 * changes a generation inside one page's life.
 */
export async function previewFactoryTemplate(
  choice: PreviewChoice,
  { cache = true }: { cache?: boolean } = {}
): Promise<FactoryTemplatePreview> {
  const contract = negotiatedContract();
  if (contract === null) {
    throw new Error('The Label Template capability has not been negotiated');
  }

  const key = cacheKey(contract.generation, choice);
  const remembered = cache ? previews.get(key) : undefined;
  if (remembered) return remembered;

  const answer = await hassCall(
    WS_PREVIEW_LABEL_FACTORY_TEMPLATE,
    {
      contract,
      label_size_id: choice.labelSizeId,
      fixture_family: choice.fixtureFamily,
      density: choice.density,
      locale: choice.locale,
    },
    FactoryTemplatePreviewSchema
  );

  if (answer.outcome === 'refused') {
    // A refusal is never cached: the thing that would make it stop being true
    // is exactly the recovery it names.
    if (answer.refusal.code === CONTRACT_INCOMPATIBLE) {
      await recoverFromContractRefusal(answer.refusal);
    }
    return answer;
  }

  previews.set(key, answer);
  return answer;
}

/**
 * Take the backend's word that our contract identity is no longer current.
 *
 * Everything derived from the old capability goes — the catalogues, the
 * previews, and the eligibility inside them — and the envelope is asked for
 * again, which is the recovery the refusal itself names. **The refused
 * operation is not retried**, by this function or by its caller: the user
 * asked for something under one contract and would be shown the result of
 * something else.
 *
 * What is *not* done is falling back to the Classic Path. A backend that
 * refused us is a backend that has templates, and printing through the
 * compatibility workflow instead would put a differently rendered label on
 * paper and call it recovery. So when the refresh does not produce a
 * capability this card can use, the card stays in one compatibility state
 * naming the refusal rather than quietly becoming an old-backend card.
 *
 * Nothing here can reach a draft. The drafts the editor will keep live in
 * their own store, and no invalidation in this module touches it.
 */
export async function recoverFromContractRefusal(refusal: LabelRefusal): Promise<void> {
  previews.clear();
  probe = null;
  labelTemplateSupport$.set({ status: 'unknown' });

  const refreshed = await detectLabelTemplateSupport();
  if (refreshed.status === 'available') return;

  const stuck: LabelTemplateSupport = {
    status: 'incompatible',
    reason: `${refusal.reason}: ${refusal.code}`,
  };
  probe = Promise.resolve(stuck);
  labelTemplateSupport$.set(stuck);
}

/** How many previews are remembered. Tests only. */
export function rememberedPreviewCount(): number {
  return previews.size;
}
