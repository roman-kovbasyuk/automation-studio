import { changeControl } from '../../test/selectOption.js'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { AdminApp } from './AdminApp.jsx'
import { ConnectedStudio } from '../StudioApp.jsx'
import { createAdminApi } from './adminApi.js'
import { createStudioApi } from '../api.js'
import { routeFromLocation } from '../workflow.js'

const node = (id, capability) => ({
  id,
  capability,
  version: 1,
  label: id,
  instructions: '',
  config: {},
  bindings: {},
  outputs: [],
  questions: [],
  position: { x: 0, y: 0 },
})
const draft = () => ({
  schemaVersion: 1,
  entry: 'input',
  nodes: [
    node('input', 'input'),
    node('ai', 'ai'),
    node('questions', 'clarification'),
    node('output', 'output'),
  ],
  edges: [{ id: 'first', source: 'input', target: 'ai' }],
})
function fixtureApi() {
  let record = {
    id: 'recipe-1',
    key: 'banners',
    title: 'Banner creation',
    assetType: 'banners',
    draft: draft(),
    draftRevision: 0,
    draftHash: 'a'.repeat(64),
    versions: [],
    activeVersionId: null,
    updatedAt: '2026-09-10T00:00:00Z',
  }
  const requests = []
  const api = {
    request: vi.fn(async (method, path, options = {}) => {
      requests.push({ method, path, ...options })
      if (path.endsWith('asset-workflow-capabilities'))
        return {
          items: [
            'input',
            'ai',
            'clarification',
            'condition',
            'render',
            'context',
            'output',
          ].map((key) => ({
            key,
            version: 1,
            title: key,
            requiredBindings: [],
          })),
        }
      if (path.endsWith('/asset-workflows'))
        return { items: [structuredClone(record)] }
      if (path.endsWith('/draft')) {
        record = {
          ...record,
          draft: options.body.draft,
          draftRevision: record.draftRevision + 1,
          draftHash: 'b'.repeat(64),
        }
        return structuredClone(record)
      }
      if (path.endsWith('/validate')) return { valid: true, issues: [] }
      if (path.endsWith('/simulations'))
        return {
          simulated: true,
          draftHash: record.draftHash,
          trace: [{ nodeId: 'ai', status: 'completed', simulated: true }],
          pendingQuestions: [],
        }
      if (path.endsWith('/publish')) {
        record = {
          ...record,
          versions: [
            {
              id: 'v1',
              version: 1,
              hash: record.draftHash,
              changeNote: options.body.changeNote,
              createdAt: record.updatedAt,
            },
          ],
        }
        return structuredClone(record)
      }
      if (path.endsWith('/activate')) {
        record = { ...record, activeVersionId: options.body.versionId }
        return structuredClone(record)
      }
      if (path.endsWith('/reference'))
        return {
          id: record.id,
          versionId: 'v1',
          version: 1,
          hash: 'b'.repeat(64),
          definition: draft(),
        }
      return structuredClone(record)
    }),
  }
  return { api, requests }
}
const admin = { id: 'admin', role: 'admin', displayName: 'Admin User', email: 'admin@example.test' }
const openEditor = (api, props = {}) =>
  render(
    <AdminApp
      api={api}
      actor={admin}
      route={{ view: 'admin', section: 'recipes', id: 'recipe-1' }}
      onNavigate={vi.fn()}
      {...props}
    />,
  )
const choose = async (id) =>
  changeControl(await screen.findByLabelText('Selected node'), {
    target: { value: id },
  })

