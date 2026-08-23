import { fixture, html } from '@open-wc/testing-helpers';
import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { GrowspaceSubareaCard } from '../../../src/cards/growspace-subarea-card';
import { ChartUtils } from '../../../src/utils/chart-utils';
import { aHass } from '../../fixtures';

vi.mock('../../../src/utils/chart-utils', () => ({
  ChartUtils: {
    generateSparklinePath: vi.fn(),
    getSparklineColor: vi.fn(),
    generateVpdSparklineSegments: vi.fn().mockReturnValue([]),
  },
}));

vi.mock('../../../src/cards/editors/growspace-subarea-card-editor.js', () => ({}));

if (!customElements.get('growspace-subarea-card')) {
  customElements.define('growspace-subarea-card', GrowspaceSubareaCard);
}

test('growspace-subarea-card visual snapshot', async () => {
  vi.mocked(ChartUtils.generateSparklinePath).mockReturnValue('M 0,0 L 100,100');
  vi.mocked(ChartUtils.getSparklineColor).mockReturnValue('#4caf50');

  const mockHass = aHass();
  Object.assign(mockHass.states, {
    'sensor.veg_temp': {
      state: '23.0',
      attributes: { friendly_name: 'Veg Temp', unit_of_measurement: '°C' },
    },
    'sensor.veg_humidity': {
      state: '52',
      attributes: { friendly_name: 'Veg Humidity', unit_of_measurement: '%' },
    },
    'light.veg_light': { state: 'on' },
    'fan.exhaust': { state: 'off' },
    'fan.circ': { state: 'on' },
    'switch.hum': { state: 'off' },
    'switch.dehum': { state: 'off' },
  });

  const element = await fixture<GrowspaceSubareaCard>(html`
    <growspace-subarea-card .hass=${mockHass}></growspace-subarea-card>
  `);
  element.setConfig({
    type: 'custom:growspace-subarea-card',
    default_growspace: 'gs1',
    subarea_id: 'sa1',
  } as any);
  await element.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await element.updateComplete;

  await expect(page.elementLocator(element)).toMatchScreenshot();
});
