import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

test('the legacy token entry delegates to the installed source without freezing upstream values', () => {
  const entry = readFileSync('src/components/design-system/foundations/tokens.css', 'utf8')
  expect(entry).toContain("@import 'brutalist-design-system/styles.css'")
  expect(entry).not.toMatch(/--(?:v2|primitive)-[\w-]+\s*:/)
})
