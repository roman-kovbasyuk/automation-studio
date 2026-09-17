import { useMemo, useState } from 'react'
import { Container, AtomsRoot as DesignSystemRoot, Stack, Table, TextField } from 'brutalist-design-system'
import { AppButton } from "../components/design-system/compatibility.jsx"
import { tokenVariables } from 'brutalist-design-system'
import '../styles/application-design-system.css'

// Atomic tokens are supplied by AtomsRoot at runtime, not duplicated in CSS.
export const installedTokens = Object.entries(tokenVariables).map(([name, value]) => ({ name, value: String(value) }))

export default function ApplicationDesignSystemPage() {
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const rows = useMemo(() => installedTokens.filter(token => `${token.name} ${token.value}`.toLowerCase().includes(query.toLowerCase())), [query])
  async function copyToken(name) {
    try { await navigator.clipboard.writeText(name); setMessage(`Copied ${name}`) }
    catch { setMessage(`Could not copy ${name}. Select the token name to copy it manually.`) }
  }
  return <DesignSystemRoot><Container maxWidth={1200}>
    <main className="application-design-system" id="installed-design-system">
      <Stack gap={8}>
        <header>
          <AppButton as="a" variant="quiet" href="/">Back to Automation Studio</AppButton>
          <h1>Brutalist Design System</h1>
          <p>The app uses Brutalist from the workspace package <code>packages/brutalist-design-system</code>. Component documentation and development live with the package.</p>
        </header>
        <section id="installed-tokens" aria-labelledby="installed-tokens-title">
          <Stack gap={4}>
            <h2 id="installed-tokens-title">Installed tokens</h2>
            <TextField label="Find a token" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Color, spacing, typography…" />
            <p role="status" aria-live="polite">{message || `${rows.length} tokens from the installed package.`}</p>
            <Table label="Installed design-system tokens" rows={rows} rowKey={row => row.name}
              columns={[
                { id: 'name', header: 'Token', render: row => <code>{row.name}</code> },
                { id: 'value', header: 'Value', render: row => <code>{row.value}</code> },
                { id: 'copy', header: 'Copy', render: row => <AppButton size="compact" aria-label={`Copy ${row.name}`} onClick={() => copyToken(row.name)}>Copy</AppButton> },
              ]} emptyMessage="No matching tokens." />
          </Stack>
        </section>
      </Stack>
    </main>
  </Container></DesignSystemRoot>
}
