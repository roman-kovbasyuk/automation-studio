// @vitest-environment node
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { expect,test } from 'vitest'
import { runMigrations } from '../db/migrate.js'
import { createFigmaPairingService } from './figmaPairingService.js'

test('plugin pairing requires confirmation, hides credentials in storage, expires and revokes disabled users',async()=>{
  const schema=`figma_pair_${randomUUID().replaceAll('-','')}`
  const connectionString=process.env.TEST_DATABASE_URL??'postgresql:///banner_studio_test'
  const maintenance=new Pool({ connectionString }); await maintenance.query(`CREATE SCHEMA ${schema}`)
  const pool=new Pool({ connectionString,options:`-c search_path=${schema}` })
  try {
    await runMigrations({ pool })
    await pool.query("INSERT INTO users (id,email,role,display_name) VALUES ('designer','designer@pair.test','designer','Designer')")
    let time=Date.now()
    const service=createFigmaPairingService({ pool,clock:()=>new Date(time) })
    const actor={ id:'designer',role:'designer' }
    const pairing=await service.beginPairing()
    await expect(service.authenticate(pairing.sessionToken)).rejects.toMatchObject({ code:'figma_pairing_pending' })
    await expect(service.confirmPairing({ actor,pairingId:pairing.pairingId,code:'WRONGCODE' })).rejects.toMatchObject({ code:'invalid_pairing_code' })
    await service.confirmPairing({ actor,pairingId:pairing.pairingId,code:pairing.code })
    const authenticated=await service.authenticate(pairing.sessionToken)
    expect(authenticated.actor).toMatchObject(actor)
    expect(authenticated.workerId).toBe(pairing.pairingId)
    await expect(service.confirmPairing({ actor,pairingId:pairing.pairingId,code:pairing.code })).rejects.toMatchObject({ code:'figma_pairing_consumed' })
    const persisted=(await pool.query('SELECT * FROM figma_plugin_sessions')).rows
    expect(JSON.stringify(persisted)).not.toContain(pairing.sessionToken)
    expect(JSON.stringify(persisted)).not.toContain(pairing.code)
    time+=16*60*1000
    await expect(service.authenticate(pairing.sessionToken)).rejects.toMatchObject({ code:'figma_session_expired' })
    const expired=await service.beginPairing(); time+=6*60*1000
    await expect(service.confirmPairing({ actor,pairingId:expired.pairingId,code:expired.code })).rejects.toMatchObject({ code:'figma_pairing_expired' })
    const revoked=await service.beginPairing()
    await service.confirmPairing({ actor,pairingId:revoked.pairingId,code:revoked.code })
    await pool.query('UPDATE users SET disabled_at=now() WHERE id=$1',[actor.id])
    await expect(service.authenticate(revoked.sessionToken)).rejects.toMatchObject({ code:'forbidden' })
  }finally{await pool.end();await maintenance.query(`DROP SCHEMA ${schema} CASCADE`);await maintenance.end()}
})
