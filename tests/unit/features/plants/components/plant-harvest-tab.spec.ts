import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { ContextProvider } from '@lit/context';
import { storeContext } from '../../../../../src/context';
import { PlantHarvestTab } from '../../../../../src/features/plants/components/plant-harvest-tab';
import type { PlantEntity } from '../../../../../src/types';

if (!customElements.get('plant-harvest-tab')) {
  customElements.define('plant-harvest-tab', PlantHarvestTab);
}

describe('PlantHarvestTab', () => {
  let element: PlantHarvestTab;
  let mockStore: any;
  let mockPlant: PlantEntity;

  beforeEach(async () => {
    mockStore = {
      actions: {
        plant: {
          saveHarvestMetrics: vi.fn().mockResolvedValue(undefined),
          scorePhenotype: vi.fn().mockResolvedValue(undefined),
        },
      },
    };

    mockPlant = {
      entity_id: 'plant.test',
      state: 'flowering',
      attributes: {
        plant_id: 'p123',
        friendly_name: 'Test Plant',
        harvest_metrics: {
          wet_weight: 100,
          dry_weight: null,
          trim_weight: null,
          thc_percentage: null,
          cbd_percentage: null,
          terpene_profile: '',
        },
        phenotype_score: {
          vigor: 4,
          internodal_spacing: null,
          terpene_intensity: null,
          resin: null,
          mold_resistance: null,
        },
      },
    } as any;

    new ContextProvider(document.body, storeContext, mockStore);

    element = await fixture<PlantHarvestTab>(html`
      <plant-harvest-tab .plant=${mockPlant}></plant-harvest-tab>
    `);
  });

  afterEach(() => {
    // Cleanup if needed
  });

  it('renders correctly with initial data', () => {
    expect(element).toBeDefined();
    const inputs = element.shadowRoot?.querySelectorAll('input');
    expect(inputs?.length).toBe(5); // wet, dry, trim, thc, cbd

    const textarea = element.shadowRoot?.querySelector('textarea');
    expect(textarea).toBeDefined();
    expect(textarea?.value).toBe('');

    // Check scores
    const scoreRows = element.shadowRoot?.querySelectorAll('div[style*="flex-direction:column; gap:6px;"]');
    expect(scoreRows?.length).toBe(5);
    
    const vigorScore = scoreRows?.[0].querySelector('span[style*="text-align:right;"]')?.textContent?.trim();
    expect(vigorScore).toBe('4 / 5');
  });

  it('updates harvest metrics on input', async () => {
    const wetInput = element.shadowRoot?.querySelector('input[placeholder*="e.g. 120"]') as HTMLInputElement;
    wetInput.value = '150';
    wetInput.dispatchEvent(new InputEvent('input'));

    expect((element as any)._harvestMetricsEdit.wet_weight).toBe(150);

    const dryInput = element.shadowRoot?.querySelector('input[placeholder*="e.g. 28"]') as HTMLInputElement;
    dryInput.value = '35.5';
    dryInput.dispatchEvent(new InputEvent('input'));
    expect((element as any)._harvestMetricsEdit.dry_weight).toBe(35.5);

    const trimInput = element.shadowRoot?.querySelector('input[placeholder*="e.g. 5"]') as HTMLInputElement;
    trimInput.value = '';
    trimInput.dispatchEvent(new InputEvent('input'));
    expect((element as any)._harvestMetricsEdit.trim_weight).toBeNull();
  });

  it('updates lab results on input', async () => {
    const thcInput = element.shadowRoot?.querySelector('input[placeholder*="e.g. 24.5"]') as HTMLInputElement;
    thcInput.value = '25.5';
    thcInput.dispatchEvent(new InputEvent('input'));
    expect((element as any)._harvestMetricsEdit.thc_percentage).toBe(25.5);

    const cbdInput = element.shadowRoot?.querySelector('input[placeholder*="e.g. 0.3"]') as HTMLInputElement;
    cbdInput.value = '1.2';
    cbdInput.dispatchEvent(new InputEvent('input'));
    expect((element as any)._harvestMetricsEdit.cbd_percentage).toBe(1.2);

    const terpeneInput = element.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement;
    terpeneInput.value = 'fruity, gas';
    terpeneInput.dispatchEvent(new InputEvent('input'));
    expect((element as any)._harvestMetricsEdit.terpene_profile).toBe('fruity, gas');
  });

  it('toggles scores on star click', async () => {
    const scoreRows = element.shadowRoot?.querySelectorAll('div[style*="flex-direction:column; gap:6px;"]');
    const structureRow = scoreRows?.[1]; // Internodal spacing / Structure
    const stars = structureRow?.querySelectorAll('button');
    
    // Set to 3
    stars?.[2].click();
    expect((element as any)._scoresEdit.internodal_spacing).toBe(3);

    // Click same star to toggle off
    stars?.[2].click();
    expect((element as any)._scoresEdit.internodal_spacing).toBeNull();

    // Click another star
    stars?.[4].click(); // Set to 5
    expect((element as any)._scoresEdit.internodal_spacing).toBe(5);
  });

  it('updates star preview on mouseenter/mouseleave', async () => {
    const scoreRows = element.shadowRoot?.querySelectorAll('div[style*="flex-direction:column; gap:6px;"]');
    const resinRow = scoreRows?.[3];
    const stars = resinRow?.querySelectorAll('button');

    // Mouseenter on 4th star
    stars?.[3].dispatchEvent(new MouseEvent('mouseenter'));
    expect((element as any)._starPreview.resin).toBe(4);

    // Mouseleave
    stars?.[3].dispatchEvent(new MouseEvent('mouseleave'));
    expect((element as any)._starPreview.resin).toBeNull();
  });

  it('dispatches harvest-advance on skip click', async () => {
    const skipBtn = element.shadowRoot?.querySelector('button.outlined') as HTMLButtonElement;
    
    let eventDetail: any = null;
    element.addEventListener('harvest-advance', (e: any) => {
      eventDetail = e.detail;
    });

    // Default state 'flowering' -> action 'harvest'
    skipBtn.click();
    expect(eventDetail.action).toBe('harvest');

    // Change plant state to 'drying'
    element.plant = { ...mockPlant, state: 'drying' } as any;
    await element.updateComplete;
    
    skipBtn.click();
    expect(eventDetail.action).toBe('finish-drying');
  });

  it('calls store actions and dispatches harvest-saved on save click', async () => {
    const saveBtn = element.shadowRoot?.querySelector('button.filled') as HTMLButtonElement;
    
    let savedCalled = false;
    element.addEventListener('harvest-saved', () => {
      savedCalled = true;
    });

    (element as any).store = mockStore;

    // Directly calling the private method to await it, as click() won't wait for the async handler
    await (element as any)._saveHarvestMetrics();
    
    expect(mockStore.actions.plant.saveHarvestMetrics).toHaveBeenCalledWith('p123', expect.any(Object));
    expect(mockStore.actions.plant.scorePhenotype).toHaveBeenCalledWith('p123', expect.any(Object));
    expect(savedCalled).toBe(true);
    expect((element as any)._savingHarvest).toBe(false);
  });

  it('handles error during save', async () => {
    mockStore.actions.plant.saveHarvestMetrics.mockRejectedValue(new Error('Failed'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    (element as any).store = mockStore;
    await (element as any)._saveHarvestMetrics();

    expect(consoleSpy).toHaveBeenCalledWith('Failed to save harvest metrics', expect.any(Error));
    expect((element as any)._savingHarvest).toBe(false);
    
    consoleSpy.mockRestore();
  });

  it('does not allow actions while saving', async () => {
    (element as any)._savingHarvest = true;
    await element.updateComplete;

    const skipBtn = element.shadowRoot?.querySelector('button.outlined') as HTMLButtonElement;
    const saveBtn = element.shadowRoot?.querySelector('button.filled') as HTMLButtonElement;
    const inputs = element.shadowRoot?.querySelectorAll('input');
    const stars = element.shadowRoot?.querySelectorAll('button[aria-label*="Set"]');

    expect(skipBtn.disabled).toBe(true);
    expect(saveBtn.disabled).toBe(true);
    inputs?.forEach(input => expect(input.disabled).toBe(true));
    stars?.forEach(star => expect((star as HTMLButtonElement).disabled).toBe(true));
  });
});
