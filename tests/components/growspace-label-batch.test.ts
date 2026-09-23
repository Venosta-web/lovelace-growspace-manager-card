/**
 * The batch view: review opens where the problems are, consent is to one
 * exact review, progress names every copy, and retry sends only the failures.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';

import capabilityFixture from '../fixtures/contract/label_template_capability_v1.json';
import preflightFixture from '../fixtures/contract/label_batch_preflight_v1.json';
import refusedFixture from '../fixtures/contract/label_batch_refused_v1.json';
import startedFixture from '../fixtures/contract/label_batch_started_v1.json';
import jobFixture from '../fixtures/contract/label_batch_job_v1.json';
import retryFixture from '../fixtures/contract/label_batch_retry_v1.json';
import { GrowspaceLabelBatch } from '../../src/features/labels/batch/growspace-label-batch';
import type { LabelTemplateCapability } from '../../src/slices/labels';
import {
  BatchPreflightAnswerSchema,
  type BatchPreflightAnswer,
} from '../../src/slices/labels/batch-schema';

const mocks = vi.hoisted(() => ({
  preflight: vi.fn(),
  print: vi.fn(),
  job: vi.fn(),
  retry: vi.fn(),
  library: vi.fn(),
  hass: { current: null as unknown },
}));

vi.mock('../../src/slices/labels/batch', () => ({
  MAX_BATCH_COPIES: 10,
  preflightLabelBatch: mocks.preflight,
  printLabelBatch: mocks.print,
  fetchLabelBatchJob: mocks.job,
  retryLabelBatch: mocks.retry,
}));

vi.mock('../../src/slices/labels/drafts', () => ({
  fetchLabelTemplateLibrary: mocks.library,
}));

vi.mock('../../src/services/hass-call', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getHass: () => mocks.hass.current,
}));

if (!customElements.get('growspace-label-batch')) {
  customElements.define('growspace-label-batch', GrowspaceLabelBatch);
}

const CAPABILITY = capabilityFixture as unknown as LabelTemplateCapability;
const PRINTER = 'image.b1_last_label_made';
const RECORDED = BatchPreflightAnswerSchema.parse(preflightFixture);
if (RECORDED.outcome !== 'ok') throw new Error('fixture is a refusal');
const IDENTITY = RECORDED.preflight.identity;

type Review = Extract<BatchPreflightAnswer, { outcome: 'ok' }>;

function review(change: (review: Review) => void = () => {}): Review {
  const copy = structuredClone(RECORDED) as Review;
  change(copy);
  return copy;
}

async function mount() {
  mocks.hass.current = {
    user: { is_admin: false },
    states: { [PRINTER]: { attributes: { friendly_name: 'B1' } } },
  };
  const view = await fixture<GrowspaceLabelBatch>(
    '<growspace-label-batch></growspace-label-batch>'
  );
  view.capability = structuredClone(CAPABILITY);
  view.plantIds = ['A', 'W'];
  view.describePlant = (id) => `Plant ${id}`;
  await view.updateComplete;
  return view;
}

const $ = <T extends HTMLElement = HTMLElement>(view: GrowspaceLabelBatch, selector: string) =>
  view.renderRoot.querySelector<T>(selector);

async function click(view: GrowspaceLabelBatch, selector: string) {
  const button = $<HTMLButtonElement>(view, selector);
  expect(button, selector).not.toBeNull();
  button!.click();
  await view.updateComplete;
}

async function reviewed(view: GrowspaceLabelBatch, answer: Review = review()) {
  mocks.preflight.mockResolvedValueOnce(answer);
  await click(view, '[data-action="preflight"]');
  await vi.waitFor(() => expect($(view, '[data-section="review"]')).not.toBeNull());
  await view.updateComplete;
}

async function setCopies(view: GrowspaceLabelBatch, copies: number) {
  const input = $<HTMLInputElement>(view, 'input[name="copies"]')!;
  input.value = String(copies);
  input.dispatchEvent(new Event('change'));
  await view.updateComplete;
}

async function acknowledge(view: GrowspaceLabelBatch) {
  const box = $<HTMLInputElement>(view, '[data-role="acknowledge"] input')!;
  box.checked = true;
  box.dispatchEvent(new Event('change'));
  await view.updateComplete;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.library.mockResolvedValue({ outcome: 'refused', refusal: { code: 'x' } });
});

describe('review', () => {
  test('asks for a preflight of the selected plants on the chosen printer', async () => {
    const view = await mount();
    await setCopies(view, 2);
    await reviewed(view);

    expect(mocks.preflight).toHaveBeenCalledWith(
      expect.objectContaining({
        template: { kind: 'factory', id: CAPABILITY.catalogues.factory_templates[0].id },
        plantIds: ['A', 'W'],
        copies: 2,
        deviceId: PRINTER,
      })
    );
    expect(mocks.print).not.toHaveBeenCalled();
  });

  test('opens on the first error, and jumps between errors and warnings', async () => {
    const view = await mount();
    const answer = review((copy) => {
      // Three records: a warning, a clean one, and an error.
      const [first] = copy.preflight.records;
      copy.preflight.records = [0, 1, 2].map((index) => ({
        ...first,
        index,
        subject: ['A', 'B', 'C'][index],
      }));
      const warning = copy.preflight.diagnostics[0];
      copy.preflight.diagnostics = [
        { ...warning, record_index: 0, subject: 'A' },
        {
          ...warning,
          record_index: 2,
          subject: 'C',
          diagnostic: { ...warning.diagnostic, severity: 'error' },
        },
      ];
    });
    await reviewed(view, answer);

    expect($(view, '[data-role="record"]')!.dataset.index).toBe('2');
    expect($(view, '[data-role="record"]')!.dataset.severity).toBe('error');
    expect($<HTMLButtonElement>(view, '[data-action="next-error"]')!.disabled).toBe(true);

    await click(view, '[data-action="next-warning"]');
    expect($(view, '[data-role="record"]')!.dataset.index).toBe('0');
    expect($(view, '[data-role="record"] h4')!.textContent).toContain('Plant A');

    await click(view, '[data-action="next-record"]');
    expect($(view, '[data-role="record"]')!.dataset.severity).toBe('ok');
  });

  test('shows the copy-major print order before anything prints', async () => {
    const view = await mount();
    await reviewed(view);

    const rows = [...view.renderRoot.querySelectorAll<HTMLElement>('[data-role="plan"] li')];
    expect(rows.map((row) => row.textContent!.replace(/\s+/g, ' ').trim())).toEqual([
      'Plant A, copy 1 — Not printed yet',
      'Plant W, copy 1 — Not printed yet',
      'Plant A, copy 2 — Not printed yet',
      'Plant W, copy 2 — Not printed yet',
    ]);
  });

  test('a hard error prevents all output and consent cannot be given', async () => {
    const view = await mount();
    await reviewed(
      view,
      review((copy) => {
        copy.preflight.allowed = false;
        copy.preflight.blocked_by = ['profile_not_product_verified'];
        copy.recovery = 'select_profile';
      })
    );

    expect($(view, '[data-role="blocked"]')!.textContent).toContain(
      'has not passed physical testing'
    );
    expect($<HTMLButtonElement>(view, '[data-action="print"]')!.disabled).toBe(true);
    expect($<HTMLInputElement>(view, '[data-role="acknowledge"] input')!.disabled).toBe(true);
    expect($(view, '[data-action="print-anyway"]')).toBeNull();
  });
});

describe('printing anyway', () => {
  /** Refused only because this printer was never calibrated. */
  const uncalibrated = () =>
    review((copy) => {
      copy.preflight.allowed = false;
      copy.preflight.blocked_by = ['local_calibration_missing'];
      copy.preflight.override_available = true;
      copy.recovery = 'calibrate';
    });

  test('is offered for an unproven printer, after the warnings are acknowledged', async () => {
    const view = await mount();
    await reviewed(view, uncalibrated());
    const anyway = () => $<HTMLButtonElement>(view, '[data-action="print-anyway"]')!;

    expect($(view, '[data-role="blocked"]')!.textContent).toContain(
      'print these labels as they are'
    );
    expect($<HTMLButtonElement>(view, '[data-action="print"]')!.disabled).toBe(true);
    expect(anyway().disabled).toBe(true);

    await acknowledge(view);
    expect(anyway().disabled).toBe(false);
    expect($<HTMLButtonElement>(view, '[data-action="print"]')!.disabled).toBe(true);

    mocks.print.mockResolvedValueOnce(startedFixture);
    mocks.job.mockResolvedValue(jobFixture);
    await click(view, '[data-action="print-anyway"]');
    expect(mocks.print).toHaveBeenCalledWith(RECORDED.preflight_id, IDENTITY, IDENTITY);

    // A retry is the same review, so it carries the same choice.
    await vi.waitFor(() => expect($(view, '[data-role="retry"]')).not.toBeNull(), {
      timeout: 3000,
    });
    mocks.retry.mockResolvedValueOnce(retryFixture);
    await click(view, '[data-action="retry"]');
    const job = (jobFixture as { job: { id: string } }).job;
    expect(mocks.retry).toHaveBeenCalledWith(job.id, IDENTITY, IDENTITY);
  });

  test('is not offered once the setup changed after the review', async () => {
    const view = await mount();
    await reviewed(view, uncalibrated());
    await acknowledge(view);

    await setCopies(view, 3);

    expect($<HTMLButtonElement>(view, '[data-action="print-anyway"]')!.disabled).toBe(true);
  });
});

