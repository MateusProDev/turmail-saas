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

async function main() {
  const args = process.argv.slice(2)
  const tIndex = args.indexOf('--tenantId')
  const kIndex = args.indexOf('--key')
  if (tIndex === -1 || !args[tIndex+1] || kIndex === -1 || !args[kIndex+1]) {
    console.error('Usage: node scripts/saveTenantKey.js --tenantId <tenantId> --key <brevoKey>')
    process.exit(1)
  }
  const tenantId = args[tIndex+1]
  const key = args[kIndex+1]

  try {
    const settingsRef = db.collection('tenants').doc(tenantId).collection('settings').doc('secrets')
    const encrypted = encryptText(String(key))
    if (encrypted) {
      await settingsRef.set({ brevoApiKey: encrypted, encrypted: true }, { merge: true })
      console.log('Saved encrypted brevoApiKey for tenant', tenantId)
    } else {
      await settingsRef.set({ brevoApiKey: String(key), encrypted: false }, { merge: true })
      console.log('Saved plain brevoApiKey for tenant', tenantId)
    }
    process.exit(0)
  } catch (err) {
    console.error('Failed to save tenant key:', err)
    process.exit(2)
  }
}

main()
