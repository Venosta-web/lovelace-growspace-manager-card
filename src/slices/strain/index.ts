/**
 * Strain slice — atoms and mutators for the strain library.
 *
 * Public API (atoms):
 *   strainLibrary$         — read: current list of parsed StrainEntry objects
 *   setStrainLibrary()     — write: replace library (called by bootstrap/sync)
 *
 * Public API (mutators):
 *   fetchStrainLibrary()   — WS fetch → parses response → updates strainLibrary$
 *   addStrain(data)        — service call to add a strain
 *   removeStrain(key)      — service call to remove a strain (parses "strain|phenotype" key)
 *   updateStrainMeta(data) — service call to update strain metadata
 *   exportStrainLibrary()  — service call to trigger server-side export
 *   importStrainLibrary(file, replace) — REST upload to import a JSON library
 *   clearStrainLibrary()   — service call to wipe the library
 *   updateBreeder(old, new, logo?) — WS call to rename/update a breeder
 *   deleteBreeder(name)    — WS call to delete a breeder
 *
 * Zod schemas are in ./schema.ts.
 */

import { atom } from 'nanostores';
import { z } from 'zod';
import { callService, callFetch, hassCall } from '../../services/hass-call';
import { StrainLibrarySchema, StrainLibraryWrapperSchema } from './schema';
import type { StrainEntry, StrainGalleryImage, CropMeta } from '../../types';

// ---------------------------------------------------------------------------
// Atoms (public)
// ---------------------------------------------------------------------------

export const strainLibrary$ = atom<StrainEntry[]>([]);

// ---------------------------------------------------------------------------
// Bootstrap write (called by SyncService / store when fresh data arrives)
// ---------------------------------------------------------------------------

export function setStrainLibrary(library: StrainEntry[]): void {
  strainLibrary$.set(library);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Parse a raw WS response into a sorted StrainEntry[]. */
function _parseLibrary(rawStrains: z.output<typeof StrainLibrarySchema>): StrainEntry[] {
  const results: StrainEntry[] = [];

  for (const [strainName, strainData] of Object.entries(rawStrains)) {
    if (strainName === 'response') continue;
    const meta = strainData.meta ?? {};
    const phenotypes = strainData.phenotypes ?? {};

    for (const [phenoName, phenoData] of Object.entries(phenotypes)) {
      const gallery = phenoData.images as StrainGalleryImage[] | undefined;
      const thumbnail = gallery?.find((img) => img.is_thumbnail) ?? gallery?.[0];
      results.push({
        strain: strainName,
        phenotype: phenoName,
        key: `${strainName}|${phenoName}`,
        breeder: meta.breeder,
        breeder_logo: meta.breeder_logo,
        type: meta.type,
        lineage: meta.lineage,
        parents: meta.lineage_tree?.length ? meta.lineage_tree : undefined,
        sex: meta.sex,
        sativa_percentage: meta.sativa_percentage,
        indica_percentage: meta.indica_percentage,
        is_stub: meta.is_stub,
        description: phenoData.description,
        image: (thumbnail as any)?.path ?? phenoData.image_path,
        image_crop_meta:
          (thumbnail as any)?.crop_meta ?? (phenoData.image_crop_meta as CropMeta | undefined),
        images: gallery,
        flowering_days_min: phenoData.flower_days_min,
        flowering_days_max: phenoData.flower_days_max,
      });
    }
  }

  return results.sort((a, b) => {
    const cmp = a.strain.localeCompare(b.strain);
    return cmp !== 0 ? cmp : a.phenotype.localeCompare(b.phenotype);
  });
}

/**
 * Build the service-call payload for add/update operations, applying the
 * image-routing rules:
 *   - gallery present  → send `images`, omit `image`
 *   - data: URL        → send `image_base64`, omit `image`
 *   - path/remote URL  → send `image_path`, omit `image`
 */
function _buildStrainPayload(
  data: Partial<StrainEntry> & {
    image_crop_meta?: CropMeta;
    images?: StrainGalleryImage[];
  }
): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...data };

  // Remove undefined keys
  for (const key of Object.keys(payload)) {
    if (payload[key] === undefined) delete payload[key];
  }

  if (data.images && data.images.length > 0) {
    delete payload.image;
  } else if (data.image) {
    if (data.image.startsWith('data:')) {
      payload.image_base64 = data.image;
    } else {
      payload.image_path = data.image;
    }
    delete payload.image;
  }

  return payload;
}

// ---------------------------------------------------------------------------
// Mutators (public)
// ---------------------------------------------------------------------------

/**
 * Fetch the full strain library over WebSocket.
 *
 * Updates strainLibrary$ on success. Re-throws on backend errors.
 */
export async function fetchStrainLibrary(): Promise<StrainEntry[]> {
  const response = await hassCall(
    'growspace_manager/get_strain_library',
    {},
    StrainLibraryWrapperSchema
  );
  const entries = _parseLibrary(response.strains);
  strainLibrary$.set(entries);
  return entries;
}

/**
 * Add a strain to the library.
 */
export async function addStrain(
  data: Partial<StrainEntry> & {
    strain?: string;
    image_crop_meta?: CropMeta;
    images?: StrainGalleryImage[];
  }
): Promise<void> {
  await callService('growspace_manager', 'add_strain', _buildStrainPayload(data));
}

/**
 * Remove a strain from the library by its composite key ("strain|phenotype").
 *
 * A phenotype of "default" is treated as no phenotype (omitted from the payload).
 */
export async function removeStrain(key: string): Promise<void> {
  const parts = key.split('|');
  const strain = parts[0];
  const phenotype = parts.length > 1 && parts[1] !== 'default' ? parts[1] : undefined;
  await callService('growspace_manager', 'remove_strain', {
    strain,
    ...(phenotype ? { phenotype } : {}),
  });
}

/**
 * Update metadata for an existing strain.
 */
export async function updateStrainMeta(
  data: Partial<StrainEntry> & {
    strain?: string;
    image_crop_meta?: CropMeta;
    images?: StrainGalleryImage[];
  }
): Promise<void> {
  await callService('growspace_manager', 'update_strain_meta', _buildStrainPayload(data));
}

/**
 * Trigger a server-side export of the strain library.
 */
export async function exportStrainLibrary(): Promise<void> {
  await callService('growspace_manager', 'export_strain_library', {});
}

/**
 * Import a strain library from a JSON file via REST.
 *
 * @param file    - The JSON file to upload
 * @param replace - Whether to replace the existing library (true) or merge (false)
 */
export async function importStrainLibrary(
  file: File,
  replace: boolean
): Promise<{ success: boolean; error?: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('replace', replace.toString());

  const response = await callFetch('/api/growspace_manager/import_strains', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || response.statusText);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error ?? 'Unknown import error');
  }

  return result as { success: boolean; error?: string };
}

/**
 * Clear the entire strain library.
 */
export async function clearStrainLibrary(): Promise<void> {
  await callService('growspace_manager', 'clear_strain_library', {});
}

/**
 * Rename or update a breeder entry.
 */
export async function updateBreeder(
  oldName: string,
  newName: string,
  logo?: string
): Promise<void> {
  await hassCall(
    'growspace_manager/update_breeder',
    {
      original_name: oldName,
      new_name: newName,
      ...(logo !== undefined ? { logo } : {}),
    },
    z.unknown()
  );
}

/**
 * Delete a breeder and disassociate it from strains.
 */
export async function deleteBreeder(name: string): Promise<void> {
  await hassCall('growspace_manager/delete_breeder', { breeder_name: name }, z.unknown());
}
