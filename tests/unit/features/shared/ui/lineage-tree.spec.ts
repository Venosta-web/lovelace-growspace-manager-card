import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import '../../../../../src/features/shared/ui/lineage-tree';
import type { LineageTree, LineageTreeEditor } from '../../../../../src/features/shared/ui/lineage-tree';
import type { LineageNode } from '../../../../../src/features/plants/types';

const mockRootNode: LineageNode = {
  id: 'plant1',
  name: 'OG Kush',
  type: 'plant',
  sex: 'female',
  generation: 'F1',
  phenotype: 'Lemon Funk',
  parents: []
};

const mockLineageWithParents: LineageNode = {
  id: 'plant1',
  name: 'OG Kush',
  type: 'plant',
  sex: 'female',
  generation: 'F1',
  parents: [
    {
      id: 'p1',
      name: 'Chemdawg',
      type: 'strain',
      parents: []
    },
    {
      id: 'p2',
      name: 'Hindu Kush',
      type: 'strain',
      parents: []
    }
  ]
};

const mockDeepLineage: LineageNode = {
  id: 'root',
  name: 'Root',
  type: 'plant',
  parents: [
    {
      id: 'L1',
      name: 'Level 1',
      type: 'strain',
      parents: [
        {
          id: 'L2',
          name: 'Level 2',
          type: 'strain',
          parents: [
            {
              id: 'L3',
              name: 'Level 3',
              type: 'strain',
              parents: [
                {
                  id: 'L4',
                  name: 'Level 4',
                  type: 'strain',
                  parents: [
                    {
                      id: 'L5',
                      name: 'Level 5 (Hidden)',
                      type: 'strain',
                      parents: []
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

describe('LineageTree', () => {
  let element: LineageTree;

  beforeEach(async () => {
    element = await fixture(html`<lineage-tree></lineage-tree>`);
  });

  it('should render empty state when no node provided', async () => {
    element.node = null;
    await element.updateComplete;
    expect(element.shadowRoot?.textContent).toContain('No lineage data available.');
  });

  it('should render loading state', async () => {
    element.loading = true;
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('.tree-loading')).toBeDefined();
    expect(element.shadowRoot?.querySelectorAll('.skeleton').length).toBe(2);
  });

  it('should render basic node info', async () => {
    element.node = mockRootNode;
    await element.updateComplete;

    const label = element.shadowRoot?.querySelector('.node-label');
    expect(label?.textContent).toBe('OG Kush');

    const pheno = element.shadowRoot?.querySelector('.node-phenotype');
    expect(pheno?.textContent).toBe('Lemon Funk');

    const sexBadge = element.shadowRoot?.querySelector('.sex-badge');
    expect(sexBadge?.textContent).toBe('♀');
    expect((sexBadge as HTMLElement).style.color).toContain('rgb(76, 175, 80)'); // #4caf50

    const genBadge = element.shadowRoot?.querySelector('.gen-badge');
    expect(genBadge?.textContent).toBe('F1');
  });

  it('should render dual parents with cross label', async () => {
    element.node = mockLineageWithParents;
    await element.updateComplete;

    const crossLabel = element.shadowRoot?.querySelector('.cross-label');
    expect(crossLabel?.textContent).toBe('Chemdawg × Hindu Kush');

    const parentNodes = element.shadowRoot?.querySelectorAll('.parents-row .node-card');
    expect(parentNodes?.length).toBe(2);
  });

  it('should recurse up to depth 4', async () => {
    element.node = mockDeepLineage;
    await element.updateComplete;

    // Root is Level 0
    // Level 1, 2, 3, 4 should be rendered
    // Level 5 should NOT be rendered (depth < 4 check in code)

    const nodeLabels = Array.from(element.shadowRoot?.querySelectorAll('.node-label') ?? [])
      .map(el => el.textContent);

    expect(nodeLabels).toContain('Root');
    expect(nodeLabels).toContain('Level 1');
    expect(nodeLabels).toContain('Level 2');
    expect(nodeLabels).toContain('Level 3');
    expect(nodeLabels).toContain('Level 4');
    expect(nodeLabels).not.toContain('Level 5 (Hidden)');
  });

  it('should emit node-click when ancestor is clicked and clickable is true', async () => {
    element.node = mockLineageWithParents;
    element.clickable = true;
    await element.updateComplete;

    const clickSpy = vi.fn();
    element.addEventListener('node-click', clickSpy);

    // Find an ancestor node (Chemdawg)
    const chemdawgNode = Array.from(element.shadowRoot?.querySelectorAll('.node-card') ?? [])
      .find(el => el.querySelector('.node-label')?.textContent === 'Chemdawg') as HTMLElement;

    expect(chemdawgNode.classList.contains('ancestor')).toBe(true);
    chemdawgNode.click();

    expect(clickSpy).toHaveBeenCalled();
    expect(clickSpy.mock.calls[0][0].detail).toEqual({ name: 'Chemdawg' });
  });

  it('should NOT emit node-click for root node', async () => {
    element.node = mockLineageWithParents;
    element.clickable = true;
    await element.updateComplete;

    const clickSpy = vi.fn();
    element.addEventListener('node-click', clickSpy);

    // Find root node (OG Kush)
    const rootNode = Array.from(element.shadowRoot?.querySelectorAll('.node-card') ?? [])
      .find(el => el.querySelector('.node-label')?.textContent === 'OG Kush') as HTMLElement;

    expect(rootNode.classList.contains('ancestor')).toBe(false);
    rootNode.click();

    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('should NOT emit node-click when clickable is false', async () => {
    element.node = mockLineageWithParents;
    element.clickable = false;
    await element.updateComplete;

    const clickSpy = vi.fn();
    element.addEventListener('node-click', clickSpy);

    const ancestorNode = element.shadowRoot?.querySelector('.node-card.ancestor') as HTMLElement;
    ancestorNode.click();

    expect(clickSpy).not.toHaveBeenCalled();
  });
});

describe('LineageTreeEditor', () => {
  let element: LineageTreeEditor;
  const mockStrainEntries = [
    { name: 'Chemdawg', phenotype: 'Original' },
    { name: 'Hindu Kush' },
    { name: 'Sour Diesel' }
  ];

  beforeEach(async () => {
    element = await fixture(html`
      <lineage-tree-editor
        .node=${mockLineageWithParents}
        .strainEntries=${mockStrainEntries}
      ></lineage-tree-editor>
    `);
  });

  it('should render existing parents', () => {
    const parentLabels = Array.from(element.shadowRoot?.querySelectorAll('.lte-parent-name') ?? [])
      .map(el => el.textContent);

    expect(parentLabels).toContain('Chemdawg');
    expect(parentLabels).toContain('Hindu Kush');
  });

  it('should render existing parents with phenotypes', async () => {
    element.node = {
      ...mockRootNode,
      parents: [
        { id: 'p1', name: 'Parent', phenotype: 'Berry', type: 'strain', source: 'library', parents: [] }
      ]
    } as any;
    await element.updateComplete;

    const parentLabel = element.shadowRoot?.querySelector('.lte-parent-name');
    expect(parentLabel?.textContent).toBe('Parent (Berry)');
  });

  it('should remove a parent and emit lineage-change', async () => {
    const changeSpy = vi.fn();
    element.addEventListener('lineage-change', changeSpy);

    const removeBtn = element.shadowRoot?.querySelector('.lte-remove') as HTMLElement;
    removeBtn.click();

    expect(changeSpy).toHaveBeenCalled();
    const emittedParents = changeSpy.mock.calls[0][0].detail.parents;
    expect(emittedParents.length).toBe(1);
    expect(emittedParents[0].name).toBe('Hindu Kush');
  });

  it('should show "Add parent" button for empty slots', async () => {
    element.node = { ...mockRootNode, parents: [] };
    await element.updateComplete;

    const addBtns = element.shadowRoot?.querySelectorAll('.lte-add-btn');
    expect(addBtns?.length).toBe(1); // Only shows one add button at a time (first slot)
    expect(addBtns?.[0].textContent).toContain('Add parent');
  });

  it('should open autocomplete search when "Add parent" is clicked', async () => {
    element.node = { ...mockRootNode, parents: [] };
    await element.updateComplete;

    const addBtn = element.shadowRoot?.querySelector('.lte-add-btn') as HTMLElement;
    addBtn.click();
    await element.updateComplete;

    const searchInput = element.shadowRoot?.querySelector('.lte-search');
    expect(searchInput).toBeDefined();

    const suggestions = element.shadowRoot?.querySelectorAll('.lte-suggestion');
    expect(suggestions?.length).toBeGreaterThan(0);
  });

  it('should filter suggestions based on input', async () => {
    element.node = { ...mockRootNode, parents: [] };
    await element.updateComplete;

    const addBtn = element.shadowRoot?.querySelector('.lte-add-btn') as HTMLElement;
    addBtn.click();
    await element.updateComplete;

    const searchInput = element.shadowRoot?.querySelector('.lte-search') as HTMLInputElement;
    searchInput.value = 'Chem';
    searchInput.dispatchEvent(new InputEvent('input'));
    await element.updateComplete;

    const suggestions = Array.from(element.shadowRoot?.querySelectorAll('.lte-suggestion') ?? [])
      .map(el => el.textContent?.trim());

    expect(suggestions).toContain('Chemdawg (Original)');
    expect(suggestions).not.toContain('Hindu Kush');
  });

  it('should select a suggestion and emit lineage-change', async () => {
    element.node = { ...mockRootNode, parents: [] };
    await element.updateComplete;

    const addBtn = element.shadowRoot?.querySelector('.lte-add-btn') as HTMLElement;
    addBtn.click();
    await element.updateComplete;

    const changeSpy = vi.fn();
    element.addEventListener('lineage-change', changeSpy);

    const firstSuggestion = element.shadowRoot?.querySelector('.lte-suggestion') as HTMLElement;
    firstSuggestion.click();

    expect(changeSpy).toHaveBeenCalled();
    expect(changeSpy.mock.calls[0][0].detail.parents[0].name).toBe('Chemdawg');
  });

  it('should render lineage preview for library parents with lineage', async () => {
    const nodeWithLineageParent = {
      ...mockRootNode,
      parents: [
        {
          id: 'p1',
          name: 'Parent with Lineage',
          type: 'strain',
          source: 'library',
          parents: [{ id: 'gp1', name: 'Grandparent', type: 'strain', parents: [] }]
        }
      ]
    };
    element.node = nodeWithLineageParent as any;
    await element.updateComplete;

    const preview = element.shadowRoot?.querySelector('.lte-preview');
    expect(preview).toBeDefined();
    const nestedTree = preview?.querySelector('lineage-tree');
    expect(nestedTree).toBeDefined();
  });

  it('should use default name "—" when node has no name', async () => {
    element.node = { id: 'test' } as any;
    await element.updateComplete;

    const rootLabel = element.shadowRoot?.querySelector('.lte-root-label');
    expect(rootLabel?.textContent).toBe('—');
  });

  it('should default parent source to "manual" if missing', async () => {
    element.node = {
      ...mockRootNode,
      parents: [{ id: 'p1', name: 'No Source Parent', type: 'strain', parents: [] }]
    } as any;
    await element.updateComplete;

    const parentName = element.shadowRoot?.querySelector('.lte-parent-name');
    expect(parentName?.classList.contains('manual')).toBe(true);
  });

  it('should handle manual entry when no matches found', async () => {
    element.node = { ...mockRootNode, parents: [] };
    await element.updateComplete;

    const addBtn = element.shadowRoot?.querySelector('.lte-add-btn') as HTMLElement;
    addBtn.click();
    await element.updateComplete;

    const searchInput = element.shadowRoot?.querySelector('.lte-search') as HTMLInputElement;
    searchInput.value = 'Mystery Strain';
    searchInput.dispatchEvent(new InputEvent('input'));
    await element.updateComplete;

    const manualSuggestion = element.shadowRoot?.querySelector('.lte-suggestion.manual') as HTMLElement;
    expect(manualSuggestion.textContent).toContain('Use "Mystery Strain"');

    const changeSpy = vi.fn();
    element.addEventListener('lineage-change', changeSpy);
    manualSuggestion.click();

    expect(changeSpy).toHaveBeenCalled();
    expect(changeSpy.mock.calls[0][0].detail.parents[0]).toEqual({
      name: 'Mystery Strain',
      phenotype: undefined,
      source: 'manual'
    });
  });

  it('should close autocomplete on Escape key and clear active slot', async () => {
    element.node = { ...mockRootNode, parents: [] };
    await element.updateComplete;

    const addBtn = element.shadowRoot?.querySelector('.lte-add-btn') as HTMLElement;
    addBtn.click();
    await element.updateComplete;

    const searchInput = element.shadowRoot?.querySelector('.lte-search') as HTMLInputElement;
    // Using a more standard way to dispatch keyboard event
    searchInput.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      composed: true
    }));
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('.lte-search')).toBeNull();
    expect(element['_activeSlot']).toBeNull();
  });
});
