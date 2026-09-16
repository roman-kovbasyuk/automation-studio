import { AppButton, Dialog } from "../../../../components/design-system/compatibility.jsx"

function sourceLabel(source) {
  return source.page ? `${source.label} · page ${source.page}` : source.label
}

function copyField(value) {
  return value || 'Unavailable'
}

/**
 * Read-only presentation of root-projected candidate copy and evidence.
 * @param {{open:boolean, foundCopy:Array<{id:string,fields:{headline:string,body:string,offer:string,cta:string},sourceRefs:Array<{sourceId:string,label:string,blockId:string,page?:number}>}>, onClose:()=>void, onOpenSource:(sourceId:string)=>void, trigger?:import('react').ReactElement}} props
 */
export function FoundCopyDialog({ open, foundCopy, onClose, onOpenSource, trigger }) {
  return <Dialog open={open} onOpenChange={nextOpen => { if (!nextOpen) onClose() }} title="Found copy" trigger={trigger}>
    <div className="bs-found-copy-dialog">
      {foundCopy.map(candidate => <section key={candidate.id} aria-label="Found copy candidate">
        <dl>
          <div><dt>Headline</dt><dd>{copyField(candidate.fields.headline)}</dd></div>
          <div><dt>Body</dt><dd>{copyField(candidate.fields.body)}</dd></div>
          <div><dt>Offer</dt><dd>{copyField(candidate.fields.offer)}</dd></div>
          <div><dt>CTA</dt><dd>{copyField(candidate.fields.cta)}</dd></div>
        </dl>
        <div className="bs-found-copy-dialog__sources">
          {candidate.sourceRefs.map(source => {
            const label = sourceLabel(source)
            return <div key={`${candidate.id}-${source.sourceId}-${source.blockId}`}>
              <p>{label}</p>
              <AppButton type="button" aria-label={`Open source ${label}`} onClick={() => onOpenSource(source.sourceId)}>Open source {label}</AppButton>
            </div>
          })}
        </div>
      </section>)}
    </div>
  </Dialog>
}
