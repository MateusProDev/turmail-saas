#!/usr/bin/env node
import admin from '../server/firebaseAdmin.js'

const db = admin.firestore()

async function main() {
  const args = process.argv.slice(2)
  const dry = args.includes('--dry-run')
  const limitArg = args.find(a => a.startsWith('--limit='))
  const limit = limitArg ? Number(limitArg.split('=')[1]) : null

  console.log('Backfill tenants - dryRun=%s limit=%s', dry, limit || 'none')

  const usersSnap = await db.collection('users').get()
  let count = 0
  let created = 0
  for (const doc of usersSnap.docs) {
    count += 1
    const uid = doc.id
    const userData = doc.data() || {}
    const tenantId = `tenant_${uid}`
    const tenantRef = db.collection('tenants').doc(tenantId)
    const tenantSnap = await tenantRef.get()
    if (tenantSnap.exists) {
      console.log('%s: tenant exists, skipping', uid)
    } else {
      console.log('%s: tenant missing -> will create %s', uid, tenantId)
      if (!dry) {
      try {
        const name = (userData.company && userData.company.name) || userData.companyName || `Account ${uid}`
        await tenantRef.set({ createdAt: admin.firestore.FieldValue.serverTimestamp(), ownerUid: uid, name }, { merge: true })
        // include email/displayName in member doc when possible
        const email = userData.email || ''
        const displayName = userData.displayName || ''
        await tenantRef.collection('members').doc(uid).set({ role: 'owner', createdAt: admin.firestore.FieldValue.serverTimestamp(), email, displayName }, { merge: true })
        await tenantRef.collection('settings').doc('secrets').set({ brevoApiKey: null, smtpLogin: null, encrypted: false }, { merge: true })
        console.log('%s: tenant created', tenantId)
        created += 1
      } catch (e) {
        console.error('%s: failed to create tenant %s', uid, e)
      }
      }
    }
    if (limit && count >= limit) break
  }
  console.log('Done. scanned=%d created=%d', count, created)
}

main().catch(e => {
  console.error('backfill error', e)
  process.exit(2)
})
