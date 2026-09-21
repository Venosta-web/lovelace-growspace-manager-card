/**
 * What the user has, what the server has, and what the picture is of.
 *
 * The session's whole job is keeping those three apart, so these are tests
 * about arithmetic and ordering rather than about a rendered component: a
 * drag coalescing into one undo step, a save that raced another client, and a
 * raster that came back describing a layout the user has already moved past.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LabelDocument, TemplateDraft } from '../../../slices/labels/draft-schema';
import type { ManagementLibrary } from '../../../slices/labels/management';
import { DraftSession, publishBlockedBy } from './draft-session';

const { autosave, preview, publish, discard, open } = vi.hoisted(() => ({
  autosave: vi.fn(),
  preview: vi.fn(),
  publish: vi.fn(),
  discard: vi.fn(),
  open: vi.fn(),
}));

vi.mock('../../../slices/labels/drafts', () => ({
  autosaveLabelTemplateDraft: autosave,
  previewLabelTemplateDraft: preview,
  publishLabelTemplateDraft: publish,
  discardLabelTemplateDraft: discard,
  openLabelTemplateDraft: open,
}));

const STOCK = { widthMm: 50, heightMm: 30 };
const ADDRESS = { labelSizeId: 'growspace.stock.50x30.v1' };

const DOCUMENT: LabelDocument = {
  schema: 'growspace.label-layout',
  version: 1,
  label_size_id: 'growspace.stock.50x30.v1',
  elements: [
    {
      id: 'name',
      kind: 'text',
      frame: { x_mm: 2, y_mm: 2, width_mm: 20, height_mm: 8 },
      rotation: 0,
      content: { binding: 'strain.name', parameters: {} },
      style: {
        font: 'growspace.sans.bold.v1',
        font_size_mm: 5.6,
        horizontal_align: 'left',
        vertical_align: 'center',
        line_spacing: 'growspace.spacing.compact.v1',
        overflow: 'shrink_ellipsis',
        minimum_font_size_mm: 3,
        maximum_lines: 2,
      },
    },
  ],
};

function draftAt(version: number, document: LabelDocument = DOCUMENT): TemplateDraft {
  return {
    id: 'draft-1',
    owner: 'admin',
    label_size_id: DOCUMENT.label_size_id,
    template_id: null,
    base_revision: null,
    version,
    name: 'Bench label',
    document,
    layout_schema_version: 1,
    created_at: '2026-09-18T00:00:00+00:00',
    modified_at: '2026-09-18T00:00:00+00:00',
    provenance: {
      source: 'factory',
      factory_id: 'growspace.factory.50x30',
      factory_revision: 1,
      source_template_id: null,
      source_revision: null,
      draft_id: null,
      draft_version: null,
    },
    recovery: null,
  };
}

const VALID = { operation: 'publish', allowed: true, diagnostics: [] };

/** A session whose debounce never fires on its own, so saves are explicit. */
function session(): DraftSession {
  const built = new DraftSession(ADDRESS, STOCK, DOCUMENT, {
    schedule: (() => null) as never,
  });
  built.adopt(draftAt(1), VALID);
  return built;
}

