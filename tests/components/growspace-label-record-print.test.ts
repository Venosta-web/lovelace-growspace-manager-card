/**
 * The strain library's single print through a Label Template (hub #242):
 * preview the published revision for the saved strain, print exactly that
 * approval, and answer every refusal with its recovery — never with the
 * Classic `print_label` service.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';

import capabilityFixture from '../fixtures/contract/label_template_capability_v1.json';
import libraryFixture from '../fixtures/contract/label_template_library_v1.json';
import recordPreviewFixture from '../fixtures/contract/label_record_preview_v1.json';
import printedFixture from '../fixtures/contract/label_record_printed_v1.json';
import refusedFixture from '../fixtures/contract/label_print_refused_v1.json';
import { GrowspaceLabelRecordPrint } from '../../src/features/labels/record/growspace-label-record-print';
import type { LabelTemplateCapability } from '../../src/slices/labels';
import { LibraryAnswerSchema } from '../../src/slices/labels/draft-schema';
import {
  PrintedAnswerSchema,
  RecordPreviewAnswerSchema,
} from '../../src/slices/labels/printing-schema';

const mocks = vi.hoisted(() => ({
  preview: vi.fn(),
  print: vi.fn(),
  library: vi.fn(),
  classic: vi.fn(),
  hass: { current: null as unknown },
}));

vi.mock('../../src/slices/labels/printing', () => ({
  previewLabelRecord: mocks.preview,
  printLabelRecord: mocks.print,
}));

vi.mock('../../src/slices/labels/drafts', () => ({
  fetchLabelTemplateLibrary: mocks.library,
}));

// The Classic service, watched: nothing in this view may reach it.
vi.mock('../../src/slices/plant', () => ({ printLabel: mocks.classic }));

vi.mock('../../src/services/hass-call', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getHass: () => mocks.hass.current,
}));

if (!customElements.get('growspace-label-record-print')) {
  customElements.define('growspace-label-record-print', GrowspaceLabelRecordPrint);
}

const CAPABILITY = capabilityFixture as unknown as LabelTemplateCapability;
const PRINTER = 'image.b1_last_label_made';
const PREVIEW = RecordPreviewAnswerSchema.parse(recordPreviewFixture);
const PRINTED = PrintedAnswerSchema.parse(printedFixture);
if (PREVIEW.outcome !== 'ok' || PRINTED.outcome !== 'ok') throw new Error('fixtures are refusals');

type Preview = typeof PREVIEW;

function preview(change: (preview: Preview) => void = () => {}): Preview {
  const copy = structuredClone(PREVIEW);
  change(copy);
  return copy;
}

/** A library with one published Named Template, which is also the 50×30 default. */
function library(withDefault: boolean) {
  const answer = structuredClone(libraryFixture) as Record<string, any>;
  answer.library.templates = [
    {
      id: 'uuid-bench',
      kind: 'named',
      name: 'Bench label',
      label_size_id: 'growspace.stock.50x30.v1',
      head_revision: 2,
    },
    {
      id: 'uuid-unpublished',
      kind: 'named',
      name: 'Never published',
      label_size_id: 'growspace.stock.50x30.v1',
      head_revision: 0,
    },
  ];
  if (withDefault) {
    answer.library.effective_defaults['growspace.stock.50x30.v1'] = {
      ...answer.library.effective_defaults['growspace.stock.50x30.v1'],
      ref: { kind: 'named', id: 'uuid-bench' },
      name: 'Bench label',
      revision: 2,
      via: 'override',
    };
  }
  return LibraryAnswerSchema.parse(answer);
}

async function mount(
  options: { printers?: boolean; strain?: string; phenotype?: string | null } = {}
): Promise<GrowspaceLabelRecordPrint> {
  mocks.hass.current = {
    user: { is_admin: false },
    states:
      options.printers === false
        ? {}
        : { [PRINTER]: { attributes: { friendly_name: 'B1 Last Label Made' } } },
  };
  const view = await fixture<GrowspaceLabelRecordPrint>(
    '<growspace-label-record-print></growspace-label-record-print>'
  );
  view.capability = structuredClone(CAPABILITY);
  view.strain = options.strain ?? 'Blue Dream';
  view.phenotype = options.phenotype === undefined ? '#1' : options.phenotype;
  await view.updateComplete;
  await vi.waitFor(() => expect(mocks.library).toHaveBeenCalled());
  await view.updateComplete;
  return view;
}

const $ = <T extends HTMLElement = HTMLElement>(
  view: GrowspaceLabelRecordPrint,
  selector: string
) => view.renderRoot.querySelector<T>(selector);

async function click(view: GrowspaceLabelRecordPrint, selector: string) {
  const button = $<HTMLButtonElement>(view, selector);
  expect(button, selector).not.toBeNull();
  expect(button!.disabled, `${selector} is disabled`).toBe(false);
  button!.click();
  await view.updateComplete;
}

