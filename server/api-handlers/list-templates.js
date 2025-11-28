import admin from '../server/firebaseAdmin.js'
import axios from 'axios'
import crypto from 'crypto'

const db = admin.firestore()
const ENC_KEY = process.env.TENANT_ENCRYPTION_KEY || ''

function tryDecrypt(val) {
  if (!val) return null
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
    return val
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end('Method not allowed')
  try {
    const tenantId = req.query?.tenantId || null
    let apiKey = process.env.BREVO_API_KEY
    if (tenantId) {
      const settingsDoc = await db.collection('tenants').doc(tenantId).collection('settings').doc('secrets').get()
      let tenantKey = settingsDoc.exists ? settingsDoc.data()?.brevoApiKey : null
      if (tenantKey) {
        const maybe = tryDecrypt(tenantKey)
        if (maybe) tenantKey = maybe
      }
      if (tenantKey) apiKey = tenantKey
    }
    if (!apiKey) return res.status(400).json({ error: 'Brevo API key missing' })

    const resp = await axios.get('https://api.brevo.com/v3/smtp/templates', { headers: { 'api-key': apiKey } })
    return res.status(200).json({ ok: true, templates: resp.data })
  } catch (err) {
    console.error('[list-templates] error', err?.response?.data || err.message || err)
    return res.status(500).json({ ok: false, error: err?.response?.data || err.message || 'failed' })
  }
}
