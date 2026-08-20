import { describe, it, expect, afterEach, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { hassCall } from '../../../services/hass-call';
import type { GrowspaceIPMDialogUI } from './growspace-ipm-dialog-ui';
import './growspace-ipm-dialog-ui';

vi.mock('../../../services/hass-call', () => ({
  hassCall: vi.fn().mockResolvedValue({}),
  callService: vi.fn().mockResolvedValue(undefined),
}));

const mockHassCall = vi.mocked(hassCall);
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('GrowspaceIPMDialogUI – self-fetch on open', () => {
  afterEach(() => {
    mockHassCall.mockReset();
    mockHassCall.mockResolvedValue({});
  });

  it('fetches IPM presets itself when mounted', async () => {
    mockHassCall.mockResolvedValue({});

    await fixture<GrowspaceIPMDialogUI>(
      html`<growspace-ipm-dialog-ui .open=${true}></growspace-ipm-dialog-ui>`
    );
    await flush();

    expect(mockHassCall).toHaveBeenCalledWith(
      'growspace_manager/get_ipm_presets',
      expect.anything(),
      expect.anything()
    );
  });

  it('shows a loading state until the fetch resolves', async () => {
    let resolveFetch: (v: unknown) => void = () => {};
    mockHassCall.mockReturnValue(new Promise((resolve) => (resolveFetch = resolve)));

    const el = await fixture<GrowspaceIPMDialogUI>(
      html`<growspace-ipm-dialog-ui .open=${true}></growspace-ipm-dialog-ui>`
    );
    await el.updateComplete;

    expect(el.shadowRoot?.querySelector('[role="status"]')).not.toBeNull();

    resolveFetch({});
    await flush();
    await el.updateComplete;

    expect(el.shadowRoot?.querySelector('[role="status"]')).toBeNull();
  });

  it('does not flash a loading state when presets are already provided (cached open)', async () => {
    // Hold the fetch pending so the only thing that can suppress loading is
    // the already-populated `presets` prop — i.e. no spinner on a cached open.
    mockHassCall.mockReturnValue(new Promise(() => {}));

    const el = await fixture<GrowspaceIPMDialogUI>(
      html`<growspace-ipm-dialog-ui
        .open=${true}
        .presets=${{ p1: { id: 'p1', name: 'Neem', type: 'foliar', items: [] } }}
      ></growspace-ipm-dialog-ui>`
    );
    await el.updateComplete;

    expect(el.shadowRoot?.querySelector('[role="status"]')).toBeNull();
  });
});
