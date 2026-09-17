import logoUrl from './brutalist-logo.svg'

export function DocsBrand() {
  return <a className="docs-brand" href="/getting-started.html" aria-label="Brutalist Design System home">
    <img src={logoUrl} alt="Brutalist Design System" width="160" height="39" />
    <span className="docs-brand__version" aria-label="System version 1.0">1.0</span>
  </a>
}
