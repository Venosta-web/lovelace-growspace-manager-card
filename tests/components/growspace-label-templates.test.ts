import { expect, test, describe, vi, beforeEach } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';

import capabilityFixture from '../fixtures/contract/label_template_capability_v1.json';
import previewFixture from '../fixtures/contract/label_factory_template_preview_v1.json';
import refusalFixture from '../fixtures/contract/label_factory_template_preview_refused_v1.json';
import en from '../../src/localize/languages/en.json';
import { hassCall } from '../../src/services/hass-call';
import { GrowspaceLabelTemplates } from '../../src/features/labels/label-templates';
import {
  detectLabelTemplateSupport,
  resetLabelTemplateSupport,
  type LabelTemplateCapability,
} from '../../src/slices/labels';

vi.mock('../../src/services/hass-call', () => ({
  hassCall: vi.fn(),
  getHass: vi.fn(),
  callService: vi.fn(),
  callFetch: vi.fn(),
  setHass: vi.fn(),
}));

const hassCallMock = vi.mocked(hassCall);

if (!customElements.get('growspace-label-templates')) {
  customElements.define('growspace-label-templates', GrowspaceLabelTemplates);
}

const CAPABILITY = capabilityFixture as unknown as LabelTemplateCapability;
const PROFILED_SIZE = CAPABILITY.catalogues.profiles[0].label_size_id;
const UNPROFILED_SIZE = CAPABILITY.catalogues.label_sizes
  .map((size) => size.id)
  .find((id) => !CAPABILITY.catalogues.profiles.some((p) => p.label_size_id === id))!;

async function mount(): Promise<GrowspaceLabelTemplates> {
  hassCallMock.mockResolvedValueOnce(structuredClone(capabilityFixture));
  await detectLabelTemplateSupport();
  const element = await fixture<GrowspaceLabelTemplates>(
    '<growspace-label-templates></growspace-label-templates>'
  );
  element.capability = structuredClone(CAPABILITY);
  // The preview is fetched from `willUpdate`, so it resolves after this
  // render — and a refused one resolves after the re-negotiation behind it.
  await element.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await element.updateComplete;
  return element;
}

function text(element: GrowspaceLabelTemplates, selector: string): string {
  return element.shadowRoot?.querySelector(selector)?.textContent?.trim() ?? '';
}

beforeEach(() => {
  resetLabelTemplateSupport();
  vi.clearAllMocks();
});

