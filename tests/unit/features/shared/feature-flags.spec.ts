import { describe, it, expect } from 'vitest';
import { FEATURE_FLAGS, isFeatureEnabled } from '../../../../src/features/shared/config/feature-flags';

describe('feature-flags', () => {
  describe('FEATURE_FLAGS', () => {
    it('USE_NEW_PLANT_CARD is enabled', () => {
      expect(FEATURE_FLAGS.USE_NEW_PLANT_CARD).toBe(true);
    });

    it('USE_NEW_DIALOGS is enabled', () => {
      expect(FEATURE_FLAGS.USE_NEW_DIALOGS).toBe(true);
    });

    it('USE_NEW_GROWSPACE_GRID is disabled', () => {
      expect(FEATURE_FLAGS.USE_NEW_GROWSPACE_GRID).toBe(false);
    });

    it('USE_EVENT_BUS is enabled', () => {
      expect(FEATURE_FLAGS.USE_EVENT_BUS).toBe(true);
    });
  });

  describe('isFeatureEnabled', () => {
    it('returns true for USE_NEW_PLANT_CARD', () => {
      expect(isFeatureEnabled('USE_NEW_PLANT_CARD')).toBe(true);
    });

    it('returns true for USE_NEW_DIALOGS', () => {
      expect(isFeatureEnabled('USE_NEW_DIALOGS')).toBe(true);
    });

    it('returns false for USE_NEW_GROWSPACE_GRID', () => {
      expect(isFeatureEnabled('USE_NEW_GROWSPACE_GRID')).toBe(false);
    });

    it('returns true for USE_EVENT_BUS', () => {
      expect(isFeatureEnabled('USE_EVENT_BUS')).toBe(true);
    });
  });
});
