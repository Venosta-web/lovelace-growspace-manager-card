import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { AddPlantDialog } from '../../../src/dialogs/add-plant-dialog';
import '../../../src/dialogs/add-plant-dialog';
import { transition } from '../../../src/dialogs/add-plant-dialog-sm';
import { StrainEntry } from '../../../src/types';

if (!customElements.get('ha-dialog')) {
  class MockHaDialog extends HTMLElement {
    open = false;
  }
  customElements.define('ha-dialog', MockHaDialog);
}

// Helper: read SM from component (it's private @state)
function sm(el: AddPlantDialog) {
  return (el as any)._sm;
}

// Helper: advance wizard to a given step (requires strain to be set first)
function advanceTo(el: AddPlantDialog, step: 'step-source' | 'step-schedule') {
  if (step === 'step-source' || step === 'step-schedule') {
    (el as any)._sm = transition(sm(el), { type: 'WizardAdvanced' });
  }
  if (step === 'step-schedule') {
    (el as any)._sm = transition(sm(el), { type: 'WizardAdvanced' });
  }
}

describe('AddPlantDialog', () => {
  let element: AddPlantDialog;
  const mockStrains: StrainEntry[] = [
    { strain: 'Blue Dream', phenotype: 'Sativa Dom', key: 'bd1' },
    { strain: 'Blue Dream', phenotype: 'Indica Pheno', key: 'bd2' },
    { strain: 'OG Kush', phenotype: '', key: 'og1' },
  ];

  beforeEach(async () => {
    element = await fixture(html`<add-plant-dialog></add-plant-dialog>`);
    element.hass = {} as any;
    element.strainLibrary = mockStrains;
    element.open = true;
    await element.updateComplete;
  });

  it('should render content when open', async () => {
    const dialog = element.shadowRoot?.querySelector('ha-dialog');
    expect(dialog).toBeTruthy();
    const title = element.shadowRoot?.querySelector('.dialog-title');
    expect(title?.textContent).toBe('Add New Plant');
  });

  it('should render nothing when closed', async () => {
    element.open = false;
    await element.updateComplete;
    const container = element.shadowRoot?.querySelector('.glass-dialog-container');
    expect(container).toBeNull();
  });

  it('should show strain typeahead on step 1', async () => {
    const strainInput = element.shadowRoot?.querySelector('.strain-typeahead md3-text-input') as any;
    expect(strainInput).toBeTruthy();
    expect(strainInput.label).toBe('Strain *');
  });

  it('should populate phenotype suggestions when strain is selected', async () => {
    (element as any)._sm = transition(sm(element), {
      type: 'DraftFieldChanged',
      tab: 'add',
      field: 'strain',
      value: 'Blue Dream',
    });
    await element.updateComplete;

    const inputs = element.shadowRoot?.querySelectorAll('md3-text-input') as any;
    const phenoInput = Array.from(inputs).find((i: any) => i.label === 'Phenotype') as any;
    expect(phenoInput).toBeTruthy();
    expect(phenoInput.suggestions).toEqual(['Indica Pheno', 'Sativa Dom']);
  });

  it('should set initial state via setInitialState()', async () => {
    element.setInitialState(2, 3);
    // Row/col inputs live on step-source — advance wizard (needs strain first)
    (element as any)._sm = transition(sm(element), {
      type: 'DraftFieldChanged',
      tab: 'add',
      field: 'strain',
      value: 'Blue Dream',
    });
    advanceTo(element, 'step-source');
    await element.updateComplete;

    const rowInput = element.shadowRoot?.querySelectorAll('md3-number-input')[0] as any;
    const colInput = element.shadowRoot?.querySelectorAll('md3-number-input')[1] as any;

    expect(rowInput.value).toBe(3);
    expect(colInput.value).toBe(4);
  });

  describe('Timeline Variations', () => {
    beforeEach(async () => {
      // Navigate to step-schedule where date inputs live
      (element as any)._sm = transition(sm(element), {
        type: 'DraftFieldChanged',
        tab: 'add',
        field: 'strain',
        value: 'Blue Dream',
      });
      advanceTo(element, 'step-schedule');
      await element.updateComplete;
    });

    it('should show veg/flower inputs for standard growspace', async () => {
      element.growspaceName = 'Main Tent';
      await element.updateComplete;

      const dateInputs = element.shadowRoot?.querySelectorAll('md3-date-input');
      expect(dateInputs?.length).toBe(3);
      expect(dateInputs?.[0].getAttribute('label')).toBe('Seedling Start');
    });

    it('should show mother input for mother growspace and handle change', async () => {
      element.growspaceName = 'Mother Tent';
      await element.updateComplete;

      const dateInput = element.shadowRoot?.querySelector('md3-date-input') as any;
      expect(dateInput?.getAttribute('label')).toBe('Mother Start');

      dateInput.dispatchEvent(new CustomEvent('change', { detail: '2023-01-01' }));
      await element.updateComplete;
    });

    it('should show cure input for cure growspace and handle change', async () => {
      element.growspaceName = 'Cure Area';
      await element.updateComplete;

      const dateInput = element.shadowRoot?.querySelector('md3-date-input') as any;
      expect(dateInput?.getAttribute('label')).toBe('Cure Start');

      dateInput.dispatchEvent(new CustomEvent('change', { detail: '2023-01-01' }));
      await element.updateComplete;
    });

    it('should show clone input for clone growspace and handle change', async () => {
      element.growspaceName = 'Clone Dome';
      await element.updateComplete;

      const dateInput = element.shadowRoot?.querySelector('md3-date-input') as any;
      expect(dateInput?.getAttribute('label')).toBe('Clone Start');

      dateInput.dispatchEvent(new CustomEvent('change', { detail: '2023-01-01' }));
      await element.updateComplete;
    });

    it('should show dry input for dry growspace and handle change', async () => {
      element.growspaceName = 'Dry Tent';
      await element.updateComplete;

      const dateInput = element.shadowRoot?.querySelector('md3-date-input') as any;
      expect(dateInput?.getAttribute('label')).toBe('Dry Start');

      dateInput.dispatchEvent(new CustomEvent('change', { detail: '2023-01-01' }));
      await element.updateComplete;
    });
  });

  describe('Interaction Tests', () => {
    it('should handle Row and Col changes', async () => {
      // Advance to step-source where row/col inputs live
      (element as any)._sm = transition(sm(element), {
        type: 'DraftFieldChanged',
        tab: 'add',
        field: 'strain',
        value: 'Blue Dream',
      });
      advanceTo(element, 'step-source');
      await element.updateComplete;

      const rowInput = element.shadowRoot?.querySelectorAll('md3-number-input')[0];
      const colInput = element.shadowRoot?.querySelectorAll('md3-number-input')[1];

      rowInput?.dispatchEvent(new CustomEvent('change', { detail: '5' }));
      colInput?.dispatchEvent(new CustomEvent('change', { detail: '10' }));
      await element.updateComplete;

      expect(sm(element).tabs.add.draft.row).toBe(4);
      expect(sm(element).tabs.add.draft.col).toBe(9);
    });

    it('should dispatch close event on cancel', async () => {
      const closeSpy = vi.fn();
      element.addEventListener('close', closeSpy);

      const cancelBtn = element.shadowRoot?.querySelector('.button-group .tonal') as HTMLElement;
      cancelBtn.click();

      expect(closeSpy).toHaveBeenCalled();
    });

    it('should dispatch close event on verify close button', async () => {
      const closeSpy = vi.fn();
      element.addEventListener('close', closeSpy);

      const xBtn = element.shadowRoot?.querySelector('.dialog-header .text') as HTMLElement;
      xBtn.click();

      expect(closeSpy).toHaveBeenCalled();
    });

    it('should dispatch create-new-strain event', async () => {
      const createSpy = vi.fn();
      element.addEventListener('create-new-strain', createSpy);

      const createBtn = Array.from(
        element.shadowRoot?.querySelectorAll('button') ?? []
      ).find((b) => b.textContent?.includes('Create New Strain')) as HTMLElement;
      expect(createBtn).toBeTruthy();
      createBtn.click();

      expect(createSpy).toHaveBeenCalled();
      expect(createSpy.mock.calls[0][0].detail).toMatchObject({ source: 'add-plant' });
    });

    it('should update addToLibrary state on switch change', async () => {
      element.setInitialState(0, 0, 'Blue Dream');
      await element.updateComplete;

      const switchEl = element.shadowRoot?.querySelector('md3-switch') as any;
      expect(switchEl).toBeTruthy();
      expect(switchEl.disabled).toBe(false);

      switchEl.checked = true;
      switchEl.dispatchEvent(new Event('change'));
      await element.updateComplete;

      expect(sm(element).tabs.add.draft.addToLibrary).toBe(true);

      switchEl.checked = false;
      switchEl.dispatchEvent(new Event('change'));
      await element.updateComplete;

      expect(sm(element).tabs.add.draft.addToLibrary).toBe(false);
    });
  });

  it('should dispatch submit event with payload', async () => {
    element.setInitialState(0, 0, 'Blue Dream', 'Sativa Dom');
    (element as any)._sm = transition(sm(element), {
      type: 'DraftFieldChanged',
      tab: 'add',
      field: 'vegStart',
      value: '2023-01-01',
    });
    element.growspaceName = 'Tent';
    // Navigate to step-schedule
    advanceTo(element, 'step-schedule');
    await element.updateComplete;

    const submitSpy = vi.fn();
    element.addEventListener('add-plant-submit', submitSpy);

    const addBtn = element.shadowRoot?.querySelector('.primary') as HTMLElement;
    addBtn.click();

    expect(submitSpy).toHaveBeenCalled();
    const detail = submitSpy.mock.calls[0][0].detail;

    expect(detail).toEqual(
      expect.objectContaining({
        row: 1,
        col: 1,
        strain: 'Blue Dream',
        phenotype: 'Sativa Dom',
        veg_start: '2023-01-01',
        flower_start: '',
        mother_start: '',
        dry_start: '',
        cure_start: '',
      })
    );
  });

  it('should handle seedling and flower start date changes', async () => {
    element.growspaceName = 'Tent';
    element.setInitialState(0, 0, 'Blue Dream');
    advanceTo(element, 'step-schedule');
    await element.updateComplete;

    const seedlingInput = element.shadowRoot?.querySelector('md3-date-input[label="Seedling Start"]');
    const flowerInput = element.shadowRoot?.querySelector('md3-date-input[label="Flower Start"]');

    expect(seedlingInput).toBeTruthy();
    expect(flowerInput).toBeTruthy();

    seedlingInput?.dispatchEvent(new CustomEvent('change', { detail: '2023-01-02' }));
    flowerInput?.dispatchEvent(new CustomEvent('change', { detail: '2023-02-01' }));
    await element.updateComplete;

    const submitSpy = vi.fn();
    element.addEventListener('add-plant-submit', submitSpy);

    (element as any)._confirm();

    const detail = submitSpy.mock.calls[0][0].detail;
    expect(detail.flower_start).toBe('2023-02-01');
  });

  describe('Transplant Mode', () => {
    const mockPlants = [
      {
        entity_id: 'sensor.plant1',
        attributes: {
          plant_id: 'p1',
          strain: 'Strain A',
          phenotype: 'Pheno 1',
          col: 1,
          row: 1,
          clone_days: 10,
          seedling_days: 5,
          clone_start: '2023-01-01',
          seedling_start: '2023-01-05',
          growspace_id: 'gs_source',
        },
      },
      {
        entity_id: 'sensor.plant2',
        attributes: { plant_id: 'p2', strain: 'Strain B', col: 2, row: 2 },
      },
      {
        entity_id: 'sensor.plant3',
        attributes: { plant_id: 'p3', col: 3, row: 3 },
      },
    ] as any[];

    beforeEach(async () => {
      element.clonePlants = mockPlants;
      element.seedlingPlants = mockPlants;
      element.targetGrowspaceId = 'gs_target';
      await element.updateComplete;
    });

    it('should switch to clone tab and render clone form', async () => {
      const cloneTab = element.shadowRoot?.querySelectorAll('.tab')[1] as HTMLElement;
      cloneTab.click();
      await element.updateComplete;

      expect(sm(element).activeTab).toBe('clone');

      const select = element.shadowRoot?.querySelector('md3-select');
      expect(select).toBeTruthy();
      expect(select?.getAttribute('label')).toBe('Select Plant');

      const title = element.shadowRoot?.querySelector('.dialog-title');
      expect(title?.textContent).toBe('Transplant Clone');
    });

    it('should switch to seedling tab and render seedling form', async () => {
      const seedlingTab = element.shadowRoot?.querySelectorAll('.tab')[2] as HTMLElement;
      seedlingTab.click();
      await element.updateComplete;

      expect(sm(element).activeTab).toBe('seedling');

      const title = element.shadowRoot?.querySelector('.dialog-title');
      expect(title?.textContent).toBe('Transplant Seedling');
    });

    it('should show empty message if no plants available', async () => {
      element.clonePlants = [];
      const cloneTab = element.shadowRoot?.querySelectorAll('.tab')[1] as HTMLElement;
      cloneTab.click();
      await element.updateComplete;

      const msg = element.shadowRoot?.querySelector('p[style*="font-style: italic"]');
      expect(msg?.textContent).toContain('No clones available');
    });

    it('should select a plant and show its details', async () => {
      (element as any)._sm = transition(sm(element), { type: 'TabSelected', tab: 'clone' });
      await element.updateComplete;

      const select = element.shadowRoot?.querySelector('md3-select') as HTMLElement;
      select.dispatchEvent(new CustomEvent('change', { detail: 'p1' }));
      await element.updateComplete;

      expect(sm(element).tabs.clone.draft.selectedPlantId).toBe('p1');

      const infoValues = element.shadowRoot?.querySelectorAll('.info-value');
      expect(infoValues?.[0].textContent).toBe('Strain A');
      expect(infoValues?.[1].textContent).toBe('Pheno 1');
      expect(infoValues?.[4].textContent).toBe('2023-01-01');
    });

    it('should select a plant with minimal attributes', async () => {
      (element as any)._sm = transition(sm(element), { type: 'TabSelected', tab: 'seedling' });
      await element.updateComplete;

      const select = element.shadowRoot?.querySelector('md3-select') as HTMLElement;
      select.dispatchEvent(new CustomEvent('change', { detail: 'p2' }));
      await element.updateComplete;

      expect(sm(element).tabs.seedling.draft.selectedPlantId).toBe('p2');

      const infoValues = element.shadowRoot?.querySelectorAll('.info-value');
      expect(infoValues?.[1].textContent).toBe('N/A');
      expect(infoValues?.[4].textContent).toBe('N/A');
    });

    it('should submit transplant payload', async () => {
      (element as any)._sm = transition(sm(element), { type: 'TabSelected', tab: 'clone' });
      (element as any)._sm = transition(sm(element), {
        type: 'DraftFieldChanged',
        tab: 'clone',
        field: 'selectedPlantId',
        value: 'p1',
      });
      await element.updateComplete;

      const submitSpy = vi.fn();
      element.addEventListener('transplant-plant-submit', submitSpy);

      const btn = element.shadowRoot?.querySelector('.primary') as HTMLElement;
      expect(btn.hasAttribute('disabled')).toBe(false);
      btn.click();

      expect(submitSpy).toHaveBeenCalled();
      const detail = submitSpy.mock.calls[0][0].detail;

      expect(detail).toEqual(
        expect.objectContaining({
          plant_id: 'p1',
          source_growspace_id: 'gs_source',
          target_growspace_id: 'gs_target',
          new_row: 1,
          new_col: 1,
        })
      );
      expect(detail.veg_start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should not submit if no plant selected', async () => {
      (element as any)._sm = transition(sm(element), { type: 'TabSelected', tab: 'clone' });
      await element.updateComplete;

      const submitSpy = vi.fn();
      element.addEventListener('transplant-plant-submit', submitSpy);

      (element as any)._confirm();

      expect(submitSpy).not.toHaveBeenCalled();
    });

    it('should update state to null if wrong plant id selected', async () => {
      (element as any)._sm = transition(sm(element), { type: 'TabSelected', tab: 'clone' });
      await element.updateComplete;

      const select = element.shadowRoot?.querySelector('md3-select') as HTMLElement;
      select.dispatchEvent(new CustomEvent('change', { detail: 'non_existent' }));
      await element.updateComplete;

      expect(sm(element).tabs.clone.draft.selectedPlantId).toBeNull();
    });

    it('should handle Row/Col changes in transplant mode', async () => {
      (element as any)._sm = transition(sm(element), { type: 'TabSelected', tab: 'clone' });
      await element.updateComplete;

      const rowInput = element.shadowRoot?.querySelectorAll('md3-number-input')[0] as HTMLElement;
      const colInput = element.shadowRoot?.querySelectorAll('md3-number-input')[1] as HTMLElement;

      rowInput.dispatchEvent(new CustomEvent('change', { detail: '5' }));
      colInput.dispatchEvent(new CustomEvent('change', { detail: '6' }));
      await element.updateComplete;

      expect(sm(element).tabs.clone.draft.row).toBe(4);
      expect(sm(element).tabs.clone.draft.col).toBe(5);
    });

    it('should switch back to add tab', async () => {
      (element as any)._sm = transition(sm(element), { type: 'TabSelected', tab: 'clone' });
      await element.updateComplete;

      const addTab = element.shadowRoot?.querySelectorAll('.tab')[0] as HTMLElement;
      addTab.click();
      await element.updateComplete;

      expect(sm(element).activeTab).toBe('add');
      expect(sm(element).tabs.clone.draft.selectedPlantId).toBeNull();
    });
  });

  describe('Wizard Navigation', () => {
    it('should navigate through wizard steps via SM transitions', async () => {
      expect(sm(element).tabs.add.sub.kind).toBe('step-identity');

      // Can't advance without a strain
      (element as any)._sm = transition(sm(element), { type: 'WizardAdvanced' });
      expect(sm(element).tabs.add.sub.kind).toBe('step-identity');

      // Set strain then advance
      (element as any)._sm = transition(sm(element), {
        type: 'DraftFieldChanged',
        tab: 'add',
        field: 'strain',
        value: 'Blue Dream',
      });
      (element as any)._sm = transition(sm(element), { type: 'WizardAdvanced' });
      expect(sm(element).tabs.add.sub.kind).toBe('step-source');

      (element as any)._sm = transition(sm(element), { type: 'WizardAdvanced' });
      expect(sm(element).tabs.add.sub.kind).toBe('step-schedule');

      // No-op at last step
      (element as any)._sm = transition(sm(element), { type: 'WizardAdvanced' });
      expect(sm(element).tabs.add.sub.kind).toBe('step-schedule');

      // Back from schedule to source
      (element as any)._sm = transition(sm(element), { type: 'WizardBacked' });
      expect(sm(element).tabs.add.sub.kind).toBe('step-source');

      // Back from source to identity
      (element as any)._sm = transition(sm(element), { type: 'WizardBacked' });
      expect(sm(element).tabs.add.sub.kind).toBe('step-identity');

      // WizardBacked from identity is a no-op in SM; Cancel button fires close event
      const closeSpy = vi.fn();
      element.addEventListener('close', closeSpy);
      const cancelBtn = element.shadowRoot?.querySelector('.button-group .tonal') as HTMLElement;
      cancelBtn.click();
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('Strain Typeahead and Phenotype Inputs', () => {
    it('should update query and clear strain on input change', async () => {
      (element as any)._sm = transition(sm(element), {
        type: 'DraftFieldChanged',
        tab: 'add',
        field: 'strain',
        value: 'Blue Dream',
      });
      (element as any)._sm = transition(sm(element), {
        type: 'DraftFieldChanged',
        tab: 'add',
        field: 'strainQuery',
        value: 'Blue Dream',
      });
      await element.updateComplete;

      const input = element.shadowRoot?.querySelector(
        '.strain-typeahead md3-text-input'
      ) as HTMLElement;
      expect(input).toBeTruthy();

      input.dispatchEvent(new CustomEvent('change', { detail: 'New Query' }));
      await element.updateComplete;

      expect(sm(element).tabs.add.draft.strainQuery).toBe('New Query');
      expect(sm(element).tabs.add.draft.strain).toBe('');
    });

    it('should select strain from dropdown on click and render phenotype input', async () => {
      (element as any)._sm = transition(sm(element), {
        type: 'DraftFieldChanged',
        tab: 'add',
        field: 'strainQuery',
        value: 'Blue',
      });
      (element as any)._sm = transition(sm(element), {
        type: 'DraftFieldChanged',
        tab: 'add',
        field: 'strain',
        value: '',
      });
      await element.updateComplete;

      const option = element.shadowRoot?.querySelector(
        '.strain-dropdown .strain-option'
      ) as HTMLElement;
      expect(option).toBeTruthy();

      option.click();
      await element.updateComplete;

      expect(sm(element).tabs.add.draft.strain).toBe('Blue Dream');
      expect(sm(element).tabs.add.draft.strainQuery).toBe('Blue Dream');

      const phenoInput = element.shadowRoot?.querySelector(
        'md3-text-input[label="Phenotype"]'
      ) as HTMLElement;
      expect(phenoInput).toBeTruthy();

      phenoInput.dispatchEvent(new CustomEvent('change', { detail: 'New Pheno' }));
      await element.updateComplete;

      expect(sm(element).tabs.add.draft.phenotype).toBe('New Pheno');
    });
  });

  describe('Sibling Plants and Clone Source Picker', () => {
    const mockSiblings = [
      {
        entity_id: 'sensor.sibling1',
        state: 'veg',
        attributes: {
          plant_id: 'sib1',
          strain: 'Sour Diesel',
          phenotype: 'Pheno S',
          days_in_stage: 15,
          stage: 'veg',
        },
      },
      {
        entity_id: 'sensor.sibling2',
        state: 'flowering',
        attributes: {
          plant_id: 'sib2',
          strain: 'OG Kush',
          phenotype: 'Pheno O',
          days_in_stage: 30,
          stage: 'flowering',
        },
      },
      {
        entity_id: 'sensor.sibling3',
        state: 'harvested',
        attributes: { plant_id: 'sib3', strain: 'White Widow', stage: 'harvested' },
      },
    ] as any[];

    beforeEach(async () => {
      element.siblingPlants = mockSiblings;
      // Advance to step-source
      (element as any)._sm = transition(sm(element), {
        type: 'DraftFieldChanged',
        tab: 'add',
        field: 'strain',
        value: 'Blue Dream',
      });
      advanceTo(element, 'step-source');
      await element.updateComplete;
    });

    it('should render clonable sibling plants and handle selection/deselection', async () => {
      (element as any)._sm = transition(sm(element), {
        type: 'DraftFieldChanged',
        tab: 'add',
        field: 'sourceType',
        value: 'clone',
      });
      await element.updateComplete;

      const siblingItems = element.shadowRoot?.querySelectorAll('.sibling-item');
      expect(siblingItems?.length).toBe(2);

      (siblingItems?.[0] as HTMLElement).click();
      await element.updateComplete;

      expect(sm(element).tabs.add.draft.strain).toBe('Sour Diesel');
      expect(sm(element).tabs.add.draft.phenotype).toBe('Pheno S');
      expect(sm(element).tabs.add.draft.cloneStart).toBeTruthy();
      expect(sm(element).tabs.add.draft.siblingPlantId).not.toBeNull();

      // Click same sibling again to deselect
      (siblingItems?.[0] as HTMLElement).click();
      await element.updateComplete;

      expect(sm(element).tabs.add.draft.siblingPlantId).toBeNull();
    });

    it('should change source type between seed and clone', async () => {
      const cloneBtn = element.shadowRoot?.querySelectorAll('.source-btn')[1] as HTMLElement;
      expect(cloneBtn).toBeTruthy();
      cloneBtn.click();
      await element.updateComplete;

      expect(sm(element).tabs.add.draft.sourceType).toBe('clone');

      const siblingItems = element.shadowRoot?.querySelectorAll('.sibling-item');
      (siblingItems?.[0] as HTMLElement).click();
      await element.updateComplete;
      expect(sm(element).tabs.add.draft.siblingPlantId).not.toBeNull();

      const seedBtn = element.shadowRoot?.querySelectorAll('.source-btn')[0] as HTMLElement;
      seedBtn.click();
      await element.updateComplete;

      expect(sm(element).tabs.add.draft.sourceType).toBe('seed');
      expect(sm(element).tabs.add.draft.siblingPlantId).toBeNull();
    });
  });

  describe('Extra Date Changes', () => {
    it('should handle veg start date change', async () => {
      element.growspaceName = 'Tent';
      (element as any)._sm = transition(sm(element), {
        type: 'DraftFieldChanged',
        tab: 'add',
        field: 'strain',
        value: 'Blue Dream',
      });
      advanceTo(element, 'step-schedule');
      await element.updateComplete;

      const vegInput = element.shadowRoot?.querySelector('md3-date-input[label="Veg Start"]');
      expect(vegInput).toBeTruthy();

      vegInput?.dispatchEvent(new CustomEvent('change', { detail: '2023-01-10' }));
      await element.updateComplete;

      expect(sm(element).tabs.add.draft.vegStart).toBe('2023-01-10');
    });
  });
});
