import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { PlantDashboardTab } from '../../../../../src/features/plants/components/plant-dashboard-tab';
import type { PlantEntity, PlantOverviewEditedAttributes } from '../../../../../src/types';

if (!customElements.get('plant-dashboard-tab')) {
  customElements.define('plant-dashboard-tab', PlantDashboardTab);
}

describe('plant-dashboard-tab', () => {
  const mockPlant: any = {
    entity_id: 'plant.test',
    state: 'veg',
    attributes: {
      friendly_name: 'Test Plant',
      strain: 'Test Strain',
      planted_at: '2026-01-01',
    },
    context: { id: '1', parent_id: null, user_id: 'user1' },
    last_changed: '2026-01-01T00:00:00Z',
    last_reported: '2026-01-01T00:00:00Z',
    last_updated: '2026-01-01T00:00:00Z',
  };

  const mockEditedAttributes: PlantOverviewEditedAttributes = {};
  const mockStats = [{ label: 'Age', value: '10 days' }];

  it('renders all three child cards with correct props', async () => {
    const el = await fixture<PlantDashboardTab>(html`
      <plant-dashboard-tab
        .plant=${mockPlant}
        .editedAttributes=${mockEditedAttributes}
        .plantStats=${mockStats}
        .isEditing=${true}
        .showAllDates=${true}
      ></plant-dashboard-tab>
    `);
    
    const identityCard = el.shadowRoot?.querySelector('plant-identity-card') as any;
    expect(identityCard).to.exist;
    expect(identityCard.plant).to.equal(mockPlant);
    expect(identityCard.editedAttributes).to.equal(mockEditedAttributes);
    expect(identityCard.isEditing).to.be.true;
    
    const statsCard = el.shadowRoot?.querySelector('plant-stats-card') as any;
    expect(statsCard).to.exist;
    expect(statsCard.stats).to.equal(mockStats);
    
    const lifecycleCard = el.shadowRoot?.querySelector('plant-lifecycle-dates-card') as any;
    expect(lifecycleCard).to.exist;
    expect(lifecycleCard.editedAttributes).to.equal(mockEditedAttributes);
    expect(lifecycleCard.showAllDates).to.be.true;
  });

  describe('Event forwarding', () => {
    it('bubbles attribute-change event', async () => {
      const el = await fixture<PlantDashboardTab>(html`
        <plant-dashboard-tab
          .plant=${mockPlant}
          .editedAttributes=${mockEditedAttributes}
          .plantStats=${mockStats}
        ></plant-dashboard-tab>
      `);
      
      let payload: any = null;
      el.addEventListener('attribute-change', (e: any) => { payload = e.detail; });
      
      const identityCard = el.shadowRoot?.querySelector('plant-identity-card') as HTMLElement;
      identityCard.dispatchEvent(new CustomEvent('attribute-change', {
        detail: { key: 'strain', value: 'New Strain' }
      }));
      
      expect(payload).to.deep.equal({ key: 'strain', value: 'New Strain' });
    });

    it('bubbles toggle-dates event', async () => {
      const el = await fixture<PlantDashboardTab>(html`
        <plant-dashboard-tab
          .plant=${mockPlant}
          .editedAttributes=${mockEditedAttributes}
          .plantStats=${mockStats}
        ></plant-dashboard-tab>
      `);
      
      let toggled = false;
      el.addEventListener('toggle-dates', () => { toggled = true; });
      
      const lifecycleCard = el.shadowRoot?.querySelector('plant-lifecycle-dates-card') as HTMLElement;
      lifecycleCard.dispatchEvent(new CustomEvent('toggle-dates'));
      
      expect(toggled).to.be.true;
    });
  });
});
