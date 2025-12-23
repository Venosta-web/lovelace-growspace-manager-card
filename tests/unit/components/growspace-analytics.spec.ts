import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { html, render } from 'lit';
import { GrowspaceAnalytics } from '../../../src/components/growspace-analytics';
import { GrowspaceHistoryController } from '../../../src/controllers/growspace-history-controller';
import { historyContext, hassContext } from '../../../src/context';
import { ContextProvider } from '@lit/context';
import * as historyStore from '../../../src/store/history-store';

// Mock child components
vi.mock('../../../src/growspace-env-chart', () => {
    const GrowspaceEnvChart = class extends HTMLElement {
        metrics = [];
        metricKey = '';
        isCombined = false;
    };
    customElements.define('growspace-env-chart', GrowspaceEnvChart);
    return { GrowspaceEnvChart };
});

// Mock history store
vi.mock('../../../src/store/history-store', () => ({
    $historyCache: { get: vi.fn(), subscribe: vi.fn(() => vi.fn()) },
    $historyLoading: { get: vi.fn(), subscribe: vi.fn(() => vi.fn()) },
    $historyLoaded: { get: vi.fn(), subscribe: vi.fn(() => vi.fn()) },
    $activeEnvGraphs: { get: vi.fn(), subscribe: vi.fn(() => vi.fn()) },
    $linkedGraphGroups: { get: vi.fn(), subscribe: vi.fn(() => vi.fn()) },
    $graphRanges: { get: vi.fn(), subscribe: vi.fn(() => vi.fn()) },
    $combinedHistory: { get: vi.fn(), subscribe: vi.fn(() => vi.fn()) },
    setGraphRange: vi.fn(),
    toggleEnvGraph: vi.fn(),
    unlinkGraphGroup: vi.fn(),
    unlinkGraphMetric: vi.fn(),
    getGraphRange: vi.fn().mockReturnValue('24h')
}));

