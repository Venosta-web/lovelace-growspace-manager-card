import { expect, test } from 'vitest';

import '../../src/cards/growspace-tc-card';

/**
 * The eager-load half of TC ADR-0003, asserted where it can actually be seen:
 * in a file whose module graph is only the card.
 *
 * `growspace-tc-view` lives in the lazy `growspace-tc` chunk and is defined as
 * a side effect of importing it. If any static import ever reaches that chunk
 * from the card — or from anything the card pulls in — the element is defined
 * here, the chunk is folded into the entry bundle, and every user without
 * Growspace Manager TC downloads it. This test is deliberately alone in its
 * file: a sibling test that renders a present TC would define the element and
 * make the assertion meaningless.
 */
test('importing the TC card does not pull in the lazy TC chunk', () => {
  expect(customElements.get('growspace-tc-card')).toBeDefined();
  expect(customElements.get('growspace-tc-view')).toBeUndefined();
});
