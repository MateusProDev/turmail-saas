#!/usr/bin/env node
import dotenv from 'dotenv'
dotenv.config({ path: '.env' })
import admin from '../api/firebaseAdmin.js'

async function main() {
  const args = process.argv.slice(2)
  if (!args.length) {
    console.error('Usage: node scripts/setAdminClaim.js --uid <UID> [--admin true|false]')
    process.exit(1)
  }
  const uidIndex = args.indexOf('--uid')
  if (uidIndex === -1 || !args[uidIndex + 1]) {
    console.error('Missing --uid <UID>')
    process.exit(1)
  }
  const uid = args[uidIndex + 1]
  const adminIndex = args.indexOf('--admin')
  const adminFlag = adminIndex !== -1 ? String(args[adminIndex + 1]).toLowerCase() === 'true' : true

  try {
    console.log(`Setting admin claim for uid=${uid} to admin=${adminFlag}`)
    await admin.auth().setCustomUserClaims(uid, { admin: adminFlag })
    console.log('Success. The custom claim is set. Note: the user must re-authenticate (sign out/in) to get the new token.')
    process.exit(0)
  } catch (err) {
    console.error('Failed to set custom claim:', err.message || err)
    process.exit(2)
  }
}

main()
