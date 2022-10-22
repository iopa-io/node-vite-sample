import { builtinModules } from 'module'
import { resolve } from 'pathe'
import esbuild from 'rollup-plugin-esbuild'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { defineConfig } from 'vite'
import replace from '@rollup/plugin-replace'
import { version, dependencies } from './package.json'

/**
 * This build configuration file is used to run the development server.
 * It is used in conjunction with ./vite-dev.js
 *
 */

const envKeys = process.env.ENVKEYS
  ? process.env.ENVKEYS.split(',').reduce((accum, key) => {
      accum[`process.env.${key}`] = JSON.stringify(process.env[key])
      return accum
    }, {})
  : {}

envKeys[`process.env.PACKAGE_VERSION`] = JSON.stringify(version)

const external = [
  ...Object.keys(dependencies || {}).filter((k) => !k.startsWith('@sluice/')),
  ...builtinModules.map((x) => `node:${x}`),
  ...builtinModules,
  'worker_threads',
  'inspector',
  'c8',
  '@vitest/browser'
]

const plugins = [
  replace({ preventAssignment: true, values: envKeys }),
  nodeResolve({
    preferBuiltins: true
  }),
  esbuild({
    target: 'node18'
  })
]

export default defineConfig({
  esbuild: { format: 'esm' },
  plugins,
  rollupOptions: {
    external
  },
  build: {
    ssr: resolve(__dirname, 'src/index.ts')
  },
  ssr: {
    external
  }
})
