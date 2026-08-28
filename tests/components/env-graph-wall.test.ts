import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { atom } from 'nanostores';
import { MetricKey, ViewMode } from '../../src/constants';
import type { CardTaskState } from '../../src/features/tasks/task-state';
import '../../src/features/ui/containers/growspace-analytics.container';
import type { GrowspaceAnalyticsContainer } from '../../src/features/ui/containers/growspace-analytics.container';
import '../../src/features/ui/components/growspace-analytics-ui';
import type { GrowspaceAnalyticsUI } from '../../src/features/ui/components/growspace-analytics-ui';

// ha-dialog is Home Assistant's; a bare stub is enough here because every
// assertion below is about where our own nodes sit, not about dialog chrome.
for (const tag of ['ha-dialog', 'ha-icon-button', 'ha-svg-icon']) {
  if (!customElements.get(tag)) customElements.define(tag, class extends HTMLElement {});
}

const DEVICE = { deviceId: 'grow1', name: 'Growspace 1', plants: [] };

function setViewportIsMobile(isMobile: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('max-width') ? isMobile : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function buildStore(
  opts: {
    activeEnvGraphs?: Set<string>;
    taskState?: CardTaskState;
    startInGraphWall?: boolean;
    cardPreview?: boolean;
    hiddenMetrics?: MetricKey[];
  } = {}
) {
  const $analyticsViewState = atom({
    historyLoading: false,
    historyLoaded: true,
    activeEnvGraphs: opts.activeEnvGraphs ?? new Set<string>(['temperature', 'humidity']),
    linkedGraphGroups: [] as string[][],
    combinedHistory: {},
    graphRanges: {},
  });
  const $taskState = atom<CardTaskState>(opts.taskState ?? { kind: 'idle' });
  return {
    $analyticsViewState,
    $taskState,
    store: {
      history: {
        $analyticsViewState,
        startAutoRefresh: vi.fn(),
        stopAutoRefresh: vi.fn(),
        loadHistoryOnDemand: vi.fn(),
        setGraphRange: vi.fn(),
        unlinkGraphGroup: vi.fn(),
        unlinkGraphMetric: vi.fn(),
        getRange: vi.fn().mockReturnValue('24h'),
      },
      ui: { $viewMode: atom(ViewMode.STANDARD), setViewMode: vi.fn(), $taskState },
      grid: { $selectedDevice: atom('grow1') },
    },
  };
}

async function mountContainer(opts: Parameters<typeof buildStore>[0] = {}) {
  const built = buildStore(opts);
  const element = await fixture<GrowspaceAnalyticsContainer>(
    html`<growspace-analytics></growspace-analytics>`
  );
  (element as any).store = built.store;
  (element as any).device = DEVICE;
  (element as any).deviceSnapshot = null;
  (element as any).startInGraphWall = opts.startInGraphWall ?? false;
  (element as any).cardPreview = opts.cardPreview ?? false;
  (element as any).hiddenMetrics = opts.hiddenMetrics ?? [];
  (element as any)._initControllers();
  element.requestUpdate();
  await element.updateComplete;
  return { element, ...built };
}

const uiOf = (element: GrowspaceAnalyticsContainer): GrowspaceAnalyticsUI =>
  element.shadowRoot!.querySelector('growspace-analytics-ui')! as GrowspaceAnalyticsUI;

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Env Graph Wall — when the toggle exists at all', () => {
  beforeEach(() => setViewportIsMobile(false));

  it('offers the toggle on desktop with no card task in flight', async () => {
    const { element } = await mountContainer();

    expect(uiOf(element).canFullscreen).toBe(true);
  });

  it('withholds the toggle on mobile, so the overlay is desktop-only', async () => {
    setViewportIsMobile(true);
    const { element } = await mountContainer();

    expect(uiOf(element).canFullscreen).toBe(false);
  });

  it('withholds the toggle in Home Assistant card-editor previews', async () => {
    const { element } = await mountContainer({ cardPreview: true });

    expect(uiOf(element).canFullscreen).toBe(false);
  });

  it.each([
    ['compare', { kind: 'compare' } as unknown as CardTaskState],
    ['arrange', { kind: 'arrange' } as unknown as CardTaskState],
    ['select_plants', { kind: 'select_plants' } as CardTaskState],
  ])('withholds the toggle while %s is active', async (_name, taskState) => {
    const { element } = await mountContainer({ taskState });

    expect(uiOf(element).canFullscreen).toBe(false);
  });

  it('renders no button element at all when withheld, so it cannot be tabbed to', async () => {
    setViewportIsMobile(true);
    const { element } = await mountContainer();
    const ui = uiOf(element);
    await ui.updateComplete;

    expect(ui.shadowRoot!.querySelector('.fullscreen-toggle')).toBeNull();
  });
});

