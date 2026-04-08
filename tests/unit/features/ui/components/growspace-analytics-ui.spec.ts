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
});
