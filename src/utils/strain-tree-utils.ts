import { StrainEntry, SeedBatch } from '../types';
import type { TreeNode } from '../features/shared/ui/genetics-tree-layout';

export function buildStrainTreeNodes(
  allStrains: StrainEntry[],
  seedBatches: SeedBatch[],
  primaryStrains: StrainEntry[]
): TreeNode[] {
  const nodes: TreeNode[] = [];
  const nodeIds = new Set<string>();
  const strainNameToKey = new Map<string, string>();

  // Build name→key lookup from ALL strains so parent references always resolve,
  // even when the primary set is filtered to a subset.
  allStrains.forEach((s) => {
    const strainLc = s.strain.toLowerCase();
    strainNameToKey.set(strainLc, s.key);
    if (s.phenotype) {
      strainNameToKey.set(`${strainLc} ${s.phenotype.toLowerCase()}`, s.key);
      strainNameToKey.set(`${strainLc}${s.phenotype.toLowerCase()}`.replace(/\s+/g, ''), s.key);
    }
  });

  const resolve = (name: string | undefined | null): string | null => {
    if (!name) return null;
    const clean = name.replace(/^["'\[\(]|["'\]\)]$/g, '').trim();
    const lower = clean.toLowerCase();
    return strainNameToKey.get(lower) || clean;
  };

  const referencedParents = new Map<string, string>(); // id -> display name

  primaryStrains.forEach((strain) => {
    let mother: string | null = null;
    let father: string | null = null;

    const structuredParents = Array.isArray(strain.parents)
      ? (strain.parents as Array<{ name: string }>)
      : null;
    if (structuredParents && structuredParents.length > 0) {
      mother = resolve(structuredParents[0]?.name);
      father = resolve(structuredParents[1]?.name) ?? null;
    } else {
      const lineage = strain.lineage?.trim();
      if (lineage) {
        const parts = lineage.split(/\s*[xX×*]\s*/);
        if (parts.length >= 2) {
          mother = resolve(parts[0]);
          father = resolve(parts[1]);
        }
      }
    }

    if (mother) referencedParents.set(mother, structuredParents?.[0]?.name ?? mother);
    if (father) referencedParents.set(father, structuredParents?.[1]?.name ?? father);

    nodes.push({
      id: strain.key,
      name: strain.strain,
      strain: strain.strain,
      breeder: strain.breeder || '',
      pheno: strain.phenotype || '',
      gen: 'P1',
      type: 'strain',
      parents: { mother, father },
    });
    nodeIds.add(strain.key);
  });

  seedBatches.forEach((batch) => {
    const mother = resolve(batch.parent_1_strain);
    const father = resolve(batch.parent_2_strain);
    if (mother) referencedParents.set(mother, batch.parent_1_strain ?? mother);
    if (father) referencedParents.set(father, batch.parent_2_strain ?? father);
    nodes.push({
      id: batch.batch_id,
      name: `${batch.strain_name} (${batch.batch_id})`,
      strain: batch.strain_name,
      breeder: batch.breeder || '',
      pheno: '',
      gen: batch.generation || 'F1',
      type: 'batch',
      parents: { mother, father },
    });
    nodeIds.add(batch.batch_id);
  });

  const allStrainsByKey = new Map(allStrains.map((s) => [s.key, s]));
  const allStrainsByName = new Map(allStrains.map((s) => [s.strain.toLowerCase(), s]));

  const addAncestorById = (id: string, displayName: string) => {
    if (nodeIds.has(id)) return;
    nodeIds.add(id);

    const entry = allStrainsByKey.get(id) ?? allStrainsByName.get(id.toLowerCase());
    if (entry) {
      let mother: string | null = null;
      let father: string | null = null;
      const sp = Array.isArray(entry.parents) ? (entry.parents as Array<{ name: string }>) : null;
      if (sp && sp.length > 0) {
        mother = resolve(sp[0]?.name);
        father = resolve(sp[1]?.name) ?? null;
      } else if (entry.lineage) {
        const parts = entry.lineage.trim().split(/\s*[xX×*]\s*/);
        if (parts.length >= 2) {
          mother = resolve(parts[0]);
          father = resolve(parts[1]);
        }
      }
      if (mother) referencedParents.set(mother, sp?.[0]?.name ?? mother);
      if (father) referencedParents.set(father, sp?.[1]?.name ?? father);
      nodes.push({
        id: entry.key,
        name: entry.strain,
        strain: entry.strain,
        breeder: entry.breeder || '',
        pheno: entry.phenotype || '',
        gen: 'P1',
        type: 'strain',
        parents: { mother, father },
      });
    } else {
      nodes.push({
        id,
        name: displayName,
        strain: displayName,
        breeder: '',
        pheno: '',
        gen: 'P1',
        type: 'strain',
        parents: { mother: null, father: null },
      });
    }
  };

  const pendingParents = new Map(referencedParents);
  while (pendingParents.size > 0) {
    const [[id, displayName]] = pendingParents;
    pendingParents.delete(id);
    const sizeBefore = referencedParents.size;
    addAncestorById(id, displayName);
    for (const [newId, newName] of referencedParents) {
      if (!nodeIds.has(newId) && !pendingParents.has(newId)) {
        pendingParents.set(newId, newName);
      }
    }
    void sizeBefore;
  }

  return nodes;
}
