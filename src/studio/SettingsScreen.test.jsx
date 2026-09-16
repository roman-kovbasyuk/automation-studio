import { changeControl, selectOption } from "../test/selectOption.js"
import { describe, expect, test, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsScreen } from './SettingsScreen.jsx'

const settings = {
  profile: { firstName: 'Roman', lastName: 'Kovbasyuk', email: 'roman@example.com', emailVerified: true },
  signIn: { googleEmail: 'roman@example.com', passwordConfigured: false },
  ai: {
    connections: [
      { provider: 'openai', status: 'connected', maskedSuffix: '…4k9m' },
      { provider: 'openrouter', status: 'not_connected' },
    ],
    defaults: {
      text: { provider: 'openai', model: 'gpt-4.1' },
      image: { provider: 'google', model: 'gemini-2.5-flash-image' },
      video: { provider: 'openai', model: 'sora-2' },
    },
  },
  integrations: [
    { platform: 'slack', status: 'not_connected' },
    { platform: 'discord', status: 'not_connected' },
  ],
}

describe('Settings screen', () => {
  test('shows generation readiness and external spending control without exposing a budget ledger', () => {
    render(<SettingsScreen api={{}} settings={settings} readiness={{ state: 'paused', message: 'AI generation is paused.', spendingControl: 'external' }} />)

    const readiness = screen.getByRole('region', { name: 'AI generation readiness' })
    expect(readiness).toHaveTextContent('AI generation is paused.')
    expect(readiness).toHaveTextContent('Spending control is managed outside Banner Studio.')
    expect(readiness).not.toHaveTextContent(/remaining|spent|balance|budget/i)
  })

  test('shows saved masked credentials without claiming they are the managed campaign connection', () => {
    render(<SettingsScreen api={{}} settings={settings} />)
    const credentials = within(screen.getByRole('region', { name: 'Saved API keys' }))
    expect(credentials.getByText('OpenAI · GPT')).toBeVisible()
    expect(credentials.getByText('…4k9m')).toBeVisible()
    expect(credentials.getByText(/Source-backed campaigns use the managed Vertex AI EU connection/)).toBeVisible()
    expect(credentials.queryByText('OpenRouter')).not.toBeInTheDocument()
    expect(credentials.queryByRole('textbox')).not.toBeInTheDocument()
  })

  test('refreshes generation readiness after a provider connection check', async () => {
    const user = userEvent.setup()
    const onReadinessRefresh = vi.fn()
    const api = {
      checkAiConnection: vi.fn().mockResolvedValue({}),
      getPersonalAi: vi.fn().mockResolvedValue(settings.ai),
    }
    render(<SettingsScreen api={api} settings={settings} onReadinessRefresh={onReadinessRefresh} />)

    await user.click(screen.getByRole('button', { name: 'Check connection' }))
    expect(onReadinessRefresh).toHaveBeenCalledOnce()
  })

  test('composes setting groups with public design-system panels and controls', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/studio/SettingsPanelComposition.jsx'), 'utf8')

    expect(source).toContain("import { Grid, Inline, Panel, Stack, TextField } from 'brutalist-design-system'")
    expect(source).toContain('<Panel')
    expect(source).not.toContain("components/design-system/organisms/SettingsPanel")
    expect(source).not.toContain("components/design-system/atoms/AppButton")
    expect(source).not.toContain("components/design-system/molecules/FormField")
    expect(source).not.toContain("components/design-system/atoms/Switch")
  })

  test('shows personal profile, consolidated AI provider slots, and disabled notification connections', () => {
    render(<SettingsScreen api={{ updatePersonalProfile: vi.fn() }} settings={settings} />)

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeVisible()
    expect(screen.getByLabelText('First name')).toHaveValue('Roman')
    expect(screen.getByLabelText('First name')).toHaveClass('c-text-input')
    expect(screen.getByLabelText('Last name')).toHaveValue('Kovbasyuk')
    expect(screen.queryByText('Google connected')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'AI provider' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Visual generation AI provider' })).toBeVisible()
    expect(screen.getAllByRole('combobox', { name: 'Primary LLM' })[0]).toHaveTextContent('OpenAI · GPT')
    expect(screen.queryByText('Manage connection')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Add secondary provider' })).toHaveLength(2)
    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeVisible()
    expect(screen.queryByText('Coming soon')).not.toBeInTheDocument()
    expect(screen.getAllByRole('switch')).toHaveLength(4)
    expect(screen.getAllByRole('switch').every(control => control.disabled)).toBe(true)
    expect(screen.getByRole('combobox', { name: 'Video provider' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Video preferred model' })).toBeDisabled()
  })

  test('saves profile changes through the personal settings API', () => {
    const api = { updatePersonalProfile: vi.fn().mockResolvedValue(settings.profile) }
    render(<SettingsScreen api={api} settings={settings} />)

    changeControl(screen.getByLabelText('First name'), { target: { value: 'Romy' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(api.updatePersonalProfile).toHaveBeenCalledWith({ firstName: 'Romy', lastName: 'Kovbasyuk' })
  })

  test('keeps deferred account actions disabled without invoking authentication APIs', () => {
    const auth = { requestEmailChange: vi.fn(), setupPassword: vi.fn(), disconnectGoogle: vi.fn() }
    render(<SettingsScreen api={{ updatePersonalProfile: vi.fn() }} auth={auth} settings={{ ...settings, signIn: { ...settings.signIn, passwordConfigured: true } }} />)

    expect(screen.getByRole('button', { name: 'Change email' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Change password' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Disconnect Google' })).toBeDisabled()
    expect(auth.requestEmailChange).not.toHaveBeenCalled()
    expect(auth.setupPassword).not.toHaveBeenCalled()
    expect(auth.disconnectGoogle).not.toHaveBeenCalled()
  })

  test('reveals the API-key field when a provider is selected and supports a secondary slot', () => {
    const api = { updatePersonalProfile: vi.fn(), saveAiConnection: vi.fn().mockResolvedValue({}), updateAiDefaults: vi.fn().mockResolvedValue(settings.ai), getPersonalAi: vi.fn().mockResolvedValue(settings.ai) }
    render(<SettingsScreen api={api} settings={{ ...settings, ai: { ...settings.ai, connections: [{ provider: 'openai', status: 'not_connected' }, { provider: 'google', status: 'not_connected' }] } }} />)

    const textRegion = screen.getByRole('region', { name: 'AI provider' })
    changeControl(screen.getAllByRole('combobox', { name: 'Primary LLM' })[0], { target: { value: 'Google · Gemini' } })
    expect(textRegion.querySelector('input[aria-label="Primary LLM API key"]')).toBeVisible()
    fireEvent.click(screen.getAllByRole('button', { name: 'Add secondary provider' })[0])
    expect(screen.getByRole('combobox', { name: 'Secondary AI provider' })).toBeVisible()
  })

  test('keeps OpenRouter OAuth deferred without making a request', () => {
    render(<SettingsScreen api={{ updatePersonalProfile: vi.fn() }} settings={{ ...settings, ai: { ...settings.ai, connections: [...settings.ai.connections, { provider: 'google', status: 'not_connected' }] } }} />)
    changeControl(screen.getAllByRole('combobox', { name: 'Primary LLM' })[0], { target: { value: 'OpenRouter' } })
    expect(screen.getByRole('button', { name: 'Connect with OpenRouter OAuth' })).toBeDisabled()
  })
})


describe('Settings shared-control behavior', () => {
  test('cancel restores the saved profile and a failed save keeps the draft', async () => {
    const user = userEvent.setup()
    const api = { updatePersonalProfile: vi.fn().mockRejectedValue(new Error('Profile could not be saved')) }
    render(<SettingsScreen api={api} settings={settings} />)
    const name = screen.getByLabelText('First name')
    await user.clear(name)
    await user.type(name, 'Draft')
    await user.click(screen.getByRole('button', { name: 'Cancel', exact: true }))
    expect(name).toHaveValue('Roman')
    expect(screen.getByRole('button', { name: 'Save profile' })).toBeDisabled()
    await user.clear(name)
    await user.type(name, 'Retry me')
    await user.click(screen.getByRole('button', { name: 'Save profile' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Profile could not be saved')
    expect(name).toHaveValue('Retry me')
    expect(screen.getByRole('button', { name: 'Save profile' })).toBeEnabled()
  })

  test('uses the upstream popup select and clears a key when switching providers', async () => {
    const user = userEvent.setup()
    const emptyAi = { connections: [], defaults: {} }
    render(<SettingsScreen api={{}} settings={{ ...settings, ai: emptyAi }} />)
    const region = within(screen.getByRole('region', { name: 'AI provider' }))
    const provider = region.getByRole('combobox', { name: 'Primary LLM', exact: true })
    provider.focus()
    expect(provider).toHaveFocus()
    expect(provider.tagName).toBe('BUTTON')
    expect(provider).toHaveClass('c-text-input')
    await selectOption(provider, 'Google · Gemini')
    const key = region.getByLabelText('Primary LLM API key')
    await user.type(key, 'synthetic-key-for-test')
    await selectOption(provider, 'Anthropic · Claude')
    expect(key).toHaveValue('')
    expect(region.getByRole('combobox', { name: 'Primary LLM preferred model' })).toHaveTextContent('claude-3-5-sonnet')
  })

  test('connects the selected provider and model using the shared fields', async () => {
    const user = userEvent.setup()
    const emptyAi = { connections: [], defaults: {} }
    const connectedAi = { connections: [{ provider: 'google', status: 'connected' }], defaults: { text: { provider: 'google', model: 'gemini-3.5-flash' } } }
    const api = { saveAiConnection: vi.fn().mockResolvedValue({}), updateAiDefaults: vi.fn().mockResolvedValue(connectedAi), getPersonalAi: vi.fn().mockResolvedValue(connectedAi) }
    render(<SettingsScreen api={api} settings={{ ...settings, ai: emptyAi }} />)
    const region = within(screen.getByRole('region', { name: 'AI provider' }))
    await selectOption(region.getByRole('combobox', { name: 'Primary LLM', exact: true }), 'Google · Gemini')
    await user.type(region.getByLabelText('Primary LLM API key'), 'synthetic-test-key')
    await user.click(region.getByRole('button', { name: 'Connect provider' }))
    expect(api.saveAiConnection).toHaveBeenCalledWith('google', 'synthetic-test-key')
    expect(api.updateAiDefaults).toHaveBeenCalledWith({ text: { provider: 'google', model: 'gemini-3.5-flash' } })
    expect(await region.findByText('Provider saved.')).toBeVisible()
    expect(region.queryByLabelText('Primary LLM API key')).not.toBeInTheDocument()
  })

  test('keeps the secondary provider visible if removing its saved default fails', async () => {
    const user = userEvent.setup()
    const api = { updateAiDefaults: vi.fn().mockRejectedValue(new Error('Could not remove secondary provider')) }
    render(<SettingsScreen api={api} settings={{ ...settings, ai: { ...settings.ai, defaults: { ...settings.ai.defaults, textSecondary: { provider: 'openai', model: 'gpt-4.1' } } } }} />)
    await user.click(screen.getByRole('button', { name: 'Remove secondary provider' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not remove secondary provider')
    expect(screen.getByRole('combobox', { name: 'Secondary AI provider', exact: true })).toBeVisible()
  })
})


test('reveals a directly linked section after asynchronous Settings content mounts', () => {
  const originalScroll = Element.prototype.scrollIntoView
  const scroll = vi.fn()
  Element.prototype.scrollIntoView = scroll
  const previousUrl = window.location.pathname + window.location.search + window.location.hash
  window.history.replaceState(null, '', '#text-ai-title')
  try {
    const view = render(<SettingsScreen api={{}} settings={settings} />)
    expect(scroll).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' })
    expect(scroll.mock.instances[0]).toBe(screen.getByRole('heading', { name: 'AI provider' }))
    view.unmount()
  } finally {
    Element.prototype.scrollIntoView = originalScroll
    window.history.replaceState(null, '', previousUrl)
  }
})
