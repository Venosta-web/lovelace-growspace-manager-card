/**
 * The Selection inspector: what each of the four variants may be told to do.
 *
 * The thing being asserted throughout is a *narrowing*. Every control here
 * could be written to offer the whole of what the format allows, and it would
 * look fine, save fine, and then be blocked at the printer. So these tests ask
 * what is missing from each list as often as what is in it.
 */

import { expect, test, describe, vi } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';

import capabilityFixture from '../fixtures/contract/label_template_capability_v1.json';
import { GrowspaceLabelInspector } from '../../src/features/labels/editor/growspace-label-inspector';
import {
  governingProfile,
  newElement,
  type ElementKind,
} from '../../src/features/labels/editor/constraints';
import type { CapabilityProfile, LabelTemplateCapability } from '../../src/slices/labels';
import type { LabelElement } from '../../src/slices/labels/draft-schema';

if (!customElements.get('growspace-label-inspector')) {
  customElements.define('growspace-label-inspector', GrowspaceLabelInspector);
}

const CAPABILITY = capabilityFixture as unknown as LabelTemplateCapability;
const SIZE = CAPABILITY.catalogues.label_sizes[0];
const STOCK = { widthMm: SIZE.width_mm, heightMm: SIZE.height_mm };
const PROFILE = governingProfile(CAPABILITY, SIZE.id)!;

function element(kind: ElementKind): LabelElement {
  return newElement({
    capability: CAPABILITY,
    profile: PROFILE,
    kind,
    stock: STOCK,
    id: `an-${kind}`,
    placeholder: 'New text',
  })!;
}

async function mount(
  subject: LabelElement,
  profile: CapabilityProfile | null = PROFILE
): Promise<{ panel: GrowspaceLabelInspector; changed: ReturnType<typeof vi.fn> }> {
  const panel = await fixture<GrowspaceLabelInspector>(
    '<growspace-label-inspector></growspace-label-inspector>'
  );
  panel.capability = CAPABILITY;
  panel.profile = profile;
  panel.element = subject;
  panel.stock = STOCK;
  await panel.updateComplete;

  const changed = vi.fn();
  panel.addEventListener('element-change', changed as EventListener);
  return { panel, changed };
}

const options = (panel: GrowspaceLabelInspector, selector: string): string[] =>
  [...panel.renderRoot.querySelectorAll<HTMLOptionElement>(`${selector} option`)].map(
    (option) => option.value
  );

/** The element carried by the most recent `element-change`. */
const changedTo = (changed: ReturnType<typeof vi.fn>): LabelElement =>
  changed.mock.calls.at(-1)![0].detail.element;

describe('text', () => {
  test('offers the catalogue fonts and spacings, and nothing else', async () => {
    const { panel } = await mount(element('text'));

    expect(options(panel, '#font')).toEqual(
      CAPABILITY.catalogues.style_tokens.fonts.map((font) => font.id)
    );
    expect(options(panel, '#line_spacing')).toEqual(
      CAPABILITY.catalogues.style_tokens.line_spacing.map((spacing) => spacing.id)
    );
  });

  test('offers the four overflow policies the layout language has', async () => {
    const { panel } = await mount(element('text'));

    expect(options(panel, '#overflow')).toEqual(['clip', 'ellipsis', 'shrink', 'shrink_ellipsis']);
  });

  test('says what this printer can and cannot render, in millimetres', async () => {
    const { panel } = await mount(element('text'));
    const floor = panel.renderRoot.querySelector('[data-role="font-floor"]');

    expect(floor?.textContent).toContain(String(PROFILE.limits.text_readable_floor_mm));
    expect(floor?.textContent).toContain(String(PROFILE.limits.text_comfort_threshold_mm));
  });

  test('hands back a whole element when one control changes', async () => {
    // The panel never patches the document. A complete replacement is what
    // lets the editor treat a style change as one undoable command, exactly
    // like a drag.
    const subject = element('text');
    const { panel, changed } = await mount(subject);

    panel.renderRoot
      .querySelector<HTMLButtonElement>('[data-group="text_align"][data-option="right"]')!
      .click();

    const next = changedTo(changed);
    expect(next.kind === 'text' && next.style.horizontal_align).toBe('right');
    expect(next.id).toBe(subject.id);
    expect(next.frame).toEqual(subject.frame);
  });

  test('marks the chosen alignment without relying on colour', async () => {
    const { panel } = await mount(element('text'));
    const chosen = panel.renderRoot.querySelector('[data-group="text_align"][aria-pressed="true"]');

    expect(chosen?.getAttribute('data-option')).toBe('left');
    expect(getComputedStyle(chosen!).textDecorationLine).toContain('underline');
  });
});

