/**
 * The editor's accessibility, measured rather than asserted.
 *
 * These run in a real browser, so almost everything here is a measurement:
 * accessible names come from the accessibility tree, target sizes from
 * `getBoundingClientRect`, contrast from the resolved colours, and the narrow
 * layout from the editor's own container query. The two exceptions are forced
 * colours and reduced motion, which no test can emulate from inside the page
 * — those are checked as declarations, and labelled as such where they are.
 *
 * What is deliberately *not* asserted is that every control is 44 x 44. The
 * frames on the canvas are the user's own geometry — a 0.4 mm divider is
 * four tenths of a millimetre tall because that is what it prints as — and
 * inflating them would be drawing something other than the label. Each one's
 * full-size equal is its row in the Label elements panel, which is what the
 * "every canvas object has a 44 px equal" test below pins down.
 */

import { expect, test, describe, vi, beforeEach } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';
import { userEvent } from 'vitest/browser';

import capabilityFixture from '../fixtures/contract/label_template_capability_v1.json';
import openedFixture from '../fixtures/contract/label_draft_opened_v1.json';
import previewFixture from '../fixtures/contract/label_draft_preview_v1.json';
import { GrowspaceLabelEditor } from '../../src/features/labels/editor/growspace-label-editor';
import { DraftSession } from '../../src/features/labels/editor/draft-session';
import type { LabelTemplateCapability } from '../../src/slices/labels';
import { DraftOpenedSchema, DraftPreviewSchema } from '../../src/slices/labels/draft-schema';

const { autosave, preview, publish, discard, open } = vi.hoisted(() => ({
  autosave: vi.fn(),
  preview: vi.fn(),
  publish: vi.fn(),
  discard: vi.fn(),
  open: vi.fn(),
}));

vi.mock('../../src/slices/labels/drafts', () => ({
  autosaveLabelTemplateDraft: autosave,
  previewLabelTemplateDraft: preview,
  publishLabelTemplateDraft: publish,
  discardLabelTemplateDraft: discard,
  openLabelTemplateDraft: open,
}));

if (!customElements.get('growspace-label-editor')) {
  customElements.define('growspace-label-editor', GrowspaceLabelEditor);
}

const CAPABILITY = capabilityFixture as unknown as LabelTemplateCapability;
const OPENED = DraftOpenedSchema.parse(openedFixture);
const PREVIEW = DraftPreviewSchema.parse(previewFixture);
if (OPENED.outcome !== 'ok' || PREVIEW.outcome !== 'ok') throw new Error('fixtures are refusals');

const DRAFT = { ...OPENED.draft, name: 'Bench label' };
const SIZE = CAPABILITY.catalogues.label_sizes.find((size) => size.id === DRAFT.label_size_id)!;
const VALID = { operation: 'publish', allowed: true, diagnostics: [] };

/** A dark surface with a light foreground: Home Assistant's own default pair. */
const SURFACE = '#1c1c1c';
const THEME = {
  '--primary-text-color': '#e1e1e1',
  '--secondary-background-color': '#282828',
  '--divider-color': '#474747',
  '--primary-color': '#03a9f4',
  '--error-color': '#f44336',
};

/** Home Assistant's own default light-theme pair, the surface this editor's
 *  contrast failed on before it was mixed toward --primary-text-color. */
const LIGHT_SURFACE = '#ffffff';
const LIGHT_THEME = {
  '--primary-text-color': '#212121',
  '--secondary-background-color': '#e5e5e5',
  '--divider-color': 'rgba(0, 0, 0, 0.12)',
  '--primary-color': '#009ac7',
  '--error-color': '#f44336',
};

async function mount(
  theme: Record<string, string> = THEME,
  surface: string = SURFACE
): Promise<{ element: GrowspaceLabelEditor; session: DraftSession }> {
  const session = new DraftSession(
    { labelSizeId: DRAFT.label_size_id },
    { widthMm: SIZE.width_mm, heightMm: SIZE.height_mm },
    DRAFT.document,
    { schedule: (() => null) as never }
  );
  session.adopt(DRAFT, VALID);
  preview.mockResolvedValue({ ...PREVIEW, draft_version: DRAFT.version });
  await session.render();

  const element = await fixture<GrowspaceLabelEditor>(
    '<growspace-label-editor></growspace-label-editor>'
  );
  element.style.background = surface;
  for (const [name, value] of Object.entries(theme)) element.style.setProperty(name, value);
  element.capability = structuredClone(CAPABILITY);
  element.session = session;
  await element.updateComplete;
  await element.renderRoot.querySelector('growspace-label-inspector')?.updateComplete;
  return { element, session };
}

