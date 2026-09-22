/**
 * Snapshots Dialog State Machine
 *
 * Pure module — no Lit, no DOM, no hassCall. All interaction state for the
 * redesigned SnapshotsDialog lives here. The component calls
 * `transition(sm, event)` and replaces its single `@state() _sm`.
 *
 * The SM deliberately knows nothing about frame ORDER. Navigation events carry
 * an already-resolved path, because "which frame is next" depends on the dark
 * filter and on the day grouping — both of which the ViewModel derives. Keeping
 * the ordering in one place stops the two from disagreeing.
 *
 * Structure:
 *   SM
 *     .view         — captures browser, or the Vision evidence ledger
 *     .selectedPath — hero frame, or null to track the newest frame
 *     .playing      — timelapse playback
 *     .panelOpen    — findings strip expanded
 *     .hideDark     — lights-off frames filtered out of rail and navigation
 *     .lightboxOpen — full-bleed overlay of the hero frame
 *     .compare      — off / picking B / comparing A|B at a wipe position
 */

// ─── Compare ──────────────────────────────────────────────────────────────────

/**
 * `picking` is the modal frame picker: A is chosen, B is not. `pct` is the wipe
 * position as a percentage from the left, where 0 shows all of B and 100 all of A.
 */
export type CompareState =
  | { kind: 'off' }
  | { kind: 'picking'; aPath: string }
  | { kind: 'on'; aPath: string; bPath: string; pct: number };

// ─── View ─────────────────────────────────────────────────────────────────────

/**
 * The dialog's two surfaces, which share a camera but not a data source.
 *
 * `captures` browses `/local/` snapshot files. `evidence` reads the `evidence_v1`
 * projection, whose frames cross the wire as `media-source://` identifiers and
 * are never `/local/` paths. Neither can gate the other: a growspace can have
 * Vision evidence and no snapshot files, or the reverse.
 */
export type SnapshotsView = 'captures' | 'evidence';

// ─── Root SM ──────────────────────────────────────────────────────────────────

export interface SM {
  view: SnapshotsView;
  selectedPath: string | null;
  playing: boolean;
  panelOpen: boolean;
  hideDark: boolean;
  lightboxOpen: boolean;
  compare: CompareState;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export type SMEvent =
  // Surface
  | { type: 'ViewSelected'; view: SnapshotsView }
  // Navigation — `path` is resolved by the ViewModel before dispatch.
  | { type: 'FrameSelected'; path: string }
  // Playback
  | { type: 'PlayToggled' }
  | { type: 'PlaybackStopped' }
  // Chrome
  | { type: 'PanelToggled' }
  | { type: 'DarkFilterToggled' }
  | { type: 'LightboxOpened' }
  | { type: 'LightboxClosed' }
  // Compare
  | { type: 'CompareRequested'; path: string }
  | { type: 'CompareBPicked'; path: string }
  | { type: 'ComparePctChanged'; pct: number }
  | { type: 'CompareClosed' }
  // Data
  | { type: 'FramesLoaded'; paths: string[] };

// ─── Initial state ────────────────────────────────────────────────────────────

export function createInitialSM(): SM {
  return {
    view: 'captures',
    selectedPath: null,
    playing: false,
    panelOpen: true,
    hideDark: false,
    lightboxOpen: false,
    compare: { kind: 'off' },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const clampPct = (pct: number): number => Math.min(100, Math.max(0, pct));

/** Playback, the lightbox and compare are mutually exclusive views of the hero. */
const quiesce = (sm: SM): SM => ({ ...sm, playing: false, lightboxOpen: false });

// ─── Transition ───────────────────────────────────────────────────────────────

export function transition(sm: SM, event: SMEvent): SM {
  switch (event.type) {
    case 'ViewSelected':
      // Leaving the captures browser quiesces its transient chrome, so returning
      // to it never resumes a timelapse the user cannot see running.
      return event.view === sm.view ? sm : { ...quiesce(sm), view: event.view };

    case 'FrameSelected':
      // Picking a frame from the rail is also how you leave compare: the rail is
      // the only place both controls live, so a click there means "show me this".
      return { ...sm, selectedPath: event.path, compare: { kind: 'off' } };

    case 'PlayToggled':
      if (sm.compare.kind !== 'off') return sm;
      return { ...sm, playing: !sm.playing, lightboxOpen: false };

    case 'PlaybackStopped':
      return sm.playing ? { ...sm, playing: false } : sm;

    case 'PanelToggled':
      return { ...sm, panelOpen: !sm.panelOpen };

    case 'DarkFilterToggled':
      // The selection may be a dark frame that is about to disappear; null lets
      // the ViewModel fall back to the newest visible frame.
      return {
        ...sm,
        hideDark: !sm.hideDark,
        selectedPath: sm.hideDark ? sm.selectedPath : null,
        playing: false,
      };

    case 'LightboxOpened':
      return { ...sm, lightboxOpen: true, playing: false };

    case 'LightboxClosed':
      return { ...sm, lightboxOpen: false };

    case 'CompareRequested':
      return { ...quiesce(sm), compare: { kind: 'picking', aPath: event.path } };

    case 'CompareBPicked': {
      if (sm.compare.kind !== 'picking') return sm;
      const { aPath } = sm.compare;
      if (event.path === aPath) return sm;
      return { ...sm, compare: { kind: 'on', aPath, bPath: event.path, pct: 50 } };
    }

    case 'ComparePctChanged':
      if (sm.compare.kind !== 'on') return sm;
      return { ...sm, compare: { ...sm.compare, pct: clampPct(event.pct) } };

    case 'CompareClosed':
      return { ...sm, compare: { kind: 'off' } };

    case 'FramesLoaded': {
      const known = new Set(event.paths);
      // Drop any selection or comparison the refresh invalidated — a pruned
      // snapshot directory must not leave the hero pointing at a 404.
      const selectedPath = sm.selectedPath && known.has(sm.selectedPath) ? sm.selectedPath : null;
      const compare = compareSurvives(sm.compare, known) ? sm.compare : { kind: 'off' as const };
      return { ...sm, selectedPath, compare };
    }
  }
}

function compareSurvives(compare: CompareState, known: Set<string>): boolean {
  if (compare.kind === 'off') return true;
  if (compare.kind === 'picking') return known.has(compare.aPath);
  return known.has(compare.aPath) && known.has(compare.bPath);
}
