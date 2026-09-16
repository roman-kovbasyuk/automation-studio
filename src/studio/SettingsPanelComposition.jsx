import { useEffect, useState } from 'react'
import { Grid, Inline, Panel, Stack, TextField } from 'brutalist-design-system'
import { Alert, AppButton, SelectField, SwitchField } from "../components/design-system/compatibility.jsx"
import './settings.css'

const providerLabels = { anthropic: 'Anthropic · Claude', openai: 'OpenAI · GPT', google: 'Google · Gemini', openrouter: 'OpenRouter' }
const textModels = { google: ['gemini-3.5-flash'], openai: ['gpt-4.1'], anthropic: ['claude-3-5-sonnet'], openrouter: ['openrouter/auto'] }
const imageModels = { google: ['gemini-3.1-flash-image'], openai: ['gpt-image-1'] }

function PanelTitle({ id, children }) {
  return <span id={id}>{children}</span>
}

function ReadinessPanel({ readiness }) {
  if (!readiness) return null
  const tone = readiness.state === 'ready' ? 'success' : readiness.state === 'unavailable' ? 'danger' : 'warning'
  const title = readiness.state === 'ready' ? 'AI generation ready' : 'AI generation needs attention'
  return <section aria-label="AI generation readiness">
    <Alert tone={tone} title={title}>
      <p>{readiness.message}</p>
      {readiness.spendingControl === 'external' && <p>Spending control is managed outside Banner Studio.</p>}
    </Alert>
  </section>
}

function ChoiceField({ label, name = label, value, placeholder, options, onChange, disabled }) {
  return <SelectField label={label} aria-label={name} value={value || ''}
    options={[...(!value ? [{ value: '', label: placeholder, disabled: true }] : []), ...options.map(option => ({ value: option, label: option }))]}
    onChange={event => onChange(event.target.value)} disabled={disabled} />
}

function ProviderSlot({ label, selection, models, connections, api, onSelectionChange, onChanged, onRemove }) {
  const [provider, setProvider] = useState(selection?.provider ?? '')
  const [model, setModel] = useState(selection?.model ?? '')
  const [apiKey, setApiKey] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState('')
  const [replaceOpen, setReplaceOpen] = useState(false)
  const connection = connections.find(item => item.provider === provider)
  const connected = connection?.status === 'connected'
  const busy = Boolean(pending)
  useEffect(() => { setProvider(selection?.provider ?? ''); setModel(selection?.model ?? '') }, [selection?.provider, selection?.model])

  async function run(action, operation, message = '') {
    setPending(action); setError(''); setNotice('')
    try { await operation(); setNotice(message); return true }
    catch (failure) { setError(failure?.message ?? 'Could not update this provider. Try again.'); return false }
    finally { setPending('') }
  }
  async function saveKey(event) {
    event.preventDefault()
    await run('save', async () => {
      await api.saveAiConnection(provider, apiKey)
      setApiKey('')
      await onSelectionChange({ provider, model })
      setReplaceOpen(false)
      await onChanged()
    }, 'Provider saved.')
  }
  function selectProvider(name) {
    const next = Object.keys(models).find(key => providerLabels[key] === name)
    const nextModel = models[next]?.[0] ?? ''
    setProvider(next); setModel(nextModel); setApiKey(''); setReplaceOpen(false); setNotice(''); setError('')
    if (connections.some(item => item.provider === next && item.status === 'connected')) run('selection', () => onSelectionChange({ provider: next, model: nextModel }), 'AI defaults saved.')
  }
  function selectModel(next) {
    setModel(next); setNotice(''); setError('')
    if (connected) run('selection', () => onSelectionChange({ provider, model: next }), 'AI defaults saved.')
  }
  async function removeConnection() {
    if (!window.confirm(`Remove ${providerLabels[provider]}? This clears all text and image defaults using this connection.`)) return
    await run('remove', async () => { await api.removeAiConnection(provider); await onChanged() })
  }

  return <section aria-label={label}>
    <h3>{label}</h3>
    <Stack gap={4}>
      <Grid gap={3} minItemWidth="240px">
        <ChoiceField label="AI provider" name={label} value={providerLabels[provider]} placeholder="Choose provider" options={Object.keys(models).map(key => providerLabels[key])} onChange={selectProvider} disabled={busy} />
        <ChoiceField label="Preferred model" name={`${label} preferred model`} value={model} placeholder="Choose model" options={models[provider] ?? []} onChange={selectModel} disabled={!provider || busy} />
      </Grid>
      {provider && (!connected || replaceOpen) && <form onSubmit={saveKey}>
        <Stack gap={4}>
          <TextField label={replaceOpen ? 'Paste your new API key' : 'Paste your API key'} aria-label={`${label} API key`} type="password" autoComplete="off" value={apiKey} onChange={event => setApiKey(event.target.value)} required disabled={busy} />
          <Inline gap={2}>
            <AppButton type="submit" variant="primary" busy={pending === 'save'} disabled={busy || !apiKey.trim() || !model}>{replaceOpen ? 'Save new key' : 'Connect provider'}</AppButton>
            {replaceOpen && <AppButton onClick={() => { setReplaceOpen(false); setApiKey(''); setError('') }} disabled={busy}>Cancel key replacement</AppButton>}
          </Inline>
        </Stack>
      </form>}
      {connected && !replaceOpen && <Inline gap={2}>
        <AppButton size="compact" onClick={() => { setReplaceOpen(true); setApiKey('') }} disabled={busy}>Replace API key</AppButton>
        <AppButton size="compact" busy={pending === 'check'} disabled={busy} onClick={() => run('check', async () => { await api.checkAiConnection(provider); await onChanged() }, 'Connection checked successfully.')}>Check connection</AppButton>
        <AppButton size="compact" variant="quiet" disabled={busy} onClick={removeConnection}>Remove connection</AppButton>
      </Inline>}
      {provider === 'openrouter' && <Inline gap={2}><AppButton size="compact" disabled>Connect with OpenRouter OAuth</AppButton></Inline>}
      {onRemove && <Inline gap={2}><AppButton size="compact" variant="quiet" disabled={busy} onClick={() => run('secondary', onRemove)}>Remove secondary provider</AppButton></Inline>}
      {(error || notice) && <p role={error ? 'alert' : 'status'}>{error || notice}</p>}
    </Stack>
  </section>
}