const FRAME = { x_mm: 6, y_mm: 2, width_mm: 20, height_mm: 8 };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('undo and redo cover editor commands', () => {
  it('coalesces one continuous drag into a single step', () => {
    // Otherwise undo walks back one mouse position at a time, which is not
    // what anybody means by undoing a drag.
    const editor = session();

    editor.moveElement('name', { ...FRAME, x_mm: 3 }, 'drag-1');
    editor.moveElement('name', { ...FRAME, x_mm: 4 }, 'drag-1');
    editor.moveElement('name', { ...FRAME, x_mm: 5 }, 'drag-1');
    editor.undo();

    expect(editor.state.document.elements[0].frame.x_mm).toBe(2);
    expect(editor.state.canUndo).toBe(false);
  });

  it('starts a new step once the gesture ends', () => {
    const editor = session();

    editor.moveElement('name', { ...FRAME, x_mm: 4 }, 'drag-1');
    editor.endGesture();
    editor.moveElement('name', { ...FRAME, x_mm: 9 }, 'drag-1');
    editor.undo();

    expect(editor.state.document.elements[0].frame.x_mm).toBe(4);
  });

  it('redoes what it undid, and forgets the redo once something new happens', () => {
    const editor = session();

    editor.moveElement('name', FRAME);
    editor.undo();
    editor.redo();
    expect(editor.state.document.elements[0].frame.x_mm).toBe(6);

    editor.undo();
    editor.moveElement('name', { ...FRAME, x_mm: 12 });
    expect(editor.state.canRedo).toBe(false);
  });

  it('is reset by adopting a different draft, which has its own history', () => {
    const editor = session();
    editor.moveElement('name', FRAME);

    editor.adopt(draftAt(4), VALID);

    expect(editor.state.canUndo).toBe(false);
    expect(editor.state.dirty).toBe(false);
  });
});

describe('durable autosave', () => {
  it('sends the draft version, so a second client cannot be overwritten', async () => {
    const editor = session();
    autosave.mockResolvedValue({
      outcome: 'ok',
      draft: draftAt(2),
      validation: VALID,
      stale: false,
    });
    editor.moveElement('name', FRAME);

    await editor.save();

    expect(autosave).toHaveBeenCalledWith(
      ADDRESS,
      expect.anything(),
      expect.objectContaining({ expectedVersion: 1 })
    );
    expect(editor.state.dirty).toBe(false);
    expect(editor.state.draft?.version).toBe(2);
  });

  it('stays dirty when an edit landed while the save was in flight', async () => {
    // The stored draft does not contain that edit, so calling it saved would
    // be the one lie that loses work silently.
    const editor = session();
    let release: (value: unknown) => void = () => {};
    autosave.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    editor.moveElement('name', FRAME);
    const saving = editor.save();
    editor.moveElement('name', { ...FRAME, x_mm: 9 });
    release({ outcome: 'ok', draft: draftAt(2), validation: VALID, stale: false });
    await saving;

    expect(editor.state.dirty).toBe(true);
  });

  it('keeps the refusal, and the local work, when another client wrote first', async () => {
    const editor = session();
    const kept = draftAt(2, DOCUMENT);
    autosave.mockResolvedValue({
      outcome: 'refused',
      refusal: {
        code: 'label_template.draft_version_conflict',
        reason: 'newer',
        recovery: 'reload_draft',
        current: { family: 'f', major: 1, minor: 0, generation: 3 },
        draft: kept,
      },
    });
    editor.moveElement('name', FRAME);

    await editor.save();

    // Not overwritten, not retried, not discarded: the user's document is
    // still here and the refusal says what to do about it.
    expect(editor.state.document.elements[0].frame.x_mm).toBe(6);
    expect(editor.state.refusal?.recovery).toBe('reload_draft');
    expect(editor.state.draft?.version).toBe(1);
  });

  it('carries a name only for an untitled draft', async () => {
    const editor = session();
    autosave.mockResolvedValue({
      outcome: 'ok',
      draft: draftAt(2),
      validation: VALID,
      stale: false,
    });

    editor.setName('Bench label');
    await editor.save();

    expect(autosave.mock.calls[0][2]).toMatchObject({ name: 'Bench label' });
  });

  it('keeps local work recoverable when the transport fails', async () => {
    const editor = session();
    autosave.mockRejectedValue(new Error('socket closed'));
    editor.moveElement('name', FRAME);

    await editor.save();

    expect(editor.state.document.elements[0].frame).toEqual(FRAME);
    expect(editor.state.dirty).toBe(true);
    expect(editor.state.saving).toBe(false);
    expect(editor.state.refusal?.reason).toBe('socket closed');
  });
});

