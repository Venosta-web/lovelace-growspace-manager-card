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
    const before = session.state.document.elements[0].frame.x_mm;

    query(element, '[data-nudge="right"]')?.click();
    await element.updateComplete;

    expect(session.state.document.elements[0].frame.x_mm).toBe(before + 0.5);
  });

  test('clamps a typed value that would push the element off the paper', async () => {
    // 43 mm wide on 50 mm stock leaves 7 mm of travel, and the exact control
    // is held to the same limit a drag is — otherwise the two views of one
    // frame could express different geometry.
    const { element, session } = await mount();
    const field = element.renderRoot.querySelector<HTMLInputElement>('[data-field="x_mm"]')!;

    field.value = '40';
    field.dispatchEvent(new Event('change'));
    await element.updateComplete;

    expect(session.state.document.elements[0].frame.x_mm).toBe(7);
  });

  test('takes an exact millimetre value from the inspector', async () => {
    const { element, session } = await mount();
    const field = element.renderRoot.querySelector<HTMLInputElement>('[data-field="x_mm"]')!;

    field.value = '3.25';
    field.dispatchEvent(new Event('change'));
    await element.updateComplete;

    expect(session.state.document.elements[0].frame.x_mm).toBe(3.25);
  });

  test('quantizes a value finer than the grid rather than sending one back', async () => {
    const { element, session } = await mount();
    const field = element.renderRoot.querySelector<HTMLInputElement>('[data-field="y_mm"]')!;

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
    expect(selected?.querySelectorAll('.handle')).toHaveLength(8);
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
