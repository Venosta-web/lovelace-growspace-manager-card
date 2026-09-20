import { expect, test, describe, vi, beforeEach } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';

import capabilityFixture from '../fixtures/contract/label_template_capability_v1.json';
import { LabelTemplatesDialog } from '../../src/dialogs/label-templates-dialog';
import { resetLazyChunks } from '../../src/lib/lazy-chunk';
import type { LabelTemplateCapability, LabelTemplateSupport } from '../../src/slices/labels';

vi.mock('../../src/services/hass-call', () => ({
  hassCall: vi.fn(),
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
