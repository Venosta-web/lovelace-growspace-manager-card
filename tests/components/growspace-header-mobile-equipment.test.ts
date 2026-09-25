import { fixture } from '@open-wc/testing-helpers';
import {
  mdiAirHumidifier,
  mdiAirHumidifierOff,
  mdiCloudOutline,
  mdiFan,
  mdiLightbulbOn,
  mdiThermometer,
  mdiWater,
  mdiWaterMinus,
  mdiWaterPercent,
  mdiWaterPump,
  mdiWeatherCloudy,
} from '@mdi/js';
import { html } from 'lit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';

import type { GrowspaceHeaderHeroUI } from '../../src/features/ui/components/growspace-header-hero-ui';
import type { GrowspaceHeaderUI } from '../../src/features/ui/components/growspace-header-ui';
import type { HeaderChip } from '../../src/slices/header-metrics';
import type { GrowspaceDevice } from '../../src/types';
import '../../src/features/ui/components/growspace-header-ui';

function chip(overrides: Partial<HeaderChip>): HeaderChip {
  return {
    key: 'temperature',
    icon: mdiThermometer,
    value: '24.5 °C',
    label: 'Temperature',
    active: false,
    linked: false,
    groupIndex: -1,
    ...overrides,
  };
}

const hero = [
  chip({ key: 'temperature', label: 'Temperature', value: '27.8 °C', status: 'warning' }),
  chip({ key: 'humidity', icon: mdiWaterPercent, label: 'Humidity', value: '68 %' }),
  chip({ key: 'vpd', icon: mdiCloudOutline, label: 'VPD', value: '1.72 kPa', status: 'danger' }),
  chip({ key: 'co2', icon: mdiWeatherCloudy, label: 'CO2', value: '910 ppm' }),
];

const equipment = [
  chip({ key: 'light', icon: mdiLightbulbOn, label: 'Light', value: 'On' }),
  chip({ key: 'exhaust', icon: mdiFan, label: 'Exhaust', value: '45%' }),
  chip({ key: 'circulation_fan', icon: mdiFan, label: 'Circulation Fan', value: 'On' }),
  chip({ key: 'humidifier', icon: mdiAirHumidifier, label: 'Humidifier', value: 'Off' }),
  chip({
    key: 'dehumidifier',
    icon: mdiAirHumidifierOff,
    label: 'Dehumidifier',
    value: 'Multiple',
    multiValues: ['On', 'Off'],
  }),
  chip({ key: 'irrigation_pump', icon: mdiWaterPump, label: 'Pump', value: 'On' }),
  chip({ key: 'drain_pump', icon: mdiWaterPump, label: 'Drain Pump', value: 'Off' }),
];

const nextIrrigation = chip({ key: 'irrigation', icon: mdiWater, label: 'Next', value: '14:00' });
const nextDrain = chip({ key: 'drain', icon: mdiWaterMinus, label: 'Next', value: '18:30' });
const phase = chip({ key: 'steering_phase', icon: mdiWater, label: 'Phase', value: 'P2 · 21:00' });

async function renderDeck(props: Partial<GrowspaceHeaderHeroUI>): Promise<GrowspaceHeaderHeroUI> {
  const el = await fixture<GrowspaceHeaderHeroUI>(html`
    <growspace-header-hero-ui
      .isMobile=${true}
      .chips=${props.chips ?? hero}
      .additionalChips=${props.additionalChips ?? []}
      .deviceChips=${props.deviceChips ?? equipment}
    ></growspace-header-hero-ui>
  `);
  await el.updateComplete;
  return el;
}

const texts = (root: ShadowRoot, selector: string) =>
  Array.from(root.querySelectorAll(selector)).map((node) => node.textContent?.trim());

describe('mobile deck – equipment strip', () => {
  it('lists every equipment chip with its state, in order', async () => {
    const el = await renderDeck({});
    const strip = el.shadowRoot!.querySelector('.equipment-strip')!;

    expect(strip.getAttribute('aria-label')).toBe('Equipment');
    expect(texts(el.shadowRoot!, '.equipment-label')).toEqual([
      'Light',
      'Exhaust',
      'Circulation Fan',
      'Humidifier',
      'Dehumidifier',
      'Pump',
      'Drain Pump',
    ]);
    expect(texts(el.shadowRoot!, '.equipment-value')).toEqual([
      'On',
      '45%',
      'On',
      'Off',
      'On · Off',
      'On',
      'Off',
    ]);
  });

  it('toggles the pump graph from its strip button (#1006)', async () => {
    const el = await renderDeck({});
    const toggle = vi.fn();
    el.addEventListener('toggle-graph', toggle);

    await expect
      .element(page.elementLocator(el).getByRole('button', { name: 'Pump: On. Toggle graph' }))
      .toBeVisible();
    el.shadowRoot!.querySelector<HTMLButtonElement>(
      '.equipment-item[data-key="irrigation_pump"]'
    )!.click();

    expect(toggle).toHaveBeenCalledWith(
      expect.objectContaining({ detail: { metric: 'irrigation_pump' } })
    );
  });

  it('takes equipment out of the readings carousel and the More readings list', async () => {
    const el = await renderDeck({ additionalChips: [nextIrrigation] });
    const readingKeys = [
      ...texts(el.shadowRoot!, '.deck-item .hero-label'),
      ...texts(el.shadowRoot!, '.more-readings-grid .hero-label'),
    ];

    expect(readingKeys).not.toEqual(expect.arrayContaining(['Light']));
    expect(readingKeys).not.toContain('Exhaust');
    expect(el.shadowRoot!.querySelector('summary')!.textContent).toContain('More readings 1');
  });

  it('toggles the equipment graph from the strip', async () => {
    const el = await renderDeck({});
    const toggle = vi.fn();
    el.addEventListener('toggle-graph', toggle);

    el.shadowRoot!.querySelector<HTMLButtonElement>('.equipment-item[data-key="exhaust"]')!.click();

    expect(toggle).toHaveBeenCalledWith(expect.objectContaining({ detail: { metric: 'exhaust' } }));
  });

  it('names each strip button with its state', async () => {
    const el = await renderDeck({});

    await expect
      .element(page.elementLocator(el).getByRole('button', { name: 'Exhaust: 45%. Toggle graph' }))
      .toBeVisible();
  });

  it('renders no strip when the growspace has no equipment', async () => {
    const el = await renderDeck({ deviceChips: [] });

    expect(el.shadowRoot!.querySelector('.equipment-strip')).toBeNull();
  });
});

