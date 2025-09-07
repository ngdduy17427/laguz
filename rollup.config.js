import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'
import { dts } from 'rollup-plugin-dts'

export default [
  {
    input: 'dist/types/index.d.ts',
    output: { file: 'dist/index.d.ts', format: 'es' },
    plugins: [dts()],
  },
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      plugins: [terser()],
    },
    plugins: [typescript({ tsconfig: './tsconfig.json' })],
  },
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.mjs',
      format: 'esm',
      plugins: [terser()],
    },
    plugins: [typescript({ tsconfig: './tsconfig.json' })],
  },
]
