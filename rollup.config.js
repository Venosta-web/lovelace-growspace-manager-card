import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import css from 'rollup-plugin-css-only';
import replace from '@rollup/plugin-replace';
import minifyHTML from '@lit-labs/rollup-plugin-minify-html-literals';
import summary from 'rollup-plugin-summary';

const isProduction = process.env.NODE_ENV === 'production';
const isCoverage = process.env.COVERAGE === 'true';

const plugins = [
  replace({
    'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
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
    file: 'dist/growspace-manager-card.js',
    format: 'es',
    sourcemap: !isProduction || isCoverage,
    inlineDynamicImports: true,
  },
  plugins,
};
