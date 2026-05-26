/**
 * Strain & Growspace Actions - Unified CRUD logic.
 */

import { StrainEntry } from '../../types';
import { ActionContext } from '../core/action-context';
import { withAction } from '../core/action-utils';
import { fetchStrainLibrary } from './library-actions';
import {
  addStrain as strainSliceAdd,
  updateStrainMeta as strainSliceUpdateMeta,
  removeStrain as strainSliceRemove,
} from '../../slices/strain';

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
    images: strainData.images,
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

  const ok = await withAction(
    ctx,
    async () => {
      await strainSliceAdd(
        _createStrainPayload(strainData) as Parameters<typeof strainSliceAdd>[0]
      );
      const tree = (strainData as any).parents;
      if (tree?.parents?.length) {
        await ctx.dataService.importStrainLineageTree(strainData.strain!, tree);
      }
      await fetchStrainLibrary(ctx, true);
      return true as const;
    },
    { success: 'Strain added successfully!', errorPrefix: 'Failed to add strain' }
  );
  return ok !== undefined;
}

/**
 * Update an existing strain in the library.
 */
export async function updateStrain(
  ctx: ActionContext,
  strainData: Partial<StrainEntry>
): Promise<boolean> {
  if (!strainData.strain) return false;

  const ok = await withAction(
    ctx,
    async () => {
      await strainSliceUpdateMeta(
        _createStrainPayload(strainData) as Parameters<typeof strainSliceUpdateMeta>[0]
      );
      const tree = (strainData as any).parents;
      if (tree?.parents?.length) {
        await ctx.dataService.importStrainLineageTree(strainData.strain!, tree);
      }
      await fetchStrainLibrary(ctx, true);
      return true as const;
    },
    { success: 'Strain updated successfully!', errorPrefix: 'Failed to update strain' }
  );
  return ok !== undefined;
}

/**
 * Remove a strain from the library.
 */
export async function removeStrain(ctx: ActionContext, strainKey: string): Promise<boolean> {
  try {
    await strainSliceRemove(strainKey);

    const current = ctx.data.$strainLibrary.get();
    ctx.data.setStrainLibrary(current.filter((s) => s.key !== strainKey));

    await fetchStrainLibrary(ctx, true);
    return true;
  } catch (err) {
    console.error('Error removing strain:', err);
    return false;
  }
}