describe('admin route and access boundary', () => {
  test('resolves direct nested routes before generic templates and preserves legacy workflow entry', () => {
    expect(routeFromLocation('/mvp/admin')).toEqual({
      view: 'admin',
      section: 'overview',
    })
    expect(routeFromLocation('/mvp/admin/recipes/recipe-1')).toEqual({
      view: 'admin',
      section: 'recipes',
      id: 'recipe-1',
    })
    expect(routeFromLocation('/mvp/admin/projects/project-1')).toEqual({
      view: 'admin',
      section: 'projects',
      id: 'project-1',
    })
    expect(routeFromLocation('/mvp/admin/workflows')).toEqual({
      view: 'admin',
      section: 'workflows',
    })
  })
  test('denies direct access without requesting admin records', () => {
    const { api } = fixtureApi()
    render(
      <AdminApp
        api={api}
        actor={{ role: 'marketer' }}
        route={{ section: 'recipes' }}
        onNavigate={vi.fn()}
      />,
    )
    expect(
      screen.getByRole('heading', { name: 'Access denied' }),
    ).toBeInTheDocument()
    expect(api.request).not.toHaveBeenCalled()
  })
  test('loads admin session when unrelated studio lists fail and renders a separate menu', async () => {
    window.history.replaceState({}, '', '/mvp/admin/recipes')
    const { api } = fixtureApi()
    Object.assign(api, {
      getSession: async () => admin,
      listCampaigns: async () => {
        throw Error('campaign failure')
      },
      listTemplates: async () => {
        throw Error('template failure')
      },
    })
    render(<ConnectedStudio api={api} />)
    expect(await screen.findByText('Banner creation')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Back to Studio' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Create campaign' }),
    ).not.toBeInTheDocument()
  })
})

test('record filters reset pagination and empty/errors have recovery', async () => {
  const request = vi.fn(async (method, path) => ({
    items: [],
    page:
      new URL(path, 'http://local').searchParams.get('page') === '2' ? 2 : 1,
    pageSize: 25,
    total: 51,
  }))
  render(
    <AdminApp
      api={{ request }}
      actor={admin}
      route={{ section: 'users' }}
      onNavigate={vi.fn()}
    />,
  )
  await screen.findByText(/No users/)
  fireEvent.click(screen.getByRole('button', { name: /Next page/i }))
  await waitFor(() => expect(request.mock.calls.at(-1)[1]).toContain('page=2'))
  changeControl(screen.getByLabelText('Role'), {
    target: { value: 'designer' },
  })
  await waitFor(() =>
    expect(request.mock.calls.at(-1)[1]).toContain('role=designer'),
  )
  expect(request.mock.calls.at(-1)[1]).toContain('page=1')
})

test('save conflicts retain draft and captured revision, then saved-hash simulation and explicit publication activation work', async () => {
  const { api, requests } = fixtureApi()
  openEditor(api)
  await choose('ai')
  changeControl(screen.getByLabelText('Label'), {
    target: { value: 'Custom planner' },
  })
  const real = api.request.getMockImplementation()
  api.request.mockImplementationOnce(async () => {
    throw Object.assign(Error('Changed elsewhere'), { status: 409 })
  })
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  await screen.findByText(/Changed elsewhere/)
  expect(screen.getByLabelText('Label')).toHaveValue('Custom planner')
  api.request.mockImplementation(real)
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  await screen.findByText(/Saved · revision 1/)
  expect(
    requests.find((r) => r.path.endsWith('/draft')).body.expectedRevision,
  ).toBe(0)
  fireEvent.click(screen.getByRole('button', { name: 'Validate' }))
  await screen.findByText(/Draft is valid/)
  fireEvent.click(screen.getByRole('button', { name: 'Simulation' }))
  fireEvent.click(screen.getByRole('button', { name: 'Simulate' }))
  await screen.findByText(/Simulation trace/)
  expect(
    requests.find((r) => r.path.endsWith('/simulations')).body,
  ).toMatchObject({ expectedRevision: 1, draftHash: 'b'.repeat(64) })
  fireEvent.click(screen.getByRole('button', { name: 'Close simulation' }))
  fireEvent.click(screen.getByRole('button', { name: 'History' }))
  changeControl(screen.getByLabelText('Change note'), {
    target: { value: 'First approved recipe' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Publish version' }))
  await screen.findByText('First approved recipe')
  expect(requests.some((r) => r.path.endsWith('/activate'))).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: 'Activate version 1' }))
  await screen.findByText(/Active version: 1/)
  fireEvent.click(screen.getByRole('button', { name: 'View reference 1' }))
  await screen.findByText(/Immutable reference/)
  fireEvent.click(screen.getByRole('button', { name: 'Restore as draft' }))
  expect(await screen.findByText(/Unsaved changes/)).toBeInTheDocument()
})

