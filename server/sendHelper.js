import axios from 'axios'
import admin from './firebaseAdmin.js'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { sendEmail } from './brevoMail.js'
import { renderTemplate } from './templateHelper.js'

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

function normalizeRecipients(raw) {
  // Accept: string email, object {email,name}, array of strings, array of objects
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.map(r => {
      if (!r) return null
      if (typeof r === 'string') return { email: r, name: '' }
      if (typeof r === 'object') return { email: r.email || r.value || '', name: r.name || r.label || '' }
      return null
    }).filter(Boolean)
  }
  if (typeof raw === 'string') return [{ email: raw, name: '' }]
  if (typeof raw === 'object') return [{ email: raw.email || raw.value || '', name: raw.name || raw.label || '' }]
  return []
}

export async function sendUsingBrevoOrSmtp({ tenantId, payload }) {
  const debug = process.env.DEBUG_SEND === 'true'
  if (debug) console.log('[sendHelper] start', { tenantId, campaignId: payload && payload.campaignId, hasTemplate: !!payload.templateId })

  // Use global Brevo API key from Vercel environment variables
  const apiKey = process.env.BREVO_API_KEY
  
  if (!apiKey) {
    console.error('[sendHelper] Global Brevo API key missing in environment variables')
    throw new Error('Brevo API key not configured. Please set BREVO_API_KEY in Vercel environment variables.')
  }

  // CHECK EMAIL LIMITS BEFORE SENDING
  if (tenantId) {
    try {
      // Load subscription to check limits
      const subsRef = db.collection('subscriptions')
      const subsQuery = await subsRef.where('tenantId', '==', tenantId).limit(1).get()
      
      if (!subsQuery.empty) {
        const subscription = subsQuery.docs[0].data()
        
        // Import limits checker
        const { checkDailyEmailLimit, checkTrialStatus } = await import('./lib/plans.js')
        
        // Check if trial expired
        if (subscription.status === 'trial') {
          const trialStatus = checkTrialStatus(subscription)
          if (trialStatus.expired) {
            const err = new Error('Trial expirado. Faça upgrade para continuar enviando emails.')
            err.code = 'trial_expired'
            throw err
          }
        }
        
        // Calculate email count
        const recipients = normalizeRecipients(payload.to)
        const emailCount = recipients.length
        
        // Check daily limit
        const limitCheck = await checkDailyEmailLimit(tenantId, subscription, emailCount)
        if (!limitCheck.allowed) {
          const err = new Error(limitCheck.message)
          err.code = 'daily_limit_exceeded'
          err.limit = limitCheck.limit
          err.current = limitCheck.current
          throw err
        }
        
        if (debug) console.log('[sendHelper] limit check passed', limitCheck)
      }
    } catch (e) {
      // Re-throw limit errors
      if (e.code === 'trial_expired' || e.code === 'daily_limit_exceeded') {
        throw e
      }
      if (debug) console.warn('[sendHelper] failed to check limits', e)
    }
  }

  // Load tenant-specific sender configuration (fromEmail and fromName)
  let tenantFromEmail = process.env.DEFAULT_FROM_EMAIL || ''
  let tenantFromName = process.env.DEFAULT_FROM_NAME || ''
  let smtpLogin = process.env.BREVO_SMTP_LOGIN || process.env.BREVO_SMTP_USER || null

  if (tenantId) {
    try {
      const secretsSnap = await db.collection('tenants').doc(tenantId).collection('settings').doc('secrets').get()
      if (secretsSnap.exists) {
        const secrets = secretsSnap.data() || {}
        // Use tenant-specific sender configuration if available
        if (secrets.fromEmail) tenantFromEmail = secrets.fromEmail
        if (secrets.fromName) tenantFromName = secrets.fromName
        if (secrets.smtpLogin) smtpLogin = secrets.smtpLogin
      }
    } catch (e) {
      if (debug) console.warn('[sendHelper] failed to load tenant settings', e)
    }
  }

  // Store tenant sender info for later use
  payload._tenantFromEmail = tenantFromEmail
  payload._tenantFromName = tenantFromName

  // Validate / normalize sender
  function isValidEmail(e) {
    return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
  }

  const defaultFromEmail = payload._tenantFromEmail || ''
  const defaultFromName = payload._tenantFromName || ''

  // ensure payload.sender exists and has a valid email; otherwise fallback
  payload = payload || {}
  payload.sender = payload.sender || {}
  
  // Wrap HTML content into canonical template (adds preheader, responsive styles)
  try {
    payload.htmlContent = renderTemplate(payload.htmlContent || payload.html || '', payload.subject || '', payload.preheader || '')
  } catch (e) {
    if (debug) console.warn('[sendHelper] template render failed, using raw html', e && (e.message || e))
    payload.htmlContent = payload.htmlContent || payload.html || ''
  }
  
  if (!isValidEmail(payload.sender.email)) {
    if (isValidEmail(defaultFromEmail)) {
      if (debug) console.log('[sendHelper] using default fromEmail:', defaultFromEmail)
      payload.sender.email = defaultFromEmail
      payload.sender.name = defaultFromName || payload.sender.name || ''
    } else {
      console.error('[sendHelper] No valid sender email configured', { tenantId, defaultFromEmail })
      const err = new Error('Sender email not configured. Please set DEFAULT_FROM_EMAIL in Vercel environment variables or configure in tenant settings.')
      err.code = 'missing_sender_email'
      throw err
    }
  }

  // If sender name is still missing, try to infer from tenant owner or payload ownerUid
  if (!payload.sender.name || String(payload.sender.name).trim() === '') {
    try {
      let ownerUid = null
      if (tenantId) {
        const tenantDoc = await db.collection('tenants').doc(tenantId).get()
        if (tenantDoc.exists) ownerUid = tenantDoc.data()?.ownerUid || null
      }
      if (!ownerUid && payload && payload.ownerUid) ownerUid = payload.ownerUid
      if (ownerUid) {
        const userDoc = await db.collection('users').doc(ownerUid).get()
        if (userDoc.exists) {
          const u = userDoc.data() || {}
          const companyName = (u.company && u.company.name) || u.companyName || u.displayName || ''
          if (companyName) payload.sender.name = companyName
        }
      }
    } catch (e) {
      if (debug) console.warn('[sendHelper] failed to infer sender name from tenant/user', e)
    }
  }
  // SMTP mode: only used if API key starts with xsmtp (deprecated, kept for backwards compatibility)
  if (typeof apiKey === 'string' && (apiKey.startsWith('xsmtp') || apiKey.startsWith('xsmtpsib'))) {
    if (debug) console.log('[sendHelper] using SMTP fallback (xsmtp key)', { tenantId })

    if (!smtpLogin) {
      console.error('[sendHelper] SMTP login not configured', tenantId)
      throw new Error('SMTP login not configured. Please set BREVO_SMTP_LOGIN in environment variables or configure in tenant settings.')
    }

    const transporter = nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
      port: Number(process.env.BREVO_SMTP_PORT || 587),
      secure: false,
      auth: { user: smtpLogin, pass: apiKey },
    })

    // If payload contains placeholders ({{name}} etc.) and there are multiple recipients,
    // send personalized messages per-recipient.
    const recipients = normalizeRecipients(payload.to)
    if (recipients.length > 1 && /{{\s*\w+\s*}}/.test(payload.htmlContent || payload.html || '')) {
      const results = []
      for (const r of recipients) {
        try {
          const html = replacePlaceholders(payload.htmlContent || payload.html || '', r, payload.params)
          const subject = replacePlaceholders(payload.subject || '', r, payload.params)
          const mailOptions = {
            from: payload.sender && payload.sender.email ? `${payload.sender.name || ''} <${payload.sender.email}>` : `no-reply@${process.env.DEFAULT_HOST || 'localhost'}`,
            to: r.email,
            subject,
            html,
          }
          if (debug) console.log('[sendHelper][smtp] sending to', r.email)
          const info = await transporter.sendMail(mailOptions)
          results.push({ to: r.email, status: 201, messageId: info && info.messageId })
        } catch (e) {
          console.error('[sendHelper][smtp] send error for', r.email, e && (e.response || e.message || e))
          results.push({ to: r.email, status: 500, error: e && (e.response?.data || e.message || String(e)) })
        }
      }
      return { status: 207, data: { results } }
    }

    // Batch send without personalization
    try {
      const mailOptions = {
        from: payload.sender && payload.sender.email ? `${payload.sender.name || ''} <${payload.sender.email}>` : `no-reply@${process.env.DEFAULT_HOST || 'localhost'}`,
        to: recipients.map(r => r.email).join(','),
        subject: payload.subject || '',
        html: payload.htmlContent || payload.html || '',
      }
      if (debug) console.log('[sendHelper][smtp] sending batch to', mailOptions.to)
      const info = await transporter.sendMail(mailOptions)
      return { status: 201, data: { messageId: info && info.messageId } }
    } catch (e) {
      console.error('[sendHelper][smtp] send batch error', e && (e.response || e.message || e))
      throw e
    }
  }

  try {
    const recipients = normalizeRecipients(payload.to)
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
        if (debug) console.log('[sendHelper] sending personalized via Brevo to', r.email, { idem })
        try {
          const resp = await sendEmail({ apiKey, payload: personalized, idempotencyKey: idem })
          results.push({ to: r.email, status: resp.status, data: resp.data })
        } catch (e) {
          console.error('[sendHelper] brevo send error for', r.email, e && (e.response?.data || e.message || e))
          results.push({ to: r.email, status: e?.response?.status || 500, error: e && (e.response?.data || e.message || String(e)) })
        }
      }
      return { status: 207, data: { results } }
    }

    const idempotencyKey = (payload && payload.headers && payload.headers['Idempotency-Key']) || payload.idempotencyKey || undefined
    if (debug) console.log('[sendHelper] sending via Brevo', { to: recipients.map(r => r.email).slice(0,5), idempotencyKey })
    const resp = await sendEmail({ apiKey, payload, idempotencyKey })
    
    // Increment email counter after successful send
    if (tenantId && resp && resp.status === 201) {
      try {
        const { incrementDailyEmailCount } = await import('./lib/plans.js')
        await incrementDailyEmailCount(tenantId, recipients.length)
        if (debug) console.log('[sendHelper] incremented email counter', { tenantId, count: recipients.length })
      } catch (e) {
        if (debug) console.warn('[sendHelper] failed to increment counter', e)
      }
    }
    
    return { status: resp.status, data: resp.data }
  } catch (err) {
    console.error('[sendHelper] unexpected error', err && (err.response?.data || err.message || err))
    if (err?.cause?.response?.data) throw err.cause
    throw err
  }
}

export { normalizeRecipients }

export default { sendUsingBrevoOrSmtp }
