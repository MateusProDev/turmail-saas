import admin from '../firebaseAdmin.js'
import { nanoid } from 'nanoid'
// send helper will be lazy-imported when needed to avoid Admin SDK init on import

const db = admin.firestore()

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed')

  try {
    const body = req.body || {}
    // basic validation
    const { tenantId, subject, htmlContent, to, scheduledAt, ownerUid, sendImmediate } = body
    // optional metadata from frontend
    const { companyName, productName, destination, ctaLink, mainTitle, tone, vertical, description, previousExperience, audience, keyBenefits } = body
    if (!subject || !htmlContent) return res.status(400).json({ error: 'subject and htmlContent are required' })

    const id = `camp_${nanoid(10)}`
    // Generate an idempotency key for this campaign so retries use the same key
    const idempotencyKey = body.idempotencyKey || `camp-${id}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`
    const docRef = db.collection('campaigns').doc(id)
    // build document only with provided fields to avoid creating empty/null fields
    const doc = {
      subject,
      htmlContent,
      idempotencyKey,
      status: 'queued',
      attempts: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }
    if (tenantId) doc.tenantId = tenantId
    if (ownerUid) doc.ownerUid = ownerUid
    if (to) doc.to = to
    if (scheduledAt) {
      doc.scheduledAt = admin.firestore.Timestamp.fromDate(new Date(scheduledAt))
    }
    // attach optional metadata if provided
    if (companyName) doc.companyName = companyName
    if (productName) doc.productName = productName
    if (destination) doc.destination = destination
    if (ctaLink) doc.ctaLink = ctaLink
    if (mainTitle) doc.mainTitle = mainTitle
    if (tone) doc.tone = tone
    if (vertical) doc.vertical = vertical
    if (description) doc.description = description
    if (previousExperience) doc.previousExperience = previousExperience
    if (audience) doc.audience = audience
    if (keyBenefits) doc.keyBenefits = keyBenefits
    // persist sender info if provided (name/email) so we can review and reuse
    if (body.sender) doc.sender = body.sender

    await docRef.set(doc)

    // If caller requested immediate send, attempt to send now and persist results
    let finalAction = sendImmediate ? 'sent' : 'queued'
    if (sendImmediate) {
      try {
        // Normalize recipients before sending
        let normalizedTo = to
        try {
          const { normalizeRecipients } = await import('../server/sendHelper.js')
          normalizedTo = normalizeRecipients(to)
        } catch (e) {
          console.warn('[create-campaign] failed to normalize recipients', e)
        }

        const defaultSender = { name: process.env.DEFAULT_FROM_NAME || 'No Reply', email: process.env.DEFAULT_FROM_EMAIL || `no-reply@${process.env.DEFAULT_HOST || 'localhost'}` }
        const payload = { tenantId, subject, htmlContent, to: normalizedTo, campaignId: id, sender: body.sender || defaultSender, idempotencyKey }
        let sendUsingBrevoOrSmtp
        try {
          const sh = await import('../server/sendHelper.js')
          sendUsingBrevoOrSmtp = sh.sendUsingBrevoOrSmtp || sh.default?.sendUsingBrevoOrSmtp || sh.default
        } catch (e) {
          console.error('[create-campaign] failed to import send helper', e)
          throw new Error('server misconfiguration: send helper not available')
        }

        const result = await sendUsingBrevoOrSmtp({ tenantId, payload })
        const updates = { attempts: 1, updatedAt: admin.firestore.FieldValue.serverTimestamp(), status: 'sent' }
        if (result && result.data) {
          updates.result = result.data
          if (result.data.messageId) updates.messageId = result.data.messageId
        }
        await docRef.update(updates).catch(e => console.error('Failed updating campaign doc after immediate send:', e))
        finalAction = 'sent'
      } catch (e) {
        console.error('[create-campaign] immediate send failed', e)
        await docRef.update({ status: 'failed', updatedAt: admin.firestore.FieldValue.serverTimestamp(), attempts: admin.firestore.FieldValue.increment(1), error: (e && (e.response?.data || e.message)) || String(e) }).catch(()=>{})
        finalAction = 'failed'
      }
    }

    return res.status(201).json({ id, action: finalAction })
  } catch (err) {
    console.error('[create-campaign] error', err)
    return res.status(500).json({ error: 'failed to create campaign' })
  }
}
