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
    console.log('Usage: node ./scripts/createTenant.js <tenantId> [--brevoKey=KEY] [--encrypt]')
    process.exit(1)
  }

  const tenantId = args[0]
  const brevoArg = args.find(a => a.startsWith('--brevoKey='))
  const brevoKey = brevoArg ? brevoArg.split('=')[1] : process.env.BREVO_API_KEY || ''
  const doEncrypt = args.includes('--encrypt')
  const ownerArg = args.find(a => a.startsWith('--ownerUid='))
  const ownerUid = ownerArg ? ownerArg.split('=')[1] : null

  // Allow creating tenant without providing a Brevo key; settings will be created with null values.
  if (!brevoKey && doEncrypt) {
    console.error('TENANT_ENCRYPTION_KEY requested but no Brevo key provided to encrypt. Aborting.')
    process.exit(2)
  }

  try {
    console.log('Creating tenant', tenantId, 'encrypt=%s ownerUid=%s', doEncrypt, ownerUid)
    const tenantRef = db.collection('tenants').doc(tenantId)
    await tenantRef.set({ createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true })
    // If an ownerUid was provided, create a members doc for the tenant and set tenant.ownerUid
    if (ownerUid) {
      const memberRef = tenantRef.collection('members').doc(ownerUid)
      await memberRef.set({ role: 'owner', createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true })
      await tenantRef.set({ ownerUid }, { merge: true })
      console.log('Created member owner for tenant', tenantId, 'uid=', ownerUid)
    }

    // Prepare settings values. If brevoKey provided, optionally encrypt; otherwise set null defaults.
    let storedVal = null
    let encryptedFlag = false
    if (brevoKey) {
      storedVal = brevoKey
      if (doEncrypt) {
        if (!ENC_KEY) {
          console.error('TENANT_ENCRYPTION_KEY not set in environment; cannot encrypt. Aborting.')
          process.exit(2)
        }
        const enc = encryptText(String(brevoKey))
        if (!enc) {
          console.error('Encryption failed')
          process.exit(2)
        }
        storedVal = enc
        encryptedFlag = true
      }
    }

    const settingsRef = tenantRef.collection('settings').doc('secrets')
    await settingsRef.set({ brevoApiKey: storedVal, encrypted: encryptedFlag, smtpLogin: null }, { merge: true })
    console.log('Tenant created/updated:', tenantId, 'encrypted=', encryptedFlag)
    process.exit(0)
  } catch (err) {
    console.error('Failed to create tenant', err)
    process.exit(2)
  }
}

main()
