import { createRequire } from 'module';
import { rmSync } from 'node:fs';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');
import terser from '@rollup/plugin-terser';
import css from 'rollup-plugin-css-only';
import replace from '@rollup/plugin-replace';
import minifyHTML from '@lit-labs/rollup-plugin-minify-html-literals';
import summary from 'rollup-plugin-summary';
import { computeSourceFingerprint, createBuildBanner } from './scripts/e2e-build-state.mjs';

const isProduction = process.env.NODE_ENV === 'production';
const isCoverage = process.env.COVERAGE === 'true';
let buildBanner;

const plugins = [
  {
    name: 'prepare-dist',
    async buildStart() {
      rmSync('dist', { recursive: true, force: true });
      buildBanner = createBuildBanner(await computeSourceFingerprint());
    },
  },
  replace({
    'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
    __VERSION__: JSON.stringify(pkg.version),
    preventAssignment: true,
  }),
  resolve(),
  commonjs(),
  json(),
  typescript({
    tsconfig: './tsconfig.json',
    sourceMap: !isProduction || isCoverage,
  }),
  css({ output: 'dist/styles.css' }),
];

// Only minify in production and not when collecting coverage
if (isProduction && !isCoverage) {
  plugins.push(minifyHTML());
  plugins.push(terser());
  plugins.push(summary());
}

export default {
  input: 'src/index.ts',
  output: {
    dir: 'dist',
    entryFileNames: 'growspace-manager-card.js',
    chunkFileNames: 'growspace-[name]-[hash].js',
    format: 'es',
    sourcemap: !isProduction || isCoverage,
    banner: () => buildBanner,
  },
  plugins,
};
