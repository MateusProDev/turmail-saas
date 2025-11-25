import axios from 'axios'
import admin from './firebaseAdmin.js'
import crypto from 'crypto'

const db = admin.firestore()
const ENC_KEY = process.env.TENANT_ENCRYPTION_KEY || ''

function tryDecrypt(val) {
  if (!val) return null
  // detect JSON envelope
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : null
    if (!parsed || !parsed.v || !parsed.data) return val
    if (!ENC_KEY) return null
    const key = Buffer.from(ENC_KEY, 'base64')
    if (key.length !== 32) return null
    const iv = Buffer.from(parsed.iv, 'base64')
    const tag = Buffer.from(parsed.tag, 'base64')
    const data = Buffer.from(parsed.data, 'base64')
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
    return decrypted.toString('utf8')
  } catch (err) {
    // if JSON parse or decrypt fails, return original
    return val
  }
}

export default async function handler(req, res) {
  const debug = process.env.DEBUG_API === 'true'
  if (debug) console.log('[send-campaign] invoked', { method: req.method })

  if (req.method !== 'POST') return res.status(405).end('Method not allowed')

  try {
    const body = req.body || {}
    if (debug) console.log('[send-campaign] body', body)

    // If tenantId provided, try to load tenant-specific key from Firestore
    let apiKey = process.env.BREVO_API_KEY
    const tenantId = body.tenantId
    if (tenantId) {
      const settingsDoc = await db.collection('tenants').doc(tenantId).collection('settings').doc('secrets').get()
      let tenantKey = settingsDoc.exists ? settingsDoc.data()?.brevoApiKey : null
      if (tenantKey) {
        // try to decrypt if encrypted
        const maybe = tryDecrypt(tenantKey)
        if (maybe) tenantKey = maybe
      }
      if (tenantKey) {
        apiKey = tenantKey
        if (debug) console.log('[send-campaign] using tenant key for', tenantId)
      } else if (debug) {
        console.log('[send-campaign] no tenant key, falling back to global')
      }
    }

    if (!apiKey) return res.status(500).json({ error: 'Brevo API key missing' })

    // Remove tenantId before sending payload to Brevo
    const payload = { ...body }
    delete payload.tenantId

    const resp = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    })

    if (debug) console.log('[send-campaign] response status', resp.status)
    return res.status(resp.status).json(resp.data)
  } catch (err) {
    console.error('[send-campaign] error', err.response?.data || err.message || err)
    if (debug) return res.status(500).json({ error: err.response?.data || err.message || 'send failed' })
    return res.status(500).json({ error: 'send failed' })
  }
}
