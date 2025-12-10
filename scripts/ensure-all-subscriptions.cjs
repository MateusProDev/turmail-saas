#!/usr/bin/env node
const admin = require('firebase-admin')
const fs = require('fs')
const path = require('path')

// Init admin
try {
  if (!admin.apps.length) {
    const saPath = path.join(__dirname, '..', 'serviceAccount.json')
    if (fs.existsSync(saPath)) {
      const sa = require(saPath)
      admin.initializeApp({ credential: admin.credential.cert(sa) })
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      admin.initializeApp({ credential: admin.credential.cert(sa) })
    } else {
      console.error('No service account found. Set FIREBASE_SERVICE_ACCOUNT_JSON or ensure serviceAccount.json exists at project root.')
      process.exit(1)
    }
  }
} catch (e) {
  console.error('Failed to initialize Firebase Admin SDK:', e)
  process.exit(1)
}

const db = admin.firestore()

async function processBatch(docs, apply) {
  for (const doc of docs) {
    const id = doc.id
    const data = doc.data()
    const ownerUid = data.ownerUid
    const email = data.email || null

    if (!ownerUid && !email) {
      console.warn(id, 'skipping: no ownerUid and no email')
      continue
    }

    const tenantId = `tenant_${ownerUid || (email ? email.replace(/[^a-z0-9]/gi, '_') : id)}`
    const tenantRef = db.collection('tenants').doc(tenantId)
    const tenantSnap = await tenantRef.get()

    if (!tenantSnap.exists) {
      console.log(id, 'will create tenant', tenantId)
      if (apply) {
        await tenantRef.set({
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          ownerUid: ownerUid || null,
          ownerEmail: email || null,
          name: `Reconciled ${tenantId}`,
          plan: data.plan || 'unknown',
        }, { merge: true })
        await tenantRef.collection('members').doc(ownerUid || 'unknown').set({ role: 'owner', createdAt: admin.firestore.FieldValue.serverTimestamp(), email: email || null, displayName: data.displayName || '' }, { merge: true })
        await tenantRef.collection('settings').doc('secrets').set({ fromEmail: null, fromName: null, smtpLogin: null }, { merge: true })
        console.log(id, 'created tenant', tenantId)
      }
    } else {
      console.log(id, 'tenant exists:', tenantId)
    }

    // update subscription fields
    const update = {}
    if (!data.tenantId) update.tenantId = tenantId
    if (!data.ownerUid && ownerUid) update.ownerUid = ownerUid
    if (!data.ownerEmail && email) update.ownerEmail = email
    if (Object.keys(update).length) {
      console.log(id, 'will update subscription with', update)
      if (apply) {
        await db.collection('subscriptions').doc(id).set(update, { merge: true })
        console.log(id, 'updated')
      }
    }
  }
}

(async () => {
  const apply = process.argv.includes('--apply')
  console.log('ensure-all-subscriptions dry-run. Use --apply to perform writes. apply=%s', apply)

  const subsRef = db.collection('subscriptions')
  const q = subsRef.where('tenantId', '==', null)
  // Firestore doesn't support where == null well; fallback to scanning
  const all = await subsRef.get()
  const toFix = all.docs.filter(d => {
    const data = d.data()
    return !data.tenantId || !data.ownerUid || !data.ownerEmail
  })

  console.log('Found', toFix.length, 'subscriptions to inspect')

  const batchSize = 20
  for (let i = 0; i < toFix.length; i += batchSize) {
    const slice = toFix.slice(i, i + batchSize)
    await processBatch(slice, apply)
  }

  console.log('Done')
  process.exit(0)
})().catch(e => { console.error(e); process.exit(1) })
