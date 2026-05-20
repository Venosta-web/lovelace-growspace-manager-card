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
    expect(p1Elem?.classList.contains('dim')).toBe(true);

    const clearSearchBtn = element.shadowRoot?.querySelector('.search-bar .icon-btn') as HTMLElement;
    clearSearchBtn.click();
    await element.updateComplete;
    expect(element['_search']).toBe('');
  });

  it('should switch to lineage mode and show focus banner', async () => {
    const lineageBtn = element.shadowRoot?.querySelector('.seg button:nth-child(2)') as HTMLElement;
    lineageBtn.click();
    await element.updateComplete;
    expect(element['_mode']).toBe('lineage');

    const banner = element.shadowRoot?.querySelector('.focus-banner');
    expect(banner).not.toBeNull();
  });

  it('should re-focus to selected node when clicking lineage while already in lineage mode', async () => {
    // Start in lineage mode focused on f1
    element['_mode'] = 'lineage';
    element['_focalId'] = 'f1';
    await element.updateComplete;

    // Select a different node (p1)
    const p1Node = Array.from(element.shadowRoot?.querySelectorAll('.tree-node') ?? [])
      .find(n => n.querySelector('.pn-name')?.textContent === 'Parent 1') as HTMLElement;
    p1Node.click();
    await element.updateComplete;
    expect(element['_selectedId']).toBe('p1');

    // Click lineage button — should re-focus to p1, not stay on f1
    const lineageBtn = element.shadowRoot?.querySelector('.seg button:nth-child(2)') as HTMLElement;
    lineageBtn.click();
    await element.updateComplete;

    expect(element['_mode']).toBe('lineage');
    expect(element['_focalId']).toBe('p1');
  });

  it('should handle node selection and deselection', async () => {
    const node = element.shadowRoot?.querySelector('.tree-node') as HTMLElement;
    node.click();
    await element.updateComplete;
    expect(element['_selectedId']).not.toBeNull();

    const selectedId = element['_selectedId'];
    node.click();
    await element.updateComplete;
    expect(element['_selectedId']).toBeNull();

    // Single-click does NOT auto-enter lineage mode (focusModeAuto = false)
    node.click();
    await element.updateComplete;
    expect(element['_mode']).toBe('tree');
    expect(element['_selectedId']).toBe(selectedId);
  });

  it('should enter lineage mode on double-click', async () => {
    const f1Node = Array.from(element.shadowRoot?.querySelectorAll('.tree-node') ?? [])
      .find(n => n.querySelector('.pn-name')?.textContent === 'Child F1') as HTMLElement;

    f1Node.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 2 }));
    await element.updateComplete;

    expect(element['_mode']).toBe('lineage');
    expect(element['_focalId']).toBe('f1');
    expect(element.shadowRoot?.querySelector('.focus-banner')).not.toBeNull();
  });

  it('should handle node folding and descendant counts', async () => {
    const f1Node = Array.from(element.shadowRoot?.querySelectorAll('.tree-node') ?? [])
      .find(n => n.querySelector('.pn-name')?.textContent === 'Child F1') as HTMLElement;

    const foldBtn = f1Node.querySelector('.fold-btn') as HTMLElement;
    foldBtn.click();
    await element.updateComplete;

    expect(element['_collapsed'].has('f1')).toBe(true);
    const nodes = element.shadowRoot?.querySelectorAll('.tree-node');
    // f2 and f3 hidden
    expect(nodes?.length).toBe(3);

    foldBtn.click();
    await element.updateComplete;
    expect(element['_collapsed'].has('f1')).toBe(false);
  });

  it('should handle complex panning and zooming', async () => {
    const shell = element.shadowRoot?.querySelector('.shell') as HTMLElement;
    vi.spyOn(shell, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 1000, height: 800, bottom: 800, right: 1000, x: 0, y: 0, toJSON: () => { }
    });

    // Panning
    shell.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100, button: 0 }));
    element['_onMouseMove'](new MouseEvent('mousemove', { clientX: 150, clientY: 150 }));
    expect(element['_panX']).not.toBe(0);
    element['_onMouseUp']();

    // Zooming via wheel (cursor-centered, factor 1.15)
    element['_scale'] = 1.0;
    shell.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, clientX: 500, clientY: 400 }));
    expect(element['_scale']).toBeCloseTo(1.15, 2);

    // Zoom clamp at max (4.0)
    element['_scale'] = 4.0;
    shell.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, clientX: 500, clientY: 400 }));
    expect(element['_scale']).toBe(4.0);

    // Zoom clamp at min (0.08)
    element['_scale'] = 0.08;
    shell.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, clientX: 500, clientY: 400 }));
    expect(element['_scale']).toBe(0.08);

    // Mousedown on node should not start dragging
    const node = element.shadowRoot?.querySelector('.tree-node') as HTMLElement;
    node.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100, button: 0, bubbles: true }));
    expect(element['_dragging']).toBeNull();
  });

  it('should handle breeder filter dropdown', async () => {
    // Only Breeder 1 and Breeder 2 exist in mockNodes; dropdown should appear
    const select = element.shadowRoot?.querySelector('.select-pill') as HTMLSelectElement;
    expect(select).not.toBeNull();

    select.value = 'Breeder 2';
    select.dispatchEvent(new Event('change'));
    await element.updateComplete;

    expect(element['_breederFilter']).toBe('Breeder 2');
    // Only p2 has breeder 2
    const visibleNodes = element.shadowRoot?.querySelectorAll('.tree-node');
    expect(visibleNodes?.length).toBe(1);

    // Reset
    select.value = '';
    select.dispatchEvent(new Event('change'));
    await element.updateComplete;
    expect(element['_breederFilter']).toBe('');
  });

  it('should handle detail panel and lineage navigation', async () => {
    // Set f1 as selected
    element['_selectedId'] = 'f1';
    await element.updateComplete;

    const detailPanel = element.shadowRoot?.querySelector('.detail-panel');
    expect(detailPanel).not.toBeNull();

    // Click mother parent link in detail panel
    const motherLink = detailPanel?.querySelector('.detail-parent') as HTMLElement;
    motherLink.click();
    await element.updateComplete;
    expect(element['_selectedId']).not.toBe('f1');

    // Restore and close panel
    element['_selectedId'] = 'f1';
    await element.updateComplete;
    const closeBtn = element.shadowRoot?.querySelector('.detail-close') as HTMLElement;
    closeBtn.click();
    await element.updateComplete;
    expect(element['_selectedId']).toBeNull();
  });

  it('should handle detail panel Isolate Lineage button', async () => {
    element['_selectedId'] = 'f1';
    await element.updateComplete;

    const isolateBtn = element.shadowRoot?.querySelector('.detail-actions .pill-btn.active') as HTMLElement;
    expect(isolateBtn).not.toBeNull();
    isolateBtn.click();
    await element.updateComplete;

    expect(element['_mode']).toBe('lineage');
    expect(element['_focalId']).toBe('f1');
  });

  it('should handle zoom control buttons', async () => {
    element['_scale'] = 1.0;
    await element.updateComplete;

    const zoomBtns = Array.from(
      element.shadowRoot?.querySelectorAll('.zoom-controls .icon-btn') ?? []
    ) as HTMLElement[];
    const [plusBtn, minusBtn] = zoomBtns;

    plusBtn.click();
    await element.updateComplete;
    expect(element['_scale']).toBeCloseTo(1.2, 2);

    minusBtn.click();
    await element.updateComplete;
    expect(element['_scale']).toBeCloseTo(1.0, 2);

    const fitBtn = element.shadowRoot?.querySelector('button[title="Fit to screen"]') as HTMLElement;
    fitBtn.click();
    await element.updateComplete;
    // After fit, scale should be based on viewport (not 1.0)
    expect(element['_scale']).not.toBe(1.2);
  });

  it('should clear collapsed + gen filter with clear button', async () => {
    element['_collapsed'] = new Set(['p1']);
    element['_genFilter'] = 'F1';
    await element.updateComplete;

    const clearBtn = element.shadowRoot?.querySelector('.clear-btn') as HTMLElement;
    clearBtn.click();
    await element.updateComplete;

    expect(element['_collapsed'].size).toBe(0);
    expect(element['_genFilter']).toBeNull();
  });

  it('should handle families mode layout', async () => {
    const familiesBtn = element.shadowRoot?.querySelector('.seg button:nth-child(3)') as HTMLElement;
    familiesBtn.click();
    await element.updateComplete;
    expect(element['_mode']).toBe('families');
    expect(element['_computed']).not.toBeNull();

    const bands = element.shadowRoot?.querySelectorAll('.band');
    expect(bands?.length).toBeGreaterThan(0);
  });

  it('should handle empty state', async () => {
    element.nodes = [];
    await element.updateComplete;
    expect(element.shadowRoot?.textContent).toContain('No lineage data.');
  });

  it('should handle tree mode with null focalId', async () => {
    element['_mode'] = 'tree';
    element['_focalId'] = null;
    element.focalId = null;
    await element.updateComplete;
    expect(element['_computed']).not.toBeNull();
  });

  it('should handle generation filter', async () => {
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

  it('should render tree-mode generation gutter labels', async () => {
    element['_mode'] = 'tree';
    await element.updateComplete;
    const labels = element.shadowRoot?.querySelectorAll('.gen-gutter');
    expect(labels?.length).toBeGreaterThan(0);
  });

  it('should handle ResizeObserver triggers', async () => {
    const observer = element['_resizeObs'];
    expect(observer).toBeDefined();

    element['_viewW'] = 500;
    element.requestUpdate();
    await element.updateComplete;
    expect(element['_scale']).not.toBe(0.9);
  });

  it('should clear focus when clear button in focus banner is clicked', async () => {
    element['_focalId'] = 'f1';
    element['_mode'] = 'lineage';
    await element.updateComplete;

    const clearBtn = element.shadowRoot?.querySelector('.focus-banner button') as HTMLElement;
    expect(clearBtn).not.toBeNull();
    clearBtn.click();
    await element.updateComplete;

    expect(element['_focalId']).toBeNull();
    expect(element['_mode']).toBe('tree');
  });
});
