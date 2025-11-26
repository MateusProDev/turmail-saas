import axios from 'axios'
import admin from './firebaseAdmin.js'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { sendEmail } from './brevoMail.js'

const db = admin.firestore()
const ENC_KEY = process.env.TENANT_ENCRYPTION_KEY || ''

function tryDecrypt(val) {
  if (!val) return null
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : null
    // Expect envelope format: { iv, tag, data } (base64 strings)
    if (!parsed || !parsed.iv || !parsed.tag || !parsed.data) return val
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

function replacePlaceholders(template = '', recipient = {}, params = {}){
  if (!template) return template
  let out = String(template)
  const data = { ...(params || {}), ...(recipient || {}) }
  // common keys: name, email
  out = out.replace(/{{\s*name\s*}}/gi, recipient.name || recipient.email || '')
  out = out.replace(/{{\s*email\s*}}/gi, recipient.email || '')
  // replace any params provided
  Object.keys(params || {}).forEach(k => {
    const re = new RegExp('{{\\s*' + k + '\\s*}}', 'gi')
    out = out.replace(re, String(params[k] ?? ''))
  })
  return out
}

export async function sendUsingBrevoOrSmtp({ tenantId, payload }) {
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

  if (!apiKey) throw new Error('Brevo API key missing')

  if (typeof apiKey === 'string' && (apiKey.startsWith('xsmtp') || apiKey.startsWith('xsmtpsib'))) {
    let smtpUser = process.env.BREVO_SMTP_LOGIN || process.env.BREVO_SMTP_USER || null
    try {
      if (tenantId) {
        const settingsDoc = await db.collection('tenants').doc(tenantId).collection('settings').doc('secrets').get()
        if (settingsDoc.exists) {
          const s = settingsDoc.data() || {}
          if (!smtpUser && s.smtpLogin) smtpUser = s.smtpLogin
        }
        if (!smtpUser) {
          const tenantDoc = await db.collection('tenants').doc(tenantId).get()
          const ownerUid = tenantDoc.exists ? tenantDoc.data()?.ownerUid : null
          if (ownerUid) {
            const memberDoc = await db.collection('tenants').doc(tenantId).collection('members').doc(ownerUid).get()
            if (memberDoc.exists) {
              const m = memberDoc.data() || {}
              if (m.smtpLogin) smtpUser = m.smtpLogin
            }
          }
        }
      }
    } catch (e) {}

    if (!smtpUser) throw new Error('SMTP login not configured for this tenant')

    const transporter = nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
      port: Number(process.env.BREVO_SMTP_PORT || 587),
      secure: false,
      auth: { user: smtpUser, pass: apiKey },
    })

    // If payload contains placeholders ({{name}} etc.) and there are multiple recipients,
    // send personalized messages per-recipient.
    const recipients = Array.isArray(payload.to) ? payload.to : (payload.to ? [payload.to] : [])
    if (recipients.length > 1 && /{{\s*\w+\s*}}/.test(payload.htmlContent || payload.html || '')) {
      const results = []
      for (const r of recipients) {
        const html = replacePlaceholders(payload.htmlContent || payload.html || '', r, payload.params)
        const subject = replacePlaceholders(payload.subject || '', r, payload.params)
        const mailOptions = {
          from: payload.sender && payload.sender.email ? `${payload.sender.name || ''} <${payload.sender.email}>` : `no-reply@${process.env.DEFAULT_HOST || 'localhost'}`,
          to: r.email,
          subject,
          html,
        }
        const info = await transporter.sendMail(mailOptions)
        results.push({ to: r.email, status: 201, messageId: info && info.messageId })
      }
      return { status: 207, data: { results } }
    }

    const mailOptions = {
      from: payload.sender && payload.sender.email ? `${payload.sender.name || ''} <${payload.sender.email}>` : `no-reply@${process.env.DEFAULT_HOST || 'localhost'}`,
      to: Array.isArray(payload.to) ? payload.to.map(t => t.email).join(',') : (payload.to && payload.to.email) || '',
      subject: payload.subject || '',
      html: payload.htmlContent || payload.html || '',
    }

    const info = await transporter.sendMail(mailOptions)
    return { status: 201, data: { messageId: info && info.messageId } }
  }

  try {
    const recipients = Array.isArray(payload.to) ? payload.to : (payload.to ? [payload.to] : [])
    const hasPlaceholders = /{{\s*\w+\s*}}/.test(payload.htmlContent || payload.html || '')

    // If placeholders present and multiple recipients, send individualized messages
    if (recipients.length > 1 && hasPlaceholders) {
      const results = []
      let idx = 0
      for (const r of recipients) {
        idx += 1
        const personalized = { ...payload }
        personalized.to = r
        personalized.htmlContent = replacePlaceholders(payload.htmlContent || payload.html || '', r, payload.params)
        personalized.subject = replacePlaceholders(payload.subject || '', r, payload.params)
        // generate per-recipient idempotency key
        const baseIdem = payload.idempotencyKey || payload.idempotency || undefined
        const idem = baseIdem ? `${baseIdem}-${encodeURIComponent(r.email)}` : undefined
        const resp = await sendEmail({ apiKey, payload: personalized, idempotencyKey: idem })
        results.push({ to: r.email, status: resp.status, data: resp.data })
      }
      return { status: 207, data: { results } }
    }

    const idempotencyKey = (payload && payload.headers && payload.headers['Idempotency-Key']) || payload.idempotencyKey || undefined
    const resp = await sendEmail({ apiKey, payload, idempotencyKey })
    return { status: resp.status, data: resp.data }
  } catch (err) {
    if (err?.cause?.response?.data) throw err.cause
    throw err
  }
}

export default { sendUsingBrevoOrSmtp }
