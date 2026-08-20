/**
 * Compatibility shim (ADR-0019).
 *
 * The Irrigation Dialog host moved to `features/irrigation/containers/` as the
 * Dialog Shell. This re-export keeps the historical import path stable for the
 * many existing importers (the dialog host registry, the co-located SM/effect
 * tests, e2e page objects) while decomposition proceeds tab-by-tab.
 */
export * from '../features/irrigation/containers/irrigation-dialog.container';
