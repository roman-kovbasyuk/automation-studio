import { PromptComposer } from './PromptComposer.jsx'

/**
 * A shared prompt composer for focused workflow inputs.
 * Controls are opt-in: callers provide attachments or toolbar controls when needed.
 */
export function PromptInputBlock(props) {
  return <PromptComposer {...props} />
}
