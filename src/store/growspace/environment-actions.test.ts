import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  configureEnvironment,
  removeEnvironment,
  resetWaterTracking,
  waterPlant,
  waterGrowspace,
  configureFanController,
  configureExhaustFan,
} from './environment-actions';
import type { CirculationFanConfig, ExhaustFanConfig } from '../../slices/growspace/schema';
import type { ActionContext } from '../core/action-context';
import * as libraryActions from '../plant/library-actions';

vi.mock('../plant/library-actions', () => ({
  fetchNutrientInventory: vi.fn().mockResolvedValue(undefined),
}));

function makeContext() {
  const showToast = vi.fn();
  const dataService = new Proxy({}, {
    get(target: any, prop) {
      if (!(prop in target)) {
        target[prop] = vi.fn().mockResolvedValue(undefined);
      }
      return target[prop];
    },
  });
  return {
    dataService,
    ui: { showToast } as unknown as ActionContext['ui'],
    refreshData: vi.fn().mockResolvedValue(undefined),
    closeDialog: vi.fn(),
    grid: {} as any,
  } satisfies ActionContext;
}

const baseConfig = {
  growspaceId: 'gs-1',
  temperatureSensor: 'sensor.temp',
  humiditySensor: 'sensor.humid',
} as any;

describe('configureEnvironment', () => {
  let ctx: ReturnType<typeof makeContext>;

  beforeEach(() => {
    ctx = makeContext();
  });

  it('calls dataService, toasts success, and refreshes', async () => {
    await configureEnvironment(ctx, baseConfig);

    expect((ctx.dataService as any).configureEnvironment).toHaveBeenCalledWith(baseConfig);
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Environment configured successfully!', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('shows error toast and rethrows on failure', async () => {
    (ctx.dataService as any).configureEnvironment.mockRejectedValue(new Error('env-err'));

    await expect(configureEnvironment(ctx, baseConfig)).rejects.toThrow('env-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('env-err'), 'error');
    expect(ctx.refreshData).not.toHaveBeenCalled();
  });

  it('handles non-Error exceptions', async () => {
    (ctx.dataService as any).configureEnvironment.mockRejectedValue('string-error');

    await expect(configureEnvironment(ctx, baseConfig)).rejects.toBe('string-error');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
  });
});

describe('removeEnvironment', () => {
  let ctx: ReturnType<typeof makeContext>;

  beforeEach(() => {
    ctx = makeContext();
  });

  it('calls dataService, toasts success, and refreshes', async () => {
    await removeEnvironment(ctx, 'gs-1');

    expect((ctx.dataService as any).removeEnvironment).toHaveBeenCalledWith('gs-1');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Environment configuration removed', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('shows error toast and rethrows on failure', async () => {
    (ctx.dataService as any).removeEnvironment.mockRejectedValue(new Error('remove-err'));

    await expect(removeEnvironment(ctx, 'gs-1')).rejects.toThrow('remove-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('remove-err'), 'error');
  });

  it('handles non-Error exceptions', async () => {
    (ctx.dataService as any).removeEnvironment.mockRejectedValue('string-error');

    await expect(removeEnvironment(ctx, 'gs-1')).rejects.toBe('string-error');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
  });
});

describe('waterPlant', () => {
  let ctx: ReturnType<typeof makeContext>;

  beforeEach(() => {
    ctx = makeContext();
    vi.mocked(libraryActions.fetchNutrientInventory).mockClear();
  });

  it('calls dataService without nutrient refresh when no nutrients given', async () => {
    await waterPlant(ctx, 'plant-1', 200);

    expect((ctx.dataService as any).waterPlant).toHaveBeenCalledWith('plant-1', 200, undefined, undefined);
    expect(libraryActions.fetchNutrientInventory).not.toHaveBeenCalled();
  });

  it('calls dataService and refreshes nutrient inventory when nutrients applied', async () => {
    const nutrients = { 'nutrient-a': 5 };
    await waterPlant(ctx, 'plant-1', 200, nutrients, 'preset-1');

    expect((ctx.dataService as any).waterPlant).toHaveBeenCalledWith('plant-1', 200, nutrients, 'preset-1');
    expect(libraryActions.fetchNutrientInventory).toHaveBeenCalledWith(ctx, true);
  });

  it('skips nutrient refresh for empty nutrients object', async () => {
    await waterPlant(ctx, 'plant-1', 200, {});

    expect((ctx.dataService as any).waterPlant).toHaveBeenCalledWith('plant-1', 200, {}, undefined);
    expect(libraryActions.fetchNutrientInventory).not.toHaveBeenCalled();
  });

  it('shows error toast and rethrows on failure', async () => {
    (ctx.dataService as any).waterPlant.mockRejectedValue(new Error('water-err'));

    await expect(waterPlant(ctx, 'plant-1', 200)).rejects.toThrow('water-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('water-err'), 'error');
  });
});

describe('waterGrowspace', () => {
  let ctx: ReturnType<typeof makeContext>;

  beforeEach(() => {
    ctx = makeContext();
    vi.mocked(libraryActions.fetchNutrientInventory).mockClear();
  });

  it('calls dataService without nutrient refresh when no nutrients given', async () => {
    await waterGrowspace(ctx, 'gs-1', 500);

    expect((ctx.dataService as any).waterGrowspace).toHaveBeenCalledWith('gs-1', 500, undefined, undefined);
    expect(libraryActions.fetchNutrientInventory).not.toHaveBeenCalled();
  });

  it('calls dataService and refreshes nutrient inventory when nutrients applied', async () => {
    const nutrients = { 'nutrient-b': 10 };
    await waterGrowspace(ctx, 'gs-1', 500, nutrients, 'preset-2');

    expect((ctx.dataService as any).waterGrowspace).toHaveBeenCalledWith('gs-1', 500, nutrients, 'preset-2');
    expect(libraryActions.fetchNutrientInventory).toHaveBeenCalledWith(ctx, true);
  });

  it('skips nutrient refresh for empty nutrients object', async () => {
    await waterGrowspace(ctx, 'gs-1', 500, {});

    expect((ctx.dataService as any).waterGrowspace).toHaveBeenCalledWith('gs-1', 500, {}, undefined);
    expect(libraryActions.fetchNutrientInventory).not.toHaveBeenCalled();
  });

  it('shows error toast and rethrows on failure', async () => {
    (ctx.dataService as any).waterGrowspace.mockRejectedValue(new Error('growspace-water-err'));

    await expect(waterGrowspace(ctx, 'gs-1', 500)).rejects.toThrow('growspace-water-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('growspace-water-err'), 'error');
  });
});

describe('resetWaterTracking', () => {
  let ctx: ReturnType<typeof makeContext>;

  beforeEach(() => {
    ctx = makeContext();
  });

  it('calls dataService, toasts success, and refreshes', async () => {
    await resetWaterTracking(ctx, 'gs-1');

    expect((ctx.dataService as any).resetWaterTracking).toHaveBeenCalledWith('gs-1');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith('Water tracking reset', 'success');
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('shows error toast and rethrows on failure', async () => {
    (ctx.dataService as any).resetWaterTracking.mockRejectedValue(new Error('reset-err'));

    await expect(resetWaterTracking(ctx, 'gs-1')).rejects.toThrow('reset-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('reset-err'), 'error');
  });

  it('handles non-Error exceptions', async () => {
    (ctx.dataService as any).resetWaterTracking.mockRejectedValue('string-error');

    await expect(resetWaterTracking(ctx, 'gs-1')).rejects.toBe('string-error');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(expect.stringContaining('Unknown error'), 'error');
  });
});

// ---------------------------------------------------------------------------
// configureFanController
// ---------------------------------------------------------------------------

const fanConfig: CirculationFanConfig = {
  enabled: true,
  regulation_mode: 'humidity',
  min_speed: 20,
  max_speed: 80,
  vpd_target: 1.0,
  vpd_tolerance: 0.2,
  humidity_target: 65,
  humidity_tolerance: 5,
  temperature_target: 24,
  temperature_tolerance: 2,
  critical_temp_low: null,
  critical_temp_high: null,
  critical_temp_hysteresis: 1,
  wind_enabled: false,
  wind_period_seconds: 60,
  wind_amplitude_pct: 10,
  stage_vpd_enabled: false,
  stage_vpd_overrides: {},
};

describe('configureFanController', () => {
  let ctx: ReturnType<typeof makeContext>;

  beforeEach(() => {
    ctx = makeContext();
  });

  it('calls dataService.configureCirculationFan, toasts success, and refreshes', async () => {
    await configureFanController(ctx, { growspaceId: 'gs-1', fanConfig });

    expect((ctx.dataService as any).configureCirculationFan).toHaveBeenCalledWith({
      growspaceId: 'gs-1',
      fanConfig,
    });
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(
      'Fan controller configured successfully!',
      'success'
    );
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('shows error toast and rethrows on failure', async () => {
    (ctx.dataService as any).configureCirculationFan.mockRejectedValue(new Error('fan-err'));

    await expect(configureFanController(ctx, { growspaceId: 'gs-1', fanConfig })).rejects.toThrow(
      'fan-err'
    );
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(
      expect.stringContaining('fan-err'),
      'error'
    );
    expect(ctx.refreshData).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// configureExhaustFan
// ---------------------------------------------------------------------------

const exhaustFanConfig: ExhaustFanConfig = {
  enabled: true,
  min_speed: 15,
  max_speed: 85,
  vpd_target: 1.2,
  vpd_tolerance: 0.3,
  humidity_target: 55,
  humidity_tolerance: 6,
  temperature_target: 24,
  temperature_tolerance: 3,
  critical_temp_low: null,
  critical_temp_high: null,
  critical_temp_hysteresis: 1,
  stage_vpd_enabled: false,
  stage_vpd_overrides: {},
};

describe('configureExhaustFan', () => {
  let ctx: ReturnType<typeof makeContext>;

  beforeEach(() => {
    ctx = makeContext();
  });

  it('calls dataService.configureExhaustFan, toasts success, and refreshes', async () => {
    await configureExhaustFan(ctx, { growspaceId: 'gs-1', fanConfig: exhaustFanConfig });

    expect((ctx.dataService as any).configureExhaustFan).toHaveBeenCalledWith({
      growspaceId: 'gs-1',
      fanConfig: exhaustFanConfig,
    });
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(
      'Exhaust fan controller configured successfully!',
      'success'
    );
    expect(ctx.refreshData).toHaveBeenCalled();
  });

  it('shows error toast and rethrows on failure', async () => {
    (ctx.dataService as any).configureExhaustFan.mockRejectedValue(new Error('exhaust-err'));

    await expect(
      configureExhaustFan(ctx, { growspaceId: 'gs-1', fanConfig: exhaustFanConfig })
    ).rejects.toThrow('exhaust-err');
    expect((ctx.ui as any).showToast).toHaveBeenCalledWith(
      expect.stringContaining('exhaust-err'),
      'error'
    );
    expect(ctx.refreshData).not.toHaveBeenCalled();
  });
});
