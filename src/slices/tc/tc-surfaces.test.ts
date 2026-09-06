import { describe, expect, test } from 'vitest';

import { tcSurfaces, type TcManifest } from './index';

const manifest = (features: string[]): TcManifest => ({
  contract_version: 1,
  integration_version: '0.1.0',
  features,
  collections: {},
});

const everything = ['culture_lines', 'maintenance', 'culture_media', 'pairings'];

describe('tcSurfaces', () => {
  test('answers in the order the surfaces are shown', () => {
    expect(tcSurfaces(manifest(everything))).toEqual(['worklist', 'cultures', 'media', 'pairings']);
  });

  test('the order is the function`s, not the manifest`s', () => {
    expect(tcSurfaces(manifest([...everything].reverse()))).toEqual([
      'worklist',
      'cultures',
      'media',
      'pairings',
    ]);
  });

  test('a missing feature omits exactly its own surface', () => {
    for (const [feature, surface] of [
      ['culture_media', 'media'],
      ['pairings', 'pairings'],
      ['maintenance', 'worklist'],
    ] as const) {
      const without = tcSurfaces(manifest(everything.filter((name) => name !== feature)));
      expect(without, feature).toEqual(
        ['worklist', 'cultures', 'media', 'pairings'].filter((id) => id !== surface)
      );
    }
  });

  test('culture lines carry the worklist with them', () => {
    // The worklist is built from `replate_due_at`, which a release without the
    // culture board does not have rows to send at all.
    expect(tcSurfaces(manifest(['maintenance']))).toEqual([]);
    expect(tcSurfaces(manifest(['culture_lines']))).toEqual(['cultures']);
  });

  test('a featureless manifest offers nothing, which is the compatibility state', () => {
    expect(tcSurfaces(manifest([]))).toEqual([]);
  });

  test('a manifest of features this card does not know offers nothing', () => {
    expect(tcSurfaces(manifest(['tissue_teleportation']))).toEqual([]);
  });

  test('no manifest at all offers nothing, and does not throw', () => {
    expect(tcSurfaces(undefined)).toEqual([]);
  });
});
