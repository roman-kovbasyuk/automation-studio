import { Surface } from 'brutalist-design-system'
import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { Table } from 'brutalist-design-system'
import { AppButton } from '../../components/design-system/atoms/AppButton.jsx'
import { PromptComposer } from '../../components/design-system/organisms/PromptComposer.jsx'

function operationLabel(operation) {
  if (operation.operation === 'scale_typography') return `Typography × ${operation.factor}`
  if (operation.operation === 'set_color') return `${operation.tokenId} → ${operation.value}`
  return 'Unsupported change'
}

function operationDiff(operation, draft) {
  if (operation.operation === 'set_color') {
    return { field: operation.tokenId, current: draft?.colors.palette.find((token) => token.id === operation.tokenId)?.value ?? 'Unknown', proposed: operation.value }
  }
  if (operation.operation === 'scale_typography') {
    return { field: 'Typography scale', current: 'Current scale', proposed: `Scale all sizes × ${operation.factor}` }
  }
  return { field: operationLabel(operation), current: '—', proposed: '—' }
}

export function BrandAiComposer({ draft, onPropose, onApply, onDiscard }) {
  const [prompt, setPrompt] = useState('')
  const [proposal, setProposal] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [costApproval, setCostApproval] = useState(null)
  async function propose(approvalFingerprint) {
    setBusy(true); setError(null)
    try { setProposal(await onPropose(prompt, approvalFingerprint)); setPrompt(''); setCostApproval(null) } catch (value) {
      if (value?.code === 'brand_cost_approval_required') setCostApproval(value.details)
      else setError(value)
    } finally { setBusy(false) }
  }
  return <aside className="bs-brand-ai" aria-label="Brand AI changes">
    {proposal && <Surface><div className="bs-brand-proposal" role="status"><div><strong>Proposed changes</strong><Table label="Proposed brand changes" rows={proposal.operations.map((operation, index) => ({ id: String(index), ...operationDiff(operation, draft) }))} rowKey={row => row.id}
      columns={[{ id: 'field', header: 'Field', render: row => row.field }, { id: 'current', header: 'Current', render: row => row.current }, { id: 'proposed', header: 'Proposed', render: row => row.proposed }]} />{proposal.unchanged?.length > 0 && <p>Unchanged: {proposal.unchanged.join(', ')}</p>}</div><div><AppButton onClick={async () => { await onDiscard(proposal.id); setProposal(null) }}><X size={16} /> Discard</AppButton><AppButton variant="primary" onClick={async () => { await onApply(proposal.id); setProposal(null) }}><Check size={16} /> Apply proposal</AppButton></div></div></Surface>}
    {error && <p role="alert">{error.message || 'A proposal could not be created.'}</p>}
    {costApproval && <Surface><div className="bs-brand-cost-gate" role="alert"><p>{costApproval.provider} · {costApproval.model} · Estimated ${costApproval.estimatedUsd.toFixed(2)}</p><AppButton variant="primary" onClick={() => propose(costApproval.approvalFingerprint)}>Approve and create proposal</AppButton></div></Surface>}
    <PromptComposer value={prompt} onChange={setPrompt} onSubmit={() => propose()} canSubmit={Boolean(prompt.trim())} busy={busy} compact rows={3}
      label="Ask brand AI" formLabel="Brand AI composer" placeholder="Ask for a color or typography change…" submitLabel="Create proposal" />
    <p className="bs-brand-ai-note">AI can propose color and typography changes. Apply updates the draft; publishing remains a separate action.</p>
  </aside>
}
