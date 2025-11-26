#!/usr/bin/env node
// Backfill script: set ownerUid on campaigns that are missing it.
// Usage:
// 1) Set FIREBASE_SERVICE_ACCOUNT_JSON (or GOOGLE_APPLICATION_CREDENTIALS) in env
// 2) Optionally set BACKFILL_OWNER_UID to a fallback UID to assign when tenant.ownerUid not found
// 3) Run: node scripts/backfill-owneruid.js

import admin from '../server/firebaseAdmin.js'

async function main() {
  const db = admin.firestore()
  const fallbackUid = process.env.BACKFILL_OWNER_UID || null
  console.log('[backfill-owneruid] starting; fallbackUid=', fallbackUid)

  const snap = await db.collection('campaigns').get()
  console.log('[backfill-owneruid] found', snap.size, 'campaigns')

  let updated = 0
  for (const doc of snap.docs) {
    const data = doc.data() || {}
    if (data.ownerUid) continue

    let ownerToSet = null
    try {
      if (data.tenantId) {
        const tenantDoc = await db.collection('tenants').doc(data.tenantId).get()
        if (tenantDoc.exists) ownerToSet = tenantDoc.data()?.ownerUid || null
      }
    } catch (e) {
      console.warn('[backfill-owneruid] tenant lookup failed for', data.tenantId, e)
    }

    if (!ownerToSet && fallbackUid) ownerToSet = fallbackUid
    if (!ownerToSet) {
      console.log('[backfill-owneruid] skipping', doc.id, '— no ownerUid available (tenant missing and no BACKFILL_OWNER_UID)')
      continue
    }

    try {
      await doc.ref.update({ ownerUid: ownerToSet })
      updated += 1
      console.log('[backfill-owneruid] updated', doc.id, '->', ownerToSet)
    } catch (e) {
      console.error('[backfill-owneruid] failed updating', doc.id, e)
    }
  }

  console.log('[backfill-owneruid] done; updated', updated, 'docs')
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
