/**
 * Smoke test: StrainEditorView SM wiring.
 *
 * Confirms that the Lit component is a thin renderer over a single `@state() _sm`
 * and that the SM is correctly seeded from the `editingStrain` prop.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';
import { StrainEditorView } from '../../../src/dialogs/strain-editor-view';
import { aStrain, aHass } from '../../fixtures';

vi.mock('../../../src/utils/plant-utils', () => ({
  PlantUtils: {
    compressImage: vi.fn().mockResolvedValue('base64string'),
    encodeLocalPath: vi.fn().mockImplementation((p: string) => p),
  },
}));

if (!customElements.get('strain-editor-view')) {
  // registration happens via @customElement in the source file
}

describe('StrainEditorView — SM wiring', () => {
  let el: StrainEditorView;

  beforeEach(async () => {
    el = await fixture<StrainEditorView>('<strain-editor-view></strain-editor-view>');
    el.hass = aHass() as any;
    el.strains = [aStrain()];
    await el.updateComplete;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mounts without errors', () => {
    expect(el).toBeInstanceOf(StrainEditorView);
  });

  it('initialises _sm with empty draft when no editingStrain is set', async () => {
    const sm = (el as any)._sm;
    expect(sm).toBeDefined();
    expect(sm.draft).toEqual({});
  });

  it('seeds _sm.draft from editingStrain when prop is set', async () => {
    const strain = aStrain({ strain: 'White Widow', phenotype: 'S1' });
    el.editingStrain = strain;
    await el.updateComplete;

    const sm = (el as any)._sm;
    expect(sm.draft.strain).toBe('White Widow');
    expect(sm.draft.phenotype).toBe('S1');
  });

  it('replaces _sm.draft when editingStrain changes to a different strain', async () => {
    el.editingStrain = aStrain({ strain: 'OG Kush', key: 'og-kush-a' });
    await el.updateComplete;

    el.editingStrain = aStrain({ strain: 'Gelato', key: 'gelato-a' });
    await el.updateComplete;

    expect((el as any)._sm.draft.strain).toBe('Gelato');
  });

  it('_sm has idle status on mount', async () => {
    expect((el as any)._sm.status.kind).toBe('idle');
  });

  it('_sm has empty history on mount', async () => {
    expect((el as any)._sm.history).toEqual([]);
  });
});
