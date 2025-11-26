import { sendUsingBrevoOrSmtp } from '../server/sendHelper.js'

export default async function handler(req, res) {
  const debug = process.env.DEBUG_API === 'true'
  if (debug) console.log('[send-campaign] invoked', { method: req.method })

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
      admin = (await import('../server/firebaseAdmin.js')).default
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
        if (!payload.sender) payload.sender = data.sender || { name: process.env.DEFAULT_FROM_NAME || 'No Reply', email: process.env.DEFAULT_FROM_EMAIL || `no-reply@${process.env.DEFAULT_HOST || 'localhost'}` }
      }
    } catch (e) {
      console.error('[send-campaign] failed loading campaign doc', e)
    }
  }

  try {
    const result = await sendUsingBrevoOrSmtp({ tenantId, payload })
    if (debug) console.log('[send-campaign] send result', result && result.status)

    // Persist result on campaign doc if present
    if (campaignId && db && docRef) {
      try {
        const docSnap = await docRef.get()
        const updates = { attempts: (docSnap.exists && docSnap.data().attempts ? docSnap.data().attempts + 1 : 1), updatedAt: admin.firestore.FieldValue.serverTimestamp() }
        if (result && result.data) {
          updates.result = result.data
          if (result.data.messageId) updates.messageId = result.data.messageId
        }
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
        await docRef.update({ status: 'failed', updatedAt: admin.firestore.FieldValue.serverTimestamp(), attempts: admin.firestore.FieldValue.increment(1), error: errorPayload }).catch(()=>{})
      } catch (e) {
        console.error('Failed persisting failure to campaign doc', e)
      }
    }
    return res.status(500).json({ error: err.message || 'send failed' })
  }
}
