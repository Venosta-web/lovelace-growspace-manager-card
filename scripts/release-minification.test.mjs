import assert from 'node:assert/strict';
import test from 'node:test';

import { assertMinifiedRelease, meanLineLength } from './release-minification.mjs';

// A development build is ordinary indented source: one statement per line.
const developmentChunk = (bytes) =>
  Array.from({ length: Math.ceil(bytes / 40) }, (_, index) => `  const value${index} = ${index};`)
    .join('\n')
    .slice(0, bytes);

// terser puts a module on a handful of lines; only template literals keep theirs.
const minifiedChunk = (bytes) =>
  `/*! banner */\n${'var e=1;'.repeat(bytes / 8)}\n<div\n  class="kept">\n</div>`;

test('mean line length is bytes over lines, counting a final line without a newline', () => {
  assert.equal(meanLineLength('abcd\nefgh'), 4.5);
  assert.equal(meanLineLength('abcdefgh'), 8);
});

test('a terser build passes, including templates whose lines survive minification', () => {
  assert.doesNotThrow(() =>
    assertMinifiedRelease({
      chunks: [
        { fileName: 'dist/growspace-manager-card.js', source: minifiedChunk(900_000) },
        { fileName: 'dist/growspace-heatmap-3d-abc.js', source: minifiedChunk(650_000) },
      ],
    })
  );
});

test('a development build fails and names every unminified chunk', () => {
  assert.throws(
    () =>
      assertMinifiedRelease({
        chunks: [
          { fileName: 'dist/growspace-manager-card.js', source: developmentChunk(2_000_000) },
          { fileName: 'dist/growspace-heatmap-3d-abc.js', source: minifiedChunk(650_000) },
          { fileName: 'dist/growspace-tc-abc.js', source: developmentChunk(66_000) },
        ],
      }),
    (error) => {
      assert.match(error.message, /dist\/growspace-manager-card\.js/);
      assert.match(error.message, /dist\/growspace-tc-abc\.js/);
      assert.doesNotMatch(error.message, /heatmap-3d/);
      assert.match(error.message, /npm run build:release/);
      return true;
    }
  );
});

test('chunks too small to carry a signal are not judged', () => {
  // A minified editor chunk is a banner line plus one short line of code.
  assert.doesNotThrow(() =>
    assertMinifiedRelease({
      chunks: [
        { fileName: 'dist/growspace-manager-card.js', source: minifiedChunk(900_000) },
        { fileName: 'dist/growspace-editor-utils-abc.js', source: developmentChunk(600) },
      ],
    })
  );
});

test('a release with no chunk large enough to judge fails rather than passing vacuously', () => {
  assert.throws(
    () =>
      assertMinifiedRelease({
        chunks: [{ fileName: 'dist/growspace-manager-card.js', source: developmentChunk(600) }],
      }),
    /No emitted chunk is large enough/
  );
});
