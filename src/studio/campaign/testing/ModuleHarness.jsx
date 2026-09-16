import { Suspense, useMemo } from 'react'
import { moduleRegistry } from '../moduleRegistry.js'
import { WorkflowModuleFrame } from '../../../components/design-system/organisms/WorkflowModuleFrame.jsx'
import { projectModuleInput, moduleInputKey } from '../moduleContracts.js'
import { deriveWorkflowState } from '../workflowState.js'

const fixtureAssets = Object.freeze({ getAssetBlob: async () => new Blob([], { type: 'image/png' }) })

function safeFixtureResult(name, scenario) {
  if (name === 'loadTemplateVersion') return (id, version) => {
    const template = scenario.templates.find(item => item.id === id)
    if (!template) throw new TypeError(`Fixture template not found: ${id}@${version}`)
    return { ...structuredClone(template), version }
  }
  if (name === 'extractFile') return { ok: true, text: 'Fixture campaign brief text.' }
  if (name === 'download') return new Blob(['fixture delivery'], { type: 'application/zip' })
  if (name === 'prepareReview') return { ok: true, requestId: 'fixture-request', version: scenario.workspace.versions[0] ?? null }
  if (name === 'createVersion') return { ok: true, version: scenario.workspace.versions[0] ?? null }
  if (name === 'saveBatch') return { ok: true, reviewInputKey: 'fixture-review-input' }
  if (['markReady', 'requestChanges', 'approve', 'reject', 'reopen'].includes(name)) {
    return { ok: true, receipt: { id: 'fixture-receipt', requestId: 'fixture-request', fixture: true } }
  }
  return { ok: true, requestId: 'fixture-request', jobId: 'fixture-job' }
}

/** Test-only module boundary. No shell, auth, network client, or live records. */
export function ModuleHarness({ moduleId, scenario, actions = {}, onNavigate, assets = fixtureAssets,
  operation = { kind: 'idle', actionId: null, jobId: null, error: null }, record = () => {},
  reconcile = async () => record({ moduleId, action: 'reconcile', args: [] }) }) {
  const defaults = useMemo(() => Object.fromEntries(['edit', 'regenerateVisuals', 'generate', 'regenerate', 'retain', 'select', 'deselect', 'remove', 'submit', 'extractFile', 'image', 'save', 'createVersion', 'markReady', 'requestChanges', 'approve', 'reject', 'reopen', 'build', 'download', 'refine', 'preparePrompts', 'generateAll', 'upload', 'saveBatch', 'prepareReview', 'sendToFigma', 'refreshFigma', 'loadTemplateVersion'].map(name => [name,
    async (...args) => {
      record({ moduleId, action: name, args })
      const result = safeFixtureResult(name, scenario)
      return typeof result === 'function' ? result(...args) : result
    },
  ])), [moduleId, record, scenario])
  const Component = moduleRegistry[moduleId]
  if (!Component) throw new Error(`Module harness not registered: ${moduleId}`)
  const workflow = deriveWorkflowState(scenario.workspace, scenario.actor, scenario.reviewHistory, scenario.figmaReview)
  const input = projectModuleInput(moduleId, scenario.workspace, scenario)
  const access = workflow.modules[moduleId]
  const moduleActions = { ...defaults, ...actions }
  const reviewInput = projectModuleInput('review', scenario.workspace, scenario)
  const reviewPort = {
    input: reviewInput, inputKey: moduleInputKey('review', reviewInput), access: workflow.modules.review, operation,
    actions: moduleActions, assets, reconcile, navigate: onNavigate, setDirty: value => record({ moduleId, dirty: value }),
  }
  return <WorkflowModuleFrame id={`harness-${moduleId}`} title={access.label}><Suspense fallback={<p role="status">Loading module…</p>}>
    <Component port={{ input, inputKey: moduleInputKey(moduleId, input), access, operation,
      actions: moduleActions, assets, reconcile, navigate: onNavigate, setDirty: value => record({ moduleId, dirty: value }),
      ...(moduleId === 'banners' ? { reviewPort } : {}) }} />
  </Suspense></WorkflowModuleFrame>
}
