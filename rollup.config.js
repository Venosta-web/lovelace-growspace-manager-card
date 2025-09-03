import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/growspace-manager-card.ts',
  output: {
    file: 'dist/growspace-manager-card.js',
    format: 'es',
    sourcemap: true
  },
  plugins: [
    resolve(),
    commonjs(),
    typescript({ tsconfig: './tsconfig.json' }), // <- add this
    terser()
  ],
};
