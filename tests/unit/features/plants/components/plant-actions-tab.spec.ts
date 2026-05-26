import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { ContextProvider } from '@lit/context';
import { storeContext } from '../../../../../src/context';
import { PlantActionsTab } from '../../../../../src/features/plants/components/plant-actions-tab';
import type { ActionConfig } from '../../../../../src/features/plants/viewmodels/plant-overview.viewmodel';
import type { PlantEntity } from '../../../../../src/types';

if (!customElements.get('plant-actions-tab')) {
  customElements.define('plant-actions-tab', PlantActionsTab);
}

describe('plant-actions-tab', () => {
  let mockStore: any;
  let mockPlant: PlantEntity;

  const mockActions: ActionConfig[] = [
    {
      id: 'water',
      icon: 'mdiWater',
      label: 'Water Plant',
      enabled: true,
      tooltip: 'Add Water',
    },
    {
      id: 'train',
      icon: 'mdiDumbbell',
      label: 'Train Plant',
      enabled: false,
      tooltip: 'Plant is too young',
    },
  ];

  beforeEach(() => {
    mockStore = {
      actions: {
        plant: {
          scorePhenotype: vi.fn().mockResolvedValue(undefined),
        },
      },
    };

    mockPlant = {
      entity_id: 'plant.test',
      attributes: {
        plant_id: 'p123',
        friendly_name: 'Test Plant',
        scores: {
          vigor: 4,
          structure: 3,
          aroma: null,
          resin: null,
          pest_resistance: null,
        },
      },
    } as any;
  });

  it('renders correctly with given actions', async () => {
    const el = await fixture<PlantActionsTab>(html`
      <plant-actions-tab .availableActions=${mockActions} .plant=${mockPlant}></plant-actions-tab>
    `);
    (el as any).store = mockStore;
    await el.updateComplete;
    
    const cards = el.shadowRoot?.querySelectorAll('.action-card');
    expect(cards?.length).to.equal(2);
    
    const firstCard = cards?.[0] as HTMLElement;
    expect(firstCard.querySelector('span')?.textContent).to.equal('Water Plant');
    expect(firstCard.title).to.equal('Add Water');
    expect(firstCard.classList.contains('disabled')).to.be.false;
    
    const secondCard = cards?.[1] as HTMLElement;
    expect(secondCard.querySelector('span')?.textContent).to.equal('Train Plant');
    expect(secondCard.title).to.equal('Plant is too young');
    expect(secondCard.classList.contains('disabled')).to.be.true;
  });

  it('initializes scores in willUpdate when plant changes', async () => {
    const el = await fixture<PlantActionsTab>(html`
      <plant-actions-tab .availableActions=${mockActions} .plant=${mockPlant}></plant-actions-tab>
    `);

    expect(el['_scoresEdit']).to.deep.equal({
      vigor: 4,
      structure: 3,
      aroma: null,
      resin: null,
      pest_resistance: null,
    });

    const newPlant = {
      ...mockPlant,
      attributes: {
        ...mockPlant.attributes,
        scores: { vigor: 5, structure: null, aroma: 4, resin: 3, pest_resistance: 2 }
      }
    } as any;

    el.plant = newPlant;
    await el.updateComplete;

    expect(el['_scoresEdit']).to.deep.equal({
      vigor: 5,
      structure: null,
      aroma: 4,
      resin: 3,
      pest_resistance: 2,
    });
  });

  it('emits action-click when enabled action is clicked', async () => {
    const el = await fixture<PlantActionsTab>(html`
      <plant-actions-tab .availableActions=${mockActions} .plant=${mockPlant}></plant-actions-tab>
    `);
    
    let payload: { actionId: string } | null = null;
    el.addEventListener('action-click', (e: Event) => { 
      payload = (e as CustomEvent).detail; 
    });
    
    const firstCard = el.shadowRoot?.querySelectorAll('.action-card')[0] as HTMLElement;
    firstCard.click();
    
    expect(payload).to.deep.equal({ actionId: 'water' });
  });

  it('does not emit action-click when disabled action is clicked', async () => {
    const el = await fixture<PlantActionsTab>(html`
      <plant-actions-tab .availableActions=${mockActions} .plant=${mockPlant}></plant-actions-tab>
    `);
    (el as any).store = mockStore;
    await el.updateComplete;
    
    let clicked = false;
    el.addEventListener('action-click', () => { clicked = true; });
    
    const secondCard = el.shadowRoot?.querySelectorAll('.action-card')[1] as HTMLElement;
    secondCard.click();
    
    expect(clicked).to.be.false;
  });

  it('toggles phenotype scoring form', async () => {
    const el = await fixture<PlantActionsTab>(html`
      <plant-actions-tab .availableActions=${mockActions} .plant=${mockPlant}></plant-actions-tab>
    `);
    (el as any).store = mockStore;
    await el.updateComplete;
    
    // Initial state: Save button not present
    expect(el.shadowRoot?.querySelector('.md3-button.filled')).to.be.null;

    const btn = el.shadowRoot?.querySelector('.score-card-header button') as HTMLElement;
    btn.click();
    await el.updateComplete;

    expect(el.shadowRoot?.querySelector('.md3-button.filled')).to.not.be.null;
    expect(el.shadowRoot?.querySelector('.md3-button.filled')?.textContent).to.contain('Save scores');
  });

  it('handles star rating interactions', async () => {
    const el = await fixture<PlantActionsTab>(html`
      <plant-actions-tab .availableActions=${mockActions} .plant=${mockPlant}></plant-actions-tab>
    `);
    (el as any).store = mockStore;
    await el.updateComplete;
    
    // Open form
    (el as any)._showScoringForm = true;
    await el.updateComplete;

    const toggleBtn = el.shadowRoot?.querySelector('.score-card-header button') as HTMLElement;
    expect(toggleBtn.textContent?.trim()).toBe('Cancel');
    
    // Save button should be visible
    const saveBtn = el.shadowRoot?.querySelector('.md3-button.filled') as HTMLElement;
    expect(saveBtn).to.exist;
    expect(saveBtn.textContent?.trim()).toBe('Save scores');

    toggleBtn.click();
    await el.updateComplete;

    expect(toggleBtn.textContent?.trim()).toBe('Score');
    expect(el.shadowRoot?.querySelector('.md3-button.filled')).to.not.exist;
  });

  it('updates star preview on mouseenter/mouseleave', async () => {
    const el = await fixture<PlantActionsTab>(html`
      <plant-actions-tab .availableActions=${mockActions} .plant=${mockPlant}></plant-actions-tab>
    `);
    (el as any).store = mockStore;
    await el.updateComplete;

    // Open form
    (el as any)._showScoringForm = true;
    await el.updateComplete;

    const vigorRow = el.shadowRoot?.querySelectorAll('div[style*="flex-direction:column; gap:6px;"]')[0];
    const stars = vigorRow?.querySelectorAll('button');

    // Mouseenter on 5th star
    stars?.[4].dispatchEvent(new MouseEvent('mouseenter'));
    expect(el['_starPreview'].vigor).toBe(5);

    // Mouseleave
    stars?.[4].dispatchEvent(new MouseEvent('mouseleave'));
    expect(el['_starPreview'].vigor).toBeNull();
  });

  it('sets and toggles scores on star click', async () => {
    const el = await fixture<PlantActionsTab>(html`
      <plant-actions-tab .availableActions=${mockActions} .plant=${mockPlant}></plant-actions-tab>
    `);
    (el as any).store = mockStore;
    await el.updateComplete;

    // Open form
    (el as any)._showScoringForm = true;
    await el.updateComplete;

    // Aroma is null initially
    const aromaKey = 'aroma';
    const aromaRow = el.shadowRoot?.querySelectorAll('div[style*="flex-direction:column; gap:6px;"]')[2];
    const aromaStars = aromaRow?.querySelectorAll('button');
    
    // Click 3rd star
    aromaStars?.[2].click();
    await el.updateComplete;
    expect(el['_scoresEdit'][aromaKey]).toBe(3);

    // Toggle off by clicking same value
    aromaStars?.[2].click();
    await el.updateComplete;
    expect(el['_scoresEdit'][aromaKey]).toBeNull();

    // Set to 5
    aromaStars?.[4].click();
    await el.updateComplete;
    expect(el['_scoresEdit'][aromaKey]).toBe(5);
  });

  it('saves phenotype scores and handles loading state', async () => {
    const el = await fixture<PlantActionsTab>(html`
      <plant-actions-tab .availableActions=${mockActions} .plant=${mockPlant}></plant-actions-tab>
    `);
    (el as any).store = mockStore;
    await el.updateComplete;
    
    // Open form
    (el as any)._showScoringForm = true;
    await el.updateComplete;

    // Modify a score
    (el as any)._scoresEdit = { ...mockPlant.attributes.scores, vigor: 5 };
    await el.updateComplete;

    const saveBtn = el.shadowRoot?.querySelector('.md3-button.filled') as HTMLElement;
    saveBtn.click();
    
    expect((el as any)._savingScore).to.be.true;
    
    // We need to wait for the async save to complete. 
    // Since we can't easily await the click's internal promise, 
    // we can wait until _savingScore becomes false.
    await vi.waitFor(() => !(el as any)._savingScore);
    
    expect((el as any)._showScoringForm).to.be.false;
    expect(mockStore.actions.plant.scorePhenotype).toHaveBeenCalledWith('p123', {
      vigor: 5,
      structure: 3,
      aroma: null,
      resin: null,
      pest_resistance: null,
    });
  });

  it('handles error during score saving', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockStore.actions.plant.scorePhenotype.mockRejectedValue(new Error('API Error'));

    const el = await fixture<PlantActionsTab>(html`
      <plant-actions-tab .availableActions=${mockActions} .plant=${mockPlant}></plant-actions-tab>
    `);
    (el as any).store = mockStore;
    await el.updateComplete;
    
    await (el as any)._savePhenotypeScore();
    
    expect((el as any)._savingScore).to.be.false;
    expect(consoleSpy).toHaveBeenCalledWith('Failed to save phenotype scores', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  it('does nothing when saving scores without plant_id', async () => {
    const el = await fixture<PlantActionsTab>(html`
      <plant-actions-tab .availableActions=${mockActions} .plant=${{ attributes: {} } as any}></plant-actions-tab>
    `);
    (el as any).store = mockStore;
    await el.updateComplete;
    
    await (el as any)._savePhenotypeScore();
    expect(mockStore.actions.plant.scorePhenotype).not.toHaveBeenCalled();
  });

  it('initializes scores with null if scores attribute is missing', async () => {
    const el = await fixture<PlantActionsTab>(html`
      <plant-actions-tab .availableActions=${mockActions} .plant=${{ attributes: { plant_id: 'p1' } } as any}></plant-actions-tab>
    `);
    await el.updateComplete;
    
    expect((el as any)._scoresEdit.vigor).to.be.null;
  });

  it('falls back to label for title if tooltip is not provided', async () => {
    const actions: ActionConfig[] = [{
      id: 'test',
      icon: 'mdiBug',
      label: 'Test Action',
      enabled: true
    }];
    
    const el = await fixture<PlantActionsTab>(html`
      <plant-actions-tab .availableActions=${actions} .plant=${mockPlant}></plant-actions-tab>
    `);
    
    const card = el.shadowRoot?.querySelector('.action-card') as HTMLElement;
    expect(card.title).to.equal('Test Action');
  });

  it('renders without an icon if icon string does not match the map', async () => {
    const actions: ActionConfig[] = [{
      id: 'test',
      icon: 'unknownIcon',
      label: 'Test Action',
      enabled: true
    }];
    
    const el = await fixture<PlantActionsTab>(html`
      <plant-actions-tab .availableActions=${actions} .plant=${mockPlant}></plant-actions-tab>
    `);
    
    const svg = el.shadowRoot?.querySelector('svg');
    expect(svg).to.not.exist;
  });

  it('does not reset scores in willUpdate if plant is null', async () => {
    const el = await fixture<PlantActionsTab>(html`
      <plant-actions-tab .availableActions=${mockActions} .plant=${mockPlant}></plant-actions-tab>
    `);
    await el.updateComplete;
    
    // Set a local score
    el['_scoresEdit'].vigor = 1;
    
    // Set plant to null
    (el as any).plant = null;
    await el.updateComplete;
    
    // Score should remain 1 because the reset logic is skipped if plant is null
    expect(el['_scoresEdit'].vigor).to.equal(1);
  });

  it('does not reset scores in willUpdate if plant did not change', async () => {
    const el = await fixture<PlantActionsTab>(html`
      <plant-actions-tab .availableActions=${mockActions} .plant=${mockPlant}></plant-actions-tab>
    `);
    await el.updateComplete;
    
    // Set a local score
    el['_scoresEdit'].vigor = 1;
    
    // Update another property
    el.availableActions = [];
    await el.updateComplete;
    
    // Score should remain 1
    expect(el['_scoresEdit'].vigor).to.equal(1);
  });
});
