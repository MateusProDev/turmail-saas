export default async function handler(req, res) {
  const debug = process.env.DEBUG_API === 'true' || process.env.DEBUG_SEND === 'true'
  if (debug) console.log('[send-campaign] invoked', { method: req.method, bodySnippet: { campaignId: req.body?.campaignId, tenantId: req.body?.tenantId } })

  if (req.method !== 'POST') return res.status(405).end('Method not allowed')

  const body = req.body || {}
  let tenantId = body.tenantId
  let payload = { ...body }
  delete payload.tenantId

  // If caller provided a campaignId but not full payload, try to load campaign doc
  const campaignId = body.campaignId
  let docRef
  let admin
  let db
  if (campaignId) {
    try {
      admin = (await import('../firebaseAdmin.js')).default
      db = admin.firestore()
      docRef = db.collection('campaigns').doc(campaignId)
      const docSnap = await docRef.get()
      if (docSnap.exists) {
        const data = docSnap.data() || {}
        // If payload missing essential fields, fill from stored campaign
        if (!payload.subject) payload.subject = data.subject
        if (!payload.htmlContent) payload.htmlContent = data.htmlContent
        if (!payload.to) payload.to = data.to
        if (!tenantId && data.tenantId) tenantId = data.tenantId
          // ensure ownerUid is available for fallback key lookup
          if (!payload.ownerUid && data.ownerUid) payload.ownerUid = data.ownerUid
        if (!payload.sender) payload.sender = data.sender || { name: process.env.DEFAULT_FROM_NAME || 'No Reply', email: process.env.DEFAULT_FROM_EMAIL || `no-reply@${process.env.DEFAULT_HOST || 'localhost'}` }
      }
    } catch (e) {
      console.error('[send-campaign] failed loading campaign doc', e)
    }
  }

  // Basic validation: must have either `to` or `templateId` and a sender email
  // Normalize recipients early for validation and logging
  try {
    const { normalizeRecipients } = await import('../sendHelper.js')
    payload.to = normalizeRecipients(payload.to)
  } catch (e) {
    if (debug) console.warn('[send-campaign] failed to normalize recipients', e)
  }

  if ((!payload.to || (Array.isArray(payload.to) && payload.to.length === 0)) && !payload.templateId) {
    return res.status(400).json({ error: 'Missing recipients (`to`) or `templateId`' })
  }
  const senderEmail = payload.sender && (payload.sender.email || payload.sender)
  if (!senderEmail && !process.env.DEFAULT_FROM_EMAIL) {
    return res.status(400).json({ error: 'Missing sender email (set in payload.sender or DEFAULT_FROM_EMAIL env)' })
  }

  try {
    // If the campaign doc contains an idempotencyKey, prefer that
    if (campaignId && db && docRef) {
      try {
        const docSnap = await docRef.get()
        if (docSnap.exists) {
          const data = docSnap.data() || {}
          if (data.idempotencyKey) {
            payload.idempotencyKey = payload.idempotencyKey || data.idempotencyKey
          }
        }
      } catch (e) {
        // continue without persisted idempotencyKey
      }
    }

    // Lazy-import send helper to avoid Admin SDK initialization at module import time
    let sendUsingBrevoOrSmtp
    try {
      const sh = await import('../sendHelper.js')
      sendUsingBrevoOrSmtp = sh.sendUsingBrevoOrSmtp || sh.default?.sendUsingBrevoOrSmtp || sh.default
    } catch (e) {
      console.error('[send-campaign] failed to import send helper', e)
      return res.status(500).json({ error: 'server configuration error: send helper not available' })
    }

    if (debug) console.log('[send-campaign] sending', { tenantId, campaignId, to: Array.isArray(payload.to) ? payload.to.map(t=>t.email).slice(0,5) : payload.to })
    const result = await sendUsingBrevoOrSmtp({ tenantId, payload })
    if (debug) console.log('[send-campaign] send result', result && result.status, result && (result.data || result))

    // Persist result on campaign doc if present (store httpStatus and responseBody when available)
    if (campaignId && db && docRef) {
      try {
        const docSnap = await docRef.get()
        const updates = { attempts: (docSnap.exists && docSnap.data().attempts ? docSnap.data().attempts + 1 : 1), updatedAt: admin.firestore.FieldValue.serverTimestamp() }
        if (result) {
          updates.httpStatus = result.status || null
          try { updates.responseBody = result.data ? (typeof result.data === 'object' ? result.data : String(result.data)) : null } catch(e){ updates.responseBody = String(result.data) }
          if (result.data && result.data.messageId) updates.messageId = result.data.messageId
          updates.result = result.data
        }
        // Save tenant sender info for display
        if (payload._tenantFromEmail) updates._tenantFromEmail = payload._tenantFromEmail
        if (payload._tenantFromName) updates._tenantFromName = payload._tenantFromName
        updates.status = 'sent'
        await docRef.update(updates).catch(e => console.error('Failed updating campaign doc after send:', e))
      } catch (e) {
        console.error('Error persisting campaign result:', e)
      }
    }

    return res.status(result.status || 200).json(result.data || {})
  } catch (err) {
    console.error('[send-campaign] error', err && (err.response?.data || err.message || err))
    // If campaign doc present, mark failed and persist error (include response body if available)
    if (campaignId && db && docRef) {
      try {
        const errorPayload = (err && (err.response?.data || err.message)) || String(err)
        const statusCode = err?.response?.status || 500
        await docRef.update({ status: 'failed', updatedAt: admin.firestore.FieldValue.serverTimestamp(), attempts: admin.firestore.FieldValue.increment(1), error: errorPayload, httpStatus: statusCode, responseBody: err?.response?.data || null }).catch(()=>{})
      } catch (e) {
        console.error('Failed persisting failure to campaign doc', e)
      }
    }
    return res.status(500).json({ error: err.message || 'send failed' })
  }
}
