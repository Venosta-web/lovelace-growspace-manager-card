import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { PlantDryingTab } from '../../../../../src/features/plants/components/plant-drying-tab';
import type { PlantEntity } from '../../../../../src/types';

if (!customElements.get('plant-drying-tab')) {
  customElements.define('plant-drying-tab', PlantDryingTab);
}

describe('plant-drying-tab', () => {
  let mockStore: any;
  let mockPlant: PlantEntity;

  beforeEach(() => {
    mockStore = {
      actions: {
        plant: {
          setVisualTag: vi.fn().mockResolvedValue(undefined),
          logDryingWeight: vi.fn().mockResolvedValue(undefined),
          logMoistureReading: vi.fn().mockResolvedValue(undefined),
        },
      },
    };

    mockPlant = {
      entity_id: 'plant.test',
      attributes: {
        plant_id: 'p123',
        friendly_name: 'Test Plant',
        drying_weight: 45.5,
        weight_lost_pct: 12.3,
        days_to_target: 4.2,
        drying_moisture: 62.1,
        drying_ready_for_cure: false,
        visual_tag: 'Blue Velcro',
      },
    } as any;
  });

  it('renders correctly with given attributes and stats', async () => {
    const el = await fixture<PlantDryingTab>(html`
      <plant-drying-tab .plant=${mockPlant}></plant-drying-tab>
    `);
    (el as any).store = mockStore;
    await el.updateComplete;

    const stats = el.shadowRoot?.querySelectorAll('span');
    expect(stats).to.exist;

    // We expect stats to render values correctly
    const texts = Array.from(stats || []).map(s => s.textContent);
    expect(texts).to.contain('Current weight');
    expect(texts).to.contain('45.5 g');
    expect(texts).to.contain('Weight lost');
    expect(texts).to.contain('12.3%');
    expect(texts).to.contain('Est. days left');
    expect(texts).to.contain('5'); // Math.ceil(4.2) is 5
    expect(texts).to.contain('Moisture');
    expect(texts).to.contain('62.1%');
    expect(texts).to.contain('Ready for cure');
    expect(texts).to.contain('✗ No');
  });

  it('renders cure ready as Yes when drying_ready_for_cure is true', async () => {
    const readyPlant = {
      ...mockPlant,
      attributes: {
        ...mockPlant.attributes,
        drying_ready_for_cure: true,
      },
    };
    const el = await fixture<PlantDryingTab>(html`
      <plant-drying-tab .plant=${readyPlant}></plant-drying-tab>
    `);
    (el as any).store = mockStore;
    await el.updateComplete;

    const texts = Array.from(el.shadowRoot?.querySelectorAll('span') || []).map(s => s.textContent);
    expect(texts).to.contain('✓ Yes');
  });

  it('renders missing wet weight warning message', async () => {
    const missingPlant = {
      ...mockPlant,
      attributes: {
        ...mockPlant.attributes,
        drying_weight: 50,
        weight_lost_pct: null,
        days_to_target: null,
      },
    };
    const el = await fixture<PlantDryingTab>(html`
      <plant-drying-tab .plant=${missingPlant}></plant-drying-tab>
    `);
    (el as any).store = mockStore;
    await el.updateComplete;

    const warning = el.shadowRoot?.textContent;
    expect(warning).to.contain('Set wet weight in the Harvest tab to enable projections.');
  });

  it('initializes visual tag input in willUpdate when plant changes', async () => {
    const el = await fixture<PlantDryingTab>(html`
      <plant-drying-tab .plant=${mockPlant}></plant-drying-tab>
    `);
    (el as any).store = mockStore;
    await el.updateComplete;

    expect(el['_visualTagInput']).to.equal('Blue Velcro');

    const newPlant = {
      ...mockPlant,
      attributes: {
        ...mockPlant.attributes,
        visual_tag: 'Red Tape',
      },
    };

    el.plant = newPlant;
    await el.updateComplete;

    expect(el['_visualTagInput']).to.equal('Red Tape');
  });

  it('handles empty visual tag when visual_tag is missing or null', async () => {
    const emptyPlant = {
      ...mockPlant,
      attributes: {
        ...mockPlant.attributes,
        visual_tag: null,
      },
    };
    const el = await fixture<PlantDryingTab>(html`
      <plant-drying-tab .plant=${emptyPlant}></plant-drying-tab>
    `);
    await el.updateComplete;

    expect(el['_visualTagInput']).to.equal('');
  });

  it('updates visual tag state on text input', async () => {
    const el = await fixture<PlantDryingTab>(html`
      <plant-drying-tab .plant=${mockPlant}></plant-drying-tab>
    `);
    await el.updateComplete;

    const input = el.shadowRoot?.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input).to.exist;

    input.value = 'Green Ribbon';
    input.dispatchEvent(new InputEvent('input'));
    await el.updateComplete;

    expect(el['_visualTagInput']).to.equal('Green Ribbon');
  });

  it('saves visual tag when save button is clicked', async () => {
    const el = await fixture<PlantDryingTab>(html`
      <plant-drying-tab .plant=${mockPlant}></plant-drying-tab>
    `);
    (el as any).store = mockStore;
    await el.updateComplete;

    el['_visualTagInput'] = 'Orange Tape ';
    await el.updateComplete;

    const saveButton = el.shadowRoot?.querySelector('button') as HTMLButtonElement;
    expect(saveButton).to.exist;

    saveButton.click();
    expect(el['_savingTag']).to.be.true;

    await el.updateComplete;
    await vi.waitFor(() => !el['_savingTag']);

    expect(mockStore.actions.plant.setVisualTag).toHaveBeenCalledWith('p123', 'Orange Tape');
  });

  it('saves null visual tag when input is empty or whitespace only', async () => {
    const el = await fixture<PlantDryingTab>(html`
      <plant-drying-tab .plant=${mockPlant}></plant-drying-tab>
    `);
    (el as any).store = mockStore;
    await el.updateComplete;

    el['_visualTagInput'] = '   ';
    await el.updateComplete;

    const saveButton = el.shadowRoot?.querySelector('button') as HTMLButtonElement;
    saveButton.click();

    await el.updateComplete;
    await vi.waitFor(() => !el['_savingTag']);

    expect(mockStore.actions.plant.setVisualTag).toHaveBeenCalledWith('p123', null);
  });

  it('updates weight input and date state on input', async () => {
    const el = await fixture<PlantDryingTab>(html`
      <plant-drying-tab .plant=${mockPlant}></plant-drying-tab>
    `);
    await el.updateComplete;

    const numberInput = el.shadowRoot?.querySelector('input[type="number"]') as HTMLInputElement;
    const dateInput = el.shadowRoot?.querySelector('input[type="date"]') as HTMLInputElement;

    expect(numberInput).to.exist;
    expect(dateInput).to.exist;

    numberInput.value = '42.5';
    numberInput.dispatchEvent(new InputEvent('input'));

    dateInput.value = '2026-05-19';
    dateInput.dispatchEvent(new InputEvent('input'));

    await el.updateComplete;

    expect(el['_weightInput']).to.equal('42.5');
    expect(el['_weightDate']).to.equal('2026-05-19');
  });

  it('logs weight correctly when log weight button is clicked', async () => {
    const el = await fixture<PlantDryingTab>(html`
      <plant-drying-tab .plant=${mockPlant}></plant-drying-tab>
    `);
    (el as any).store = mockStore;
    await el.updateComplete;

    el['_weightInput'] = '35.6';
    el['_weightDate'] = '2026-05-20';
    await el.updateComplete;

    const buttons = el.shadowRoot?.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    // The second button is "Log weight"
    const logWeightBtn = Array.from(buttons).find(b => b.textContent?.trim() === 'Log weight') as HTMLButtonElement;
    expect(logWeightBtn).to.exist;

    logWeightBtn.click();
    expect(el['_savingWeight']).to.be.true;

    await el.updateComplete;
    await vi.waitFor(() => !el['_savingWeight']);

    expect(mockStore.actions.plant.logDryingWeight).toHaveBeenCalledWith('p123', 35.6, '2026-05-20');
    expect(el['_weightInput']).to.equal('');
    expect(el['_weightDate']).to.equal('');
  });

  it('logs weight with undefined date when date is not set', async () => {
    const el = await fixture<PlantDryingTab>(html`
      <plant-drying-tab .plant=${mockPlant}></plant-drying-tab>
    `);
    (el as any).store = mockStore;
    await el.updateComplete;

    el['_weightInput'] = '35.6';
    el['_weightDate'] = '';
    await el.updateComplete;

    const buttons = el.shadowRoot?.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const logWeightBtn = Array.from(buttons).find(b => b.textContent?.trim() === 'Log weight') as HTMLButtonElement;

    logWeightBtn.click();
    await el.updateComplete;
    await vi.waitFor(() => !el['_savingWeight']);

    expect(mockStore.actions.plant.logDryingWeight).toHaveBeenCalledWith('p123', 35.6, undefined);
  });

  it('does not log weight if weight input is not a number', async () => {
    const el = await fixture<PlantDryingTab>(html`
      <plant-drying-tab .plant=${mockPlant}></plant-drying-tab>
    `);
    (el as any).store = mockStore;
    await el.updateComplete;

    el['_weightInput'] = 'invalid-number';
    await el.updateComplete;

    await (el as any)._logWeight();

    expect(mockStore.actions.plant.logDryingWeight).not.toHaveBeenCalled();
  });

  it('updates moisture input and moisture date state on input', async () => {
    const el = await fixture<PlantDryingTab>(html`
      <plant-drying-tab .plant=${mockPlant}></plant-drying-tab>
    `);
    await el.updateComplete;

    const numberInput = el.shadowRoot?.querySelector('input[placeholder="Moisture (%)"]') as HTMLInputElement;
    const dateInputs = el.shadowRoot?.querySelectorAll('input[type="date"]') as NodeListOf<HTMLInputElement>;
    const dateInput = dateInputs[1];

    expect(numberInput).to.exist;
    expect(dateInput).to.exist;

    numberInput.value = '55.8';
    numberInput.dispatchEvent(new InputEvent('input'));

    dateInput.value = '2026-05-21';
    dateInput.dispatchEvent(new InputEvent('input'));

    await el.updateComplete;

    expect(el['_moistureInput']).to.equal('55.8');
    expect(el['_moistureDate']).to.equal('2026-05-21');
  });

  it('logs moisture correctly when log moisture button is clicked', async () => {
    const el = await fixture<PlantDryingTab>(html`
      <plant-drying-tab .plant=${mockPlant}></plant-drying-tab>
    `);
    (el as any).store = mockStore;
    await el.updateComplete;

    el['_moistureInput'] = '55.8';
    el['_moistureDate'] = '2026-05-21';
    await el.updateComplete;

    const buttons = el.shadowRoot?.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const logMoistureBtn = Array.from(buttons).find(b => b.textContent?.trim() === 'Log moisture') as HTMLButtonElement;
    expect(logMoistureBtn).to.exist;

    logMoistureBtn.click();
    expect(el['_savingMoisture']).to.be.true;

    await el.updateComplete;
    await vi.waitFor(() => !el['_savingMoisture']);

    expect(mockStore.actions.plant.logMoistureReading).toHaveBeenCalledWith('p123', 55.8, '2026-05-21');
    expect(el['_moistureInput']).to.equal('');
    expect(el['_moistureDate']).to.equal('');
  });

  it('logs moisture with undefined date when date is not set', async () => {
    const el = await fixture<PlantDryingTab>(html`
      <plant-drying-tab .plant=${mockPlant}></plant-drying-tab>
    `);
    (el as any).store = mockStore;
    await el.updateComplete;

    el['_moistureInput'] = '55.8';
    el['_moistureDate'] = '';
    await el.updateComplete;

    const buttons = el.shadowRoot?.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const logMoistureBtn = Array.from(buttons).find(b => b.textContent?.trim() === 'Log moisture') as HTMLButtonElement;

    logMoistureBtn.click();
    await el.updateComplete;
    await vi.waitFor(() => !el['_savingMoisture']);

    expect(mockStore.actions.plant.logMoistureReading).toHaveBeenCalledWith('p123', 55.8, undefined);
  });

  it('does not log moisture if moisture input is not a number', async () => {
    const el = await fixture<PlantDryingTab>(html`
      <plant-drying-tab .plant=${mockPlant}></plant-drying-tab>
    `);
    (el as any).store = mockStore;
    await el.updateComplete;

    el['_moistureInput'] = 'invalid-pct';
    await el.updateComplete;

    await (el as any)._logMoisture();

    expect(mockStore.actions.plant.logMoistureReading).not.toHaveBeenCalled();
  });

  describe('_plantId extraction', () => {
    it('uses plant_id from attributes first', async () => {
      const el = await fixture<PlantDryingTab>(html`
        <plant-drying-tab .plant=${mockPlant}></plant-drying-tab>
      `);
      expect((el as any)._plantId()).to.equal('p123');
    });

    it('falls back to entity_id without "sensor." prefix if plant_id is not in attributes', async () => {
      const plantWithoutId = {
        entity_id: 'sensor.plant_xyz',
        attributes: {},
      } as any;
      const el = await fixture<PlantDryingTab>(html`
        <plant-drying-tab .plant=${plantWithoutId}></plant-drying-tab>
      `);
      expect((el as any)._plantId()).to.equal('plant_xyz');
    });

    it('falls back to full entity_id if not starting with "sensor."', async () => {
      const plantWithoutId = {
        entity_id: 'plant.xyz',
        attributes: {},
      } as any;
      const el = await fixture<PlantDryingTab>(html`
        <plant-drying-tab .plant=${plantWithoutId}></plant-drying-tab>
      `);
      expect((el as any)._plantId()).to.equal('plant.xyz');
    });

    it('returns empty string if plant is not defined or attributes are empty', async () => {
      const el = await fixture<PlantDryingTab>(html`
        <plant-drying-tab></plant-drying-tab>
      `);
      expect((el as any)._plantId()).to.equal('');
    });
  });
});
