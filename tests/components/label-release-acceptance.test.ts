/**
 * The Label Template release gate for accessibility and localization (hub #230).
 *
 * WCAG 2.2 Level AA is a stable-release requirement for the editor, diagnostic
 * recovery, calibration, single print and batch preflight, and a known A or
 * AA failure blocks the release. The per-surface suites measure the things
 * axe cannot (focus order, live regions, forced colours); this one runs the
 * axe-core rule set for WCAG 2.0, 2.1 and 2.2 A/AA over every one of those
 * surfaces in the states a user actually meets them in, and fails on any
 * violation.
 *
 * It then renders the same surfaces pseudo-localized — every English string
 * accented, bracketed and expanded by roughly 40% — in a 390 CSS-pixel
 * column, and at 200% text, and requires that no control, status or recovery
 * action is pushed outside the column and that no catalogue key leaks through
 * as raw text. Long translations are where layouts break first, and English
 * is the only language this product ships; pseudo-localization is how that
 * stays true for the next one.
 */

import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';
import type { LitElement } from 'lit';

import en from '../../src/localize/languages/en.json';
import capabilityFixture from '../fixtures/contract/label_template_capability_v1.json';
import factoryPreviewFixture from '../fixtures/contract/label_factory_template_preview_v1.json';
import openedFixture from '../fixtures/contract/label_draft_opened_v1.json';
import previewFixture from '../fixtures/contract/label_draft_preview_v1.json';
import statusFixture from '../fixtures/contract/label_calibration_status_v1.json';
import sheetFixture from '../fixtures/contract/label_calibration_sheet_v1.json';
import recordPreviewFixture from '../fixtures/contract/label_record_preview_v1.json';
import refusedFixture from '../fixtures/contract/label_print_refused_v1.json';
import preflightFixture from '../fixtures/contract/label_batch_preflight_v1.json';
import { GrowspaceLabelEditor } from '../../src/features/labels/editor/growspace-label-editor';
import { GrowspaceLabelPrintPanel } from '../../src/features/labels/editor/growspace-label-print-panel';
import { GrowspaceLabelBatch } from '../../src/features/labels/batch/growspace-label-batch';
import { GrowspaceLabelTemplates } from '../../src/features/labels/label-templates';
import { GrowspaceLabelRecordPrint } from '../../src/features/labels/record/growspace-label-record-print';
import { DraftSession } from '../../src/features/labels/editor/draft-session';
import {
  detectLabelTemplateSupport,
  resetLabelTemplateSupport,
  type LabelTemplateCapability,
} from '../../src/slices/labels';
import { DraftOpenedSchema, DraftPreviewSchema } from '../../src/slices/labels/draft-schema';

const mocks = vi.hoisted(() => ({
  hassCall: vi.fn(),
  autosave: vi.fn(),
  preview: vi.fn(),
  status: vi.fn(),
  sheet: vi.fn(),
  record: vi.fn(),
  testPrint: vi.fn(),
  recordPreview: vi.fn(),
  print: vi.fn(),
  strains: vi.fn(),
  preflight: vi.fn(),
  library: vi.fn(),
  hass: { current: null as unknown },
}));

vi.mock('../../src/slices/labels/drafts', () => ({
  autosaveLabelTemplateDraft: mocks.autosave,
  previewLabelTemplateDraft: mocks.preview,
  publishLabelTemplateDraft: vi.fn(),
  discardLabelTemplateDraft: vi.fn(),
  openLabelTemplateDraft: vi.fn(),
  fetchLabelTemplateLibrary: mocks.library,
}));

vi.mock('../../src/slices/labels/printing', () => ({
  fetchCalibrationStatus: mocks.status,
  printCalibrationSheet: mocks.sheet,
  recordCalibration: mocks.record,
  testPrintLabelTemplateDraft: mocks.testPrint,
  previewLabelRecord: mocks.recordPreview,
  printLabelRecord: mocks.print,
}));

vi.mock('../../src/slices/labels/batch', () => ({
  MAX_BATCH_COPIES: 10,
  preflightLabelBatch: mocks.preflight,
  printLabelBatch: vi.fn(),
  fetchLabelBatchJob: vi.fn(),
  retryLabelBatch: vi.fn(),
}));