describe('the settle rule', () => {
  it('leaves the raster stale until a render of the current version arrives', async () => {
    const editor = session();
    preview.mockResolvedValue({
      outcome: 'ok',
      draft_version: 1,
      render: { raster: { image: 'data:,' } },
    });

    await editor.render();
    expect(editor.state.rasterStanding).toBe('settled');

    editor.moveElement('name', FRAME);
    expect(editor.state.rasterStanding).toBe('stale');
  });

  it('does not settle a render of a version the draft has passed', async () => {
    const editor = session();
    preview.mockResolvedValue({
      outcome: 'ok',
      draft_version: 1,
      render: { raster: { image: 'data:,' } },
    });
    await editor.render();

    // A save moves the draft on; the raster is still of version 1.
    autosave.mockResolvedValue({
      outcome: 'ok',
      draft: draftAt(2),
      validation: VALID,
      stale: false,
    });
    editor.moveElement('name', FRAME);
    await editor.save();

    expect(editor.state.rasterStanding).toBe('stale');
  });

  it('does not show a version mismatch to the user', async () => {
    // It is the mechanism working, not something they did: they edited while
    // a render was in flight, and another render is already on its way.
    const editor = session();
    preview.mockResolvedValue({
      outcome: 'refused',
      refusal: {
        code: 'label_template.draft_version_mismatch',
        reason: 'moved on',
        recovery: 'reload_draft',
        current: { family: 'f', major: 1, minor: 0, generation: 3 },
      },
    });

    await editor.render();

    expect(editor.state.refusal).toBeNull();
    expect(editor.state.rasterStanding).toBe('absent');
  });

  it('does show a refusal the user has to answer', async () => {
    const editor = session();
    preview.mockResolvedValue({
      outcome: 'refused',
      refusal: {
        code: 'label_template.draft_not_publishable',
        reason: 'off the paper',
        recovery: 'fix_layout',
        current: { family: 'f', major: 1, minor: 0, generation: 3 },
      },
    });

    await editor.render();

    expect(editor.state.refusal?.code).toBe('label_template.draft_not_publishable');
  });

  it('reports a thrown transport failure rather than swallowing it', async () => {
    const editor = session();
    preview.mockRejectedValue(new Error('socket closed'));

    await editor.render();

    expect(editor.state.refusal?.reason).toBe('socket closed');
    expect(editor.state.rendering).toBe(false);
  });
});

describe('what stops a publication', () => {
  it('names each reason separately rather than one disabled button', () => {
    const editor = session();

    editor.moveElement('name', FRAME);
    expect(publishBlockedBy(editor.state)).toBe('unsaved');
  });

  it('refuses to publish against a raster of a layout that has moved on', async () => {
    // Every other clause passes here: saved, valid, current, named. The
    // picture is of an older layout, and approving that is approving
    // something the user has not looked at.
    const editor = session();
    preview.mockResolvedValue({
      outcome: 'ok',
      draft_version: 1,
      render: { raster: { image: 'data:,' } },
    });
    await editor.render();
    autosave.mockResolvedValue({
      outcome: 'ok',
      draft: draftAt(2),
      validation: VALID,
      stale: false,
    });
    editor.moveElement('name', FRAME);
    await editor.save();

    expect(publishBlockedBy(editor.state)).toBe('stale_preview');
  });

  it('does not block on a render this installation simply cannot produce', async () => {
    // The backend's own publication gate is the document layer alone, and
    // deliberately excludes every profile-relative judgement: a revision is
    // meant to print on a printer nobody has bought yet. An installation with
    // no printer integration must still be able to save a good design.
    const editor = session();
    preview.mockResolvedValue({
      outcome: 'ok',
      draft_version: 1,
      render: { status: 'failed', raster: null, diagnostics: [] },
    });

    await editor.render();

    expect(editor.state.rasterStanding).toBe('absent');
    expect(publishBlockedBy(editor.state)).toBeNull();
  });

  it('blocks an invalid layout and says so in its own words', () => {
    const editor = session();
    editor.adopt(draftAt(1), {
      operation: 'publish',
      allowed: false,
      diagnostics: [
        {
          code: 'frame.outside_stock',
          message: 'off the paper',
          severity: 'error',
          layer: 'document',
          path: '',
          element_id: 'name',
          recovery: 'edit',
          parameters: {},
        },
      ],
    });

    expect(publishBlockedBy(editor.state)).toBe('invalid');
  });

  it('blocks a stale draft without touching it', () => {
    const editor = session();
    editor.adopt(draftAt(1), VALID, true);

    expect(publishBlockedBy(editor.state)).toBe('stale');
    expect(editor.state.document).toEqual(DOCUMENT);
  });

  it('blocks an untitled draft with no name', () => {
    const editor = session();
    editor.adopt({ ...draftAt(1), name: null }, VALID);

    expect(publishBlockedBy(editor.state)).toBe('unnamed');
  });

  it('publishes once nothing blocks it', async () => {
    const editor = session();
    preview.mockResolvedValue({
      outcome: 'ok',
      draft_version: 1,
      render: { raster: { image: 'data:,' } },
    });
    await editor.render();
    publish.mockResolvedValue({
      outcome: 'ok',
      template: { id: 'uuid', name: 'Bench label' },
      revision: { revision: 1 },
    });

    expect(publishBlockedBy(editor.state)).toBeNull();
    await expect(editor.publish()).resolves.toEqual({ templateId: 'uuid', name: 'Bench label' });
    expect(publish).toHaveBeenCalledWith(ADDRESS, 'draft-1', 1);
  });
});

