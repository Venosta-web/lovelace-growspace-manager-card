/**
 * Strain & Growspace Actions - Unified CRUD logic.
 */

import { StrainEntry } from '../../types';
import { ActionContext } from '../core/action-context';
import { fetchStrainLibrary } from './library-actions';

/**
 * Add a new strain to the library.
 */
export async function addStrain(
  ctx: ActionContext,
  strainData: Partial<StrainEntry>
): Promise<boolean> {
  if (!strainData.strain) return false;

  const payload = {
    strain: strainData.strain,
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
  };

  try {
    await ctx.dataService.addStrain(payload);
    ctx.showToast('Strain saved successfully!', 'success');
    await fetchStrainLibrary(ctx, true);
    return true;
  } catch (err) {
    console.error('Error adding strain:', err);
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
    ctx.showToast('Name is required', 'error');
    return false;
  }

  try {
    await ctx.dataService.addGrowspace({
      name,
      rows,
      plantsPerRow,
      notificationService,
    });
    ctx.showToast('Growspace added successfully!', 'success');
    await ctx.refreshData();
    ctx.closeDialog();
    return true;
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    ctx.showToast(`Error: ${error}`, 'error');
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
      // Shallow clone device, update dimensions
      newDevices[deviceIdx] = {
        ...newDevices[deviceIdx],
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
    ctx.showToast('Growspace updated successfully', 'success');
    await ctx.refreshData();
    ctx.closeDialog();
    return true;
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    console.error('[StrainActions] Update failed:', e);
    ctx.showToast(`Failed to update growspace: ${error}`, 'error');
    return false;
  }
}

/**
 * Remove a growspace.
 */
export async function removeGrowspace(ctx: ActionContext, growspaceId: string): Promise<boolean> {
  try {
    await ctx.dataService.removeGrowspace(growspaceId);
    ctx.showToast('Growspace removed successfully', 'success');
    await ctx.refreshData();
    ctx.closeDialog();
    return true;
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    console.error('[StrainActions] Removal failed:', e);
    ctx.showToast(`Failed to remove growspace: ${error}`, 'error');
    return false;
  }
}
