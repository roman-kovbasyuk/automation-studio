import { Heading } from 'brutalist-design-system'
import { AtomicPromptInputAdapter } from '../components/design-system/organisms/AtomicPromptInputAdapter.jsx'
import { BriefStage } from './BriefStage.jsx'
import './home-screen.css'

// Home is the canonical banner entry: one centered PromptComposer keeps the
// creation surface focused while BriefView owns persistence and attachments.
export function HomeScreen({ api, pending, onSave, onDirty, collectSources = false, readiness = null }) {
  const projectType = 'banners'
  const submitBlockedReason = readiness && readiness.state !== 'ready' ? readiness.message : ''
  return (
    <section id="home-prompt" className="bs-home" aria-labelledby="home-title">
      <div className="bs-home__entry">
        <Heading level={1} variant="h2" id="home-title">What would you like to create?</Heading>
        <BriefStage
          api={api}
          pending={pending}
          onSave={input => onSave({ ...input, projectType })}
          onDirty={onDirty}
          submitBlockedReason={submitBlockedReason}
          showSubmitBlockedReason={false}
          showMaterialsHint={false}
          collectSources={collectSources && projectType === 'banners'}
          heading={false}
          Composer={AtomicPromptInputAdapter}
          composerProps={{
            label: 'Prompt',
            placeholder: 'Describe what you want to create…',
          }}
        />
      </div>
    </section>
  )
}