describe('recovering', () => {
  it('makes an orphaned draft read-only without replacing its local document', () => {
    const editor = session();
    const bound = { ...draftAt(1), template_id: 'template-1', base_revision: 1 };
    editor.adopt(bound, VALID);
    const library = {
      store: { readable: true },
      templates: [],
      drafts: [{ ...bound, stale: false, orphaned: true, head_revision: null }],
    } as unknown as ManagementLibrary;

    editor.observeLibrary(library);
    editor.moveElement('name', FRAME);

    expect(editor.state.orphaned).toBe(true);
    expect(editor.state.readOnly).toBe(true);
    expect(editor.state.document).toEqual(DOCUMENT);
    expect(publishBlockedBy(editor.state)).toBe('read_only');
  });

  it('turns a newer client save into an explicit reload conflict', () => {
    const editor = session();
    editor.observeLibrary({
      store: { readable: true },
      templates: [],
      drafts: [{ ...draftAt(2), stale: false, orphaned: false, head_revision: null }],
    } as unknown as ManagementLibrary);

    expect(editor.state.refusal?.code).toBe('label_template.draft_version_conflict');
    expect(publishBlockedBy(editor.state)).toBe('conflict');
  });

  it('becomes read-only when administrator authorization is lost', () => {
    const editor = session();
    editor.refuse({
      code: 'label_template.not_authorized',
      reason: 'administrator required',
      recovery: 'sign_in_as_admin',
      current: { family: 'f', major: 1, minor: 0, generation: 3 },
    });

    expect(editor.state.readOnly).toBe(true);
    expect(publishBlockedBy(editor.state)).toBe('read_only');
  });

  it('reloads the server copy and clears the refusal', async () => {
    const editor = session();
    open.mockResolvedValue({ outcome: 'ok', draft: draftAt(5), resumed: true });
    editor.moveElement('name', FRAME);

    await editor.reload();

    expect(editor.state.draft?.version).toBe(5);
    expect(editor.state.refusal).toBeNull();
    expect(editor.state.canUndo).toBe(false);
  });

  it('hands back the draft a discard removed, so an undo is still possible', async () => {
    const editor = session();
    discard.mockResolvedValue({ outcome: 'ok', draft: draftAt(3) });

    await expect(editor.discard()).resolves.toMatchObject({ version: 3 });
  });

  it('stops scheduling once closed', () => {
    const editor = session();
    editor.close();
    editor.moveElement('name', FRAME);

    expect(editor.state.dirty).toBe(true);
  });
});

