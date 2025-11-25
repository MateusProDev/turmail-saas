/*
Backfill script for `users` collection.

Usage (PowerShell):
$env:FIREBASE_PROJECT_ID="your-project-id";
$env:FIREBASE_CLIENT_EMAIL="your-client-email";
$env:FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----";
node scripts/backfill-users.js

This script uses the existing server admin config pattern in `api/firebaseAdmin.js`.
It will iterate all documents in `users` and ensure canonical fields exist.
It will not overwrite non-null existing fields; it uses merge when updating.
*/

import { db as adminDb } from '../api/firebaseAdmin.js'

function makeInitialUserForServer({ uid = null, email = null, stripeCustomerId = null } = {}) {
  return {
    uid: uid || null,
    email: email || null,
    displayName: null,
    photoURL: null,
    role: 'user',
    plan: 'free',
    stripeCustomerId: stripeCustomerId || null,
    billing: {},
    company: {
      name: null,
      website: null,
    },
    phone: null,
    locale: 'pt-BR',
    onboardingCompleted: false,
    metadata: {},
    createdAt: new Date(),
  }
}

async function run() {
  console.log('Backfill users start')
  const usersRef = adminDb.collection('users')
  const snapshot = await usersRef.get()
  console.log('Found', snapshot.size, 'user docs')
  let updated = 0
  for (const doc of snapshot.docs) {
    const data = doc.data()
    const uid = data.uid || doc.id
    const email = data.email || null
    const base = makeInitialUserForServer({ uid, email, stripeCustomerId: data.stripeCustomerId || null })

    // Build a patch only with missing fields to avoid overwriting
    const patch = {}
    for (const [k, v] of Object.entries(base)) {
      if (!(k in data) || data[k] === undefined) {
        patch[k] = v
      }
    }

    if (Object.keys(patch).length > 0) {
      await doc.ref.set(patch, { merge: true })
      updated++
      console.log('Updated', doc.id, Object.keys(patch))
    }
  }
  console.log('Backfill complete. Updated', updated, 'documents')
}

run().catch(err => {
  console.error('Backfill error', err)
  process.exit(1)
})
