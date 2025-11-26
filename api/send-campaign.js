import axios from 'axios'
import admin from './firebaseAdmin.js'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

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
  console.log('[send-campaign] entry method=%s', req.method)

  if (req.method !== 'POST') return res.status(405).end('Method not allowed')

  try {
    const body = req.body || {}
    // summarize body for debug (avoid logging recipient emails or full content)
    if (debug) console.log('[send-campaign] body (full)', body)
    console.log('[send-campaign] body summary subject=%s hasHtml=%s hasTo=%s', body.subject || '<no-subject>', !!body.htmlContent || !!body.html, !!body.to)

    // If tenantId provided, try to load tenant-specific key from Firestore
    let apiKey = process.env.BREVO_API_KEY
    const tenantId = body.tenantId
    if (tenantId) {
      console.log('[send-campaign] tenantId provided=%s', tenantId)
      const settingsDoc = await db.collection('tenants').doc(tenantId).collection('settings').doc('secrets').get()
      let tenantKey = settingsDoc.exists ? settingsDoc.data()?.brevoApiKey : null
      if (tenantKey) {
        // try to decrypt if encrypted
        const maybe = tryDecrypt(tenantKey)
        if (maybe) {
          tenantKey = maybe
          console.log('[send-campaign] tenant key successfully decrypted for tenant=%s', tenantId)
        } else {
          console.log('[send-campaign] tenant key present but not decrypted (storing as plain?) for tenant=%s', tenantId)
        }
      }
      if (tenantKey) {
        apiKey = tenantKey
        console.log('[send-campaign] using tenant key for', tenantId)
      } else {
        console.log('[send-campaign] no tenant key found for tenant=%s, falling back to global', tenantId)
      }
    }

    if (!apiKey) return res.status(500).json({ error: 'Brevo API key missing' })

    // Remove tenantId before sending payload to Brevo
    const payload = { ...body }
    delete payload.tenantId

    const maskedKey = typeof apiKey === 'string' ? `${apiKey.slice(0,6)}...(${apiKey.length} chars)` : String(apiKey)
    console.log('[send-campaign] preparing send; maskedKey=%s', maskedKey)

    // If the key looks like an SMTP key (xsmtp / xsmtpsib), attempt SMTP relay fallback
    if (typeof apiKey === 'string' && (apiKey.startsWith('xsmtp') || apiKey.startsWith('xsmtpsib'))) {
      console.log('[send-campaign] detected SMTP key; using SMTP relay fallback')
      // Determine SMTP login: prefer tenant-specific `smtpLogin` field or env vars
      let smtpUser = process.env.BREVO_SMTP_LOGIN || process.env.BREVO_SMTP_USER || null
      try {
        // also try to read a tenant-level smtpLogin (settings doc)
        const settingsDoc = await db.collection('tenants').doc(tenantId).collection('settings').doc('secrets').get()
        if (settingsDoc.exists) {
          const s = settingsDoc.data() || {}
          if (!smtpUser && s.smtpLogin) smtpUser = s.smtpLogin
        }
      } catch (e) {
        // ignore
      }

      if (!smtpUser) {
        console.error('[send-campaign] SMTP key present but smtp user/login not found. Set BREVO_SMTP_LOGIN or tenant.settings.secrets.smtpLogin')
        return res.status(500).json({ error: 'SMTP login not configured for this tenant. Set BREVO_SMTP_LOGIN or tenant smtpLogin.' })
      }

      try {
        const transporter = nodemailer.createTransport({
          host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
          port: Number(process.env.BREVO_SMTP_PORT || 587),
          secure: false,
          auth: { user: smtpUser, pass: apiKey },
        })

        const mailOptions = {
          from: payload.sender && payload.sender.email ? `${payload.sender.name || ''} <${payload.sender.email}>` : 'no-reply@turmail-saas.vercel.app',
          to: Array.isArray(payload.to) ? payload.to.map(t => t.email).join(',') : (payload.to && payload.to.email) || '',
          subject: payload.subject || '',
          html: payload.htmlContent || payload.html || '',
        }

        const info = await transporter.sendMail(mailOptions)
        console.log('[send-campaign] SMTP send info', info && info.messageId)
        return res.status(201).json({ messageId: info && info.messageId })
      } catch (smtpErr) {
        console.error('[send-campaign] SMTP send failed', smtpErr && smtpErr.message)
        // fallthrough to try API below or return error
        return res.status(500).json({ error: 'SMTP send failed', detail: smtpErr && smtpErr.message })
      }
    }

    console.log('[send-campaign] sending to Brevo via REST API using api-key')
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