vi.mock('../../src/slices/strain', () => ({ fetchStrainLibrary: mocks.strains }));

vi.mock('../../src/services/hass-call', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  hassCall: mocks.hassCall,
  getHass: () => mocks.hass.current,
}));

for (const [name, element] of [
  ['growspace-label-editor', GrowspaceLabelEditor],
  ['growspace-label-print-panel', GrowspaceLabelPrintPanel],
  ['growspace-label-batch', GrowspaceLabelBatch],
  ['growspace-label-templates', GrowspaceLabelTemplates],
  ['growspace-label-record-print', GrowspaceLabelRecordPrint],
] as const) {
  if (!customElements.get(name)) customElements.define(name, element);
}

const CAPABILITY = capabilityFixture as unknown as LabelTemplateCapability;
const OPENED = DraftOpenedSchema.parse(openedFixture);
const PREVIEW = DraftPreviewSchema.parse(previewFixture);
if (OPENED.outcome !== 'ok' || PREVIEW.outcome !== 'ok') throw new Error('fixtures are refusals');
const SIZE = CAPABILITY.catalogues.label_sizes.find(
  (size) => size.id === OPENED.draft.label_size_id
)!;
const PRINTER = 'image.b1_last_label_made';

/** Home Assistant's default dark pair, which every surface is themed from. */
const THEME: Record<string, string> = {
  background: '#1c1c1c',
  color: '#e1e1e1',
  '--primary-text-color': '#e1e1e1',
  '--secondary-text-color': '#9b9b9b',
  '--primary-background-color': '#111111',
  '--card-background-color': '#1c1c1c',
  '--secondary-background-color': '#282828',
  '--divider-color': '#474747',
  '--primary-color': '#03a9f4',
  '--error-color': '#f44336',
  '--warning-color': '#ffa600',
};

function theme(element: HTMLElement): void {
  for (const [name, value] of Object.entries(THEME)) element.style.setProperty(name, value);
}

async function settle(element: LitElement): Promise<void> {
  await element.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await element.updateComplete;
}

const $ = <T extends HTMLElement = HTMLElement>(element: LitElement, selector: string) =>
  element.renderRoot.querySelector<T>(selector);

// ---------------------------------------------------------------------------
// The surfaces, in the states a user meets them in
// ---------------------------------------------------------------------------

async function session(templateId: string | null = null): Promise<DraftSession> {
  const draft = { ...OPENED.draft, name: 'Bench label', template_id: templateId };
  const created = new DraftSession(
    { labelSizeId: draft.label_size_id },
    { widthMm: SIZE.width_mm, heightMm: SIZE.height_mm },
    draft.document,
    { schedule: (() => null) as never }
  );
  created.adopt(draft, { operation: 'publish', allowed: true, diagnostics: [] });
  mocks.preview.mockResolvedValue({ ...PREVIEW, draft_version: draft.version });
  await created.render();
  return created;
}

async function editor(): Promise<LitElement> {
  const element = await fixture<GrowspaceLabelEditor>(
    '<growspace-label-editor></growspace-label-editor>'
  );
  theme(element);
  element.capability = structuredClone(CAPABILITY);
  element.session = await session();
  await settle(element);
  await element.renderRoot.querySelector<LitElement>('growspace-label-inspector')?.updateComplete;
  return element;
}

async function printPanel(templateId: string | null = 'uuid-1'): Promise<GrowspaceLabelPrintPanel> {
  mocks.hass.current = {
    user: { is_admin: true },
    states: { [PRINTER]: { attributes: { friendly_name: 'B1 Last Label Made' } } },
  };
  const drafting = await session(templateId);
  const panel = await fixture<GrowspaceLabelPrintPanel>(
    '<growspace-label-print-panel></growspace-label-print-panel>'
  );
  theme(panel);
  panel.capability = structuredClone(CAPABILITY);
  panel.session = drafting;
  panel.model = drafting.state;
  drafting.subscribe((state) => {
    panel.model = state;
  });
  await vi.waitFor(() => expect(mocks.status).toHaveBeenCalled());
  await settle(panel);
  return panel;
}

