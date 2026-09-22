/**
 * The editor surface: the structure it promises, and the two things it must
 * never show.
 *
 * It must never draw ink — the only picture is the backend's raster, and the
 * editor adds outlines over it — and it must never let a stale raster look
 * current. Both are asserted here against a real render rather than described.
 */

import { expect, test, describe, vi, beforeEach } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';

import capabilityFixture from '../fixtures/contract/label_template_capability_v1.json';
import openedFixture from '../fixtures/contract/label_draft_opened_v1.json';
import previewFixture from '../fixtures/contract/label_draft_preview_v1.json';
import { GrowspaceLabelEditor } from '../../src/features/labels/editor/growspace-label-editor';
import { DraftSession } from '../../src/features/labels/editor/draft-session';
import type { LabelTemplateCapability } from '../../src/slices/labels';
import {
  DraftOpenedSchema,
  DraftPreviewSchema,
  type LabelDocument,
  type TemplateDraft,
} from '../../src/slices/labels/draft-schema';

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

/**
 * The recorded draft, named.
 *
 * The fixture is an untitled draft straight out of `open`, which is exactly
 * what publication blocks on — so the tests that are about something else
 * give it the name the user would have typed, and the one that is about the
 * missing name takes it away again.
 */
const DRAFT: TemplateDraft = { ...OPENED.draft, name: 'Bench label' };
const DOCUMENT: LabelDocument = DRAFT.document;
const SIZE = CAPABILITY.catalogues.label_sizes.find((size) => size.id === DRAFT.label_size_id)!;
const VALID = { operation: 'publish', allowed: true, diagnostics: [] };

async function mount(options: { render?: boolean } = {}): Promise<{
  element: GrowspaceLabelEditor;
  session: DraftSession;
}> {
  const session = new DraftSession(
    { labelSizeId: DRAFT.label_size_id },
    { widthMm: SIZE.width_mm, heightMm: SIZE.height_mm },
    DOCUMENT,
    { schedule: (() => null) as never }
  );
  session.adopt(DRAFT, VALID);
  if (options.render !== false) {
    // The raster the backend would send for *this* draft version. A render of
    // any other version is stale by construction, which is the mechanism two
    // tests below exercise deliberately.
    preview.mockResolvedValue({ ...PREVIEW, draft_version: DRAFT.version });
    await session.render();
  }

  const element = await fixture<GrowspaceLabelEditor>(
    '<growspace-label-editor></growspace-label-editor>'
  );
  element.capability = structuredClone(CAPABILITY);
  element.session = session;
  await element.updateComplete;
  return { element, session };
}

const query = (element: GrowspaceLabelEditor, selector: string): HTMLElement | null =>
  element.renderRoot.querySelector(selector);

/**
 * A control inside the Selection inspector.
 *
 * The inspector is its own element with its own shadow root, so the exact
 * millimetre fields and the style controls are one hop further down than the
 * canvas is. Reaching through here rather than in every test keeps the tests
 * about what the control does.
 */
const inspect = <T extends HTMLElement>(
  element: GrowspaceLabelEditor,
  selector: string
): T | null => {
  const panel = element.renderRoot.querySelector('growspace-label-inspector');
  return (panel?.renderRoot.querySelector(selector) as T | null) ?? null;
};

/** Let the inspector render before reaching into its shadow root. */
async function inspectorReady(element: GrowspaceLabelEditor): Promise<void> {
  await element.updateComplete;
  await element.renderRoot.querySelector('growspace-label-inspector')?.updateComplete;
}

