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

// Decrypt Brevo API key
function decryptKey(encryptedData) {
  try {
    // Try GCM format first (JSON)
    const parsed = JSON.parse(encryptedData)
    const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex')
    const iv = Buffer.from(parsed.iv, 'base64')
    const tag = Buffer.from(parsed.tag, 'base64')
    const encrypted = Buffer.from(parsed.data, 'base64')

    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv)
    decipher.setAuthTag(tag)

    let decrypted = decipher.update(encrypted, null, 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (err) {
    // Try CBC format (legacy)
    const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex')
    const [ivHex, encHex] = encryptedData.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const encrypted = Buffer.from(encHex, 'hex')

    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv)
    let decrypted = decipher.update(encrypted, null, 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }
}

async function setupBrevoWebhook(tenantId, webhookUrl) {
  console.log(`\n🔗 Setting up Brevo webhook for tenant: ${tenantId}\n`)
  console.log(`📍 Webhook URL: ${webhookUrl}\n`)

  try {
    // Get tenant settings
    const settingsRef = db.collection('tenants').doc(tenantId).collection('settings').doc('secrets')
    const settingsDoc = await settingsRef.get()

    if (!settingsDoc.exists) {
      throw new Error('Tenant settings not found')
    }

    const settings = settingsDoc.data()
    const activeKeyId = settings.activeBrevoKeyId

    if (!activeKeyId || !settings.brevoKeys?.[activeKeyId]) {
      throw new Error('No active Brevo API key found')
    }

    const encryptedKey = settings.brevoKeys[activeKeyId].apiKey
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
    console.log('  URL:', data.url)
    console.log('  Events:', data.events.join(', '))
    console.log('  Type:', data.type)
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
