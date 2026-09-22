/**
 * Where a control's options came from.
 *
 * The failure this module exists to prevent is silent: a picker offering a
 * value the printer cannot place, or a font the catalogue does not ship, and
 * a user discovering it at the printer rather than at the control. So the
 * tests below are mostly about *absence* — what is not offered, and why.
 */

import { describe, expect, it } from 'vitest';

import capabilityFixture from '../../../../tests/fixtures/contract/label_template_capability_v1.json';
import type { CapabilityProfile, LabelTemplateCapability } from '../../../slices/labels';
import {
  DIVIDER_ROTATIONS,
  HORIZONTAL_ALIGNMENTS,
  OVERFLOW_POLICIES,
  ROTATIONS,
  VERTICAL_ALIGNMENTS,
  bindingsFor,
  dividerControls,
  governingProfile,
  isRequiredElement,
  logoControls,
  newElement,
  qrControls,
  rotationsFor,
  textControls,
  wouldDropRequired,
} from './constraints';
import type { LabelDocument, LabelElement } from '../../../slices/labels/draft-schema';

const CAPABILITY = capabilityFixture as unknown as LabelTemplateCapability;
const SIZE_ID = CAPABILITY.catalogues.label_sizes[0].id;
const STOCK = { widthMm: 50, heightMm: 30 };
const PROFILE = governingProfile(CAPABILITY, SIZE_ID)!;

const make = (kind: 'text' | 'logo' | 'qr' | 'divider'): LabelElement | null =>
  newElement({
    capability: CAPABILITY,
    profile: PROFILE,
    kind,
    stock: STOCK,
    id: 'new',
    placeholder: 'New text',
  });

describe('the closed enumerations of the layout language', () => {
  it('are read off the wire shape rather than retyped', () => {
    expect(HORIZONTAL_ALIGNMENTS).toEqual(['left', 'center', 'right']);
    expect(VERTICAL_ALIGNMENTS).toEqual(['top', 'center', 'bottom']);
    expect(OVERFLOW_POLICIES).toEqual(['clip', 'ellipsis', 'shrink', 'shrink_ellipsis']);
  });
});

describe('the governing profile', () => {
  it('is the shipped one for a catalogued stock', () => {
    expect(governingProfile(CAPABILITY, SIZE_ID)?.label_size_id).toBe(SIZE_ID);
  });

  it('is nothing at all for a stock no printer can render', () => {
    expect(governingProfile(CAPABILITY, 'growspace.stock.nobody.v1')).toBeNull();
  });

  it('prefers the profile that may put a real record on paper', () => {
    const provisional = { ...PROFILE, id: 'provisional', authorizes_production: false };
    const production = { ...PROFILE, id: 'production', authorizes_production: true };
    const capability = {
      ...CAPABILITY,
      catalogues: { ...CAPABILITY.catalogues, profiles: [provisional, production] },
    } as LabelTemplateCapability;

    expect(governingProfile(capability, SIZE_ID)?.id).toBe('production');
  });
});

describe('rotation', () => {
  it("offers only what the profile's renderer has actually earned", () => {
    // The shipped Niimbot profile realises upright placement alone, so a
    // rotate-by-90 control would write a document the compiler answers with
    // `profile.rotation_unsupported`.
    expect(PROFILE.supported_element_rotations).toEqual([0]);
    expect(rotationsFor('text', PROFILE)).toEqual([0]);
  });

  it('falls back to the document language where there is no profile to be safe for', () => {
    expect(rotationsFor('text', null)).toEqual([...ROTATIONS]);
    expect(rotationsFor('divider', null)).toEqual([...DIVIDER_ROTATIONS]);
  });

  it('never offers a divider the two angles that would describe the same ink twice', () => {
    const permissive = { ...PROFILE, supported_element_rotations: [0, 90, 180, 270] };
    expect(rotationsFor('divider', permissive as CapabilityProfile)).toEqual([0, 90]);
  });
});