/** The frame of the element at `index`, as the session currently holds it. */
const frameAt = (session: DraftSession, index: number) =>
  session.state.document.elements[index].frame;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('the accepted structure', () => {
  test('gives the desktop an elements panel, a canvas and a Selection inspector', async () => {
    const { element } = await mount();

    expect(query(element, 'ul.elements')).not.toBeNull();
    expect(query(element, '.stage')).not.toBeNull();
    expect(element.renderRoot.textContent).toContain('Selection');
    expect(element.renderRoot.textContent).toContain('Label elements');
  });

  test('keeps the canvas primary on a narrow screen, with the panels one tap away', async () => {
    // The panels are behind a workbench tab bar rather than stacked above the
    // canvas, which is what "canvas primary" means on a phone.
    const { element } = await mount();

    expect(query(element, 'nav.tabs')).not.toBeNull();
    expect(query(element, '[data-tab="canvas"]')).not.toBeNull();
    expect(query(element, '[data-tab="elements"]')).not.toBeNull();
    expect(query(element, '[data-tab="selection"]')).not.toBeNull();
  });

  test('offers undo, redo and the toolbar the editing loop calls for', async () => {
    const { element } = await mount();

    expect(query(element, '[data-action="undo"]')).not.toBeNull();
    expect(query(element, '[data-action="redo"]')).not.toBeNull();
    expect(query(element, '[data-action="discard"]')).not.toBeNull();
  });
});

describe('the picture on screen', () => {
  test('is the backend raster, with frames drawn over it and no ink of its own', async () => {
    const { element } = await mount();
    const image = element.renderRoot.querySelector('img');

    expect(image?.getAttribute('src')).toBe(PREVIEW.render.raster?.image);
    // Every element is an outline. None of them carries text.
    for (const frame of element.renderRoot.querySelectorAll('.element')) {
      expect(frame.textContent?.trim()).toBe('');
    }
  });

  test('says the raster is exact while it matches the layout shown', async () => {
    const { element } = await mount();

    expect(query(element, '[data-role="standing"]')?.dataset.standing).toBe('settled');
  });

  test('marks the raster stale the moment the geometry moves past it', async () => {
    const { element, session } = await mount();

    session.moveElement(DOCUMENT.elements[0].id, {
      ...DOCUMENT.elements[0].frame,
      x_mm: 6,
    });
    await element.updateComplete;

    expect(query(element, '[data-role="standing"]')?.dataset.standing).toBe('stale');
    // And the picture itself is visibly the old one, not merely labelled so.
    expect(element.renderRoot.querySelector('img')?.dataset.standing).toBe('stale');
  });

  test('says so plainly when there is no raster at all', async () => {
    const { element } = await mount({ render: false });

    expect(query(element, '[data-role="standing"]')?.dataset.standing).toBe('absent');
    expect(element.renderRoot.querySelector('img')).toBeNull();
  });
});

describe('editing the selected element', () => {
  test('nudges by half a millimetre, in millimetres rather than pixels', async () => {
    const { element, session } = await mount();
    await inspectorReady(element);
    const before = session.state.document.elements[0].frame.x_mm;

    inspect(element, '[data-nudge="right"]')?.click();
    await element.updateComplete;

    expect(session.state.document.elements[0].frame.x_mm).toBe(before + 0.5);
  });

  test('clamps a typed value that would push the element off the paper', async () => {
    // 43 mm wide on 50 mm stock leaves 7 mm of travel, and the exact control
    // is held to the same limit a drag is — otherwise the two views of one
    // frame could express different geometry.
    const { element, session } = await mount();
    await inspectorReady(element);
    const field = inspect<HTMLInputElement>(element, '[data-field="x_mm"]')!;

    field.value = '40';
    field.dispatchEvent(new Event('change'));
    await element.updateComplete;

    expect(session.state.document.elements[0].frame.x_mm).toBe(7);
  });

  test('takes an exact millimetre value from the inspector', async () => {
    const { element, session } = await mount();
    await inspectorReady(element);
    const field = inspect<HTMLInputElement>(element, '[data-field="x_mm"]')!;

    field.value = '3.25';
    field.dispatchEvent(new Event('change'));
    await element.updateComplete;

    expect(session.state.document.elements[0].frame.x_mm).toBe(3.25);
  });

  test('quantizes a value finer than the grid rather than sending one back', async () => {
    const { element, session } = await mount();
    await inspectorReady(element);
    const field = inspect<HTMLInputElement>(element, '[data-field="y_mm"]')!;

    field.value = '3.14159';
    field.dispatchEvent(new Event('change'));
    await element.updateComplete;

    expect(session.state.document.elements[0].frame.y_mm).toBe(3.14);
  });

  test('shows resize handles on the selected element only', async () => {
    const { element, session } = await mount();
    session.select(DOCUMENT.elements[0].id);
    await element.updateComplete;

    const selected = element.renderRoot.querySelector('.element[aria-pressed="true"]');
    // Beside the frame, never inside it: a button may not contain buttons.
    expect(selected?.querySelectorAll('.handle')).toHaveLength(0);
    expect(selected?.nextElementSibling?.querySelectorAll('.handle')).toHaveLength(8);
  });
});

