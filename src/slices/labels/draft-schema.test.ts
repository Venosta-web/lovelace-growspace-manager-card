/**
 * The recorded payloads, parsed by the schemas that will meet them.
 *
 * These fixtures are the backend's own responses, recorded by its test suite
 * and downloaded by the `contract-fixture` job. Parsing them here is the
 * whole point of recording them: a card whose schema drifted from the wire
 * fails in CI rather than in somebody's browser.
 */

import { describe, expect, it } from 'vitest';

import conflictFixture from '../../../tests/fixtures/contract/label_draft_conflict_v1.json';
import openedFixture from '../../../tests/fixtures/contract/label_draft_opened_v1.json';
import previewFixture from '../../../tests/fixtures/contract/label_draft_preview_v1.json';
import publishedFixture from '../../../tests/fixtures/contract/label_draft_published_v1.json';
import savedFixture from '../../../tests/fixtures/contract/label_draft_saved_v1.json';
import libraryFixture from '../../../tests/fixtures/contract/label_template_library_v1.json';
import {
  DRAFT_VERSION_CONFLICT,
  DraftOpenedSchema,
  DraftPreviewSchema,
  DraftPublishedSchema,
  DraftSavedSchema,
  LabelDocumentSchema,
  LibraryAnswerSchema,
} from './draft-schema';

describe('the recorded draft payloads', () => {
  it('parses an opened draft', () => {
    const parsed = DraftOpenedSchema.parse(openedFixture);

    expect(parsed.outcome).toBe('ok');
    if (parsed.outcome !== 'ok') return;
    expect(parsed.resumed).toBe(false);
    expect(parsed.draft.document.elements.length).toBeGreaterThan(0);
  });

  it('parses an autosave, with the reason it cannot yet publish', () => {
    const parsed = DraftSavedSchema.parse(savedFixture);

    expect(parsed.outcome).toBe('ok');
    if (parsed.outcome !== 'ok') return;
    expect(parsed.draft.version).toBe(2);
    expect(parsed.validation.operation).toBe('publish');
  });

  it('parses a version conflict, and finds the refused payload on the draft', () => {
    // The claim the editor makes to its user — "nothing was lost" — is only
    // true because this field is here.
    const parsed = DraftSavedSchema.parse(conflictFixture);

    expect(parsed.outcome).toBe('refused');
    if (parsed.outcome !== 'refused') return;
    expect(parsed.refusal.code).toBe(DRAFT_VERSION_CONFLICT);
    expect(parsed.refusal.recovery).toBe('reload_draft');
  });

  it('parses a draft preview, carrying the version it was rendered from', () => {
    const parsed = DraftPreviewSchema.parse(previewFixture);

    expect(parsed.outcome).toBe('ok');
    if (parsed.outcome !== 'ok') return;
    expect(parsed.draft_version).toBeGreaterThan(0);
    expect(parsed.render.render_context.operation).toBe('preview');
  });

  it('parses a publication', () => {
    const parsed = DraftPublishedSchema.parse(publishedFixture);

    expect(parsed.outcome).toBe('ok');
    if (parsed.outcome !== 'ok') return;
    expect(parsed.revision.revision).toBe(1);
    expect(parsed.template.head_revision).toBe(1);
  });

  it('parses the library snapshot', () => {
    const parsed = LibraryAnswerSchema.parse(libraryFixture);

    expect(parsed.outcome).toBe('ok');
    if (parsed.outcome !== 'ok') return;
    expect(parsed.library.store.readable).toBe(true);
    expect(parsed.library.generation).not.toBeNull();
  });
});

describe('the document schema', () => {
  it('declares every field the backend emits, so a round trip loses nothing', () => {
    // The document goes out again on the next autosave, and zod strips what
    // it does not declare -- so an undeclared `style` would be deleted from
    // the user's own work and refused by the backend's closed schema. ADR
    // 0031's answer is to declare it, not to pass it through: a missing
    // declaration is then a compile error here and a red contract-fixture
    // check in CI, rather than silent data loss in somebody's draft.
    const document = {
      schema: 'growspace.label-layout',
      version: 1,
      label_size_id: 'growspace.stock.50x30.v1',
      elements: [
        {
          id: 'e1',
          kind: 'text',
          frame: { x_mm: 1, y_mm: 1, width_mm: 10, height_mm: 4 },
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
        {
          id: 'e2',
          kind: 'divider',
          frame: { x_mm: 1, y_mm: 6, width_mm: 10, height_mm: 0.4 },
          rotation: 0,
          style: { fill: 'black' },
        },
      ],
    };

    expect(LabelDocumentSchema.parse(document)).toEqual(document);
  });

  it('parses the recorded factory-derived document unchanged', () => {
    // The strongest form of the claim above: the real thing the backend sent.
    const opened = DraftOpenedSchema.parse(openedFixture);
    if (opened.outcome !== 'ok') throw new Error('fixture is a refusal');

    expect(opened.draft.document).toEqual(
      (openedFixture as { draft: { document: unknown } }).draft.document
    );
  });

  it('drops content from a divider rather than failing the whole parse', () => {
    // A divider is a mark, not a container, so the backend never emits one
    // carrying content -- and ADR 0031's inbound policy is strip, not strict,
    // precisely so that an unexpected key cannot blank the card. Nothing is
    // lost: there was nothing there to keep, and the backend is the authority
    // that refuses such a document if one is ever sent.
    const parsed = LabelDocumentSchema.parse({
      schema: 'growspace.label-layout',
      version: 1,
      label_size_id: 'growspace.stock.50x30.v1',
      elements: [
        {
          id: 'e1',
          kind: 'divider',
          frame: { x_mm: 1, y_mm: 1, width_mm: 10, height_mm: 0.4 },
          rotation: 0,
          style: { fill: 'black' },
          content: { literal: 'not allowed' },
        },
      ],
    });

    expect(parsed.elements[0]).not.toHaveProperty('content');
  });

  it('refuses a document missing the geometry the editor edits', () => {
    expect(() =>
      LabelDocumentSchema.parse({
        schema: 'growspace.label-layout',
        version: 1,
        label_size_id: 'growspace.stock.50x30.v1',
        elements: [{ id: 'e1', kind: 'text', rotation: 0 }],
      })
    ).toThrow();
  });
});
