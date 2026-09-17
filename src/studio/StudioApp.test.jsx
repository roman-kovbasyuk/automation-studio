import { beforeEach, describe, expect, test, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConnectedStudio } from './StudioApp.jsx'
import { createEmptyBrandDraft } from '../../shared/brandDesignSystem.js'
import { makeScenario } from './campaign/testing/workspaceFixtures.js'

vi.mock('./auth.js', () => ({ useStudioAuth: vi.fn() }))
vi.mock('./AnimatedBanner.jsx', async importOriginal => ({ ...await importOriginal(), AnimatedBanner: () => <div aria-label="Banner preview" /> }))

const brief = { product: 'Studio', audience: 'Designers', objective: 'Trial', offer: '', locale: 'en', notes: '' }
function fixture({ role = 'marketer', status = 'draft' } = {}) {
  const scenario = makeScenario(status.replaceAll('_', '-'))
  const workspace = scenario.workspace
  const campaign = workspace.campaign
  Object.assign(campaign, { title: 'Autumn launch', brief, revision: 8 })
  const version = workspace.versions[0]
  if (version) {
    version.id = 'version-2'; version.versionNumber = 2
    campaign.currentVersionNumber = 2
    if (campaign.openVersionId) campaign.openVersionId = version.id
    scenario.reviewHistory.events.forEach(event => { event.versionId = version.id })
    workspace.versions.push({ ...version, id: 'version-1', versionNumber: 1 })
  }
  const api = {
    getSession: vi.fn(async () => ({ id: `${role}-1`, role, displayName: 'Roman', email: 'roman@example.com' })),
    getPersonalSettings: vi.fn(async () => ({
      profile: { firstName: 'Roman', lastName: 'Kovbasyuk', email: 'roman@example.com', emailVerified: true },
      signIn: { googleEmail: 'roman@example.com', passwordConfigured: false },
      ai: { connections: [{ provider: 'openai', status: 'connected', maskedSuffix: '…4k9m' }, { provider: 'openrouter', status: 'not_connected' }], defaults: { text: { provider: 'openai', model: 'gpt-4.1' }, image: { provider: 'google', model: 'gemini-2.5-flash-image' }, video: { provider: 'openai', model: 'sora-2' } } },
      integrations: [{ platform: 'slack', status: 'not_connected' }, { platform: 'discord', status: 'not_connected' }],
    })),
    updatePersonalProfile: vi.fn(async input => input),
    listCampaigns: vi.fn(async () => ({ campaigns: [campaign] })),
    listTemplates: vi.fn(async () => ({ templates: scenario.templates })),
    listBrandSystems: vi.fn(async () => ({ brands: [{ id: 'brand-1', workspaceId: 'default', ownerId: `${role}-1`, state: 'published', revision: 1, activeVersionId: 'brand-version-1',
      activeVersion: { id: 'brand-version-1', brandId: 'brand-1', versionNumber: 1, snapshot: createEmptyBrandDraft('Northstar') }, draft: { ...createEmptyBrandDraft('Northstar'), context: 'Outdoor identity', currentStep: 'publish' },
      createdAt: '2026-09-07T09:00:00.000Z', updatedAt: '2026-09-07T09:00:00.000Z' }] })),
    getWorkspace: vi.fn(async () => workspace),
    getReview: vi.fn(async () => scenario.reviewHistory),
    getAssetBlob: vi.fn(async () => new Blob([], { type: 'image/png' })),
    createCampaign: vi.fn(async () => campaign), patchCampaign: vi.fn(async () => campaign),
    duplicateCampaign: vi.fn(async () => ({ ...campaign, id: 'campaign-2', title: 'Autumn launch copy', status: 'draft', revision: 0 })),
    deleteCampaign: vi.fn(async () => null),
    generate: vi.fn(async (id, step) => {
      if (step === 'brief') workspace.jobs = makeScenario('copy-ready').workspace.jobs
      return { job: { id: 'job-1', status: 'succeeded' } }
    }),
    reopen: vi.fn(async () => ({ campaign })),
    review: vi.fn(async () => ({ campaign, version })), request: vi.fn(async () => ({ campaign })),
  }
  return { api, workspace, campaign, version }
}
beforeEach(() => {
  history.replaceState({}, '', '/')
  Element.prototype.scrollIntoView = vi.fn()
})