/** A provisional profile's single print: every blocker, each with its route. */
async function blockedPrint(): Promise<LitElement> {
  const panel = await printPanel();
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
  await settle(panel);
  return panel;
}

/** A print the integration refused: the recovery a user is sent to. */
async function refusedPrint(): Promise<LitElement> {
  const panel = await printPanel();
  mocks.recordPreview.mockResolvedValue(recordPreviewFixture);
  mocks.print.mockResolvedValue(refusedFixture);
  $<HTMLButtonElement>(panel, '[data-action="preview-record"]')!.click();
  await vi.waitFor(() =>
    expect($<HTMLButtonElement>(panel, '[data-action="print-record"]')?.disabled).toBe(false)
  );
  $<HTMLButtonElement>(panel, '[data-action="print-record"]')!.click();
  await vi.waitFor(() => expect($(panel, '.refusal')).not.toBeNull());
  await settle(panel);
  return panel;
}

/** Calibration, at the step where the readings are typed in. */
async function calibrating(): Promise<LitElement> {
  const panel = await printPanel();
  mocks.sheet.mockResolvedValue(sheetFixture);
  $<HTMLButtonElement>(panel, '[data-action="calibrate"]')!.click();
  await panel.updateComplete;
  $<HTMLButtonElement>(panel, '[data-action="print-sheet"]')!.click();
  await vi.waitFor(() => expect($(panel, 'input[data-measure="top_mm"]')).not.toBeNull());
  await settle(panel);
  return panel;
}

/** Batch preflight, reviewed, opened where the problems are. */
async function batchReview(): Promise<LitElement> {
  mocks.hass.current = {
    user: { is_admin: false },
    states: { [PRINTER]: { attributes: { friendly_name: 'B1' } } },
  };
  const view = await fixture<GrowspaceLabelBatch>(
    '<growspace-label-batch></growspace-label-batch>'
  );
  theme(view);
  view.capability = structuredClone(CAPABILITY);
  view.plantIds = ['A', 'W'];
  view.describePlant = (id) => `Plant ${id}`;
  await view.updateComplete;
  mocks.preflight.mockResolvedValueOnce(structuredClone(preflightFixture));
  $<HTMLButtonElement>(view, '[data-action="preflight"]')!.click();
  await vi.waitFor(() => expect($(view, '[data-section="review"]')).not.toBeNull());
  await settle(view);
  return view;
}

/** The strain library's print, mounted for one saved strain. */
async function strainPrint(): Promise<GrowspaceLabelRecordPrint> {
  mocks.hass.current = {
    user: { is_admin: false },
    states: { [PRINTER]: { attributes: { friendly_name: 'B1 Last Label Made' } } },
  };
  const view = await fixture<GrowspaceLabelRecordPrint>(
    '<growspace-label-record-print></growspace-label-record-print>'
  );
  theme(view);
  view.capability = structuredClone(CAPABILITY);
  view.strain = 'Blue Dream';
  view.phenotype = '#1';
  await settle(view);
  return view;
}

/** The strain library's print, previewed and blocked: every reason, and what to do. */
async function strainPrintBlocked(): Promise<LitElement> {
  const view = await strainPrint();
  const blocked = structuredClone(recordPreviewFixture) as Record<string, unknown> & {
    decision: { allowed: boolean; blocked_by: string[] };
  };
  blocked.decision = {
    ...blocked.decision,
    allowed: false,
    blocked_by: ['profile_not_product_verified', 'local_calibration_missing'],
  };
  blocked.recovery = 'calibrate';
  mocks.recordPreview.mockResolvedValue(blocked);
  $<HTMLButtonElement>(view, '[data-action="preview"]')!.click();
  await vi.waitFor(() => expect($(view, '[data-role="blockers"]')).not.toBeNull());
  await settle(view);
  return view;
}

