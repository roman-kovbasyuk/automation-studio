import { Icon, Stack, Text } from '../../atoms'
import { NavigationList, type NavigationItem } from '../../components'

type DocsNavGroupProps = {
  title: string
  items: readonly NavigationItem[]
  label: string
  collapsed: boolean
  forceOpen: boolean
  onToggle: () => void
}

const groupId = (title: string) => `docs-nav-group-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

export function DocsNavGroup({ title, items, label, collapsed, forceOpen, onToggle }: DocsNavGroupProps) {
  const id = groupId(title)
  const expanded = forceOpen || !collapsed

  return <Stack gap={1}>
    <a
      className="docs-nav-group-heading"
      href={`#${id}`}
      aria-expanded={expanded}
      aria-controls={`${id}-items`}
      data-docs-nav-group="true"
      onClick={event => { event.preventDefault(); event.stopPropagation(); onToggle() }}
      onKeyDown={event => {
        if (event.key === ' ') { event.preventDefault(); event.stopPropagation(); onToggle() }
      }}
    >
      <Text as="span" variant="h6">{title}</Text>
      <Icon name={expanded ? 'chevronDown' : 'chevronRight'} label="" />
    </a>
    <div id={`${id}-items`} hidden={!expanded}>
      <NavigationList label={label} items={items} />
    </div>
  </Stack>
}
