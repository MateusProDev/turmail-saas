/*
Fix subscriptions script

Purpose:
- Find subscription documents where `ownerUid` is missing/empty and `email` exists.
- If a `users` document with the same email exists, set `ownerUid` on the subscription to that user's uid.

Usage (PowerShell):
$env:FIREBASE_PROJECT_ID="your-project-id";
$env:FIREBASE_CLIENT_EMAIL="your-client-email";
$env:FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----`n...`n-----END PRIVATE KEY-----";
node scripts/fix-subscriptions.js         # dry-run: shows changes that would be made
node scripts/fix-subscriptions.js --apply # actually applies updates

Notes:
- Uses the same admin initializer in `api/firebaseAdmin.js`.
- Be careful: run as dry-run first to review changes.
*/

import { db } from '../api/firebaseAdmin.js'

async function findSubscriptionsMissingOwner() {
  const subsRef = db.collection('subscriptions')
  const snap = await subsRef.where('ownerUid', 'in', [null, '', undefined]).get().catch(async (err) => {
    // Some Firestore instances reject queries with undefined/null in array; fallback to full scan
    console.warn('Query by ownerUid failed, falling back to scanning all subscriptions:', err && err.message)
    const all = await subsRef.get()
    return all
  })
  return snap
}

// Helper that returns true if doc exists for email
async function findUserUidByEmail(email) {
  if (!email) return null
  const usersRef = db.collection('users')
  const q = await usersRef.where('email', '==', email).limit(1).get()
  if (q.empty) return null
  return q.docs[0].id
}

async function run() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  console.log('fix-subscriptions: starting (apply=%s)', apply)

  // We'll fetch subscriptions where ownerUid is falsy; query might not support null/undefined
  // So to be robust, fetch all and filter locally if needed (but prefer query when supported)
  const subsRef = db.collection('subscriptions')
  let snap
  try {
    // Try to query where ownerUid == '' OR missing. Firestore doesn't support missing-field queries well,
    // so use a range of likely values.
    snap = await subsRef.get()
  } catch (err) {
    console.error('Failed to read subscriptions:', err)
    process.exit(1)
  }

  const candidates = []
  for (const doc of snap.docs) {
    const data = doc.data()
    const ownerUid = data.ownerUid
    const email = data.email
    const hasOwner = ownerUid !== undefined && ownerUid !== null && ownerUid !== ''
    if (!hasOwner && email) {
      candidates.push({ id: doc.id, email, data })
    }
  }

  console.log('Found %d subscription(s) without ownerUid but with email', candidates.length)
  if (candidates.length === 0) return console.log('Nothing to do')

  let applied = 0
  for (const c of candidates) {
    const { id, email } = c
    const uid = await findUserUidByEmail(email)
    if (uid) {
      console.log(`Would set ownerUid='${uid}' on subscription ${id} (email: ${email})`)
      if (apply) {
        await subsRef.doc(id).set({ ownerUid: uid }, { merge: true })
        console.log('Applied update to', id)
        applied++
      }
    } else {
      console.log(`No user found for email ${email} — skipping subscription ${id}`)
    }
  }

  console.log('Done. Applied updates:', applied)
}

run().catch(err => { console.error('Error', err); process.exit(1) })
