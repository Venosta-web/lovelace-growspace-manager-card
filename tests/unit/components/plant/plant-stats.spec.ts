import { fixture, html } from '@open-wc/testing-helpers';
import { GrowspacePlantStats } from '../../../../src/features/plants/components/plant-stats';
import { PlantStage } from '../../../../src/features/plants/types';
import { describe, it, expect } from 'vitest';

if (!customElements.get('growspace-plant-stats')) {
  customElements.define('growspace-plant-stats', GrowspacePlantStats);
}

describe('GrowspacePlantStats', () => {
  it('renders nothing when stages are empty', async () => {
    const el = await fixture<GrowspacePlantStats>(html`
      <growspace-plant-stats .stages=${[]}></growspace-plant-stats>
    `);
    // Lit handles empty arrays by rendering nothing or just markers
    const items = el.shadowRoot?.querySelectorAll('.pc-stat-item');
    expect(items?.length).to.equal(0);
  });

  it('renders stages correctly and handles current stage styling', async () => {
    const stages = [
      {
        days: 5,
        icon: 'M12,2L2,12L12,22L22,12L12,2Z',
        title: 'Veg',
        stage: PlantStage.VEG,
        isCurrent: true,
        color: '#4caf50'
      },
      {
        days: 10,
        icon: 'M12,2L2,12L12,22L22,12L12,2Z',
        title: 'Flower',
        stage: PlantStage.FLOWER,
        isCurrent: false,
        color: '#e91e63'
      }
    ];

    const el = await fixture<GrowspacePlantStats>(html`
      <growspace-plant-stats .stages=${stages}></growspace-plant-stats>
    `);

    const items = el.shadowRoot?.querySelectorAll('.pc-stat-item');
    expect(items?.length).to.equal(2);

    // Check first item (current)
    expect(items![0].classList.contains('current-stage')).to.be.true;
    const svg1 = items![0].querySelector('svg');
    expect(svg1?.style.color).to.equal('rgb(76, 175, 80)'); // #4caf50 in RGB

    // Check second item (not current)
    expect(items![1].classList.contains('current-stage')).to.be.false;
    const svg2 = items![1].querySelector('svg');
    expect(svg2?.style.color).to.equal('rgb(233, 30, 99)'); // #e91e63 in RGB

    const texts = el.shadowRoot?.querySelectorAll('.pc-stat-text');
    expect(texts![0].textContent).to.equal('5d');
    expect(texts![1].textContent).to.equal('10d');
  });
});
