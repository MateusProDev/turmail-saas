import { sendUsingBrevoOrSmtp } from './sendHelper.js'

export default async function handler(req, res) {
  const debug = process.env.DEBUG_API === 'true'
  if (debug) console.log('[send-campaign] invoked', { method: req.method })

  if (req.method !== 'POST') return res.status(405).end('Method not allowed')

  try {
    const body = req.body || {}
    const tenantId = body.tenantId
    const payload = { ...body }
    delete payload.tenantId
    const result = await sendUsingBrevoOrSmtp({ tenantId, payload })
    if (debug) console.log('[send-campaign] send result', result.status)

    // If this request is associated with a campaign doc, persist result
    try {
      const campaignId = body.campaignId
      if (campaignId) {
        const admin = (await import('./firebaseAdmin.js')).default
        const db = admin.firestore()
        const docRef = db.collection('campaigns').doc(campaignId)
        const doc = await docRef.get()
        const updates = { attempts: (doc.exists && doc.data().attempts ? doc.data().attempts + 1 : 1), updatedAt: admin.firestore.FieldValue.serverTimestamp() }
        if (result && result.data) {
          updates.result = result.data
          if (result.data.messageId) updates.messageId = result.data.messageId
        }
        updates.status = 'sent'
        await docRef.update(updates).catch(e => console.error('Failed updating campaign doc after send:', e))
      }
    } catch (e) {
      console.error('Error persisting campaign result:', e)
    }

    return res.status(result.status).json(result.data)
  } catch (err) {
    console.error('[send-campaign] error', err && (err.response?.data || err.message || err))
    return res.status(500).json({ error: err.message || 'send failed' })
  }
}