function AiPanel({ kind, title, description, ai, api, onChanged, onSave }) {
  const models = kind === 'text' ? textModels : imageModels
  const secondaryKey = `${kind}Secondary`
  const [secondaryOpen, setSecondaryOpen] = useState(Boolean(ai.defaults[secondaryKey]))
  const titleId = kind === 'text' ? 'text-ai-title' : 'visual-ai-title'
  useEffect(() => { if (ai.defaults[secondaryKey]) setSecondaryOpen(true) }, [ai.defaults[secondaryKey]])

  return <Panel title={<PanelTitle id={titleId}>{title}</PanelTitle>} description={description} aria-labelledby={titleId}>
    <Stack gap={6}>
      {kind === 'text' && ai.connections.some(connection => connection.maskedSuffix) && <section aria-label="Saved API keys">
        <h3>Saved API keys</h3>
        <p>Only the last four characters are shown. Source-backed campaigns use the managed Vertex AI EU connection, not these personal keys.</p>
        <dl>{ai.connections.filter(connection => connection.maskedSuffix).map(connection => <div key={connection.provider}>
          <dt>{providerLabels[connection.provider] ?? connection.provider}</dt>
          <dd>{connection.maskedSuffix}</dd>
        </div>)}</dl>
      </section>}
      <ProviderSlot label="Primary LLM" selection={ai.defaults[kind]} models={models} connections={ai.connections} api={api} onSelectionChange={value => onSave({ [kind]: value })} onChanged={onChanged} />
      {secondaryOpen && <ProviderSlot label="Secondary AI provider" selection={ai.defaults[secondaryKey]} models={models} connections={ai.connections} api={api} onSelectionChange={value => onSave({ [secondaryKey]: value })} onChanged={onChanged} onRemove={async () => { await onSave({ [secondaryKey]: null }); setSecondaryOpen(false) }} />}
      {kind === 'image' && <section aria-label="Video generation">
        <h3>Video generation</h3>
        <Grid gap={3} minItemWidth="240px">
          <ChoiceField label="AI provider" name="Video provider" placeholder="Choose provider" options={[]} disabled />
          <ChoiceField label="Preferred model" name="Video preferred model" placeholder="Choose model" options={[]} disabled />
        </Grid>
      </section>}
      {!secondaryOpen && <Inline gap={2}><AppButton variant="primary" onClick={() => setSecondaryOpen(true)}>Add secondary provider</AppButton></Inline>}
    </Stack>
  </Panel>
}

