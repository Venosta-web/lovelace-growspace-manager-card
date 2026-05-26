import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { PlantStatsCard } from '../../../../../src/features/plants/components/plant-stats-card';
import type { PlantStat } from '../../../../../src/features/plants/viewmodels/plant-overview.viewmodel';

if (!customElements.get('plant-stats-card')) {
  customElements.define('plant-stats-card', PlantStatsCard);
}

describe('plant-stats-card', () => {
  const mockStats: PlantStat[] = [
    { label: 'Age', value: '14', unit: 'days' },
    { label: 'VPD', value: '1.2', unit: 'kPa' },
    { label: 'No Unit', value: 'Testing' },
  ];

  it('renders nothing if stats are empty', async () => {
    const el = await fixture<PlantStatsCard>(html`
      <plant-stats-card .stats=${[]}></plant-stats-card>
    `);
    expect(el.shadowRoot?.innerHTML).to.include('<!---->');
  });

  it('renders stats correctly', async () => {
    const el = await fixture<PlantStatsCard>(html`
      <plant-stats-card .stats=${mockStats}></plant-stats-card>
    `);
    
    const items = el.shadowRoot?.querySelectorAll('.stat-item');
    expect(items?.length).to.equal(3);
    
    const firstItem = items?.[0] as HTMLElement;
    expect(firstItem.querySelector('.stat-value')?.textContent).to.include('14');
    expect(firstItem.querySelector('.stat-unit')?.textContent).to.equal('days');
    expect(firstItem.querySelector('.stat-label')?.textContent).to.equal('Age');
    
    const thirdItem = items?.[2] as HTMLElement;
    expect(thirdItem.querySelector('.stat-value')?.textContent).to.include('Testing');
    expect(thirdItem.querySelector('.stat-unit')).to.not.exist;
    expect(thirdItem.querySelector('.stat-label')?.textContent).to.equal('No Unit');
  });
});
