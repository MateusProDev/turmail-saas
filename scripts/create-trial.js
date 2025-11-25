/*
Simple admin script to create a 14-day trial subscription for a given user UID.
Usage (PowerShell):
$env:FIREBASE_PROJECT_ID="your-project-id";
$env:FIREBASE_CLIENT_EMAIL="your-client-email";
$env:FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----";
node scripts/create-trial.js <UID> [email]

Example:
node scripts/create-trial.js gVxaqnexIHMlfuuyP1uqnoicl0k2 mateus@example.com

This uses the same admin setup as `api/firebaseAdmin.js` (ESM import).
*/

import { db } from '../api/firebaseAdmin.js'

async function run() {
  const args = process.argv.slice(2)
  if (args.length < 1) {
    console.error('Usage: node scripts/create-trial.js <UID> [email]')
    process.exit(2)
  }
  const uid = args[0]
  const email = args[1] || null

  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  const doc = {
    email: email,
    uid,
    ownerUid: uid,
    planId: 'free',
    status: 'trial',
    trialEndsAt,
    ipAddress: 'admin-script',
    createdAt: new Date(),
  }

  const ref = await db.collection('subscriptions').add(doc)
  console.log('Created trial subscription', ref.id)
}

run().catch(err => { console.error(err); process.exit(1) })
