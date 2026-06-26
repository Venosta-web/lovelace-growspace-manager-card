/**
 * Notifications Tab ViewModel (ADR-0019, "Applied to Config Dialog")
 *
 * The pure derivation behind the Config Dialog's Notifications tab — the first
 * Config Dialog tab decomposed, and the analog of the Irrigation Dialog's Tanks
 * tab (an *independent-draft* tab: it owns `NotificationsTabState` on the SM and
 * does not touch the Shared Environment Draft). It projects the tab's entire
 * render input — the cooldown/persistence draft, the timed-notification list,
 * the inline add/edit/confirm-delete sub-state, and the render-ready growspace +
 * trigger option lists — from the SM and the dialog's `growspaceOptions`.
 *
 * Unlike the Irrigation reference factories (which return a `computed`
 * `ReadableAtom` over an SM *atom*), the Config Dialog drives its SM as a Lit
 * `@state()` reactive property transitioned by the pure `transition()` — there
 * is no nanostores atom to wrap. So this is a pure `(sm, deps) → ViewModel`
 * mapping the Config Dialog Shell calls in `render()`. The seam is unchanged: a
 * pure per-tab factory feeding a dumb `<config-notifications-tab>`; only the
 * subscription mechanism differs.
 */

import type {
  ConfigDialogSM,
  NotificationsDraft,
  NotificationsTabSub,
  TimedNotification,
  TimedNotificationTrigger,
} from '../../../dialogs/config-dialog-sm';

/** A selectable trigger for a timed notification (value + display label). */
export interface TriggerOption {
  value: TimedNotificationTrigger;
  label: string;
}

/** A render-ready growspace choice for the timed-notification multi-select. */
export interface GrowspaceOption {
  id: string;
  name: string;
}

/** Complete render input for `<config-notifications-tab>`. */
export interface NotificationsTabViewModel {
  /** Cooldown / persistence settings draft (the top form section). */
  draft: NotificationsDraft;
  /** Configured timed notifications (the list below the form). */
  timedNotifications: TimedNotification[];
  /** Inline add/edit/confirm-delete sub-state, or idle. */
  sub: NotificationsTabSub;
  /** Growspace choices for the timed-notification form, as render-ready entries. */
  growspaceOptions: GrowspaceOption[];
  /** The fixed trigger choices for the timed-notification form. */
  triggerOptions: TriggerOption[];
}

/** The trigger choices, in display order. Static — derived render input. */
export const TRIGGER_OPTIONS: readonly TriggerOption[] = [
  { value: 'clone', label: 'Clone Start' },
  { value: 'veg', label: 'Veg Start' },
  { value: 'flower', label: 'Flower Start' },
  { value: 'dry', label: 'Dry Start' },
];

/**
 * Pure factory: the Config Dialog SM + the dialog's `growspaceOptions` map →
 * one Notifications tab ViewModel. Testable with no DOM and no host.
 */
export function createNotificationsTabViewModel(
  sm: ConfigDialogSM,
  growspaceOptions: Record<string, string>
): NotificationsTabViewModel {
  const tab = sm.tabs.notifications;
  return {
    draft: tab.draft,
    timedNotifications: tab.timedNotifications,
    sub: tab.sub,
    growspaceOptions: Object.entries(growspaceOptions).map(([id, name]) => ({ id, name })),
    triggerOptions: [...TRIGGER_OPTIONS],
  };
}
