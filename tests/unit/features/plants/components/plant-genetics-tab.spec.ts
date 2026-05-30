import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { PlantGeneticsTab } from '../../../../../src/features/plants/components/plant-genetics-tab';
import type { PlantEntity } from '../../../../../src/types';

if (!customElements.get('plant-genetics-tab')) {
  customElements.define('plant-genetics-tab', PlantGeneticsTab);
}

describe('plant-genetics-tab', () => {
  let mockStore: any;
  let mockPlant: PlantEntity;

  beforeEach(() => {
    mockStore = {
      actions: {
        genetics: {
          getLineageTree: vi.fn().mockResolvedValue({ id: 'root', name: 'Root' }),
        },
      },
    };

    mockPlant = {
      entity_id: 'plant.test',
      attributes: {
        plant_id: 'p123',
        friendly_name: 'Test Plant',
        sex: 'female',
        seed_batch_id: 'SB001',
        generation: 'F1',
        strain: 'Blueberry',
        phenotype: 'Tall',
      },
    } as any;
  });

  const setup = async (plant = mockPlant) => {
    const el = await fixture<PlantGeneticsTab>(html`
      <plant-genetics-tab .plant=${plant}></plant-genetics-tab>
    `);
    (el as any).store = mockStore;
    // Manually trigger since store was missing during connectedCallback
    await (el as any)._loadLineageTree();
    await el.updateComplete;
    return el;
  };

  it('renders correctly with plant data', async () => {
    const el = await setup();

    // Check origin
    expect(el.shadowRoot?.textContent).to.contain('SB001');
    expect(el.shadowRoot?.textContent).to.contain('F1');
  });

  it('toggles link to seed batch form when no seed batch is present', async () => {
    const plantNoSeed = {
      ...mockPlant,
      attributes: { ...mockPlant.attributes, seed_batch_id: null }
    } as any;
    const el = await setup(plantNoSeed);
    
    const linkBtn = el.shadowRoot?.querySelector('button.tonal') as HTMLElement;
    expect(linkBtn.textContent?.trim()).to.equal('🔗 Link to seed batch');
    
    linkBtn.click();
    await el.updateComplete;
    
    expect(el.shadowRoot?.textContent).to.contain('To link this plant to a seed batch');
    
    linkBtn.click();
    await el.updateComplete;
    expect(el.shadowRoot?.textContent).to.not.contain('To link this plant to a seed batch');
  });

  it('dispatches open-strain-editor event when Edit Lineage is clicked', async () => {
    const el = await setup();
    
    let eventDetail: any = null;
    el.addEventListener('open-strain-editor', (e: any) => {
      eventDetail = e.detail;
    });
    
    const editBtn = Array.from(el.shadowRoot?.querySelectorAll('button') || [])
      .find(b => b.textContent?.trim() === 'Edit lineage') as HTMLElement;
    
    editBtn.click();
    
    expect(eventDetail).to.deep.equal({
      strain: 'Blueberry',
      phenotype: 'Tall',
      focusLineage: true
    });
  });

  it('does not dispatch open-strain-editor if strain is missing', async () => {
    const plantNoStrain = {
      ...mockPlant,
      attributes: { ...mockPlant.attributes, strain: undefined }
    } as any;
    const el = await setup(plantNoStrain);
    
    let eventDispatched = false;
    el.addEventListener('open-strain-editor', () => {
      eventDispatched = true;
    });
    
    const editBtn = Array.from(el.shadowRoot?.querySelectorAll('button') || [])
      .find(b => b.textContent?.trim() === 'Edit lineage') as HTMLElement;
    
    editBtn.click();
    expect(eventDispatched).to.be.false;
  });

  it('renders origin without generation if it is missing', async () => {
    const plantNoGen = {
      ...mockPlant,
      attributes: { ...mockPlant.attributes, generation: undefined }
    } as any;
    const el = await setup(plantNoGen);
    
    expect(el.shadowRoot?.textContent).to.contain('SB001');
    expect(el.shadowRoot?.textContent).to.not.contain('·');
  });

  it('loads lineage tree on init', async () => {
    const el = await setup();
    expect(mockStore.actions.genetics.getLineageTree).toHaveBeenCalledWith('p123');
    expect((el as any)._lineageTree).to.deep.equal({ id: 'root', name: 'Root' });
  });

  it('handles lineage tree loading failure', async () => {
    mockStore.actions.genetics.getLineageTree.mockRejectedValue(new Error('Failed'));
    const el = await setup();
    
    expect((el as any)._lineageTree).to.be.null;
    expect((el as any)._lineageLoading).to.be.false;
  });

  it('skips loading lineage tree if plant_id or store is missing', async () => {
    const el = await fixture<PlantGeneticsTab>(html`<plant-genetics-tab></plant-genetics-tab>`);
    // No store, no plant
    await (el as any)._loadLineageTree();
    expect(mockStore.actions.genetics.getLineageTree).not.toHaveBeenCalled();
    
    el.plant = { attributes: { plant_id: 'p123' } } as any;
    await (el as any)._loadLineageTree();
    expect(mockStore.actions.genetics.getLineageTree).not.toHaveBeenCalled();
  });

  it('reloads lineage tree when plant changes', async () => {
    const el = await setup();
    mockStore.actions.genetics.getLineageTree.mockClear();
    
    el.plant = { ...mockPlant, attributes: { ...mockPlant.attributes, plant_id: 'p456' } } as any;
    await el.updateComplete;
    
    expect(mockStore.actions.genetics.getLineageTree).toHaveBeenCalledWith('p456');
  });
});
