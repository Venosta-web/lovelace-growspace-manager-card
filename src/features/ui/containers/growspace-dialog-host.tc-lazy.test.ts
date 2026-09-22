import { expect, test } from 'vitest';

import './growspace-dialog-host.container';

/**
 * The eager-load half of TC ADR-0003 on the dialog-host side, asserted where it
 * can actually be seen: in a file whose module graph is only the host.
 *
 * The house pattern for a dialog here is a static import — all 23 of the
 * others are written that way — and written that way `growspace-tc-view` is
 * defined as a side effect of importing the host, the `growspace-tc` chunk is
 * folded into the chunk every dashboard's first dialog fetches, and every user
 * without Growspace Manager TC downloads it. Every other check stays green.
 *
 * `scripts/entry-bundle-shape.mjs` guards the emitted graph; this guards the
 * source. They are complements, not belt-and-braces: a static import of a TC
 * *sub*-module rather than the chunk entry is hoisted by rollup into a third
 * shared chunk, so no emitted edge to `growspace-tc-*.js` exists and the bundle
 * rule passes — while at source level the element is defined and this fails.
 *
 * Deliberately alone in its file: a sibling test that opens the TC dialog would
 * define the element and make the assertion vacuous.
 */
test('importing the dialog host does not pull in the lazy TC chunk', () => {
  expect(customElements.get('growspace-dialog-host')).toBeDefined();
  expect(customElements.get('tc-dialog')).toBeDefined();
  expect(customElements.get('growspace-tc-view')).toBeUndefined();
  expect(customElements.get('growspace-tc-cultures')).toBeUndefined();
  expect(customElements.get('growspace-tc-media')).toBeUndefined();
});
