import { describe, it, expect, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { GrowspaceGridUI } from '../../../../../src/features/plants/components/growspace-grid-ui';
import type { GridCellData } from '../../../../../src/features/plants/viewmodels/growspace-grid.viewmodel';
import type { PlantEntity } from '../../../../../src/types';
import { GridOverlayMode } from '../../../../../src/features/environment/constants';

// Register if not already
if (!customElements.get('growspace-grid-ui')) {
  customElements.define('growspace-grid-ui', GrowspaceGridUI);
}

describe('growspace-grid-ui', () => {
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

  const createCells = (count: number): GridCellData[] => {
    return Array.from({ length: count }, (_, i) => ({
      row: Math.floor(i / 3) + 1,
      col: (i % 3) + 1,
      plant: i === 0 ? defaultPlant : null,
      overlayColor: '',
    }));
  };

  it('renders loading skeletons', async () => {
    const el = await fixture<GrowspaceGridUI>(html`
      <growspace-grid-ui .rows=${2} .cols=${2} .isLoading=${true}></growspace-grid-ui>
    `);
    
    const skeletons = el.shadowRoot?.querySelectorAll('.skeleton-card');
    expect(skeletons?.length).to.equal(4); // 2x2 grid
  });

  it('renders correct number of cells (empty and filled)', async () => {
    const cells = createCells(4); // 1 filled, 3 empty
    const el = await fixture<GrowspaceGridUI>(html`
      <growspace-grid-ui .rows=${2} .cols=${2} .cells=${cells}></growspace-grid-ui>
    `);
    
    const emptySlots = el.shadowRoot?.querySelectorAll('.plant-card-empty');
    const plantCards = el.shadowRoot?.querySelectorAll('.grid-item-wrapper');
    
    expect(emptySlots?.length).to.equal(3);
    expect(plantCards?.length).to.equal(1);
  });

  it('renders overlays when overlay mode is not NONE', async () => {
    const cells = [{
      row: 1,
      col: 1,
      plant: defaultPlant,
      overlayColor: 'rgba(255, 0, 0, 0.5)'
    }];
    
    const el = await fixture<GrowspaceGridUI>(html`
      <growspace-grid-ui .cells=${cells} .overlayMode=${GridOverlayMode.STRAINS}></growspace-grid-ui>
    `);
    
    const overlay = el.shadowRoot?.querySelector('.grid-overlay') as HTMLElement;
    expect(overlay).to.exist;
    expect(overlay.style.backgroundColor).to.include('rgba(255, 0, 0, 0.5)');
  });

  describe('Events', () => {
    it('emits empty-slot-click when empty slot is clicked', async () => {
      const cells = createCells(1); // just one empty
      cells[0].plant = null;
      
      const el = await fixture<GrowspaceGridUI>(html`
        <growspace-grid-ui .cells=${cells}></growspace-grid-ui>
      `);
      
      let payload: any = null;
      el.addEventListener('empty-slot-click', (e: any) => { payload = e.detail; });
      
      const emptySlot = el.shadowRoot?.querySelector('.plant-card-empty') as HTMLElement;
      emptySlot.click();
      
      expect(payload).to.deep.equal({ row: 1, col: 1 });
    });

    it('emits grid-drop on empty slot drop', async () => {
      const cells = createCells(1);
      cells[0].plant = null;
      
      const el = await fixture<GrowspaceGridUI>(html`
        <growspace-grid-ui .cells=${cells}></growspace-grid-ui>
      `);
      
      let payload: any = null;
      el.addEventListener('grid-drop', (e: any) => { payload = e.detail; });
      
      const emptySlot = el.shadowRoot?.querySelector('.plant-card-empty') as HTMLElement;
      emptySlot.dispatchEvent(new Event('drop'));
      
      expect(payload.targetRow).to.equal(1);
      expect(payload.targetCol).to.equal(1);
      expect(payload.targetPlant).to.be.null;
    });

    it('emits plant-drag-start and grid-drop when plant card container dragged and dropped', async () => {
      const cells = createCells(1); // filled
      const el = await fixture<GrowspaceGridUI>(html`
        <growspace-grid-ui .cells=${cells}></growspace-grid-ui>
      `);
      
      let dragPayload: any = null;
      let dropPayload: any = null;
      el.addEventListener('plant-drag-start', (e: any) => { dragPayload = e.detail; });
      el.addEventListener('grid-drop', (e: any) => { dropPayload = e.detail; });
      
      const plantContainer = el.shadowRoot?.querySelector('plant-card-container') as any;
      
      // Simulate events emitted by the child
      plantContainer.dispatchEvent(new CustomEvent('plant-drag-start', { detail: { plant: defaultPlant }}));
      expect(dragPayload.plant).to.deep.equal(defaultPlant);
      
      // Now drop it on the same container
      plantContainer.dispatchEvent(new CustomEvent('plant-drop', { detail: { originalEvent: new Event('drop') }}));
      
      expect(dropPayload.targetRow).to.equal(1);
      expect(dropPayload.targetCol).to.equal(1);
      expect(dropPayload.targetPlant).to.deep.equal(defaultPlant);
      // The dragged plant was stored correctly internally
      expect(dropPayload.draggedPlant).to.deep.equal(defaultPlant);
    });

    it('forwards mobile drop events', async () => {
      const el = await fixture<GrowspaceGridUI>(html`
        <growspace-grid-ui></growspace-grid-ui>
      `);
      
      let payload: any = null;
      el.addEventListener('grid-mobile-drop', (e: any) => { payload = e.detail; });
      
      const grid = el.shadowRoot?.querySelector('.grid') as HTMLElement;
      grid.dispatchEvent(new CustomEvent('mobile-drop', {
        detail: { x: 10, y: 10, plant: defaultPlant }
      }));
      
      expect(payload.x).to.equal(10);
      expect(payload.plant).to.deep.equal(defaultPlant);
    });

    it('forwards cell click events', async () => {
      const cells = createCells(1);
      const el = await fixture<GrowspaceGridUI>(html`
        <growspace-grid-ui .cells=${cells}></growspace-grid-ui>
      `);
      
      let payload: any = null;
      el.addEventListener('cell-click', (e: any) => { payload = e.detail; });
      
      const plantContainer = el.shadowRoot?.querySelector('plant-card-container') as any;
      plantContainer.dispatchEvent(new CustomEvent('plant-click'));
      
      expect(payload.cell).to.deep.equal(cells[0]);
    });
    
    it('sets drag properties correctly on dragover', async () => {
      const el = await fixture<GrowspaceGridUI>(html`
        <growspace-grid-ui></growspace-grid-ui>
      `);
      
      const grid = el.shadowRoot?.querySelector('.grid') as HTMLElement;
      
      // We manually create a mock dataTransfer since DataTransfer is not constructible in Node
      const pd = { dropEffect: 'none' };
      const dragOverEvent = new Event('dragover', { cancelable: true }) as any;
      dragOverEvent.dataTransfer = pd;
      
      grid.dispatchEvent(dragOverEvent);
      expect(dragOverEvent.defaultPrevented).to.be.true;
      expect(dragOverEvent.dataTransfer.dropEffect).to.equal('move');
    });
  });
});
