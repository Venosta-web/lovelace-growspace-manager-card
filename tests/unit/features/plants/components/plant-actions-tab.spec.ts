import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { PlantActionsTab } from '../../../../../src/features/plants/components/plant-actions-tab';
import type { ActionConfig } from '../../../../../src/features/plants/viewmodels/plant-overview.viewmodel';

if (!customElements.get('plant-actions-tab')) {
  customElements.define('plant-actions-tab', PlantActionsTab);
}

describe('plant-actions-tab', () => {
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

  it('renders correctly with given actions', async () => {
    const el = await fixture<PlantActionsTab>(html`
      <plant-actions-tab .availableActions=${mockActions}></plant-actions-tab>
    `);
    
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

  it('emits action-click when enabled action is clicked', async () => {
    const el = await fixture<PlantActionsTab>(html`
      <plant-actions-tab .availableActions=${mockActions}></plant-actions-tab>
    `);
    
    let payload: any = null;
    el.addEventListener('action-click', (e: any) => { payload = e.detail; });
    
    const firstCard = el.shadowRoot?.querySelectorAll('.action-card')[0] as HTMLElement;
    firstCard.click();
    
    expect(payload).to.deep.equal({ actionId: 'water' });
  });

  it('does not emit action-click when disabled action is clicked', async () => {
    const el = await fixture<PlantActionsTab>(html`
      <plant-actions-tab .availableActions=${mockActions}></plant-actions-tab>
    `);
    
    let clicked = false;
    el.addEventListener('action-click', () => { clicked = true; });
    
    const secondCard = el.shadowRoot?.querySelectorAll('.action-card')[1] as HTMLElement;
    secondCard.click();
    
    expect(clicked).to.be.false;
  });

  it('falls back to label for title if tooltip is not provided', async () => {
    const actions: ActionConfig[] = [{
      id: 'test',
      icon: 'mdiBug',
      label: 'Test Action',
      enabled: true
    }];
    
    const el = await fixture<PlantActionsTab>(html`
      <plant-actions-tab .availableActions=${actions}></plant-actions-tab>
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
      <plant-actions-tab .availableActions=${actions}></plant-actions-tab>
    `);
    
    const svg = el.shadowRoot?.querySelector('svg');
    expect(svg).to.not.exist;
  });
});
