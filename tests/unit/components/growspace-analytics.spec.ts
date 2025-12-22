import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { html, render } from 'lit';
import { GrowspaceAnalytics } from '../../../src/components/growspace-analytics';
import { GrowspaceHistoryController } from '../../../src/controllers/growspace-history-controller';
import { historyContext, hassContext } from '../../../src/context';
import { ContextProvider } from '@lit/context';

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

        historyControllerMock = {
            activeEnvGraphs: new Set(),
            linkedGraphGroups: [],
            combinedHistory: {},
            getRange: vi.fn().mockReturnValue('24h'),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            setGraphRange: vi.fn(),
            toggleEnvGraph: vi.fn(),
            unlinkGraphGroup: vi.fn(),
            unlinkGraphMetric: vi.fn(),
            loadHistoryOnDemand: vi.fn().mockResolvedValue(undefined),
            isHistoryLoaded: false,
            isHistoryLoading: false,
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

    it('should register listener on connect', () => {
        expect(historyControllerMock.addListener).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should remove listener on disconnect', () => {
        element.disconnectedCallback();
        expect(historyControllerMock.removeListener).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should render nothing if no active graphs', async () => {
        historyControllerMock.activeEnvGraphs = new Set();
        element.requestUpdate();
        await element.updateComplete;

        const graphs = element.shadowRoot?.querySelectorAll('growspace-env-chart');
        expect(graphs?.length).toBe(0);
    });

    it('should render single graph for single metric', async () => {
        historyControllerMock.activeEnvGraphs = new Set(['temperature']);
        // Trigger update logic
        (element as any)._computeItemsToRender();
        element.requestUpdate();
        await element.updateComplete;

        const graphs = element.shadowRoot?.querySelectorAll('growspace-env-chart');
        expect(graphs?.length).toBe(1);
        expect((graphs?.[0] as any).metricKey).toBe('temperature');
    });

    it('should render combined graph for grouped metrics', async () => {
        historyControllerMock.activeEnvGraphs = new Set(['temperature', 'humidity']);
        historyControllerMock.linkedGraphGroups = [['temperature', 'humidity']];

        (element as any)._computeItemsToRender();
        element.requestUpdate();
        await element.updateComplete;

        const graphs = element.shadowRoot?.querySelectorAll('growspace-env-chart');
        expect(graphs?.length).toBe(1);
        expect((graphs?.[0] as any).isCombined).toBe(true);
        expect((graphs?.[0] as any).metrics).toEqual(['temperature', 'humidity']);
    });

    it('should handle time range selection', async () => {
        historyControllerMock.activeEnvGraphs = new Set(['temperature']);
        (element as any)._computeItemsToRender();
        element.requestUpdate();
        await element.updateComplete;

        const rangeBtn = element.shadowRoot?.querySelector('.range-btn') as HTMLElement;
        rangeBtn.click();

        expect(historyControllerMock.setGraphRange).toHaveBeenCalledWith('1h');
    });

    it('should handle toggle graph event', async () => {
        historyControllerMock.activeEnvGraphs = new Set(['temperature']);
        (element as any)._computeItemsToRender();
        element.requestUpdate();
        await element.updateComplete;

        const chart = element.shadowRoot?.querySelector('growspace-env-chart');
        chart?.dispatchEvent(new CustomEvent('toggle-graph', { detail: 'temperature' }));

        expect(historyControllerMock.toggleEnvGraph).toHaveBeenCalledWith({
            metric: 'temperature',
            visible: false
        });
    });

    it('should handle toggle graph event with metric property in detail', async () => {
        historyControllerMock.activeEnvGraphs = new Set(['temperature']);
        (element as any)._computeItemsToRender();
        element.requestUpdate();
        await element.updateComplete;

        const chart = element.shadowRoot?.querySelector('growspace-env-chart');
        chart?.dispatchEvent(new CustomEvent('toggle-graph', {
            detail: { metric: 'temperature' }
        }));

        // Should handle both detail.metric and direct detail string
        expect(historyControllerMock.toggleEnvGraph).toHaveBeenCalled();
    });

    it('should handle unlink-graphs event from combined chart', async () => {
        historyControllerMock.activeEnvGraphs = new Set(['temperature', 'humidity']);
        historyControllerMock.linkedGraphGroups = [['temperature', 'humidity']];
        (element as any)._computeItemsToRender();
        element.requestUpdate();
        await element.updateComplete;

        const chart = element.shadowRoot?.querySelector('growspace-env-chart');
        chart?.dispatchEvent(new CustomEvent('unlink-graphs', {
            detail: 0,  // groupIndex
            bubbles: true
        }));

        expect(historyControllerMock.unlinkGraphGroup).toHaveBeenCalledWith(0);
    });

    it('should handle unlink-graph event for single metric', async () => {
        historyControllerMock.activeEnvGraphs = new Set(['temperature', 'humidity']);
        historyControllerMock.linkedGraphGroups = [['temperature', 'humidity']];
        (element as any)._computeItemsToRender();
        element.requestUpdate();
        await element.updateComplete;

        const chart = element.shadowRoot?.querySelector('growspace-env-chart');
        chart?.dispatchEvent(new CustomEvent('unlink-graph', {
            detail: 'temperature',
            bubbles: true
        }));

        expect(historyControllerMock.unlinkGraphMetric).toHaveBeenCalledWith('temperature');
    });

    it('should render loading state when history is loading', async () => {
        historyControllerMock.activeEnvGraphs = new Set(['temperature']);
        historyControllerMock.isHistoryLoading = true;
        element.requestUpdate();
        await element.updateComplete;

        const loadingSpinner = element.shadowRoot?.querySelector('.loading-spinner');
        expect(loadingSpinner).toBeTruthy();

        const loadingText = element.shadowRoot?.textContent;
        expect(loadingText).toContain('Loading history data');
    });

    it('should trigger lazy load in firstUpdated when not loaded', async () => {
        historyControllerMock.isHistoryLoaded = false;
        historyControllerMock.loadHistoryOnDemand.mockClear();

        vi.spyOn(console, 'log').mockImplementation(() => { });

        element.firstUpdated();

        expect(historyControllerMock.loadHistoryOnDemand).toHaveBeenCalled();
    });

    it('should trigger lazy load in willUpdate when not loaded and not loading', async () => {
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
        historyControllerMock.activeEnvGraphs = new Set(['temperature']);
        element.device = undefined;
        element.requestUpdate();
        await element.updateComplete;

        const charts = element.shadowRoot?.querySelectorAll('growspace-env-chart');
        expect(charts?.length).toBe(0);

        const graphsContainer = element.shadowRoot?.querySelector('.graphs-container');
        expect(graphsContainer).toBeFalsy();
    });

    it('should handle getSortIndex for unknown metric', async () => {
        historyControllerMock.activeEnvGraphs = new Set(['unknown_metric']);
        (element as any)._computeItemsToRender();

        const items = (element as any)._itemsToRender;
        expect(items[0].sortIndex).toBe(999); // Default for unknown
    });

    it('should skip linked groups with no active metrics', async () => {
        historyControllerMock.activeEnvGraphs = new Set(['temperature']);
        historyControllerMock.linkedGraphGroups = [['humidity', 'vpd']]; // No active metrics in group

        (element as any)._computeItemsToRender();

        const items = (element as any)._itemsToRender;
        // Should only have the single temperature, not the group
        expect(items.length).toBe(1);
        expect(items[0].type).toBe('single');
    });

    it('should handle _handleControllerUpdate callback', () => {
        const requestUpdateSpy = vi.spyOn(element, 'requestUpdate');

        (element as any)._handleControllerUpdate();

        expect(requestUpdateSpy).toHaveBeenCalled();
    });
});
