/**
 * Dialog Shell ViewModel (ADR-0019)
 *
 * The host-level derived state for the Irrigation Dialog's wiring: the
 * cross-tab rail-group visibility gates that decide which nav items show.
 * It is a thin `computed` over the shared Dialog Capabilities atom — the same
 * `$caps` atom every Tab ViewModel consumes — so the gate is owned in exactly
 * one place (never re-derived per tab).
 *
 * This first slice only surfaces the Crop-Steering rail-group gate (Overview +
 * Steering share it, ADR-0016). The nav rail / footer / toast stay rendered
 * inline in the Dialog Shell for now; later slices fold more of that derivation
 * here as tabs decompose.
 */

import { computed, type ReadableAtom } from 'nanostores';
import type { DialogCapabilities } from './dialog-capabilities';

/** Shell-level derived state consumed by the Dialog Shell's wiring. */
export interface ShellViewModel {
  /** Whether the Crop-Steering rail group (Overview + Steering) is visible. */
  cropSteeringGroupVisible: boolean;
}

/**
 * Pure factory: shared Dialog Capabilities atom → shell ViewModel atom.
 */
export function createShellViewModel(
  $caps: ReadableAtom<DialogCapabilities>
): ReadableAtom<ShellViewModel> {
  return computed([$caps], (caps) => ({
    cropSteeringGroupVisible: caps.cropSteeringGroupVisible,
  }));
}