/** The strain library's print, refused by the integration: the recovery offered. */
async function strainPrintRefused(): Promise<LitElement> {
  const view = await strainPrint();
  mocks.recordPreview.mockResolvedValue(recordPreviewFixture);
  mocks.print.mockResolvedValue(refusedFixture);
  $<HTMLButtonElement>(view, '[data-action="preview"]')!.click();
  await vi.waitFor(() =>
    expect($<HTMLButtonElement>(view, '[data-action="print"]')?.disabled).toBe(false)
  );
  $<HTMLButtonElement>(view, '[data-action="print"]')!.click();
  await vi.waitFor(() => expect($(view, '[data-role="refusal"]')).not.toBeNull());
  await settle(view);
  return view;
}

/** The template view a user chooses and previews a layout from. */
async function templates(): Promise<LitElement> {
  mocks.hassCall.mockResolvedValueOnce(structuredClone(capabilityFixture));
  await detectLabelTemplateSupport();
  mocks.hassCall.mockResolvedValue(structuredClone(factoryPreviewFixture));
  const element = await fixture<GrowspaceLabelTemplates>(
    '<growspace-label-templates></growspace-label-templates>'
  );
  theme(element);
  element.capability = structuredClone(CAPABILITY);
  await settle(element);
  return element;
}

const SURFACES: [string, () => Promise<LitElement>][] = [
  ['the editor', editor],
  ['single print, blocked with its recovery routes', blockedPrint],
  ['single print, refused by the integration', refusedPrint],
  ['calibration, taking readings', calibrating],
  ['batch preflight, under review', batchReview],
  ['the template view', templates],
  ['strain-library print, blocked with its recovery', strainPrintBlocked],
  ['strain-library print, refused by the integration', strainPrintRefused],
];

beforeEach(() => {
  vi.clearAllMocks();
  resetLabelTemplateSupport();
  mocks.status.mockResolvedValue(statusFixture);
  mocks.library.mockResolvedValue({ outcome: 'refused', refusal: { code: 'x' } });
  mocks.strains.mockResolvedValue([
    { key: 'Blue Dream|#1', strain: 'Blue Dream', phenotype: '#1' },
  ]);
});

// ---------------------------------------------------------------------------
// WCAG 2.2 A and AA, by axe-core
// ---------------------------------------------------------------------------

const WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

/**
 * Violations WCAG itself exempts, each with the criterion that does.
 *
 * Only one today. A frame on the canvas is the user's own geometry — a
 * 0.4 mm divider is that thin because that is what it prints as — and its
 * resize grips are drawn small so they do not cover the label they grip.
 * WCAG 2.5.8's "Equivalent" exception covers both: every frame has a
 * full-size row in the Label elements panel and every resize has exact
 * millimetre fields in the inspector, which the editor's own accessibility
 * suite proves ("gives every canvas frame a full-size equal").
 */
