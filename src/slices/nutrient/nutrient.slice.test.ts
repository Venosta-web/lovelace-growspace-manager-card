import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as hassCallModule from '../../services/hass-call';
import {
  nutrientPresets$,
  ipmPresets$,
  nutrientInventory$,
  ecRampCurves$,
  fetchNutrientPresets,
  fetchIPMPresets,
  fetchNutrientInventory,
  fetchECRampCurves,
  saveNutrientPreset,
  removeNutrientPreset,
  saveIPMPreset,
  removeIPMPreset,
  applyIPM,
  updateNutrientStock,
  removeNutrientStock,
  saveECRampCurve,
  removeECRampCurve,
} from './index';

vi.mock('../../services/hass-call', () => ({
  callService: vi.fn().mockResolvedValue(undefined),
  callServiceReturning: vi.fn().mockResolvedValue(undefined),
  hassCall: vi.fn().mockResolvedValue({}),
  setHass: vi.fn(),
}));

beforeEach(() => {
  nutrientPresets$.set(null);
  ipmPresets$.set(null);
  nutrientInventory$.set(null);
  ecRampCurves$.set(null);
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Atom defaults
// ---------------------------------------------------------------------------

describe('nutrientPresets$', () => {
  it('defaults to null', () => {
    expect(nutrientPresets$.get()).toBeNull();
  });
});

describe('ipmPresets$', () => {
  it('defaults to null', () => {
    expect(ipmPresets$.get()).toBeNull();
  });
});

describe('nutrientInventory$', () => {
  it('defaults to null', () => {
    expect(nutrientInventory$.get()).toBeNull();
  });
});

describe('ecRampCurves$', () => {
  it('defaults to null', () => {
    expect(ecRampCurves$.get()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// fetchNutrientPresets
// ---------------------------------------------------------------------------

describe('fetchNutrientPresets', () => {
  it('calls hassCall with the get_nutrient_presets WS command', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce({});

    await fetchNutrientPresets();

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_nutrient_presets',
      {},
      expect.anything()
    );
  });

  it('updates nutrientPresets$ with the response on success', async () => {
    const presets = { p1: { id: 'p1', name: 'Veg Week 1', nutrients: [] } };
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce(presets);

    await fetchNutrientPresets();

    expect(nutrientPresets$.get()).toEqual(presets);
  });

  it('re-throws on failure and leaves atom unchanged', async () => {
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('ws error'));

    await expect(fetchNutrientPresets()).rejects.toThrow('ws error');
    expect(nutrientPresets$.get()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// fetchIPMPresets
// ---------------------------------------------------------------------------

describe('fetchIPMPresets', () => {
  it('calls hassCall with the get_ipm_presets WS command', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce({});

    await fetchIPMPresets();

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_ipm_presets',
      {},
      expect.anything()
    );
  });

  it('updates ipmPresets$ with the response on success', async () => {
    const presets = { i1: { id: 'i1', name: 'Neem', type: 'foliar', items: [] } };
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce(presets);

    await fetchIPMPresets();

    expect(ipmPresets$.get()).toEqual(presets);
  });

  it('re-throws on failure and leaves atom unchanged', async () => {
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('ws error'));

    await expect(fetchIPMPresets()).rejects.toThrow('ws error');
    expect(ipmPresets$.get()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// fetchNutrientInventory
// ---------------------------------------------------------------------------

describe('fetchNutrientInventory', () => {
  it('calls hassCall with the get_nutrient_inventory WS command', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce({ stocks: {} });

    await fetchNutrientInventory();

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_nutrient_inventory',
      {},
      expect.anything()
    );
  });

  it('updates nutrientInventory$ with the full response on success', async () => {
    const inventory = {
      stocks: {
        n1: { nutrient_id: 'n1', name: 'Grow A', current_ml: 500, initial_ml: 1000, last_updated: '2026-01-01' },
      },
    };
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce(inventory);

    await fetchNutrientInventory();

    expect(nutrientInventory$.get()).toEqual(inventory);
  });

  it('re-throws on failure and leaves atom unchanged', async () => {
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('ws error'));

    await expect(fetchNutrientInventory()).rejects.toThrow('ws error');
    expect(nutrientInventory$.get()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// fetchECRampCurves
// ---------------------------------------------------------------------------

describe('fetchECRampCurves', () => {
  it('calls hassCall with the get_ec_ramp_curves WS command', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce({});

    await fetchECRampCurves();

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/get_ec_ramp_curves',
      {},
      expect.anything()
    );
  });

  it('updates ecRampCurves$ with the response on success', async () => {
    const curves = { c1: { id: 'c1', name: 'Flower Ramp', stage: 'flower', points: [] } };
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce(curves);

    await fetchECRampCurves();

    expect(ecRampCurves$.get()).toEqual(curves);
  });

  it('re-throws on failure and leaves atom unchanged', async () => {
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('ws error'));

    await expect(fetchECRampCurves()).rejects.toThrow('ws error');
    expect(ecRampCurves$.get()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// saveNutrientPreset
// ---------------------------------------------------------------------------

describe('saveNutrientPreset', () => {
  it('calls callService with the correct domain, service, and payload', async () => {
    const data = { name: 'Veg Week 1', nutrients: [{ name: 'Base', dose_ml_l: 2 }], stage: 'veg' };

    await saveNutrientPreset(data);

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'save_nutrient_preset',
      data
    );
  });

  it('re-throws on failure', async () => {
    vi.mocked(hassCallModule.callService).mockRejectedValueOnce(new Error('save failed'));

    await expect(saveNutrientPreset({ name: 'X', nutrients: [] })).rejects.toThrow('save failed');
  });
});

// ---------------------------------------------------------------------------
// removeNutrientPreset
// ---------------------------------------------------------------------------

describe('removeNutrientPreset', () => {
  it('calls callService with preset_id', async () => {
    await removeNutrientPreset('p1');

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'remove_nutrient_preset',
      { preset_id: 'p1' }
    );
  });

  it('re-throws on failure', async () => {
    vi.mocked(hassCallModule.callService).mockRejectedValueOnce(new Error('remove failed'));

    await expect(removeNutrientPreset('p1')).rejects.toThrow('remove failed');
  });
});

// ---------------------------------------------------------------------------
// saveIPMPreset
// ---------------------------------------------------------------------------

describe('saveIPMPreset', () => {
  it('calls callService with the correct domain, service, and payload', async () => {
    const data = { name: 'Neem', type: 'foliar', items: [{ name: 'Neem Oil', dose_amount: 5, dose_unit: 'ml/L' }] };

    await saveIPMPreset(data);

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'save_ipm_preset',
      data
    );
  });

  it('re-throws on failure', async () => {
    vi.mocked(hassCallModule.callService).mockRejectedValueOnce(new Error('save failed'));

    await expect(saveIPMPreset({ name: 'X', type: 'foliar', items: [] })).rejects.toThrow('save failed');
  });
});

// ---------------------------------------------------------------------------
// removeIPMPreset
// ---------------------------------------------------------------------------

describe('removeIPMPreset', () => {
  it('calls callService with preset_id', async () => {
    await removeIPMPreset('i1');

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'remove_ipm_preset',
      { preset_id: 'i1' }
    );
  });

  it('re-throws on failure', async () => {
    vi.mocked(hassCallModule.callService).mockRejectedValueOnce(new Error('remove failed'));

    await expect(removeIPMPreset('i1')).rejects.toThrow('remove failed');
  });
});

// ---------------------------------------------------------------------------
// applyIPM
// ---------------------------------------------------------------------------

describe('applyIPM', () => {
  it('calls callService with the preset_id and optional fields', async () => {
    const data = { preset_id: 'i1', growspace_id: 'g1' };

    await applyIPM(data);

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'apply_ipm',
      data
    );
  });

  it('re-throws on failure', async () => {
    vi.mocked(hassCallModule.callService).mockRejectedValueOnce(new Error('apply failed'));

    await expect(applyIPM({ preset_id: 'i1' })).rejects.toThrow('apply failed');
  });
});

// ---------------------------------------------------------------------------
// updateNutrientStock
// ---------------------------------------------------------------------------

describe('updateNutrientStock', () => {
  it('calls hassCall with the update_nutrient_stock WS command and all fields', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce(undefined);

    await updateNutrientStock('n1', 'Grow A', 500, 1000);

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/update_nutrient_stock',
      { nutrient_id: 'n1', name: 'Grow A', current_ml: 500, initial_ml: 1000 },
      expect.anything()
    );
  });

  it('re-throws on failure', async () => {
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('update failed'));

    await expect(updateNutrientStock('n1', 'Grow A', 500, 1000)).rejects.toThrow('update failed');
  });
});

// ---------------------------------------------------------------------------
// removeNutrientStock
// ---------------------------------------------------------------------------

describe('removeNutrientStock', () => {
  it('calls hassCall with the remove_nutrient_stock WS command and nutrient_id', async () => {
    vi.mocked(hassCallModule.hassCall).mockResolvedValueOnce(undefined);

    await removeNutrientStock('n1');

    expect(hassCallModule.hassCall).toHaveBeenCalledWith(
      'growspace_manager/remove_nutrient_stock',
      { nutrient_id: 'n1' },
      expect.anything()
    );
  });

  it('re-throws on failure', async () => {
    vi.mocked(hassCallModule.hassCall).mockRejectedValueOnce(new Error('remove failed'));

    await expect(removeNutrientStock('n1')).rejects.toThrow('remove failed');
  });
});

// ---------------------------------------------------------------------------
// saveECRampCurve — transformation
// ---------------------------------------------------------------------------

describe('saveECRampCurve', () => {
  it('transforms day/target_ec points to week/ec_min/ec_max before calling callService', async () => {
    await saveECRampCurve({
      name: 'Flower Ramp',
      stage: 'flower',
      points: [{ day: 1, target_ec: 1.0 }, { day: 8, target_ec: 1.5 }],
    });

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'save_ec_ramp_curve',
      {
        curve_id: undefined,
        name: 'Flower Ramp',
        stage: 'flower',
        points: [
          { week: 1, ec_min: 1.0, ec_max: 1.4 },
          { week: 2, ec_min: 1.5, ec_max: 1.9 },
        ],
      }
    );
  });

  it('defaults stage to flower when not provided', async () => {
    await saveECRampCurve({ name: 'Ramp', points: [{ day: 1, target_ec: 1.2 }] });

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'save_ec_ramp_curve',
      expect.objectContaining({ stage: 'flower' })
    );
  });

  it('passes curve_id when provided', async () => {
    await saveECRampCurve({ curve_id: 'c1', name: 'Ramp', points: [] });

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'save_ec_ramp_curve',
      expect.objectContaining({ curve_id: 'c1' })
    );
  });

  it('re-throws on failure', async () => {
    vi.mocked(hassCallModule.callService).mockRejectedValueOnce(new Error('save failed'));

    await expect(saveECRampCurve({ name: 'X', points: [] })).rejects.toThrow('save failed');
  });
});

// ---------------------------------------------------------------------------
// removeECRampCurve
// ---------------------------------------------------------------------------

describe('removeECRampCurve', () => {
  it('calls callService with curve_id', async () => {
    await removeECRampCurve('c1');

    expect(hassCallModule.callService).toHaveBeenCalledWith(
      'growspace_manager',
      'remove_ec_ramp_curve',
      { curve_id: 'c1' }
    );
  });

  it('re-throws on failure', async () => {
    vi.mocked(hassCallModule.callService).mockRejectedValueOnce(new Error('remove failed'));

    await expect(removeECRampCurve('c1')).rejects.toThrow('remove failed');
  });
});