describe('the controls each variant gets', () => {
  it('takes text fonts and spacings from the catalogue, and its floor from the printer', () => {
    const controls = textControls(CAPABILITY, PROFILE);

    expect(controls.fonts).toEqual(CAPABILITY.catalogues.style_tokens.fonts);
    expect(controls.lineSpacing).toEqual(CAPABILITY.catalogues.style_tokens.line_spacing);
    expect(controls.readableFloorMm).toBe(PROFILE.limits.text_readable_floor_mm);
  });

  it('takes QR error correction from the profile, not from the four the format has', () => {
    // The format has four levels; this printer is coarse enough that `low`
    // is not one it will stand behind.
    expect(qrControls(PROFILE).errorCorrection).toEqual(['medium', 'quartile', 'high']);
    expect(qrControls(PROFILE).minimumQuietZoneModules).toBe(4);
  });

  it('states the one fit and the one fill version 1 has, rather than offering a choice', () => {
    expect(logoControls(CAPABILITY, PROFILE).fit).toEqual(['contain']);
    expect(dividerControls(PROFILE).fill).toEqual(['black']);
    expect(dividerControls(PROFILE).minimumThicknessMm).toBe(0.25);
  });

  it('filters bindings to the kinds each one applies to', () => {
    expect(bindingsFor(CAPABILITY, 'qr').map((binding) => binding.id)).toEqual(['plant.link']);
    expect(bindingsFor(CAPABILITY, 'logo').map((binding) => binding.id)).toEqual([
      'strain.breeder.logo',
    ]);
    expect(bindingsFor(CAPABILITY, 'divider')).toEqual([]);
  });
});

describe('a new element', () => {
  it('starts upright, on the paper, and inside every limit the profile names', () => {
    const element = make('qr')!;

    expect(element.rotation).toBe(0);
    expect(element.frame.x_mm + element.frame.width_mm).toBeLessThanOrEqual(STOCK.widthMm);
    expect(element.kind === 'qr' && element.style.quiet_zone_modules).toBeGreaterThanOrEqual(
      PROFILE.limits.qr_minimum_quiet_zone_modules
    );
    expect(element.kind === 'qr' && element.style.error_correction).toBe('medium');
  });

  it("gives new text the caller's placeholder rather than a guessed binding", () => {
    const element = make('text')!;

    expect(element.kind === 'text' && element.content).toEqual({ literal: 'New text' });
    expect(element.kind === 'text' && element.style.minimum_font_size_mm).toBeGreaterThanOrEqual(
      PROFILE.limits.text_readable_floor_mm
    );
  });

  it('gives a divider at least the thinnest ink this printer will lay', () => {
    const element = make('divider')!;

    expect(element.frame.height_mm).toBeGreaterThanOrEqual(
      PROFILE.limits.divider_minimum_thickness_mm
    );
    expect(element.kind === 'divider' && element.style.fill).toBe('black');
  });

  it('refuses rather than inventing an identifier the catalogue does not have', () => {
    const empty = {
      ...CAPABILITY,
      catalogues: { ...CAPABILITY.catalogues, bindings: [] },
    } as unknown as LabelTemplateCapability;

    expect(
      newElement({
        capability: empty,
        profile: PROFILE,
        kind: 'qr',
        stock: STOCK,
        id: 'new',
        placeholder: 'New text',
      })
    ).toBeNull();
  });

  it("fills a binding's parameters with the catalogue's own defaults", () => {
    const element = make('qr')!;
    const target = CAPABILITY.catalogues.bindings.find((binding) => binding.id === 'plant.link');

    expect(
      element.kind === 'qr' && 'binding' in element.content && element.content.parameters
    ).toEqual({
      target: target!.parameters.target[0],
    });
  });
});

describe('the element every publishable layout needs', () => {
  const required = make('text')!;
  const bound: LabelElement = {
    ...required,
    kind: 'text',
    content: { binding: 'strain.name', parameters: {} },
  } as LabelElement;
  const document: LabelDocument = {
    schema: 'growspace.label-layout',
    version: 1,
    label_size_id: SIZE_ID,
    elements: [bound, { ...required, id: 'other' }],
  };

  it('is the text element bound to the strain name, and nothing else', () => {
    expect(isRequiredElement(bound)).toBe(true);
    expect(isRequiredElement(required)).toBe(false);
  });

  it('knows when a deletion would leave the layout without one', () => {
    expect(wouldDropRequired(document, [bound.id])).toBe(true);
    expect(wouldDropRequired(document, ['other'])).toBe(false);
  });
});