describe('consent', () => {
  test('is required, and prints under the exact reviewed identity', async () => {
    const view = await mount();
    await reviewed(view);
    const print = () => $<HTMLButtonElement>(view, '[data-action="print"]')!;

    expect(print().disabled).toBe(true);
    expect($(view, '[data-role="acknowledge"]')!.textContent).toContain('all 12 warnings');

    await acknowledge(view);
    expect(print().disabled).toBe(false);

    mocks.print.mockResolvedValueOnce(jobFixture);
    await click(view, '[data-action="print"]');
    expect(mocks.print).toHaveBeenCalledWith(RECORDED.preflight_id, IDENTITY);
  });

  test('is visibly void once the setup changes, and again after a new review', async () => {
    const view = await mount();
    await reviewed(view);
    await acknowledge(view);

    await setCopies(view, 3);
    expect($(view, '[data-role="changed"]')).not.toBeNull();
    expect($<HTMLButtonElement>(view, '[data-action="print"]')!.disabled).toBe(true);

    await reviewed(
      view,
      review((copy) => {
        copy.preflight.identity = 'sha256:the-new-review';
      })
    );
    expect($(view, '[data-role="changed"]')).toBeNull();
    expect($(view, '[data-role="acknowledge"]')!.dataset.state).toBe('stale');
    expect($(view, '[data-role="acknowledgement-stale"]')).not.toBeNull();
    expect($<HTMLButtonElement>(view, '[data-action="print"]')!.disabled).toBe(true);
    expect($<HTMLInputElement>(view, '[data-role="acknowledge"] input')!.checked).toBe(false);
  });

  test('a refused print says why and offers the correction', async () => {
    const view = await mount();
    await reviewed(view);
    await acknowledge(view);
    mocks.print.mockResolvedValueOnce(refusedFixture);

    await click(view, '[data-action="print"]');
    await vi.waitFor(() => expect($(view, '[data-role="refusal"]')).not.toBeNull());

    const refusal = $(view, '[data-role="refusal"]')!;
    expect(refusal.textContent).toContain('Acknowledge the warnings first.');
    expect(refusal.querySelector('[data-action="recover"]')!.textContent).toContain(
      'Acknowledge the warnings'
    );
  });
});

