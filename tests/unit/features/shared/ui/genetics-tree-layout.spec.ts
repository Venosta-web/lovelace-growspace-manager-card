import { describe, it, expect } from 'vitest';
import {
  layoutTopDown,
  layoutRadial,
  ancestorsOf,
  descendantsOf,
  motherLineOf,
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

      // p1 and p2 should be rank 0 (ancestors)
      // f1 should be rank 1
      // f2 should be rank 2
      expect(result.nodes['p1'].rank).toBe(0);
      expect(result.nodes['p2'].rank).toBe(0);
      expect(result.nodes['f1'].rank).toBe(1);
      expect(result.nodes['f2'].rank).toBe(2);

      // Higher rank (most derived) should have smaller Y in top-down layout?
      // Wait, let's check implementation:
      // const y = (maxRank - r) * (NODE_H + ROW_GAP);
      // maxRank is 2. 
      // f2 (rank 2) => y = (2-2)*gap = 0
      // f1 (rank 1) => y = (2-1)*gap = 206
      // p1 (rank 0) => y = (2-0)*gap = 412
      expect(result.nodes['f2'].y).toBe(0);
      expect(result.nodes['f1'].y).toBeGreaterThan(0);
      expect(result.nodes['p1'].y).toBeGreaterThan(result.nodes['f1'].y);

      expect(result.edges).toHaveLength(3); // p1->f1, p2->f1, f1->f2
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

  describe('layoutRadial', () => {
    it('should return empty result for empty nodes', () => {
      const result = layoutRadial([], 'any');
      expect(result.nodes).toEqual({});
    });

    it('should place focal node at center', () => {
      const result = layoutRadial(mockNodes, 'f1');
      const focal = result.nodes['f1'];
      // cx=0, cy=0, so x = 0 - 100 = -100, y = 0 - 38 = -38
      expect(focal.x).toBe(-100);
      expect(focal.y).toBe(-38);
    });

    it('should place ancestors and descendants in rings', () => {
      const result = layoutRadial(mockNodes, 'f1');
      // f1 is center. p1, p2, f2 are at distance 280
      const dist = (id: string) => {
        const n = result.nodes[id];
        const dx = (n.x + 100);
        const dy = (n.y + 38);
        return Math.sqrt(dx * dx + dy * dy);
      };

      expect(dist('p1')).toBeCloseTo(280, 0);
      expect(dist('p2')).toBeCloseTo(280, 0);
      expect(dist('f2')).toBeCloseTo(280, 0);
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