/**
 * Every control the editor offers, across both shadow roots.
 *
 * The canvas frames and their grips are left out on purpose: they are the
 * user's own geometry rather than chrome, and the tests that are about them
 * say so by name.
 */
function controls(element: GrowspaceLabelEditor): HTMLElement[] {
  const panel = element.renderRoot.querySelector('growspace-label-inspector');
  const selector = 'button:not(.element):not(.handle), input, select';
  return [
    ...element.renderRoot.querySelectorAll<HTMLElement>(selector),
    ...(panel?.renderRoot.querySelectorAll<HTMLElement>(selector) ?? []),
  ];
}

/**
 * Which of these the accessibility tree has no name for.
 *
 * Reported as a list rather than asserted one at a time, so a failure names
 * the control instead of merely saying that one of thirty is unnamed.
 */
async function unnamed(candidates: HTMLElement[]): Promise<string[]> {
  const missing: string[] = [];
  for (const control of candidates) {
    if (control.getBoundingClientRect().width === 0) continue;
    try {
      await expect.element(control, { timeout: 250 }).toHaveAccessibleName();
    } catch {
      missing.push(control.outerHTML.slice(0, 140));
    }
  }
  return missing;
}

/** The 44 px target a checkbox sits inside, rather than the box it draws. */
function pickTargets(element: GrowspaceLabelEditor): HTMLElement[] {
  return [...element.renderRoot.querySelectorAll<HTMLElement>('label.pick')];
}

// ---------------------------------------------------------------------------
// Colour arithmetic, so "contrast" is a number rather than an impression
// ---------------------------------------------------------------------------

type Rgb = [number, number, number];

function parse(colour: string): { rgb: Rgb; alpha: number } {
  // A `color-mix()` value's computed style is a `color(srgb r g b [/ a])`
  // triple in the 0-1 range, not the legacy `rgb()` 0-255 triple every other
  // resolved colour here uses -- Chromium's own serialisation, not a choice
  // made in source. Read as `rgb()` it looks like near-black regardless of
  // the actual mix, so it is parsed on its own terms first.
  const colorFn = colour.match(
    /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/
  );
  if (colorFn) {
    const [, r, g, b, a] = colorFn;
    return {
      rgb: [Number(r) * 255, Number(g) * 255, Number(b) * 255],
      alpha: a === undefined ? 1 : Number(a),
    };
  }
  const parts = colour.match(/[\d.]+/g)!.map(Number);
  return { rgb: [parts[0], parts[1], parts[2]], alpha: parts[3] ?? 1 };
}

