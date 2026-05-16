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
    id: 'f1',
    name: 'Child F1',
    strain: 'Hybrid 1',
    breeder: 'Breeder 1',
    pheno: 'F1',
    gen: 'F1',
    type: 'batch',
    parents: { mother: 'p1', father: null }
  }
];

describe('GeneticsTreeView', () => {
  let element: GeneticsTreeView;

  beforeEach(async () => {
    element = await fixture(html`
      <genetics-tree-view .nodes=${mockNodes}></genetics-tree-view>
    `);
  });

  it('should render the component', () => {
    expect(element).toBeDefined();
    const shell = element.shadowRoot?.querySelector('.shell');
    expect(shell).toBeDefined();
  });

  it('should render nodes', () => {
    const nodes = element.shadowRoot?.querySelectorAll('.tree-node');
    expect(nodes?.length).toBe(2);
  });

  it('should filter nodes based on search', async () => {
    element['_search'] = 'Child';
    element.requestUpdate();
    await element.updateComplete;

    const p1Node = element.shadowRoot?.querySelector('.tree-node:nth-child(1)');
    const f1Node = element.shadowRoot?.querySelector('.tree-node:nth-child(2)');

    // Check if dimmed class is applied to non-matching nodes
    // Wait, the order might be different. Let's check names.
    const nodeNames = Array.from(element.shadowRoot?.querySelectorAll('.tree-node') ?? [])
      .map(n => (n as HTMLElement).querySelector('.pn-name')?.textContent);

    expect(nodeNames).toContain('Child F1');
    expect(nodeNames).toContain('Parent 1');

    // p1 should be dimmed if it doesn't match 'Child'
    const p1Elem = Array.from(element.shadowRoot?.querySelectorAll('.tree-node') ?? [])
      .find(n => n.querySelector('.pn-name')?.textContent === 'Parent 1');
    expect(p1Elem?.classList.contains('dimmed')).toBe(true);
  });

  it('should toggle layout between topdown and radial', async () => {
    const topdownBtn = element.shadowRoot?.querySelector('.layout-toggle button:nth-child(1)') as HTMLElement;
    const radialBtn = element.shadowRoot?.querySelector('.layout-toggle button:nth-child(2)') as HTMLElement;

    expect(element['_layout']).toBe('topdown');

    radialBtn.click();
    await element.updateComplete;
    expect(element['_layout']).toBe('radial');
    expect(element.focalId).toBe('p1'); // Should set focalId if switching to radial

    topdownBtn.click();
    await element.updateComplete;
    expect(element['_layout']).toBe('topdown');
  });

  it('should handle node click to select', async () => {
    const node = element.shadowRoot?.querySelector('.tree-node') as HTMLElement;
    node.click();
    await element.updateComplete;
    expect(element['_selectedId']).not.toBeNull();
  });

  it('should toggle focus mode', async () => {
    const focusBtn = element.shadowRoot?.querySelector('.pill-btn:nth-of-type(1)') as HTMLElement;
    focusBtn.click();
    await element.updateComplete;
    expect(element['_focusMode']).toBe(true);
  });
});