test('inspector edits questions with recipe-wide IDs, adds condition edges and clears deleted selection', async () => {
  const { api } = fixtureApi()
  openEditor(api)
  await choose('questions')
  fireEvent.click(screen.getByRole('button', { name: 'Add question' }))
  changeControl(screen.getByLabelText('Question 1 label'), {
    target: { value: 'How many slides?' },
  })
  changeControl(screen.getByLabelText('Question 1 type'), {
    target: { value: 'number' },
  })
  changeControl(screen.getByLabelText('Question 1 minimum'), {
    target: { value: '1' },
  })
  changeControl(screen.getByLabelText('Node capability'), {
    target: { value: 'condition' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Add node' }))
  expect(screen.getByLabelText('Condition path')).toBeInTheDocument()
  changeControl(screen.getByLabelText('Connect to'), {
    target: { value: 'output' },
  })
  changeControl(screen.getByLabelText('Branch'), {
    target: { value: 'true' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Connect nodes' }))
  expect(
    screen.getByRole('button', { name: /Remove connection.*True/ }),
  ).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Delete node' }))
  expect(screen.queryByLabelText('Condition path')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  await screen.findByText(/Saved · revision 1/)
  const saved = api.request.mock.calls.find(([, path]) =>
    path.endsWith('/draft'),
  )[2].body.draft
  expect(
    saved.nodes.find((n) => n.id === 'questions').questions[0],
  ).toMatchObject({ label: 'How many slides?', type: 'number', min: 1 })
  expect(saved.edges).toEqual([{ id: 'first', source: 'input', target: 'ai' }])
})

test('focused client retains auth transport and encodes identifiers/filter values', async () => {
  const fetchImpl = vi.fn(
    async () => new Response(JSON.stringify({ items: [] }), { status: 200 }),
  )
  const api = createAdminApi(
    createStudioApi({ getToken: async () => 'synthetic-token', fetchImpl }),
  )
  await api.records('users', { search: 'Name & email', page: 1, role: '' })
  expect(fetchImpl.mock.calls[0][0]).toBe(
    '/api/v1/admin/users?search=Name+%26+email&page=1',
  )
  expect(fetchImpl.mock.calls[0][1].headers.get('Authorization')).toBe(
    'Bearer synthetic-token',
  )
  await api.recipe('a/b')
  expect(fetchImpl.mock.calls[1][0]).toBe('/api/v1/admin/asset-workflows/a%2Fb')
})

test('keeps comparison null as null and selects issues returned by a rejected simulation', async () => {
  const { api } = fixtureApi()
  openEditor(api)
  await choose('ai')
  changeControl(screen.getByLabelText('Node capability'), {
    target: { value: 'condition' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Add node' }))
  changeControl(screen.getByLabelText('Condition operator'), {
    target: { value: 'equals' },
  })
  changeControl(screen.getByLabelText('Comparison value type'), {
    target: { value: 'null' },
  })
  expect(screen.getByLabelText('Comparison value type')).toHaveTextContent('null')
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  await screen.findByText(/Saved · revision 1/)
  api.request.mockRejectedValueOnce(
    Object.assign(Error('Invalid definition'), {
      status: 422,
      details: [
        {
          nodeId: 'ai',
          code: 'binding_required',
          message: 'AI context binding missing',
        },
      ],
    }),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Simulation' }))
  fireEvent.click(screen.getByRole('button', { name: 'Simulate' }))
  fireEvent.click(
    await screen.findByRole('button', { name: 'AI context binding missing' }),
  )
  expect(screen.getByLabelText('Selected node').parentElement.querySelector('select')).toHaveValue('ai')
})

test('protects unsaved admin draft on app navigation, browser history, and beforeunload', async () => {
  window.history.replaceState({}, '', '/mvp/admin/recipes/recipe-1')
  const { api } = fixtureApi()
  Object.assign(api, {
    getSession: async () => admin,
    listCampaigns: async () => ({ campaigns: [] }),
    listTemplates: async () => ({ templates: [] }),
  })
  render(<ConnectedStudio api={api} />)
  await choose('ai')
  changeControl(screen.getByLabelText('Label'), {
    target: { value: 'Keep this draft' },
  })
  fireEvent.click(screen.getByRole('link', { name: 'Back to Studio' }))
  expect(
    screen.getByRole('dialog', { name: 'Discard unsaved recipe changes?' }),
  ).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
  expect(screen.getByLabelText('Label')).toHaveValue('Keep this draft')
  window.history.pushState({}, '', '/mvp/admin/users')
  fireEvent.popState(window)
  expect(window.location.pathname).toBe('/mvp/admin/recipes/recipe-1')
  fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
  expect(screen.getByLabelText('Label')).toHaveValue('Keep this draft')
  const unload = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(unload)
  expect(unload.defaultPrevented).toBe(true)
  const shortcut = new KeyboardEvent('keydown', {
    key: 'k',
    ctrlKey: true,
    cancelable: true,
    bubbles: true,
  })
  screen.getByLabelText('Label').dispatchEvent(shortcut)
  expect(shortcut.defaultPrevented).toBe(false)
})

test('linked record filters are restored without forwarding demoRole, and errors retry', async () => {
  const request = vi
    .fn()
    .mockRejectedValueOnce(Error('Temporary record outage'))
    .mockResolvedValue({ items: [], page: 1, pageSize: 25, total: 0 })
  render(
    <AdminApp
      api={{ request }}
      actor={admin}
      route={{
        section: 'jobs',
        search: '?status=failed&projectId=project-1&demoRole=admin',
      }}
      onNavigate={vi.fn()}
    />,
  )
  await screen.findByText('Temporary record outage')
  expect(screen.getByLabelText('Status')).toHaveTextContent('failed')
  expect(request.mock.calls[0][1]).toContain('projectId=project-1')
  expect(request.mock.calls[0][1]).not.toContain('demoRole')
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  await screen.findByText(/No system work/)
})

test('publication retries reuse the key and activation never adopts a concurrent draft revision', async () => {
  const { api, requests } = fixtureApi()
  openEditor(api)
  await choose('ai')
  fireEvent.click(screen.getByRole('button', { name: 'Validate' }))
  await screen.findByText(/Draft is valid/)
  fireEvent.click(screen.getByRole('button', { name: 'History' }))
  changeControl(screen.getByLabelText('Change note'), {
    target: { value: 'Stable retry' },
  })
  const real = api.request.getMockImplementation(),
    failed = []
  api.request.mockImplementationOnce(async (method, path, options) => {
    failed.push(options.body)
    throw Error('Lost response')
  })
  fireEvent.click(screen.getByRole('button', { name: 'Publish version' }))
  await screen.findByText(/Lost response/)
  api.request.mockImplementation(real)
  fireEvent.click(screen.getByRole('button', { name: 'Publish version' }))
  await screen.findByText('Stable retry')
  expect(
    requests.find((r) => r.path.endsWith('/publish')).body.idempotencyKey,
  ).toBe(failed[0].idempotencyKey)
  fireEvent.click(screen.getByRole('button', { name: 'Close history' }))
  changeControl(screen.getByLabelText('Label'), {
    target: { value: 'Retain while activating' },
  })
  api.request.mockImplementationOnce(async () => ({
    draftRevision: 99,
    draft: draft(),
    draftHash: 'c'.repeat(64),
    activeVersionId: 'v1',
    versions: [
      {
        id: 'v1',
        version: 1,
        changeNote: 'Stable retry',
        hash: 'a'.repeat(64),
        createdAt: '2026-09-10T00:00:00Z',
      },
    ],
  }))
  fireEvent.click(screen.getByRole('button', { name: 'History' }))
  fireEvent.click(screen.getByRole('button', { name: 'Activate version 1' }))
  await screen.findByText(/Active version: 1/)
  fireEvent.click(screen.getByRole('button', { name: 'Close history' }))
  expect(screen.getByLabelText('Label')).toHaveValue('Retain while activating')
  api.request.mockImplementation(real)
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  await screen.findByText(/Saved · revision 1/)
  expect(
    requests.find((r) => r.path.endsWith('/draft')).body.expectedRevision,
  ).toBe(0)
})

test('empty recipes stay empty and create uses the actual persisted response', async () => {
  const requests = []
  const navigate = vi.fn()
  const request = vi.fn(async (method, path, options) => {
    requests.push({ method, path, ...options })
    return method === 'POST' ? { id: 'new-real-id' } : { items: [] }
  })
  render(
    <AdminApp
      api={{ request }}
      actor={admin}
      route={{ section: 'recipes' }}
      onNavigate={navigate}
    />,
  )
  await screen.findByText(/No recipes have been created/)
  expect(screen.queryByText('Banner creation')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Create recipe' }))
  changeControl(screen.getByLabelText('Recipe title'), {
    target: { value: 'New banner recipe' },
  })
  changeControl(screen.getByLabelText('Recipe key'), {
    target: { value: 'new-banner' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Create and open' }))
  await waitFor(() =>
    expect(navigate).toHaveBeenCalledWith('/mvp/admin/recipes/new-real-id'),
  )
  expect(requests.find((r) => r.method === 'POST').body).toMatchObject({
    title: 'New banner recipe',
    key: 'new-banner',
    assetType: 'banners',
    draft: { entry: 'input' },
  })
})

test('secondary editor panels open on demand and narrow node settings use a dismissible drawer', async () => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 390,
  })
  const { api } = fixtureApi()
  openEditor(api)
  await screen.findByRole('heading', { name: 'Banner creation' })
  expect(screen.queryByLabelText('Fixture input')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Simulation' }))
  expect(
    await screen.findByRole('dialog', { name: 'Fixture simulation' }),
  ).toBeVisible()
  expect(screen.getByLabelText('Fixture input')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Close simulation' }))
  await choose('ai')
  expect(
    await screen.findByRole('dialog', { name: 'Node settings' }),
  ).toBeVisible()
  changeControl(screen.getByLabelText('Label'), {
    target: { value: 'Narrow planner' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Close node settings' }))
  await waitFor(() =>
    expect(
      screen.queryByRole('dialog', { name: 'Node settings' }),
    ).not.toBeInTheDocument(),
  )
  await waitFor(() =>
    expect(screen.getByLabelText('Selected node')).toHaveFocus(),
  )
  expect(screen.getByText('Unsaved changes')).toBeVisible()
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 1024,
  })
})

test('admin menu uses the shared drawer and returns focus on Escape', async () => {
  const { api } = fixtureApi()
  render(
    <AdminApp
      api={api}
      actor={admin}
      route={{ section: 'recipes' }}
      onNavigate={vi.fn()}
    />,
  )
  await screen.findByText('Banner creation')
  const menu = screen.getByRole('button', { name: 'Admin menu' })
  fireEvent.click(menu)
  expect(
    await screen.findByRole('dialog', { name: 'Admin navigation' }),
  ).toBeVisible()
  fireEvent.keyDown(document.activeElement, { key: 'Escape', code: 'Escape' })
  await waitFor(() =>
    expect(
      screen.queryByRole('dialog', { name: 'Admin navigation' }),
    ).not.toBeInTheDocument(),
  )
  await waitFor(() => expect(menu).toHaveFocus())
})

test('admin readiness ignores unresolved legacy lists and Back to Studio loads its records', async () => {
  history.replaceState({}, '', '/mvp/admin/recipes')
  const { api } = fixtureApi()
  Object.assign(api, {
    getSession: vi.fn(async () => admin),
    listCampaigns: vi.fn(() => new Promise(() => {})),
    listTemplates: vi.fn(() => new Promise(() => {})),
  })
  render(<ConnectedStudio api={api} />)
  expect(await screen.findByText('Banner creation')).toBeVisible()
  expect(api.listCampaigns).not.toHaveBeenCalled()
  expect(api.listTemplates).not.toHaveBeenCalled()
  api.listCampaigns.mockResolvedValue({
    campaigns: [
      {
        id: 'saved-project',
        title: 'Saved Studio campaign',
        status: 'draft',
        projectType: 'banners',
        updatedAt: '2026-09-10T00:00:00Z',
      },
    ],
  })
  api.listTemplates.mockResolvedValue({ templates: [] })
  fireEvent.click(screen.getByRole('link', { name: 'Back to Studio' }))
  expect(
    await screen.findByRole('link', { name: 'Saved Studio campaign' }),
  ).toBeVisible()
  expect(api.listCampaigns).toHaveBeenCalledOnce()
  expect(api.listTemplates).toHaveBeenCalledOnce()
})

test('binding rename collisions preserve both paths before a valid rename and save', async () => {
  const { api, requests } = fixtureApi()
  openEditor(api)
  await choose('ai')
  fireEvent.click(screen.getByRole('button', { name: 'Add binding' }))
  fireEvent.click(screen.getByRole('button', { name: 'Add binding' }))
  changeControl(screen.getByLabelText('Binding 2 path'), {
    target: { value: 'answers.a' },
  })
  changeControl(screen.getByLabelText('Binding 2 name'), {
    target: { value: 'context' },
  })
  expect(screen.getByRole('alert')).toHaveTextContent(/already exists/)
  expect(screen.getByLabelText('Binding 1 name')).toHaveValue('context')
  expect(screen.getByLabelText('Binding 1 path')).toHaveValue('input')
  expect(screen.getByLabelText('Binding 2 name')).toHaveValue('field1')
  expect(screen.getByLabelText('Binding 2 path')).toHaveValue('answers.a')
  changeControl(screen.getByLabelText('Binding 2 name'), {
    target: { value: 'answers' },
  })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  await screen.findByText(/Saved · revision 1/)
  expect(
    requests
      .find((r) => r.path.endsWith('/draft'))
      .body.draft.nodes.find((n) => n.id === 'ai').bindings,
  ).toEqual({ context: 'input', answers: 'answers.a' })
})

test('cancelling dirty narrow-menu navigation returns focus to the visible menu button', async () => {
  const previousWidth = window.innerWidth
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 390,
  })
  try {
    history.replaceState({}, '', '/mvp/admin/recipes/recipe-1')
    const { api } = fixtureApi()
    Object.assign(api, {
      getSession: async () => admin,
      listCampaigns: async () => ({ campaigns: [] }),
      listTemplates: async () => ({ templates: [] }),
    })
    render(<ConnectedStudio api={api} />)
    await choose('ai')
    changeControl(screen.getByLabelText('Label'), {
      target: { value: 'Keep narrow edits' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Close node settings' }))
    const menu = screen.getByRole('button', { name: 'Admin menu' })
    for (const cancel of ['button', 'escape']) {
      fireEvent.click(menu)
      const drawer = await screen.findByRole('dialog', {
        name: 'Admin navigation',
      })
      const destination = within(drawer).getByRole('link', { name: 'Users' })
      destination.focus()
      fireEvent.click(destination)
      expect(
        await screen.findByRole('dialog', {
          name: 'Discard unsaved recipe changes?',
        }),
      ).toBeVisible()
      // Let the menu drawer finish returning focus while the user reads the discard prompt.
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      )
      if (cancel === 'button')
        fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
      else
        fireEvent.keyDown(document.activeElement, {
          key: 'Escape',
          code: 'Escape',
        })
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
      )
      await waitFor(() => expect(menu).toHaveFocus())
      expect(menu).toBeVisible()
      expect(location.pathname).toBe('/mvp/admin/recipes/recipe-1')
      expect(screen.getByText('Unsaved changes')).toBeVisible()
    }
  } finally {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: previousWidth,
    })
  }
})