describe('the publish gate', () => {
  test('names its reason rather than presenting one disabled button', async () => {
    const { element, session } = await mount();

    session.moveElement(DOCUMENT.elements[0].id, {
      ...DOCUMENT.elements[0].frame,
      x_mm: 6,
    });
    await element.updateComplete;

    const button = element.renderRoot.querySelector<HTMLButtonElement>('[data-action="publish"]');
    expect(button?.disabled).toBe(true);
    expect(query(element, '[data-role="blocked"]')?.dataset.blocked).toBe('unsaved');
  });

  test('publishes and reports the template it created', async () => {
    const { element, session } = await mount();
    publish.mockResolvedValue({
      outcome: 'ok',
      template: { id: 'uuid', name: 'Bench label' },
      revision: { revision: 1 },
    });
    const published = vi.fn();
    element.addEventListener('published', published);

    element.renderRoot.querySelector<HTMLButtonElement>('[data-action="publish"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(session.state.draft).not.toBeNull();
    expect(published).toHaveBeenCalledOnce();
  });
});

describe('a refusal the user has to answer', () => {
  test('offers the reload a conflict names, and keeps the local work', async () => {
    const { element, session } = await mount();
    autosave.mockResolvedValue({
      outcome: 'refused',
      refusal: {
        code: 'label_template.draft_version_conflict',
        reason: 'Another editor saved first.',
        recovery: 'reload_draft',
        current: CAPABILITY.contract,
      },
    });

    session.moveElement(DOCUMENT.elements[0].id, { ...DOCUMENT.elements[0].frame, x_mm: 6 });
    await session.save();
    await element.updateComplete;

    expect(query(element, '.refusal')?.dataset.code).toBe('label_template.draft_version_conflict');
    expect(query(element, '[data-action="reload"]')).not.toBeNull();
    expect(session.state.document.elements[0].frame.x_mm).toBe(6);
  });

  test('offers no automatic recovery for a verb it does not recognise', async () => {
    // A backend may add recovery verbs inside a major version. A button that
    // did nothing would be worse than the reason alone.
    const { element, session } = await mount();
    preview.mockResolvedValue({
      outcome: 'refused',
      refusal: {
        code: 'label_template.something_new',
        reason: 'A reason this card has never seen.',
        recovery: 'a_verb_from_the_future',
        current: CAPABILITY.contract,
      },
    });

    await session.render();
    await element.updateComplete;

    expect(query(element, '.refusal')).not.toBeNull();
    expect(query(element, '[data-action="reload"]')).toBeNull();
    expect(query(element, '[data-action="dismiss"]')).not.toBeNull();
  });
});

describe('diagnostics lead to their correction', () => {
  const diagnostic = (overrides: Record<string, unknown>) => ({
    code: 'profile.text_below_readable_floor',
    severity: 'error',
    layer: 'profile_compilation',
    message: 'Element 01ABC is 1.2 mm, below the 1.6 mm floor',
    path: '',
    element_id: DOCUMENT.elements[0].id,
    parameters: {},
    recovery: 'edit_element',
    ...overrides,
  });

  async function withDiagnostics(items: Record<string, unknown>[]) {
    // No render: the recorded raster carries warnings of its own, merged into
    // the same list, and these tests are about the rows they add.
    const mounted = await mount({ render: false });
    mounted.session.adopt(DRAFT, {
      operation: 'publish',
      allowed: false,
      diagnostics: items as never,
    });
    await mounted.element.updateComplete;
    return mounted;
  }

  test('orders them worst first, in words and marks rather than colour or backend prose', async () => {
    const { element } = await withDiagnostics([
      diagnostic({ severity: 'warning', code: 'profile.text_below_comfort_threshold' }),
      diagnostic({}),
    ]);

    const rows = [
      ...element.renderRoot.querySelectorAll<HTMLElement>('[data-role="diagnostics"] li'),
    ];
    expect(rows.map((row) => row.dataset.severity)).toEqual(['error', 'warning']);
    expect(rows[0].querySelector('.severity')?.textContent?.trim()).toBe('Blocks');
    expect(rows[0].textContent).not.toContain('01ABC');
    expect(rows[0].textContent).toMatch(/too small for this printer/);
    expect(query(element, '[data-role="diagnostic-counts"]')?.textContent).toMatch(
      /1 blocking · 1 warnings/
    );
  });

  test('selects the element and focuses the exact control that fixes it', async () => {
    const { element, session } = await withDiagnostics([diagnostic({})]);

    query(element, '[data-role="diagnostics"] [data-action="go-to"]')!.click();

    await vi.waitFor(() => {
      const inspector = element.renderRoot.querySelector('growspace-label-inspector')!;
      expect(inspector.shadowRoot?.activeElement?.getAttribute('data-field')).toBe('font_size_mm');
    });
    expect(session.state.selectedIds).toEqual([DOCUMENT.elements[0].id]);
  });

  test('sends a device problem to profile selection, not into the element', async () => {
    const { element } = await withDiagnostics([
      diagnostic({ code: 'profile.stock_mismatch', recovery: 'select_profile', element_id: null }),
    ]);

    const go = query(element, '[data-action="go-to"]')!;
    expect(go.dataset.destination).toBe('profile');
    go.click();

    await vi.waitFor(() => {
      const panel = element.renderRoot.querySelector('growspace-label-print-panel')!;
      expect(panel.shadowRoot?.activeElement?.getAttribute('data-control')).toMatch(
        /profile|printer/
      );
    });
  });

  test('announces when the problems change, and when they clear', async () => {
    const { element, session } = await withDiagnostics([diagnostic({})]);
    const announced = () => query(element, '[data-role="announcement"]')?.textContent?.trim();

    session.adopt(DRAFT, { operation: 'publish', allowed: true, diagnostics: [] });
    await element.updateComplete;

    expect(announced()).toBe('No problems remain on this label.');
  });
});

describe('a render that does not come back', () => {
  test('says so in reviewed words, keeps the draft, and retries the render', async () => {
    const { element, session } = await mount();
    preview.mockRejectedValue(new Error('label_template.preview_timeout'));
    await session.render();
    await element.updateComplete;

    const refusal = query(element, '.refusal')!;
    expect(refusal.dataset.code).toBe('label_template.preview_timeout');
    expect(refusal.textContent).toMatch(/did not arrive in time/);
    expect(session.state.draft).not.toBeNull();

    preview.mockResolvedValue({ ...PREVIEW, draft_version: DRAFT.version });
    query(element, '[data-action="retry"]')!.click();
    await vi.waitFor(() => expect(query(element, '.refusal')).toBeNull());
    expect(query(element, '[data-role="standing"]')?.dataset.standing).toBe('settled');
  });
});

// ---------------------------------------------------------------------------
// Direct manipulation
// ---------------------------------------------------------------------------

/** The ids of the fixture's six elements, in paint order. */
const IDS = DOCUMENT.elements.map((element) => element.id);

/** Dispatch one pointer event at the given client point. */
function pointer(
  target: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  x: number,
  y: number,
  modifiers: { shiftKey?: boolean } = {}
): void {
  target.dispatchEvent(
    new PointerEvent(type, {
      pointerId: 1,
      isPrimary: true,
      bubbles: true,
      composed: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      ...modifiers,
    })
  );
}

/** How many CSS pixels one millimetre of stock is, on the stage as rendered. */
function pixelsPerMm(element: GrowspaceLabelEditor): number {
  const stage = element.renderRoot.querySelector('.stage')!;
  return stage.getBoundingClientRect().width / SIZE.width_mm;
}

/** Press a key on the editor's focusable layout. */
function press(
  element: GrowspaceLabelEditor,
  key: string,
  modifiers: { shiftKey?: boolean; ctrlKey?: boolean } = {}
): void {
  element.renderRoot
    .querySelector('.layout')!
    .dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, composed: true, ...modifiers })
    );
}

