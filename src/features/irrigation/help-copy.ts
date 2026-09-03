/**
 * Help copy for the Irrigation Dialog.
 *
 * Every explanation the dialog shows lives here as plain data, so the writing
 * can be reviewed as a body of prose rather than hunted through render methods.
 * See ADR-0046 for why this is a module rather than inline strings or entries
 * in `localize`/`en.json`.
 *
 * **This module stays free of `lit`.** The two section explainers compose their
 * markup at the call site from these strings; keeping the copy as data means a
 * spec can import it and assert wiring without a DOM.
 *
 * Wording is checked against the integration's behaviour, not against the field
 * labels — several fields here do something narrower than their label suggests.
 */

import type { HelpCopy } from '../shared/ui/gs-help-tooltip';

/**
 * The day's shape, as offsets from lights-on. Phase boundaries come from
 * `phase_boundary_times()`; P0 fires no shots at all, and P1/P2 are told apart
 * by VWC rather than by the clock.
 */
export const TIMING = {
  /** Section explainer. Rendered above the drawn day timeline. */
  section: {
    label: 'Timing',
    lead: 'Crop steering runs on the light cycle, not the clock. Every value here is an offset from Lights On Time.',
    body: 'The day opens in P0, an activation delay with no irrigation. When P0 ends the shot window opens: P1 ramps the substrate up to the Saturation Target, then P2 maintains it — the two are told apart by VWC, not by time. The P2 Stop Buffer marks the Scheduled P3 Boundary near the end of the day, after which the substrate is left to dry back until lights-off.',
  },

  lightsOnTime: {
    label: 'Lights On Time',
    content:
      "The anchor every steering boundary is measured from. P0's end, the Scheduled P3 Boundary and lights-off are all offsets from this time — not from midnight.",
  },

  p0Duration: {
    label: 'P0 Duration',
    content:
      'Activation delay: how long after lights-on before the first shot may fire. No irrigation happens during P0 — it lets the canopy wake and begin transpiring before P1 ramp-up.',
  },

  /**
   * Names for the boundaries drawn on the day bar, shown beside the time each
   * one falls at for this growspace. The times are derived per growspace in the
   * Steering tab's viewmodel; only the naming lives here.
   *
   * `scheduledP3` and `actualP3` are the glossary's two distinct boundaries, not
   * two wordings of one: the stop buffer sets the scheduled one, and
   * Auto-Advance P2→P3 moves the day's real one earlier. The explainer shows
   * `actualP3` only once it has fired, so a row is never a guess.
   */
  boundaries: {
    lightsOn: 'Lights on',
    p0End: 'P0 ends — shot window opens',
    actualP3: 'Actual P3 Boundary — Auto-Advance P2→P3 fired',
    scheduledP3: 'Scheduled P3 Boundary',
    lightsOff: 'Lights off',
  },

  // The caveat is load-bearing: `determine_time_period` keeps returning WINDOW
  // past this boundary unless auto-advance is on. Tracked as
  // Venosta-web/growspace_manager_workspace#41 (issues live in the hub repo);
  // drop the warning once the field is visibly gated on that toggle.
  p2StopBuffer: {
    label: 'P2 Stop Buffer',
    content:
      'Places the Scheduled P3 Boundary this many minutes before lights-off. Only ends irrigation if Auto-advance P2→P3 is on — with it off, shots keep firing right up to lights-off.',
  },
} as const satisfies Record<string, HelpCopy | Record<string, string>>;

/**
 * Shot size and spacing, per phase.
 *
 * The size entries are keyed by sizing mode: the same slot is pump seconds or a
 * percent of substrate volume depending on the mode set on the Substrate & EC
 * tab, and the two mean genuinely different things.
 */
export const DOSING = {
  /** Section explainer. */
  section: {
    label: 'Dosing',
    lead: 'Each phase has two numbers: how much water one shot delivers, and the minimum time before the next. Neither is a schedule — a shot fires only when VWC asks for it and the interval has elapsed.',
    body: 'Shot size is entered as pump seconds or as a percent of substrate volume, depending on the sizing mode on the Substrate & EC tab. P2 shots are additionally scaled by pore EC; P1 shots are not. With Adaptive Shot Control on, both numbers become nominal values the controller trims down from.',
  },

  p1Size: {
    // Volume Mode currently has no reachable pump-flow-rate input —
    // Venosta-web/growspace_manager_workspace#40.
    volume: {
      label: 'P1 Shot Size',
      content:
        'Percent of substrate volume per P1 ramp-up shot. Converted to pump seconds from your substrate profile and pump flow rate — if either is missing, no shots fire.',
    },
    duration: {
      label: 'P1 Shot Duration',
      content:
        'How long the pump runs for each P1 ramp-up shot. Adaptive Shot Control can shrink this, never extend it.',
    },
  },

  p2Size: {
    volume: {
      label: 'P2 Shot Size',
      content:
        'Percent of substrate volume per P2 maintenance shot, before pore-EC scaling. P1 shots ignore EC; P2 shots do not.',
    },
    duration: {
      label: 'P2 Shot Duration',
      content:
        'Pump seconds per P2 maintenance shot, before VWC and pore-EC modulation. P1 shots ignore EC; P2 shots do not.',
    },
  },

  p1Interval: {
    label: 'P1 Shot Interval',
    content:
      'Minimum gap between P1 shots — a cooldown, not a schedule. A shot fires when VWC calls for it and this much time has passed, whichever comes later.',
  },

  p2Interval: {
    label: 'P2 Shot Interval',
    content:
      'Minimum gap between P2 shots. Maintenance shots also wait on the Maintenance Dryback threshold, so real spacing is usually wider than this floor.',
  },
} as const;

