import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { atomicBoundaryPlugin } from './scripts/atomic/boundaries.mjs'

export default defineConfig({
  plugins: [react(), atomicBoundaryPlugin(resolve(import.meta.dirname, 'src/atomic'))],
  build: {
    outDir: 'dist-atomic-library',
    lib: { entry: resolve(import.meta.dirname, 'src/atomic/index.ts'), formats: ['es'], fileName: 'index', cssFileName: 'styles' },
    rollupOptions: { external: id => /^(react|react-dom|lucide-react|radix-ui)(\/|$)/.test(id) },
  },
})
