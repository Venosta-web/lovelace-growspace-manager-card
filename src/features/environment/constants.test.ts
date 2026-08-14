import { describe, expect, it } from 'vitest';
import { FAN_VPD_STAGE_COLORS, FAN_VPD_STAGE_KEYS } from './constants';

describe('fan VPD stage identity colours', () => {
  it('covers every canonical stage in glossary order', () => {
    expect(Object.keys(FAN_VPD_STAGE_COLORS)).toEqual([...FAN_VPD_STAGE_KEYS]);
  });

  it('does not use the alert colour for a stage identity', () => {
    const alertColor = 'var(--error-color, #f44336)';
    expect(Object.values(FAN_VPD_STAGE_COLORS)).not.toContain(alertColor);
    expect(Object.values(FAN_VPD_STAGE_COLORS).join(' ')).not.toContain('#f44336');
  });
});
