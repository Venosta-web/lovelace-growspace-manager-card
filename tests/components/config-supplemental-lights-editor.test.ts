import { afterEach, describe, expect, it } from 'vitest';
import '../../src/features/config/components/config-supplemental-lights-editor';
import type { ConfigSupplementalLightsEditor } from '../../src/features/config/components/config-supplemental-lights-editor';

describe('<config-supplemental-lights-editor>', () => {
  const mounted: HTMLElement[] = [];

  afterEach(() => {
    for (const el of mounted.splice(0)) el.remove();
  });

  async function mount(
    props: Partial<ConfigSupplementalLightsEditor> = {}
  ): Promise<ConfigSupplementalLightsEditor> {
    const el = document.createElement(
      'config-supplemental-lights-editor'
    ) as ConfigSupplementalLightsEditor;
    Object.assign(el, props);
    document.body.appendChild(el);
    mounted.push(el);
    await el.updateComplete;
    return el;
  }

  it('renders local-time window preview, status, and skipped window explanations', async () => {
    const el = await mount({
      lightsOnTime: '06:00',
      photoperiodHours: 12,
      entityOptions: ['switch.uv', 'light.red'],
      lights: [
        {
          id: 's1',
          entity_id: 'switch.uv',
          enabled: true,
          windows: [
            {
              id: 'w1',
              start_anchor: 'lights_on',
              start_offset_minutes: 30,
              end_anchor: 'lights_off',
              end_offset_minutes: -60,
            },
          ],
        },
      ],
      statuses: [
        {
          id: 's1',
          entity_id: 'switch.uv',
          enabled: true,
          reported_state: 'off',
          available: true,
          is_active_now: false,
          held_off_reason: 'Lights manual override active until 11:30',
          override_expires_at: null,
          current_window: null,
          next_window: {
            start: '2026-07-03T06:30:00+02:00',
            end: '2026-07-03T17:00:00+02:00',
          },
          skipped_windows: [
            { window_id: 'old_veg', reason: 'Window starts at or after planned main lights-off.' },
          ],
        },
      ],
    });

    const text = el.shadowRoot?.textContent ?? '';
    expect(text).toContain('Local preview: 06:30 – 17:00');
    expect(text).toContain('State: off');
    expect(text).toContain('Lights manual override active until 11:30');
    expect(text).toContain('Skipped window old_veg');
  });

  it('emits save-supplemental-lights and supports release-anyway confirmation', async () => {
    const events: Array<{ supplementalLights: unknown[]; releaseAnyway: boolean }> = [];
    const el = await mount({
      lightsOnTime: '06:00',
      photoperiodHours: 12,
      releaseBlockers: [
        {
          entity_id: 'switch.uv',
          reason: 'unreachable',
          message: 'switch.uv is unavailable and could not be switched off before releasing it.',
        },
      ],
    });
    el.addEventListener('save-supplemental-lights', (e: Event) => {
      events.push((e as CustomEvent).detail);
    });

    const releaseBtn = Array.from(el.shadowRoot?.querySelectorAll('button') ?? []).find((b) =>
      b.textContent?.includes('Release anyway')
    );
    expect(releaseBtn).toBeDefined();
    releaseBtn?.click();

    expect(events).toHaveLength(1);
    expect(events[0].releaseAnyway).toBe(true);
  });

  it('preserves pending draft edits when release confirmation is requested and parent re-renders', async () => {
    const events: Array<{ supplementalLights: unknown[]; releaseAnyway: boolean }> = [];
    const initialLight = {
      id: 's1',
      entity_id: 'switch.uv',
      enabled: true,
      windows: [
        {
          id: 'w1',
          start_anchor: 'lights_on' as const,
          start_offset_minutes: 0,
          end_anchor: 'lights_on' as const,
          end_offset_minutes: 60,
        },
      ],
    };
    const el = await mount({
      lightsOnTime: '06:00',
      photoperiodHours: 12,
      lights: [initialLight],
    });
    el.addEventListener('save-supplemental-lights', (e: Event) => {
      events.push((e as CustomEvent).detail);
    });

    // Delete the output
    const removeBtn = Array.from(el.shadowRoot?.querySelectorAll('button') ?? []).find((b) =>
      b.getAttribute('aria-label') === 'Remove supplemental light'
    );
    expect(removeBtn).toBeDefined();
    removeBtn?.click();
    await el.updateComplete;

    // Click Save supplemental lights -> dispatches empty list with releaseAnyway: false
    const saveBtn = Array.from(el.shadowRoot?.querySelectorAll('button') ?? []).find((b) =>
      b.textContent?.includes('Save supplemental lights')
    );
    saveBtn?.click();
    expect(events).toHaveLength(1);
    expect(events[0].supplementalLights).toEqual([]);
    expect(events[0].releaseAnyway).toBe(false);

    // Simulate parent re-render passing a new lights array reference + releaseBlockers
    el.lights = [structuredClone(initialLight)];
    el.releaseBlockers = [
      {
        entity_id: 'switch.uv',
        reason: 'unreachable',
        message: 'switch.uv is unavailable.',
      },
    ];
    await el.updateComplete;

    // Click Release anyway -> must still submit the deleted draft ([]), not the pre-edit lights
    const releaseBtn = Array.from(el.shadowRoot?.querySelectorAll('button') ?? []).find((b) =>
      b.textContent?.includes('Release anyway')
    );
    releaseBtn?.click();
    expect(events).toHaveLength(2);
    expect(events[1].supplementalLights).toEqual([]);
    expect(events[1].releaseAnyway).toBe(true);
  });
});