async function previewed(view: GrowspaceLabelRecordPrint, answer: unknown = preview()) {
  mocks.preview.mockResolvedValueOnce(answer);
  await click(view, '[data-action="preview"]');
  await vi.waitFor(() =>
    expect($(view, '[data-section="preview"]') ?? $(view, '[data-role="refusal"]')).not.toBeNull()
  );
  await view.updateComplete;
}

async function choose(view: GrowspaceLabelRecordPrint, name: string, value: string) {
  const select = $<HTMLSelectElement>(view, `select[name="${name}"]`)!;
  select.value = value;
  select.dispatchEvent(new Event('change'));
  await view.updateComplete;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.library.mockResolvedValue(library(false));
});

describe('setup', () => {
  test('starts on the Effective Default and offers only published templates', async () => {
    mocks.library.mockResolvedValue(library(true));
    const view = await mount();

    expect($<HTMLSelectElement>(view, 'select[name="template"]')!.value).toBe('named:uuid-bench');
    const options = [...view.renderRoot.querySelectorAll('select[name="template"] option')].map(
      (option) => (option as HTMLOptionElement).value
    );
    expect(options).toContain('factory:growspace.factory.50x30');
    expect(options).not.toContain('named:uuid-unpublished');
    expect($<HTMLSelectElement>(view, 'select[name="printer"]')!.value).toBe(PRINTER);
  });

  test('falls back to the Factory Templates when the library cannot be read', async () => {
    mocks.library.mockRejectedValue(new Error('offline'));
    const view = await mount();

    expect($<HTMLSelectElement>(view, 'select[name="template"]')!.value).toBe(
      `factory:${CAPABILITY.catalogues.factory_templates[0].id}`
    );
  });

  test('says why nothing can be previewed without a printer', async () => {
    const view = await mount({ printers: false });

    expect($<HTMLButtonElement>(view, '[data-action="preview"]')!.disabled).toBe(true);
    expect($(view, '#record-reason')!.dataset.reason).toBe('no_printer');
    expect($(view, '[data-role="no-printer"]')).not.toBeNull();
  });
});

describe('preview then print', () => {
  test('previews the published template for this saved strain on the chosen printer', async () => {
    mocks.library.mockResolvedValue(library(true));
    const view = await mount();
    await previewed(view);

    expect(mocks.preview).toHaveBeenCalledWith({
      template: { kind: 'named', id: 'uuid-bench' },
      strain: 'Blue Dream',
      phenotype: '#1',
      profileId: expect.any(String),
      deviceId: PRINTER,
    });
    const img = $<HTMLImageElement>(view, '[data-section="preview"] img')!;
    expect(img.src).toBe(PREVIEW.render.raster!.image);
    expect(img.alt).toContain(PREVIEW.subject);
    expect($(view, '[data-role="decision"]')!.dataset.allowed).toBe('true');
    // Keyboard and screen-reader users land on the result they asked for.
    expect(view.renderRoot.activeElement?.id).toBe('record-preview');
  });

  test('prints exactly the approval on screen, and then needs a new preview', async () => {
    const view = await mount();
    await previewed(view);
    mocks.print.mockResolvedValueOnce(PRINTED);
    await click(view, '[data-action="print"]');
    await vi.waitFor(() => expect($(view, '[data-role="printed"]')).not.toBeNull());

    expect(mocks.print).toHaveBeenCalledWith(PREVIEW.approval_id, PREVIEW.render.raster_identity);
    expect($(view, '[data-section="preview"]')).toBeNull();
    expect($(view, '[data-role="status"]')!.textContent).toContain(PRINTED.print.source.reference);
    expect(mocks.classic).not.toHaveBeenCalled();
  });

  test('lists the warnings with the label without stopping the print', async () => {
    const view = await mount();
    await previewed(view);

    const listed = view.renderRoot.querySelectorAll('[data-role="diagnostics"] li');
    expect(listed.length).toBe(
      PREVIEW.render.diagnostics.filter((item) => item.severity === 'warning').length
    );
    expect($<HTMLButtonElement>(view, '[data-action="print"]')!.disabled).toBe(false);
  });

  test("names each blocking problem before the advice, in the card's own words", async () => {
    const view = await mount();
    await previewed(
      view,
      preview((copy) => {
        copy.decision = { ...copy.decision, allowed: false, blocked_by: ['blocking_diagnostics'] };
        copy.render.diagnostics = [
          ...copy.render.diagnostics,
          {
            ...copy.render.diagnostics[0],
            code: 'raster.render_failed',
            layer: 'raster',
            severity: 'error',
            message: 'BACKEND ENGLISH',
          },
        ];
      })
    );

    const listed = [
      ...view.renderRoot.querySelectorAll<HTMLElement>('[data-role="diagnostics"] li'),
    ];
    expect(listed[0].dataset.severity).toBe('error');
    expect(listed.every((item) => !item.textContent!.includes('BACKEND ENGLISH'))).toBe(true);
  });

  test('a blocked preview names every reason and its recovery, and cannot print', async () => {
    const view = await mount();
    await previewed(
      view,
      preview((copy) => {
        copy.decision = {
          ...copy.decision,
          allowed: false,
          blocked_by: ['profile_not_product_verified', 'local_calibration_missing'],
        };
        copy.recovery = 'calibrate';
      })
    );

    const blockers = [...view.renderRoot.querySelectorAll('[data-role="blockers"] li')].map(
      (item) => (item as HTMLElement).dataset.blocker
    );
    expect(blockers).toEqual(['profile_not_product_verified', 'local_calibration_missing']);
    expect($<HTMLButtonElement>(view, '[data-action="print"]')!.disabled).toBe(true);
    expect($(view, '[data-action="print"]')!.getAttribute('aria-describedby')).toBe(
      'record-blocked'
    );
    expect($(view, '[data-role="guidance"]')!.dataset.recovery).toBe('calibrate');
    expect(mocks.print).not.toHaveBeenCalled();
    expect(mocks.classic).not.toHaveBeenCalled();
  });

  test('changing the setup drops the preview it no longer describes', async () => {
    const view = await mount();
    await previewed(view);
    await choose(view, 'template', 'factory:growspace.factory.40x30');

    expect($(view, '[data-section="preview"]')).toBeNull();
  });

  test('a new strain is a new label', async () => {
    const view = await mount();
    await previewed(view);
    view.strain = 'OG Kush';
    await view.updateComplete;

    expect($(view, '[data-section="preview"]')).toBeNull();
  });
});

