import { useEffect, useState } from 'react'

/** Catalog inspection behavior; never shipped as a component interaction. */
export function useCopyMode() {
  const [enabled, setEnabled] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    if (!enabled) return
    function targetFor(target: EventTarget | null): Element | null {
      if (!(target instanceof Element)) return null
      if (target.closest('.atoms-nav, .c-panel__header')) return null
      if (!target.closest('.atoms-main, .c-overlay-root')) return null
      let element: Element | null = target
      while (element && !element.matches('.atoms-main, .c-overlay-root')) {
        if ([...element.classList].some(name => name.startsWith('c-') && !name.includes('__'))) return element
        element = element.parentElement
      }
      return null
    }
    async function copy(element: Element) {
      const classes = [...element.classList].filter(name => name.startsWith('a-') || name.startsWith('c-') || name.startsWith('b-')).join(' ')
      const modifiers = ['variant', 'size', 'icon-only', 'tone', 'status', 'orientation']
        .filter(name => element.hasAttribute(`data-${name}`))
        .map(name => `[data-${name}=${JSON.stringify(element.getAttribute(`data-${name}`))}]`).join('')
      const icon = element.querySelector('[data-icon]')
      const iconReference = icon && element.closest('#icons')
        ? ` [data-icon=${JSON.stringify(icon.getAttribute('data-icon'))}] ${icon.getAttribute('style') ?? ''}` : ''
      const reference = `${classes}${modifiers}${iconReference}`.trim()
      try {
        await navigator.clipboard.writeText(`use this element from design system: ${reference}`)
        setMessage(`Copied: ${reference}`)
      } catch {
        setMessage(`Clipboard unavailable. Copy manually: use this element from design system: ${reference}`)
      }
    }
    function pointer(event: PointerEvent) {
      const target = targetFor(event.target)
      if (!target || event.button !== 0) return
      event.preventDefault()
      event.stopImmediatePropagation()
      void copy(target)
    }
    function click(event: MouseEvent) {
      const target = targetFor(event.target)
      if (!target) return
      event.preventDefault()
      event.stopImmediatePropagation()
      if (event.detail === 0) void copy(target)
    }
    function key(event: KeyboardEvent) {
      const target = targetFor(event.target)
      if (!target || event.key === 'Tab' || event.key === 'Escape' || event.metaKey || event.ctrlKey) return
      event.preventDefault()
      event.stopImmediatePropagation()
      if (event.key === 'Enter' || event.key === ' ') void copy(target)
    }
    document.addEventListener('pointerdown', pointer, true)
    document.addEventListener('click', click, true)
    document.addEventListener('keydown', key, true)
    return () => {
      document.removeEventListener('pointerdown', pointer, true)
      document.removeEventListener('click', click, true)
      document.removeEventListener('keydown', key, true)
    }
  }, [enabled])
  return { enabled, setEnabled, message }
}
