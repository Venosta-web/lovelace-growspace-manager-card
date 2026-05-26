import { describe, it, expect } from 'vitest';
import { FEATURE_FLAGS, isFeatureEnabled } from '../../../../src/features/shared/config/feature-flags';

describe('feature-flags', () => {
  describe('FEATURE_FLAGS', () => {
    it('USE_NEW_DIALOGS is enabled', () => {
      expect(FEATURE_FLAGS.USE_NEW_DIALOGS).toBe(true);
    });

    it('USE_EVENT_BUS is enabled', () => {
      expect(FEATURE_FLAGS.USE_EVENT_BUS).toBe(true);
    });
  });

  describe('isFeatureEnabled', () => {
    it('returns true for USE_NEW_DIALOGS', () => {
      expect(isFeatureEnabled('USE_NEW_DIALOGS')).toBe(true);
    });

    it('returns true for USE_EVENT_BUS', () => {
      expect(isFeatureEnabled('USE_EVENT_BUS')).toBe(true);
    });
  });
});
