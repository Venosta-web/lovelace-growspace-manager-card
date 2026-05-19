/**
 * Strain & Growspace Actions - Unified CRUD logic.
 */

import { StrainEntry } from '../../types';
import { ActionContext } from '../core/action-context';
import { fetchStrainLibrary } from './library-actions';

/**
 * Create consistent payload for strain operations.
 */
function _createStrainPayload(strainData: Partial<StrainEntry>) {
  return {
    strain: strainData.strain!,
    phenotype: strainData.phenotype,
    breeder: strainData.breeder,
    type: strainData.type,
    flowering_days_min: strainData.flowering_days_min
      ? Number(strainData.flowering_days_min)
      : undefined,
    flowering_days_max: strainData.flowering_days_max
      ? Number(strainData.flowering_days_max)
      : undefined,
    lineage: strainData.lineage,
    sex: strainData.sex,
    description: strainData.description,
    image: strainData.image,
    image_crop_meta: strainData.image_crop_meta,
    sativa_percentage: strainData.sativa_percentage,
    indica_percentage: strainData.indica_percentage,
    breeder_logo: strainData.breeder_logo,
  };
}

/**
 * Add a new strain to the library.
 */
export async function addStrain(
  ctx: ActionContext,
  strainData: Partial<StrainEntry>
): Promise<boolean> {
  if (!strainData.strain) return false;

  try {
    const payload = _createStrainPayload(strainData);
    await ctx.dataService.addStrain(payload);

    const tree = (strainData as any).parents;
    if (tree?.parents?.length) {
      await ctx.dataService.importStrainLineageTree(strainData.strain, tree);
    }

    ctx.ui.showToast('Strain added successfully!', 'success');
    await fetchStrainLibrary(ctx, true);
    return true;
  } catch (err) {
    console.error('Error adding strain:', err);
    ctx.ui.showToast('Failed to add strain', 'error');
    return false;
  }
}

/**
 * Update an existing strain in the library.
 */
export async function updateStrain(
  ctx: ActionContext,
  strainData: Partial<StrainEntry>
): Promise<boolean> {
  if (!strainData.strain) return false;

  try {
    const payload = _createStrainPayload(strainData);
    await ctx.dataService.updateStrainMeta(payload);

    const tree = (strainData as any).parents;
    if (tree?.parents?.length) {
      await ctx.dataService.importStrainLineageTree(strainData.strain, tree);
    }

    ctx.ui.showToast('Strain updated successfully!', 'success');
    await fetchStrainLibrary(ctx, true);
    return true;
  } catch (err) {
    console.error('Error updating strain:', err);
    ctx.ui.showToast('Failed to update strain', 'error');
    return false;
  }
}

/**
 * Remove a strain from the library.
 */
export async function removeStrain(ctx: ActionContext, strainKey: string): Promise<boolean> {
  try {
    const parts = strainKey.split('|');
    const strain = parts[0];
    const phenotype = parts.length > 1 && parts[1] !== 'default' ? parts[1] : undefined;

    await ctx.dataService.removeStrain(strain, phenotype);

    const current = ctx.data.$strainLibrary.get();
    ctx.data.setStrainLibrary(current.filter((s) => s.key !== strainKey));

    await fetchStrainLibrary(ctx, true);
    return true;
  } catch (err) {
    console.error('Error removing strain:', err);
    return false;
  }
}

/**
 * Add a new growspace.
 */
export async function addGrowspace(
  ctx: ActionContext,
  name: string,
  rows: number = 4,
  plantsPerRow: number = 4,
  notificationService: string = 'mobile_app_notify'
): Promise<boolean> {
  if (!name) {
    ctx.ui.showToast('Name is required', 'error');
    return false;
  }

  try {
    await ctx.dataService.addGrowspace({
      name,
      rows,
      plantsPerRow,
      notificationService,
    });
    ctx.ui.showToast('Growspace added successfully!', 'success');
    await ctx.refreshData();
    ctx.closeDialog();
    return true;
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.ui.showToast(`Error: ${error}`, 'error');
    return false;
  }
}

/**
 * Update an existing growspace.
 */
export async function updateGrowspace(
  ctx: ActionContext,
  growspaceId: string,
  name: string,
  rows: number,
  plantsPerRow: number
): Promise<boolean> {
  try {
    // Optimistic update for immediate UI feedback
    const devices = ctx.data.$devices.get();
    const deviceIdx = devices.findIndex((d) => d.deviceId === growspaceId);

    if (deviceIdx >= 0) {
      const newDevices = [...devices];
      // Shallow clone device, update dimensions and name
      newDevices[deviceIdx] = {
        ...newDevices[deviceIdx],
        name,
        rows,
        plantsPerRow,
      };
      ctx.data.$devices.set(newDevices);
    }

    await ctx.dataService.updateGrowspace({
      growspaceId,
      name,
      rows,
      plantsPerRow,
    });

    // Wait for the backend update and data refresh to complete
    await ctx.refreshData();

    // Only show success and close after data is refreshed
    ctx.ui.showToast('Growspace updated successfully', 'success');
    ctx.closeDialog();
    return true;
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    console.error('[StrainActions] Update failed:', e);
    ctx.ui.showToast(`Failed to update growspace: ${error}`, 'error');
    return false;
  }
}

/**
 * Remove a growspace.
 */
export async function removeGrowspace(ctx: ActionContext, growspaceId: string): Promise<boolean> {
  try {
    await ctx.dataService.removeGrowspace(growspaceId);
    ctx.ui.showToast('Growspace removed successfully', 'success');
    await ctx.refreshData();
    ctx.closeDialog();
    return true;
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    console.error('[StrainActions] Removal failed:', e);
    ctx.ui.showToast(`Failed to remove growspace: ${error}`, 'error');
    return false;
  }
}
