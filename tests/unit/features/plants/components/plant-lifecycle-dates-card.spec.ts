import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { PlantLifecycleDatesCard } from '../../../../../src/features/plants/components/plant-lifecycle-dates-card';
import type { PlantOverviewEditedAttributes } from '../../../../../src/types';

if (!customElements.get('plant-lifecycle-dates-card')) {
  customElements.define('plant-lifecycle-dates-card', PlantLifecycleDatesCard);
}

describe('plant-lifecycle-dates-card', () => {
  const mockEditedAttributes: PlantOverviewEditedAttributes = {
    veg_start: '2026-01-01',
    flower_start: '2026-02-01',
  };

  it('renders current stages mode correctly', async () => {
    const el = await fixture<PlantLifecycleDatesCard>(html`
      <plant-lifecycle-dates-card
        .editedAttributes=${mockEditedAttributes}
        .showAllDates=${false}
      ></plant-lifecycle-dates-card>
    `);
    
    const dateInputs = el.shadowRoot?.querySelectorAll('md3-date-input');
    expect(dateInputs?.length).to.equal(2);
    expect((dateInputs?.[0] as any).value).to.equal('2026-01-01');
    expect((dateInputs?.[1] as any).value).to.equal('2026-02-01');
  });

  it('renders all stages mode correctly', async () => {
    const el = await fixture<PlantLifecycleDatesCard>(html`
      <plant-lifecycle-dates-card
        .editedAttributes=${mockEditedAttributes}
        .showAllDates=${true}
      ></plant-lifecycle-dates-card>
    `);
    
    const dateInputs = el.shadowRoot?.querySelectorAll('md3-date-input');
    expect(dateInputs?.length).to.equal(7);
  });

  it('renders placeholder when no dates are set in current stage mode', async () => {
    const el = await fixture<PlantLifecycleDatesCard>(html`
      <plant-lifecycle-dates-card
        .editedAttributes=${{}}
        .showAllDates=${false}
      ></plant-lifecycle-dates-card>
    `);
    
    const dateInputs = el.shadowRoot?.querySelectorAll('md3-date-input');
    expect(dateInputs?.length).to.equal(0);
    
    const p = el.shadowRoot?.querySelector('p');
    expect(p?.textContent).to.include('Click the edit button to add dates');
  });

  it('emits toggle-dates event on button click', async () => {
    const el = await fixture<PlantLifecycleDatesCard>(html`
      <plant-lifecycle-dates-card
        .editedAttributes=${mockEditedAttributes}
        .showAllDates=${false}
      ></plant-lifecycle-dates-card>
    `);
    
    let toggled = false;
    el.addEventListener('toggle-dates', () => { toggled = true; });
    
    const btn = el.shadowRoot?.querySelector('.toggle-button') as HTMLButtonElement;
    btn.click();
    
    expect(toggled).to.be.true;
  });

  it('emits attribute-change event on date input change', async () => {
    const el = await fixture<PlantLifecycleDatesCard>(html`
      <plant-lifecycle-dates-card
        .editedAttributes=${mockEditedAttributes}
        .showAllDates=${true}
      ></plant-lifecycle-dates-card>
    `);

    let payload: any = null;
    el.addEventListener('attribute-change', (e: any) => { payload = e.detail; });

    const dateInput = el.shadowRoot?.querySelector('md3-date-input') as HTMLElement;
    dateInput.dispatchEvent(new CustomEvent('change', { detail: '2026-01-02' }));

    expect(payload).to.deep.equal({ key: 'seedling_start', value: '2026-01-02' });
  });

  it('emits attribute-change for each field in all dates mode', async () => {
    const allAttributes: PlantOverviewEditedAttributes = {
      seedling_start: '2025-01-01',
      mother_start: '2025-02-01',
      clone_start: '2025-03-01',
      veg_start: '2025-04-01',
      flower_start: '2025-05-01',
      dry_start: '2025-06-01',
      cure_start: '2025-07-01',
    };

    const el = await fixture<PlantLifecycleDatesCard>(html`
      <plant-lifecycle-dates-card
        .editedAttributes=${allAttributes}
        .showAllDates=${true}
      ></plant-lifecycle-dates-card>
    `);

    const inputs = Array.from(el.shadowRoot?.querySelectorAll('md3-date-input') ?? []) as HTMLElement[];
    const expectedKeys = ['seedling_start', 'mother_start', 'clone_start', 'veg_start', 'flower_start', 'dry_start', 'cure_start'];

    for (let i = 0; i < inputs.length; i++) {
      let payload: any = null;
      el.addEventListener('attribute-change', (e: any) => { payload = e.detail; }, { once: true });
      inputs[i].dispatchEvent(new CustomEvent('change', { detail: `2026-0${i + 1}-01` }));
      expect(payload).to.deep.equal({ key: expectedKeys[i], value: `2026-0${i + 1}-01` });
    }
  });

  it('emits attribute-change for veg and flower inputs in current stage mode', async () => {
    const el = await fixture<PlantLifecycleDatesCard>(html`
      <plant-lifecycle-dates-card
        .editedAttributes=${mockEditedAttributes}
        .showAllDates=${false}
      ></plant-lifecycle-dates-card>
    `);

    const inputs = Array.from(el.shadowRoot?.querySelectorAll('md3-date-input') ?? []) as HTMLElement[];
    const expectedKeys = ['veg_start', 'flower_start'];

    for (let i = 0; i < inputs.length; i++) {
      let payload: any = null;
      el.addEventListener('attribute-change', (e: any) => { payload = e.detail; }, { once: true });
      inputs[i].dispatchEvent(new CustomEvent('change', { detail: '2026-03-01' }));
      expect(payload).to.deep.equal({ key: expectedKeys[i], value: '2026-03-01' });
    }
  });

  it('renders dry and cure stages in current stage mode and emits attribute-change', async () => {
    const dryCureAttributes: PlantOverviewEditedAttributes = {
      dry_start: '2026-01-01',
      cure_start: '2026-02-01',
    };

    const el = await fixture<PlantLifecycleDatesCard>(html`
      <plant-lifecycle-dates-card
        .editedAttributes=${dryCureAttributes}
        .showAllDates=${false}
      ></plant-lifecycle-dates-card>
    `);

    const inputs = Array.from(el.shadowRoot?.querySelectorAll('md3-date-input') ?? []) as HTMLElement[];
    expect(inputs.length).to.equal(2);

    const expectedKeys = ['dry_start', 'cure_start'];
    for (let i = 0; i < inputs.length; i++) {
      let payload: any = null;
      el.addEventListener('attribute-change', (e: any) => { payload = e.detail; }, { once: true });
      inputs[i].dispatchEvent(new CustomEvent('change', { detail: '2026-03-01' }));
      expect(payload).to.deep.equal({ key: expectedKeys[i], value: '2026-03-01' });
    }
  });
});
