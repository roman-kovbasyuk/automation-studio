import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    proxy: mode === 'prototype' ? {} : { '/api': 'http://127.0.0.1:3010', '/healthz': 'http://127.0.0.1:3010', '/readyz': 'http://127.0.0.1:3010' },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    // Integration tests share one local PostgreSQL; more workers than half the cores
    // oversubscribe the CPU and make timeouts flaky without making the run faster.
    maxWorkers: '50%',
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.test.{js,jsx}', 'shared/**/*.test.js', 'server/**/*.test.js', 'scripts/testing/**/*.test.js', 'figma-plugin/src/**/*.test.js'],
  },
}))
