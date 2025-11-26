#!/usr/bin/env node
import dotenv from 'dotenv'
dotenv.config({ path: '.env' })
import admin from '../api/firebaseAdmin.js'

const db = admin.firestore()

async function main() {
  const args = process.argv.slice(2)
  if (args.length < 2) {
    console.log('Usage: node ./scripts/addMember.js <tenantId> <userUid> [--role=owner|admin|member] [--smtpLogin=LOGIN]')
    process.exit(1)
  }

  const tenantId = args[0]
  const userUid = args[1]
  const roleArg = args.find(a => a.startsWith('--role='))
  const role = roleArg ? roleArg.split('=')[1] : 'member'
  const smtpArg = args.find(a => a.startsWith('--smtpLogin='))
  const smtpLogin = smtpArg ? smtpArg.split('=')[1] : null

  try {
    const tenantRef = db.collection('tenants').doc(tenantId)
    const memberRef = tenantRef.collection('members').doc(userUid)
    const toSet = { role, createdAt: admin.firestore.FieldValue.serverTimestamp() }
    if (smtpLogin !== null) toSet.smtpLogin = smtpLogin
    await memberRef.set(toSet, { merge: true })
    console.log(`Member created/updated: tenant=${tenantId} uid=${userUid} role=${role}`)
    if (smtpLogin !== null) console.log(`  smtpLogin set on member: ${smtpLogin}`)
    if (role === 'owner') {
      await tenantRef.set({ ownerUid: userUid }, { merge: true })
      console.log(`tenant.ownerUid set to ${userUid}`)
    }
    process.exit(0)
  } catch (err) {
    console.error('Failed to add member', err)
    process.exit(2)
  }
}

main()
