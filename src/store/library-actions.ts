import { ActionContext } from './action-context';

export async function fetchStrainLibrary(ctx: ActionContext, force: boolean = false) {
  // Requires hass to be present in store (usually via dataService or just check store)
  // The original code checks this.hass.
  // We assume dataService has valid connection or we check it.

  // Original code checked `if (!this.hass) return;`
  // We can check if dataService is initialized or catch errors.

  const CACHE_KEY = 'growspace_strain_library_v2';
  const CACHE_VALIDITY_MS = 24 * 60 * 60 * 1000; // 24 hours

  if (!ctx.hass) return;

  const cachedRaw = localStorage.getItem(CACHE_KEY);
  let usedCache = false;

  if (!force && cachedRaw) {
    try {
      const cache = JSON.parse(cachedRaw);
      const age = Date.now() - (cache.timestamp || 0);

      if (cache.version === 2 && age < CACHE_VALIDITY_MS && Array.isArray(cache.data)) {
        ctx.data.setStrainLibrary(cache.data);
        usedCache = true;
      }
    } catch (e) {
      console.warn('Failed to parse cached strain library', e);
      localStorage.removeItem(CACHE_KEY);
    }
  }

  if (!usedCache) {
    try {
      const currentStrains = await ctx.dataService.fetchStrainLibrary();
      if (Array.isArray(currentStrains)) {
        ctx.data.setStrainLibrary(currentStrains);

        const cacheData = {
          version: 2,
          timestamp: Date.now(),
          data: currentStrains,
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      }
    } catch (e) {
      console.error('Failed to fetch strain library:', e);
    }
  }
}

export async function fetchNutrientPresets(ctx: ActionContext, force: boolean = false) {
  const CACHE_KEY = 'growspace_nutrient_presets';
  const CACHE_VALIDITY_MS = 30 * 60 * 1000; // 30 minutes

  if (!ctx.hass) return;

  const cachedRaw = localStorage.getItem(CACHE_KEY);
  if (!force && cachedRaw) {
    try {
      const cache = JSON.parse(cachedRaw);
      const age = Date.now() - (cache.timestamp || 0);
      if (age < CACHE_VALIDITY_MS) {
        console.debug('[LibraryActions] Using cached nutrient presets (Age: %sms)', age);
        ctx.data.setNutrientPresets(cache.data);
        return;
      }
    } catch (e) {
      console.warn('[LibraryActions] Failed to parse cached nutrient presets', e);
      localStorage.removeItem(CACHE_KEY);
    }
  }

  console.log('[LibraryActions] Fetching nutrient presets from server (Force: %s)', force);

  try {
    const result = await ctx.dataService.fetchNutrientPresets();
    if (result) {
      ctx.data.setNutrientPresets(result);
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          data: result,
        })
      );
    }
  } catch (e) {
    console.error('Failed to fetch nutrient presets:', e);
  }
}

export async function fetchIPMPresets(ctx: ActionContext, force: boolean = false) {
  const CACHE_KEY = 'growspace_ipm_presets';
  const CACHE_VALIDITY_MS = 30 * 60 * 1000; // 30 minutes

  if (!ctx.hass) return;

  const cachedRaw = localStorage.getItem(CACHE_KEY);
  if (!force && cachedRaw) {
    try {
      const cache = JSON.parse(cachedRaw);
      const age = Date.now() - (cache.timestamp || 0);
      if (age < CACHE_VALIDITY_MS) {
        console.debug('[LibraryActions] Using cached IPM presets (Age: %sms)', age);
        ctx.data.setIPMPresets(cache.data);
        return;
      }
    } catch (e) {
      console.warn('[LibraryActions] Failed to parse cached IPM presets', e);
      localStorage.removeItem(CACHE_KEY);
    }
  }

  console.log('[LibraryActions] Fetching IPM presets from server (Force: %s)', force);

  try {
    const result = await ctx.dataService.fetchIPMPresets();
    if (result) {
      ctx.data.setIPMPresets(result);
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          data: result,
        })
      );
    }
  } catch (e) {
    console.error('Failed to fetch IPM presets:', e);
  }
}

export async function fetchNutrientInventory(ctx: ActionContext, force: boolean = false) {
  const CACHE_KEY = 'growspace_nutrient_inventory';
  const CACHE_VALIDITY_MS = 5 * 60 * 1000; // 5 minutes

  if (!ctx.hass) return;

  const cachedRaw = localStorage.getItem(CACHE_KEY);
  if (!force && cachedRaw) {
    try {
      const cache = JSON.parse(cachedRaw);
      const age = Date.now() - (cache.timestamp || 0);
      if (age < CACHE_VALIDITY_MS) {
        ctx.data.setNutrientInventory(cache.data);
        return;
      }
    } catch (_) {
      localStorage.removeItem(CACHE_KEY);
    }
  }

  try {
    const result = await ctx.dataService.fetchNutrientInventory();
    if (result) {
      ctx.data.setNutrientInventory(result);
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          data: result,
        })
      );
    }
  } catch (e) {
    console.error('Failed to fetch nutrient inventory:', e);
  }
}

export async function updateNutrientStock(
  ctx: ActionContext,
  nutrientId: string,
  name: string,
  currentMl: number,
  initialMl: number
) {
  try {
    await ctx.dataService.updateNutrientStock(nutrientId, name, currentMl, initialMl);
    await fetchNutrientInventory(ctx, true);
    ctx.showToast(`Updated stock: ${name}`, 'success');
  } catch (e: any) {
    ctx.showToast(`Failed to update stock: ${e.message}`, 'error');
  }
}

export async function removeNutrientStock(ctx: ActionContext, nutrientId: string) {
  try {
    await ctx.dataService.removeNutrientStock(nutrientId);
    await fetchNutrientInventory(ctx, true);
    ctx.showToast('Removed nutrient stock', 'success');
  } catch (e: any) {
    ctx.showToast(`Failed to remove stock: ${e.message}`, 'error');
  }
}
