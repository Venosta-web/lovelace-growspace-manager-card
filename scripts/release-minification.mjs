/**
 * Proof that the release bundles went through terser.
 *
 * `rollup.config.js` minifies only when `NODE_ENV=production`, and nothing but
 * `npm run build:release` sets it. A release built with plain `npm run build`
 * succeeds, passes every shape check, works on every dashboard — and ships
 * about 2.3x the JavaScript, which is how every release up to #968 went out.
 * So it is asserted on the emitted bytes rather than trusted to the script.
 *
 * The signal is line length, not size. A size ceiling moves with every feature
 * and a known identifier moves with every rename, but terser emits a module on
 * a handful of lines while a development build keeps one statement per line:
 * about 38 bytes per line against well over 1,000, whatever the code grows to.
 * Template literals keep their newlines through minification, which is why the
 * floor sits far below the minified figure rather than near it.
 */

/** A minified chunk averages well above this; a development chunk well below. */
export const MIN_MEAN_LINE_LENGTH = 200;

/** Below this a chunk is a banner and a line or two, which says nothing either way. */
export const MIN_JUDGED_BYTES = 16 * 1024;

export function meanLineLength(source) {
  return source.length / source.split('\n').length;
}

/**
 * Fails when any chunk large enough to judge reads as a development build.
 *
 * @param {{ chunks: { fileName: string, source: string }[] }} args every emitted
 *   JavaScript file, entry included.
 */
export function assertMinifiedRelease({ chunks }) {
  const judged = chunks.filter(({ source }) => source.length >= MIN_JUDGED_BYTES);
  if (judged.length === 0) {
    throw new Error(
      `No emitted chunk is large enough (${MIN_JUDGED_BYTES} bytes) to tell whether the release is minified`
    );
  }

  const unminified = judged
    .map(({ fileName, source }) => ({ fileName, mean: meanLineLength(source) }))
    .filter(({ mean }) => mean < MIN_MEAN_LINE_LENGTH);
  if (unminified.length > 0) {
    const detail = unminified
      .map(({ fileName, mean }) => `  ${fileName}: ${Math.round(mean)} bytes per line`)
      .join('\n');
    throw new Error(
      `The release bundles are not minified (a minified chunk averages at least ` +
        `${MIN_MEAN_LINE_LENGTH} bytes per line):\n${detail}\n` +
        'Build releases with `npm run build:release`, which sets NODE_ENV=production.'
    );
  }
}