describe('selecting more than one element', () => {
  test('extends the selection when a modifier is held, rather than replacing it', async () => {
    const { element, session } = await mount();
    session.select(IDS[0]);
    await element.updateComplete;

    const second = element.renderRoot.querySelector(`[data-element="${IDS[1]}"]`)!;
    pointer(second, 'pointerdown', 0, 0, { shiftKey: true });
    await element.updateComplete;

    expect(session.state.selectedIds).toEqual([IDS[0], IDS[1]]);
  });

  test('offers a checkbox per element, which is how a finger selects several', async () => {
    // A phone has no shift key. The list is the explicit, touch-sized way to
    // build a selection, and it is the same selection the canvas shows.
    const { element, session } = await mount();
    session.select(IDS[0]);
    await element.updateComplete;

    const pick = element.renderRoot.querySelector<HTMLInputElement>(`[data-pick="${IDS[2]}"]`)!;
    pick.click();
    await element.updateComplete;

    expect(session.state.selectedIds).toEqual([IDS[0], IDS[2]]);
    expect(
      element.renderRoot
        .querySelector(`.element[data-element="${IDS[2]}"]`)
        ?.getAttribute('aria-pressed')
    ).toBe('true');
  });

  test('adds by a plain tap once the touch multi-select mode is on', async () => {
    // A phone has no Shift key, and the panel with the checkboxes is a tab
    // away from the canvas a finger is working on.
    const { element, session } = await mount();
    session.select(IDS[0]);
    query(element, '[data-action="multi-select"]')?.click();
    await element.updateComplete;

    const second = element.renderRoot.querySelector(`[data-element="${IDS[1]}"]`)!;
    pointer(second, 'pointerdown', 0, 0);
    await element.updateComplete;

    expect(session.state.selectedIds).toEqual([IDS[0], IDS[1]]);
  });

  test('goes back to replacing the selection when that mode is off again', async () => {
    const { element, session } = await mount();
    session.select(IDS[0]);
    const toggle = element.renderRoot.querySelector<HTMLButtonElement>(
      '[data-action="multi-select"]'
    )!;
    toggle.click();
    await element.updateComplete;
    toggle.click();
    await element.updateComplete;

    const second = element.renderRoot.querySelector(`[data-element="${IDS[1]}"]`)!;
    pointer(second, 'pointerdown', 0, 0);
    await element.updateComplete;

    expect(session.state.selectedIds).toEqual([IDS[1]]);
  });

  test('selects everything from the toolbar and from Ctrl+A alike', async () => {
    const { element, session } = await mount();

    query(element, '[data-action="select-all"]')?.click();
    await element.updateComplete;
    expect(session.state.selectedIds).toHaveLength(IDS.length);

    session.select(null);
    press(element, 'a', { ctrlKey: true });
    await element.updateComplete;
    expect(session.state.selectedIds).toHaveLength(IDS.length);
  });

  test('shows resize handles only when exactly one element is selected', async () => {
    // Eight grips per element over a multiple selection would be forty-eight
    // targets on a 50 mm label, and a resize that meant six different things.
    const { element, session } = await mount();
    session.selectMany([IDS[0], IDS[1]]);
    await element.updateComplete;

    expect(element.renderRoot.querySelectorAll('.handle')).toHaveLength(0);

    session.select(IDS[0]);
    await element.updateComplete;
    expect(element.renderRoot.querySelectorAll('.handle')).toHaveLength(8);
  });

  test('drops a selected element from the selection when it is deleted', async () => {
    const { element, session } = await mount();
    session.selectMany([IDS[1], IDS[2]]);
    await element.updateComplete;

    query(element, '[data-action="delete"]')?.click();
    await element.updateComplete;

    expect(session.state.selectedIds).toEqual([]);
    expect(session.state.document.elements.map((item) => item.id)).not.toContain(IDS[1]);
  });
});

