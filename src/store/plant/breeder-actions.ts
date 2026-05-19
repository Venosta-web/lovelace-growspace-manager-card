import { ActionContext } from '../core/action-context';

/** Update an existing breeder's name and optional logo */
export async function updateBreeder(
  ctx: ActionContext,
  oldName: string,
  newName: string,
  logo?: string
): Promise<void> {
  try {
    await ctx.dataService.updateBreeder(oldName, newName, logo);
    ctx.ui.showToast('Breeder updated successfully!', 'success');
    await ctx.refreshData();
  } catch (e: unknown) {
    ctx.ui.showToast('Failed to update breeder', 'error');
    throw e;
  }
}

/** Delete a breeder by name */
export async function deleteBreeder(ctx: ActionContext, name: string): Promise<void> {
  try {
    await ctx.dataService.deleteBreeder(name);
    ctx.ui.showToast('Breeder deleted successfully!', 'success');
    await ctx.refreshData();
  } catch (e: unknown) {
    ctx.ui.showToast('Failed to delete breeder', 'error');
    throw e;
  }
}
