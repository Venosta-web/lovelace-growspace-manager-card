import { describe, it, expect, afterEach, vi } from 'vitest';

import { randomId } from './random-id';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// Captured before any stubbing, so the insecure-context stub can delegate to the
// real implementation instead of recursing into itself.
const realGetRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto);

/** Home Assistant reached over plain HTTP: crypto exists, randomUUID does not. */
function stubInsecureContext(): void {
  vi.stubGlobal('crypto', { getRandomValues: realGetRandomValues });
}

describe('randomId', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a v4 UUID in a secure context', () => {
    expect(randomId()).toMatch(UUID_V4);
  });

  it('returns a v4 UUID when crypto.randomUUID is unavailable (insecure context)', () => {
    stubInsecureContext();

    expect(randomId()).toMatch(UUID_V4);
  });

  it('does not collide across calls in an insecure context', () => {
    stubInsecureContext();

    const ids = new Set(Array.from({ length: 200 }, () => randomId()));

    expect(ids.size).toBe(200);
  });
});