describe('the read-only Factory Template view', () => {
  test('shows the backend raster rather than a drawing of the layout', async () => {
    hassCallMock.mockResolvedValue(structuredClone(previewFixture));

    const element = await mount();
    const image = element.shadowRoot?.querySelector<HTMLImageElement>('.stage img');

    expect(image).not.toBeNull();
    expect(image?.getAttribute('src')).toBe(previewFixture.render.raster.image);
    expect(image?.getAttribute('alt')).toContain(previewFixture.template.name);
  });

  test('names the layout, profile and subject the raster came from', async () => {
    hassCallMock.mockResolvedValue(structuredClone(previewFixture));

    const element = await mount();
    const identity = text(element, 'dl.identity');

    expect(identity).toContain(previewFixture.render.render_context.profile_id);
    expect(identity).toContain(previewFixture.template.layout_digest);
    expect(identity).toContain(previewFixture.subject);
  });

  test('offers every catalogued Label Size, badged with what it can do', async () => {
    hassCallMock.mockResolvedValue(structuredClone(previewFixture));

    const element = await mount();
    const buttons = [...(element.shadowRoot?.querySelectorAll('.sizes button') ?? [])];

    expect(buttons).toHaveLength(CAPABILITY.catalogues.label_sizes.length);
    const unprofiled = buttons.find((b) => b.getAttribute('data-size') === UNPROFILED_SIZE);
    expect(unprofiled?.textContent).toContain('No printer profile');
  });

  test('claims nothing about a size no characterised printer can render', async () => {
    hassCallMock.mockResolvedValue(structuredClone(previewFixture));
    const element = await mount();
    hassCallMock.mockClear();

    element.shadowRoot
      ?.querySelector<HTMLButtonElement>(`.sizes button[data-size="${UNPROFILED_SIZE}"]`)
      ?.click();
    await element.updateComplete;

    // No round trip, no picture, and a sentence that says which of the two
    // reasons applies.
    expect(hassCallMock).not.toHaveBeenCalled();
    expect(element.shadowRoot?.querySelector('.stage img')).toBeNull();
    expect(text(element, '[data-state="unprofiled"]')).toContain('no printer');
  });

  test('calls a provisional profile provisional, and does not call it calibrated', async () => {
    hassCallMock.mockResolvedValue(structuredClone(previewFixture));

    const element = await mount();
    const claim = element.shadowRoot?.querySelector('[data-role="claim"]');

    expect(claim?.getAttribute('data-state')).toBe('provisional');
    expect(claim?.textContent).toContain('Provisional');
    expect(claim?.textContent).not.toContain('calibrated');
  });

  test('shows the diagnostics when the integration could not render at all', async () => {
    // What a Home Assistant without the printer integration installed really
    // answers: a result, with no raster and a diagnostic saying why.
    const unrendered = structuredClone(previewFixture);
    unrendered.render.raster = null;
    unrendered.render.status = 'failed';
    unrendered.render.diagnostics.push({
      code: 'raster.render_failed',
      severity: 'error',
      message: 'The renderer did not produce a raster: Action niimbot.print not found',
      layer: 'raster',
      element_id: null,
      path: '',
      parameters: {},
      recovery: 'retry',
    });
    hassCallMock.mockResolvedValue(unrendered);

    const element = await mount();

    expect(text(element, '[data-state="no-raster"]')).toContain('could not render');
    // The sentence points at diagnostics, so the diagnostics are on screen --
    // in the card's reviewed words, never the integration's log line.
    const row = element.shadowRoot?.querySelector(
      'ul.diagnostics [data-code="raster.render_failed"]'
    );
    expect(row?.textContent?.trim()).toBe(en.labels.diagnostic_raster_render_failed);
    expect(text(element, 'ul.diagnostics')).not.toContain('niimbot.print not found');
  });

  test('makes no claim about a raster that is not there', async () => {
    const unrendered = structuredClone(previewFixture);
    unrendered.render.raster = null;
    hassCallMock.mockResolvedValue(unrendered);

    const element = await mount();

    // "The preview is exactly what this printer would receive" over an empty
    // stage is the untruth this surface exists to avoid.
    expect(element.shadowRoot?.querySelector('[data-role="claim"]')).toBeNull();
  });

  test('shows a refusal as a refusal rather than as an empty stage', async () => {
    hassCallMock.mockResolvedValue(structuredClone(refusalFixture));

    const element = await mount();

    const refused = text(element, '[data-state="refused"]');
    expect(refused).toContain(en.labels.refusal_contract_incompatible);
    expect(refused).not.toContain(refusalFixture.refusal.reason);
    expect(element.shadowRoot?.querySelector('.stage img')).toBeNull();
  });

  test('renders the selected size, never a neighbouring one', async () => {
    hassCallMock.mockResolvedValue(structuredClone(previewFixture));
    const element = await mount();

    expect(hassCallMock).toHaveBeenLastCalledWith(
      expect.stringContaining('preview_label_factory_template'),
      expect.objectContaining({ label_size_id: PROFILED_SIZE }),
      expect.anything()
    );
  });
});

describe('handing the surface to the editor', () => {
  test('becomes a full-height column, so the editor scrolls its panels and not itself', async () => {
    // A pane of automatic height gives the editor nothing to fill, and the
    // canvas, its toolbars and both panels then scroll as one block -- which
    // takes the canvas off screen the moment anybody reaches the inspector.
    const element = await mount();
    element.style.height = '600px';

    expect(getComputedStyle(element).display).toBe('block');

    element.editing = true;
    await element.updateComplete;

    expect(element.hasAttribute('editing')).toBe(true);
    expect(getComputedStyle(element).display).toBe('flex');
    expect(Math.round(element.getBoundingClientRect().height)).toBe(600);
  });
});