describe('the selection', () => {
  it('is a list, because alignment and ordering are operations on several', () => {
    const editor = session();
    const second = { ...DOCUMENT.elements[0], id: 'other' };
    editor.apply({ ...DOCUMENT, elements: [...DOCUMENT.elements, second] });

    editor.selectMany(['name', 'other']);
    expect(editor.state.selectedIds).toEqual(['name', 'other']);

    // And `select` is the replacing verb, not an adding one.
    editor.select('other');
    expect(editor.state.selectedIds).toEqual(['other']);
  });

  it('follows the element picked last, which is what the inspector edits', () => {
    const editor = session();
    const second = { ...DOCUMENT.elements[0], id: 'other' };
    editor.apply({ ...DOCUMENT, elements: [...DOCUMENT.elements, second] });

    editor.select('name');
    editor.toggleSelected('other');

    expect(editor.state.selectedIds).toEqual(['name', 'other']);
    expect(editor.state.selectedId).toBe('other');
  });

  it('takes an element back out again on a second toggle', () => {
    const editor = session();
    editor.select('name');
    editor.toggleSelected('name');

    expect(editor.state.selectedIds).toEqual([]);
    expect(editor.state.selectedId).toBeNull();
  });

  it('forgets an element the document no longer has', () => {
    // A toolbar acting on an id nothing answers to would look as though it
    // acted. Deleting, and undoing past a duplication, both produce this.
    const editor = session();
    editor.select('name');
    editor.apply({ ...DOCUMENT, elements: [] });

    expect(editor.state.selectedIds).toEqual([]);
  });
});

describe('reset', () => {
  it('goes back to the document the session opened with', () => {
    const editor = session();
    editor.moveElement('name', FRAME);
    expect(editor.isReset).toBe(false);

    editor.reset();

    expect(editor.state.document).toEqual(DOCUMENT);
    expect(editor.isReset).toBe(true);
  });

  it('is an ordinary command, so undo reverses it', () => {
    const editor = session();
    editor.moveElement('name', FRAME);
    editor.reset();

    editor.undo();

    expect(editor.state.document.elements[0].frame).toEqual(FRAME);
  });

  it('goes back to resumed work rather than past it to the shipped layout', () => {
    // A draft that resumed unsaved work opened onto that work. Reaching past
    // it to the Factory Template would be a second, silent discard.
    const editor = session();
    const resumed = { ...DOCUMENT, elements: [{ ...DOCUMENT.elements[0], frame: FRAME }] };
    editor.adopt({ ...draftAt(2), document: resumed }, VALID);
    editor.moveElement('name', { ...FRAME, x_mm: 12 });

    editor.reset();

    expect(editor.state.document).toEqual(resumed);
  });
});

describe('one command per operation', () => {
  it('treats a change to several elements as one undo step', () => {
    const editor = session();
    const moved = {
      ...DOCUMENT,
      elements: DOCUMENT.elements.map((element) => ({ ...element, frame: FRAME })),
    };

    editor.apply(moved);
    editor.undo();

    expect(editor.state.document).toEqual(DOCUMENT);
  });

  it('carries the selection an operation produced, in the same emission', () => {
    // Duplication selects the copies. Doing that in a second call would leave
    // one render where the selection and the document disagreed.
    const editor = session();
    const seen: string[][] = [];
    editor.subscribe((state) => seen.push([...state.selectedIds]));

    editor.apply({ ...DOCUMENT, elements: [{ ...DOCUMENT.elements[0], id: 'copy' }] }, null, [
      'copy',
    ]);

    expect(seen[seen.length - 1]).toEqual(['copy']);
  });

  it('ignores a document that is the one it already holds', () => {
    const editor = session();
    editor.apply(editor.state.document);

    expect(editor.state.canUndo).toBe(false);
    expect(editor.state.dirty).toBe(false);
  });
});
