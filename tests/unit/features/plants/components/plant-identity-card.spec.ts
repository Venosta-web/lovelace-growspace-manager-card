import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { PlantIdentityCard } from '../../../../../src/features/plants/components/plant-identity-card';
import type { PlantEntity, PlantOverviewEditedAttributes } from '../../../../../src/types';

if (!customElements.get('plant-identity-card')) {
  customElements.define('plant-identity-card', PlantIdentityCard);
}

describe('plant-identity-card', () => {
  const mockPlant: any = {
    entity_id: 'plant.test',
    state: 'veg',
    attributes: {
      friendly_name: 'Test Plant',
      strain: 'OG Kush',
      phenotype: 'Pheno 1',
      row: 2,
      col: 3,
      planted_at: '2026-01-01',
    },
    context: { id: '1', parent_id: null, user_id: 'user1' },
    last_changed: '2026-01-01T00:00:00Z',
    last_reported: '2026-01-01T00:00:00Z',
    last_updated: '2026-01-01T00:00:00Z',
  };

  const mockEditedAttributes: PlantOverviewEditedAttributes = {
    strain: 'OG Kush Edited',
    phenotype: 'Pheno 2',
    row: 1,
    col: 1,
  };

  it('renders view mode correctly with plant attributes', async () => {
    const el = await fixture<PlantIdentityCard>(html`
      <plant-identity-card
        .plant=${mockPlant}
        .editedAttributes=${mockEditedAttributes}
        .isEditing=${false}
      ></plant-identity-card>
    `);
    
    const statItems = el.shadowRoot?.querySelectorAll('.stat-item');
    expect(statItems?.length).to.equal(4);
    
    expect(statItems?.[0].querySelector('.stat-value')?.textContent).to.equal('OG Kush');
    expect(statItems?.[1].querySelector('.stat-value')?.textContent).to.equal('Pheno 1');
    expect(statItems?.[2].querySelector('.stat-value')?.textContent).to.equal('2');
    expect(statItems?.[3].querySelector('.stat-value')?.textContent).to.equal('3');
  });

  it('renders edit mode correctly with edited attributes', async () => {
    const el = await fixture<PlantIdentityCard>(html`
      <plant-identity-card
        .plant=${mockPlant}
        .editedAttributes=${mockEditedAttributes}
        .isEditing=${true}
      ></plant-identity-card>
    `);
    
    const textInputs = el.shadowRoot?.querySelectorAll('md3-text-input');
    const numInputs = el.shadowRoot?.querySelectorAll('md3-number-input');
    
    expect(textInputs?.length).to.equal(2);
    expect(numInputs?.length).to.equal(2);
    
    expect((textInputs?.[0] as any).value).to.equal('OG Kush Edited');
    expect((textInputs?.[1] as any).value).to.equal('Pheno 2');
    expect((numInputs?.[0] as any).value).to.equal(1);
    expect((numInputs?.[1] as any).value).to.equal(1);
  });

  it('emits attribute-change event on input change', async () => {
    const el = await fixture<PlantIdentityCard>(html`
      <plant-identity-card
        .plant=${mockPlant}
        .editedAttributes=${mockEditedAttributes}
        .isEditing=${true}
      ></plant-identity-card>
    `);
    
    let payload: any = null;
    el.addEventListener('attribute-change', (e: any) => { payload = e.detail; });
    
    const textInput = el.shadowRoot?.querySelector('md3-text-input') as HTMLElement;
    textInput.dispatchEvent(new CustomEvent('change', { detail: 'New Strain Name' }));
    
    expect(payload).to.deep.equal({ key: 'strain', value: 'New Strain Name' });
  });
});
