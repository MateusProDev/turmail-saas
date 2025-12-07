/**
 * Lista todos os webhooks configurados no Brevo
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

const serviceAccountPath = join(__dirname, '..', 'serviceAccount.json')
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

const ENCRYPTION_KEY = process.env.TENANT_ENCRYPTION_KEY

function decryptKey(encrypted) {
  const key = ENCRYPTION_KEY
  
  try {
    const parsed = JSON.parse(encrypted)
    if (parsed.iv && parsed.data) {
      const keyBuffer = Buffer.from(key, 'base64')
      const iv = Buffer.from(parsed.iv, 'base64')
      const encData = Buffer.from(parsed.data, 'base64')
      const tag = parsed.tag ? Buffer.from(parsed.tag, 'base64') : null
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv)
      if (tag) decipher.setAuthTag(tag)
      
      const decrypted = Buffer.concat([decipher.update(encData), decipher.final()])
      return decrypted.toString('utf8')
    }
  } catch (e) {
    return null
  }
}

async function listWebhooks(tenantId) {
  console.log(`\n📋 Listing webhooks for tenant: ${tenantId}\n`)

  try {
    // Get API key
    const secretsRef = db.collection('tenants').doc(tenantId).collection('settings').doc('secrets')
    const secretsDoc = await secretsRef.get()
    const secrets = secretsDoc.data()
    const activeKeyId = secrets.activeKeyId

    const keyRef = db.collection('tenants').doc(tenantId)
      .collection('settings').doc('keys')
      .collection('list').doc(activeKeyId)
    
    const keyDoc = await keyRef.get()
    const keyData = keyDoc.data()
    const brevoApiKey = decryptKey(keyData.brevoApiKey)

    // List webhooks
    const response = await fetch('https://api.brevo.com/v3/webhooks', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'api-key': brevoApiKey
      }
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Failed to list webhooks:', data)
      return
    }

    console.log(`Found ${data.webhooks?.length || 0} webhooks:\n`)
    
    data.webhooks?.forEach((webhook, idx) => {
      console.log(`${idx + 1}. Webhook ID: ${webhook.id}`)
      console.log(`   URL: ${webhook.url}`)
      console.log(`   Events: ${webhook.events?.join(', ') || 'N/A'}`)
      console.log(`   Type: ${webhook.type}`)
      console.log(`   Active: ${webhook.is_active !== false ? '✅ Yes' : '❌ No'}`)
      console.log(`   Created: ${webhook.createdAt || 'N/A'}`)
      console.log('')
    })

    return data.webhooks

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

const tenantId = process.argv[2] || 'tenant_NF2OKj0O5ePsy4j0dzLRDPjT1K02'
listWebhooks(tenantId)
