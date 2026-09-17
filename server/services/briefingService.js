import {randomUUID} from 'node:crypto'
import {withTransaction} from '../db/pool.js'
import {createCampaignRepository} from '../repositories/campaignRepository.js'
import {briefAnswersDraftSchema,briefConfirmationRequestSchema} from '../../shared/briefingContracts.js'
import {copyProjection,visualProjection,classifyBriefChange} from '../../shared/briefingDependencies.js'
import {hashCanonical} from '../../shared/canonicalJson.js'
import {applyArtifactEdit} from '../../shared/workflowRules.js'
import {briefSourceError} from '../briefSources/sourceExtractor.js'
import {verifyBriefingProposal} from '../briefSources/analysisEvidence.js'
// Copy writing after a confirmation adds five options.
const INITIAL_COPY_OPTIONS=5

function authorize(actor) {
  if(!actor?.id || actor.disabled || actor.disabledAt || !['marketer','admin'].includes(actor.role)) throw briefSourceError('forbidden','You cannot edit this brief.',403)
}
function parse(schema,value) {
  const result=schema.safeParse(value)
  if(!result.success) throw briefSourceError('invalid_brief_answers','Review the summary, audience, copy choice, reach and campaign goal.',422)
  return result.data
}
function editable(campaign,revision) {
  if(!campaign) throw briefSourceError('not_found','Campaign not found.',404)
  if(!Number.isSafeInteger(revision)||revision!==campaign.revision) throw briefSourceError('revision_conflict','The campaign changed. Your draft is kept; reload before confirming.',409)
  const edit=applyArtifactEdit(campaign,'brief')
  if(!edit.ok) throw briefSourceError(edit.code,edit.message,edit.status)
  if(!campaign.brief.briefing) throw briefSourceError('brief_analysis_required','Analyze the materials before reviewing the questions.',409)
}
export async function requireBriefConfirmation(client,campaign) {
  const state=campaign.brief.briefing
  if(!state) throw briefSourceError('brief_confirmation_required','Review and confirm the campaign questions before generating.',409)
  const confirmation=state.confirmation
  const row=confirmation && (await client.query('SELECT snapshot FROM brief_confirmations WHERE campaign_id=$1 AND id=$2',[campaign.id,confirmation.id])).rows[0]
  if(!row || confirmation.sourceKey!==state.sourceKey || confirmation.copyKey!==hashCanonical(copyProjection(campaign.brief))
    || confirmation.visualKey!==hashCanonical(visualProjection(campaign.brief)) || confirmation.answersKey!==hashCanonical(state.answers)
    || hashCanonical(row.snapshot.confirmation)!==hashCanonical(confirmation))
    throw briefSourceError('brief_confirmation_required','Review and confirm the campaign questions before generating.',409)
}
export function createBriefingService({pool,idGenerator=randomUUID,clock=()=>new Date()}) {
  async function save(client,campaign,answers,confirmation) {
    const repo=createCampaignRepository(client),brief={...campaign.brief,briefing:{...campaign.brief.briefing,answers,confirmation}}
    const changed=classifyBriefChange(campaign.brief,brief)
    const status=changed.copy?'draft':changed.visual?(campaign.selectedCopyId?'copy_ready':'draft'):campaign.status
    const updated=await repo.updateState({...campaign,expectedRevision:campaign.revision,brief,status,
      selectedCopyId:changed.copy?null:campaign.selectedCopyId,
      selectedDirectionId:changed.visual?null:campaign.selectedDirectionId,compositionId:changed.visual?null:campaign.compositionId})
    if(changed.copy||changed.visual) await repo.markArtifactsStale(campaign.id,{copy:changed.copy,directions:changed.visual,composition:changed.visual})
    return updated
  }
  return {
    async startReview({actor,campaignId,expectedRevision}) {
      authorize(actor)
      return withTransaction(pool,async client=>{
        const repo=createCampaignRepository(client),campaign=await repo.findByIdForUpdate(campaignId)
        if(!campaign) throw briefSourceError('not_found','Campaign not found.',404)
        const edit=applyArtifactEdit(campaign,'brief')
        if(!edit.ok) throw briefSourceError(edit.code,edit.message,edit.status)
        if(campaign.brief.briefing) return {campaignRevision:campaign.revision}
        throw briefSourceError('canonical_migration_required','This campaign must be migrated before its questions can be reviewed.',409)
      })
    },
    async saveAnswers({actor,campaignId,expectedRevision,answers}) {
      authorize(actor);answers=parse(briefAnswersDraftSchema,answers)
      return withTransaction(pool,async client=>{
        const campaign=await createCampaignRepository(client).findByIdForUpdate(campaignId);editable(campaign,expectedRevision)
        const updated=await save(client,campaign,answers,null)
        return {campaignRevision:updated.revision}
      })
    },
    async confirm({actor,campaignId,expectedRevision,idempotencyKey,input}) {
      authorize(actor);input=parse(briefConfirmationRequestSchema,input)
      if(typeof idempotencyKey!=='string'||! /^[\x21-\x7e]{1,255}$/.test(idempotencyKey)) throw briefSourceError('invalid_request','A confirmation request identity is required.',400)
      return withTransaction(pool,async client=>{
        const repo=createCampaignRepository(client),campaign=await repo.findByIdForUpdate(campaignId)
        if(!campaign) throw briefSourceError('not_found','Campaign not found.',404)
        const requestHash=hashCanonical(input)
        const replay=(await client.query('SELECT * FROM brief_confirmations WHERE campaign_id=$1 AND actor_id=$2 AND idempotency_key=$3',[campaignId,actor.id,idempotencyKey])).rows[0]
        if(replay) {
          if(replay.request_hash!==requestHash) throw briefSourceError('idempotency_conflict','This confirmation identity was already used for different answers.',409)
          return replay.response
        }
        editable(campaign,expectedRevision)
        const state=campaign.brief.briefing
        if(input.sourceKey!==state.sourceKey || input.analysisJobId!==state.analysisJobId) throw briefSourceError('brief_source_changed','The materials changed. Analyze them again before confirming.',409)
        const job=(await client.query("SELECT * FROM generation_jobs WHERE id=$1 AND campaign_id=$2 AND step='brief_analysis' AND status='succeeded'",[input.analysisJobId,campaignId])).rows[0]
        if(!job || job.safety?.verdict!=='safe' || job.input_snapshot.brief.briefing?.sourceKey!==state.sourceKey) throw briefSourceError('brief_analysis_required','A current successful analysis is required.',409)
        const proposal=verifyBriefingProposal(job.result_metadata.analysis.briefingProposal,{sourceKey:state.sourceKey,sources:job.input_snapshot.sources})
        const keepsCopy=input.answers.copyMode!=='create_new'
        if(keepsCopy&&!proposal.foundCopy.length) throw briefSourceError('no_supplied_copy','No banner wording was found to keep.',422)
        if(!keepsCopy&&proposal.foundCopy.length) throw briefSourceError('found_copy_not_kept','Found copy is always kept. Choose whether to also write new copy.',422)
        const brief={...campaign.brief,briefing:{...state,answers:input.answers}}
        const copyKey=hashCanonical(copyProjection(brief)),visualKey=hashCanonical(visualProjection(brief)),answersKey=hashCanonical(input.answers)
        if(state.confirmation?.answersKey===answersKey) return {confirmationId:state.confirmation.id,campaignRevision:campaign.revision,initialCopy:'skip',importedCopySetId:state.confirmation.importedCopySetId}
        const previous=(await client.query('SELECT id FROM brief_confirmations WHERE campaign_id=$1 AND copy_key=$2 LIMIT 1',[campaignId,copyKey])).rows.length>0
        const importKey=hashCanonical({sourceKey:state.sourceKey,copies:proposal.foundCopy})
        const imported=(await client.query('SELECT id FROM copy_sets WHERE campaign_id=$1 AND import_key=$2',[campaignId,importKey])).rows[0]
        const shouldImport=keepsCopy&&!imported
        // Copy writing starts only for copy settings that were never confirmed before.
        const writesCopy=input.answers.copyMode!=='keep_original'&&!previous
        if(shouldImport) {
          const capacity=(await client.query(`SELECT COALESCE(sum(jsonb_array_length(candidates)-jsonb_array_length(deleted_candidate_ids)),0)::int AS n FROM copy_sets WHERE campaign_id=$1 AND stale=false`,[campaignId])).rows[0].n
          const reserved=(await client.query("SELECT COALESCE(sum(COALESCE((input_snapshot->>'copySlots')::int,5)),0)::int AS n FROM generation_jobs WHERE campaign_id=$1 AND step='copy' AND status IN ('pending','unknown')",[campaignId])).rows[0].n
          if(capacity+reserved+proposal.foundCopy.length+(writesCopy?INITIAL_COPY_OPTIONS:0)>30) throw briefSourceError('copy_capacity_exceeded',writesCopy
            ?'Delete copy options to make room for the found copy and five new options.':'Delete copy options to make room for all supplied wording.',409)
        }
        const id=idGenerator(),importedCopySetId=shouldImport?idGenerator():imported?.id??null
        const suppliedCopy=shouldImport?{id:importedCopySetId,candidates:proposal.foundCopy.map(copy=>({id:`${importedCopySetId}:${copy.id}`,...copy.fields,visualPrompt:''})),sourceRefs:proposal.foundCopy.map(copy=>copy.sourceRefs)}:null
        const confirmation={id,analysisJobId:input.analysisJobId,sourceKey:state.sourceKey,copyKey,visualKey,answersKey,
          confirmedAt:clock().toISOString(),confirmedBy:actor.id,importedCopySetId}
        const updated=await save(client,campaign,input.answers,confirmation)
        const response={confirmationId:id,campaignRevision:updated.revision,initialCopy:writesCopy?'offer_generation':'skip',importedCopySetId}
        await client.query(`INSERT INTO brief_confirmations(id,campaign_id,actor_id,idempotency_key,request_hash,source_key,copy_key,answers_key,snapshot,response)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[id,campaignId,actor.id,idempotencyKey,requestHash,state.sourceKey,copyKey,answersKey,JSON.stringify({answers:input.answers,confirmation,suppliedCopy}),JSON.stringify(response)])
        if(shouldImport) {
          const candidates=suppliedCopy.candidates
          await client.query(`INSERT INTO copy_sets(id,campaign_id,candidates,origin,source_confirmation_id,original_candidates,source_refs,copy_source_key,import_key)
            VALUES($1,$2,$3,'supplied',$4,$3,$5,$6,$7)`,[importedCopySetId,campaignId,JSON.stringify(candidates),id,JSON.stringify(proposal.foundCopy.map(copy=>copy.sourceRefs)),copyKey,importKey])
        }
        return response
      })
    },
  }
}
