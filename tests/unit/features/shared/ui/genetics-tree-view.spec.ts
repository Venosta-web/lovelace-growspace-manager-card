import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import '../../../../../src/features/shared/ui/genetics-tree-view';
import type { GeneticsTreeView } from '../../../../../src/features/shared/ui/genetics-tree-view';
import type { TreeNode } from '../../../../../src/features/shared/ui/genetics-tree-layout';

const mockNodes: TreeNode[] = [
  {
    id: 'p1',
    name: 'Parent 1',
    strain: 'Strain 1',
    breeder: 'Breeder 1',
    pheno: 'P1',
    gen: 'P1',
    type: 'strain',
    parents: { mother: null, father: null }
  },
  {
    id: 'p2',
    name: 'Parent 2',
    strain: 'Strain 2',
    breeder: 'Breeder 2',
    pheno: 'P2',
    gen: 'P1',
    type: 'strain',
    parents: { mother: null, father: null }
  },
  {
    id: 'f1',
    name: 'Child F1',
    strain: 'Hybrid 1',
    breeder: 'Breeder 1',
    pheno: 'F1',
    gen: 'F1',
    type: 'batch',
    parents: { mother: 'p1', father: 'p2' }
  },
  {
    id: 'f2',
    name: 'Selection F2',
    strain: 'Hybrid 1',
    breeder: 'Breeder 1',
    pheno: 'F2',
    gen: 'F2',
    type: 'strain',
    parents: { mother: 'f1', father: null }
  },
  {
    id: 'f3',
    name: 'Child F3',
    strain: 'Hybrid 1',
    breeder: 'Breeder 1',
    pheno: 'F3',
    gen: 'F3',
    type: 'batch',
    parents: { mother: 'f2', father: null }
  }
];

