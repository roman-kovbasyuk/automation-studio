import { execFileSync } from 'node:child_process'
import { verifyDesignSystem } from './design-system-check.mjs'
import { verifyBuildArtifacts } from './verify-build.mjs'

await verifyDesignSystem()

execFileSync('vite', ['build'], { stdio: 'inherit' })
execFileSync('vitepress', ['build', 'docs-site', '--outDir', 'dist/docs'], { stdio: 'inherit' })
await verifyBuildArtifacts()
