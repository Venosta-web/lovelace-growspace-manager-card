import { fixture, html } from '@open-wc/testing-helpers';
import { describe, expect, it } from 'vitest';
import type { HeaderChip } from '../../src/slices/header-metrics';
import '../../src/features/shared/ui/growspace-chip';
import '../../src/features/ui/components/growspace-header-hero-ui';

const phaseChip: HeaderChip = {
  key: 'steering_phase',
  icon: 'M12,2 L12,22',
  label: 'Phase',
  value: 'P2 · 12:30',
  active: false,
  linked: false,
  groupIndex: 0,
};

const strategy = {
  enabled: true,
  targetVwcPercent: 60,
  maintenanceDrybackPercent: 15,
  lightsOnTime: '06:00',
  p0DurationMinutes: 60,
  p2StopBeforeLightsOffMinutes: 120,
};

describe('header chip accessibility', () => {
  it('names the phase graph toggle and describes the state shown by its hero card', async () => {
    const now = Date.now();
    const historyCache = {
      soil_moisture: [
        { last_changed: new Date(now - 60 * 60 * 1000).toISOString(), state: '52.0' },
        { last_changed: new Date(now).toISOString(), state: '55.5' },
      ],
    };
    const element = await fixture(html`
      <growspace-header-hero-ui
        .chips=${[phaseChip]}
        .irrigationStrategy=${strategy}
        .historyCache=${historyCache}
      ></growspace-header-hero-ui>
    `);
    const button = element.shadowRoot!.querySelector('.phase-hero-card') as HTMLButtonElement;

    await expect.element(button).toHaveAccessibleName('Toggle Phase graph');
    await expect
      .element(button)
      .toHaveAccessibleDescription(
        'Active phase P2. Next transition at 12:30. Current VWC 55.5%. Target VWC 60%. P2 trigger 45%.'
      );
  });

  it('includes the dryback state in the P3 phase description', async () => {
    const element = await fixture(html`
      <growspace-header-hero-ui
        .chips=${[{ ...phaseChip, value: 'P3 · 06:00' }]}
        .irrigationStrategy=${strategy}
      ></growspace-header-hero-ui>
    `);
    const button = element.shadowRoot!.querySelector('.phase-hero-card') as HTMLButtonElement;

    await expect
      .element(button)
      .toHaveAccessibleDescription(/Active phase P3\. Next transition at 06:00\..* Dryback\./);
  });

  it('omits title when hero and shared chips have no tooltip', async () => {
    const temperatureChip: HeaderChip = {
      ...phaseChip,
      key: 'temperature',
      label: 'Temperature',
      value: '24.5 °C',
      groupIndex: 1,
    };
    const hero = await fixture(html`
      <growspace-header-hero-ui
        .chips=${[phaseChip, temperatureChip]}
        .irrigationStrategy=${strategy}
      >
      </growspace-header-hero-ui>
    `);
    const sharedChip = await fixture(html`<growspace-chip label="Phase"></growspace-chip>`);

    expect(
      Array.from(hero.shadowRoot!.querySelectorAll('.hero-card')).every(
        (card) => !card.hasAttribute('title')
      )
    ).toBe(true);
    expect(sharedChip.shadowRoot!.querySelector('.stat-chip')!.hasAttribute('title')).toBe(false);
  });
});