describe('Env Graph Wall — opening and closing', () => {
  beforeEach(() => setViewportIsMobile(false));

  it('starts open when the analytics card explicitly configures Graph Wall startup', async () => {
    const { element } = await mountContainer({ startInGraphWall: true });
    const ui = uiOf(element);
    await ui.updateComplete;

    expect(ui.fullscreen).toBe(true);
    expect(ui.shadowRoot!.querySelector('ha-dialog')!.hasAttribute('open')).toBe(true);

    ui.shadowRoot!.querySelector<HTMLElement>('.fullscreen-toggle')!.click();
    await element.updateComplete;
    await ui.updateComplete;
    element.requestUpdate();
    await element.updateComplete;

    expect(ui.fullscreen).toBe(false);
  });

  it('does not consume Graph Wall startup while rendered in the card editor', async () => {
    const { element } = await mountContainer({
      startInGraphWall: true,
      cardPreview: true,
    });
    const ui = uiOf(element);
    await ui.updateComplete;

    expect(ui.fullscreen).toBe(false);
    expect(ui.shadowRoot!.querySelector('ha-dialog')!.hasAttribute('open')).toBe(false);
  });

  it('does not start Graph Wall when every open graph is hidden by the card', async () => {
    const { element } = await mountContainer({
      activeEnvGraphs: new Set(['temperature', 'humidity']),
      startInGraphWall: true,
      hiddenMetrics: [MetricKey.TEMPERATURE, MetricKey.HUMIDITY],
    });

    expect(element.shadowRoot!.querySelector('growspace-analytics-ui')).toBeNull();
    expect((element as any)._fullscreen).toBe(false);
  });

  it('waits for the standalone card to open its default graphs before starting the Wall', async () => {
    const { element, $analyticsViewState } = await mountContainer({
      activeEnvGraphs: new Set(),
      startInGraphWall: true,
    });

    expect(element.shadowRoot!.querySelector('growspace-analytics-ui')).toBeNull();

    $analyticsViewState.set({
      ...$analyticsViewState.get(),
      activeEnvGraphs: new Set(['temperature', 'humidity']),
    });
    await element.updateComplete;
    const ui = uiOf(element);
    await ui.updateComplete;

    expect(ui.fullscreen).toBe(true);
  });

  it('opens on the toggle and closes on the same button', async () => {
    const { element } = await mountContainer();
    const ui = uiOf(element);
    await ui.updateComplete;

    ui.shadowRoot!.querySelector<HTMLElement>('.fullscreen-toggle')!.click();
    await element.updateComplete;
    await ui.updateComplete;
    expect(ui.fullscreen).toBe(true);
    expect(ui.shadowRoot!.querySelector('ha-dialog')!.hasAttribute('open')).toBe(true);

    ui.shadowRoot!.querySelector<HTMLElement>('.fullscreen-toggle')!.click();
    await element.updateComplete;
    await ui.updateComplete;
    expect(ui.fullscreen).toBe(false);
    expect(ui.shadowRoot!.querySelector('ha-dialog')!.hasAttribute('open')).toBe(false);
  });

  it('closes on Escape', async () => {
    const { element } = await mountContainer();
    const ui = uiOf(element);
    await ui.updateComplete;

    ui.shadowRoot!.querySelector<HTMLElement>('.fullscreen-toggle')!.click();
    await element.updateComplete;
    await ui.updateComplete;
    expect(ui.fullscreen).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await element.updateComplete;
    await ui.updateComplete;

    expect(ui.fullscreen).toBe(false);
  });

  it('closes itself when the last Open Env Graph is closed elsewhere', async () => {
    const { element, $analyticsViewState } = await mountContainer();
    const ui = uiOf(element);
    await ui.updateComplete;

    ui.shadowRoot!.querySelector<HTMLElement>('.fullscreen-toggle')!.click();
    await element.updateComplete;
    expect((element as any)._fullscreen).toBe(true);

    $analyticsViewState.set({
      ...($analyticsViewState.get() as any),
      activeEnvGraphs: new Set<string>(),
    });
    await element.updateComplete;
    await element.updateComplete;

    expect((element as any)._fullscreen).toBe(false);
  });
});

