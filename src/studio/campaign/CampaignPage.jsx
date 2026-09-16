import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Text, WorkflowSteps } from 'brutalist-design-system'
import { VISIBLE_MODULE_IDS } from './moduleContracts.js'
import { ModuleHost } from './ModuleHost.jsx'
import { useCampaignModule } from './useCampaignModule.js'
import { createWorkflowCoordinator } from './workflowCoordinator.js'
import './creation-flow.css'

/** Presentation of runtime permissions; navigation never dispatches work. */
export function CampaignPage({ runtime, activeModule, onNavigate, heading, requestedTemplate, analyzeOnOpen = false, onAnalysisStarted, prototypeMode = false }) {
  const navigation = useRef(onNavigate)
  navigation.current = onNavigate
  const navigate = useCallback(id => navigation.current?.(id), [])
  const coordinator = useMemo(() => createWorkflowCoordinator({ runtime, onNavigate: navigate }), [runtime, navigate])
  const brief = useCampaignModule(runtime, 'brief')
  const copy = useCampaignModule(runtime, 'copy')
  const visuals = useCampaignModule(runtime, 'visuals')
  const banners = useCampaignModule(runtime, 'banners')
  const distribute = useCampaignModule(runtime, 'distribute')
  const ports = [brief, copy, visuals, banners, distribute]
  const clarificationPending = prototypeMode && brief.input.brief?.briefing?.schemaVersion === 2
    && !brief.input.brief.briefing.confirmation
  const requested = activeModule === 'review' ? 'banners' : activeModule
  const available = ports.filter(port => port.access.canVisit)
  const active = clarificationPending ? 'brief' : available.find(port => port.access.id === requested)?.access.id
    ?? available.at(-1)?.access.id ?? 'brief'
  const [visited, setVisited] = useState(() => new Set([active]))
  const panel = useRef(null)
  const previousStep = useRef(active)
  useEffect(() => {
    setVisited(previous => previous.has(active) ? previous : new Set([...previous, active]))
    if (previousStep.current !== active) {
      previousStep.current = active
      panel.current?.focus({ preventScroll: true })
      panel.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' })
    }
  }, [active])
  const started = useRef(false)
  useEffect(() => {
    if (analyzeOnOpen && !started.current) {
      started.current = true
      onAnalysisStarted?.()
      void coordinator.analyzeAndGenerate()
    }
  }, [analyzeOnOpen, coordinator, onAnalysisStarted])
  const activeIndex = VISIBLE_MODULE_IDS.indexOf(active)
  const steps = ports.map(({ access }) => ({ id: access.id, label: access.label,
    description: access.stale ? 'Needs updating' : undefined,
    complete: access.complete, disabled: !access.canVisit || (clarificationPending && access.id !== 'brief') }))
  return <div className="bs-creation-flow" id="banner-creation-flow">
    <div className="bs-creation-heading">{heading}</div>
    <div id="campaign-timeline" className="bs-creation-navigation">
      <WorkflowSteps label="Campaign workflow" steps={steps} current={active} onChange={navigate} />
    </div>
    {requested && requested !== active && <Alert title={`Complete ${ports.find(port => port.access.id === active)?.access.label ?? 'Brief'} before opening this step.`} />}
    <div className="bs-creation-workspace" ref={panel} tabIndex={-1} aria-label={`${ports.find(port => port.access.id === active)?.access.label} workspace`}>
      {VISIBLE_MODULE_IDS.filter(id => visited.has(id) || id === active).map(id => <div key={id} hidden={id !== active}>
        <ModuleHost runtime={runtime} moduleId={id} actions={coordinator.actions[id]}
          onNavigate={navigate} active={id === active}
          requestedTemplate={id === 'banners' ? requestedTemplate : undefined} prototypeMode={prototypeMode} />
      </div>)}
    </div>
    <div className="bs-creation-back">
      {activeIndex > 0 && <Button variant="quiet" icon="arrowLeft" onClick={() => navigate(VISIBLE_MODULE_IDS[activeIndex - 1])}>Back to {steps[activeIndex - 1].label}</Button>}
      <Text variant="small" tone="secondary">Step {activeIndex + 1} of {steps.length}</Text>
    </div>
  </div>
}
