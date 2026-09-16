import { describe, expect, it } from 'vitest'
import { blockPages } from './blockContent'
import { componentPages } from './componentContent'

describe('documentation source examples', () => {
  it('keeps every component example as a public-package module', () => {
    for (const page of componentPages) {
      expect(page.source, page.id).toContain("from 'brutalist-design-system'")
      expect(page.source, page.id).toContain('export function Example()')
      for (const example of page.examples ?? []) {
        expect(example.source, `${page.id}/${example.id}`).toContain("from 'brutalist-design-system'")
        expect(example.source, `${page.id}/${example.id}`).toContain('export function Example()')
      }
    }
  })

  it('keeps every UI block example as a public-package module', () => {
    for (const page of blockPages) {
      expect(page.source, page.id).toContain("from 'brutalist-design-system'")
      expect(page.source, page.id).toContain('export function Example()')
    }
  })
})