describe('GrowspaceAnalytics', () => {
    let element: GrowspaceAnalytics;
    let historyControllerMock: any;
    let hassMock: any;
    let historyProvider: ContextProvider<any>;
    let hassProvider: ContextProvider<any>;
    let container: HTMLElement;

    beforeEach(async () => {
        container = document.createElement('div');
        document.body.appendChild(container);

        // Reset store mocks
        vi.mocked(historyStore.$historyCache.get).mockReturnValue({});
        vi.mocked(historyStore.$historyLoading.get).mockReturnValue(false);
        vi.mocked(historyStore.$historyLoaded.get).mockReturnValue(false);
        vi.mocked(historyStore.$activeEnvGraphs.get).mockReturnValue(new Set());
        vi.mocked(historyStore.$linkedGraphGroups.get).mockReturnValue([]);
        vi.mocked(historyStore.$combinedHistory.get).mockReturnValue({
            temperature: [], humidity: [], vpd: [], co2: [], light: [],
            soil_moisture: [], exhaust: [], humidifier: [], dehumidifier: [],
            circulation_fan: [], irrigation: [], drain: [], optimal: []
        });

        historyControllerMock = {
            getRange: vi.fn().mockReturnValue('24h'),
            setGraphRange: historyStore.setGraphRange, // Use mocked action
            toggleEnvGraph: historyStore.toggleEnvGraph,
            unlinkGraphGroup: historyStore.unlinkGraphGroup,
            unlinkGraphMetric: historyStore.unlinkGraphMetric,
            loadHistoryOnDemand: vi.fn().mockResolvedValue(undefined),
            isHistoryLoaded: false,
            isHistoryLoading: false,
            // Controller properties that components might still access directly
            get activeEnvGraphs() { return historyStore.$activeEnvGraphs.get(); },
            get linkedGraphGroups() { return historyStore.$linkedGraphGroups.get(); },
            get combinedHistory() { return historyStore.$combinedHistory.get(); }
        };

        hassMock = {
            states: {},
            locale: { language: 'en' }
        };

        // Create providers
        const wrapper = document.createElement('div');
        historyProvider = new ContextProvider(wrapper, historyContext, historyControllerMock);
        hassProvider = new ContextProvider(wrapper, hassContext, hassMock);

        container.appendChild(wrapper);

        element = new GrowspaceAnalytics();
        element.device = {
            device_id: 'd1',
            name: 'Grow Tent',
            sensors: {},
            overview_entity_id: 'sensor.grow_tent_overview'
        } as any;

        wrapper.appendChild(element);
        await new Promise(r => setTimeout(r, 0));
    });

    afterEach(() => {
        document.body.removeChild(container);
        vi.clearAllMocks();
    });

    it('should be defined', () => {
        expect(element).toBeInstanceOf(GrowspaceAnalytics);
    });

    it('should render nothing if no active graphs', async () => {
        vi.mocked(historyStore.$activeEnvGraphs.get).mockReturnValue(new Set());
        element.requestUpdate();
        await element.updateComplete;

        const graphs = element.shadowRoot?.querySelectorAll('growspace-env-chart');
        expect(graphs?.length).toBe(0);
    });

    it('should render single graph for single metric', async () => {
        vi.mocked(historyStore.$activeEnvGraphs.get).mockReturnValue(new Set(['temperature']));

        // Trigger update logic
        (element as any)._computeItemsToRender();
        element.requestUpdate();
        await element.updateComplete;

        const graphs = element.shadowRoot?.querySelectorAll('growspace-env-chart');
        expect(graphs?.length).toBe(1);
        expect((graphs?.[0] as any).metricKey).toBe('temperature');
    });

    it('should render combined graph for grouped metrics', async () => {
        vi.mocked(historyStore.$activeEnvGraphs.get).mockReturnValue(new Set(['temperature', 'humidity']));
        vi.mocked(historyStore.$linkedGraphGroups.get).mockReturnValue([['temperature', 'humidity']]);

        (element as any)._computeItemsToRender();
        element.requestUpdate();
        await element.updateComplete;

        const graphs = element.shadowRoot?.querySelectorAll('growspace-env-chart');
        expect(graphs?.length).toBe(1);
        expect((graphs?.[0] as any).isCombined).toBe(true);
        expect((graphs?.[0] as any).metrics).toEqual(['temperature', 'humidity']);
    });

    it('should handle time range selection', async () => {
        vi.mocked(historyStore.$activeEnvGraphs.get).mockReturnValue(new Set(['temperature']));
        (element as any)._computeItemsToRender();
        element.requestUpdate();
        await element.updateComplete;

        const rangeBtn = element.shadowRoot?.querySelector('.range-btn') as HTMLElement;
        rangeBtn.click();

        expect(historyStore.setGraphRange).toHaveBeenCalledWith('1h');
    });

    it('should handle toggle graph event', async () => {
        vi.mocked(historyStore.$activeEnvGraphs.get).mockReturnValue(new Set(['temperature']));
        (element as any)._computeItemsToRender();
        element.requestUpdate();
        await element.updateComplete;

        const chart = element.shadowRoot?.querySelector('growspace-env-chart');
        chart?.dispatchEvent(new CustomEvent('toggle-graph', { detail: 'temperature' }));

        expect(historyStore.toggleEnvGraph).toHaveBeenCalledWith({
            metric: 'temperature',
            visible: false
        });
    });

    it('should handle toggle graph event with metric property in detail', async () => {
        vi.mocked(historyStore.$activeEnvGraphs.get).mockReturnValue(new Set(['temperature']));
        (element as any)._computeItemsToRender();
        element.requestUpdate();
        await element.updateComplete;

        const chart = element.shadowRoot?.querySelector('growspace-env-chart');
        chart?.dispatchEvent(new CustomEvent('toggle-graph', {
            detail: { metric: 'temperature' }
        }));

        expect(historyStore.toggleEnvGraph).toHaveBeenCalled();
    });

    it('should handle unlink-graphs event from combined chart', async () => {
        vi.mocked(historyStore.$activeEnvGraphs.get).mockReturnValue(new Set(['temperature', 'humidity']));
        vi.mocked(historyStore.$linkedGraphGroups.get).mockReturnValue([['temperature', 'humidity']]);
        (element as any)._computeItemsToRender();
        element.requestUpdate();
        await element.updateComplete;

        const chart = element.shadowRoot?.querySelector('growspace-env-chart');
        chart?.dispatchEvent(new CustomEvent('unlink-graphs', {
            detail: 0,  // groupIndex
            bubbles: true
        }));

        expect(historyStore.unlinkGraphGroup).toHaveBeenCalledWith(0);
    });

    it('should handle unlink-graph event for single metric', async () => {
        vi.mocked(historyStore.$activeEnvGraphs.get).mockReturnValue(new Set(['temperature', 'humidity']));
        vi.mocked(historyStore.$linkedGraphGroups.get).mockReturnValue([['temperature', 'humidity']]);
        (element as any)._computeItemsToRender();
        element.requestUpdate();
        await element.updateComplete;

        const chart = element.shadowRoot?.querySelector('growspace-env-chart');
        chart?.dispatchEvent(new CustomEvent('unlink-graph', {
            detail: 'temperature',
            bubbles: true
        }));

        expect(historyStore.unlinkGraphMetric).toHaveBeenCalledWith('temperature');
    });

    it('should render loading state when history is loading', async () => {
        vi.mocked(historyStore.$activeEnvGraphs.get).mockReturnValue(new Set(['temperature']));
        vi.mocked(historyStore.$historyLoading.get).mockReturnValue(true);
        historyControllerMock.isHistoryLoading = true; // Sync mock controller state too

        element.requestUpdate();
        await element.updateComplete;

        const loadingSpinner = element.shadowRoot?.querySelector('.loading-spinner');
        expect(loadingSpinner).toBeTruthy();

        const loadingText = element.shadowRoot?.textContent;
        expect(loadingText).toContain('Loading history data');
    });

    it('should trigger lazy load in firstUpdated when not loaded', async () => {
        vi.mocked(historyStore.$historyLoaded.get).mockReturnValue(false);
        historyControllerMock.isHistoryLoaded = false;
        historyControllerMock.loadHistoryOnDemand.mockClear();

        vi.spyOn(console, 'log').mockImplementation(() => { });

        element.firstUpdated();

        expect(historyControllerMock.loadHistoryOnDemand).toHaveBeenCalled();
    });

    it('should trigger lazy load in willUpdate when not loaded and not loading', async () => {
        vi.mocked(historyStore.$historyLoaded.get).mockReturnValue(false);
        vi.mocked(historyStore.$historyLoading.get).mockReturnValue(false);
        historyControllerMock.isHistoryLoaded = false;
        historyControllerMock.isHistoryLoading = false;
        historyControllerMock.loadHistoryOnDemand.mockClear();

        vi.spyOn(console, 'log').mockImplementation(() => { });

        // Trigger willUpdate
        element.requestUpdate();
        await element.updateComplete;

        expect(historyControllerMock.loadHistoryOnDemand).toHaveBeenCalled();
    });

    it('should not render if device is missing', async () => {
        vi.mocked(historyStore.$activeEnvGraphs.get).mockReturnValue(new Set(['temperature']));
        element.device = undefined;
        element.requestUpdate();
        await element.updateComplete;

        const charts = element.shadowRoot?.querySelectorAll('growspace-env-chart');
        expect(charts?.length).toBe(0);

        const graphsContainer = element.shadowRoot?.querySelector('.graphs-container');
        expect(graphsContainer).toBeFalsy();
    });

    it('should handle getSortIndex for unknown metric', async () => {
        vi.mocked(historyStore.$activeEnvGraphs.get).mockReturnValue(new Set(['unknown_metric']));
        (element as any)._computeItemsToRender();

        const items = (element as any)._itemsToRender;
        expect(items[0].sortIndex).toBe(999); // Default for unknown
    });
});
