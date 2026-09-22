/**
 * Which dialog-host portals are mounted on this page.
 *
 * `activeDialog$` is one page-global atom and every card that mounts a
 * `growspace-dialog-host` subscribes to it, so two cards on a dashboard render
 * the same dialog twice. The fix is for the opener to name its portal
 * (`payload.portalId`, from the opening card's `store.instanceId`) and for the
 * other portals to stand down — but a portal can only stand down for one that
 * actually exists. Several cards provide the store context without mounting a
 * portal of their own (analytics, subarea, tank, logbook, AI-insight), so an
 * opener in one of those names a portal nobody has; without this registry every
 * portal would suppress itself and the dialog would open nowhere, which is
 * worse than opening twice.
 *
 * Hosts register themselves — the card that mounts one does not have to
 * remember to — and the atom is reactive because portals mount lazily, on the
 * first dialog open. A portal that renders a dialog while the named one is
 * still loading re-renders and stands down the moment that portal arrives.
 */

import { atom } from 'nanostores';

/** Ids of the currently mounted dialog-host portals, in registration order. */
export const mountedDialogPortals$ = atom<readonly string[]>([]);

/** Register a mounted portal. Repeated registrations of one id are counted. */
export function registerDialogPortal(portalId: string): void {
  mountedDialogPortals$.set([...mountedDialogPortals$.get(), portalId]);
}

/** Drop one registration of `portalId`, leaving any duplicate in place. */
export function unregisterDialogPortal(portalId: string): void {
  const ids = mountedDialogPortals$.get();
  const index = ids.indexOf(portalId);
  if (index === -1) return;
  mountedDialogPortals$.set([...ids.slice(0, index), ...ids.slice(index + 1)]);
}

/**
 * Whether a dialog whose payload names `portalId` belongs to the portal
 * identified by `hostPortalId`, given the portals currently mounted.
 *
 * True when the payload names this portal, when it names no portal at all, and
 * when it names one that is not mounted — the last two are the pre-identity
 * behaviour, kept deliberately so a dialog never opens nowhere. `mountedPortalIds`
 * is passed in rather than read here so the caller's subscription to
 * `mountedDialogPortals$` is what re-runs the test.
 */
export function portalOwnsDialog(
  hostPortalId: string | undefined,
  portalId: string | undefined,
  mountedPortalIds: readonly string[]
): boolean {
  if (!portalId || portalId === hostPortalId) return true;
  return !mountedPortalIds.includes(portalId);
}
