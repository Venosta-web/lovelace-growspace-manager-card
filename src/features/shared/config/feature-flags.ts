/**
 * Feature Flags - Control rollout of new features
 *
 * Used during architecture refactor to enable gradual migration.
 * Toggle flags to test old vs new implementations.
 */

export const FEATURE_FLAGS = {
  /**
   * Use new dialog system with ViewModels
   * Phase 3: Dialog refactoring (plant-overview-dialog)
   */
  USE_NEW_DIALOGS: true,

  /**
   * Use event bus for cross-component communication
   * Phase 1+: Infrastructure available
   */
  USE_EVENT_BUS: true,
} as const;

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag];
}