describe('Env Graph Wall — one instance of every chart', () => {
  beforeEach(() => setViewportIsMobile(false));

  async function mountUI(): Promise<GrowspaceAnalyticsUI> {
    const ui = await fixture<GrowspaceAnalyticsUI>(
      html`<growspace-analytics-ui></growspace-analytics-ui>`
    );
    ui.items = [
      { type: 'single', metrics: ['temperature'] },
      { type: 'single', metrics: ['humidity'] },
    ];
    ui.device = DEVICE as never;
    ui.canFullscreen = true;
    await ui.updateComplete;
    return ui;
  }

  it('moves the charts into the dialog rather than building a second set', async () => {
    const ui = await mountUI();
    const before = [...ui.shadowRoot!.querySelectorAll('growspace-env-chart')];
    expect(before).toHaveLength(2);

    ui.fullscreen = true;
    await ui.updateComplete;

    const dialog = ui.shadowRoot!.querySelector('ha-dialog')!;
    const graphs = ui.shadowRoot!.querySelector('.graphs-container')!;
    expect(graphs.parentElement).toBe(dialog);
    expect(graphs.classList.contains('wall')).toBe(true);

    const during = [...ui.shadowRoot!.querySelectorAll('growspace-env-chart')];
    expect(during).toHaveLength(2);
    // Identity, not count: these are the very same elements, so the
    // crop-steering PollingController and the tank fetch never restart.
    expect(during[0]).toBe(before[0]);
    expect(during[1]).toBe(before[1]);
  });

  it('returns the same chart elements to the inline slot on close', async () => {
    const ui = await mountUI();
    const before = [...ui.shadowRoot!.querySelectorAll('growspace-env-chart')];

    ui.fullscreen = true;
    await ui.updateComplete;
    ui.fullscreen = false;
    await ui.updateComplete;

    const graphs = ui.shadowRoot!.querySelector('.graphs-container')!;
    expect(graphs.parentElement).not.toBe(ui.shadowRoot!.querySelector('ha-dialog'));
    expect(graphs.classList.contains('wall')).toBe(false);

    const after = [...ui.shadowRoot!.querySelectorAll('growspace-env-chart')];
    expect(after[0]).toBe(before[0]);
    expect(after[1]).toBe(before[1]);
  });

  it('carries the time-range row into the overlay as its toolbar', async () => {
    const ui = await mountUI();
    const row = ui.shadowRoot!.querySelector('.time-range-selector')!;

    ui.fullscreen = true;
    await ui.updateComplete;

    expect(ui.shadowRoot!.querySelector('ha-dialog')!.contains(row)).toBe(true);
    expect(ui.shadowRoot!.querySelector('.time-range-selector')).toBe(row);
  });

  it('uses equal flexible rows and lets custom-routed charts stretch with them', async () => {
    const ui = await mountUI();
    ui.fullscreen = true;
    await ui.updateComplete;

    const graphs = ui.shadowRoot!.querySelector<HTMLElement>('.graphs')!;
    const tank = document.createElement('tank-water-chart');
    const steering = document.createElement('crop-steering-day-chart');
    graphs.append(tank, steering);

    expect(getComputedStyle(graphs).gridAutoRows).toBe('minmax(max-content, 1fr)');
    expect(getComputedStyle(tank).alignSelf).not.toBe('start');
    expect(getComputedStyle(steering).alignSelf).not.toBe('start');
  });
});
