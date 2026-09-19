import { Panel, Spinner, Text } from 'brutalist-design-system'

/** One honest progress panel for the single analysis call: it names the work without ticking off stages. */
export function AnalysisProgress() {
  return <Panel title="Analyzing your materials" headingLevel={2} aria-busy="true">
    <Spinner label="Analyzing" />
    <Text>AI is understanding your request, structuring the brief, finding existing copy, and suggesting settings and visual keywords.</Text>
  </Panel>
}
