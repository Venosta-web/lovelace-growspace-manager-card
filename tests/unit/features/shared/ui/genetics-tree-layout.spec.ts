import { describe, it, expect } from 'vitest';
import {
  layoutTopDown,
  layoutSubgraph,
  layoutBreederGrouped,
  ancestorsOf,
  descendantsOf,
  motherLineOf,
  NODE_W,
  NODE_H,
  type TreeNode
} from '../../../../../src/features/shared/ui/genetics-tree-layout';

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
    breeder: 'Breeder 1',
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
    name: 'Grandchild F2',
    strain: 'Hybrid 1',
    breeder: 'Breeder 1',
    pheno: 'F2',
    gen: 'F2',
    type: 'batch',
    parents: { mother: 'f1', father: null }
  }
];

describe('genetics-tree-layout', () => {
  describe('layoutTopDown', () => {
    it('should return empty result for empty nodes', () => {
      const result = layoutTopDown([]);
      expect(result.nodes).toEqual({});
      expect(result.edges).toEqual([]);
    });

    it('should calculate ranks and positions correctly', () => {
      const result = layoutTopDown(mockNodes);

      expect(result.nodes['p1'].rank).toBe(0);
      expect(result.nodes['p2'].rank).toBe(0);
      expect(result.nodes['f1'].rank).toBe(1);
      expect(result.nodes['f2'].rank).toBe(2);

      // Most-derived node (f2, rank 2) sits at y=0 (top of canvas)
      // y = (maxRank - rank) * (NODE_H + ROW_GAP)
      expect(result.nodes['f2'].y).toBe(0);
      expect(result.nodes['f1'].y).toBeGreaterThan(0);
      expect(result.nodes['p1'].y).toBeGreaterThan(result.nodes['f1'].y);

      expect(result.edges).toHaveLength(3); // p1→f1, p2→f1, f1→f2
      expect(result.bands).toBeDefined();
      expect(result.bands!.length).toBeGreaterThan(0);

      // Node dimensions should use compact constants
      expect(result.nodes['f1'].w).toBe(NODE_W);
      expect(result.nodes['f1'].h).toBe(NODE_H);
    });

    it('should handle cycles gracefully', () => {
      const cyclicNodes: TreeNode[] = [
        {
          id: 'a', name: 'A', strain: 'S', breeder: 'B', pheno: 'P', gen: 'F1', type: 'batch',
          parents: { mother: 'b', father: null }
        },
        {
          id: 'b', name: 'B', strain: 'S', breeder: 'B', pheno: 'P', gen: 'F1', type: 'batch',
          parents: { mother: 'a', father: null }
        }
      ];
      const result = layoutTopDown(cyclicNodes);
      expect(Object.keys(result.nodes)).toHaveLength(2);
    });
  });

  describe('layoutSubgraph', () => {
    it('should return full layout when focalId is unknown', () => {
      const result = layoutSubgraph(mockNodes, 'non-existent');
      expect(Object.keys(result.nodes)).toHaveLength(4);
    });

    it('should include only focal + ancestors + descendants', () => {
      const result = layoutSubgraph(mockNodes, 'f1');
      // f1 focal, p1+p2 ancestors, f2 descendant
      expect(Object.keys(result.nodes)).toHaveLength(4);
      expect(result.nodes['f1']).toBeDefined();
      expect(result.nodes['p1']).toBeDefined();
      expect(result.nodes['f2']).toBeDefined();
    });

    it('should re-center on the focal node', () => {
      const result = layoutSubgraph(mockNodes, 'f1');
      const focal = result.nodes['f1'];
      // After centering, focal midpoint should be near 0,0
      expect(focal.x + focal.w / 2).toBeCloseTo(0, 0);
      expect(focal.y + focal.h / 2).toBeCloseTo(0, 0);
    });
  });

  describe('layoutBreederGrouped', () => {
    it('should group nodes by breeder into bands', () => {
      const result = layoutBreederGrouped(mockNodes);
      expect(result.bands).toBeDefined();
      // All mockNodes share breeder 'Breeder 1'
      expect(result.bands!.length).toBe(1);
      expect(result.bands![0].label).toBe('Breeder 1');
      expect(result.bands![0].count).toBe(4);
    });

    it('should produce multiple bands for multiple breeders', () => {
      const multiBreeder: TreeNode[] = [
        ...mockNodes,
        {
          id: 'x1', name: 'X1', strain: 'X', breeder: 'Other', pheno: '',
          gen: 'F1', type: 'strain', parents: { mother: null, father: null }
        }
      ];
      const result = layoutBreederGrouped(multiBreeder);
      expect(result.bands!.length).toBe(2);
    });

    it('should assign positions to all nodes', () => {
      const result = layoutBreederGrouped(mockNodes);
      for (const id of ['p1', 'p2', 'f1', 'f2']) {
        expect(result.nodes[id]).toBeDefined();
        expect(result.nodes[id].w).toBe(NODE_W);
      }
    });
  });

  describe('Graph Utils', () => {
    it('ancestorsOf should find all parents recursively', () => {
      const anc = ancestorsOf(mockNodes, 'f2');
      expect(anc).toContain('f1');
      expect(anc).toContain('p1');
      expect(anc).toContain('p2');
      expect(anc).not.toContain('f2');
    });

    it('descendantsOf should find all children recursively', () => {
      const desc = descendantsOf(mockNodes, 'p1');
      expect(desc).toContain('f1');
      expect(desc).toContain('f2');
    });

    it('motherLineOf should find only mothers', () => {
      const ml = motherLineOf(mockNodes, 'f2');
      expect(ml).toContain('f1');
      expect(ml).toContain('p1');
      expect(ml).not.toContain('p2'); // father of f1
    });
  });
});
