import { fixture } from '@open-wc/testing-helpers';
import { mdiAirHumidifier, mdiLightbulbOn, mdiThermometer, mdiWaterPercent } from '@mdi/js';
import { html } from 'lit';
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';

import type { GrowspaceHeaderUI } from '../../src/features/ui/components/growspace-header-ui';
import type { HeaderChip } from '../../src/slices/header-metrics';
import type { GrowspaceDevice } from '../../src/types';
import '../../src/features/ui/components/growspace-header-ui';

const darkTheme = {
  '--card-background-color': '#1c1c1e',
  '--primary-background-color': '#111111',
  '--secondary-background-color': '#2a2a2c',
  '--primary-text-color': '#f5f5f7',
  '--secondary-text-color': '#b5b5bb',
  '--divider-color': 'rgba(255, 255, 255, 0.16)',
};

const lightTheme = {
  '--card-background-color': '#ffffff',
  '--primary-background-color': '#f3f5f4',
  '--secondary-background-color': '#edf1ee',
  '--primary-text-color': '#1b1c1b',
  '--secondary-text-color': '#565d58',
  '--divider-color': 'rgba(27, 28, 27, 0.18)',
};

const device = {
  deviceId: 'flower-room',
  name: 'North flowering room with an exceptionally long growspace name',
  plants: [
    { entity_id: 'plant.northern_lights', attributes: {} },
    { entity_id: 'plant.blue_dream', attributes: {} },
    { entity_id: 'plant.gelato', attributes: {} },
  ],
} as unknown as GrowspaceDevice;

function chip(overrides: Partial<HeaderChip>): HeaderChip {
  return {
    key: 'temperature',
    icon: mdiThermometer,
    value: '24.5 °C',
    label: 'Temperature',
    status: 'optimal',
    active: false,
    linked: false,
    groupIndex: -1,
    ...overrides,
  };
}

const heroChips = [
  chip({ key: 'temperature', label: 'Temperature', value: '27.8 °C', status: 'warning' }),
  chip({ key: 'humidity', icon: mdiWaterPercent, label: 'Humidity', value: '68 %' }),
  chip({ key: 'vpd', label: 'VPD', value: '1.42 kPa', status: 'danger' }),
  chip({ key: 'co2', label: 'CO₂', value: '910 ppm' }),
];

const additionalChips = [
  chip({ key: 'dli', icon: mdiLightbulbOn, label: 'DLI', value: '31 mol/m²' }),
  chip({ key: 'tank', icon: mdiWaterPercent, label: 'Reservoir', value: '42 %' }),
  chip({ key: 'light', icon: mdiLightbulbOn, label: 'Lights', value: 'On', status: undefined }),
  chip({
    key: 'humidifier',
    icon: mdiAirHumidifier,
    label: 'Humidifier',
    value: 'Off',
    status: undefined,
  }),
];

async function renderMobileHeader(
  width: number,
  theme: Record<string, string>,
  minimal = false
): Promise<{ wrapper: HTMLDivElement; header: GrowspaceHeaderUI }> {
  await page.viewport(width, 900);
  const wrapper = await fixture<HTMLDivElement>(html`
    <div
      style="box-sizing:border-box;padding:12px;background:var(--card-background-color);font-family:Roboto,sans-serif;"
    >
      <growspace-header-ui
        .hass=${{ language: 'en' }}
        .device=${minimal ? { ...device, name: 'Propagation', plants: [] } : device}
        .deviceId=${device.deviceId}
        .heroChips=${minimal ? [heroChips[1]] : heroChips}
        .secondaryChips=${minimal ? [] : additionalChips.slice(0, 2)}
        .deviceChips=${minimal ? [] : additionalChips.slice(2)}
        .problemPlants=${minimal ? [] : ['Northern Lights']}
      ></growspace-header-ui>
    </div>
  `);
  for (const [name, value] of Object.entries(theme)) wrapper.style.setProperty(name, value);
  document.body.style.background = theme['--primary-background-color'];

  const header = wrapper.querySelector<GrowspaceHeaderUI>('growspace-header-ui')!;
  await header.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
  await header.updateComplete;
  return { wrapper, header };
}

// The capture scales CSS pixels by 0.8, so a fractional box height rounds to either of
// two pixel rows; that shifts every glyph by a row and blows past the mismatch budget.
// Rounding up to a multiple of 5 CSS px lands the height on a whole captured pixel.
async function pinToWholePixels(wrapper: HTMLDivElement): Promise<void> {
  const { height } = wrapper.getBoundingClientRect();
  wrapper.style.height = `${Math.ceil(height / 5) * 5}px`;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
}

afterEach(async () => {
  await page.viewport(1280, 720);
  document.body.style.background = '#111111';
});

test.each([
  { name: 'compact dark', width: 320, theme: darkTheme, minimal: false },
  { name: 'compact light minimum', width: 360, theme: lightTheme, minimal: true },
  { name: 'wide dark', width: 600, theme: darkTheme, minimal: false },
  { name: 'wide light', width: 600, theme: lightTheme, minimal: false },
])('mobile growspace header – $name', async ({ width, theme, minimal }) => {
  const { wrapper, header } = await renderMobileHeader(width, theme, minimal);
  if (!minimal && width === 600) {
    const readings = header.shadowRoot!.querySelector('growspace-header-hero-ui')!;
    readings.shadowRoot!.querySelector<HTMLDetailsElement>('.more-readings')!.open = true;
  }

  await pinToWholePixels(wrapper);

  await expect(page.elementLocator(wrapper)).toMatchScreenshot();
});
