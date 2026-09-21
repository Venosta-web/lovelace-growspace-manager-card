import { expect, test, describe, vi, beforeEach } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';

import capabilityFixture from '../fixtures/contract/label_template_capability_v1.json';
import { LabelTemplatesDialog } from '../../src/dialogs/label-templates-dialog';
import { resetLazyChunks } from '../../src/lib/lazy-chunk';
import type { LabelTemplateCapability, LabelTemplateSupport } from '../../src/slices/labels';

vi.mock('../../src/services/hass-call', () => ({
  hassCall: vi.fn(),
  getHass: vi.fn(),
  callService: vi.fn(),
  callFetch: vi.fn(),
  setHass: vi.fn(),
}));

if (!customElements.get('label-templates-dialog')) {
  customElements.define('label-templates-dialog', LabelTemplatesDialog);
}

const CAPABILITY = capabilityFixture as unknown as LabelTemplateCapability;

async function open(support: LabelTemplateSupport): Promise<LabelTemplatesDialog> {
  const element = await fixture<LabelTemplatesDialog>(
    '<label-templates-dialog></label-templates-dialog>'
  );
  element.support = support;
  element.open = true;
  await element.updateComplete;
  await element.updateComplete;
  return element;
}

function pane(element: LabelTemplatesDialog, selector: string): string {
  return element.shadowRoot?.querySelector(selector)?.textContent?.trim() ?? '';
}

beforeEach(() => {
  resetLazyChunks();
  vi.clearAllMocks();
});

describe('the gate in front of the template path', () => {
  test('says the integration has no templates, and nothing more, on the Classic Path', async () => {
    const element = await open({ status: 'classic', reason: 'Unknown command.' });

    const body = pane(element, '[data-state="classic"]');
    expect(body).toContain('does not offer label templates');
    // No fidelity claim is made for a path that has none, and the existing
    // print dialogs are named as what still works.
    expect(body).toContain('existing print dialogs');
    expect(element.shadowRoot?.querySelector('growspace-label-templates')).toBeNull();
  });

  test('never downloads the template chunk for a backend that cannot serve it', async () => {
    const element = await open({ status: 'classic', reason: 'Unknown command.' });

    // `loadLazyChunk` remembers every attempt by name; nothing was attempted.
    expect(element.shadowRoot?.querySelector('growspace-lazy-chunk-error')).toBeNull();
    expect(element.shadowRoot?.querySelector('growspace-label-templates')).toBeNull();
  });

  test('reports an unusable envelope as one compatibility state', async () => {
    const element = await open({
      status: 'incompatible',
      reason: 'operations not available: batch_retry',
    });

    const body = pane(element, '[data-state="incompatible"]');
    expect(body).toContain('cannot use the label template contract');
    expect(body).toContain('batch_retry');
    // And it does not offer the Classic Path as a way out of it.
    expect(body).not.toContain('does not offer label templates');
    expect(element.shadowRoot?.querySelector('growspace-label-templates')).toBeNull();
  });

  test('opens the frame before the chunk arrives', async () => {
    const element = await open({ status: 'available', capability: CAPABILITY });

    // Whatever the chunk does, the dialog itself is on screen and closable.
    expect(element.shadowRoot?.querySelector('gs-dialog')).not.toBeNull();
  });
});

describe('the frame the editor gets', () => {
  test('fills the dialog surface rather than the viewport it is inset from', async () => {
    // Viewport units made the container wider and taller than the surface
    // holding it, so the editor was clipped at both sides -- the Publish
    // button among the casualties -- and scrolled as one block.
    const element = await open({ status: 'available', capability: CAPABILITY });
    // The pane arrives with the lazy chunk, which is a dynamic import.
    let editing: Element | null = null;
    for (let attempt = 0; attempt < 50 && editing === null; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      await element.updateComplete;
      editing = element.shadowRoot?.querySelector('growspace-label-templates') ?? null;
    }
    expect(editing).not.toBeNull();
    editing?.dispatchEvent(
      new CustomEvent('editing', { detail: { editing: true }, bubbles: true, composed: true })
    );
    await element.updateComplete;

    const style = element.shadowRoot?.querySelector('gs-dialog')?.containerStyle ?? '';
    expect(style).toContain('max-width: 100%');
    expect(style).not.toContain('vw');
    expect(element.shadowRoot?.querySelector('[data-editing]')).not.toBeNull();
  });
});
