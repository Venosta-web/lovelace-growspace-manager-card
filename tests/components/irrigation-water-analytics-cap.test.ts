import { expect, it } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { atom } from 'nanostores';
import { createInitialSM } from '../../src/dialogs/irrigation-dialog-sm';
import { IrrigationWaterAnalyticsTab } from '../../src/features/irrigation/components/irrigation-water-analytics-tab';
import { createWaterAnalyticsTabViewModel } from '../../src/features/irrigation/viewmodels/water-analytics-tab.viewmodel';
import type { GrowspaceDevice, IrrigationConfig } from '../../src/services/types';

if (!customElements.get('irrigation-water-analytics-tab')) {
  customElements.define('irrigation-water-analytics-tab', IrrigationWaterAnalyticsTab);
}

it('shows dispensed cap progress beside aggregate water usage', async () => {
  const device = {
    cyclesToday: 4,
    volumeDispensedToday: 3.2,
    irrigationConfig: {
      irrigationPumpEntity: 'switch.pump',
      dailyVolumeCapLiters: 10,
      maxCyclesPerDay: 12,
    } as IrrigationConfig,
    waterUsage: { litersToday: 5.6 },
  } as GrowspaceDevice;
  const vm = createWaterAnalyticsTabViewModel(atom(createInitialSM()), atom(device)).get();
  const el = await fixture<IrrigationWaterAnalyticsTab>(
    html`<irrigation-water-analytics-tab .vm=${vm}></irrigation-water-analytics-tab>`
  );

  const text = el.shadowRoot!.textContent!.replace(/\s+/g, ' ');
  expect(text).toContain('Toward daily cap 3.2 / 10 L · 4 / 12 cycles');
  expect(text).toContain('Liters today');
  expect(text).toContain('5.6');
});
