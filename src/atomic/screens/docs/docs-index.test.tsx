import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { DocsIndex } from './DocsIndex'
import { basicsPages } from './basicsContent'
import { componentGroups } from './docsNavigation'
import { blockPages } from './blockContent'

test('documentation index links every published page family', () => {
  render(<DocsIndex />)
  expect(screen.getByRole('heading', { name: 'Every element, one system', level: 1 })).toBeVisible()
  const links = within(screen.getByRole('main')).getAllByRole('link')
  const basics = links.filter(link => link.getAttribute('href')?.startsWith('/page-20.html?basic='))
  const components = links.filter(link => link.getAttribute('href')?.startsWith('/page-21.html?component='))
  const blocks = links.filter(link => link.getAttribute('href')?.startsWith('/page-22.html?block='))
  expect(basics).toHaveLength(basicsPages.length)
  expect(components.length).toBe(componentGroups.reduce((count, group) => count + group.items.filter(item => item.href).length, 0))
  expect(blocks).toHaveLength(blockPages.length)
})
