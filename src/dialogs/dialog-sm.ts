/**
 * Shared type-level contract for all dialog state machines.
 * No runtime code — import with `import type` only.
 */

export interface DialogStateMachine<
  TTabId extends string,
  TTabStates extends Record<TTabId, object>,
> {
  activeTab: TTabId;
  tabs: TTabStates;
  status: { kind: 'idle' } | { kind: 'confirm-discard'; pendingTab: TTabId };
  toast: string | undefined;
}
