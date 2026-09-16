import { FactGrid as ExternalFactGrid } from "../compatibility.jsx"

/** Translate the original content prop to the public value prop. */
export function FactGrid({ items, label = 'Details' }) {
  return <ExternalFactGrid label={label} items={items.map(item => ({
    id: item.id, label: item.label, emphasis: item.emphasis,
    value: item.heading ? <h2>{item.content}</h2> : item.content,
  }))} />
}
