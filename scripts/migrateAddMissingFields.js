#!/usr/bin/env node
import dotenv from 'dotenv'
dotenv.config({ path: '.env' })
import admin from '../api/firebaseAdmin.js'
import crypto from 'crypto'

const db = admin.firestore()
const ENC_KEY = process.env.TENANT_ENCRYPTION_KEY || ''

function encryptText(plain) {
  if (!ENC_KEY) return null
  try {
    const key = Buffer.from(ENC_KEY, 'base64')
    if (key.length !== 32) throw new Error('TENANT_ENCRYPTION_KEY must be base64 32 bytes')
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return JSON.stringify({ v: 1, alg: 'aes-256-gcm', iv: iv.toString('base64'), tag: tag.toString('base64'), data: encrypted.toString('base64') })
  } catch (err) {
    console.error('encrypt error', err)
    return null
  }
}

async function ensureTenantDefaults(tenantId, options) {
  const tenantRef = db.collection('tenants').doc(tenantId)
  const settingsRef = tenantRef.collection('settings').doc('secrets')
  const settingsSnap = await settingsRef.get()
  const actions = []

  // Ensure settings/secrets exists with required fields
  if (!settingsSnap.exists) {
    actions.push({ type: 'createSettings', tenantId })
    if (!options.dryRun) {
      await settingsRef.set({ brevoApiKey: null, encrypted: false, smtpLogin: null }, { merge: true })
    }
  } else {
    const data = settingsSnap.data() || {}
    const toSet = {}
    if (!('brevoApiKey' in data)) toSet.brevoApiKey = null
    if (!('encrypted' in data)) toSet.encrypted = false
    if (!('smtpLogin' in data)) toSet.smtpLogin = null
    if (Object.keys(toSet).length > 0) {
      actions.push({ type: 'patchSettings', tenantId, changes: toSet })
      if (!options.dryRun) await settingsRef.set(toSet, { merge: true })
    }
  }

  // Ensure members have createdAt and role
  const membersSnap = await tenantRef.collection('members').get()
  for (const doc of membersSnap.docs) {
    const m = doc.data() || {}
    const memberChanges = {}
    if (!('role' in m)) memberChanges.role = 'member'
    if (!('createdAt' in m)) memberChanges.createdAt = admin.firestore.FieldValue.serverTimestamp()
    if (Object.keys(memberChanges).length > 0) {
      actions.push({ type: 'patchMember', tenantId, uid: doc.id, changes: memberChanges })
      if (!options.dryRun) await doc.ref.set(memberChanges, { merge: true })
    }
  }

  // Ensure tenant has createdAt
  const tenantSnap = await tenantRef.get()
  if (tenantSnap.exists) {
    const tdata = tenantSnap.data() || {}
    if (!('createdAt' in tdata)) {
      actions.push({ type: 'patchTenant', tenantId, changes: { createdAt: admin.firestore.FieldValue.serverTimestamp() } })
      if (!options.dryRun) await tenantRef.set({ createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true })
    }
  }

  return actions
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.log('Usage: node ./scripts/migrateAddMissingFields.js <tenantId|--all> [--dry-run] [--confirm]')
    process.exit(1)
  }

  const target = args[0]
  const dryRun = args.includes('--dry-run') || !args.includes('--confirm')
  const confirm = args.includes('--confirm')
  const options = { dryRun }

  const tenants = []
  if (target === '--all') {
    const snap = await db.collection('tenants').get()
    for (const d of snap.docs) tenants.push(d.id)
  } else {
    tenants.push(target)
  }

  const summary = []
  for (const t of tenants) {
    console.log(`Checking tenant ${t} (dryRun=${dryRun})`)
    const actions = await ensureTenantDefaults(t, options)
    if (actions.length === 0) {
      console.log(`  OK: no changes needed for ${t}`)
    } else {
      console.log(`  Actions for ${t}:`)
      for (const a of actions) console.log('   -', a)
    }
    summary.push({ tenant: t, actions })
  }

  console.log('\nSummary:')
  for (const s of summary) console.log(` ${s.tenant}: ${s.actions.length} action(s)`)
  if (dryRun && !confirm) console.log('\nDry-run complete. Re-run with --confirm to apply changes.')
  process.exit(0)
}

main()
