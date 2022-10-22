import { builtinModules } from 'module'
import { rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import esbuild from 'rollup-plugin-esbuild'
import dts from 'rollup-plugin-dts'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import alias from '@rollup/plugin-alias'
import json from '@rollup/plugin-json'
import { defineConfig } from 'rollup'
import replace from '@rollup/plugin-replace'
import { version } from './package.json'

/**
 * This build configuration file is used to create the production build.
 *
 * To minimize production installation, to lock dependencies, and to support
 * environments that require single scripts (e.g., Cloudflare workers), the
 * production build creates a single file.
 */

try {
  rmSync(join(process.cwd(), 'dist'), { recursive: true })
} catch (ex) {
  /** noop */
}

const envKeys = process.env.ENVKEYS.split(',').reduce((accum, key) => {
  accum[`process.env.${key}`] = JSON.stringify(process.env[key])
  return accum
}, {})

envKeys[`process.env.PACKAGE_VERSION`] = JSON.stringify(version)

const entries = ['src/server.ts']
const dtsEntries = []

const external = [
  ...builtinModules,
  'worker_threads',
  'inspector',
  'c8',
  '@vitest/browser'
]

const plugins = [
  alias({
    entries: [
      { find: /^node:(.+)\/?$/, replacement: '$1' },
      { find: 'string_decoder/', replacement: 'string_decoder' }
    ]
  }),
  replace({ preventAssignment: true, values: envKeys }),
  nodeResolve({
    preferBuiltins: true,
    exportConditions: ['node', 'default', 'module', 'import']
  }),
  commonjs(),
  json(),
  esbuild({
    target: 'node18'
  }),
  {
    name: 'write-dist-package-json',
    writeBundle() {
      writeFileSync(
        join(process.cwd(), 'dist', 'package.json'),
        JSON.stringify({ type: 'commonjs' }, null, 2),
        { encoding: 'utf-8' }
      )
    }
  }
]

export default ({ watch }) => [
  ...entries.map((input) =>
    defineConfig({
      treeshake: {
        moduleSideEffects: 'no-external'
      },
      input,
      output: {
        dir: 'dist',
        format: 'cjs',
        entryFileNames: '[name].js'
      },
      // external,
      plugins: [...plugins],
      preserveEntrySignatures: false,
      onwarn(message) {
        if (/THIS_IS_UNDEFINED/.test(message.code)) return
        if (/CIRCULAR_DEPENDENCY/.test(message.code)) return
        console.error(message)
      }
    })
  ),
  ...dtsEntries.map((input) => {
    const _external = external
    // index is vitest default types export
    if (!input.includes('index')) _external.push('vitest')

    return defineConfig({
      input,
      output: {
        file: input.replace('src/', 'dist/').replace('.ts', '.d.ts'),
        format: 'esm'
      },
      external: _external,
      plugins: [dts({ respectExternal: true })]
    })
  })
]