export function SettingsPanelComposition({ api, settings, readiness = null, onReadinessRefresh }) {
  const [profile, setProfile] = useState(settings.profile)
  const [savedProfile, setSavedProfile] = useState(settings.profile)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [profileError, setProfileError] = useState('')
  const [ai, setAi] = useState(settings.ai)
  const signIn = settings.signIn
  const integrations = settings.integrations ?? []
  const dirty = profile.firstName !== savedProfile.firstName || profile.lastName !== savedProfile.lastName
  useEffect(() => { setProfile(settings.profile); setSavedProfile(settings.profile) }, [settings.profile])
  useEffect(() => { setAi(settings.ai) }, [settings.ai])
  useEffect(() => {
    function revealSection() {
      const id = window.location.hash.slice(1)
      if (['settings-title', 'account-title', 'text-ai-title', 'visual-ai-title', 'notifications-title'].includes(id)) {
        const target = document.getElementById(id)
        ;(target?.closest('h1, h2, h3') ?? target)?.scrollIntoView({ block: 'start', behavior: 'instant' })
      }
    }
    revealSection()
    window.addEventListener('hashchange', revealSection)
    return () => window.removeEventListener('hashchange', revealSection)
  }, [])
  async function refreshAi() {
    setAi(await api.getPersonalAi())
    await onReadinessRefresh?.()
  }
  async function saveDefaults(input) { setAi(await api.updateAiDefaults(input)) }
  async function saveProfile(event) {
    event.preventDefault(); setSaving(true); setNotice(''); setProfileError('')
    try {
      const names = { firstName: profile.firstName.trim(), lastName: profile.lastName.trim() }
      await api.updatePersonalProfile(names)
      const saved = { ...profile, ...names }
      setProfile(saved); setSavedProfile(saved); setNotice('Profile saved.')
    } catch (error) { setProfileError(error?.message ?? 'Could not save your profile.') }
    finally { setSaving(false) }
  }
  function updateName(key, value) { setProfile(current => ({ ...current, [key]: value })); setNotice(''); setProfileError('') }

  return <section id="settings" className="bs-settings" aria-labelledby="settings-title">
    <header className="bs-section-heading"><div><h1 id="settings-title">Settings</h1><p>Manage your account, personal AI connections and notification destinations.</p></div></header>
    <ReadinessPanel readiness={readiness} />
    <Stack gap={12}>
      <form id="account-settings-form" onSubmit={saveProfile}>
        <Panel title={<PanelTitle id="account-title">Account</PanelTitle>} aria-labelledby="account-title">
          <Stack gap={6}>
            <section aria-label="Profile">
              <h3>Profile</h3>
              <Grid gap={3} minItemWidth="240px">
                <TextField label="First name" required maxLength={100} value={profile.firstName} disabled={saving} onChange={event => updateName('firstName', event.target.value)} />
                <TextField label="Last name" maxLength={100} value={profile.lastName} disabled={saving} onChange={event => updateName('lastName', event.target.value)} />
              </Grid>
            </section>
            <section aria-label="Email">
              <h3>Email</h3>
              <Stack gap={4}>
                <TextField label="Email address" aria-label="Email" value={profile.email} disabled />
                <Inline gap={2}><AppButton disabled>Change email</AppButton><AppButton disabled>Disconnect Google</AppButton></Inline>
              </Stack>
            </section>
            <section aria-label="Password"><h3>Password</h3><AppButton disabled>{signIn.passwordConfigured ? 'Change password' : 'Set up password'}</AppButton></section>
          </Stack>
        </Panel>
      </form>
      <AiPanel kind="text" title="AI provider" description="Choose the models that analyze briefs and write copy." ai={ai} api={api} onChanged={refreshAi} onSave={saveDefaults} />
      <AiPanel kind="image" title="Visual generation AI provider" description="Choose the models that create images. Video generation is not enabled in this deployment." ai={ai} api={api} onChanged={refreshAi} onSave={saveDefaults} />
      <Panel title={<PanelTitle id="notifications-title">Notifications</PanelTitle>} description="Choose where campaign updates arrive." aria-labelledby="notifications-title">
        <Stack gap={6}>
          {integrations.map(integration => {
            const name = integration.platform === 'slack' ? 'Slack' : 'Discord'
            const connected = integration.status === 'connected'
            return <section key={integration.platform} aria-label={name}><h3>{name}</h3><AppButton disabled>{connected ? 'Change destination' : 'Connect'}</AppButton></section>
          })}
          {['Any project change', 'New image generations added', 'New video generations added', 'Approval status changed'].map(label => <SwitchField key={label} label={label} checked={false} disabled />)}
        </Stack>
      </Panel>
    </Stack>
    <footer>
      <p role={profileError ? 'alert' : 'status'}>{profileError || notice || (dirty ? 'Unsaved profile changes' : 'Profile up to date')}</p>
      <Inline gap={2}>
        <AppButton form="account-settings-form" disabled={!dirty || saving} onClick={() => { setProfile(savedProfile); setNotice('Changes discarded.'); setProfileError('') }}>Cancel</AppButton>
        <AppButton form="account-settings-form" type="submit" variant="primary" busy={saving} disabled={!dirty}>Save profile</AppButton>
      </Inline>
    </footer>
  </section>
}
