import { ActionContext } from '../core/action-context';
import { withAction } from '../core/action-utils';

/** Update an existing breeder's name and optional logo */
export async function updateBreeder(
  ctx: ActionContext,
  oldName: string,
  newName: string,
  logo?: string
): Promise<void> {
  await withAction(
    ctx,
    async () => {
      await ctx.dataService.updateBreeder(oldName, newName, logo);
      await ctx.refreshData();
    },
    {
      success: 'Breeder updated successfully!',
      errorPrefix: 'Failed to update breeder',
      rethrow: true,
    }
  );
}

/** Delete a breeder by name */
export async function deleteBreeder(ctx: ActionContext, name: string): Promise<void> {
  await withAction(
    ctx,
    async () => {
      await ctx.dataService.deleteBreeder(name);
      await ctx.refreshData();
    },
    {
      success: 'Breeder deleted successfully!',
      errorPrefix: 'Failed to delete breeder',
      rethrow: true,
    }
  );
}
