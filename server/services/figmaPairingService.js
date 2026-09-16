import { randomUUID,randomBytes,createHash,timingSafeEqual } from 'node:crypto'
import { withTransaction } from '../db/pool.js'
import { figmaFail } from './figmaHandoffService.js'
const hash=value=>createHash('sha256').update(value).digest('hex')
const same=(left,right)=>timingSafeEqual(Buffer.from(left,'hex'),Buffer.from(right,'hex'))

export function createFigmaPairingService({ pool,clock=()=>new Date() }) {
  return {
    async beginPairing() {
      const pairingId=randomUUID(),code=randomBytes(6).toString('hex').toUpperCase(),sessionToken=randomBytes(32).toString('base64url')
      const expiresAt=new Date(clock().getTime()+5*60*1000)
      await pool.query(`INSERT INTO figma_plugin_sessions (id,token_hash,code_hash,pairing_expires_at) VALUES ($1,$2,$3,$4)`,
        [pairingId,hash(sessionToken),hash(code),expiresAt])
      return { pairingId,code,sessionToken,expiresAt:expiresAt.toISOString() }
    },
    async confirmPairing({ actor,pairingId,code }) {
      if(!actor?.id||actor.disabled||typeof code!=='string'||code.length>32) figmaFail(403,'forbidden','An active signed-in user must confirm pairing')
      // Persist failed attempts even when returning an error.
      const result=await withTransaction(pool,async client=>{
        const user=(await client.query('SELECT role,disabled_at FROM users WHERE id=$1',[actor.id])).rows[0]
        if(!user||user.disabled_at||user.role!==actor.role) figmaFail(403,'forbidden','This user cannot access the workspace')
        const row=(await client.query('SELECT * FROM figma_plugin_sessions WHERE id=$1 FOR UPDATE',[pairingId])).rows[0]
        if(!row) return { error:'invalid_pairing_code',message:'Pairing was not found' }
        if(row.confirmed_at) return { error:'figma_pairing_consumed',message:'This pairing was already confirmed' }
        if(row.revoked_at||new Date(row.pairing_expires_at)<=clock()) return { error:'figma_pairing_expired',message:'Start a new pairing from the plugin' }
        if(row.attempts>=5) return { error:'figma_pairing_locked',message:'Too many attempts. Start a new pairing from the plugin' }
        if(!same(row.code_hash,hash(code.trim().toUpperCase()))) {
          await client.query('UPDATE figma_plugin_sessions SET attempts=attempts+1 WHERE id=$1',[pairingId])
          return { error:'invalid_pairing_code',message:'The pairing code does not match' }
        }
        const now=clock(),expires=new Date(now.getTime()+15*60*1000)
        await client.query('UPDATE figma_plugin_sessions SET actor_id=$2,confirmed_at=$3,session_expires_at=$4 WHERE id=$1',[pairingId,actor.id,now,expires])
        return { expiresAt:expires.toISOString() }
      })
      if(result.error) figmaFail(409,result.error,result.message)
      return result
    },
    async authenticate(token) {
      if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token)) figmaFail(401,'unauthorized','A plugin session is required')
      const row=(await pool.query(`SELECT s.*,u.role,u.disabled_at FROM figma_plugin_sessions s LEFT JOIN users u ON u.id=s.actor_id WHERE token_hash=$1`,[hash(token)])).rows[0]
      if(!row||row.revoked_at) figmaFail(401,'unauthorized','The plugin session is invalid')
      if(!row.confirmed_at) {
        if(new Date(row.pairing_expires_at)<=clock()) figmaFail(401,'figma_pairing_expired','Start a new pairing from the plugin')
        figmaFail(409,'figma_pairing_pending','Confirm this plugin session in the app')
      }
      if(new Date(row.session_expires_at)<=clock()) figmaFail(401,'figma_session_expired','Pair the plugin again to continue')
      if(row.disabled_at||!['designer','marketer','admin'].includes(row.role)) figmaFail(403,'forbidden','This user cannot access the workspace')
      return { actor:{ id:row.actor_id,role:row.role },workerId:row.id,expiresAt:new Date(row.session_expires_at).toISOString() }
    },
  }
}