describe('dragging', () => {
  test('moves every selected element by the same distance, in millimetres', async () => {
    const { element, session } = await mount();
    session.selectMany([IDS[0], IDS[2]]);
    await element.updateComplete;
    const scale = pixelsPerMm(element);
    const before = [frameAt(session, 0).x_mm, frameAt(session, 2).x_mm];

    const target = element.renderRoot.querySelector(`[data-element="${IDS[0]}"]`)!;
    pointer(target, 'pointerdown', 100, 100);
    // Four millimetres: far enough from every guide that snapping has
    // nothing to say, and short enough that a 43 mm element on 50 mm stock
    // does not reach the edge and stop there.
    pointer(element.renderRoot.querySelector('.stage')!, 'pointermove', 100 + 4 * scale, 100);
    await element.updateComplete;

    expect(frameAt(session, 0).x_mm).toBeCloseTo(before[0] + 4, 1);
    expect(frameAt(session, 2).x_mm).toBeCloseTo(before[1] + 4, 1);
  });

  test('is one undo step however many pointer moves it took', async () => {
    const { element, session } = await mount();
    session.select(IDS[0]);
    await element.updateComplete;
    const scale = pixelsPerMm(element);
    const origin = frameAt(session, 0).x_mm;

    const target = element.renderRoot.querySelector(`[data-element="${IDS[0]}"]`)!;
    pointer(target, 'pointerdown', 100, 100);
    for (const step of [3, 5, 8]) {
      pointer(element.renderRoot.querySelector('.stage')!, 'pointermove', 100 + step * scale, 100);
    }
    pointer(element.renderRoot.querySelector('.stage')!, 'pointerup', 100 + 8 * scale, 100);
    await element.updateComplete;

    session.undo();
    expect(frameAt(session, 0).x_mm).toBe(origin);
  });

  test('pulls a near-miss onto a guide, and draws the line it landed on', async () => {
    const { element, session } = await mount();
    session.select(IDS[0]);
    await element.updateComplete;
    const scale = pixelsPerMm(element);

    // The fixture's elements all start at x = 2 mm. Nudging this one a third
    // of a millimetre off that shared edge is exactly the case snapping is
    // for: it comes back to 2, and says so with a drawn guide.
    const target = element.renderRoot.querySelector(`[data-element="${IDS[0]}"]`)!;
    pointer(target, 'pointerdown', 100, 100);
    pointer(element.renderRoot.querySelector('.stage')!, 'pointermove', 100 + 0.3 * scale, 100);
    await element.updateComplete;

    expect(frameAt(session, 0).x_mm).toBe(2);
    expect(element.renderRoot.querySelector('.guide[data-axis="x"]')).not.toBeNull();
  });

  test('leaves the frame exactly where the pointer put it once snapping is off', async () => {
    const { element, session } = await mount();
    session.select(IDS[0]);
    query(element, '[data-action="snap"]')?.click();
    await element.updateComplete;
    const scale = pixelsPerMm(element);

    const target = element.renderRoot.querySelector(`[data-element="${IDS[0]}"]`)!;
    pointer(target, 'pointerdown', 100, 100);
    pointer(element.renderRoot.querySelector('.stage')!, 'pointermove', 100 + 0.3 * scale, 100);
    await element.updateComplete;

    expect(frameAt(session, 0).x_mm).toBeGreaterThan(2);
    expect(element.renderRoot.querySelector('.guide')).toBeNull();
  });
});

