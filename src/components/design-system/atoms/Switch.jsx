import { SwitchField } from "../compatibility.jsx"

/** App callback adapter; rendering and interaction belong to the installed component. */
export function Switch({ label, checked = false, onChange, disabled = false, ...props }) {
  return <SwitchField {...props} label={label} checked={checked} disabled={disabled} onCheckedChange={onChange} />
}
