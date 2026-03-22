import { describe, it, expect, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { PlantCardUI } from '../../../../../src/features/plants/components/plant-card-ui';
import type { PlantEntity, PlantDisplayData } from '../../../../../src/types';
import type { PlantStatusIndicators } from '../../../../../src/features/plants/viewmodels/plant-card.viewmodel';

if (!customElements.get('plant-card-ui')) {
  customElements.define('plant-card-ui', PlantCardUI);
}

describe('plant-card-ui', () => {
  const defaultPlant: PlantEntity = {
    entity_id: 'plant.test1',
    state: 'veg',
    attributes: {
      friendly_name: 'Test Plant',
      strain: 'Test Strain',
      last_training_technique: 'Topping',
      last_ipm_type: 'Foliar',
      problem: 'Yellow leaves',
      plant_id: 'plant_test1',
      growspace_id: 'gs1',
      generation: 1,
      species: 'Cannabis',
      planted_at: '2026-01-01T00:00:00Z',
    },
    context: { id: '1', parent_id: null, user_id: 'user1' },
    last_changed: '2026-01-01T00:00:00Z',
    last_reported: '2026-01-01T00:00:00Z',
    last_updated: '2026-01-01T00:00:00Z',
  };

  const defaultDisplay: PlantDisplayData = {
    strainName: 'Test Strain',
    pheno: 'Pheno 1',
    stageColor: '#00ff00',
    imageUrl: 'test.png',
    imageCropMeta: { x: 0, y: 0, scale: 1 },
    stages: [],
  };

  const defaultStatus: PlantStatusIndicators = {
    hasTraining: false,
    hasIPM: false,
    isRecentlyWatered: false,
    hasProblem: false,
    hasGrowthDeviation: false,
    hasRecommendedPreset: false,
  };

  it('renders nothing when minimum props not provided', async () => {
    const el = await fixture<PlantCardUI>(html`<plant-card-ui></plant-card-ui>`);
    expect(el.shadowRoot?.innerHTML).to.include('<!---->');
  });

  it('renders correctly with required data', async () => {
    const el = await fixture<PlantCardUI>(html`
      <plant-card-ui
        .plant=${defaultPlant}
        .displayData=${defaultDisplay}
        .statusIndicators=${defaultStatus}
      ></plant-card-ui>
    `);
    
    expect(el.shadowRoot?.querySelector('.plant-card-rich')).to.exist;
    expect(el.shadowRoot?.querySelector('.pc-strain-name')?.textContent).to.equal('Test Strain');
    expect(el.shadowRoot?.querySelector('.pc-pheno')?.textContent).to.equal('Pheno 1');
  });

  it('handles focus method delegation', async () => {
    const el = await fixture<PlantCardUI>(html`
      <plant-card-ui
        .plant=${defaultPlant}
        .displayData=${defaultDisplay}
        .statusIndicators=${defaultStatus}
      ></plant-card-ui>
    `);
    
    const cardEl = el.shadowRoot?.querySelector('.plant-card-rich') as HTMLElement;
    let focusCalled = false;
    cardEl.focus = () => { focusCalled = true; };
    
    el.focus();
    expect(focusCalled).to.be.true;
  });

  describe('Background Rendering', () => {
    it('generates correct srcset for webp images', async () => {
      const displayData = { ...defaultDisplay, imageUrl: 'image.webp' };
      const el = await fixture<PlantCardUI>(html`
        <plant-card-ui
          .plant=${defaultPlant}
          .displayData=${displayData}
          .statusIndicators=${defaultStatus}
        ></plant-card-ui>
      `);
      
      const img = el.shadowRoot?.querySelector('img.plant-card-bg') as HTMLImageElement;
      expect(img).to.exist;
      expect(img.srcset).to.include('image_small.webp 320w');
      expect(img.srcset).to.include('image.webp 1024w');
    });

    it('omits background image when imageUrl is not provided', async () => {
      const displayData = { ...defaultDisplay, imageUrl: undefined };
      const el = await fixture<PlantCardUI>(html`
        <plant-card-ui
          .plant=${defaultPlant}
          .displayData=${displayData}
          .statusIndicators=${defaultStatus}
        ></plant-card-ui>
      `);
      
      const img = el.shadowRoot?.querySelector('img.plant-card-bg');
      expect(img).to.not.exist;
    });
  });

  describe('Status Icons', () => {
    it('renders training icon when indicates training', async () => {
      const status = { ...defaultStatus, hasTraining: true };
      const el = await fixture<PlantCardUI>(html`
        <plant-card-ui
          .plant=${defaultPlant}
          .displayData=${defaultDisplay}
          .statusIndicators=${status}
        ></plant-card-ui>
      `);
      expect(el.shadowRoot?.querySelector('.status-icon.training')).to.exist;
    });

    it('renders IPM icon when indicates IPM', async () => {
      const status = { ...defaultStatus, hasIPM: true };
      const el = await fixture<PlantCardUI>(html`
        <plant-card-ui
          .plant=${defaultPlant}
          .displayData=${defaultDisplay}
          .statusIndicators=${status}
        ></plant-card-ui>
      `);
      expect(el.shadowRoot?.querySelector('.status-icon.ipm')).to.exist;
    });

    it('renders watering icon when indicates recently watered', async () => {
      const status = { ...defaultStatus, isRecentlyWatered: true };
      const el = await fixture<PlantCardUI>(html`
        <plant-card-ui
          .plant=${defaultPlant}
          .displayData=${defaultDisplay}
          .statusIndicators=${status}
        ></plant-card-ui>
      `);
      expect(el.shadowRoot?.querySelector('.status-icon.watering')).to.exist;
    });

    it('renders problem icon when indicates problem', async () => {
      const status = { ...defaultStatus, hasProblem: true };
      const el = await fixture<PlantCardUI>(html`
        <plant-card-ui
          .plant=${defaultPlant}
          .displayData=${defaultDisplay}
          .statusIndicators=${status}
        ></plant-card-ui>
      `);
      expect(el.shadowRoot?.querySelector('.status-icon.problem')).to.exist;
    });

    it('renders growth deviation icon (ahead)', async () => {
      const status = { ...defaultStatus, hasGrowthDeviation: true };
      const el = await fixture<PlantCardUI>(html`
        <plant-card-ui
          .plant=${defaultPlant}
          .displayData=${defaultDisplay}
          .statusIndicators=${status}
          .growthDeviation=${10}
        ></plant-card-ui>
      `);
      expect(el.shadowRoot?.querySelector('.status-icon.deviation.ahead')).to.exist;
    });
    
    it('renders growth deviation icon (behind)', async () => {
      const status = { ...defaultStatus, hasGrowthDeviation: true };
      const el = await fixture<PlantCardUI>(html`
        <plant-card-ui
          .plant=${defaultPlant}
          .displayData=${defaultDisplay}
          .statusIndicators=${status}
          .growthDeviation=${-10}
        ></plant-card-ui>
      `);
      expect(el.shadowRoot?.querySelector('.status-icon.deviation.behind')).to.exist;
    });
    
    it('renders recommended preset star', async () => {
      const status = { ...defaultStatus, hasRecommendedPreset: true };
      const el = await fixture<PlantCardUI>(html`
        <plant-card-ui
          .plant=${defaultPlant}
          .displayData=${defaultDisplay}
          .statusIndicators=${status}
        ></plant-card-ui>
      `);
      const htmlContent = el.shadowRoot?.innerHTML || '';
      expect(htmlContent.includes('Nutrient Preset Recommended')).to.be.true;
    });
  });

  describe('Edit Mode & Selection', () => {
    it('renders checkbox in edit mode', async () => {
      const el = await fixture<PlantCardUI>(html`
        <plant-card-ui
          .plant=${defaultPlant}
          .displayData=${defaultDisplay}
          .statusIndicators=${defaultStatus}
          .isEditMode=${true}
        ></plant-card-ui>
      `);
      expect(el.shadowRoot?.querySelector('.plant-card-checkbox')).to.exist;
      expect(el.shadowRoot?.querySelector('.plant-card-checkbox.selected')).to.not.exist;
    });

    it('renders selected state for checkbox', async () => {
      const el = await fixture<PlantCardUI>(html`
        <plant-card-ui
          .plant=${defaultPlant}
          .displayData=${defaultDisplay}
          .statusIndicators=${defaultStatus}
          .isEditMode=${true}
          .isSelected=${true}
        ></plant-card-ui>
      `);
      expect(el.shadowRoot?.querySelector('.plant-card-checkbox.selected')).to.exist;
    });
  });

  describe('Events', () => {
    it('emits plant-click on card click', async () => {
      const el = await fixture<PlantCardUI>(html`
        <plant-card-ui
          .plant=${defaultPlant}
          .displayData=${defaultDisplay}
          .statusIndicators=${defaultStatus}
        ></plant-card-ui>
      `);
      
      let eventPayload: any = null;
      let hapticCalled = false;
      el.addEventListener('plant-click', (e: any) => { eventPayload = e.detail; });
      el.addEventListener('haptic', () => { hapticCalled = true; });
      
      const card = el.shadowRoot?.querySelector('.plant-card-rich') as HTMLElement;
      card.click();
      
      expect(eventPayload?.plant).to.deep.equal(defaultPlant);
      expect(hapticCalled).to.be.true;
    });

    it('emits plant-toggle-selection on checkbox click', async () => {
      const el = await fixture<PlantCardUI>(html`
        <plant-card-ui
          .plant=${defaultPlant}
          .displayData=${defaultDisplay}
          .statusIndicators=${defaultStatus}
          .isEditMode=${true}
        ></plant-card-ui>
      `);
      
      let eventPayload: any = null;
      let hapticCalled = false;
      el.addEventListener('plant-toggle-selection', (e: any) => { eventPayload = e.detail; });
      el.addEventListener('haptic', () => { hapticCalled = true; });
      
      const checkbox = el.shadowRoot?.querySelector('.plant-card-checkbox') as HTMLElement;
      checkbox.click();
      
      expect(eventPayload?.plant).to.deep.equal(defaultPlant);
      expect(hapticCalled).to.be.true;
    });

    it('triggers click on Enter keydown', async () => {
      const el = await fixture<PlantCardUI>(html`
        <plant-card-ui
          .plant=${defaultPlant}
          .displayData=${defaultDisplay}
          .statusIndicators=${defaultStatus}
        ></plant-card-ui>
      `);
      
      let clicked = false;
      el.addEventListener('plant-click', () => { clicked = true; });
      
      const card = el.shadowRoot?.querySelector('.plant-card-rich') as HTMLElement;
      card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      
      expect(clicked).to.be.true;
    });

    it('triggers checkbox toggle on Enter keydown', async () => {
      const el = await fixture<PlantCardUI>(html`
        <plant-card-ui
          .plant=${defaultPlant}
          .displayData=${defaultDisplay}
          .statusIndicators=${defaultStatus}
          .isEditMode=${true}
        ></plant-card-ui>
      `);
      
      let toggled = false;
      el.addEventListener('plant-toggle-selection', () => { toggled = true; });
      
      const checkbox = el.shadowRoot?.querySelector('.plant-card-checkbox') as HTMLElement;
      checkbox.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); // Space bar
      
      expect(toggled).to.be.true;
    });
  });
});