describe('arranging a selection', () => {
  test('aligns the selected elements with each other', async () => {
    const { element, session } = await mount();
    session.apply({
      ...DOCUMENT,
      elements: DOCUMENT.elements.map((item, index) =>
        index === 1 ? { ...item, frame: { ...item.frame, x_mm: 6 } } : item
      ),
    });
    session.selectMany([IDS[0], IDS[1]]);
    await element.updateComplete;

    query(element, '[data-align="left"]')?.click();
    await element.updateComplete;

    expect(frameAt(session, 1).x_mm).toBe(frameAt(session, 0).x_mm);
  });

  test('offers distribution only once there are three gaps to equalize', async () => {
    const { element, session } = await mount();
    session.selectMany([IDS[0], IDS[1]]);
    await element.updateComplete;

    expect(
      element.renderRoot.querySelector<HTMLButtonElement>('[data-distribute="vertical"]')?.disabled
    ).toBe(true);

    session.selectMany([IDS[0], IDS[1], IDS[2]]);
    await element.updateComplete;
    expect(
      element.renderRoot.querySelector<HTMLButtonElement>('[data-distribute="vertical"]')?.disabled
    ).toBe(false);
  });

  test('moves a selection through the paint order, which is the array order', async () => {
    const { element, session } = await mount();
    session.select(IDS[0]);
    await element.updateComplete;

    query(element, '[data-order="front"]')?.click();
    await element.updateComplete;

    expect(session.state.document.elements[session.state.document.elements.length - 1].id).toBe(
      IDS[0]
    );
  });

  test('changes the paint order from the keyboard too', async () => {
    const { element, session } = await mount();
    session.select(IDS[0]);
    await element.updateComplete;

    press(element, ']');
    await element.updateComplete;

    expect(session.state.document.elements[1].id).toBe(IDS[0]);
  });
});

