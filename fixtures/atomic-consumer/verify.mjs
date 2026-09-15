import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import App, { coveredComponents, coveredBlocks } from './dist-ssr/App.js'

const expected = JSON.parse(process.argv[2])
assert.deepEqual(Object.keys(coveredComponents).sort(), expected.sort(), 'Consumer must cover every catalog Component')
for (const component of Object.values(coveredComponents)) assert.equal(typeof component, 'function')
assert.deepEqual(Object.keys(coveredBlocks).sort(), ['CodeExample','PromptInput','SidebarPanel'])
const html = renderToString(createElement(App))
for (const marker of ['atomic-root', 'c-button', 'c-panel', 'c-text-input', 'c-checkbox', 'c-radio-group', 'c-toggle', 'c-textarea', 'c-select', 'c-tag', 'c-segmented', 'c-breadcrumbs', 'c-pagination', 'c-number-stepper', 'c-slider', 'c-range-slider', 'c-rating', 'c-progress-bar', 'c-progress-ring', 'c-status-badge', 'c-alert']) {
  assert.ok(html.includes(marker), `Installed consumer did not render ${marker}`)
}
assert.ok(html.includes('--a-color-accent'), 'Atom variables are missing')
for (const marker of ['c-inline-text', 'c-text-action', 'c-form', 'c-form-actions', 'c-search-field', 'c-password-field', 'c-date-picker', 'c-menu-trigger', 'c-dialog-trigger', 'c-drawer-trigger', 'c-popover-trigger', 'c-tooltip-trigger', 'c-toast', 'c-tabs', 'c-workflow', 'c-table', 'c-combobox', 'c-multiselect', 'c-inline-confirmation', 'c-file-dropzone', 'c-file-list', 'c-empty-state', 'c-spinner', 'c-skeleton']) assert.ok(html.includes(marker), `Installed consumer did not render ${marker}`)
for (const marker of ['b-sidebar','c-attachment-area','AI prompt input','b-code-example']) assert.ok(html.includes(marker))
console.log(`Installed package: ${expected.length} components rendered through public imports.`)
