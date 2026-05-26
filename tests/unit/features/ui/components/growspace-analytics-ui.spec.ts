import { describe, it, expect, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { GrowspaceAnalyticsUI } from '../../../../../src/features/ui/components/growspace-analytics-ui';

if (!customElements.get('growspace-analytics-ui')) {
  customElements.define('growspace-analytics-ui', GrowspaceAnalyticsUI);
}

describe('growspace-analytics-ui', () => {
  it('renders nothing when items list is empty', async () => {
    const el = await fixture<GrowspaceAnalyticsUI>(html`
      <growspace-analytics-ui .items=${[]} .isLoading=${false}></growspace-analytics-ui>
    `);
    expect(el.shadowRoot!.querySelector('.graphs-container')).toBeNull();
  });

  it('renders loading spinner when isLoading is true', async () => {
    const el = await fixture<GrowspaceAnalyticsUI>(html`
      <growspace-analytics-ui
        .items=${[{ type: 'single', metrics: ['temperature'] }]}
        .isLoading=${true}
        .range=${'24h'}
      ></growspace-analytics-ui>
    `);
    expect(el.shadowRoot!.querySelector('.loading-spinner')).not.toBeNull();
  });

  it('renders time-range buttons', async () => {
    const el = await fixture<GrowspaceAnalyticsUI>(html`
      <growspace-analytics-ui
        .items=${[{ type: 'single', metrics: ['temperature'] }]}
        .isLoading=${false}
        .range=${'24h'}
      ></growspace-analytics-ui>
    `);
    const buttons = el.shadowRoot!.querySelectorAll('.range-btn');
    expect(buttons.length).toBe(4);
  });

  it('emits set-range when a range button is clicked', async () => {
    const handler = vi.fn();
    const el = await fixture<GrowspaceAnalyticsUI>(html`
      <growspace-analytics-ui
        .items=${[{ type: 'single', metrics: ['temperature'] }]}
        .isLoading=${false}
        .range=${'24h'}
        @set-range=${handler}
      ></growspace-analytics-ui>
    `);
    (el.shadowRoot!.querySelector('.range-btn') as HTMLElement).click();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('renders group analytics items and redispatches chart events', async () => {
    const toggleHandler = vi.fn();
    const unlinkGraphsHandler = vi.fn();
    const unlinkGraphHandler = vi.fn();

    const el = await fixture<GrowspaceAnalyticsUI>(html`
      <growspace-analytics-ui
        .items=${[{ type: 'group', metrics: ['temperature', 'humidity'] }]}
        .isLoading=${false}
        @toggle-graph=${toggleHandler}
        @unlink-graphs=${unlinkGraphsHandler}
        @unlink-graph=${unlinkGraphHandler}
      ></growspace-analytics-ui>
    `);

    const chart = el.shadowRoot!.querySelector('growspace-env-chart');
    expect(chart).not.toBeNull();

    // Simulate event dispatches from the chart
    chart!.dispatchEvent(new CustomEvent('toggle-graph', { detail: 'test-toggle-detail' }));
    expect(toggleHandler).toHaveBeenCalledOnce();
    expect(toggleHandler.mock.calls[0][0].detail).toBe('test-toggle-detail');

    chart!.dispatchEvent(new CustomEvent('unlink-graphs', { detail: 'test-unlink-graphs-detail' }));
    expect(unlinkGraphsHandler).toHaveBeenCalledOnce();
    expect(unlinkGraphsHandler.mock.calls[0][0].detail).toBe('test-unlink-graphs-detail');

    chart!.dispatchEvent(new CustomEvent('unlink-graph', { detail: 'test-unlink-graph-detail' }));
    expect(unlinkGraphHandler).toHaveBeenCalledOnce();
    expect(unlinkGraphHandler.mock.calls[0][0].detail).toBe('test-unlink-graph-detail');
  });

  it('renders single analytics items and redispatches toggle-graph event', async () => {
    const toggleHandler = vi.fn();
    const el = await fixture<GrowspaceAnalyticsUI>(html`
      <growspace-analytics-ui
        .items=${[{ type: 'single', metrics: ['temperature'] }]}
        .isLoading=${false}
        @toggle-graph=${toggleHandler}
      ></growspace-analytics-ui>
    `);

    const chart = el.shadowRoot!.querySelector('growspace-env-chart');
    expect(chart).not.toBeNull();

    chart!.dispatchEvent(new CustomEvent('toggle-graph', { detail: 'test-single-toggle' }));
    expect(toggleHandler).toHaveBeenCalledOnce();
    expect(toggleHandler.mock.calls[0][0].detail).toBe('test-single-toggle');
  });
});

