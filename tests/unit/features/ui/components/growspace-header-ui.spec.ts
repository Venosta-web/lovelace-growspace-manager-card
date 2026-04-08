import { describe, it, expect, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { GrowspaceHeaderUI } from '../../../../../src/features/ui/components/growspace-header-ui';

if (!customElements.get('growspace-header-ui')) {
  customElements.define('growspace-header-ui', GrowspaceHeaderUI);
}

describe('growspace-header-ui', () => {
  it('renders nothing when device is absent', async () => {
    const el = await fixture<GrowspaceHeaderUI>(html`<growspace-header-ui></growspace-header-ui>`);
    expect(el.shadowRoot!.querySelector('.gs-stats-container')).toBeNull();
  });

  it('renders the stats container when device is provided', async () => {
    const device = { deviceId: 'gs1', name: 'Tent 1', plants: [] } as any;
    const el = await fixture<GrowspaceHeaderUI>(html`
      <growspace-header-ui
        .device=${device}
        .heroChips=${[]}
        .secondaryChips=${[]}
        .deviceChips=${[]}
        .devices=${[device]}
        .deviceId=${'gs1'}
        .config=${null}
        .inventory=${null}
        .dominant=${undefined}
      ></growspace-header-ui>
    `);
    expect(el.shadowRoot!.querySelector('.gs-stats-container')).not.toBeNull();
  });

  it('emits toggle-graph when forwarded from sub-component', async () => {
    const handler = vi.fn();
    const device = { deviceId: 'gs1', name: 'Tent 1', plants: [] } as any;
    const el = await fixture<GrowspaceHeaderUI>(html`
      <growspace-header-ui
        .device=${device}
        .heroChips=${[]}
        .secondaryChips=${[]}
        .deviceChips=${[]}
        .devices=${[device]}
        .deviceId=${'gs1'}
        .config=${null}
        .inventory=${null}
        .dominant=${undefined}
        @toggle-graph=${handler}
      ></growspace-header-ui>
    `);
    el.dispatchEvent(new CustomEvent('toggle-graph', { detail: { metric: 'temperature' }, bubbles: true }));
    expect(handler).toHaveBeenCalledOnce();
  });
});
