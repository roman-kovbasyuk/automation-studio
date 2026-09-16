import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// jsdom does not implement these browser APIs used by Radix popups. Keep the
// browser-only shim out of Node integration suites that share this setup file.
if (typeof Element !== 'undefined') {
  for (const name of ['hasPointerCapture', 'setPointerCapture', 'releasePointerCapture', 'scrollIntoView']) {
    if (!Element.prototype[name]) Element.prototype[name] = name === 'hasPointerCapture' ? () => false : () => {}
  }
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

if (typeof window !== 'undefined') {
  const localRecords = new Map()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem(key) { return localRecords.get(key) ?? null },
      setItem(key, value) { localRecords.set(key, String(value)) },
      removeItem(key) { localRecords.delete(key) },
      clear() { localRecords.clear() },
    },
  })

  if (!HTMLDialogElement.prototype.showModal) {
    Object.defineProperties(HTMLDialogElement.prototype, {
      showModal: {
        configurable: true,
        value() {
          this.__opener = document.activeElement
          this.setAttribute('open', '')
          this.querySelector('button')?.focus()
          this.__escape = event => {
            if (event.key === 'Escape') this.dispatchEvent(new Event('cancel', { bubbles: false, cancelable: true }))
          }
          document.addEventListener('keydown', this.__escape)
        },
      },
      close: {
        configurable: true,
        value() {
          this.removeAttribute('open')
          document.removeEventListener('keydown', this.__escape)
          this.__opener?.focus()
        },
      },
    })
  }
}

afterEach(cleanup)
beforeEach(() => {
  if (typeof window !== 'undefined') window.scrollTo = vi.fn()
})