describe('refusals never fall back to Classic', () => {
  test('a refused preview shows its recovery and nothing prints', async () => {
    const view = await mount({ strain: 'Unsaved Strain' });
    await previewed(view, {
      outcome: 'refused',
      refusal: {
        code: 'label_template.unknown_subject',
        reason: 'BACKEND ENGLISH',
        recovery: 'choose_subject',
        current: CAPABILITY.contract,
      },
    });

    const refusal = $(view, '[data-role="refusal"]')!;
    expect(refusal.getAttribute('role')).toBe('alert');
    expect(refusal.textContent).not.toContain('BACKEND ENGLISH');
    expect($(view, '[data-role="guidance"]')!.dataset.recovery).toBe('choose_subject');
    expect(mocks.print).not.toHaveBeenCalled();
    expect(mocks.classic).not.toHaveBeenCalled();
  });

  test('a refused print is answered by previewing again, never by printing again', async () => {
    const view = await mount();
    await previewed(view);
    mocks.print.mockResolvedValueOnce(refusedFixture);
    await click(view, '[data-action="print"]');
    await vi.waitFor(() => expect($(view, '[data-role="refusal"]')).not.toBeNull());

    expect($(view, '[data-section="preview"]')).toBeNull();
    const recover = $<HTMLButtonElement>(view, '[data-action="recover"]')!;
    expect(recover.dataset.recovery).toBe('refresh_preview');

    mocks.preview.mockResolvedValueOnce(preview());
    recover.click();
    await vi.waitFor(() => expect($(view, '[data-section="preview"]')).not.toBeNull());
    expect(mocks.preview).toHaveBeenCalledTimes(2);
    expect(mocks.print).toHaveBeenCalledTimes(1);
    expect(mocks.classic).not.toHaveBeenCalled();
  });

  test('a lost connection is a refusal to retry by hand, not a Classic print', async () => {
    const view = await mount();
    await previewed(view);
    mocks.print.mockRejectedValueOnce(new Error('socket closed'));
    await click(view, '[data-action="print"]');
    await vi.waitFor(() => expect($(view, '[data-role="refusal"]')).not.toBeNull());

    expect($(view, '[data-role="refusal"]')!.dataset.code).toBe('label_template.transport_failed');
    expect($(view, '[data-action="recover"]')!.dataset.recovery).toBe('retry_print');
    expect(mocks.print).toHaveBeenCalledTimes(1);
    expect(mocks.classic).not.toHaveBeenCalled();
  });

  test('a setup recovery takes the user to the control it names', async () => {
    const view = await mount();
    await previewed(view, {
      outcome: 'refused',
      refusal: {
        code: 'label_template.template_not_found',
        reason: 'gone',
        recovery: 'choose_template',
        current: CAPABILITY.contract,
      },
    });
    await click(view, '[data-action="recover"]');

    expect(view.renderRoot.activeElement).toBe($(view, 'select[name="template"]'));
  });
});
