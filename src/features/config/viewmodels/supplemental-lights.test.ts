import { describe, expect, it } from 'vitest';
import {
  formatClockMinutes,
  parseLightsOnMinutes,
  resolveSupplementalWindowPreview,
} from './supplemental-lights';

describe('supplemental-lights preview helpers', () => {
  it('parses lights-on time and formats clock minutes across midnight', () => {
    expect(parseLightsOnMinutes('06:30:00')).toBe(390);
    expect(parseLightsOnMinutes(null)).toBe(360);
    expect(formatClockMinutes(390)).toBe('06:30');
    expect(formatClockMinutes(25 * 60)).toBe('01:00 (+1d)');
  });

  it('resolves valid windows in local time including midnight wrap', () => {
    const preview = resolveSupplementalWindowPreview(
      {
        id: 'w1',
        start_anchor: 'lights_on',
        start_offset_minutes: 30,
        end_anchor: 'lights_off',
        end_offset_minutes: -60,
      },
      '20:00',
      12
    );
    expect(preview.valid).toBe(true);
    expect(preview.startTime).toBe('20:30');
    expect(preview.endTime).toBe('07:00 (+1d)');
    expect(preview.error).toBeNull();
  });

  it('flags invalid windows outside the main cycle or with non-positive duration', () => {
    const beforeOn = resolveSupplementalWindowPreview(
      {
        id: 'w1',
        start_anchor: 'lights_on',
        start_offset_minutes: -15,
        end_anchor: 'lights_on',
        end_offset_minutes: 30,
      },
      '06:00',
      12
    );
    expect(beforeOn.valid).toBe(false);
    expect(beforeOn.error).toContain('before planned main lights-on');

    const pastOff = resolveSupplementalWindowPreview(
      {
        id: 'w2',
        start_anchor: 'lights_off',
        start_offset_minutes: -30,
        end_anchor: 'lights_off',
        end_offset_minutes: 15,
      },
      '06:00',
      12
    );
    expect(pastOff.valid).toBe(false);
    expect(pastOff.error).toContain('after planned main lights-off');

    const empty = resolveSupplementalWindowPreview(
      {
        id: 'w3',
        start_anchor: 'lights_on',
        start_offset_minutes: 60,
        end_anchor: 'lights_on',
        end_offset_minutes: 60,
      },
      '06:00',
      12
    );
    expect(empty.valid).toBe(false);
    expect(empty.error).toContain('after window start');
  });
});
