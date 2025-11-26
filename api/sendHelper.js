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

export async function sendUsingBrevoOrSmtp({ tenantId, payload }) {
  // Determine api key: prefer tenant key if present
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

  // If key looks like SMTP, do SMTP relay using nodemailer
  if (typeof apiKey === 'string' && (apiKey.startsWith('xsmtp') || apiKey.startsWith('xsmtpsib'))) {
    // find smtp login
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

    const mailOptions = {
      from: payload.sender && payload.sender.email ? `${payload.sender.name || ''} <${payload.sender.email}>` : `no-reply@${process.env.DEFAULT_HOST || 'localhost'}`,
      to: Array.isArray(payload.to) ? payload.to.map(t => t.email).join(',') : (payload.to && payload.to.email) || '',
      subject: payload.subject || '',
      html: payload.htmlContent || payload.html || '',
    }

    const info = await transporter.sendMail(mailOptions)
    return { status: 201, data: { messageId: info && info.messageId } }
  }

  // Otherwise use Brevo REST API via brevoMail (retries + idempotency)
  try {
    const idempotencyKey = (payload && payload.headers && payload.headers['Idempotency-Key']) || payload.idempotencyKey || undefined
    const resp = await sendEmail({ apiKey, payload, idempotencyKey })
    return { status: resp.status, data: resp.data }
  } catch (err) {
    // normalize axios-like errors
    if (err?.cause?.response?.data) throw err.cause
    throw err
  }
}
