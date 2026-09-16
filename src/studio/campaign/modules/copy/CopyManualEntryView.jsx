import { TextField } from 'brutalist-design-system'
import { AppButton } from "../../../../components/design-system/compatibility.jsx"

/** @typedef {{headline:string,body:string,offer:string,cta:string}} CopyFields */
/** @param {{value:CopyFields,onChange:(nextValue:CopyFields)=>void,onSubmit:()=>void,disabled:boolean,error:string|null}} props */
export function CopyManualEntryView({ value, onChange, onSubmit, disabled, error }) {
  const update = field => event => onChange({ ...value, [field]: event.target.value })
  return <div className="bs-copy-manual-entry">
    <TextField label="Headline" value={value.headline} disabled={disabled} onChange={update('headline')} />
    <TextField label="Body" value={value.body} disabled={disabled} onChange={update('body')} />
    <TextField label="Offer" value={value.offer} disabled={disabled} onChange={update('offer')} />
    <TextField label="CTA" value={value.cta} disabled={disabled} onChange={update('cta')} />
    {error && <p role="alert">{error}</p>}
    <AppButton type="button" disabled={disabled} onClick={onSubmit}>Add copy</AppButton>
  </div>
}
