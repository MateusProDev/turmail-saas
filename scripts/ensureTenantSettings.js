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
  if (args.length === 0) {
    console.log('Usage: node ./scripts/ensureTenantSettings.js <tenantId> [--brevoKey=KEY] [--encrypt] [--smtpLogin=LOGIN]')
    process.exit(1)
  }

  const tenantId = args[0]
  const brevoArg = args.find(a => a.startsWith('--brevoKey='))
  const brevoKey = brevoArg ? brevoArg.split('=')[1] : null
  const doEncrypt = args.includes('--encrypt')
  const smtpArg = args.find(a => a.startsWith('--smtpLogin='))
  const smtpLogin = smtpArg ? smtpArg.split('=')[1] : null

  try {
    const tenantRef = db.collection('tenants').doc(tenantId)
    const settingsRef = tenantRef.collection('settings').doc('secrets')
    const snap = await settingsRef.get()
    if (!snap.exists) {
      console.log('settings/secrets missing, creating defaults for tenant', tenantId)
    } else {
      console.log('settings/secrets already exists for tenant', tenantId, '- will merge any provided values')
    }

    let brevoStored = null
    let encryptedFlag = false
    if (brevoKey) {
      brevoStored = brevoKey
      if (doEncrypt) {
        if (!ENC_KEY) {
          console.error('TENANT_ENCRYPTION_KEY not set; cannot encrypt. Aborting.')
          process.exit(2)
        }
        const enc = encryptText(String(brevoKey))
        if (!enc) {
          console.error('Encryption failed')
          process.exit(2)
        }
        brevoStored = enc
        encryptedFlag = true
      }
    }

    const toSet = { encrypted: encryptedFlag }
    if (brevoKey) toSet.brevoApiKey = brevoStored
    if (smtpLogin !== null) toSet.smtpLogin = smtpLogin

    await settingsRef.set(toSet, { merge: true })
    console.log('settings/secrets ensured for tenant', tenantId)
    process.exit(0)
  } catch (err) {
    console.error('Failed to ensure settings', err)
    process.exit(2)
  }
}

main()
