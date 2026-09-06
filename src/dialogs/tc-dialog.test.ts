import { expect, test, describe, vi, beforeEach, afterEach } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';

import './tc-dialog';
import type { TcDialog } from './tc-dialog';
import { hassCall } from '../services/hass-call';
import { activeDialog$, __resetUiSliceForTests } from '../slices/ui';
import { resetTcPresence, type TcManifest } from '../slices/tc';

// Every surface self-fetches on mount, so the transport answers all of them.
vi.mock('../services/hass-call', () => ({
  hassCall: vi.fn(),
  callService: vi.fn(),
  callFetch: vi.fn(),
  setHass: vi.fn(),
}));

const hassCallMock = vi.mocked(hassCall);

const manifest = (features: string[]): TcManifest => ({
  contract_version: 1,
  integration_version: '0.1.0',
  features,
  collections: {},
});

const EVERYTHING = ['culture_lines', 'maintenance', 'culture_media', 'pairings'];

async function open(options: {
  features?: string[];
  initialTab?: 'worklist' | 'cultures' | 'media' | 'pairings';
  scrollToField?: string;
}): Promise<TcDialog> {
  const element = await fixture<TcDialog>('<tc-dialog></tc-dialog>');
  element.open = true;
  element.manifest = manifest(options.features ?? EVERYTHING);
  if (options.initialTab) element.initialTab = options.initialTab;
  if (options.scrollToField) element.scrollToField = options.scrollToField;
  await element.updateComplete;
  return element;
}

const view = (element: TcDialog) => element.shadowRoot?.querySelector('growspace-tc-view');

const tabs = (element: TcDialog): string[] =>
  [...(element.shadowRoot?.querySelectorAll('.tab-bar button') ?? [])].map(
    (button) => button.getAttribute('data-tab') ?? ''
  );

const activeTab = (element: TcDialog): string | undefined =>
  element.shadowRoot?.querySelector('.tab-bar button.active')?.getAttribute('data-tab') ??
  undefined;

async function untilView(element: TcDialog): Promise<Element> {
  await vi.waitFor(() => expect(view(element)).not.toBeNull());
  await element.updateComplete;
  return view(element)!;
}

beforeEach(() => {
  __resetUiSliceForTests();
  resetTcPresence();
  vi.clearAllMocks();
  hassCallMock.mockImplementation(async (command: string) => {
    if (command.endsWith('/culture_media/list')) return { culture_media: [] };
    if (command.endsWith('/culture_lines/list')) return { culture_lines: [] };
    if (command.endsWith('/pairings/list')) return { pairings: [] };
    return { strains: {} };
  });
});

afterEach(() => {
  resetTcPresence();
});

describe('TcDialog — the frame opens before the chunk', () => {
  test('the frame and its tab bar are there while the view is still loading', async () => {
    const element = await open({});

    // Nothing here waits on the fetch: a menu item that silently opens nothing
    // for the length of a round trip is indistinguishable from a broken one.
    expect(element.shadowRoot?.querySelector('gs-dialog')).not.toBeNull();
    expect(tabs(element)).toEqual(['worklist', 'cultures', 'media', 'pairings']);
    expect(element.shadowRoot?.querySelector('.pane')?.textContent).toContain('Loading');
    expect(view(element)).toBeNull();

    await untilView(element);
    expect(element.shadowRoot?.querySelector('.pane')?.textContent).not.toContain('Loading');
  });

  test('a second open goes straight to the view, with no loading line', async () => {
    await untilView(await open({}));

    // `loadLazyChunk` memoises by chunk name, so the second attempt resolves
    // within a microtask and the loading state is a first-open state only.
    const second = await open({});
    await second.updateComplete;
    await second.updateComplete;

    expect(view(second)).not.toBeNull();
  });
});

describe('TcDialog — which tab it lands on', () => {
  test('leads with the worklist when the payload names no tab', async () => {
    const element = await open({});

    expect(activeTab(element)).toBe('worklist');
    expect((await untilView(element)) as unknown as { surface: string }).toHaveProperty(
      'surface',
      'worklist'
    );
  });

  test('lands on the tab the payload named', async () => {
    const element = await open({ initialTab: 'media' });

    expect(activeTab(element)).toBe('media');
    expect((await untilView(element)) as unknown as { surface: string }).toHaveProperty(
      'surface',
      'media'
    );
  });

  test('clamps a tab this installation does not offer to the first one it does', async () => {
    const element = await open({ features: ['culture_media'], initialTab: 'pairings' });

    expect(tabs(element)).toEqual(['media']);
    expect(activeTab(element)).toBe('media');
  });

  test('renders no tab bar for a featureless manifest, and the view says why', async () => {
    const element = await open({ features: [] });

    expect(element.shadowRoot?.querySelector('.tab-bar')).toBeNull();
    const rendered = await untilView(element);
    expect(rendered.shadowRoot?.textContent).toContain('Nothing in culture yet');
  });
});

describe('TcDialog — switching tabs', () => {
  test('does not write the page-global activeDialog$', async () => {
    const element = await open({});
    await untilView(element);
    const before = activeDialog$.get();

    (element.shadowRoot?.querySelector('[data-tab="media"]') as HTMLButtonElement).click();
    await element.updateComplete;

    expect(activeTab(element)).toBe('media');
    expect((view(element) as unknown as { surface: string }).surface).toBe('media');
    // One card's navigation is not everybody's: the visible tab is the shell's
    // own state, and `activeDialog$` is a page-global atom.
    expect(activeDialog$.get()).toBe(before);
  });

  test('hands the view a surface rather than remounting it', async () => {
    const element = await open({});
    const mounted = await untilView(element);

    (element.shadowRoot?.querySelector('[data-tab="pairings"]') as HTMLButtonElement).click();
    await element.updateComplete;
    (element.shadowRoot?.querySelector('[data-tab="worklist"]') as HTMLButtonElement).click();
    await element.updateComplete;

    expect(view(element)).toBe(mounted);
  });
});

describe('TcDialog — the deep-link hint', () => {
  test('scrolls a marked element in the tab that is showing', async () => {
    const element = await open({ scrollToField: 'medium-1', initialTab: 'media' });
    const rendered = await untilView(element);

    const marked = document.createElement('div');
    marked.setAttribute('data-scroll-target', 'medium-1');
    const scrolled: unknown[] = [];
    marked.scrollIntoView = (...args: unknown[]) => scrolled.push(args);
    rendered.shadowRoot?.appendChild(marked);
    await element.updateComplete;
    element.requestUpdate();
    await element.updateComplete;

    expect(scrolled).toHaveLength(1);
  });

  test('is inert when nothing carries the marker', async () => {
    const element = await open({ scrollToField: 'no-such-row' });
    await untilView(element);

    // No throw, no tab change, nothing to scroll to: a hint, not a selection.
    expect(activeTab(element)).toBe('worklist');
  });
});