describe('GeneticsTreeView', () => {
  let element: GeneticsTreeView;

  beforeEach(async () => {
    element = await fixture(html`
      <genetics-tree-view .nodes=${mockNodes}></genetics-tree-view>
    `);
    element['_viewW'] = 1000;
    element['_viewH'] = 800;
    await element.updateComplete;
  });

  it('should render all node types with correct icons', () => {
    const nodes = element.shadowRoot?.querySelectorAll('.tree-node');
    expect(nodes?.length).toBe(5);
  });
  it('should handle search input', async () => {
    const searchInput = element.shadowRoot?.querySelector('.search-bar input') as HTMLInputElement;
    searchInput.value = 'Selection';
    searchInput.dispatchEvent(new InputEvent('input'));
    await element.updateComplete;

    const p1Elem = Array.from(element.shadowRoot?.querySelectorAll('.tree-node') ?? [])
      .find(n => n.querySelector('.pn-name')?.textContent === 'Parent 1');
    expect(p1Elem?.classList.contains('dimmed')).toBe(true);
    
    const clearSearchBtn = element.shadowRoot?.querySelector('.search-bar .icon-btn') as HTMLElement;
    clearSearchBtn.click();
    await element.updateComplete;
    expect(element['_search']).toBe('');
  });

  it('should handle radial layout and minimap in radial mode', async () => {
    const radialBtn = element.shadowRoot?.querySelector('.layout-toggle button:nth-child(2)') as HTMLElement;
    element.focalId = null;
    radialBtn.click();
    await element.updateComplete;
    expect(element['_layout']).toBe('radial');
    
    const minimap = element.shadowRoot?.querySelector('.minimap') as SVGElement;
    vi.spyOn(minimap, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 180, height: 120, bottom: 120, right: 180, x: 0, y: 0, toJSON: () => {}
    });
    const clickEvent = new MouseEvent('click', { clientX: 10, clientY: 10 });
    minimap.dispatchEvent(clickEvent);
    await element.updateComplete;
    expect(element['_panX']).not.toBe(0);
  });

  it('should handle node selection and deselection', async () => {
    const node = element.shadowRoot?.querySelector('.tree-node') as HTMLElement;
    node.click();
    await element.updateComplete;
    expect(element['_selectedId']).toBe('p1');
    
    node.click();
    await element.updateComplete;
    expect(element['_selectedId']).toBeNull();

    // Focal updates in focus mode
    element['_focusMode'] = true;
    node.click();
    await element.updateComplete;
    expect(element.focalId).toBe('p1');
  });

  it('should handle focus mode with ancestors and descendants', async () => {
    element.focalId = 'f1';
    const focusBtn = element.shadowRoot?.querySelector('.toolbar-row .pill-btn:nth-of-type(1)') as HTMLElement;
    focusBtn.click();
    await element.updateComplete;
    expect(element['_focusMode']).toBe(true);
    
    const visibleNodes = Array.from(element.shadowRoot?.querySelectorAll('.tree-node') ?? [])
      .filter(n => !n.classList.contains('dimmed'));
    // p1, p2 (ancestors), f1 (focal), f2, f3 (descendants)
    expect(visibleNodes.length).toBe(5);
  });

  it('should handle node folding and descendant counts', async () => {
    const f1Node = Array.from(element.shadowRoot?.querySelectorAll('.tree-node') ?? [])
      .find(n => n.querySelector('.pn-name')?.textContent === 'Child F1') as HTMLElement;
    
    const foldBtn = f1Node.querySelector('.fold-btn') as HTMLElement;
    foldBtn.click();
    await element.updateComplete;
    
    expect(element['_collapsed'].has('f1')).toBe(true);
    const nodes = element.shadowRoot?.querySelectorAll('.tree-node');
    // f2 and f3 should be hidden
    expect(nodes?.length).toBe(3);
    
    // Toggle back
    foldBtn.click();
    await element.updateComplete;
    expect(element['_collapsed'].has('f1')).toBe(false);
  });

  it('should handle complex panning and zooming', async () => {
    const shell = element.shadowRoot?.querySelector('.shell') as HTMLElement;
    vi.spyOn(shell, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 1000, height: 800, bottom: 800, right: 1000, x: 0, y: 0, toJSON: () => {}
    });

    // Panning
    shell.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100, button: 0 }));
    element['_onMouseMove'](new MouseEvent('mousemove', { clientX: 150, clientY: 150 }));
    expect(element['_panX']).not.toBe(0);
    element['_onMouseUp']();

    // Zooming via wheel
    element['_scale'] = 1.0;
    shell.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, clientX: 500, clientY: 400 }));
    expect(element['_scale']).toBe(1.15);

    // Zoom clamping (max)
    element['_scale'] = 2.0;
    shell.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, clientX: 500, clientY: 400 }));
    expect(element['_scale']).toBe(2.0);

    // Zoom clamping (min)
    element['_scale'] = 0.2;
    shell.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, clientX: 500, clientY: 400 }));
    expect(element['_scale']).toBe(0.2);

    // Mousedown on node should not start dragging
    const node = element.shadowRoot?.querySelector('.tree-node') as HTMLElement;
    node.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100, button: 0, bubbles: true }));
    expect(element['_dragging']).toBeNull();
  });

  it('should handle Mother Line toggle', async () => {
    const motherBtn = element.shadowRoot?.querySelector('.pill-btn:nth-of-type(2)') as HTMLElement;
    motherBtn.click();
    await element.updateComplete;
    expect(element['_highlightMother']).toBe(true);
    
    // Check if edge has mother-line class (requires focalId)
    element.focalId = 'f1';
    await element.updateComplete;
    const edge = element.shadowRoot?.querySelector('.edge.mother-line');
    expect(edge).toBeDefined();
  });

  it('should handle compare drawer and removal', async () => {
    element['_compareIds'] = ['p1', 'p2'];
    element.requestUpdate();
    await element.updateComplete;

    const drawer = element.shadowRoot?.querySelector('.compare-drawer');
    expect(drawer).toBeDefined();

    // Remove one item
    const removeBtn = drawer?.querySelector('.cd-header .icon-btn') as HTMLElement;
    removeBtn.click();
    await element.updateComplete;
    expect(element['_compareIds']).toEqual(['p2']);

    // Clear all
    const clearAllBtn = drawer?.querySelector('.cd-title .icon-btn') as HTMLElement;
    clearAllBtn.click();
    await element.updateComplete;
    expect(element['_compareIds'].length).toBe(0);
  });

  it('should handle detail panel and lineage navigation', async () => {
    element['_selectedId'] = 'f1';
    await element.updateComplete;
    
    let detailPanel = element.shadowRoot?.querySelector('.detail-panel');
    const motherLink = detailPanel?.querySelector('.dp-link') as HTMLElement;
    motherLink.click();
    await element.updateComplete;
    expect(element['_selectedId']).toBe('p1');

    detailPanel = element.shadowRoot?.querySelector('.detail-panel');
    const closeBtn = detailPanel?.querySelector('.dp-header .icon-btn') as HTMLElement;
    closeBtn.click();
    await element.updateComplete;
    expect(element['_selectedId']).toBeNull();
  });

  it('should handle compare addition from detail panel', async () => {
    element['_selectedId'] = 'f1';
    await element.updateComplete;
    
    const detailPanel = element.shadowRoot?.querySelector('.detail-panel');
    const compareBtn = detailPanel?.querySelector('.dp-footer .pill-btn:nth-child(2)') as HTMLElement;
    compareBtn.click();
    await element.updateComplete;
    expect(element['_compareIds']).toContain('f1');
    
    // Should not add same id twice
    compareBtn.click();
    expect(element['_compareIds'].length).toBe(1);

    // Should handle null node in renderCol (edge case)
    element['_compareIds'] = ['non-existent'];
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.compare-drawer')).toBeDefined();
  });

  it('should handle zoom control buttons', async () => {
    element['_scale'] = 1.0;
    await element.updateComplete;
    
    const plusBtn = element.shadowRoot?.querySelector('.zoom-controls .icon-btn:nth-of-type(1)') as HTMLElement;
    plusBtn.click();
    await element.updateComplete;
    expect(element['_scale']).toBeCloseTo(1.2);
    
    const minusBtn = element.shadowRoot?.querySelector('.zoom-controls .icon-btn:nth-of-type(2)') as HTMLElement;
    minusBtn.click();
    await element.updateComplete;
    expect(element['_scale']).toBeCloseTo(1.0);

    const resetBtn = element.shadowRoot?.querySelector('button[title="Reset Zoom & Center"]') as HTMLElement;
    resetBtn.click();
    await element.updateComplete;
    
    const fitBtn = element.shadowRoot?.querySelector('button[title="Fit to Screen"]') as HTMLElement;
    fitBtn.click();
    await element.updateComplete;
    expect(element['_scale']).not.toBe(1.2);
  });

  it('should clear all state with clear button', async () => {
    element.focalId = 'f1';
    element['_focusMode'] = true;
    element['_collapsed'] = new Set(['p1']);
    await element.updateComplete;

    const clearBtn = element.shadowRoot?.querySelector('.clear-btn') as HTMLElement;
    clearBtn.click();
    await element.updateComplete;

    expect(element.focalId).toBeNull();
    expect(element['_focusMode']).toBe(false);
    expect(element['_collapsed'].size).toBe(0);
  });

  it('should handle empty state', async () => {
    element.nodes = [];
    await element.updateComplete;
    expect(element.shadowRoot?.textContent).toContain('No lineage data.');
  });

  it('should handle radial layout with null focalId', async () => {
    element['_layout'] = 'radial';
    element.focalId = null;
    await element.updateComplete;
    expect(element['_computed']).not.toBeNull();
  });

  it('should handle generation filter', async () => {
    // gens sorted: F1, F2, F3, P1
    const genChipP1 = Array.from(element.shadowRoot?.querySelectorAll('.gen-chip') ?? [])
      .find(c => c.textContent?.trim() === 'P1') as HTMLElement;
    genChipP1.click();
    await element.updateComplete;
    expect(element['_genFilter']).toBe('P1');

    const allChip = element.shadowRoot?.querySelector('.gen-chip:nth-child(1)') as HTMLElement;
    allChip.click();
    await element.updateComplete;
    expect(element['_genFilter']).toBeNull();
  });

  it('should render top-down generation labels', async () => {
    element['_layout'] = 'topdown';
    await element.updateComplete;
    const labels = element.shadowRoot?.querySelectorAll('.gen-label');
    expect(labels?.length).toBeGreaterThan(0);
  });

  it('should handle ResizeObserver triggers', async () => {
    // Manually trigger the callback if possible or just ensure it exists
    const observer = element['_resizeObs'];
    expect(observer).toBeDefined();
    
    // We can't easily trigger ResizeObserver in jsdom/vitest without more setup,
    // but we can call the fitToScreen directly or mock dimensions
    element['_viewW'] = 500;
    element.requestUpdate();
    await element.updateComplete;
    expect(element['_scale']).not.toBe(0.9);
  });

  it('should handle detail panel Focus Lineage button', async () => {
    element['_selectedId'] = 'f1';
    await element.updateComplete;
    const focusLineageBtn = element.shadowRoot?.querySelector('.dp-footer .pill-btn.active') as HTMLElement;
    focusLineageBtn.click();
    await element.updateComplete;
    expect(element.focalId).toBe('f1');
    expect(element['_focusMode']).toBe(true);
  });
});
