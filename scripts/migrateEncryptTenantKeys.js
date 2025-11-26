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

function looksEncrypted(val) {
  if (!val || typeof val !== 'string') return false
  try {
    const p = JSON.parse(val)
    return !!(p && p.v && p.iv && p.tag && p.data)
  } catch (_) {
    return false
  }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const confirm = args.includes('--confirm')

  if (!ENC_KEY) {
    console.error('TENANT_ENCRYPTION_KEY is not set in environment (.env). Aborting.')
    process.exit(2)
  }

  console.log('Starting tenant keys migration (dryRun=%s, confirm=%s)', dryRun, confirm)

  try {
    const tenantsSnap = await db.collection('tenants').get()
    console.log('Found %d tenants', tenantsSnap.size)
    const toUpdate = []
    for (const tDoc of tenantsSnap.docs) {
      const tenantId = tDoc.id
      const settingsRef = db.collection('tenants').doc(tenantId).collection('settings').doc('secrets')
      const sSnap = await settingsRef.get()
      if (!sSnap.exists) continue
      const data = sSnap.data() || {}
      const keyVal = data.brevoApiKey
      const encryptedFlag = data.encrypted === true
      if (!keyVal) continue
      if (encryptedFlag || looksEncrypted(keyVal)) continue
      toUpdate.push({ tenantId, keyVal })
    }

    if (toUpdate.length === 0) {
      console.log('No plaintext tenant keys found. Nothing to do.')
      return process.exit(0)
    }

    console.log('Tenant keys to re-encrypt:', toUpdate.map(t => t.tenantId))

    if (dryRun && !confirm) {
      console.log('Dry run complete. To apply changes run with --confirm (and optionally omit --dry-run).')
      return process.exit(0)
    }

    // Apply updates
    for (const item of toUpdate) {
      const enc = encryptText(String(item.keyVal))
      if (!enc) {
        console.error('Failed to encrypt for tenant', item.tenantId)
        continue
      }
      const settingsRef = db.collection('tenants').doc(item.tenantId).collection('settings').doc('secrets')
      await settingsRef.set({ brevoApiKey: enc, encrypted: true }, { merge: true })
      console.log('Re-encrypted tenant', item.tenantId)
    }

    console.log('Migration completed')
    process.exit(0)
  } catch (err) {
    console.error('Migration failed', err)
    process.exit(2)
  }
}

main()
