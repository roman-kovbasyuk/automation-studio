import { WorkflowSteps } from '../components/design-system/molecules/WorkflowSteps.jsx'
import { currentStage, stages } from './workflow.js'

function timelineItems(workspace) {
  const briefCreated = Boolean(workspace?.campaign?.brief?.notes?.trim())
  const sets = workspace?.copies?.filter((set) => !set.stale) ?? []
  const currentSet = sets.find((set) => set.id === workspace?.campaign?.selectedCopyId) ?? sets.at(-1)
  const copyTotal = currentSet?.candidates?.length ?? 0
  const copySelected = currentSet?.selectedCandidateId ? 1 : 0
  const directions = workspace?.directions?.filter((direction) => !direction.stale) ?? []
  const images = directions.filter((direction) => direction.previewAssetId).length
  const videos = directions.filter((direction) => direction.videoAssetId).length
  return stages.map((label, index) => {
    if (index === 0) return [label, briefCreated ? 'Created' : '']
    if (index === 1) return [label, copyTotal ? `${copySelected}/${copyTotal} selected` : '']
    if (index === 2) {
      const parts = []
      if (images) parts.push(`${images} image${images === 1 ? '' : 's'}`)
      if (videos) parts.push(`${videos} video${videos === 1 ? '' : 's'}`)
      return [label, parts.join(', ')]
    }
    return [label, '']
  })
}

export function CampaignTimeline({ workspace, stage, pending, onChange, items }) {
  const entries = items ?? timelineItems(workspace).map(([label, context], index) => ({
    label, context, href: `#campaign-step-${index}`, current: index === stage,
    complete: index < currentStage(workspace) && index !== stage,
    disabled: Boolean(pending) || index > currentStage(workspace),
  }))
  return <aside id="campaign-timeline" className="bs-campaign-timeline" aria-label="Campaign progress">
    <div id="campaign-timeline-steps">
      <WorkflowSteps items={entries} onNavigate={onChange} />
    </div>
  </aside>
}
