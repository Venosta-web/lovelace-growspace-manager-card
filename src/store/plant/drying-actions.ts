import { ActionContext } from '../core/action-context';

export async function logDryingWeight(
  ctx: ActionContext,
  plantId: string,
  weightGrams: number,
  date?: string,
): Promise<void> {
  try {
    await ctx.dataService.logDryingWeight({ plant_id: plantId, weight_grams: weightGrams, date });
    ctx.ui.showToast('Weight logged', 'success');
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.ui.showToast(`Failed to log weight: ${error}`, 'error');
    throw e;
  }
}

export async function logMoistureReading(
  ctx: ActionContext,
  plantId: string,
  moisturePercent: number,
  date?: string,
): Promise<void> {
  try {
    await ctx.dataService.logMoistureReading({ plant_id: plantId, moisture_percent: moisturePercent, date });
    ctx.ui.showToast('Moisture logged', 'success');
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.ui.showToast(`Failed to log moisture: ${error}`, 'error');
    throw e;
  }
}

export async function setVisualTag(
  ctx: ActionContext,
  plantId: string,
  visualTag: string | null,
): Promise<void> {
  try {
    await ctx.dataService.setVisualTag({ plant_id: plantId, visual_tag: visualTag });
    ctx.ui.showToast('Visual tag saved', 'success');
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.ui.showToast(`Failed to save visual tag: ${error}`, 'error');
    throw e;
  }
}
