import { z } from 'zod';

/**
 * The irrigation controller's six states (GSM#783), in the backend's own
 * spelling. `fault` and `emergency_stop` latch; the rest are recomputed.
 */
export const CONTROLLER_STATES = [
  'idle',
  'ready',
  'running',
  'inhibited',
  'fault',
  'emergency_stop',
] as const;

const ControllerStateSchema = z.enum(CONTROLLER_STATES);
export type ControllerState = z.infer<typeof ControllerStateSchema>;

/**
 * One structured reason. `code` is a stable machine code, optionally scoped to
 * an entity after a colon (`fault_off_unconfirmed:switch.pump`); it stays a
 * string rather than an enum so a reason a newer backend adds still parses and
 * renders under its own detail.
 */
const SafetyReasonSchema = z.object({
  code: z.string().min(1),
  detail: z.string(),
  since: z.string(),
});
export type SafetyReason = z.infer<typeof SafetyReasonSchema>;

/**
 * `sensor.<growspace>_irrigation_controller` — its state and the attributes
 * the backend owns. Home Assistant adds its own (`friendly_name`, `options`,
 * `device_class`, `icon`); those are not part of this contract and are
 * stripped rather than declared.
 */
/**
 * A Manual Override (GSM#793, ADR-0053): one subsystem of the growspace handed
 * to a person until `expires_at`. `subsystem` stays a string for the same
 * reason `code` does.
 */
const ManualOverrideSchema = z.object({
  subsystem: z.string().min(1),
  started_at: z.string(),
  expires_at: z.string(),
  user_id: z.string().nullable(),
  reason: z.string().nullable(),
});

export const IrrigationControllerSchema = z.object({
  state: ControllerStateSchema,
  attributes: z.object({
    reasons: z.array(SafetyReasonSchema),
    fault_id: z.string().nullable(),
    requires_ack: z.boolean(),
    since: z.string().nullable(),
    // Every Manual Override of the growspace, whatever it holds. Declared for
    // the contract; the card does not show it yet. Optional because older
    // backends omit it.
    overrides: z.array(ManualOverrideSchema).optional(),
  }),
});

/**
 * The three safety services all take one growspace. `emergency_stop` and
 * `reset_safety` also accept no growspace at all (every growspace); the card
 * never sends that, so the schema refuses it.
 */
export const SafetyServicePayloadSchema = z.strictObject({
  growspace_id: z.string().min(1),
});
