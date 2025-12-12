#!/usr/bin/env node
const admin = require('firebase-admin')
const fs = require('fs')
const path = require('path')

// Init admin like other scripts
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

function usage() {
  console.log('Usage: node scripts/ensure-tenant-for-subscription.cjs --sub <subscriptionId>')
  console.log('   or: node scripts/ensure-tenant-for-subscription.cjs --email <email>')
}

const args = process.argv.slice(2)
if (!args.length) { usage(); process.exit(1) }

const params = {}
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const k = args[i].slice(2)
    const v = args[i+1]
    params[k] = v
    i++
  }
}

(async () => {
  try {
    let subDoc = null
    if (params.sub) {
      const s = await db.collection('subscriptions').doc(params.sub).get()
      if (!s.exists) return console.error('No subscription found with id:', params.sub)
      subDoc = { id: s.id, data: s.data() }
    } else if (params.email) {
      const q = await db.collection('subscriptions').where('email', '==', params.email).limit(1).get()
      if (q.empty) return console.error('No subscription found for email:', params.email)
      const d = q.docs[0]
      subDoc = { id: d.id, data: d.data() }
    } else {
      return usage()
    }

    console.log('Found subscription:', subDoc.id)
    const data = subDoc.data
    const ownerUid = data.ownerUid
    const email = data.email || ''

    if (!ownerUid) {
      console.warn('Subscription has no ownerUid — cannot reliably create tenant. Aborting.')
      return
    }

    const tenantId = `tenant_${ownerUid}`
    const tenantRef = db.collection('tenants').doc(tenantId)
    const tenantSnap = await tenantRef.get()
    if (!tenantSnap.exists) {
      console.log('Creating tenant:', tenantId)
      
      // ✅ IMPORTANTE: Inicializar tenant com limites do trial
      const { PLANS } = await import('../server/lib/plans.js')
      const trialLimits = PLANS.trial.limits
      
      await tenantRef.set({
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        ownerUid: ownerUid,
        ownerEmail: email,
        name: `Account ${ownerUid}`,
        plan: data.plan || 'trial',
        limits: trialLimits, // ✅ Inicializar com limites do trial
        status: 'trial' // ✅ Status inicial como trial
      }, { merge: true })

      const memberRef = tenantRef.collection('members').doc(ownerUid)
      await memberRef.set({ role: 'owner', createdAt: admin.firestore.FieldValue.serverTimestamp(), email, displayName: data.displayName || '' }, { merge: true })

      await tenantRef.collection('settings').doc('secrets').set({ fromEmail: null, fromName: null, smtpLogin: null }, { merge: true })
      console.log('Tenant created with trial limits')
    } else {
      console.log('Tenant already exists:', tenantId)
    }

    // Ensure subscription has tenantId and ownerEmail
    const subRef = db.collection('subscriptions').doc(subDoc.id)
    const update = {}
    if (!data.tenantId) update.tenantId = tenantId
    if (!data.ownerUid) update.ownerUid = ownerUid
    if (!data.ownerEmail && email) update.ownerEmail = email
    if (Object.keys(update).length) {
      await subRef.set(update, { merge: true })
      console.log('Updated subscription with:', update)
    } else {
      console.log('Subscription already has tenant and owner fields')
    }

    console.log('Done — open the Dashboard in the browser and confirm onboarding modal appears for the user')
  } catch (e) {
    console.error('Error:', e)
  }
})()
