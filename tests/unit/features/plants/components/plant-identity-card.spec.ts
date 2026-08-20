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
    expect(statItems?.length).to.equal(5);

    expect(statItems?.[0].querySelector('.stat-value')?.textContent).to.equal('OG Kush');
    expect(statItems?.[1].querySelector('.stat-value')?.textContent).to.equal('Pheno 1');
    expect(statItems?.[2].querySelector('.stat-value')?.textContent).to.equal('Unknown');
    expect(statItems?.[3].querySelector('.stat-value')?.textContent).to.equal('2');
    expect(statItems?.[4].querySelector('.stat-value')?.textContent).to.equal('3');
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
    el.addEventListener('attribute-change', (e: any) => {
      payload = e.detail;
    });

    const textInput = el.shadowRoot?.querySelector('md3-text-input') as HTMLElement;
    textInput.dispatchEvent(new CustomEvent('change', { detail: 'New Strain Name' }));

    expect(payload).to.deep.equal({ key: 'strain', value: 'New Strain Name' });
  });

  it('emits attribute-change for phenotype input', async () => {
    const el = await fixture<PlantIdentityCard>(html`
      <plant-identity-card
        .plant=${mockPlant}
        .editedAttributes=${mockEditedAttributes}
        .isEditing=${true}
      ></plant-identity-card>
    `);

    let payload: any = null;
    el.addEventListener('attribute-change', (e: any) => {
      payload = e.detail;
    });

    const textInputs = el.shadowRoot?.querySelectorAll('md3-text-input') as NodeListOf<HTMLElement>;
    textInputs[1].dispatchEvent(new CustomEvent('change', { detail: 'New Pheno' }));

    expect(payload).to.deep.equal({ key: 'phenotype', value: 'New Pheno' });
  });

  it('emits attribute-change for row number input', async () => {
    const el = await fixture<PlantIdentityCard>(html`
      <plant-identity-card
        .plant=${mockPlant}
        .editedAttributes=${mockEditedAttributes}
        .isEditing=${true}
      ></plant-identity-card>
    `);

    let payload: any = null;
    el.addEventListener('attribute-change', (e: any) => {
      payload = e.detail;
    });

    const numInputs = el.shadowRoot?.querySelectorAll(
      'md3-number-input'
    ) as NodeListOf<HTMLElement>;
    numInputs[0].dispatchEvent(new CustomEvent('change', { detail: 3 }));

    expect(payload).to.deep.equal({ key: 'row', value: 3 });
  });

  it('emits attribute-change for col number input', async () => {
    const el = await fixture<PlantIdentityCard>(html`
      <plant-identity-card
        .plant=${mockPlant}
        .editedAttributes=${mockEditedAttributes}
        .isEditing=${true}
      ></plant-identity-card>
    `);

    let payload: any = null;
    el.addEventListener('attribute-change', (e: any) => {
      payload = e.detail;
    });

    const numInputs = el.shadowRoot?.querySelectorAll(
      'md3-number-input'
    ) as NodeListOf<HTMLElement>;
    numInputs[1].dispatchEvent(new CustomEvent('change', { detail: 4 }));

    expect(payload).to.deep.equal({ key: 'col', value: 4 });
  });

  it('renders with growspace options', async () => {
    const growspaceOptions = {
      gs_1: 'Tent Alpha',
      gs_2: 'Tent Beta',
    };
    const plantWithGrowspace = {
      ...mockPlant,
      attributes: {
        ...mockPlant.attributes,
        growspace_id: 'gs_2',
      },
    };

    // View mode
    const elView = await fixture<PlantIdentityCard>(html`
      <plant-identity-card
        .plant=${plantWithGrowspace}
        .editedAttributes=${mockEditedAttributes}
        .growspaceOptions=${growspaceOptions}
        .isEditing=${false}
      ></plant-identity-card>
    `);

    const statItems = elView.shadowRoot?.querySelectorAll('.stat-item');
    expect(statItems?.[2].querySelector('.stat-value')?.textContent).to.equal('Tent Beta');

    // Edit mode
    const elEdit = await fixture<PlantIdentityCard>(html`
      <plant-identity-card
        .plant=${plantWithGrowspace}
        .editedAttributes=${mockEditedAttributes}
        .growspaceOptions=${growspaceOptions}
        .isEditing=${true}
      ></plant-identity-card>
    `);

    const selectEl = elEdit.shadowRoot?.querySelector('md3-select') as any;
    expect(selectEl).to.exist;
    expect(selectEl.options).to.deep.equal([
      { label: 'Tent Alpha', value: 'gs_1' },
      { label: 'Tent Beta', value: 'gs_2' },
    ]);
    expect(selectEl.value).to.equal('gs_2');
  });

  it('dispatches open-strain-editor event from view mode', async () => {
    const el = await fixture<PlantIdentityCard>(html`
      <plant-identity-card
        .plant=${mockPlant}
        .editedAttributes=${mockEditedAttributes}
        .isEditing=${false}
      ></plant-identity-card>
    `);

    let payload: any = null;
    el.addEventListener('open-strain-editor', (e: any) => {
      payload = e.detail;
    });

    const strainStat = el.shadowRoot?.querySelector('.stat-item.actionable') as HTMLElement;
    expect(strainStat).to.exist;
    strainStat.click();

    expect(payload).to.deep.equal({ strain: 'OG Kush', phenotype: 'Pheno 1' });
  });

  it('dispatches open-strain-editor event from edit mode', async () => {
    const el = await fixture<PlantIdentityCard>(html`
      <plant-identity-card
        .plant=${mockPlant}
        .editedAttributes=${mockEditedAttributes}
        .isEditing=${true}
      ></plant-identity-card>
    `);

    let payload: any = null;
    el.addEventListener('open-strain-editor', (e: any) => {
      payload = e.detail;
    });

    const strainActionBtn = el.shadowRoot?.querySelector('.input-action-btn') as HTMLElement;
    expect(strainActionBtn).to.exist;
    strainActionBtn.click();

    expect(payload).to.deep.equal({ strain: 'OG Kush Edited', phenotype: 'Pheno 2' });
  });

  it('handles open-strain-editor fallback when attributes are missing', async () => {
    const plantWithoutAttributes = {
      ...mockPlant,
      attributes: undefined,
    };
    const emptyEditedAttributes = {};

    // View mode fallback
    const elView = await fixture<PlantIdentityCard>(html`
      <plant-identity-card
        .plant=${plantWithoutAttributes}
        .editedAttributes=${emptyEditedAttributes}
        .isEditing=${false}
      ></plant-identity-card>
    `);

    let payloadView: any = null;
    elView.addEventListener('open-strain-editor', (e: any) => {
      payloadView = e.detail;
    });

    const strainStat = elView.shadowRoot?.querySelector('.stat-item.actionable') as HTMLElement;
    strainStat.click();
    expect(payloadView).to.deep.equal({ strain: '', phenotype: '' });

    // Edit mode fallback
    const elEdit = await fixture<PlantIdentityCard>(html`
      <plant-identity-card
        .plant=${plantWithoutAttributes}
        .editedAttributes=${emptyEditedAttributes}
        .isEditing=${true}
      ></plant-identity-card>
    `);

    let payloadEdit: any = null;
    elEdit.addEventListener('open-strain-editor', (e: any) => {
      payloadEdit = e.detail;
    });

    const strainActionBtn = elEdit.shadowRoot?.querySelector('.input-action-btn') as HTMLElement;
    strainActionBtn.click();
    expect(payloadEdit).to.deep.equal({ strain: '', phenotype: '' });
  });

  it('dispatches move-plant event on growspace change only if targetId is different', async () => {
    const plantWithGrowspace = {
      ...mockPlant,
      attributes: {
        ...mockPlant.attributes,
        growspace_id: 'gs_1',
      },
    };

    const el = await fixture<PlantIdentityCard>(html`
      <plant-identity-card
        .plant=${plantWithGrowspace}
        .editedAttributes=${mockEditedAttributes}
        .isEditing=${true}
      ></plant-identity-card>
    `);

    let payload: any = null;
    el.addEventListener('move-plant', (e: any) => {
      payload = e.detail;
    });

    const selectEl = el.shadowRoot?.querySelector('md3-select') as HTMLElement;
    expect(selectEl).to.exist;

    // Case A: same ID -> should NOT dispatch
    selectEl.dispatchEvent(new CustomEvent('change', { detail: 'gs_1' }));
    expect(payload).to.be.null;

    // Case B: different ID -> should dispatch
    selectEl.dispatchEvent(new CustomEvent('change', { detail: 'gs_2' }));
    expect(payload).to.deep.equal({ targetId: 'gs_2' });
  });
});
