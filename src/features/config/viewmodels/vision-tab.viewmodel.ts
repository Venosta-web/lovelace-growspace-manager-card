/**
 * Vision Tab ViewModel (ADR-0019, "Applied to Config Dialog")
 *
 * The pure derivation behind the Config Dialog's Vision AI tab — a camera-entity
 * picker plus the vision-checkup schedule form (shown only once a camera is
 * configured). Projects its slice of the [[Shared Environment Draft]] and the
 * `hasCameras` gate; `entityOptions` is the injected hass adapter for the picker.
 */

import type { ConfigDialogSM } from '../../../dialogs/config-dialog-sm';

/** Complete render input for `<config-vision-tab>`. */
export interface VisionTabViewModel {
  cameraEntities: string[];
  cameraOptions: string[];
  /** When false the form is hidden behind the "add a camera" hint. */
  hasCameras: boolean;
  visionEnabled: boolean;
  earlyOffset: number;
  midHours: number;
  lateOffset: number;
}

/** Hass adapter the shell injects so the component stays hass-free. */
export interface VisionTabDeps {
  entityOptions: (domains: string[], deviceClass: string | null) => string[];
}

/**
 * Pure factory: the Config Dialog SM + injected hass adapter → one Vision tab
 * ViewModel. Testable with no DOM and no host.
 */
export function createVisionTabViewModel(
  sm: ConfigDialogSM,
  deps: VisionTabDeps
): VisionTabViewModel {
  const d = sm.environmentDraft;
  return {
    cameraEntities: d.cameraEntities,
    cameraOptions: deps.entityOptions(['camera'], null),
    hasCameras: d.cameraEntities.length > 0,
    visionEnabled: d.visionEnabled,
    earlyOffset: d.visionEarlyOffset,
    midHours: d.visionMidHours,
    lateOffset: d.visionLateOffset,
  };
}
