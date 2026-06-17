import { ActionContext } from '../core/action-context';
import { withAction } from '../core/action-utils';
import {
  logDryingWeight as plantSliceLogDryingWeight,
  logMoistureReading as plantSliceLogMoistureReading,
  setVisualTag as plantSliceSetVisualTag,
} from '../../slices/plant';

export async function logDryingWeight(
  ctx: ActionContext,
  plantId: string,
  weightGrams: number,
  date?: string
): Promise<void> {
  await withAction(
    ctx,
    () => plantSliceLogDryingWeight(plantId, weightGrams, date),
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
    () => plantSliceLogMoistureReading(plantId, moisturePercent, date),
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
    () => plantSliceSetVisualTag(plantId, visualTag),
    {
      success: 'Visual tag saved',
      errorPrefix: 'Failed to save visual tag',
      rethrow: true,
    }
  );
}
