import { expect, test, describe, vi, beforeEach, afterEach } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';

import { hassCall } from '../../src/services/hass-call';
import { WSError } from '../../src/services/errors';
import { GrowspaceTcMedia } from '../../src/features/tc/containers/growspace-tc-media.container';
import { CultureMediumSchema, resetTcPresence, type CultureMedium } from '../../src/slices/tc';

// The library was extracted out of `growspace-tc-view`, which had been the
// composition of TC's surfaces and one of those surfaces at once. These are
// that surface's tests, unchanged in what they assert.
vi.mock('../../src/services/hass-call', () => ({
  hassCall: vi.fn(),
  callService: vi.fn(),
  callFetch: vi.fn(),
  setHass: vi.fn(),
}));

const hassCallMock = vi.mocked(hassCall);

if (!customElements.get('growspace-tc-media')) {
  customElements.define('growspace-tc-media', GrowspaceTcMedia);
}

const aVersion = (version: number, overrides: Record<string, unknown> = {}) => ({
  version,
  created_at: `2026-0${version}-04T09:12:00+00:00`,
  base_salts: 'MS',
  additives: [],
  hormones: [{ name: 'BAP', amount: 0.5 * version, unit: 'mg/L' }],
  agar_g_per_l: 7,
  sugar_g_per_l: 30,
  ph_target: 5.8,
  notes: '',
  ...overrides,
});

const aMedium = (overrides: Record<string, unknown> = {}): CultureMedium =>
  CultureMediumSchema.parse({
    id: 'medium-1',
    name: 'MS multiplication',
    created_at: '2026-01-04T09:12:00+00:00',
    updated_at: '2026-01-04T09:12:00+00:00',
    current_version: 1,
    versions: [aVersion(1)],
    ...overrides,
  });

/**
 * Mount the container. It fetches on connect: it is rendered only where the
 * manifest serves the feature, so being connected is the whole condition.
 */
async function render(): Promise<GrowspaceTcMedia> {
  const element = await fixture<GrowspaceTcMedia>('<growspace-tc-media></growspace-tc-media>');
  await vi.waitFor(() =>
    expect((element as unknown as { _loading: boolean })._loading).toBe(false)
  );
  await element.updateComplete;
  return element;
}

const library = (element: GrowspaceTcMedia) =>
  element.shadowRoot?.querySelector('growspace-tc-medium-library');
const form = (element: GrowspaceTcMedia) =>
  element.shadowRoot?.querySelector('growspace-tc-medium-form');

/** Open the editor the way the library does — through the edit intent. */
async function openEditor(element: GrowspaceTcMedia): Promise<void> {
  library(element)?.dispatchEvent(
    new CustomEvent('medium-edit-requested', {
      detail: { id: 'medium-1' },
      bubbles: true,
      composed: true,
    })
  );
  await element.updateComplete;
}

/** Submit the open editor, the way the form does. */
function save(element: GrowspaceTcMedia): void {
  form(element)?.dispatchEvent(
    new CustomEvent('medium-save-requested', {
      detail: { id: 'medium-1', draft: { name: 'MS multiplication' } },
      bubbles: true,
      composed: true,
    })
  );
}

beforeEach(() => {
  resetTcPresence();
  vi.clearAllMocks();
  hassCallMock.mockResolvedValue({ culture_media: [aMedium()] });
});

afterEach(() => {
  resetTcPresence();
});

describe('GrowspaceTcMedia', () => {
  test('fetches the library and hands it to the list', async () => {
    const element = await render();

    expect(hassCallMock.mock.calls[0][0]).toBe('growspace_manager_tc/culture_media/list');
    expect(library(element)?.media).toHaveLength(1);
  });

  test('reports a failed fetch instead of showing an empty library', async () => {
    hassCallMock.mockRejectedValue(new WSError('internal_error', 'the backend fell over'));

    const element = await render();

    expect(element.shadowRoot?.querySelector('[role="alert"]')?.textContent).toContain(
      'the backend fell over'
    );
  });

  test('opens an empty form on the create intent', async () => {
    const element = await render();

    library(element)?.dispatchEvent(
      new CustomEvent('medium-create-requested', { bubbles: true, composed: true })
    );
    await element.updateComplete;

    expect(form(element)?.medium).toBeUndefined();
    expect(library(element)).toBeNull();
  });

  test('opens the form on the medium the edit intent named', async () => {
    const element = await render();

    library(element)?.dispatchEvent(
      new CustomEvent('medium-edit-requested', {
        detail: { id: 'medium-1' },
        bubbles: true,
        composed: true,
      })
    );
    await element.updateComplete;

    expect(form(element)?.medium?.id).toBe('medium-1');
  });

  test('sends an edit as an update and closes the form on success', async () => {
    const element = await render();
    await openEditor(element);
    const forked = aMedium({ current_version: 2, versions: [aVersion(1), aVersion(2)] });
    hassCallMock.mockResolvedValue({ medium: forked });

    save(element);
    await vi.waitFor(() => expect(form(element)).toBeNull());

    expect(hassCallMock.mock.calls[1][0]).toBe('growspace_manager_tc/culture_media/update');
    expect(library(element)?.media[0].current_version).toBe(2);
  });

  test('keeps the form open, holding the draft, when the backend rejects a value', async () => {
    const element = await render();
    await openEditor(element);
    hassCallMock.mockRejectedValue(
      new WSError('validation_failed', 'pH target must be between 3 and 9.')
    );

    save(element);
    await vi.waitFor(() => expect(form(element)?.error).toBeTruthy());

    expect(form(element)?.error).toContain('pH target');
  });

  test('asks before deleting, and says what the deletion takes with it', async () => {
    const element = await render();

    library(element)?.dispatchEvent(
      new CustomEvent('medium-delete-requested', {
        detail: { id: 'medium-1' },
        bubbles: true,
        composed: true,
      })
    );
    await element.updateComplete;

    const confirmation = element.shadowRoot?.querySelector('.confirm');
    expect(confirmation?.textContent).toContain('MS multiplication');
    expect(confirmation?.textContent).toContain('1 recorded versions');
    expect(hassCallMock).toHaveBeenCalledTimes(1);
  });

  test('deletes only once the confirmation is accepted', async () => {
    const element = await render();
    library(element)?.dispatchEvent(
      new CustomEvent('medium-delete-requested', {
        detail: { id: 'medium-1' },
        bubbles: true,
        composed: true,
      })
    );
    await element.updateComplete;
    hassCallMock.mockResolvedValue({ medium_id: 'medium-1' });

    const buttons = [...(element.shadowRoot?.querySelectorAll('.confirm button') ?? [])];
    (buttons[buttons.length - 1] as HTMLButtonElement).click();
    await vi.waitFor(() => expect(library(element)?.media).toHaveLength(0));

    expect(hassCallMock.mock.calls[1][0]).toBe('growspace_manager_tc/culture_media/delete');
  });

  test('a cancelled confirmation deletes nothing', async () => {
    const element = await render();
    library(element)?.dispatchEvent(
      new CustomEvent('medium-delete-requested', {
        detail: { id: 'medium-1' },
        bubbles: true,
        composed: true,
      })
    );
    await element.updateComplete;

    const buttons = [...(element.shadowRoot?.querySelectorAll('.confirm button') ?? [])];
    (buttons[0] as HTMLButtonElement).click();
    await element.updateComplete;

    expect(element.shadowRoot?.querySelector('.confirm')).toBeNull();
    expect(hassCallMock).toHaveBeenCalledTimes(1);
  });
});
