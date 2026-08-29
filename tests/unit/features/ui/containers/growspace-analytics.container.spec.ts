import { vi, describe, it, expect, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { atom } from 'nanostores';
import * as uiSlice from '../../../../../src/slices/ui';
import { ViewMode } from '../../../../../src/constants';
import { MetricKey } from '../../../../../src/features/environment/constants';
import '../../../../../src/features/ui/containers/growspace-analytics.container';
import type { GrowspaceAnalyticsContainer } from '../../../../../src/features/ui/containers/growspace-analytics.container';

// Graph toggling is now a slice op the container calls directly (`uiSlice.toggleEnvGraph`).
// `{ spy: true }` keeps every real atom/util while wrapping exports in call-through spies;
// an `importOriginal()` factory would deadlock on the slices/ui index↔dialogs cycle.
vi.mock('../../../../../src/slices/ui', { spy: true });

vi.mock('../../../../../src/features/ui/components/growspace-analytics-ui', () => {
  if (!customElements.get('growspace-analytics-ui')) {
    customElements.define('growspace-analytics-ui', class extends HTMLElement {});
  }
  return {};
});

const createViewStateAtom = (
  overrides: Partial<{
    historyLoading: boolean;
    historyLoaded: boolean;
    activeEnvGraphs: Set<string>;
    linkedGraphGroups: string[][];
    combinedHistory: any;
    graphRanges: any;
  }> = {}
) =>
  atom({
    historyLoading: false,
    historyLoaded: true,
    activeEnvGraphs: new Set<string>(['temperature', 'humidity']),
    linkedGraphGroups: [] as string[][],
    combinedHistory: {},
    graphRanges: {},
    ...overrides,
  });

const buildMockStore = ($analyticsViewState: ReturnType<typeof atom>) => {
  const toggleEnvGraph = vi.fn();
  return {
    history: {
      $analyticsViewState,
      startAutoRefresh: vi.fn(),
      stopAutoRefresh: vi.fn(),
      loadHistoryOnDemand: vi.fn(),
      setGraphRange: vi.fn(),
      unlinkGraphGroup: vi.fn(),
      unlinkGraphMetric: vi.fn(),
      getRange: vi.fn().mockReturnValue('24h'),
      toggleEnvGraph: vi.fn().mockReturnValue(false),
    },
    toggleEnvGraph,
    // Per-card view-mode surface the container forwards to the slice op so it
    // can drop HEADER → STANDARD on this card only.
    ui: { $viewMode: atom(ViewMode.STANDARD), setViewMode: vi.fn() },
    actions: { ui: { toggleEnvGraph } },
  };
};

const mockDevice = { deviceId: 'grow1', name: 'Growspace 1', plants: [] };

describe('GrowspaceAnalyticsContainer', () => {
  let element: GrowspaceAnalyticsContainer;
  let mockStore: ReturnType<typeof buildMockStore>;
  let $analyticsViewState: ReturnType<typeof atom>;

  beforeEach(async () => {
    vi.clearAllMocks();
    $analyticsViewState = createViewStateAtom();
    mockStore = buildMockStore($analyticsViewState);

    element = await fixture<GrowspaceAnalyticsContainer>(
      html`<growspace-analytics></growspace-analytics>`
    );
    (element as any).store = mockStore;
    (element as any).device = mockDevice;
    (element as any)._initControllers();
    element.requestUpdate();
    await element.updateComplete;
  });

  it('renders growspace-analytics-ui when state has active graphs and device', async () => {
    expect(element.shadowRoot?.querySelector('growspace-analytics-ui')).toBeTruthy();
  });

  it('hands the charts a Metric Descriptor table', async () => {
    // The charts derive nothing themselves (ADR-0030), so an empty table here
    // is a silent blackout: every graph would render "No Data".
    const ui = element.shadowRoot?.querySelector('growspace-analytics-ui') as any;

    expect(Object.keys(ui.descriptors ?? {}).length).toBeGreaterThan(0);
    expect(ui.descriptors[MetricKey.TEMPERATURE]).toMatchObject({
      key: MetricKey.TEMPERATURE,
    });
  });

  it('renders empty when device is not set', async () => {
    const el = await fixture<GrowspaceAnalyticsContainer>(
      html`<growspace-analytics></growspace-analytics>`
    );
    (el as any).store = mockStore;
    (el as any)._initControllers();
    el.requestUpdate();
    await el.updateComplete;
    // no device → returns html``
    expect(el.shadowRoot?.querySelector('growspace-analytics-ui')).toBeNull();
  });

  it('renders empty when activeEnvGraphs is empty', async () => {
    $analyticsViewState = createViewStateAtom({ activeEnvGraphs: new Set() });
    mockStore = buildMockStore($analyticsViewState);

    const el = await fixture<GrowspaceAnalyticsContainer>(
      html`<growspace-analytics></growspace-analytics>`
    );
    (el as any).store = mockStore;
    (el as any).device = mockDevice;
    (el as any)._initControllers();
    el.requestUpdate();
    await el.updateComplete;

    expect(el.shadowRoot?.querySelector('growspace-analytics-ui')).toBeNull();
  });

  it('_items returns single-type item for each active graph without groups', async () => {
    // Metrics the card pairs into no Curated Combo: an ungrouped open graph is
    // a plain single item, which is the rule this asserts.
    $analyticsViewState.set({
      historyLoading: false,
      historyLoaded: true,
      activeEnvGraphs: new Set(['humidity', 'co2']),
      linkedGraphGroups: [],
      combinedHistory: {},
      graphRanges: {},
    });
    await element.updateComplete;

    const items = (element as any)._items;
    expect(items).toHaveLength(2);
    expect(items.every((i: any) => i.type === 'single')).toBe(true);
  });

  it('_items types a metric the card pairs into a Curated Combo as a combo', async () => {
    $analyticsViewState.set({
      historyLoading: false,
      historyLoaded: true,
      activeEnvGraphs: new Set(['temperature']),
      linkedGraphGroups: [],
      combinedHistory: {},
      graphRanges: {},
    });
    await element.updateComplete;

    expect((element as any)._items).toEqual([
      { type: 'combo', metrics: ['temperature', 'exhaust'], sortIndex: 0 },
    ]);
  });

  it('_items keeps a Metric Comparison of the combo pair a group', async () => {
    // The two types are orthogonal (ADR-0051): a grower who composed
    // temperature and exhaust into a Comparison owns that grouping, and it
    // must not be silently re-read as the card's editorial claim.
    $analyticsViewState.set({
      historyLoading: false,
      historyLoaded: true,
      activeEnvGraphs: new Set(['temperature', 'exhaust']),
      linkedGraphGroups: [['temperature', 'exhaust']],
      combinedHistory: {},
      graphRanges: {},
    });
    await element.updateComplete;

    expect((element as any)._items).toEqual([
      { type: 'group', metrics: ['temperature', 'exhaust'], sortIndex: 0 },
    ]);
  });

  it('_items groups linked metrics into group-type items', async () => {
    $analyticsViewState.set({
      historyLoading: false,
      historyLoaded: true,
      activeEnvGraphs: new Set(['temperature', 'humidity']),
      linkedGraphGroups: [['temperature', 'humidity']],
      combinedHistory: {},
      graphRanges: {},
    });
    await element.updateComplete;

    const items = (element as any)._items;
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe('group');
    expect(items[0].metrics).toContain('temperature');
    expect(items[0].metrics).toContain('humidity');
  });

  it('_items omits configured metrics without changing shared open graphs', async () => {
    $analyticsViewState.set({
      ...($analyticsViewState.get() as any),
      activeEnvGraphs: new Set(['co2', 'humidity']),
    });
    (element as any).hiddenMetrics = [MetricKey.HUMIDITY];
    await element.updateComplete;

    expect((element as any)._items).toEqual([{ type: 'single', metrics: ['co2'], sortIndex: 3 }]);
    expect($analyticsViewState.get().activeEnvGraphs).toEqual(new Set(['co2', 'humidity']));
  });

  it('_items removes hidden metrics from linked graph groups', async () => {
    $analyticsViewState.set({
      ...$analyticsViewState.get(),
      linkedGraphGroups: [['temperature', 'humidity']],
    });
    (element as any).hiddenMetrics = [MetricKey.HUMIDITY];
    await element.updateComplete;

    expect((element as any)._items).toEqual([
      { type: 'group', metrics: ['temperature'], sortIndex: 0 },
    ]);
  });

  it('_items hides sensor-specific metrics by their base metric key', async () => {
    $analyticsViewState.set({
      ...$analyticsViewState.get(),
      activeEnvGraphs: new Set(['temperature:sensor.canopy']),
    });
    (element as any).hiddenMetrics = [MetricKey.TEMPERATURE];
    await element.updateComplete;

    expect((element as any)._items).toEqual([]);
    expect(element.shadowRoot?.querySelector('growspace-analytics-ui')).toBeNull();
  });

  it('_items only includes active graph metrics from a group', async () => {
    $analyticsViewState.set({
      historyLoading: false,
      historyLoaded: true,
      activeEnvGraphs: new Set(['temperature']), // humidity not active
      linkedGraphGroups: [['temperature', 'humidity']],
      combinedHistory: {},
      graphRanges: {},
    });
    await element.updateComplete;

    const items = (element as any)._items;
    // Group should only contain 'temperature'
    expect(items[0].type).toBe('group');
    expect(items[0].metrics).toEqual(['temperature']);
  });

  it('_items sorts metrics by METRIC_SORT_ORDER', async () => {
    $analyticsViewState.set({
      historyLoading: false,
      historyLoaded: true,
      activeEnvGraphs: new Set(['humidity', 'temperature']),
      linkedGraphGroups: [],
      combinedHistory: {},
      graphRanges: {},
    });
    await element.updateComplete;

    const items = (element as any)._items;
    // temperature should sort before humidity based on METRIC_SORT_ORDER
    expect(items[0].metrics[0]).toBe('temperature');
    expect(items[1].metrics[0]).toBe('humidity');
  });

  it('_items returns empty array when controller is not initialized', async () => {
    const el = await fixture<GrowspaceAnalyticsContainer>(
      html`<growspace-analytics></growspace-analytics>`
    );
    const items = (el as any)._items;
    expect(items).toEqual([]);
  });

  it('toggle-graph event with string detail calls store.actions.ui.toggleEnvGraph', async () => {
    const ui = element.shadowRoot!.querySelector('growspace-analytics-ui')!;
    ui.dispatchEvent(new CustomEvent('toggle-graph', { detail: 'temperature' }));
    expect(uiSlice.toggleEnvGraph).toHaveBeenCalledWith(
      'temperature',
      mockStore.history,
      mockStore.ui,
      'grow1'
    );
  });

  it('toggle-graph event with object detail calls store.actions.ui.toggleEnvGraph with metric', async () => {
    const ui = element.shadowRoot!.querySelector('growspace-analytics-ui')!;
    ui.dispatchEvent(new CustomEvent('toggle-graph', { detail: { metric: 'co2' } }));
    expect(uiSlice.toggleEnvGraph).toHaveBeenCalledWith(
      'co2',
      mockStore.history,
      mockStore.ui,
      'grow1'
    );
  });

  it('toggle-graph event with empty metric does not call toggleEnvGraph', async () => {
    const ui = element.shadowRoot!.querySelector('growspace-analytics-ui')!;
    ui.dispatchEvent(new CustomEvent('toggle-graph', { detail: { metric: '' } }));
    expect(uiSlice.toggleEnvGraph).not.toHaveBeenCalled();
  });

  it('set-range event calls setGraphRange and loadHistoryOnDemand', async () => {
    const ui = element.shadowRoot!.querySelector('growspace-analytics-ui')!;
    ui.dispatchEvent(new CustomEvent('set-range', { detail: '7d' }));
    expect(mockStore.history.setGraphRange).toHaveBeenCalledWith('grow1', '7d');
    expect(mockStore.history.loadHistoryOnDemand).toHaveBeenCalled();
  });

  it('set-range event does nothing when device is not set', async () => {
    const el = await fixture<GrowspaceAnalyticsContainer>(
      html`<growspace-analytics></growspace-analytics>`
    );
    (el as any).store = mockStore;
    (el as any)._initControllers();

    (el as any)._handleSetRange(new CustomEvent('set-range', { detail: '7d' }));

    expect(mockStore.history.setGraphRange).not.toHaveBeenCalled();
  });

  it('unlink-graphs event calls store.history.unlinkGraphGroup', async () => {
    const ui = element.shadowRoot!.querySelector('growspace-analytics-ui')!;
    ui.dispatchEvent(new CustomEvent('unlink-graphs', { detail: 0 }));
    expect(mockStore.history.unlinkGraphGroup).toHaveBeenCalledWith(0);
  });

  it('unlink-graph event calls store.history.unlinkGraphMetric', async () => {
    const ui = element.shadowRoot!.querySelector('growspace-analytics-ui')!;
    ui.dispatchEvent(new CustomEvent('unlink-graph', { detail: 'temperature' }));
    expect(mockStore.history.unlinkGraphMetric).toHaveBeenCalledWith('temperature');
  });

  it('disconnectedCallback calls store.history.stopAutoRefresh', async () => {
    element.disconnectedCallback();
    expect(mockStore.history.stopAutoRefresh).toHaveBeenCalledOnce();
  });

  it('firstUpdated calls loadHistoryOnDemand when history not loaded', async () => {
    $analyticsViewState = createViewStateAtom({ historyLoaded: false, historyLoading: false });
    mockStore = buildMockStore($analyticsViewState);

    const el = await fixture<GrowspaceAnalyticsContainer>(
      html`<growspace-analytics></growspace-analytics>`
    );
    (el as any).store = mockStore;
    (el as any)._initControllers();
    el.requestUpdate();
    await el.updateComplete;

    // firstUpdated and updated lifecycle both check and trigger loadHistoryOnDemand
    expect(mockStore.history.loadHistoryOnDemand).toHaveBeenCalled();
  });
});
