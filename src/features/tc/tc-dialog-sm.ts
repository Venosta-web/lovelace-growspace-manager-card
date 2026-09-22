/**
 * Tissue Culture dialog state machine.
 *
 * Pure module — no Lit, no DOM, no hassCall. It holds **tab selection and
 * nothing else**, and that is the whole of it on purpose.
 *
 * ADR-0019 is the house shape for a tabbed dialog: a Tab Component owns
 * nothing, every draft lives here, and the host may therefore unmount an
 * inactive tab. ADR 0055 withdraws that licence for this one dialog, because
 * TC's surfaces are not internal to it — they predate it and have a second host
 * with no dialog, no shell and no state machine. Hoisting their drafts here
 * would either fork them from the standalone card or push a dialog state
 * machine into a card that has no dialog.
 *
 * So the per-tab states are empty, `confirm-discard` is unreachable — the view
 * exposes no dirty signal and the drafts it would guard are not the shell's to
 * see — and `applying` and `toast` never move. What is left is the one thing
 * the shell legitimately owns: which surface is showing.
 *
 * It lives with TC's own vocabulary rather than in `src/dialogs/`, and it is
 * deliberately outside the `growspace-tc` chunk's import graph: the dialog
 * frame and its tab bar open **before** that chunk is fetched, so nothing they
 * are built from may be inside it.
 */

import type { DialogStateMachine } from '../../dialogs/dialog-sm';
import type { TcSurfaceId } from '../../slices/tc';

/**
 * The dialog's tabs are the view's surfaces — one union, so a fifth surface
 * cannot be added to one without the other failing to compile.
 */
export type TcTabId = TcSurfaceId;

/** Empty by construction: every TC draft belongs to the surface that owns it. */
export type TcTabStates = Record<TcTabId, Record<string, never>>;

export interface TcDialogSM extends DialogStateMachine<TcTabId, TcTabStates> {
  activeTab: TcTabId;
  tabs: TcTabStates;
  status: { kind: 'idle' };
  toast: undefined;
}

export type TcDialogEvent = { type: 'TabSelected'; tab: TcTabId };

const EMPTY_TABS: TcTabStates = {
  worklist: {},
  cultures: {},
  media: {},
  pairings: {},
};

export function initialTcDialogSM(activeTab: TcTabId): TcDialogSM {
  return { activeTab, tabs: EMPTY_TABS, status: { kind: 'idle' }, toast: undefined };
}

export function transition(sm: TcDialogSM, event: TcDialogEvent): TcDialogSM {
  switch (event.type) {
    case 'TabSelected':
      // No discard guard: there is no draft here to lose, and the surface the
      // grower is leaving stays mounted holding its own.
      return sm.activeTab === event.tab ? sm : { ...sm, activeTab: event.tab };
  }
}
