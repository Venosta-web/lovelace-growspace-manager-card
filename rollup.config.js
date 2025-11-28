import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import css from 'rollup-plugin-css-only';

const isProduction = process.env.NODE_ENV === 'production';
const isCoverage = process.env.COVERAGE === 'true';

const plugins = [
  resolve(),
  commonjs(),
  typescript({
    tsconfig: './tsconfig.json',
    sourceMap: !isProduction || isCoverage,
  }),
  css({ output: 'dist/styles.css' }),
];

// Only minify in production and not when collecting coverage
if (isProduction && !isCoverage) {
  plugins.push(terser());
}

export default {
  input: 'src/index.ts',
  output: {
    file: isCoverage ? 'dist/growspace-manager-card.instrumented.js' : 'dist/growspace-manager-card.js',
    format: 'es',
    sourcemap: !isProduction || isCoverage,
  },
  plugins,
};