describe('mobile deck – irrigation line', () => {
  const line = (el: GrowspaceHeaderHeroUI) =>
    el.shadowRoot!.querySelector('.irrigation-line')?.textContent?.replace(/\s+/g, ' ').trim();

  it('shows the crop-steering phase and the next drain', async () => {
    const el = await renderDeck({ chips: [...hero, phase], additionalChips: [nextDrain] });

    expect(line(el)).toBe('Phase P2 · 21:00 · Next drain 18:30');
  });

  it('shows the next scheduled irrigation when steering is off', async () => {
    const el = await renderDeck({ additionalChips: [nextIrrigation] });

    expect(line(el)).toBe('Next irrigation 14:00');
  });

  it('prefers the phase over a stale schedule if both are present', async () => {
    const el = await renderDeck({ chips: [...hero, phase], additionalChips: [nextIrrigation] });

    expect(line(el)).toBe('Phase P2 · 21:00');
  });

  it('is absent when irrigation has nothing scheduled', async () => {
    const el = await renderDeck({});

    expect(el.shadowRoot!.querySelector('.irrigation-line')).toBeNull();
  });

  it('sits above the readings carousel, below the equipment strip', async () => {
    const el = await renderDeck({ additionalChips: [nextIrrigation] });
    const order = Array.from(el.shadowRoot!.querySelector('.mobile-reading-flow')!.children).map(
      (node) => node.className
    );

    expect(order.indexOf('equipment-strip')).toBe(0);
    expect(order.indexOf('irrigation-line')).toBe(1);
    expect(order.indexOf('irrigation-line')).toBeLessThan(order.indexOf('deck-scroll'));
  });
});

// card#972 acceptance: at 375 × 812 the equipment strip and the phase line are
// on the first screen. The spacer stands in for Home Assistant's own toolbar,
// and the readings are the Demo Tent's — a critical VPD, two plant alerts and
// twenty further readings — so the header is as tall as it gets in practice.
describe('mobile first screen at 375 × 812', () => {
  afterEach(async () => {
    await page.viewport(1280, 720);
  });

  it('shows equipment and phase without scrolling', async () => {
    await page.viewport(375, 812);
    const moreReadings = Array.from({ length: 20 }, (_, i) =>
      chip({ key: `reading_${i}`, label: `Reading ${i + 1}`, value: `${i}` })
    );
    const wrapper = await fixture<HTMLDivElement>(html`
      <div
        style="box-sizing:border-box;width:375px;height:812px;overflow:hidden;background:#111111;color:#f5f5f7;font-family:Roboto,sans-serif;--card-background-color:#1c1c1e;--secondary-background-color:#2a2a2c;--primary-text-color:#f5f5f7;--secondary-text-color:#b5b5bb;--divider-color:rgba(255,255,255,0.16);"
      >
        <div style="height:56px;background:#1c1c1e;"></div>
        <div style="padding:8px;">
          <div style="background:var(--card-background-color);border-radius:12px;padding:12px;">
            <growspace-header-ui
              .hass=${{ language: 'en' }}
              .device=${{
                deviceId: 'demo-tent',
                name: 'Demo Tent',
                plants: Array.from({ length: 17 }, (_, i) => ({ entity_id: `plant.p${i}` })),
              } as unknown as GrowspaceDevice}
              .deviceId=${'demo-tent'}
              .dominant=${{
                icon: '',
                daysLabel: '38 Days Flower',
                weeksLabel: '6 Weeks Flower',
                color: '#ff9800',
              }}
              .heroChips=${[...hero, phase]}
              .secondaryChips=${[nextDrain, ...moreReadings]}
              .deviceChips=${equipment}
              .problemPlants=${['Gelato', 'Blue Dream']}
            ></growspace-header-ui>
          </div>
        </div>
      </div>
    `);
    const header = wrapper.querySelector<GrowspaceHeaderUI>('growspace-header-ui')!;
    await header.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
    const deck = header.shadowRoot!.querySelector<GrowspaceHeaderHeroUI>(
      'growspace-header-hero-ui'
    )!;
    await deck.updateComplete;

    const screenBottom = wrapper.getBoundingClientRect().top + 812;
    const strip = deck.shadowRoot!.querySelector('.equipment-strip')!;
    const phaseLine = deck.shadowRoot!.querySelector('.irrigation-line')!;
    expect(strip.getBoundingClientRect().bottom).toBeLessThanOrEqual(screenBottom);
    expect(phaseLine.getBoundingClientRect().bottom).toBeLessThanOrEqual(screenBottom);
    // Both are fully inside the screen, not merely started on it.
    for (const node of [strip, phaseLine]) {
      const { top, height } = node.getBoundingClientRect();
      expect(height).toBeGreaterThan(0);
      expect(top).toBeGreaterThanOrEqual(wrapper.getBoundingClientRect().top);
    }

    await expect(page.elementLocator(wrapper)).toMatchScreenshot();
  });
});