describe('qr', () => {
  test('offers the error-correction levels this printer stands behind, not all four', async () => {
    const { panel } = await mount(element('qr'));

    expect(options(panel, '#error_correction')).toEqual(['medium', 'quartile', 'high']);
    expect(options(panel, '#error_correction')).not.toContain('low');
  });

  test('holds the quiet zone to the profile floor and says what it is', async () => {
    const { panel } = await mount(element('qr'));
    const field = panel.renderRoot.querySelector<HTMLInputElement>('#quiet_zone_modules')!;

    expect(field.min).toBe(String(PROFILE.limits.qr_minimum_quiet_zone_modules));
    expect(panel.renderRoot.querySelector('[data-role="quiet-zone-floor"]')?.textContent).toContain(
      String(PROFILE.limits.qr_maximum_encoded_bytes)
    );
  });

  test('offers only the bindings a QR can carry', async () => {
    const { panel } = await mount(element('qr'));

    expect(options(panel, '#binding')).toEqual(['plant.link']);
  });

  test("offers that binding's own parameter values, from the catalogue", async () => {
    const { panel, changed } = await mount(element('qr'));

    expect(options(panel, '#parameter-target')).toEqual(['dashboard_url', 'home_assistant_app']);

    const select = panel.renderRoot.querySelector<HTMLSelectElement>('#parameter-target')!;
    select.value = 'home_assistant_app';
    select.dispatchEvent(new Event('change'));

    const next = changedTo(changed);
    expect(next.kind === 'qr' && 'binding' in next.content && next.content.parameters).toEqual({
      target: 'home_assistant_app',
    });
  });
});

describe('logo', () => {
  test('offers the monochrome tokens and states the one fit version 1 has', async () => {
    const { panel } = await mount(element('logo'));

    expect(options(panel, '#monochrome')).toEqual(
      CAPABILITY.catalogues.style_tokens.monochrome.map((token) => token.id)
    );
    expect(panel.renderRoot.querySelector('[data-role="fixed"]')?.textContent).toContain('contain');
    expect(panel.renderRoot.querySelector('select#fit')).toBeNull();
  });

  test('does not offer fixed text, which no v1 binding could turn into an image', async () => {
    const { panel } = await mount(element('logo'));

    expect(panel.renderRoot.querySelector('[data-source="literal"]')).toBeNull();
  });
});

describe('divider', () => {
  test('has no content section at all, because it is a mark rather than a container', async () => {
    const { panel } = await mount(element('divider'));

    expect(panel.renderRoot.querySelector('#binding')).toBeNull();
    expect(panel.renderRoot.querySelector('[data-field="literal"]')).toBeNull();
  });

  test('states the fill and points the thickness at the size controls', async () => {
    const { panel } = await mount(element('divider'));

    expect(panel.renderRoot.querySelector('[data-role="fixed"]')?.textContent).toContain('black');
    expect(panel.renderRoot.querySelector('[data-role="divider-floor"]')?.textContent).toContain(
      String(PROFILE.limits.divider_minimum_thickness_mm)
    );
  });
});

describe('rotation', () => {
  test('is a stated fact when the profile places elements one way only', async () => {
    const { panel } = await mount(element('text'));

    expect(panel.renderRoot.querySelector('[data-role="rotation-fixed"]')).not.toBeNull();
    expect(panel.renderRoot.querySelector('[data-rotation]')).toBeNull();
  });

  test('becomes a control the moment a profile realises more than one', async () => {
    const turning = {
      ...PROFILE,
      supported_element_rotations: [0, 90, 180, 270],
    } as CapabilityProfile;
    const { panel, changed } = await mount(element('text'), turning);

    expect(
      [...panel.renderRoot.querySelectorAll('[data-rotation]')].map((b) =>
        b.getAttribute('data-rotation')
      )
    ).toEqual(['0', '90', '180', '270']);

    panel.renderRoot.querySelector<HTMLButtonElement>('[data-rotation="90"]')!.click();
    expect(changedTo(changed).rotation).toBe(90);
  });

  test('offers a divider two angles where a text element gets four', async () => {
    const turning = {
      ...PROFILE,
      supported_element_rotations: [0, 90, 180, 270],
    } as CapabilityProfile;
    const { panel } = await mount(element('divider'), turning);

    expect([...panel.renderRoot.querySelectorAll('[data-rotation]')]).toHaveLength(2);
  });
});

describe('content', () => {
  test('switches text between a record field and fixed text', async () => {
    const subject = element('text');
    const { panel, changed } = await mount(subject);

    panel.renderRoot.querySelector<HTMLButtonElement>('[data-source="binding"]')!.click();
    const bound = changedTo(changed);
    expect(bound.kind === 'text' && 'binding' in bound.content).toBe(true);

    panel.element = bound;
    await panel.updateComplete;
    panel.renderRoot.querySelector<HTMLButtonElement>('[data-source="literal"]')!.click();
    expect(changedTo(changed).kind === 'text' && 'literal' in changedTo(changed).content!).toBe(
      true
    );
  });

  test('leaves a binding this card has never heard of exactly as it is', async () => {
    // A minor version may add one. Rewriting it to something recognised
    // would be editing the user's document on their behalf.
    const subject = {
      ...element('text'),
      content: { binding: 'strain.terpenes', parameters: {} },
    } as LabelElement;
    const { panel } = await mount(subject);

    expect(panel.renderRoot.querySelector('[data-role="unknown-binding"]')?.textContent).toContain(
      'strain.terpenes'
    );
  });
});

describe('nothing selected', () => {
  test('says so rather than showing an empty set of controls', async () => {
    const panel = await fixture<GrowspaceLabelInspector>(
      '<growspace-label-inspector></growspace-label-inspector>'
    );
    panel.capability = CAPABILITY;
    await panel.updateComplete;

    expect(panel.renderRoot.querySelector('[data-role="empty"]')).not.toBeNull();
  });
});
