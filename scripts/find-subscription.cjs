#!/usr/bin/env node
const admin = require('firebase-admin')
const fs = require('fs')
const path = require('path')

// Try to init admin with serviceAccount.json if present, otherwise use env
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
  console.log('Usage: node scripts/find-subscription.cjs --id <stripeSubscriptionId>')
  console.log('   or: node scripts/find-subscription.cjs --email <email>')
  console.log('   or: node scripts/find-subscription.cjs --customer <stripeCustomerId>')
}

const args = process.argv.slice(2)
if (!args.length) {
  usage(); process.exit(1)
}

const params = {}
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].slice(2)
    const val = args[i+1]
    params[key] = val
    i++
  }
}

;(async () => {
  try {
    if (params.id) {
      const doc = await db.collection('subscriptions').doc(params.id).get()
      if (!doc.exists) {
        console.log('No subscription found with id:', params.id)
      } else {
        console.log('Subscription:', JSON.stringify({ id: doc.id, data: doc.data() }, null, 2))
      }
      return
    }

    if (params.email) {
      const q = await db.collection('subscriptions').where('email', '==', params.email).limit(5).get()
      if (q.empty) {
        console.log('No subscriptions found for email:', params.email)
      } else {
        q.docs.forEach(d => console.log(JSON.stringify({ id: d.id, data: d.data() }, null, 2)))
      }
      return
    }

    if (params.customer) {
      const q = await db.collection('subscriptions').where('stripeCustomerId', '==', params.customer).limit(5).get()
      if (q.empty) {
        console.log('No subscriptions found for customer:', params.customer)
      } else {
        q.docs.forEach(d => console.log(JSON.stringify({ id: d.id, data: d.data() }, null, 2)))
      }
      return
    }

    usage();
  } catch (e) {
    console.error('Error querying Firestore:', e)
  }
})()