describe('progress and retry', () => {
  test('names every copy as it lands, and retries only the failed one', async () => {
    const view = await mount();
    await reviewed(view);
    await acknowledge(view);
    mocks.print.mockResolvedValueOnce(startedFixture);
    mocks.job.mockResolvedValue(jobFixture);

    await click(view, '[data-action="print"]');
    expect($(view, '[data-section="job"]')!.dataset.state).toBe('running');

    await vi.waitFor(() => expect($(view, '[data-role="retry"]')).not.toBeNull(), {
      timeout: 3000,
    });
    const statuses = [
      ...view.renderRoot.querySelectorAll<HTMLElement>('[data-role="plan"] li'),
    ].map((row) => row.dataset.status);
    expect(statuses).toEqual(['printed', 'failed', 'printed', 'printed']);
    expect($(view, '[data-role="attempt-error"]')!.textContent).toContain('out of labels');
    expect($(view, '[data-role="done"]')!.textContent).toContain('3 labels printed and 1 did not');
    expect($(view, '[data-role="retry"]')!.textContent).toContain(
      'from the same reviewed content and printer settings'
    );

    mocks.retry.mockResolvedValueOnce(retryFixture);
    const job = (jobFixture as { job: { id: string } }).job;
    await click(view, '[data-action="retry"]');
    expect(mocks.retry).toHaveBeenCalledWith(job.id, IDENTITY, null);
    expect($(view, '[data-section="job"]')!.textContent).toContain('Retrying 1 failed labels');
    expect($<HTMLButtonElement>(view, '[data-action="print"]')!.disabled).toBe(true);
  });
});

