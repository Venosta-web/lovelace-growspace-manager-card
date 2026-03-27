/**
 * Feature Flags - Control rollout of new features
 *
 * Used during architecture refactor to enable gradual migration.
 * Toggle flags to test old vs new implementations.
 */

export const FEATURE_FLAGS = {
  /**
   * Use new plant-card-container instead of growspace-plant-card
   * Phase 2: Pilot refactor
   */
  USE_NEW_PLANT_CARD: false,

  /**
   * Use new dialog system with ViewModels
   * Phase 3: Dialog refactoring (plant-overview-dialog)
   */
  USE_NEW_DIALOGS: false,

  /**
   * Use new growspace-grid-container with ViewModel architecture
   * Phase 4 Tier 1: Grid refactoring
   */
  USE_NEW_GROWSPACE_GRID: false,

  /**
   * Use event bus for cross-component communication
   * Phase 1+: Infrastructure available
   */
  USE_EVENT_BUS: false,
} as const;

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag];
}
