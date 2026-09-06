import { expect, test, describe, vi, beforeEach, afterEach } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';

import { hassCall } from '../../src/services/hass-call';
import { GrowspaceTcView } from '../../src/features/tc/containers/growspace-tc-view.container';
import { CultureMediumSchema, resetTcPresence, type CultureMedium } from '../../src/slices/tc';

// The view reaches the strain slice through the culture board container, which
// resolves phenotype references client-side, so the mock answers for every
// export that module imports.
vi.mock('../../src/services/hass-call', () => ({
  hassCall: vi.fn(),
  callService: vi.fn(),
  callFetch: vi.fn(),
  setHass: vi.fn(),
}));

const hassCallMock = vi.mocked(hassCall);

if (!customElements.get('growspace-tc-view')) {
  customElements.define('growspace-tc-view', GrowspaceTcView);
}

const aMedium = (): CultureMedium =>
  CultureMediumSchema.parse({
    id: 'medium-1',
    name: 'MS multiplication',
    created_at: '2026-01-04T09:12:00+00:00',
    updated_at: '2026-01-04T09:12:00+00:00',
    current_version: 1,
    versions: [
      {
        version: 1,
        created_at: '2026-01-04T09:12:00+00:00',
        base_salts: 'MS',
        additives: [],
        hormones: [{ name: 'BAP', amount: 0.5, unit: 'mg/L' }],
        agar_g_per_l: 7,
        sugar_g_per_l: 30,
        ph_target: 5.8,
        notes: '',
      },
    ],
  });

const manifest = (features: string[]) => ({
  contract_version: 1,
  integration_version: '0.1.0',
  features,
  collections: {},
});

/** Every command any surface issues, so a composition can mount all of them. */
function answerEverything(): void {
  hassCallMock.mockImplementation(async (command: string) => {
    if (command.endsWith('/culture_media/list')) return { culture_media: [aMedium()] };
    if (command.endsWith('/culture_lines/list')) return { culture_lines: [] };
    if (command.endsWith('/pairings/list')) return { pairings: [] };
    if (command.endsWith('/maintenance/history')) return { actions: [] };
    return { strains: {} };
  });
}

async function render(features: string[], surface?: string): Promise<GrowspaceTcView> {
  const element = await fixture<GrowspaceTcView>('<growspace-tc-view></growspace-tc-view>');
  element.manifest = manifest(features);
  if (surface) element.setAttribute('surface', surface);
  await element.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await element.updateComplete;
  return element;
}

const surfaceOf = (element: GrowspaceTcView, tag: string) =>
  element.shadowRoot?.querySelector(tag) as HTMLElement | null;

beforeEach(() => {
  resetTcPresence();
  vi.clearAllMocks();
  answerEverything();
});

afterEach(() => {
  resetTcPresence();
});

describe('GrowspaceTcView — what the manifest composes', () => {
  test('renders nothing but the compatibility state for a featureless manifest', async () => {
    const element = await render([]);

    expect(surfaceOf(element, 'growspace-tc-media')).toBeNull();
    expect(surfaceOf(element, 'growspace-tc-cultures')).toBeNull();
    expect(surfaceOf(element, 'growspace-tc-pairings')).toBeNull();
    expect(hassCallMock).not.toHaveBeenCalled();
    expect(element.shadowRoot?.textContent).toContain('Nothing in culture yet');
  });

  test('omits exactly the surface whose feature is missing', async () => {
    const element = await render(['culture_lines', 'maintenance', 'pairings']);

    expect(surfaceOf(element, 'growspace-tc-cultures')).toBeTruthy();
    expect(surfaceOf(element, 'growspace-tc-pairings')).toBeTruthy();
    expect(surfaceOf(element, 'growspace-tc-media')).toBeNull();
  });

  test('tells the board container whether this release serves the acts', async () => {
    const without = await render(['culture_lines']);
    expect(
      (
        without.shadowRoot?.querySelector('growspace-tc-cultures') as unknown as {
          maintenance: boolean;
        }
      ).maintenance
    ).toBe(false);

    const with_ = await render(['culture_lines', 'maintenance']);
    expect(
      (
        with_.shadowRoot?.querySelector('growspace-tc-cultures') as unknown as {
          maintenance: boolean;
        }
      ).maintenance
    ).toBe(true);
  });
});

describe('GrowspaceTcView — selecting one surface', () => {
  const everything = ['culture_lines', 'maintenance', 'culture_media', 'pairings'];

  test('with no surface it stacks them all, which is what the card gets', async () => {
    const element = await render(everything);

    for (const tag of ['growspace-tc-cultures', 'growspace-tc-media', 'growspace-tc-pairings']) {
      expect(surfaceOf(element, tag)?.hidden, tag).toBe(false);
    }
    expect(
      (surfaceOf(element, 'growspace-tc-cultures') as unknown as { surface?: string }).surface
    ).toBeUndefined();
  });

  test('hides the surfaces it is not showing, and unmounts none of them', async () => {
    const element = await render(everything, 'media');

    expect(surfaceOf(element, 'growspace-tc-media')?.hidden).toBe(false);
    expect(surfaceOf(element, 'growspace-tc-cultures')?.hidden).toBe(true);
    expect(surfaceOf(element, 'growspace-tc-pairings')?.hidden).toBe(true);
  });

  test('shows the cultures element for both of its faces, and selects between them', async () => {
    for (const surface of ['worklist', 'cultures']) {
      const element = await render(everything, surface);
      const cultures = surfaceOf(element, 'growspace-tc-cultures');

      expect(cultures?.hidden, surface).toBe(false);
      expect((cultures as unknown as { surface?: string }).surface).toBe(surface);
    }
  });

  test('a surface hidden and shown again is the same element, with its fetch not repeated', async () => {
    const element = await render(everything, 'media');
    const media = surfaceOf(element, 'growspace-tc-media');
    const fetches = hassCallMock.mock.calls.length;

    element.setAttribute('surface', 'pairings');
    await element.updateComplete;
    element.setAttribute('surface', 'media');
    await element.updateComplete;

    expect(surfaceOf(element, 'growspace-tc-media')).toBe(media);
    expect(hassCallMock.mock.calls.length).toBe(fetches);
  });

  test('an open Culture Medium draft survives a switch away and back', async () => {
    const element = await render(everything, 'media');
    const media = surfaceOf(element, 'growspace-tc-media');
    media?.shadowRoot
      ?.querySelector('growspace-tc-medium-library')
      ?.dispatchEvent(
        new CustomEvent('medium-create-requested', { bubbles: true, composed: true })
      );
    await (media as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    expect(media?.shadowRoot?.querySelector('growspace-tc-medium-form')).toBeTruthy();

    element.setAttribute('surface', 'pairings');
    await element.updateComplete;
    element.setAttribute('surface', 'media');
    await element.updateComplete;

    expect(surfaceOf(element, 'growspace-tc-media')?.shadowRoot).toBe(media?.shadowRoot);
    expect(media?.shadowRoot?.querySelector('growspace-tc-medium-form')).toBeTruthy();
  });
});
