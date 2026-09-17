import { afterEach, expect, test } from 'vitest'
import { forgetPendingUploads, readPendingUploads, rememberPendingUploads } from './pendingUploads.js'

afterEach(() => sessionStorage.clear())

test('remembers file names for an interrupted upload notice and forgets them after the upload settles', () => {
  rememberPendingUploads('campaign-1', [{ id: 'a', name: 'brief.pdf', data: 'large' }, { id: 'b', name: 'notes.docx' }])
  expect(sessionStorage.getItem('automation-studio:pending-uploads:campaign-1')).toBe('["brief.pdf","notes.docx"]')
  expect(readPendingUploads('campaign-1')).toEqual(['brief.pdf', 'notes.docx'])
  forgetPendingUploads('campaign-1')
  expect(readPendingUploads('campaign-1')).toEqual([])
  rememberPendingUploads('campaign-2', [])
  expect(readPendingUploads('campaign-2')).toEqual([])
  sessionStorage.setItem('automation-studio:pending-uploads:campaign-3', '{"not":"a list"}')
  expect(readPendingUploads('campaign-3')).toEqual([])
})