/**
 * Adaptive Shot Control tunables (ADR-0014).
 *
 * The two feedback factors are one-directional: `size_factor` is clamped to
 * `[size_floor, 1.0]` and `interval_factor` to `[1.0, interval_ceiling]`, so the
 * configured values are ceilings the controller trims down from — never
 * midpoints it varies around. The copy says so, because the field labels do not.
 */
export const ADAPTIVE = {
  aggressiveness: {
    label: 'Aggressiveness',
    content:
      'How hard an overshoot is corrected. A shot that lifts VWC past target shrinks the next shot and lengthens the next interval by this multiple of the overshoot. Default 1.0.',
  },
  recovery: {
    label: 'Recovery',
    content:
      'How quickly shots return to nominal after undershooting. Deliberately far slower than Aggressiveness — default 0.1 against 1.0. Back off fast, return gently.',
  },
  sizeFloor: {
    label: 'Shot Size Floor',
    content:
      'The smallest an adaptive shot may shrink to, as a fraction of the configured size. 0.5 means never below half. Size never rises above 1.0×, so this is the whole range.',
  },
  intervalCeiling: {
    label: 'Interval Ceiling',
    content:
      'The longest an adaptive interval may stretch to, as a multiple of the configured interval. 1.5 means never more than half again. The interval never drops below 1.0×, so this is the whole range.',
  },
} as const satisfies Record<string, HelpCopy>;

/**
 * The [[Irrigation Recipe]] library (ADR-0045).
 *
 * Copy is written against what the stamp actually does, not against the words
 * "save" and "apply": both are one-way writes with no undo, and a recipe is a
 * reference the growspace records rather than a link it stays bound to.
 */
export const RECIPES = {
  section: {
    label: 'Irrigation Recipes',
    lead: 'A recipe is a reusable snapshot of one growspace’s irrigation settings, saved into a library every tent can see.',
    body: 'Applying one writes its values into this growspace’s ordinary settings once — nothing stays linked afterwards, and the growspace only records which recipe it was and when. Shot sizes travel as a percent of substrate volume rather than pump seconds, so a recipe moved to plumbing with a different flow rate or pot size still delivers the same shot.',
  },

  save: {
    label: 'Save as recipe',
    content:
      'Snapshots the settings this growspace already has saved — not the unsaved edits on the other tabs. Save those first if you want them in the recipe.',
  },

  apply: {
    label: 'Apply recipe',
    content:
      'Writes the recipe’s values over this growspace’s current ones. Applying always writes, so re-applying the recipe already showing above resets any hand-tuning since — which is the way back after an experiment.',
  },

  drift: {
    label: 'Drifted from recipe',
    content:
      'The settings no longer match the recipe that was applied. Nothing is wrong — it just means they have been hand-tuned since, or the recipe itself was edited. Re-apply to go back to the recipe.',
  },

  kind: {
    label: 'Why some recipes are not listed',
    content:
      'A recipe carries either crop-steering setpoints or a time schedule, never both, and only the half this growspace is running can be applied. Switch the irrigation mode on the Steering tab to reach the others.',
  },

  media: {
    label: 'Different growing medium',
    content:
      'This recipe was authored in a different medium. Applying still works and the values are copied unchanged: pot size scales between growspaces, medium does not, and coco, rockwool and soil dry back differently enough that converting between them would be a guess.',
  },
} as const;

/**
 * The [[Irrigation Program]] layer (ADR-0045).
 *
 * Written against the [[Program Hold]] rule rather than against the word
 * "automatic": every sentence here has to survive the days the program does
 * nothing, because those are the days a grower comes to this tab to find out
 * why.
 */
export const PROGRAM = {
  section: {
    label: 'Irrigation Programs',
    lead: 'A program is a plan for a whole run: which recipe each week of each stage should use.',
    body: 'Assigning one changes nothing by itself — it only tells this growspace which plan to read. Whenever the plan has no clear instruction for the week it is in, the program leaves the settings exactly as they are and says why: the week may have no recipe, the run may have outgrown the plan, or you may have hand-tuned the growspace since the last recipe was applied.',
  },

  assign: {
    label: 'Follow a program',
    content:
      'Binding only. No setpoint is written and no pump fires — the growspace simply starts reporting which week of the plan it is in. The one exception is when auto-advance is already on, which is the same consent given in advance.',
  },

  autoAdvance: {
    label: 'Advance automatically',
    content:
      'Lets the program apply a new week’s recipe on its own. It never overwrites a hand tweak: if the settings no longer match the recipe last applied, the program holds and waits for you instead, because a change you made deliberately is not one to undo unattended.',
  },

  drift: {
    label: 'Settings changed since the last apply',
    content:
      'The growspace no longer holds what its last recipe stamped — hand-tuned since, or the recipe itself was edited. Auto-advance will not write over that. Applying this week’s recipe yourself is the way forward; the program picks up from there.',
  },
} as const;
