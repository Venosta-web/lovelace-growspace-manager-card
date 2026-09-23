import { expect, test } from 'vitest';

import './growspace-dialog-host.container';
import { DIALOG_CHUNKS } from './growspace-dialog-chunks';

/**
 * The dialog host is a router: importing it defines no dialog at all (#969).
 *
 * It used to import every dialog statically, so the first dialog a dashboard
 * opened downloaded all of them, and the TC view was one static import away
 * from joining them (TC ADR-0003). `scripts/entry-bundle-shape.mjs` guards the
 * emitted graph for every chunk that declares `onDemandOnly`; this guards the
 * source. They are complements, not belt-and-braces: a static import of a
 * dialog's *sub*-module is hoisted by rollup into a shared chunk, so no emitted
 * edge to the dialog's own chunk exists and the bundle rule passes — while at
 * source level the element is defined and this fails.
 *
 * Deliberately alone in its file: a sibling test that opens a dialog would
 * define its element and make the assertion vacuous.
 */
test('importing the dialog host defines none of the dialogs it routes', () => {
  expect(customElements.get('growspace-dialog-host')).toBeDefined();
  const defined = Object.values(DIALOG_CHUNKS)
    .map(({ tag }) => tag)
    .filter((tag) => customElements.get(tag) !== undefined);
  expect(defined).toEqual([]);
});

test('importing the dialog host does not pull in the lazy TC chunk', () => {
  expect(customElements.get('growspace-tc-view')).toBeUndefined();
  expect(customElements.get('growspace-tc-cultures')).toBeUndefined();
  expect(customElements.get('growspace-tc-media')).toBeUndefined();
});
