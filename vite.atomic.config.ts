import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { atomicBoundaryPlugin } from './scripts/atomic/boundaries.mjs'

export default defineConfig({
  plugins: [react(), atomicBoundaryPlugin(resolve(import.meta.dirname, 'src/atomic')), {
    name: 'atomic-layer-boundary',
    generateBundle() {
      const root = `${resolve(import.meta.dirname, 'src/atomic')}/`
      const layers = ['atoms', 'components', 'ui-blocks', 'screens', 'catalog']
      const layerOf = (id: string) => id.startsWith(root) ? layers.indexOf(id.slice(root.length).split('/')[0]) : -1
      for (const id of this.getModuleIds()) {
        const owner = layerOf(id)
        if (owner < 0) continue
        const info = this.getModuleInfo(id)
        for (const imported of [...(info?.importedIds ?? []), ...(info?.dynamicallyImportedIds ?? [])]) {
          if (imported.includes('/node_modules/') || imported.startsWith('\0')) continue
          const dependency = layerOf(imported)
          if (dependency < 0 || dependency > owner) {
            this.error(`Atomic layer violation: ${id} → ${imported}`)
          }
        }
      }
    },
  }],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    include: ['src/atomic/**/*.test.{ts,tsx}'],
  },
  build: { outDir: 'dist', rollupOptions: { input: { index: resolve(import.meta.dirname, 'index.html'), atomic: resolve(import.meta.dirname, 'atomic.html'), docs: resolve(import.meta.dirname, 'page-20.html'), components: resolve(import.meta.dirname, 'page-21.html'), blocks: resolve(import.meta.dirname, 'page-22.html') } } },
})