describe('adding, duplicating and removing', () => {
  test('adds one element of each of the four variants', async () => {
    const { element, session } = await mount();

    for (const kind of ['text', 'logo', 'qr', 'divider']) {
      const before = session.state.document.elements.length;
      element.renderRoot.querySelector<HTMLButtonElement>(`[data-add="${kind}"]`)?.click();
      await element.updateComplete;
      expect(session.state.document.elements).toHaveLength(before + 1);
      expect(session.state.document.elements.at(-1)?.kind).toBe(kind);
      expect(session.state.selectedIds).toEqual([session.state.document.elements.at(-1)?.id]);
    }
  });

  test('duplicates the selection and leaves the copies selected', async () => {
    const { element, session } = await mount();
    session.selectMany([IDS[0], IDS[1]]);
    await element.updateComplete;

    query(element, '[data-action="duplicate"]')?.click();
    await element.updateComplete;

    expect(session.state.document.elements).toHaveLength(IDS.length + 2);
    expect(session.state.selectedIds).toHaveLength(2);
    expect(session.state.selectedIds).not.toContain(IDS[0]);
  });

  test('duplicates from Ctrl+D as well as from the toolbar', async () => {
    const { element, session } = await mount();
    session.select(IDS[1]);
    await element.updateComplete;

    press(element, 'd', { ctrlKey: true });
    await element.updateComplete;

    expect(session.state.document.elements).toHaveLength(IDS.length + 1);
  });

  test('says plainly when a deletion takes the layout below what it needs', async () => {
    // The strain-name element is what every publishable layout has. Deleting
    // it is allowed -- the backend's own check is the authority on whether a
    // layout publishes -- but it is not allowed to be silent.
    const { element, session } = await mount();
    session.select(IDS[0]);
    await element.updateComplete;

    press(element, 'Delete');
    await element.updateComplete;

    expect(query(element, '[data-role="announcement"]')?.textContent).toContain(
      'cannot be published'
    );
  });

  test('brings a deleted element back with undo', async () => {
    const { element, session } = await mount();
    session.select(IDS[1]);
    await element.updateComplete;

    press(element, 'Delete');
    await element.updateComplete;
    expect(session.state.document.elements).toHaveLength(IDS.length - 1);

    session.undo();
    expect(session.state.document.elements.map((item) => item.id)).toEqual(IDS);
  });
});

