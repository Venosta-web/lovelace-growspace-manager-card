import { describe, it, expect, afterEach, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { hassCall } from '../services/hass-call';
import type { AddPlantDialog } from './add-plant-dialog';
import './add-plant-dialog';

vi.mock('../services/hass-call', () => ({
  hassCall: vi.fn().mockResolvedValue({ strains: [] }),
  callService: vi.fn().mockResolvedValue(undefined),
  callServiceReturning: vi.fn().mockResolvedValue({}),
  callApi: vi.fn().mockResolvedValue({}),
  callFetch: vi.fn().mockResolvedValue(new Response()),
  setHass: vi.fn(),
  getHass: vi.fn(),
}));

const mockHassCall = vi.mocked(hassCall);
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('AddPlantDialog – self-fetch on open', () => {
  afterEach(() => {
    mockHassCall.mockReset();
    mockHassCall.mockResolvedValue({ strains: [] });
  });

  it('fetches the strain library itself when mounted', async () => {
    mockHassCall.mockResolvedValue({ strains: [] });

    await fixture<AddPlantDialog>(
      html`<add-plant-dialog .open=${true}></add-plant-dialog>`
    );
    await flush();

    expect(mockHassCall).toHaveBeenCalledWith(
      'growspace_manager/get_strain_library',
      expect.anything(),
      expect.anything()
    );
  });

  it('shows a loading state on the add tab until the fetch resolves', async () => {
    let resolveFetch: (v: unknown) => void = () => {};
    mockHassCall.mockReturnValue(new Promise((resolve) => (resolveFetch = resolve)));

    const el = await fixture<AddPlantDialog>(
      html`<add-plant-dialog .open=${true}></add-plant-dialog>`
    );
    await el.updateComplete;

    expect(el.shadowRoot?.querySelector('[role="status"]')).not.toBeNull();

    resolveFetch({ strains: [] });
    await flush();
    await el.updateComplete;

    expect(el.shadowRoot?.querySelector('[role="status"]')).toBeNull();
  });

  it('does not flash a loading state when the strain library is already provided (cached open)', async () => {
    // Hold the fetch pending so the only thing that can suppress loading is
    // the already-populated `strainLibrary` prop — i.e. no spinner on a cached open.
    mockHassCall.mockReturnValue(new Promise(() => {}));

    const el = await fixture<AddPlantDialog>(
      html`<add-plant-dialog
        .open=${true}
        .strainLibrary=${[{ strain: 'Blue Dream', phenotype: 'default' }]}
      ></add-plant-dialog>`
    );
    await el.updateComplete;

    expect(el.shadowRoot?.querySelector('[role="status"]')).toBeNull();
  });
});
