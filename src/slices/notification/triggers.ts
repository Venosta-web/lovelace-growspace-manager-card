/**
 * Timed-notification trigger vocabulary.
 *
 * The bare stage names here are the vocabulary the integration's firing path
 * (`calculate_days_in_stage`) resolves. Other writers have used other words —
 * the older `*_start` forms, and the options flow's `days_since_flip` — so
 * stored data can carry a trigger the card does not know. Anything outside the
 * vocabulary is kept as an `UnrecognisedTrigger` rather than coerced into a
 * stage, so the UI can show it for what it is and a save round-trips it
 * unchanged (GSM Venosta-web/growspace_manager#575 heals the stored data).
 */

/** The trigger vocabulary, in display order. Single source of truth. */
export const TIMED_NOTIFICATION_TRIGGERS = ['clone', 'veg', 'flower', 'dry'] as const;

export type TimedNotificationTrigger = (typeof TIMED_NOTIFICATION_TRIGGERS)[number];

/** A stored trigger outside the vocabulary, preserved verbatim. */
export interface UnrecognisedTrigger {
  raw: string;
}

export type TimedNotificationTriggerValue = TimedNotificationTrigger | UnrecognisedTrigger;

/**
 * Legacy trigger words with an unambiguous bare-stage equivalent. `flip` is the
 * switch into flower, so `days_since_flip` counts flower days. Deliberately
 * absent: `days_since_germination`, which has no stage counterpart — mapping it
 * would be the silent rewrite this module exists to prevent.
 */
export const LEGACY_TRIGGER_ALIASES: Readonly<Record<string, TimedNotificationTrigger>> = {
  days_since_flip: 'flower',
};

export function isKnownTrigger(
  trigger: TimedNotificationTriggerValue
): trigger is TimedNotificationTrigger {
  return typeof trigger === 'string';
}

/** The stored word for a trigger, whether it is recognised or not. */
export function triggerRawValue(trigger: TimedNotificationTriggerValue): string {
  return isKnownTrigger(trigger) ? trigger : trigger.raw;
}

/**
 * Map a stored `trigger_type` onto the vocabulary: bare stages pass through,
 * recognised legacy forms (`veg_start`, `days_since_flip`) normalize to their
 * stage, everything else is flagged unrecognised.
 */
export function normalizeTriggerType(raw: string): TimedNotificationTriggerValue {
  const stripped = raw.replace(/_start$/, '');
  if ((TIMED_NOTIFICATION_TRIGGERS as readonly string[]).includes(stripped)) {
    return stripped as TimedNotificationTrigger;
  }
  return LEGACY_TRIGGER_ALIASES[raw] ?? { raw };
}
