export function PillTabs({ tabs, value, onChange, ariaLabel, idPrefix = 'tab' }) {
  const id = tab => idPrefix + '-' + tab.replace(/[^a-z0-9]/gi, '-')
  return <div role="tablist" aria-label={ariaLabel}>{tabs.map((tab,index) => <button key={tab} type="button" role="tab" id={id(tab)} aria-controls={id(tab)+'-panel'} aria-selected={value===tab} tabIndex={value===tab ? 0 : -1} onClick={() => onChange(tab)} onKeyDown={event => {
    const next = event.key==='ArrowRight' ? (index+1)%tabs.length : event.key==='ArrowLeft' ? (index+tabs.length-1)%tabs.length : event.key==='Home' ? 0 : event.key==='End' ? tabs.length-1 : -1
    if(next>=0){event.preventDefault();onChange(tabs[next]);document.getElementById(id(tabs[next]))?.focus()}
  }}>{tab}</button>)}</div>
}
export function PillTabPanel({ tab, value, idPrefix = 'tab', children, className }) {
  const id = idPrefix + '-' + tab.replace(/[^a-z0-9]/gi, '-')
  return <div role="tabpanel" id={id+'-panel'} aria-labelledby={id} tabIndex={0} hidden={tab!==value}>{className ? <div className={className}>{children}</div> : children}</div>
}