describe("a plant's own label, as a one-plant batch (hub #243)", () => {
  /** The recorded review, narrowed to plant A alone. */
  function onePlant(copies = 1, change: (review: Review) => void = () => {}): Review {
    return review((copy) => {
      const preflight = copy.preflight;
      preflight.records = preflight.records.filter((record) => record.subject === 'A');
      preflight.diagnostics = preflight.diagnostics.filter((item) => item.subject === 'A');
      preflight.attempts = preflight.attempts
        .filter((attempt) => attempt.subject === 'A' && attempt.copy_index <= copies)
        .map((attempt, position) => ({ ...attempt, position }));
      change(copy);
    });
  }

  async function mountSingle() {
    const view = await mount();
    view.plantIds = ['A'];
    view.single = true;
    await view.updateComplete;
    return view;
  }

  const text = (view: GrowspaceLabelBatch) =>
    (view.renderRoot.textContent ?? '').replace(/\s+/g, ' ');

  test('reviews and prints through the batch routes, worded for one plant', async () => {
    const view = await mountSingle();
    expect($(view, '#batch-setup')!.textContent).toContain("Print this plant's label");
    expect($(view, '[data-action="preflight"]')!.textContent!.trim()).toBe('Review the label');

    await reviewed(view, onePlant());
    expect(mocks.preflight).toHaveBeenCalledWith(
      expect.objectContaining({ plantIds: ['A'], copies: 1, deviceId: PRINTER })
    );

    // Nothing to move between, and nothing that speaks of a batch or of plants.
    expect($(view, '[data-role="navigation"]')).toBeNull();
    expect($(view, '#batch-review')!.textContent).toContain('Review before printing');
    expect($(view, '[data-role="record"] h4')!.textContent).toContain('Plant A');
    expect($(view, '[data-role="acknowledge"]')!.textContent).toContain(
      'all 6 warnings on this label'
    );
    expect(text(view)).not.toMatch(/\bbatch\b|\bplants\b|Plant 1 of/i);

    const print = () => $<HTMLButtonElement>(view, '[data-action="print"]')!;
    expect(print().textContent!.trim()).toBe('Print label');
    expect(print().disabled).toBe(true);
    await acknowledge(view);
    mocks.print.mockResolvedValueOnce(jobFixture);
    await click(view, '[data-action="print"]');
    expect(mocks.print).toHaveBeenCalledWith(RECORDED.preflight_id, IDENTITY);
  });

  test('counts copies, not plants', async () => {
    const view = await mountSingle();
    await setCopies(view, 2);
    expect($(view, '[data-action="preflight"]')!.textContent!.trim()).toBe('Review 2 copies');

    await reviewed(view, onePlant(2));
    const rows = [...view.renderRoot.querySelectorAll<HTMLElement>('[data-role="plan"] li')];
    expect(rows.map((row) => row.textContent!.replace(/\s+/g, ' ').trim())).toEqual([
      'Copy 1 — Not printed yet',
      'Copy 2 — Not printed yet',
    ]);
    expect($(view, '[data-action="print"]')!.textContent!.trim()).toBe('Print 2 copies');
  });

  test('a refused print says why, the way a batch does, without the batch', async () => {
    const view = await mountSingle();
    await reviewed(view, onePlant());
    await acknowledge(view);
    mocks.print.mockResolvedValueOnce(refusedFixture);

    await click(view, '[data-action="print"]');
    await vi.waitFor(() => expect($(view, '[data-role="refusal"]')).not.toBeNull());

    const refusal = $(view, '[data-role="refusal"]')!;
    expect(refusal.textContent).toContain('The label was not printed.');
    expect(refusal.textContent).toContain('Acknowledge the warnings first.');
    expect(refusal.querySelector('[data-action="recover"]')).not.toBeNull();
  });

  test('a blocked label prints nothing and says so for the one label', async () => {
    const view = await mountSingle();
    await reviewed(
      view,
      onePlant(1, (copy) => {
        copy.preflight.allowed = false;
        copy.preflight.blocked_by = ['profile_not_product_verified'];
        copy.recovery = 'select_profile';
      })
    );

    const blocked = $(view, '[data-role="blocked"]')!;
    expect(blocked.textContent).toContain(
      'This label has problems that stop it from printing normally.'
    );
    expect(blocked.textContent).toContain('has not passed physical testing');
    expect($<HTMLButtonElement>(view, '[data-action="print"]')!.disabled).toBe(true);
  });

  test('a plant that is gone is described as that plant', async () => {
    const view = await mountSingle();
    mocks.preflight.mockResolvedValueOnce({
      ...refusedFixture,
      refusal: {
        ...(refusedFixture as { refusal: object }).refusal,
        code: 'label_template.unknown_subject',
        blocked_by: [],
        recovery: 'none',
      },
    });
    await click(view, '[data-action="preflight"]');
    await vi.waitFor(() => expect($(view, '[data-role="refusal"]')).not.toBeNull());

    expect($(view, '[data-role="refusal"]')!.textContent).toContain('This plant no longer exists.');
  });
});
