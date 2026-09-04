import { atom } from 'nanostores';
import { hassCall } from '../../services/hass-call';
import { TcManifestSchema, type TcManifest } from './schema';

export type { TcManifest };
export { TcManifestSchema };

export const TC_DOMAIN = 'growspace_manager_tc';
export const WS_TC_GET_MANIFEST = `${TC_DOMAIN}/get_manifest`;

/**
 * Whether Growspace Manager TC is there to talk to.
 *
 * Home Assistant tells a Lovelace card nothing about which custom integrations
 * are installed, so the card asks TC's own namespace and reads the answer:
 *
 * | reply             | meaning                          |
 * | ----------------- | -------------------------------- |
 * | a manifest        | installed, loaded, ready         |
 * | `unknown_command` | not installed                    |
 * | `not_loaded`      | installed, entry not loaded      |
 * | anything else     | unreachable, or a shape we can't read |
 *
 * Every failure collapses to `absent`: there is no TC surface to render either
 * way, and a card that guessed otherwise would render an empty shell to users
 * who never installed the integration.
 */
export type TcPresence =
  | { status: 'unknown' }
  | { status: 'present'; manifest: TcManifest }
  | { status: 'absent'; reason: string };

export const tcPresence$ = atom<TcPresence>({ status: 'unknown' });

let probe: Promise<TcPresence> | null = null;

/**
 * Probe once per page load, and share the answer.
 *
 * Several cards on one dashboard must not each open the same round trip, and
 * the result is cached for the session in both directions — installing or
 * removing TC is a Home Assistant restart away from the browser, so a reload is
 * the honest boundary for re-asking.
 */
export async function detectTc(): Promise<TcPresence> {
  probe ??= (async (): Promise<TcPresence> => {
    try {
      const manifest = await hassCall(WS_TC_GET_MANIFEST, {}, TcManifestSchema);
      return { status: 'present', manifest };
    } catch (error) {
      return { status: 'absent', reason: error instanceof Error ? error.message : String(error) };
    }
  })();

  const presence = await probe;
  tcPresence$.set(presence);
  return presence;
}

/** Whether a detected TC installation serves a given feature. */
export function tcHasFeature(feature: string): boolean {
  const presence = tcPresence$.get();
  return presence.status === 'present' && presence.manifest.features.includes(feature);
}

/** Forget the cached probe. Tests only — nothing in the card re-detects. */
export function resetTcPresence(): void {
  probe = null;
  tcPresence$.set({ status: 'unknown' });
}
