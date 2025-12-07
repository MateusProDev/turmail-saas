/**
 * Script para configurar webhooks no Brevo
 * 
 * Isso registra a URL do webhook para receber eventos de email em tempo real
 */

import 'dotenv/config'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load service account
const serviceAccountPath = join(__dirname, '..', 'serviceAccount.json')
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))

// Initialize Firebase Admin
initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

// Encryption key from environment
const ENCRYPTION_KEY = process.env.TENANT_ENCRYPTION_KEY

if (!ENCRYPTION_KEY) {
  console.error('❌ TENANT_ENCRYPTION_KEY not found in environment')
  process.exit(1)
}

// Decrypt Brevo API key (compatible with get-brevo-stats.js)
function decryptKey(encrypted) {
  const key = ENCRYPTION_KEY
  
  if (!encrypted || typeof encrypted !== 'string' || !key) {
    throw new Error('Invalid encrypted data or missing encryption key')
  }

  try {
    // Try GCM format (JSON with iv, tag, data)
    const parsed = JSON.parse(encrypted)
    if (parsed.iv && parsed.data) {
      const keyBuffer = Buffer.from(key, 'base64')
      if (keyBuffer.length !== 32) {
        throw new Error(`Invalid key length: ${keyBuffer.length} bytes (expected 32)`)
      }
      
      const iv = Buffer.from(parsed.iv, 'base64')
      const encData = Buffer.from(parsed.data, 'base64')
      const tag = parsed.tag ? Buffer.from(parsed.tag, 'base64') : null
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv)
      if (tag) decipher.setAuthTag(tag)
      
      const decrypted = Buffer.concat([decipher.update(encData), decipher.final()])
      return decrypted.toString('utf8')
    }
  } catch (e) {
    // Not JSON or GCM failed, try CBC
    console.log('[Decrypt] GCM failed, trying CBC format:', e.message)
  }

  try {
    // CBC format (ivHex:encHex)
    const [ivHex, encHex] = encrypted.split(':')
    if (!ivHex || !encHex) {
      throw new Error('Invalid CBC format')
    }
    const iv = Buffer.from(ivHex, 'hex')
    const enc = Buffer.from(encHex, 'hex')
    const keyBuffer = Buffer.from(key, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv)
    let dec = decipher.update(enc, undefined, 'utf8')
    dec += decipher.final('utf8')
    return dec
  } catch (e) {
    throw new Error(`Decryption failed: ${e.message}`)
  }
}

async function setupBrevoWebhook(tenantId, webhookUrl) {
  console.log(`\n🔗 Setting up Brevo webhook for tenant: ${tenantId}\n`)
  console.log(`📍 Webhook URL: ${webhookUrl}\n`)

  try {
    // Get tenant secrets
    const secretsRef = db.collection('tenants').doc(tenantId).collection('settings').doc('secrets')
    const secretsDoc = await secretsRef.get()

    if (!secretsDoc.exists) {
      throw new Error('Tenant secrets not found')
    }

    const secrets = secretsDoc.data()
    const activeKeyId = secrets.activeKeyId

    if (!activeKeyId) {
      throw new Error('No active Brevo API key ID found')
    }

    // Get the actual key from settings/keys/list/{keyId}
    const keyRef = db.collection('tenants').doc(tenantId)
      .collection('settings').doc('keys')
      .collection('list').doc(activeKeyId)
    
    const keyDoc = await keyRef.get()

    if (!keyDoc.exists) {
      throw new Error(`Key ${activeKeyId} not found in settings/keys/list`)
    }

    const keyData = keyDoc.data()
    const encryptedKey = keyData.brevoApiKey

    if (!encryptedKey) {
      throw new Error('Brevo API key not found in key document')
    }

    const brevoApiKey = decryptKey(encryptedKey)

    console.log('✅ Brevo API key decrypted successfully\n')

    // Configure webhook using Brevo API
    const response = await fetch('https://api.brevo.com/v3/webhooks', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': brevoApiKey
      },
      body: JSON.stringify({
        url: webhookUrl,
        description: `Turmail Events Webhook - ${tenantId}`,
        events: [
          'delivered',
          'hardBounce',
          'softBounce',
          'blocked',
          'spam',
          'invalid',
          'unsubscribed',
          'click',
          'opened',
          'uniqueOpened'
        ],
        type: 'transactional'
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Failed to create webhook:', data)
      throw new Error(data.message || 'Failed to create webhook')
    }

    console.log('✅ Webhook created successfully!')
    console.log('\nWebhook details:')
    console.log('  ID:', data.id)
    console.log('  URL:', data.url || webhookUrl)
    if (data.events && Array.isArray(data.events)) {
      console.log('  Events:', data.events.join(', '))
    }
    console.log('  Type:', data.type || 'transactional')
    console.log('\n📊 Now your campaigns will automatically track:')
    console.log('  • Emails delivered')
    console.log('  • Emails opened (unique opens)')
    console.log('  • Links clicked')
    console.log('  • Bounces (soft & hard)')
    console.log('  • Spam reports')
    console.log('  • Unsubscribes')
    console.log('\n🎯 All metrics will be updated in real-time in Firestore!')

    return data

  } catch (error) {
    console.error('❌ Error setting up webhook:', error.message)
    throw error
  }
}

// Run
const tenantId = process.argv[2] || 'tenant_NF2OKj0O5ePsy4j0dzLRDPjT1K02'
const webhookUrl = process.argv[3] || 'https://turmail-saas.vercel.app/api/webhook-brevo-events'

setupBrevoWebhook(tenantId, webhookUrl)
  .then(() => {
    console.log('\n✅ Setup complete!')
    process.exit(0)
  })
  .catch(err => {
    console.error('\n❌ Setup failed:', err)
    process.exit(1)
  })
