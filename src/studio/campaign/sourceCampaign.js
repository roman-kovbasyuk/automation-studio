import {assertSourceUploadCurrent} from './sourceUploadGuard.js'
/** An explicit Home submission owns a draft until its source uploads finish.
 * Keep this instance while retrying; never retry an uncertain campaign POST. */
export function createSourceCampaignSubmission({api}) {
  let attempt=null
  return async function submit(input) {
    const {sources=[],...campaignInput}=input
    const identity=JSON.stringify({...campaignInput,sources:sources.map(({id,name,mimeType})=>({id,name,mimeType}))})
    if(attempt?.creationUnknown) throw Object.assign(new Error('Creation may have completed. Check the campaign list before creating another campaign.'),{status:409,code:'creation_uncertain'})
    if(!attempt || attempt.identity!==identity) attempt={identity,campaign:null}
    try {
      if(!attempt.campaign) attempt.campaign=await api.createCampaign({...campaignInput,brief:{...campaignInput.brief,briefing:{schemaVersion:2}}})
      if(attempt.uploadsComplete) return (await api.getWorkspace(attempt.campaign.id)).campaign
      attempt.baseline??={campaign:attempt.campaign,sources:[]}
      let campaign=attempt.campaign
      const failures=[]
      for(const {id,...source} of sources) {
        const current=await api.getWorkspace(campaign.id)
        assertSourceUploadCurrent(attempt.baseline,current,sources)
        campaign=current.campaign
        const result=await api.putBriefSource(campaign.id,id,source,campaign.revision)
        campaign={...campaign,revision:result.campaignRevision}
        if(result.source.status!=='ready') failures.push(source.name)
      }
      if(failures.length) throw Object.assign(new Error(`We could not read: ${failures.join(', ')}. Your draft is saved. Remove these files or open the draft to retry them.`),{status:422,code:'brief_sources_not_ready'})
      attempt.uploadsComplete=true
      return (await api.getWorkspace(campaign.id)).campaign
    } catch(error) {
      if(attempt.campaign) error.campaignId=attempt.campaign.id
      else if(error.status===undefined||error.status===0||error.status>=500) attempt.creationUnknown=true
      throw error
    }
  }
}