function over(top: Rgb, alpha: number, bottom: Rgb): Rgb {
  return [0, 1, 2].map((i) => top[i] * alpha + bottom[i] * (1 - alpha)) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const channel = (value: number): number => {
    const sRgb = value / 255;
    return sRgb <= 0.03928 ? sRgb / 12.92 : ((sRgb + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(foreground: Rgb, background: Rgb): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

/** A text node's colour as it actually lands on the surface, opacity folded in. */
function effective(node: HTMLElement, background: Rgb): Rgb {
  const style = getComputedStyle(node);
  const { rgb, alpha } = parse(style.color);
  return over(rgb, alpha * Number(style.opacity), background);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('roles and names', () => {
  test('names every toolbar, group and panel it renders', async () => {
    const { element } = await mount();

    for (const toolbar of element.renderRoot.querySelectorAll('[role="toolbar"]')) {
      expect(toolbar.getAttribute('aria-label')).toBeTruthy();
    }
    for (const group of element.renderRoot.querySelectorAll('[role="group"]')) {
      expect(group.getAttribute('aria-label')).toBeTruthy();
    }
    for (const panel of element.renderRoot.querySelectorAll('aside')) {
      expect(panel.getAttribute('aria-label')).toBeTruthy();
    }
  });

  test('gives every control an accessible name', async () => {
    // Asked of the accessibility tree rather than of the markup, because a
    // name can come from four different places here -- an aria-label, the
    // button's own text, a wrapping label, or a `for` association -- and this
    // editor uses all four.
    const { element } = await mount();

    expect(await unnamed(controls(element))).toEqual([]);
  });

  test('names the workbench tabs where the narrow layout puts them', async () => {
    // The tab bar is not in the accessibility tree at desktop width, and a
    // control that is not in the tree has no name to have. It is measured
    // where it exists instead.
    const { element } = await mount();
    element.style.width = '390px';
    await element.updateComplete;

    expect(
      await unnamed([...element.renderRoot.querySelectorAll<HTMLElement>('nav.tabs button')])
    ).toEqual([]);
  });

  test('names a canvas frame by what fills it, not by its kind alone', async () => {
    // Six elements all called "Text" is a list nobody can navigate, and this
    // string is the frame's accessible name as well as its row's label.
    const { element } = await mount();
    const frames = [...element.renderRoot.querySelectorAll('.element')];

    expect(frames.length).toBeGreaterThan(1);
    const names = frames.map((frame) => frame.getAttribute('aria-label'));
    expect(new Set(names).size).toBe(names.length);
    expect(names[0]).toContain('Strain name');
  });

  test('hides the decorative icons from the accessibility tree', async () => {
    const { element } = await mount();

    for (const svg of element.renderRoot.querySelectorAll('svg')) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    }
  });

  test('gives the raster a description of what it is', async () => {
    const { element } = await mount();

    expect(element.renderRoot.querySelector('img')?.getAttribute('alt')).toBeTruthy();
  });
});

describe('focus', () => {
  test('can put focus on every control, with none removed from the tab order', async () => {
    // A toolbar's buttons are the one exception, and a deliberate one: the
    // toolbar is a single stop and its arrows reach the rest, which the
    // "toolbars" tests below press their way through.
    const { element } = await mount();

    for (const control of controls(element)) {
      if (control.closest('[role="toolbar"]')) continue;
      expect(control.getAttribute('tabindex')).not.toBe('-1');
    }
    const publishButton =
      element.renderRoot.querySelector<HTMLButtonElement>('[data-action="publish"]')!;
    publishButton.focus();
    expect(element.renderRoot.activeElement).toBe(publishButton);
  });

  test('draws its own focus ring, which a theme cannot take away', async () => {
    // A Home Assistant theme may set `outline: none` globally. A shadow root
    // it cannot reach into is exactly the place to put the ring back.
    const sheet = GrowspaceLabelEditor.styles.map(String).join('\n');

    expect(sheet).toContain(':focus-visible');
    expect(sheet).toMatch(/outline:\s*3px solid/);
  });

  test('keeps the canvas itself reachable from the keyboard', async () => {
    const { element } = await mount();
    const layout = element.renderRoot.querySelector<HTMLElement>('.layout')!;

    expect(layout.tabIndex).toBe(0);
  });
});

/** The editor's three toolbars, in document order. */
function toolbars(element: GrowspaceLabelEditor): HTMLElement[] {
  return [...element.renderRoot.querySelectorAll<HTMLElement>('[role="toolbar"]')];
}

/** The buttons of a toolbar a Tab can land on. */
function stops(toolbar: HTMLElement): HTMLButtonElement[] {
  return [...toolbar.querySelectorAll<HTMLButtonElement>('button')].filter(
    (button) => button.tabIndex === 0
  );
}

function focused(element: GrowspaceLabelEditor): Element | null {
  return element.renderRoot.activeElement;
}

describe('toolbars', () => {
  // Pressed rather than dispatched: `userEvent` drives the browser's own
  // keyboard, so Tab here is the real sequential-focus order, not a model of it.

  test('are each a single Tab stop, on a button that can take it', async () => {
    const { element } = await mount();

    expect(toolbars(element)).toHaveLength(3);
    for (const toolbar of toolbars(element)) {
      const [stop, ...extra] = stops(toolbar);
      expect(extra).toEqual([]);
      expect(stop.disabled).toBe(false);
    }
  });

  test('are crossed with one Tab each', async () => {
    const { element } = await mount();
    const [actions, arrange, view] = toolbars(element);

    stops(actions)[0].focus();
    await userEvent.keyboard('{Tab}');
    expect(arrange.contains(focused(element))).toBe(true);
    await userEvent.keyboard('{Tab}');
    expect(view.contains(focused(element))).toBe(true);
    await userEvent.keyboard('{Tab}');
    expect(view.contains(focused(element))).toBe(false);
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    expect(view.contains(focused(element))).toBe(true);
  });

  test('step between their buttons with the arrows, skipping disabled ones and wrapping', async () => {
    const { element } = await mount();
    const [actions] = toolbars(element);
    const enabled = [...actions.querySelectorAll<HTMLButtonElement>('button')].filter(
      (button) => !button.disabled
    );
    expect(enabled.length).toBeGreaterThan(2);

    enabled[0].focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(focused(element)).toBe(enabled[1]);
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(focused(element)).toBe(enabled[enabled.length - 1]);
    await userEvent.keyboard('{Home}');
    expect(focused(element)).toBe(enabled[0]);
    await userEvent.keyboard('{End}');
    expect(focused(element)).toBe(enabled[enabled.length - 1]);
    expect(stops(actions)).toEqual([enabled[enabled.length - 1]]);
  });

  test('walk the nested Align, Distribute and Order groups as one row', async () => {
    const { element } = await mount();
    const [, arrange] = toolbars(element);
    const enabled = [...arrange.querySelectorAll<HTMLButtonElement>('button')].filter(
      (button) => !button.disabled
    );

    enabled[0].focus();
    for (const expected of enabled.slice(1)) {
      await userEvent.keyboard('{ArrowRight}');
      expect(focused(element)).toBe(expected);
    }
    expect(enabled.some((button) => button.dataset.order)).toBe(true);
  });

  test('keep their arrows from nudging the selection', async () => {
    const { element, session } = await mount();
    const [actions] = toolbars(element);
    expect(session.state.selectedIds.length).toBeGreaterThan(0);
    const before = structuredClone(session.state.document);

    // Left, and only Left: a Right and a Left would cancel a nudge out, and
    // the default selection is flush with the label's right edge, where a
    // Right nudge is clamped to nothing. Either would pass whether or not the
    // toolbar kept the keys.
    actions.querySelector<HTMLButtonElement>('button:not([disabled])')!.focus();
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');

    expect(session.state.document).toEqual(before);
  });

  test('still press the focused button with Enter and Space', async () => {
    // The toolbar claims only its navigation keys; activation stays the
    // button's own.
    const { element } = await mount();
    const [, , view] = toolbars(element);
    const zoom = (): string =>
      element.renderRoot.querySelector('[data-role="zoom"]')!.textContent!.trim();
    const zoomIn = view.querySelector<HTMLButtonElement>('[data-action="zoom-in"]')!;
    const before = zoom();

    zoomIn.focus();
    await userEvent.keyboard('{Enter}');
    await element.updateComplete;
    const afterEnter = zoom();
    await userEvent.keyboard(' ');
    await element.updateComplete;

    expect(afterEnter).not.toBe(before);
    expect(zoom()).not.toBe(afterEnter);
  });

  test('come back to the button last used', async () => {
    const { element } = await mount();
    const [actions, arrange] = toolbars(element);

    stops(actions)[0].focus();
    await userEvent.keyboard('{ArrowRight}');
    const used = focused(element);
    await userEvent.keyboard('{Tab}');
    expect(arrange.contains(focused(element))).toBe(true);
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');

    expect(focused(element)).toBe(used);
  });

  test('move the stop off a button that becomes disabled', async () => {
    // Delete disables itself: once the selection is gone there is nothing
    // left to delete. A stop left on it would take the whole toolbar out of
    // the Tab order with it.
    const { element, session } = await mount();
    const [actions] = toolbars(element);
    const remove = actions.querySelector<HTMLButtonElement>('[data-action="delete"]')!;

    remove.focus();
    expect(stops(actions)).toEqual([remove]);
    session.select(null);
    await element.updateComplete;

    expect(remove.disabled).toBe(true);
    const [stop, ...extra] = stops(actions);
    expect(extra).toEqual([]);
    expect(stop.disabled).toBe(false);
  });
});

describe('the live region', () => {
  test('is a polite status region that exists before it has anything to say', async () => {
    // Created empty and filled later: a region inserted at the moment of the
    // announcement is routinely missed by the assistive technology it was
    // inserted for.
    const { element } = await mount();
    const region = element.renderRoot.querySelector('[data-role="announcement"]')!;

    expect(region.getAttribute('role')).toBe('status');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.textContent?.trim()).toBe('');
  });

  test('reports what the pointer would have shown: selection, movement, arrangement', async () => {
    const { element, session } = await mount();
    const region = element.renderRoot.querySelector('[data-role="announcement"]')!;
    const ids = session.state.document.elements.map((item) => item.id);

    element.renderRoot.querySelector<HTMLInputElement>(`[data-pick="${ids[1]}"]`)!.click();
    await element.updateComplete;
    expect(region.textContent).toContain('2');

    element.renderRoot.querySelector<HTMLButtonElement>('[data-align="left"]')!.click();
    await element.updateComplete;
    expect(region.textContent?.trim()).not.toBe('');

    element.renderRoot.querySelector<HTMLButtonElement>('[data-action="zoom-in"]')!.click();
    await element.updateComplete;
    expect(region.textContent).toContain('150');
  });

  test('stays in the accessibility tree while it is invisible', async () => {
    const { element } = await mount();
    const region = element.renderRoot.querySelector<HTMLElement>('[data-role="announcement"]')!;

    expect(getComputedStyle(region).display).not.toBe('none');
    expect(getComputedStyle(region).visibility).not.toBe('hidden');
  });
});

describe('cues that are not colour', () => {
  test('marks a selected element with an outline and a corner, not a hue', async () => {
    const { element, session } = await mount();
    const id = session.state.document.elements[0].id;
    session.select(id);
    await element.updateComplete;

    const frame = element.renderRoot.querySelector<HTMLElement>(`.element[data-element="${id}"]`)!;
    expect(frame.getAttribute('aria-pressed')).toBe('true');
    expect(getComputedStyle(frame).borderTopWidth).toBe('2px');
    expect(getComputedStyle(frame, '::before').content).not.toBe('none');
  });

  test('marks a pressed toolbar option with an underline as well as a border', async () => {
    const { element } = await mount();
    const snap = element.renderRoot.querySelector<HTMLElement>('[data-action="snap"]')!;

    expect(snap.getAttribute('aria-pressed')).toBe('true');
    expect(getComputedStyle(snap).textDecorationLine).toContain('underline');
  });

  test('says in words what the faded raster shows, and in an attribute besides', async () => {
    const { element, session } = await mount();
    const standing = element.renderRoot.querySelector<HTMLElement>('[data-role="standing"]')!;
    expect(standing.dataset.standing).toBe('settled');
    expect(standing.textContent?.trim()).not.toBe('');

    session.moveElement(session.state.document.elements[0].id, {
      ...session.state.document.elements[0].frame,
      x_mm: 6,
    });
    await element.updateComplete;

    expect(standing.dataset.standing).toBe('stale');
    expect(standing.textContent?.trim()).not.toBe('');
  });

  test('restates in forced colours what it otherwise says with a border colour', async () => {
    // Declaration rather than measurement: forced colours cannot be emulated
    // from inside the page.
    const sheet = GrowspaceLabelEditor.styles.map(String).join('\n');

    expect(sheet).toContain('@media (forced-colors: active)');
    expect(sheet).toMatch(/border:\s*2px solid ButtonText/);
  });

  test('declares that nothing animates when motion is unwelcome', async () => {
    const sheet = GrowspaceLabelEditor.styles.map(String).join('\n');

    expect(sheet).toContain('@media (prefers-reduced-motion: reduce)');
    expect(sheet).toMatch(/animation:\s*none/);
  });
});

describe('contrast', () => {
  const background = parse(`rgb(28, 28, 28)`).rgb;

  test('keeps every piece of supporting prose above 4.5:1', async () => {
    const { element } = await mount();
    const panel = element.renderRoot.querySelector('growspace-label-inspector');
    const prose = [
      ...element.renderRoot.querySelectorAll<HTMLElement>('.supporting, aside h2, label'),
      ...(panel?.renderRoot.querySelectorAll<HTMLElement>('.supporting, h3, label') ?? []),
    ];

    expect(prose.length).toBeGreaterThan(4);
    for (const node of prose) {
      expect(
        contrast(effective(node, background), background),
        node.textContent ?? ''
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('keeps a refusal legible, where the colour is carrying meaning', async () => {
    const { element, session } = await mount();
    preview.mockResolvedValue({
      outcome: 'refused',
      refusal: {
        code: 'label_template.draft_stale',
        reason: 'Somebody published past this draft.',
        recovery: 'reload_draft',
        current: CAPABILITY.contract,
      },
    });
    await session.render();
    await element.updateComplete;

    const refusal = element.renderRoot.querySelector<HTMLElement>('.refusal')!;
    expect(contrast(effective(refusal, background), background)).toBeGreaterThanOrEqual(4.5);
    // And never colour alone: the box is bordered and carries role="alert".
    expect(refusal.getAttribute('role')).toBe('alert');
    expect(getComputedStyle(refusal).borderTopWidth).toBe('1px');
  });

  // Home Assistant's light theme, not the dark surface every other test in
  // this file mounts against: --primary-color and --error-color both read
  // below 4.5:1 as raw text here before being mixed toward --primary-text-color.
  describe('in light theme', () => {
    test('keeps the pressed toolbar option and the publish button at 4.5:1', async () => {
      const { element } = await mount(LIGHT_THEME, LIGHT_SURFACE);
      const snap = element.renderRoot.querySelector<HTMLElement>('[data-action="snap"]')!;
      const publish =
        element.renderRoot.querySelector<HTMLButtonElement>('[data-action="publish"]')!;

      expect(snap.getAttribute('aria-pressed')).toBe('true');
      expect(publish.disabled).toBe(false);
      for (const button of [snap, publish]) {
        const buttonBackground = parse(getComputedStyle(button).backgroundColor).rgb;
        expect(
          contrast(effective(button, buttonBackground), buttonBackground),
          button.outerHTML.slice(0, 80)
        ).toBeGreaterThanOrEqual(4.5);
      }
    });

    test("keeps the inspector's pressed content-source option at 4.5:1", async () => {
      const { element, session } = await mount(LIGHT_THEME, LIGHT_SURFACE);
      session.select(session.state.document.elements[0].id);
      await element.updateComplete;
      const panel = element.renderRoot.querySelector('growspace-label-inspector')!;
      await panel.updateComplete;

      const bound = panel.renderRoot.querySelector<HTMLElement>('[data-source="binding"]')!;
      expect(bound.getAttribute('aria-pressed')).toBe('true');
      const buttonBackground = parse(getComputedStyle(bound).backgroundColor).rgb;
      expect(contrast(effective(bound, buttonBackground), buttonBackground)).toBeGreaterThanOrEqual(
        4.5
      );
    });

    test('keeps the error severity label and a refusal at 4.5:1', async () => {
      const { element, session } = await mount(LIGHT_THEME, LIGHT_SURFACE);
      const lightBackground: Rgb = [255, 255, 255];
      session.adopt(DRAFT, {
        operation: 'publish',
        allowed: false,
        diagnostics: [
          {
            code: 'label_template.test_error',
            message: 'Something needs fixing.',
            severity: 'error',
            layer: 'validation',
            element_id: null,
            path: '',
            recovery: '',
            parameters: {},
          },
        ],
      });
      await element.updateComplete;

      const severity = element.renderRoot.querySelector<HTMLElement>(
        '.severity[data-severity="error"]'
      )!;
      expect(
        contrast(effective(severity, lightBackground), lightBackground)
      ).toBeGreaterThanOrEqual(4.5);

      preview.mockResolvedValue({
        outcome: 'refused',
        refusal: {
          code: 'label_template.draft_stale',
          reason: 'Somebody published past this draft.',
          recovery: 'reload_draft',
          current: CAPABILITY.contract,
        },
      });
      await session.render();
      await element.updateComplete;

      const refusal = element.renderRoot.querySelector<HTMLElement>('.refusal')!;
      expect(contrast(effective(refusal, lightBackground), lightBackground)).toBeGreaterThanOrEqual(
        4.5
      );
    });
  });

  test("dims no text below the point where the theme's own contrast stops holding", async () => {
    const { element } = await mount();
    const panel = element.renderRoot.querySelector('growspace-label-inspector');
    const everything = [
      ...element.renderRoot.querySelectorAll<HTMLElement>('*'),
      ...(panel?.renderRoot.querySelectorAll<HTMLElement>('*') ?? []),
    ];

    for (const node of everything) {
      const opacity = Number(getComputedStyle(node).opacity);
      if (node.matches('[disabled], img, .element, .handle')) continue;
      expect(opacity, node.className).toBeGreaterThanOrEqual(0.85);
    }
  });
});

describe('target size', () => {
  test('gives every control at least 44 x 44 CSS pixels', async () => {
    const { element } = await mount();
    // The workbench tab bar belongs to the narrow layout and is not rendered
    // here; the narrow-screen test below measures it where it exists.
    const visible = [...controls(element), ...pickTargets(element)].filter(
      (control) =>
        control.getBoundingClientRect().width > 0 &&
        // The checkbox itself draws at 24 px inside the 44 px label that is
        // its target; the label is measured instead, just above.
        !(control instanceof HTMLInputElement && control.type === 'checkbox')
    );

    expect(visible.length).toBeGreaterThan(20);
    for (const control of visible) {
      const box = control.getBoundingClientRect();
      expect(box.width, control.outerHTML.slice(0, 100)).toBeGreaterThanOrEqual(44);
      expect(box.height, control.outerHTML.slice(0, 100)).toBeGreaterThanOrEqual(44);
    }
  });

  test('gives the workbench tabs the same 44 px where they appear', async () => {
    const { element } = await mount();
    element.style.width = '390px';
    await element.updateComplete;

    const tabs = [...element.renderRoot.querySelectorAll<HTMLElement>('nav.tabs button')];
    expect(tabs).toHaveLength(3);
    for (const tab of tabs) {
      expect(tab.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
  });

  test('gives a resize grip a 44 px hit area while drawing it small', async () => {
    // Grips drawn 44 px across would cover the 50 mm label they grip. The
    // drawn dot is 14 px; the thing a finger has to hit is the pseudo-element
    // behind it.
    const { element, session } = await mount();
    session.select(session.state.document.elements[0].id);
    await element.updateComplete;

    const handle = element.renderRoot.querySelector<HTMLElement>('.handle')!;
    const hit = getComputedStyle(handle, '::after');
    expect(hit.width).toBe('44px');
    expect(hit.height).toBe('44px');
  });

  test('gives every canvas frame a full-size equal in the elements panel', async () => {
    // This is what lets the frames themselves stay the user's own geometry.
    const { element, session } = await mount();

    for (const item of session.state.document.elements) {
      const row = element.renderRoot.querySelector<HTMLElement>(
        `[data-list-element="${item.id}"]`
      )!;
      expect(row.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
  });
});

describe('a narrow screen', () => {
  test('keeps the canvas primary and everything within 390 CSS pixels', async () => {
    const { element } = await mount();
    element.style.width = '390px';
    await element.updateComplete;

    const layout = element.renderRoot.querySelector<HTMLElement>('.layout')!;
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
    expect(element.renderRoot.querySelector('.stage')).not.toBeNull();
    expect(getComputedStyle(element.renderRoot.querySelector('nav.tabs')!).display).toBe('flex');
  });

  test('never puts a scrollbar under a label that already fits', async () => {
    // The stage's own border used to sit outside its width, so the canvas was
    // two pixels wider than the column holding it at every zoom level.
    const { element } = await mount();
    const scroll = element.renderRoot.querySelector<HTMLElement>('.stage-scroll')!;

    expect(scroll.scrollWidth).toBeLessThanOrEqual(scroll.clientWidth);
  });

  test('reaches the panels through the workbench rather than stacking them', async () => {
    const { element } = await mount();
    element.style.width = '390px';
    await element.updateComplete;

    const aside = element.renderRoot.querySelector<HTMLElement>('aside')!;
    expect(getComputedStyle(aside).display).toBe('none');

    element.renderRoot.querySelector<HTMLButtonElement>('[data-tab="elements"]')!.click();
    await element.updateComplete;
    expect(
      getComputedStyle(element.renderRoot.querySelector<HTMLElement>('aside')!).display
    ).not.toBe('none');
  });

  test('still fits when the text is twice the size', async () => {
    const { element } = await mount();
    element.style.width = '390px';
    element.style.fontSize = '200%';
    await element.updateComplete;

    const layout = element.renderRoot.querySelector<HTMLElement>('.layout')!;
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
  });
});