describe('reset', () => {
  test('goes back to the layout the draft opened with, and undo reverses that', async () => {
    const { element, session } = await mount();
    session.select(IDS[0]);
    await element.updateComplete;
    press(element, 'ArrowRight');
    await element.updateComplete;
    const moved = frameAt(session, 0).x_mm;

    query(element, '[data-action="reset"]')?.click();
    await element.updateComplete;
    expect(frameAt(session, 0).x_mm).toBe(DOCUMENT.elements[0].frame.x_mm);

    session.undo();
    expect(frameAt(session, 0).x_mm).toBe(moved);
  });

  test('is unavailable while there is nothing to go back from', async () => {
    const { element } = await mount();

    expect(
      element.renderRoot.querySelector<HTMLButtonElement>('[data-action="reset"]')?.disabled
    ).toBe(true);
  });
});

describe('the keyboard', () => {
  test('nudges every selected element, by half a millimetre and by two with Shift', async () => {
    const { element, session } = await mount();
    session.selectMany([IDS[0], IDS[2]]);
    await element.updateComplete;
    const before = [frameAt(session, 0).y_mm, frameAt(session, 2).y_mm];

    press(element, 'ArrowDown');
    expect(frameAt(session, 0).y_mm).toBe(before[0] + 0.5);
    expect(frameAt(session, 2).y_mm).toBe(before[1] + 0.5);

    press(element, 'ArrowDown', { shiftKey: true });
    expect(frameAt(session, 0).y_mm).toBe(before[0] + 2.5);
  });

  test('selects nothing on Escape', async () => {
    const { element, session } = await mount();
    session.selectMany([IDS[0], IDS[1]]);
    await element.updateComplete;

    press(element, 'Escape');
    expect(session.state.selectedIds).toEqual([]);
  });

  test('leaves Backspace to the exact controls, which need it for digits', async () => {
    const { element, session } = await mount();
    await inspectorReady(element);
    const field = inspect<HTMLInputElement>(element, '[data-field="x_mm"]')!;

    field.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, composed: true })
    );
    await element.updateComplete;

    expect(session.state.document.elements).toHaveLength(IDS.length);
  });
});

describe('zoom', () => {
  test('magnifies the stage without widening the page', async () => {
    const { element } = await mount();
    const before = element.renderRoot.querySelector('.stage')!.getBoundingClientRect().width;

    query(element, '[data-action="zoom-in"]')?.click();
    await element.updateComplete;
    const after = element.renderRoot.querySelector('.stage')!.getBoundingClientRect().width;

    expect(after).toBeGreaterThan(before);
    expect(query(element, '[data-role="zoom"]')?.textContent?.trim()).toBe('150%');
    const scroll = element.renderRoot.querySelector('.stage-scroll')!;
    expect(scroll.getBoundingClientRect().width).toBeLessThanOrEqual(
      element.getBoundingClientRect().width
    );
  });

  test('changes nothing about what a drag means, because millimetres are measured', async () => {
    // The whole reason the editor never reads a zoom level: the map from
    // pixels to millimetres is the stage's own measured box, so magnifying
    // it moves both sides of the ratio.
    const { element, session } = await mount();
    session.select(IDS[0]);
    query(element, '[data-action="zoom-in"]')?.click();
    await element.updateComplete;
    const scale = pixelsPerMm(element);
    const before = frameAt(session, 0).x_mm;

    const target = element.renderRoot.querySelector(`[data-element="${IDS[0]}"]`)!;
    pointer(target, 'pointerdown', 100, 100);
    pointer(element.renderRoot.querySelector('.stage')!, 'pointermove', 100 + 4 * scale, 100);
    await element.updateComplete;

    expect(frameAt(session, 0).x_mm).toBeCloseTo(before + 4, 1);
  });
});
