// Source transport must never use the personal-provider factory or a fallback.
export function approvedSourceProvider(job,managedProviders) {
  const provider=managedProviders[job.provider]
  const local=job.provider==='mock' && provider?.sourceDestination==='local-mock'
  const approved=job.provider==='gemini' && job.region==='eu' && job.credentialVersion==null
    && provider?.sourceDestination==='managed-vertex-eu'
  if(!local && !approved) throw Object.assign(new Error('Campaign materials require the approved managed Vertex AI EU connection.'),
    {statusCode:409,code:'brief_provider_approval_required',expose:true,publicMessage:'Campaign materials require the approved managed Vertex AI EU connection.'})
  return provider
}
