import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Inline, ScrollArea, Stack, Text, type HeadingProps } from '../atoms'
import { Button, Panel, Tabs } from '../components'
import './code-example.css'

const tokenPattern = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|<\/?[A-Za-z][^>]*>|\b(?:import|from|export|default|function|return|const|let|var|new|true|false|null|undefined|if|else|async|await|type|interface|as|class)\b|\b\d+(?:\.\d+)?\b)/g
const keywords = new Set(['import', 'from', 'export', 'default', 'function', 'return', 'const', 'let', 'var', 'new', 'true', 'false', 'null', 'undefined', 'if', 'else', 'async', 'await', 'type', 'interface', 'as', 'class'])

function highlightedSource(source: string) {
  return source.split(tokenPattern).map((part, index) => {
    if (!part) return null
    const className = part.startsWith('//') || part.startsWith('/*') ? 'comment' : part.startsWith('<') ? 'tag' : /^['"`]/.test(part) ? 'string' : /^\d/.test(part) ? 'number' : keywords.has(part) ? 'keyword' : undefined
    return className ? <span key={`${part}-${index}`} className={`b-code-example__token b-code-example__token--${className}`}>{part}</span> : part
  })
}

export type CodeExampleProps = {
  title: string
  description?: string
  filename: string
  source: string
  preview?: ReactNode
  controls?: ReactNode
  copyable?: boolean
  headingLevel?: HeadingProps['level']
  className?: string
}

/** Canonical documentation example: existing Panel, controls and layout atoms. */
export function CodeExample({ title, description, filename, source, preview, controls, copyable = true, headingLevel = 2, className = '' }: CodeExampleProps) {
  const [view, setView] = useState('preview')
  const [message, setMessage] = useState('')
  const copyVersion = useRef(0)
  useEffect(() => {
    setMessage('')
    return () => { copyVersion.current += 1 }
  }, [source])
  async function copy() {
    const version = ++copyVersion.current
    try {
      await navigator.clipboard.writeText(source)
      if (version !== copyVersion.current) return
      setMessage('Copied to clipboard.')
    } catch {
      if (version !== copyVersion.current) return
      setView('code')
      setMessage('Clipboard unavailable. Select the code and copy it manually.')
    }
  }
  const code = <Stack gap={2}>
    <Text variant="small" tone="secondary">{filename}</Text>
    <ScrollArea label={`${title} source`} maxHeight="none"><pre className="b-code-example__source"><code>{highlightedSource(source)}</code></pre></ScrollArea>
  </Stack>
  const viewItems = [{ id: 'preview', label: 'Preview', content: null }, { id: 'code', label: 'Code', content: null }] as const
  const viewTabs = preview != null ? <Tabs listOnly size="compact" className="b-code-example__view-tabs" label={`${title} view`} value={view} onChange={setView} items={viewItems} /> : null
  const copyButton = copyable ? <Button size="compact" className="b-code-example__copy" icon="copy" aria-label={`Copy ${title} code`} onClick={copy}>Copy</Button> : null
  const headerControls = viewTabs || controls || copyButton ? <Inline className="b-code-example__header-controls" gap={2}>{viewTabs}{controls}{copyButton}</Inline> : null
  const content = preview != null ? <div role="tabpanel" aria-label={`${title} ${view}`} className="b-code-example__content">{view === 'preview' ? <div className="b-code-example__preview">{preview}</div> : code}</div> : code
  return <Panel title={title} description={description} headingLevel={headingLevel} variant="split" density="compact" className={`b-code-example ${className}`.trim()} filters={headerControls}>
    {content}
    {message && <Text role="status" variant="small">{message}</Text>}
  </Panel>
}
