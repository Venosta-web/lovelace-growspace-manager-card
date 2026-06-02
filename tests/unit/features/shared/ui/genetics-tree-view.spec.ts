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
  },
  {
    id: 'p3',
    name: 'Father Only',
    strain: 'Strain 3',
    breeder: 'Breeder 1',
    pheno: 'P3',
    gen: 'P1',
    type: 'strain',
    parents: { mother: null, father: 'p1' }
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
    expect(nodes?.length).toBe(6);
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
    // f2 and f3 hidden; p3 still visible (parent is p1, not f1)
    expect(nodes?.length).toBe(4);

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

  it('should navigate to father via detail panel father link', async () => {
    // f1 has mother: p1 and father: p2 — father link is the second .detail-parent
    element['_selectedId'] = 'f1';
    await element.updateComplete;

    const detailParents = Array.from(
      element.shadowRoot?.querySelectorAll('.detail-panel .detail-parent') ?? []
    ) as HTMLElement[];
    const fatherLink = detailParents[1];
    expect(fatherLink).not.toBeUndefined();
    fatherLink.click();
    await element.updateComplete;

    expect(element['_selectedId']).toBe('p2');
  });

  it('should navigate to offspring via detail panel offspring link', async () => {
    // p1 has no parents but is the mother of f1 — only offspring section renders
    element['_selectedId'] = 'p1';
    await element.updateComplete;

    const offspringLink = element.shadowRoot?.querySelector('.detail-panel .detail-parent') as HTMLElement;
    expect(offspringLink).not.toBeNull();
    offspringLink.click();
    await element.updateComplete;

    expect(element['_selectedId']).toBe('f1');
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

    const fitBtn = element.shadowRoot?.querySelector('.zoom-controls button[title="Fit to screen"]') as HTMLElement;
    expect(fitBtn).not.toBeNull();
    element['_panX'] = 999;
    fitBtn.click();
    await element.updateComplete;
    expect(element['_panX']).not.toBe(999);
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

  it('should clear focus when clicking shell background while focalId is set', async () => {
    element['_focalId'] = 'f1';
    element['_mode'] = 'lineage';
    await element.updateComplete;

    const bgGrid = element.shadowRoot?.querySelector('.bg-grid') as HTMLElement;
    bgGrid.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await element.updateComplete;

    expect(element['_focalId']).toBeNull();
    expect(element['_mode']).toBe('tree');
  });

  it('should reset mode, focalId, and userHasInteracted when switching back to tree mode', async () => {
    element['_mode'] = 'lineage';
    element['_focalId'] = 'f1';
    element['_userHasInteracted'] = true;
    await element.updateComplete;

    const treeBtn = element.shadowRoot?.querySelector('.seg button:nth-child(1)') as HTMLElement;
    treeBtn.click();
    await element.updateComplete;

    expect(element['_mode']).toBe('tree');
    expect(element['_focalId']).toBeNull();
    expect(element['_userHasInteracted']).toBe(false);
  });

  it('should set and clear _hoverId on mouseenter and mouseleave', async () => {
    const node = element.shadowRoot?.querySelector('.tree-node') as HTMLElement;
    const nodeId = element['_computed']?.nodes
      ? Object.keys(element['_computed'].nodes)[0]
      : element.nodes[0].id;

    node.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    await element.updateComplete;
    expect(element['_hoverId']).toBe(nodeId);

    node.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    await element.updateComplete;
    expect(element['_hoverId']).toBeNull();
  });

  it('should dispatch open-strain-editor event when Open in Library is clicked', async () => {
    element.libraryKeys = new Set(['f1']);
    element['_selectedId'] = 'f1';
    await element.updateComplete;

    const events: CustomEvent[] = [];
    element.addEventListener('open-strain-editor', (e) => events.push(e as CustomEvent));

    const libraryBtn = element.shadowRoot?.querySelector('.detail-actions .pill-btn:not(.active)') as HTMLElement;
    expect(libraryBtn).not.toBeNull();
    libraryBtn.click();

    expect(events).toHaveLength(1);
    expect(events[0].detail.id).toBe('f1');
  });

  it('should pan to clicked position on minimap', async () => {
    await element.updateComplete;

    const minimap = element.shadowRoot?.querySelector('.minimap') as SVGElement;
    expect(minimap).not.toBeNull();
    vi.spyOn(minimap, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 120, height: 80,
      bottom: 80, right: 120, x: 0, y: 0, toJSON: () => {},
    });

    const before = { panX: element['_panX'], panY: element['_panY'] };
    minimap.dispatchEvent(new MouseEvent('click', { clientX: 60, clientY: 40, bubbles: true }));
    await element.updateComplete;

    expect(element['_panX']).not.toBe(before.panX);
    expect(element['_userHasInteracted']).toBe(true);
  });

  it('should ignore non-left-button mousedown on shell', async () => {
    const shell = element.shadowRoot?.querySelector('.shell') as HTMLElement;
    shell.dispatchEvent(new MouseEvent('mousedown', { button: 2, bubbles: true }));
    expect(element['_dragging']).toBeNull();
  });

  it('should ignore mousemove when not dragging', async () => {
    element['_dragging'] = null;
    const before = element['_panX'];
    element['_onMouseMove'](new MouseEvent('mousemove', { clientX: 200, clientY: 200 }));
    expect(element['_panX']).toBe(before);
  });

  it('should not deselect when shell click target is inside a tree-node', async () => {
    element['_selectedId'] = 'f1';
    await element.updateComplete;

    const node = element.shadowRoot?.querySelector('.tree-node') as HTMLElement;
    node.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await element.updateComplete;

    // Shell click guard fires — selectedId is changed by _onNodeClick, not cleared
    expect(element['_selectedId']).not.toBeNull();
  });

  it('should not deselect when shell click follows a pan', async () => {
    element['_selectedId'] = 'f1';
    element['_didPan'] = true;
    await element.updateComplete;

    const bgGrid = element.shadowRoot?.querySelector('.bg-grid') as HTMLElement;
    bgGrid.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await element.updateComplete;

    expect(element['_selectedId']).toBe('f1');
  });

  it('should omit father link when selected node has no father', async () => {
    // f2 has mother=f1, father=null — only mother link should render
    element['_selectedId'] = 'f2';
    await element.updateComplete;

    const detailParents = element.shadowRoot?.querySelectorAll('.detail-panel .detail-parent');
    const roles = Array.from(detailParents ?? []).map((el) => el.querySelector('.role')?.textContent);
    expect(roles).not.toContain('Father');
    expect(roles).toContain('Mother');
  });

  it('should omit mother link when selected node has no mother', async () => {
    // p3 has mother=null, father=p1 — only father link should render
    element['_selectedId'] = 'p3';
    await element.updateComplete;

    const detailParents = element.shadowRoot?.querySelectorAll('.detail-panel .detail-parent');
    const roles = Array.from(detailParents ?? []).map((el) => el.querySelector('.role')?.textContent);
    expect(roles).not.toContain('Mother');
    expect(roles).toContain('Father');
  });

  it('should omit offspring section when selected node has no children', async () => {
    // f3 is a leaf node with no children
    element['_selectedId'] = 'f3';
    await element.updateComplete;

    const sections = Array.from(
      element.shadowRoot?.querySelectorAll('.detail-panel .detail-section-label') ?? []
    ).map((el) => el.textContent?.trim());
    expect(sections).not.toContain('Offspring');
  });

  it('should show overflow count when node has more than 5 children', async () => {
    const manyKidsNodes: TreeNode[] = [
      { id: 'root', name: 'Root', strain: 'S', breeder: 'B', pheno: 'P1', gen: 'P1', type: 'strain', parents: { mother: null, father: null } },
      ...Array.from({ length: 6 }, (_, i) => ({
        id: `k${i}`,
        name: `Kid ${i}`,
        strain: 'S',
        breeder: 'B',
        pheno: 'F1',
        gen: 'F1',
        type: 'batch' as const,
        parents: { mother: 'root', father: null },
      })),
    ];

    const el = await fixture<GeneticsTreeView>(html`
      <genetics-tree-view .nodes=${manyKidsNodes}></genetics-tree-view>
    `);
    el['_viewW'] = 1000;
    el['_viewH'] = 800;
    el['_selectedId'] = 'root';
    await el.updateComplete;

    const label = el.shadowRoot?.querySelector('.detail-section-label');
    expect(label?.textContent).toContain('+1 more');
  });
});
