/**
 * UUID generation that survives insecure contexts.
 *
 * `crypto.randomUUID` is restricted to secure contexts, so it is undefined on a
 * Home Assistant instance reached over plain HTTP (e.g. http://homeassistant.local:8123).
 * `crypto.getRandomValues` carries no such restriction, so fall back to building a
 * v4 UUID from it.
 */

/** Generate a v4 UUID, working in both secure and insecure browsing contexts. */
export function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // Set the version (4) and variant (10xx) bits the v4 layout requires.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
