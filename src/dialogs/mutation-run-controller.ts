/**
 * MutationRunController — owns the gesture→mutation seam for stateful dialogs.
 *
 * Dialog event handlers stay synchronous and only dispatch an intent
 * (`SaveRequested { action, params }`), which moves the host's
 * [[DialogStateMachine]] `status` to `applying { action, params }`.
 *
 * On `hostUpdated`, this controller reads `host.sm.status`; when it is `applying`
 * and no effect is in flight, it runs `host.effects[status.action](status.params)`,
 * then dispatches `SaveResolved` on success or `SaveFailed { action, error }` on
 * failure. An in-flight guard prevents the re-renders that happen while the effect
 * runs from re-firing it.
 *
 * Because handlers contain no `await`, leaking a rejection or stranding the
 * `applying` flag is structurally impossible — this controller is the only place
 * the mutation runs and the only place failure is handled. See ADR-0015.
 */

import type { ReactiveController, ReactiveControllerHost } from 'lit';

/** The minimal `status` shape the controller reads. */
type ApplyingStatus = { kind: 'applying'; action: string; params: unknown };

interface DialogSMLike {
  status: { kind: string } | ApplyingStatus;
}

/** Events the controller dispatches back into the host's SM. */
export type MutationRunEvent =
  | { type: 'SaveResolved' }
  | { type: 'SaveFailed'; action: string; error: unknown };

/** Host contract a `MutationRunController` operates against. */
export interface MutationRunHost extends ReactiveControllerHost {
  /** The dialog's state machine. Its `status` may be `applying { action, params }`. */
  readonly sm: DialogSMLike;
  /** Apply a `transition` and trigger a re-render. */
  dispatch(event: MutationRunEvent): void;
  /** Effects keyed by action — run post-render with params carried in the status. */
  readonly effects: Record<string, (params: unknown) => Promise<void>>;
}

export class MutationRunController implements ReactiveController {
  private _inFlight = false;

  constructor(private host: MutationRunHost) {
    this.host.addController(this);
  }

  hostUpdated(): void {
    const status = this.host.sm.status;
    if (status.kind !== 'applying') return;
    if (this._inFlight) return;

    const { action, params } = status as ApplyingStatus;
    const effect = this.host.effects[action];
    if (!effect) {
      this.host.dispatch({
        type: 'SaveFailed',
        action,
        error: new Error(`No effect registered for action "${action}"`),
      });
      return;
    }

    this._inFlight = true;
    effect(params)
      .then(() => {
        this.host.dispatch({ type: 'SaveResolved' });
      })
      .catch((error: unknown) => {
        this.host.dispatch({ type: 'SaveFailed', action, error });
      })
      .finally(() => {
        this._inFlight = false;
      });
  }
}
