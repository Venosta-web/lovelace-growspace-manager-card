/**
 * The six calls an editor makes, and the one rule they share.
 *
 * Every one of them is contract-gated: the negotiated identity travels with
 * the request, and a backend whose capability has moved refuses it rather
 * than serving a result this card would misread. That refusal arrives as a
 * *result* — `{ outcome: 'refused' }` — so the caller decides what to do
 * about it, which is the whole reason the draft wire is shaped this way.
 *
 * What this module does **not** do is retry. A refused operation was asked
 * for under one contract, one draft version, or one authority; performing it
 * again under another and presenting the answer as the first one's would be
 * exactly the quiet substitution the compatibility contract forbids. The one
 * thing it does automatically is the capability refresh a
 * `contract_incompatible` refusal names, and even then the refused call is
 * handed back to its caller unperformed.
 */

import { z } from 'zod';

import { hassCall } from '../../services/hass-call';
import {
  DraftDiscardedSchema,
  DraftOpenedSchema,
  DraftPreviewSchema,
  DraftPublishedSchema,
  DraftSavedSchema,
  LibraryAnswerSchema,
  type DraftDiscarded,
  type DraftOpened,
  type DraftPreview,
  type DraftPublished,
  type DraftSaved,
  type LabelDocument,
  type LibraryAnswer,
} from './draft-schema';
import { negotiatedContract, recoverFromContractRefusal } from './index';
import { CONTRACT_INCOMPATIBLE } from './schema';

export const WS_GET_LABEL_TEMPLATE_LIBRARY = 'growspace_manager/get_label_template_library';
export const WS_OPEN_LABEL_TEMPLATE_DRAFT = 'growspace_manager/open_label_template_draft';
export const WS_AUTOSAVE_LABEL_TEMPLATE_DRAFT = 'growspace_manager/autosave_label_template_draft';
export const WS_PREVIEW_LABEL_TEMPLATE_DRAFT = 'growspace_manager/preview_label_template_draft';
export const WS_PUBLISH_LABEL_TEMPLATE_DRAFT = 'growspace_manager/publish_label_template_draft';
export const WS_DISCARD_LABEL_TEMPLATE_DRAFT = 'growspace_manager/discard_label_template_draft';

/**
 * Which draft a command addresses.
 *
 * `labelSizeId` is always sent — the preview needs it to find a Capability
 * Profile even for a template-bound draft — and `templateId`, when present,
 * is what actually names the slot.
 */
export interface DraftAddress {
  labelSizeId: string;
  templateId?: string | null;
}

async function gated<T>(
  command: string,
  payload: Record<string, unknown>,
  schema: z.ZodType<T>
): Promise<T> {
  const contract = negotiatedContract();
  if (contract === null) {
    throw new Error('The Label Template capability has not been negotiated');
  }
  const answer = await hassCall(command, { contract, ...payload }, schema);
  const refusal = (answer as { outcome?: string; refusal?: { code: string } }).refusal;
  if (refusal?.code === CONTRACT_INCOMPATIBLE) {
    // The recovery the refusal itself names. The refused call is not retried:
    // the user asked for something under one contract and would be shown the
    // result of something else.
    await recoverFromContractRefusal(refusal as never);
  }
  return answer;
}

function addressed(address: DraftAddress): Record<string, unknown> {
  return {
    label_size_id: address.labelSizeId,
    ...(address.templateId ? { template_id: address.templateId } : {}),
  };
}

/**
 * The authoritative snapshot, and the only place an editor learns that the
 * draft it left behind is still there.
 *
 * Read on every editor open rather than cached, because "survives close,
 * reload, reconnect and another authenticated client" is a claim about what
 * the *server* holds, and a cache is the one thing that could make it false.
 */
export function fetchLabelTemplateLibrary(): Promise<LibraryAnswer> {
  return gated(WS_GET_LABEL_TEMPLATE_LIBRARY, {}, LibraryAnswerSchema);
}

/**
 * Resume this administrator's draft, or start one.
 *
 * `deriveFrom` is a starting point, not an instruction: when unsaved work is
 * already in the slot the backend returns that instead and says `resumed`,
 * because re-deriving over it would destroy exactly what this call exists to
 * recover.
 */
export function openLabelTemplateDraft(
  address: DraftAddress,
  deriveFrom?: { kind: string; id: string }
): Promise<DraftOpened> {
  return gated(
    WS_OPEN_LABEL_TEMPLATE_DRAFT,
    { ...addressed(address), ...(deriveFrom ? { derive_from: deriveFrom } : {}) },
    DraftOpenedSchema
  );
}

/**
 * Store whatever the editor last had, valid or not.
 *
 * `expectedVersion` makes it a compare-and-swap, which is what stops one
 * administrator's second client from writing over the first one's newer work.
 * Omitting it is a save that has not read anything, and the backend takes it
 * at its word — so the editor always sends it.
 */
export function autosaveLabelTemplateDraft(
  address: DraftAddress,
  document: LabelDocument,
  options: { expectedVersion: number; name?: string | null } = { expectedVersion: 0 }
): Promise<DraftSaved> {
  return gated(
    WS_AUTOSAVE_LABEL_TEMPLATE_DRAFT,
    {
      ...addressed(address),
      document,
      expected_version: options.expectedVersion,
      ...(options.name !== undefined ? { name: options.name } : {}),
    },
    DraftSavedSchema
  );
}

/**
 * Render the stored draft at exactly one version.
 *
 * The version is not decoration. A render is slow and an editor is fast, so
 * without it an answer could arrive as a picture of a layout the user has
 * already changed, with nothing on screen saying so. Asking for one version
 * means the answer either settles that geometry or is refused.
 */
export function previewLabelTemplateDraft(
  address: DraftAddress,
  expectedDraftVersion: number,
  options: { fixtureFamily?: string; density?: string; locale?: string } = {}
): Promise<DraftPreview> {
  return gated(
    WS_PREVIEW_LABEL_TEMPLATE_DRAFT,
    {
      ...addressed(address),
      expected_draft_version: expectedDraftVersion,
      ...(options.fixtureFamily ? { fixture_family: options.fixtureFamily } : {}),
      ...(options.density ? { density: options.density } : {}),
      ...(options.locale ? { locale: options.locale } : {}),
    },
    DraftPreviewSchema
  );
}

/**
 * Turn the draft into an immutable revision.
 *
 * `draftId` makes a retry safe without an idempotency key: if the draft is
 * gone because the first attempt actually succeeded and only its answer was
 * lost, the backend finds the revision that draft became and returns it
 * rather than publishing a second one.
 */
export function publishLabelTemplateDraft(
  address: DraftAddress,
  draftId?: string
): Promise<DraftPublished> {
  return gated(
    WS_PUBLISH_LABEL_TEMPLATE_DRAFT,
    { ...addressed(address), ...(draftId ? { draft_id: draftId } : {}) },
    DraftPublishedSchema
  );
}

/** Remove unpublished work explicitly, and get back what was removed. */
export function discardLabelTemplateDraft(address: DraftAddress): Promise<DraftDiscarded> {
  return gated(WS_DISCARD_LABEL_TEMPLATE_DRAFT, addressed(address), DraftDiscardedSchema);
}
