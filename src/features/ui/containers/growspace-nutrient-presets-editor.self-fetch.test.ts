import { describe, it, expect, afterEach, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { hassCall } from '../../../services/hass-call';
import { nutrientPresets$, nutrientInventory$ } from '../../../slices/nutrient';
import type { NutrientPresetsResponse } from '../../../slices/nutrient';
import './growspace-nutrient-presets-editor.container';
import '../components/growspace-nutrient-presets-editor-ui';

vi.mock('../../../services/hass-call', () => ({
  hassCall: vi.fn().mockResolvedValue({}),
  callService: vi.fn().mockResolvedValue(undefined),
}));

if (!customElements.get('growspace-nutrient-presets-editor-ui')) {
  customElements.define('growspace-nutrient-presets-editor-ui', class extends HTMLElement {});
}

const mockHassCall = vi.mocked(hassCall);

function aPresets(): NutrientPresetsResponse {
  return {
    p1: {
      id: 'p1',
      name: 'Veg Week 1',
      week: 1,
      nutrients: [],
      stage: undefined,
      min_days_in_stage: undefined,
      ec_target: undefined,
      ph_target: undefined,
    },
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('GrowspaceNutrientPresetsEditorContainer – self-fetch on open', () => {
  afterEach(() => {
    nutrientPresets$.set(null);
    nutrientInventory$.set(null);
    mockHassCall.mockReset();
    mockHassCall.mockResolvedValue({});
  });

  it('fetches nutrient presets itself when mounted with an empty atom', async () => {
    nutrientPresets$.set(null);
    mockHassCall.mockResolvedValue(aPresets());

    await fixture(html`<growspace-nutrient-presets-editor></growspace-nutrient-presets-editor>`);
    await flush();

    expect(mockHassCall).toHaveBeenCalledWith(
      'growspace_manager/get_nutrient_presets',
      expect.anything(),
      expect.anything()
    );
    expect(nutrientPresets$.get()).toEqual(aPresets());
  });

  it('renders a loading state until the fetch resolves', async () => {
    nutrientPresets$.set(null);
    let resolveFetch: (v: unknown) => void = () => {};
    mockHassCall.mockReturnValue(new Promise((resolve) => (resolveFetch = resolve)));

    const el = await fixture<any>(
      html`<growspace-nutrient-presets-editor></growspace-nutrient-presets-editor>`
    );
    await el.updateComplete;

    expect(el.shadowRoot?.querySelector('[role="status"]')).not.toBeNull();
    expect(el.shadowRoot?.querySelector('growspace-nutrient-presets-editor-ui')).toBeNull();

    resolveFetch(aPresets());
    await flush();
    await el.updateComplete;

    expect(el.shadowRoot?.querySelector('[role="status"]')).toBeNull();
    expect(el.shadowRoot?.querySelector('growspace-nutrient-presets-editor-ui')).not.toBeNull();
  });
});
