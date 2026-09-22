/** Administrator library wire. Recovery documents are opaque and never resaved. */
import { z } from 'zod';
import { getHass, hassCall } from '../../services/hass-call';
import { negotiatedContract, recoverFromContractRefusal } from './index';
import { LabelContractIdentitySchema, LabelRefusalSchema, CONTRACT_INCOMPATIBLE } from './schema';
import { TemplateDraftSchema, ProvenanceSchema, PublicationCheckSchema } from './draft-schema';

const Reference = z.object({ kind: z.string(), id: z.string() });
const Revision = z.object({
  revision: z.number(),
  name: z.string(),
  digest: z.string(),
  published_at: z.string(),
  published_by: z.string().nullable(),
  operation: z.string(),
  parent_revision: z.number().nullable(),
  provenance: ProvenanceSchema,
});
const Template = z.object({
  id: z.string(),
  kind: z.string(),
  name: z.string(),
  label_size_id: z.string(),
  head_revision: z.number(),
  created_at: z.string(),
  created_by: z.string().nullable(),
  revisions: z.array(Revision),
});
const RecoveryDraft = TemplateDraftSchema.omit({ document: true }).extend({
  document: z.unknown(),
  stale: z.boolean(),
  orphaned: z.boolean(),
  head_revision: z.number().nullable(),
});
export const ManagementLibrarySchema = z.object({
  entry_id: z.string(),
  generation: z.number().nullable(),
  store: z.object({
    readable: z.boolean(),
    version: z.number(),
    found_version: z.number().optional(),
  }),
  factory_templates: z.array(
    z.object({
      id: z.string(),
      kind: z.string(),
      label_size_id: z.string(),
      name: z.string(),
      revision: z.number(),
      valid: z.boolean(),
    })
  ),
  templates: z.array(
    Template.extend({
      quarantined: z.boolean(),
      quarantine: z
        .object({
          template_id: z.string(),
          revision: z.number(),
          diagnostics: PublicationCheckSchema.shape.diagnostics,
        })
        .nullable(),
    })
  ),
  drafts: z.array(RecoveryDraft),
  defaults: z.record(z.string(), Reference),
  effective_defaults: z.record(
    z.string(),
    z
      .object({
        ref: Reference,
        label_size_id: z.string(),
        layout_digest: z.string(),
        revision: z.number(),
        name: z.string(),
        via: z.string(),
      })
      .nullable()
  ),
  tombstones: z.array(
    z.object({
      template: Template,
      deleted_at: z.string(),
      deleted_by: z.string(),
      expires_at: z.string(),
      was_default: z.boolean(),
    })
  ),
});
export type ManagementLibrary = z.infer<typeof ManagementLibrarySchema>;
export type RecoveryDraft = z.infer<typeof RecoveryDraft>;
export const InspectionSchema = z.object({
  id: z.string(),
  label_size_id: z.string(),
  created_at: z.string(),
  created_by: z.string().nullable(),
  revisions: z.array(Revision.extend({ document: z.unknown() })),
});
export const PreflightSchema = z.object({
  generation: z.number(),
  ready: z.boolean(),
  entries: z.array(z.object({ id: z.string(), name: z.string(), label_size_id: z.string() })),
  issues: z.array(z.object({ template_id: z.string(), code: z.string(), reason: z.string() })),
});
const Answer = z.discriminatedUnion('outcome', [
  z.object({
    outcome: z.literal('ok'),
    contract: LabelContractIdentitySchema,
    library: ManagementLibrarySchema,
    result: z.unknown(),
  }),
  z.object({ outcome: z.literal('refused'), refusal: LabelRefusalSchema }),
]);
export type ManagementAnswer = z.infer<typeof Answer>;
export type Operation =
  | 'snapshot'
  | 'inspect'
  | 'export'
  | 'preflight'
  | 'import'
  | 'rename'
  | 'duplicate'
  | 'save_as'
  | 'replace_factory'
  | 'restore_revision'
  | 'set_default'
  | 'clear_default'
  | 'delete'
  | 'restore'
  | 'reload'
  | 'discard';

/** The caller retains the key after a transport failure and retries identical input. */
export async function manageTemplates(
  operation: Operation,
  payload: Record<string, unknown> = {},
  mutation?: { generation: number; key: string }
): Promise<ManagementAnswer> {
  const contract = negotiatedContract();
  if (!contract) throw new Error('The Label Template capability has not been negotiated');
  const answer = await hassCall(
    'growspace_manager/manage_label_templates',
    {
      contract,
      operation,
      payload,
      ...(mutation
        ? { expected_generation: mutation.generation, idempotency_key: mutation.key }
        : {}),
    },
    Answer
  );
  if (answer.outcome === 'refused' && answer.refusal.code === CONTRACT_INCOMPATIBLE)
    await recoverFromContractRefusal(answer.refusal);
  return answer;
}

/** Events invalidate; snapshots explain. Reconnect always invalidates, even without a gap. */
export async function watchTemplateLibrary(refresh: () => void): Promise<() => void> {
  const connection = getHass()?.connection;
  if (!connection) return () => {};
  connection.addEventListener('ready', refresh);
  try {
    const stop = await connection.subscribeEvents(
      refresh,
      'growspace_manager_label_template_library_changed'
    );
    refresh(); // Close the snapshot/subscribe race.
    return () => {
      stop();
      connection.removeEventListener('ready', refresh);
    };
  } catch (error) {
    connection.removeEventListener('ready', refresh);
    throw error;
  }
}

export function downloadTemplateData(value: unknown, filename: string): void {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
