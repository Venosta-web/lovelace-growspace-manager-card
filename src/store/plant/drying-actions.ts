import { ActionContext } from '../core/action-context';
import { withAction } from '../core/action-utils';

export async function logDryingWeight(
  ctx: ActionContext,
  plantId: string,
  weightGrams: number,
  date?: string
): Promise<void> {
  await withAction(
    ctx,
    () => ctx.dataService.logDryingWeight({ plant_id: plantId, weight_grams: weightGrams, date }),
    {
      success: 'Weight logged',
      errorPrefix: 'Failed to log weight',
      rethrow: true,
    }
  );
}

export async function logMoistureReading(
  ctx: ActionContext,
  plantId: string,
  moisturePercent: number,
  date?: string
): Promise<void> {
  await withAction(
    ctx,
    () =>
      ctx.dataService.logMoistureReading({
        plant_id: plantId,
        moisture_percent: moisturePercent,
        date,
      }),
    {
      success: 'Moisture logged',
      errorPrefix: 'Failed to log moisture',
      rethrow: true,
    }
  );
}

export async function setVisualTag(
  ctx: ActionContext,
  plantId: string,
  visualTag: string | null
): Promise<void> {
  await withAction(
    ctx,
    () => ctx.dataService.setVisualTag({ plant_id: plantId, visual_tag: visualTag }),
    {
      success: 'Visual tag saved',
      errorPrefix: 'Failed to save visual tag',
      rethrow: true,
    }
  );
}
