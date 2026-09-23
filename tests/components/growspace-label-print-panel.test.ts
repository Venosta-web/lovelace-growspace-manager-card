/**
 * The print panel: every step says why it is unavailable, every refusal goes
 * somewhere, and nothing is printed that is not the picture on screen.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';

import capabilityFixture from '../fixtures/contract/label_template_capability_v1.json';
import openedFixture from '../fixtures/contract/label_draft_opened_v1.json';
import previewFixture from '../fixtures/contract/label_draft_preview_v1.json';
import statusFixture from '../fixtures/contract/label_calibration_status_v1.json';
import sheetFixture from '../fixtures/contract/label_calibration_sheet_v1.json';
import recordedFixture from '../fixtures/contract/label_calibration_recorded_v1.json';
import recordPreviewFixture from '../fixtures/contract/label_record_preview_v1.json';
import refusedFixture from '../fixtures/contract/label_print_refused_v1.json';
import testPrintFixture from '../fixtures/contract/label_draft_test_print_v1.json';
import { GrowspaceLabelPrintPanel } from '../../src/features/labels/editor/growspace-label-print-panel';
import { DraftSession } from '../../src/features/labels/editor/draft-session';
import type { LabelTemplateCapability } from '../../src/slices/labels';
import { DraftOpenedSchema, DraftPreviewSchema } from '../../src/slices/labels/draft-schema';

const mocks = vi.hoisted(() => ({
  preview: vi.fn(),
  autosave: vi.fn(),
  status: vi.fn(),
  sheet: vi.fn(),
  record: vi.fn(),
  testPrint: vi.fn(),
  recordPreview: vi.fn(),
  print: vi.fn(),
  strains: vi.fn(),
  hass: { current: null as unknown },
}));

vi.mock('../../src/slices/labels/drafts', () => ({
  autosaveLabelTemplateDraft: mocks.autosave,
  previewLabelTemplateDraft: mocks.preview,
  publishLabelTemplateDraft: vi.fn(),
  discardLabelTemplateDraft: vi.fn(),
  openLabelTemplateDraft: vi.fn(),
}));

vi.mock('../../src/slices/labels/printing', () => ({
  fetchCalibrationStatus: mocks.status,
  printCalibrationSheet: mocks.sheet,
  recordCalibration: mocks.record,
  testPrintLabelTemplateDraft: mocks.testPrint,
  previewLabelRecord: mocks.recordPreview,
  printLabelRecord: mocks.print,
}));

vi.mock('../../src/slices/strain', () => ({ fetchStrainLibrary: mocks.strains }));

vi.mock('../../src/services/hass-call', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getHass: () => mocks.hass.current,
}));

if (!customElements.get('growspace-label-print-panel')) {
  customElements.define('growspace-label-print-panel', GrowspaceLabelPrintPanel);
}

const CAPABILITY = capabilityFixture as unknown as LabelTemplateCapability;
const OPENED = DraftOpenedSchema.parse(openedFixture);
const PREVIEW = DraftPreviewSchema.parse(previewFixture);
if (OPENED.outcome !== 'ok' || PREVIEW.outcome !== 'ok') throw new Error('fixtures are refusals');
const SIZE = CAPABILITY.catalogues.label_sizes.find(
  (size) => size.id === OPENED.draft.label_size_id
)!;
const PRINTER = 'image.b1_last_label_made';

function hass(admin: boolean, printers = true) {
  return {
    user: { is_admin: admin },
    states: printers ? { [PRINTER]: { attributes: { friendly_name: 'B1 Last Label Made' } } } : {},
  };
}

async function mount(
  options: { admin?: boolean; printers?: boolean; templateId?: string | null } = {}
) {
  mocks.hass.current = hass(options.admin ?? true, options.printers ?? true);
  const draft = { ...OPENED.draft, template_id: options.templateId ?? null };
  const session = new DraftSession(
    { labelSizeId: draft.label_size_id },
    { widthMm: SIZE.width_mm, heightMm: SIZE.height_mm },
    draft.document,
    { schedule: (() => null) as never }
  );
  session.adopt(draft, { operation: 'publish', allowed: true, diagnostics: [] });
  mocks.preview.mockResolvedValue({ ...PREVIEW, draft_version: draft.version });
  await session.render();

  const panel = await fixture<GrowspaceLabelPrintPanel>(
    '<growspace-label-print-panel></growspace-label-print-panel>'
  );
  panel.capability = structuredClone(CAPABILITY);
  panel.session = session;
  panel.model = session.state;
  session.subscribe((state) => {
    panel.model = state;
  });
  await panel.updateComplete;
  // With no printer there is nothing to ask a calibration about.
  if (options.printers !== false) await vi.waitFor(() => expect(mocks.status).toHaveBeenCalled());
  await panel.updateComplete;
  return { panel, session };
}

const $ = <T extends HTMLElement = HTMLElement>(
  panel: GrowspaceLabelPrintPanel,
  selector: string
) => panel.renderRoot.querySelector<T>(selector);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.status.mockResolvedValue(statusFixture);
  mocks.strains.mockResolvedValue([
    { key: 'Blue Dream|#1', strain: 'Blue Dream', phenotype: '#1' },
  ]);
});

test('measurement problems follow the small type token without changing their default size', async () => {
  const panel = await fixture<GrowspaceLabelPrintPanel>(
    '<growspace-label-print-panel></growspace-label-print-panel>'
  );
  const problem = document.createElement('p');
  problem.className = 'problem';
  panel.renderRoot.append(problem);

  expect(getComputedStyle(problem).fontSize).toBe('13px');
  panel.style.setProperty('--font-size-sm', '16px');
  expect(getComputedStyle(problem).fontSize).toBe('15px');
});

describe('printer and profile', () => {
  test('selects the first printer and the profile for this stock', async () => {
    const { panel, session } = await mount();

    expect($<HTMLSelectElement>(panel, '[data-control="printer"]')?.value).toBe(PRINTER);
    expect(session.state.target?.deviceId).toBe(PRINTER);
    expect($(panel, '[data-role="evidence"]')?.dataset.evidence).toBe('provisional');
    expect(mocks.status).toHaveBeenCalledWith({
      profileId: expect.any(String),
      deviceId: PRINTER,
    });
  });

  test('says there is no printer rather than showing an empty choice', async () => {
    const { panel } = await mount({ printers: false });

    expect($(panel, '[data-role="no-printer"]')).not.toBeNull();
    expect($(panel, '[data-reason="no_printer"]')).not.toBeNull();
    expect($<HTMLButtonElement>(panel, '[data-action="test-print"]')?.disabled).toBe(true);
  });
});

describe('test print', () => {
  test('prints the held, settled preview and says so', async () => {
    const { panel } = await mount();
    mocks.testPrint.mockResolvedValue(testPrintFixture);

    const button = $<HTMLButtonElement>(panel, '[data-action="test-print"]')!;
    expect(button.disabled).toBe(false);
    button.click();
    await vi.waitFor(() => expect(mocks.testPrint).toHaveBeenCalledOnce());

    const [, approval, device] = mocks.testPrint.mock.calls[0];
    expect(approval.approvalId).toBe(PREVIEW.approval_id);
    expect(approval.rasterIdentity).toBe(PREVIEW.render.raster_identity);
    expect(device).toBe(PRINTER);
    await vi.waitFor(() =>
      expect($(panel, '[data-role="print-status"]')?.textContent).toMatch(/Test print sent/)
    );
  });

  test('is unavailable to a non-administrator, with the reason beside it', async () => {
    const { panel } = await mount({ admin: false });

    const button = $<HTMLButtonElement>(panel, '[data-action="test-print"]')!;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-describedby')).toBe('test-reason');
    expect($(panel, '#test-reason')?.dataset.reason).toBe('not_admin');
  });

  test('is disabled the moment the layout moves past the preview', async () => {
    const { panel, session } = await mount();

    session.moveElement(OPENED.draft.document.elements[0].id, {
      ...OPENED.draft.document.elements[0].frame,
      x_mm: 7,
    });
    await panel.updateComplete;

    expect($<HTMLButtonElement>(panel, '[data-action="test-print"]')?.disabled).toBe(true);
    expect($(panel, '#test-reason')?.dataset.reason).toBe('rendering');
  });
});

describe('calibration', () => {
  test('walks from printing the sheet to a recorded, current calibration', async () => {
    const { panel } = await mount();
    mocks.sheet.mockResolvedValue(sheetFixture);
    mocks.record.mockResolvedValue(recordedFixture);
    expect($(panel, '[data-role="calibration-state"]')?.dataset.state).toBe('absent');

    $<HTMLButtonElement>(panel, '[data-action="calibrate"]')!.click();
    await panel.updateComplete;
    $<HTMLButtonElement>(panel, '[data-action="print-sheet"]')!.click();
    await vi.waitFor(() => expect($(panel, 'input[data-measure="top_mm"]')).not.toBeNull());
    // Focus lands on the first reading, not back at the top of the panel.
    await vi.waitFor(() =>
      expect(panel.shadowRoot?.activeElement?.getAttribute('data-measure')).toBe('top_mm')
    );

    for (const [field, value] of Object.entries({
      top_mm: '0.5',
      right_mm: '0.5',
      bottom_mm: '0',
      left_mm: '0.5',
      feed_mm: '-0.4',
    })) {
      const input = $<HTMLInputElement>(panel, `input[data-measure="${field}"]`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    $<HTMLButtonElement>(panel, '[data-action="record"]')!.click();

    await vi.waitFor(() => expect(mocks.record).toHaveBeenCalledOnce());
    expect(mocks.record.mock.calls[0][0]).toBe((sheetFixture as { sheet_id: string }).sheet_id);
    expect(mocks.record.mock.calls[0][1]).toEqual({
      top_mm: 0.5,
      right_mm: 0.5,
      bottom_mm: 0,
      left_mm: 0.5,
      feed_mm: -0.4,
    });
    await vi.waitFor(() =>
      expect($(panel, '[data-role="calibration-state"]')?.dataset.state).toBe('current')
    );
  });

  test('marks the readings that cannot be right, and sends nothing', async () => {
    const { panel } = await mount();
    mocks.sheet.mockResolvedValue(sheetFixture);
    $<HTMLButtonElement>(panel, '[data-action="calibrate"]')!.click();
    await panel.updateComplete;
    $<HTMLButtonElement>(panel, '[data-action="print-sheet"]')!.click();
    await vi.waitFor(() => expect($(panel, 'input[data-measure="left_mm"]')).not.toBeNull());

    const left = $<HTMLInputElement>(panel, 'input[data-measure="left_mm"]')!;
    left.value = '-2';
    left.dispatchEvent(new Event('input'));
    $<HTMLButtonElement>(panel, '[data-action="record"]')!.click();
    await panel.updateComplete;

    expect(mocks.record).not.toHaveBeenCalled();
    expect(left.getAttribute('aria-invalid')).toBe('true');
    expect($(panel, '#problem-left_mm')?.dataset.problem).toBe('negative');
    expect(left.getAttribute('aria-describedby')).toContain('problem-left_mm');
  });

  test('is offered to an administrator only', async () => {
    const { panel } = await mount({ admin: false });

    expect($<HTMLButtonElement>(panel, '[data-action="calibrate"]')?.disabled).toBe(true);
    expect($(panel, '#calibrate-reason')).not.toBeNull();
  });
});

describe('one production print', () => {
  test('waits for a published template, and says so', async () => {
    const { panel } = await mount({ templateId: null });

    expect($<HTMLButtonElement>(panel, '[data-action="preview-record"]')?.disabled).toBe(true);
    expect($(panel, '#record-reason')?.dataset.reason).toBe('unpublished');
  });

  test('lists every blocker of a provisional profile and routes to its correction', async () => {
    const { panel } = await mount({ templateId: 'uuid-1' });
    const blocked = structuredClone(recordPreviewFixture) as Record<string, unknown> & {
      decision: { allowed: boolean; blocked_by: string[] };
    };
    blocked.decision = {
      ...blocked.decision,
      allowed: false,
      blocked_by: ['profile_not_product_verified', 'local_calibration_missing'],
    };
    blocked.recovery = 'select_profile';
    mocks.recordPreview.mockResolvedValue(blocked);

    $<HTMLButtonElement>(panel, '[data-action="preview-record"]')!.click();
    await vi.waitFor(() => expect($(panel, '[data-role="blockers"]')).not.toBeNull());

    expect(mocks.recordPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        template: { kind: 'named', id: 'uuid-1' },
        strain: 'Blue Dream',
        phenotype: '#1',
        deviceId: PRINTER,
      })
    );
    const blockers = [...panel.renderRoot.querySelectorAll<HTMLElement>('[data-blocker]')];
    expect(blockers.map((item) => item.dataset.blocker)).toEqual([
      'profile_not_product_verified',
      'local_calibration_missing',
    ]);
    // In words, never the blocker's code.
    expect(blockers[0].textContent).not.toContain('profile_not_product_verified');
    expect($<HTMLButtonElement>(panel, '[data-action="print-record"]')?.disabled).toBe(true);

    $<HTMLButtonElement>(panel, '[data-action="follow"][data-recovery="select_profile"]')!.click();
    await vi.waitFor(() =>
      expect(panel.shadowRoot?.activeElement?.getAttribute('data-control')).toBe('profile')
    );
  });

  test('prints past a refusal the operator may override, only when asked', async () => {
    const { panel } = await mount({ templateId: 'uuid-1' });
    const blocked = structuredClone(recordPreviewFixture) as typeof recordPreviewFixture & {
      decision: { allowed: boolean; blocked_by: string[] };
      override_available: boolean;
    };
    blocked.decision = {
      ...blocked.decision,
      allowed: false,
      blocked_by: ['blocking_diagnostics'],
    };
    blocked.override_available = true;
    mocks.recordPreview.mockResolvedValue(blocked);
    mocks.print.mockResolvedValue(refusedFixture);

    $<HTMLButtonElement>(panel, '[data-action="preview-record"]')!.click();
    await vi.waitFor(() =>
      expect($<HTMLButtonElement>(panel, '[data-action="print-record-anyway"]')).not.toBeNull()
    );
    expect($<HTMLButtonElement>(panel, '[data-action="print-record"]')?.disabled).toBe(true);
    expect($(panel, '#record-anyway')).not.toBeNull();

    $<HTMLButtonElement>(panel, '[data-action="print-record-anyway"]')!.click();
    await vi.waitFor(() => expect(mocks.print).toHaveBeenCalled());
    expect(mocks.print).toHaveBeenCalledWith(
      blocked.approval_id,
      blocked.render.raster_identity,
      true
    );
  });

  test('prints the approved preview, and a refusal names what to do next', async () => {
    const { panel } = await mount({ templateId: 'uuid-1' });
    mocks.recordPreview.mockResolvedValue(recordPreviewFixture);
    mocks.print.mockResolvedValue(refusedFixture);

    $<HTMLButtonElement>(panel, '[data-action="preview-record"]')!.click();
    await vi.waitFor(() =>
      expect($<HTMLButtonElement>(panel, '[data-action="print-record"]')?.disabled).toBe(false)
    );
    $<HTMLButtonElement>(panel, '[data-action="print-record"]')!.click();

    await vi.waitFor(() => expect($(panel, '.refusal')).not.toBeNull());
    const preview = recordPreviewFixture as {
      approval_id: string;
      render: { raster_identity: string };
    };
    expect(mocks.print).toHaveBeenCalledWith(
      preview.approval_id,
      preview.render.raster_identity,
      false
    );
    const refusal = $(panel, '.refusal')!;
    expect(refusal.getAttribute('role')).toBe('alert');
    // Reviewed copy, not the backend's sentence.
    expect(refusal.textContent).not.toContain(
      (refusedFixture as { refusal: { reason: string } }).refusal.reason
    );
    expect($(panel, '.refusal [data-recovery="refresh_preview"]')).not.toBeNull();
  });
});

describe('what the preview promises', () => {
  test('separates exactness, calibrated tolerance and physical variability', async () => {
    const { panel } = await mount();

    expect($(panel, '[data-role="fidelity-exact"]')?.dataset.settled).toBe('true');
    expect($(panel, '[data-role="fidelity-calibrated"]')?.textContent).toMatch(/not been measured/);
    expect($(panel, '[data-role="fidelity-physical"]')?.textContent).toMatch(
      /No screen shows paper/
    );
  });
});

describe('accessibility', () => {
  async function everyControlOpen() {
    const mounted = await mount({ templateId: 'uuid-1' });
    mocks.sheet.mockResolvedValue(sheetFixture);
    $<HTMLButtonElement>(mounted.panel, '[data-action="calibrate"]')!.click();
    await mounted.panel.updateComplete;
    $<HTMLButtonElement>(mounted.panel, '[data-action="print-sheet"]')!.click();
    await vi.waitFor(() => expect($(mounted.panel, 'input[data-measure]')).not.toBeNull());
    return mounted;
  }

  const visible = (panel: GrowspaceLabelPrintPanel) =>
    [...panel.renderRoot.querySelectorAll<HTMLElement>('button, input, select')].filter(
      (control) => control.getBoundingClientRect().width > 0
    );

  test('names every control, the calibration readings included', async () => {
    const { panel } = await everyControlOpen();
    const missing: string[] = [];
    for (const control of visible(panel)) {
      try {
        await expect.element(control, { timeout: 250 }).toHaveAccessibleName();
      } catch {
        missing.push(control.outerHTML.slice(0, 140));
      }
    }

    expect(missing).toEqual([]);
  });

  test('gives every control at least 44 x 44 CSS pixels', async () => {
    const { panel } = await everyControlOpen();
    const controls = visible(panel);

    expect(controls.length).toBeGreaterThan(8);
    for (const control of controls) {
      const box = control.getBoundingClientRect();
      expect(box.width, control.outerHTML.slice(0, 100)).toBeGreaterThanOrEqual(44);
      expect(box.height, control.outerHTML.slice(0, 100)).toBeGreaterThanOrEqual(44);
    }
  });

  test('announces through a polite status region that exists before it speaks', async () => {
    const { panel } = await mount();
    const region = $(panel, '[data-role="print-status"]')!;

    expect(region.getAttribute('role')).toBe('status');
    expect(region.getAttribute('aria-live')).toBe('polite');
  });
});
