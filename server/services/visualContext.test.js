import { expect, test } from 'vitest'
import { validVisualResult } from './visualContext.js'

const direction = (id, copyId) => ({ id, title: id, prompt: 'Source image', status: 'pending', previewAssetId: null, ...(copyId ? { copyId } : {}) })
test('campaign results require five unique source-only visuals', () => {
  const context = { mode: 'campaign' }
  const five = ['a','b','c','d','e'].map(id => direction(id))
  expect(validVisualResult(context, five)).toBe(true)
  expect(validVisualResult(context, five.slice(0,3))).toBe(false)
  expect(validVisualResult(context, [...five.slice(0,4), direction('a')])).toBe(false)
  expect(validVisualResult(context, [{...five[0],copyId:'copy'}, ...five.slice(1)])).toBe(false)
  expect(validVisualResult(context, [{...five[0],previewAssetId:'invented'}, ...five.slice(1)])).toBe(false)
})
test('linked results identify each requested copy exactly once, regardless of provider order', () => {
  const context = { mode: 'selected_copy', copies: [{ id: 'copy-a' }, { id: 'copy-b' }] }
  expect(validVisualResult(context, [direction('a', 'copy-b'), direction('b', 'copy-a')])).toBe(true)
  expect(validVisualResult(context, [direction('a', 'copy-a'), direction('b', 'copy-a')])).toBe(false)
  expect(validVisualResult(context, [direction('a', 'unrelated'), direction('b', 'copy-b')])).toBe(false)
  expect(validVisualResult(context, [direction('a'), direction('b')])).toBe(false)
})