describe('connected studio workflow', () => {
  test('passes the banner category from the current brief creation flow', async () => {
    const { api } = fixture()
    api.createCampaign.mockRejectedValue(Object.assign(new Error('Test stops before generation'), { status: 422 }))
    render(<ConnectedStudio api={api} />)
    await screen.findByRole('heading', { name: 'What would you like to create?' })
    fireEvent.change(screen.getByLabelText('Prompt'), { target: { value: 'A new banner campaign.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send prompt' }))
    await waitFor(() => expect(api.createCampaign).toHaveBeenCalledWith(expect.objectContaining({ projectType: 'banners' })))
  })

  test('shows the saved project title through the public sidebar project list', async () => {
    const { api, campaign } = fixture()
    campaign.projectType = 'presentations'
    render(<ConnectedStudio api={api} />)
    const link = await screen.findByRole('link', { name: 'Autumn launch', exact: true })
    expect(link).toHaveAttribute('href', '/mvp/campaign/campaign-1')
    expect(link).toHaveTextContent('Autumn launch')
  })

  test('refreshes available templates when returning from design systems', async () => {
    const { api } = fixture()
    render(<ConnectedStudio api={api} />)
    await screen.findByRole('heading', { name: 'What would you like to create?' })
    fireEvent.click(screen.getByRole('link', { name: 'Design system', exact: true }))
    await screen.findByRole('heading', { name: 'Brand design systems' })
    const { templates } = await api.listTemplates.mock.results[0].value
    api.listTemplates.mockResolvedValue({ templates: templates.map(template => ({ ...template, name: `Updated ${template.name}` })) })
    fireEvent.click(screen.getByRole('link', { name: 'Templates', exact: true }))
    await screen.findByText(`Updated ${templates[0].name}`)
    expect(api.listTemplates).toHaveBeenCalledTimes(2)
  })
  test('uses the public drawer and returns keyboard focus after closing mobile navigation', async () => {
    const { api } = fixture()
    render(<ConnectedStudio api={api} />)
    await screen.findByRole('heading', { name: 'What would you like to create?' })
    const trigger = screen.getByRole('button', { name: 'Open navigation' })
    await userEvent.click(trigger)
    const drawer = screen.getByRole('dialog', { name: 'Navigation' })
    expect(drawer).toHaveAttribute('open')
    expect(within(drawer).getByRole('navigation', { name: 'Workspace navigation' })).toBeVisible()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Navigation' })).toBeNull())
    await waitFor(() => expect(trigger).toHaveFocus())
  })
  test('opens personal settings from the user menu', async () => {
    const { api } = fixture()
    render(<ConnectedStudio api={api} />)
    await screen.findByRole('heading', { name: 'What would you like to create?' })
    await userEvent.click(screen.getByRole('button', { name: /roman/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Settings' }))
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeVisible()
    expect(api.getPersonalSettings).toHaveBeenCalledOnce()
    expect(location.pathname).toBe('/mvp/settings')
  })
  test('keeps module drafts through browser history and guards leaving the campaign', async () => {
    history.replaceState({}, '', '/mvp/campaign/campaign-1?module=brief')
    const { api, workspace } = fixture()
    workspace.copies = makeScenario('copy-ready').workspace.copies
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<ConnectedStudio api={api} />)
    const input = await screen.findByLabelText('Campaign description')
    fireEvent.change(input, { target: { value: 'Do not discard this draft' } })
    history.pushState({}, '', '/mvp/campaign/campaign-1?module=copy')
    fireEvent.popState(window)
    expect(screen.getByLabelText('Campaign description')).toBe(input)
    expect(confirm).not.toHaveBeenCalled()
    history.pushState({}, '', '/mvp/new')
    fireEvent.popState(window)
    expect(confirm).toHaveBeenCalledOnce()
    expect(location.pathname).toBe('/mvp/campaign/campaign-1')
    expect(input).toHaveValue('Do not discard this draft')
    confirm.mockRestore()
  })
  test('moves a project between pinned and recent groups from its action menu', async () => {
    localStorage.removeItem('studio:pins:marketer-1')
    const { api } = fixture()
    render(<ConnectedStudio api={api} />)
    expect(screen.queryByRole('button', { name: 'Pin Autumn launch', exact: true })).toBeNull()
    const actionMenu = await screen.findByRole('button', { name: 'Actions for Autumn launch' })
    expect(actionMenu).toHaveAttribute('data-icon-only', 'true')
    await userEvent.click(actionMenu)
    await userEvent.click(screen.getByRole('menuitem', { name: 'Pin', exact: true }))
    const projects = screen.getByRole('region', { name: 'Projects' })
    expect(within(projects).getByText('Pinned')).toBeVisible()
    expect(within(projects).getByRole('link', { name: 'Autumn launch' })).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Autumn launch' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Unpin', exact: true }))
    expect(within(projects).getByText('Recent projects')).toBeVisible()
    expect(within(projects).getByRole('link', { name: 'Autumn launch' })).toBeVisible()
    localStorage.removeItem('studio:pins:marketer-1')
  })
  test('opens banner brand styles from the design system menu', async () => {
    const { api } = fixture()
    render(<ConnectedStudio api={api} />)
    await screen.findByRole('heading', { name: 'What would you like to create?' })
    fireEvent.click(screen.getByRole('link', { name: 'Design system', exact: true }))
    expect(await screen.findByRole('heading', { name: 'Brand design systems' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Northstar' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Foundations' })).not.toBeInTheDocument()
    expect(location.pathname).toBe('/mvp/system')
  })
  test('keeps campaign status beside the name in the top bar', async () => {
    history.replaceState({}, '', '/mvp/campaign/campaign-1')
    const { api } = fixture({ status: 'in_review' })
    render(<ConnectedStudio api={api} />)
    const header = document.querySelector('.bs-topbar')
    expect(header).not.toBeNull()
    await within(header).findByText('Autumn launch')
    expect(within(header).getByText('In design review')).toBeVisible()
  })
  test('renames an editable campaign title inline without rendering a form field', async () => {
    history.replaceState({}, '', '/mvp/campaign/campaign-1')
    const { api } = fixture()
    api.patchCampaign.mockResolvedValue({ ...api.getWorkspace.mock.results?.[0]?.value?.campaign, title: 'Winter launch' })
    render(<ConnectedStudio api={api} />)
    const title = await screen.findByRole('heading', { name: 'Autumn launch' })
    fireEvent.click(title)
    expect(title).toHaveAttribute('contenteditable', 'true')
    fireEvent.input(title, { target: { textContent: 'Winter launch' } })
    fireEvent.blur(title)
    await waitFor(() => expect(api.patchCampaign).toHaveBeenCalledWith('campaign-1', { title: 'Winter launch' }, 8))
    expect(screen.queryByRole('textbox', { name: /campaign title/i })).not.toBeInTheDocument()
  })
  test('keeps cards mounted while saving a selection', async () => {
    history.replaceState({}, '', '/mvp/campaign/campaign-1?step=1')
    const { api, workspace } = fixture({ status: 'copy_ready' })
    workspace.jobs.push({ ...workspace.jobs[0], id: 'existing-prompts', step: 'directions', result: { directions: [] } })
    let finishReload
    api.getWorkspace.mockImplementationOnce(async () => structuredClone(workspace)).mockImplementationOnce(() => new Promise(resolve => { finishReload = () => resolve(structuredClone(workspace)) }))
    workspace.copies = [{ id: 's1', stale: false, selectedCandidateId: null, candidates: [{ id: 'c1', headline: 'Listen your way', body: 'A quieter commute.', cta: 'Shop now', offer: '' }] }]
    api.selectCopy = vi.fn(async () => { workspace.campaign.revision += 1; workspace.campaign.selectedCopyId = 's1'; workspace.copies[0].selectedCandidateId = 'c1'; workspace.copies[0].approvedCandidateIds = ['c1']; return workspace.campaign })
    render(<ConnectedStudio api={api} />)
    const cardHeading = await screen.findByRole('heading', { name: 'Listen your way' })
    fireEvent.click(screen.getByRole('button', { name: 'Select option 1' }))
    await waitFor(() => expect(finishReload).toBeTypeOf('function'))
    expect(screen.queryByRole('status', { name: 'Loading workspace' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Listen your way' })).toBeVisible()
    await act(async () => finishReload())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Deselect option 1' })).toHaveAttribute('aria-pressed', 'true'))
    expect(screen.getByRole('heading', { name: 'Listen your way' })).toBe(cardHeading)
    expect(api.selectCopy).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: 'Select option 1' })).not.toBeInTheDocument()
  })
  test('does not save an inline title canceled with Escape', async () => {
    history.replaceState({}, '', '/mvp/campaign/campaign-1')
    const { api } = fixture()
    render(<ConnectedStudio api={api} />)
    const title = await screen.findByRole('heading', { name: 'Autumn launch' })
    fireEvent.click(title)
    fireEvent.input(title, { target: { textContent: 'Canceled title' } })
    fireEvent.keyDown(title, { key: 'Escape' })
    fireEvent.blur(title)
    expect(api.patchCampaign).not.toHaveBeenCalled()
    expect(title).toHaveTextContent('Autumn launch')
  })
  test('boots the authenticated session and presents the primary workspace menu', async () => {
    const { api } = fixture()
    render(<ConnectedStudio api={api} />)
    await screen.findByRole('heading', { name: 'What would you like to create?' })
    const menu = screen.getByRole('navigation', { name: 'Workspace navigation' })
    expect(within(menu).getAllByRole('link').map(link => link.textContent)).toEqual(['Home', 'Templates', 'Design system'])
    expect(within(screen.getByRole('main').parentElement).queryByRole('contentinfo')).not.toBeInTheDocument()
    expect(api.getSession).toHaveBeenCalledOnce()
    expect(api.listTemplates).toHaveBeenCalledOnce()
  })
  test('restores a campaign from its URL and prevents skipping unfinished steps', async () => {
    history.replaceState({}, '', '/mvp/campaign/campaign-1?step=7')
    const { api } = fixture()
    render(<ConnectedStudio api={api} />)
    await screen.findByLabelText('Campaign description')
    const workflow = screen.getByRole('navigation', { name: 'Campaign workflow' })
    const steps = within(workflow).getAllByRole('button')
    expect(steps.map(step => step.textContent.replace(/^\d+/, ''))).toEqual(['Brief', 'Copy', 'Visuals', 'Banners', 'Distribute'])
    expect(steps[0]).toHaveAttribute('aria-current', 'step')
    for (const step of steps.slice(1)) {
      expect(step).toBeDisabled()
      fireEvent.click(step)
    }
    expect(steps[0]).toHaveAttribute('aria-current', 'step')
    expect(screen.getByLabelText('Campaign description')).toBeVisible()
    expect(api.getWorkspace).toHaveBeenCalledWith('campaign-1')
  })
  test('opens a saved campaign through conversation-like sidebar history', async () => {
    history.replaceState({}, '', '/mvp/new')
    const { api } = fixture()
    render(<ConnectedStudio api={api} />)
    await screen.findByRole('heading', { name: 'What are you making?' })
    expect(within(screen.getByRole('main')).queryByRole('button', { name: /Autumn launch/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Autumn launch' }))
    await screen.findByLabelText('Campaign description')
    expect(location.pathname).toBe('/mvp/campaign/campaign-1')
    expect(screen.getByLabelText('Campaign description').value).toContain('Product: Studio')
  })
  test('opens the banner brief from the Banners creation card', async () => {
    history.replaceState({}, '', '/mvp/new')
    const { api } = fixture()
    const user = userEvent.setup()
    render(<ConnectedStudio api={api} />)
    const bannersCard = await screen.findByRole('listitem', { name: 'Campaign banners' })
    await user.click(within(bannersCard).getByRole('button', { name: 'Create with AI' }))
    await screen.findByRole('heading', { name: 'What would you like to create?' })
    expect(location.pathname).toBe('/')
  })
  test('provides campaign actions without chat icons and duplicates from the sidebar', async () => {
    history.replaceState({}, '', '/')
    const { api } = fixture()
    render(<ConnectedStudio api={api} />)
    await screen.findByRole('heading', { name: 'What would you like to create?' })
    expect(screen.queryByLabelText('Campaign icon')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Autumn launch' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Duplicate' }))
    await waitFor(() => expect(api.duplicateCampaign).toHaveBeenCalledWith('campaign-1'))
    expect(location.pathname).toBe('/mvp/campaign/campaign-2')
  })
  test('renders the design-system project region without application scrollbar state', async () => {
    const { api } = fixture()
    render(<ConnectedStudio api={api} />)
    await screen.findByRole('heading', { name: 'What would you like to create?' })
    const projects = screen.getByRole('region', { name: 'Projects' })
    expect(projects).toContainElement(screen.getByRole('link', { name: 'Autumn launch' }))
    expect(document.querySelector('.bs-project-groups')).toBeNull()
  })
  test('deletes a campaign only after confirmation and sends its current revision', async () => {
    const { api } = fixture()
    render(<ConnectedStudio api={api} />)
    await screen.findByRole('heading', { name: 'What would you like to create?' })
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Autumn launch' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))
    const dialog = screen.getByRole('dialog', { name: 'Remove Autumn launch?' })
    expect(dialog).toHaveTextContent('Its files and history will be retained.')
    expect(api.deleteCampaign).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove campaign' }))
    await waitFor(() => expect(api.deleteCampaign).toHaveBeenCalledWith('campaign-1', 8))
  })
  test('opens sidebar search from the wordmark and filters campaigns', async () => {
    const { api } = fixture()
    render(<ConnectedStudio api={api} />)
    await screen.findByRole('heading', { name: 'What would you like to create?' })
    expect(screen.getAllByText('Studio')[0]).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Search projects' }))
    expect(screen.getByRole('searchbox', { name: 'Search projects' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Submit search' })).not.toBeInTheDocument()
    const input = screen.getByRole('searchbox', { name: 'Search projects' })
    fireEvent.change(input, { target: { value: 'autumn' } })
    expect(screen.getByRole('link', { name: 'Autumn launch' })).toBeVisible()
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.queryByRole('searchbox', { name: 'Search projects' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Search projects' })).toHaveFocus()
  })
  test('designer can inspect campaign brief but cannot edit or create campaigns', async () => {
    history.replaceState({}, '', '/mvp/campaign/campaign-1?step=0')
    const { api } = fixture({ role: 'designer', status: 'in_review' })
    render(<ConnectedStudio api={api} />)
    await screen.findByLabelText('Analyzed brief')
    expect(screen.queryByRole('button', { name: 'Edit summary' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Refine brief')).toHaveAttribute('readonly')
    const create = screen.getByRole('button', { name: 'Create new' })
    fireEvent.click(create)
    expect(location.pathname).toBe('/mvp/campaign/campaign-1')
    expect(screen.queryByRole('button', { name: 'Save brief' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Select option 1' })).not.toBeInTheDocument()
  })
  test('retains a new campaign form when the server rejects creation', async () => {
    const { api } = fixture()
    api.createCampaign.mockRejectedValue(Object.assign(new Error('Campaign could not be saved'), { status: 422 }))
    render(<ConnectedStudio api={api} />)
    await screen.findByRole('heading', { name: 'What would you like to create?' })
    fireEvent.change(screen.getByLabelText('Prompt'), { target: { value: 'My new campaign for design teams. Start a trial.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send prompt' }))
    await screen.findAllByText('Campaign could not be saved')
    expect(screen.getByLabelText('Prompt')).toHaveValue('My new campaign for design teams. Start a trial.')
    expect(location.pathname).toBe('/')
    expect(screen.getByRole('button', { name: 'Send prompt' })).toBeEnabled()
  })
  test('does not render the generic uncertain-creation notice below a new brief', async () => {
    const { api } = fixture()
    api.createCampaign.mockRejectedValue(new Error('Connection lost'))
    render(<ConnectedStudio api={api} />)
    await screen.findByRole('heading', { name: 'What would you like to create?' })
    fireEvent.change(screen.getByLabelText('Prompt'), { target: { value: 'A brief that should stay in the composer.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send prompt' }))
    await waitFor(() => expect(api.createCampaign).toHaveBeenCalledOnce())
    expect(screen.queryByText('Creation may have completed. Check the campaign list before creating another campaign.')).not.toBeInTheDocument()
    expect(screen.queryByText('Up to 5 MB per file · 20,000 characters total · Ctrl / ⌘ + Enter to send')).not.toBeInTheDocument()
    expect(screen.queryByText('Connection lost')).not.toBeInTheDocument()
  })
  test('retains unsaved edits after a stale revision save error', async () => {
    history.replaceState({}, '', '/mvp/campaign/campaign-1?step=0')
    const { api } = fixture()
    api.patchCampaign.mockRejectedValue(Object.assign(new Error('Reload before saving'), { status: 409 }))
    render(<ConnectedStudio api={api} />)
    await screen.findByLabelText('Campaign description')
    fireEvent.change(screen.getByLabelText('Campaign description'), { target: { value: 'Edited campaign brief' } })
    fireEvent.click(screen.getByRole('button', { name: 'Analyze brief' }))
    await screen.findByText('Reload before saving')
    expect(api.patchCampaign).toHaveBeenCalledWith('campaign-1', { brief: { notes: 'Edited campaign brief' } }, 8)
    expect(screen.getByLabelText('Campaign description')).toHaveValue('Edited campaign brief')
    expect(screen.getByRole('button', { name: 'Analyze brief' })).toBeEnabled()
    expect(api.generate).not.toHaveBeenCalled()
  })
  test('approves the current persisted version, not the oldest version', async () => {
    history.replaceState({}, '', '/mvp/campaign/campaign-1?step=6')
    const { api } = fixture({ status: 'ready' })
    render(<ConnectedStudio api={api} />)
    const approve = await screen.findByRole('button', { name: 'Approve version 2' })
    await waitFor(() => expect(approve).toBeEnabled())
    fireEvent.click(approve)
    await waitFor(() => expect(api.review).toHaveBeenCalledWith('version-2', 'approve', {}, 8, expect.any(String)))
    await waitFor(() => expect(api.getWorkspace).toHaveBeenCalledTimes(2))
  })
  test('reopens a changes-requested campaign with revision and retry identity', async () => {
    history.replaceState({}, '', '/mvp/campaign/campaign-1')
    const { api } = fixture({ status: 'changes_requested' })
    render(<ConnectedStudio api={api} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Reopen to edit' }))
    await waitFor(() => expect(api.reopen).toHaveBeenCalledWith('campaign-1', 8, expect.any(String)))
    await waitFor(() => expect(api.getWorkspace).toHaveBeenCalledTimes(2))
  })
  test('unknown generation does not advance the campaign or automatically retry', async () => {
    history.replaceState({}, '', '/mvp/campaign/campaign-1?step=0')
    const { api } = fixture()
    api.generate.mockResolvedValue({ job: { id: 'job-unknown', status: 'unknown' } })
    render(<ConnectedStudio api={api} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Analyze brief' }))
    await screen.findAllByText(/Generation unknown/i)
    expect(api.generate).toHaveBeenCalledTimes(1)
    expect(api.generate.mock.calls[0][1]).toBe('brief')
    expect(location.search).toBe('?step=0')
  })
  test.each(['pending', 'unknown'])('blocks another generation attempt while a persisted job is %s', async status => {
    history.replaceState({}, '', '/mvp/campaign/campaign-1?step=0')
    const { api, workspace } = fixture()
    workspace.jobs = [{ id: 'unresolved-job', status, step: 'copy' }]
    render(<ConnectedStudio api={api} />)
    await screen.findByLabelText('Campaign description')
    const generate = screen.queryByRole('button', { name: 'Analyze brief' })
    if (generate) {
      expect(generate).toBeDisabled()
      fireEvent.click(generate)
    }
    expect(api.generate).not.toHaveBeenCalled()
  })
  test('reuses the command identity after a transport error instead of making a duplicate paid request', async () => {
    history.replaceState({}, '', '/mvp/campaign/campaign-1?step=0')
    const { api } = fixture()
    api.generate.mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce({ job: { id: 'job-unknown', status: 'unknown' } })
    render(<ConnectedStudio api={api} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Analyze brief' }))
    await screen.findByText('Connection lost')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Analyze brief' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Analyze brief' }))
    await screen.findAllByText(/Generation unknown/i)
    expect(api.generate).toHaveBeenCalledTimes(2)
    expect(api.generate.mock.calls[0][3]).toBe(api.generate.mock.calls[1][3])
    expect(api.generate.mock.calls[0][3]).toEqual(expect.any(String))
  })
  test('saves a freeform campaign, analyses it and waits for brief review before generating copy', async () => {
    const { api, workspace } = fixture()
    api.generate.mockImplementation(async (id, step) => {
      if (step === 'brief') workspace.jobs = makeScenario('copy-ready').workspace.jobs
      return { job: { id: `job-${step}`, status: 'succeeded' } }
    })
    render(<ConnectedStudio api={api} />)
    await screen.findByRole('heading', { name: 'What would you like to create?' })
    fireEvent.change(screen.getByLabelText('Prompt'), { target: { value: 'Autumn sound. Headphones for commuters.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send prompt' }))
    await screen.findByText('Promote headphones for a quieter commute.')
    expect(api.createCampaign).toHaveBeenCalledWith({ projectType: 'banners', title: 'Autumn sound', brief: { notes: 'Autumn sound. Headphones for commuters.' } })
    // Copy is drafted only after the brief answers are confirmed.
    expect(api.generate.mock.calls.map(call => call.slice(0, 2))).toEqual([['campaign-1', 'brief']])
    expect(location.search).toBe('?module=brief')
    fireEvent.click(screen.getByRole('link', { name: 'Templates', exact: true }))
    await screen.findByRole('heading', { name: 'Templates' })
    fireEvent.click(screen.getByRole('link', { name: 'Autumn launch' }))
    // Reopening the project must not start generation.
    await screen.findByRole('navigation', { name: 'Campaign workflow' })
    await act(async () => {})
    expect(api.generate).toHaveBeenCalledTimes(1)
  })
})