const EXEMPT: { rule: string; target: RegExp; criterion: string }[] = [
  {
    rule: 'target-size',
    target: /\[data-(element|handle)=/,
    criterion: '2.5.8 Equivalent: the elements panel and the inspector',
  },
];

async function violations(element: HTMLElement): Promise<string[]> {
  const result = await axe.run(element, {
    runOnly: { type: 'tag', values: WCAG_AA },
    resultTypes: ['violations'],
  });
  return result.violations.flatMap((violation) =>
    violation.nodes
      .filter((node) => {
        const target = node.target.join(' > ');
        return !EXEMPT.some((exempt) => exempt.rule === violation.id && exempt.target.test(target));
      })
      .map((node) => `${violation.id}: ${node.target.join(' > ')} — ${node.failureSummary ?? ''}`)
  );
}

describe('WCAG 2.2 A and AA', () => {
  test.each(SURFACES)('%s has no axe violation', async (_, mount) => {
    const element = await mount();
    expect(await violations(element)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Pseudo-localization, a narrow column and doubled text
// ---------------------------------------------------------------------------

const ACCENTS: Record<string, string> = {
  a: 'á',
  e: 'é',
  i: 'í',
  o: 'ö',
  u: 'ü',
  c: 'ç',
  n: 'ñ',
  y: 'ý',
  A: 'Å',
  E: 'É',
  I: 'Î',
  O: 'Ø',
  U: 'Ü',
  C: 'Ç',
  N: 'Ñ',
  Y: 'Ý',
};

/** Accent, expand by ~40% and bracket one string, leaving `{names}` alone. */
export function pseudo(text: string): string {
  const accented = text
    .split(/(\{\w+\})/)
    .map((part) =>
      /^\{\w+\}$/.test(part) ? part : part.replace(/[a-zA-Z]/g, (c) => ACCENTS[c] ?? c)
    )
    .join('');
  const padding = Math.ceil(text.length * 0.4);
  const filler = Array.from({ length: Math.ceil(padding / 6) }, () => 'ẋẋẋẋẋ').join(' ');
  return `⟦${accented}${filler ? ` ${filler}` : ''}⟧`;
}

const LABELS = en.labels as Record<string, string>;
const ORIGINAL = { ...LABELS };

function pseudoLocalize(): void {
  for (const [key, value] of Object.entries(ORIGINAL)) LABELS[key] = pseudo(value);
}

afterEach(() => {
  Object.assign(LABELS, ORIGINAL);
});

/** Every element, through every open shadow root below `root`. */
function everything(root: ParentNode): HTMLElement[] {
  const found: HTMLElement[] = [];
  for (const node of root.querySelectorAll<HTMLElement>('*')) {
    found.push(node);
    if (node.shadowRoot) found.push(...everything(node.shadowRoot));
  }
  return found;
}

const ACTIONABLE =
  'button, input, select, textarea, a[href], [role="alert"], [role="status"], [data-recovery]';

function outside(element: HTMLElement & { renderRoot?: ParentNode }): string[] {
  const column = element.getBoundingClientRect();
  return everything(element.renderRoot ?? element)
    .filter((node) => node.matches(ACTIONABLE))
    .filter((node) => {
      const box = node.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) return false;
      const style = getComputedStyle(node);
      if (style.visibility === 'hidden' || style.display === 'none') return false;
      return box.left < column.left - 1 || box.right > column.right + 1;
    })
    .map((node) => node.outerHTML.slice(0, 120));
}

function rawKeys(element: LitElement): string[] {
  const text = everything(element.renderRoot)
    .map((node) => (node.shadowRoot ? '' : (node.textContent ?? '')))
    .join(' ');
  return [...new Set(text.match(/\blabels\.[a-z_]+/g) ?? [])];
}

describe('pseudo-localized, in a 390 CSS-pixel column', () => {
  test('the pseudo-locale expands, accents and keeps its placeholders', () => {
    const result = pseudo('Print {count} labels');
    expect(result).toContain('{count}');
    expect(result.length).toBeGreaterThan('Print {count} labels'.length * 1.3);
    // Everything but the placeholder is accented out of plain ASCII letters.
    expect(result.replace('{count}', '')).not.toMatch(/[a-z]{3}/);
  });

  test('the column check sees a control pushed outside it', () => {
    const column = document.createElement('div');
    column.style.width = '390px';
    column.innerHTML = '<button style="margin-left: 300px; width: 200px">Too wide</button>';
    document.body.append(column);
    try {
      expect(outside(column as unknown as LitElement)).toHaveLength(1);
    } finally {
      column.remove();
    }
  });

  test.each(SURFACES)('%s keeps every control and status inside the column', async (_, mount) => {
    pseudoLocalize();
    const element = await mount();
    element.style.display = 'block';
    element.style.width = '390px';
    await settle(element);

    expect(outside(element)).toEqual([]);
    expect(rawKeys(element)).toEqual([]);
  });

  test.each(SURFACES)('%s still fits at 200%% text', async (_, mount) => {
    pseudoLocalize();
    const element = await mount();
    element.style.display = 'block';
    element.style.width = '390px';
    element.style.fontSize = '200%';
    await settle(element);

    expect(outside(element)).toEqual([]);
  });

  test.each(SURFACES)(
    '%s shows the pseudo-locale rather than English it bypassed',
    async (_, mount) => {
      pseudoLocalize();
      const element = await mount();
      await settle(element);
      const visible = everything(element.renderRoot)
        .filter((node) => node.matches('p, button, label, h2, h3, li, span, legend'))
        .filter((node) => node.children.length === 0)
        .map((node) => node.textContent?.trim() ?? '')
        .filter((text) => text.length > 0);
      expect(visible.some((text) => text.includes('⟦'))).toBe(true);
    }
  );
});
