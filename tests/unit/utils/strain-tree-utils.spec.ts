import { describe, it, expect } from 'vitest';
import { buildStrainTreeNodes } from '../../../src/utils/strain-tree-utils';

const makeStrain = (overrides: {
  key: string;
  strain: string;
  phenotype?: string;
  breeder?: string;
  lineage?: string;
  parents?: Array<{ name: string }>;
  image?: string;
}) => ({
  key: overrides.key,
  strain: overrides.strain,
  phenotype: overrides.phenotype ?? '',
  breeder: overrides.breeder ?? '',
  lineage: overrides.lineage,
  parents: overrides.parents,
  image: overrides.image ?? '',
  image_crop_meta: undefined,
  breeder_logo: '',
});

describe('buildStrainTreeNodes', () => {
  it('builds a simple node with no parents', () => {
    const strain = makeStrain({ key: 'og|default', strain: 'OG Kush' });
    const nodes = buildStrainTreeNodes([strain], [], [strain]);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe('og|default');
    expect(nodes[0].parents.mother).toBeNull();
    expect(nodes[0].parents.father).toBeNull();
  });

  it('resolves mother from structuredParents with only one parent (father resolves to null)', () => {
    // Covers line 42: resolve(structuredParents[1]?.name) ?? null
    // when structuredParents has only one element
    const mother = makeStrain({ key: 'skunk|default', strain: 'Skunk #1' });
    const child = makeStrain({
      key: 'child|default',
      strain: 'Child',
      parents: [{ name: 'Skunk #1' }], // only one parent — father resolves to null via ??
    });
    const nodes = buildStrainTreeNodes([mother, child], [], [child]);
    const childNode = nodes.find((n) => n.id === 'child|default');
    expect(childNode).toBeDefined();
    expect(childNode!.parents.mother).toBe('skunk|default');
    expect(childNode!.parents.father).toBeNull();
  });

  it('resolves parents from lineage string (x separator)', () => {
    // Covers line 47: mother = resolve(parts[0]) via lineage path
    const parent1 = makeStrain({ key: 'og|default', strain: 'OG Kush' });
    const parent2 = makeStrain({ key: 'bd|default', strain: 'Blue Dream' });
    const child = makeStrain({
      key: 'cross|default',
      strain: 'OG Blue',
      lineage: 'OG Kush x Blue Dream',
    });
    const nodes = buildStrainTreeNodes([parent1, parent2, child], [], [child]);
    const childNode = nodes.find((n) => n.id === 'cross|default');
    expect(childNode).toBeDefined();
    expect(childNode!.parents.mother).toBe('og|default');
    expect(childNode!.parents.father).toBe('bd|default');
  });

  it('handles seed batches (covers lines 73-81)', () => {
    const parent1 = makeStrain({ key: 'p1|default', strain: 'Parent Alpha' });
    const parent2 = makeStrain({ key: 'p2|default', strain: 'Parent Beta' });
    const batch = {
      batch_id: 'batch-001',
      strain_name: 'Batch Alpha',
      breeder: 'MyBreeder',
      quantity: 5,
      acquisition_date: '2025-01-01',
      generation: 'F1',
      parent_1_strain: 'Parent Alpha',
      parent_2_strain: 'Parent Beta',
      lineage: '',
      notes: '',
    };
    const nodes = buildStrainTreeNodes([parent1, parent2], [batch], []);
    const batchNode = nodes.find((n) => n.id === 'batch-001');
    expect(batchNode).toBeDefined();
    expect(batchNode!.type).toBe('batch');
    expect(batchNode!.gen).toBe('F1');
    expect(batchNode!.parents.mother).toBe('p1|default');
    expect(batchNode!.parents.father).toBe('p2|default');
  });

  it('handles seed batch with null parent strains (covers if-false branches on lines 73-74)', () => {
    const batch = {
      batch_id: 'batch-solo',
      strain_name: 'Solo Batch',
      breeder: '',
      quantity: 3,
      acquisition_date: '2025-01-01',
      generation: 'F2',
      parent_1_strain: null,
      parent_2_strain: null,
      lineage: '',
      notes: '',
    };
    const nodes = buildStrainTreeNodes([], [batch], []);
    const batchNode = nodes.find((n) => n.id === 'batch-solo');
    expect(batchNode).toBeDefined();
    expect(batchNode!.parents.mother).toBeNull();
    expect(batchNode!.parents.father).toBeNull();
  });

  it('resolves ancestors using lineage when ancestor has no structured parents (covers lines 102-111)', () => {
    // Grandmother has lineage only, no structured parents — triggers else-if(entry.lineage) in addAncestorById
    const grandmother = makeStrain({
      key: 'gm|default',
      strain: 'Grandmother',
      lineage: 'Ancient One x Wild Type',
    });
    const mother = makeStrain({
      key: 'mother|default',
      strain: 'Mother',
      parents: [{ name: 'Grandmother' }],
    });
    const child = makeStrain({
      key: 'child|default',
      strain: 'Child',
      parents: [{ name: 'Mother' }],
    });
    const nodes = buildStrainTreeNodes([grandmother, mother, child], [], [child]);
    const grandmotherNode = nodes.find((n) => n.id === 'gm|default');
    expect(grandmotherNode).toBeDefined();
    // Grandmother's parents should be resolved via lineage
    expect(grandmotherNode!.parents.mother).toBe('Ancient One');
    expect(grandmotherNode!.parents.father).toBe('Wild Type');
  });

  it('handles seed batch with no generation field (uses "F1" fallback)', () => {
    // Covers the `|| 'F1'` branch on the generation field (line 81)
    const batch = {
      batch_id: 'batch-no-gen',
      strain_name: 'No Gen Batch',
      breeder: '',
      quantity: 2,
      acquisition_date: '2025-01-01',
      // generation is omitted → falsy → falls back to 'F1'
      parent_1_strain: null,
      parent_2_strain: null,
      lineage: '',
      notes: '',
    };
    const nodes = buildStrainTreeNodes([], [batch as any], []);
    const batchNode = nodes.find((n) => n.id === 'batch-no-gen');
    expect(batchNode).toBeDefined();
    expect(batchNode!.gen).toBe('F1');
  });

  it('handles lineage with no valid separator (parts.length < 2)', () => {
    // Covers the false branch of `if (parts.length >= 2)` at line 47
    // A lineage with no x/X/×/* separator produces only one part
    const child = makeStrain({
      key: 'child|default',
      strain: 'Child',
      lineage: 'Standalone Lineage Only', // no separator → parts.length === 1
    });
    const nodes = buildStrainTreeNodes([child], [], [child]);
    const childNode = nodes.find((n) => n.id === 'child|default');
    expect(childNode).toBeDefined();
    // When parts.length < 2, mother and father stay null
    expect(childNode!.parents.mother).toBeNull();
    expect(childNode!.parents.father).toBeNull();
  });

  it('handles ancestor lineage with no valid separator (ancestor addAncestorById line 105)', () => {
    // The ancestor has a lineage with no separator → `parts.length < 2` in addAncestorById
    const parent = makeStrain({
      key: 'parent|default',
      strain: 'Parent',
      lineage: 'NoSeparator', // no x/X/×/* → parts.length === 1
    });
    const child = makeStrain({
      key: 'child|default',
      strain: 'Child',
      lineage: 'Parent x Unknown',
    });
    const nodes = buildStrainTreeNodes([parent, child], [], [child]);
    const parentNode = nodes.find((n) => n.id === 'parent|default');
    expect(parentNode).toBeDefined();
    // Since lineage has no separator, parents are not resolved → null
    expect(parentNode!.parents.mother).toBeNull();
    expect(parentNode!.parents.father).toBeNull();
  });

  it('adds a ghost ancestor node when ancestor is not in allStrains', () => {
    // When an ancestor referenced in lineage cannot be found in allStrains,
    // a stub node is created with type 'strain' and empty parents
    const child = makeStrain({
      key: 'child|default',
      strain: 'Child',
      lineage: 'UnknownParent x OtherUnknown',
    });
    const nodes = buildStrainTreeNodes([child], [], [child]);
    const ghostNode = nodes.find((n) => n.name === 'UnknownParent');
    expect(ghostNode).toBeDefined();
    expect(ghostNode!.parents.mother).toBeNull();
    expect(ghostNode!.parents.father).toBeNull();
  });
});
