import { render, screen, within } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { AdminRecords } from './AdminRecords.jsx'

const page = (item) => ({ items: [item], page: 1, pageSize: 25, total: 1 })
const client = {
  records: vi.fn(async (section) => {
    if (section === 'users')
      return page({
        id: 'user_1234-abcd',
        displayName: 'First Last',
        email: 'first-last_ops@example.test',
        role: 'admin',
        disabled: false,
        passwordConfigured: true,
        googleConnected: false,
        updatedAt: '2026-09-10T00:00:00Z',
      })
    if (section === 'assets')
      return page({
        id: 'asset_1234-abcd',
        name: 'launch-file_v2.png',
        kind: 'final_image',
        sourceType: 'brand-source',
        projectId: null,
        brandId: null,
        mimeType: 'image/vnd.example_asset+json',
        byteSize: 42,
        createdAt: '2026-09-10T00:00:00Z',
      })
    return page({
      id: 'campaign-generation:job_1234-abcd',
      rawId: 'job_1234-abcd',
      jobType: 'campaign-generation',
      status: 'in_progress',
      step: 'brief_analysis',
      projectId: null,
      brandId: null,
      provider: 'provider-alpha_v2',
      model: 'mock-v1_beta',
      errorCode: 'provider_timeout-v2',
      updatedAt: '2026-09-10T00:00:00Z',
    })
  }),
}

test('keeps literal record values exact while humanizing controlled enum labels', async () => {
  let view = render(
    <AdminRecords client={client} section="users" onNavigate={vi.fn()} />,
  )
  let table = await screen.findByRole('table', { name: 'Users records' })
  expect(within(table).getByText('first-last_ops@example.test')).toBeVisible()
  expect(within(table).getByText('admin')).toBeVisible()

  view.unmount()
  view = render(
    <AdminRecords client={client} section="assets" onNavigate={vi.fn()} />,
  )
  table = await screen.findByRole('table', { name: 'Assets records' })
  expect(within(table).getByText('launch-file_v2.png')).toBeVisible()
  expect(within(table).getByText('image/vnd.example_asset+json')).toBeVisible()
  expect(within(table).getByText('final image')).toBeVisible()
  expect(within(table).getByText('brand source')).toBeVisible()

  view.unmount()
  render(
    <AdminRecords client={client} section="jobs" onNavigate={vi.fn()} />,
  )
  table = await screen.findByRole('table', { name: 'System work records' })
  expect(within(table).getByText('job_1234-abcd')).toBeVisible()
  expect(within(table).getByText('provider-alpha_v2')).toBeVisible()
  expect(within(table).getByText('mock-v1_beta')).toBeVisible()
  expect(within(table).getByText('provider_timeout-v2')).toBeVisible()
  expect(within(table).getByText('campaign generation')).toBeVisible()
  expect(within(table).getByText('in progress')).toBeVisible()
  expect(within(table).getByText('brief analysis')).toBeVisible()
})
