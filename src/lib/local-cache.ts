/**
 * Small localStorage read-through cache for slice fetch mutators.
 *
 * Extracted from the retired `store/plant/library-actions.ts` so the caching the
 * initial-load / library call sites relied on keeps working once those call
 * sites talk to slice fetch mutators directly. Caching is *opt-in* per fetch
 * call: the default slice fetch stays a fresh backend read (the contract the
 * Plant slice's `waterGrowspace` cross-slice refetch and the dialog self-fetch
 * paths depend on).
 */

/** Per-call cache options for a slice fetch mutator. */
export interface CacheOptions {
  /** Read/write the localStorage cache (default: fresh fetch, no caching). */
  cache?: boolean;
  /** When caching, bypass the cached value and refetch (still rewrites cache). */
  force?: boolean;
}

/** Return the cached value when present and younger than `ttlMs`, else null. */
export function readCache<T>(key: string, ttlMs: number): T | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const cache = JSON.parse(raw) as { timestamp?: number; data?: T };
    if (Date.now() - (cache.timestamp ?? 0) < ttlMs) {
      return (cache.data ?? null) as T | null;
    }
  } catch {
    localStorage.removeItem(key);
  }
  return null;
}

/** Persist `data` under `key` with the current timestamp. */
export function writeCache(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }));
  } catch (e) {
    console.warn('[local-cache] failed to write', key, e);
  }
}
