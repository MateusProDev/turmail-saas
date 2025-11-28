import admin from '../firebaseAdmin.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed')

  const debug = process.env.DEBUG_SEND === 'true' || process.env.DEBUG_API === 'true'
  // Accept either Vercel's Authorization: Bearer <CRON_SECRET>, or custom x-process-secret header
  const secretEnv = process.env.PROCESS_CRON_SECRET || process.env.CRON_SECRET || ''
  const providedHeader = (req.headers['x-process-secret'] || req.headers['X-Process-Secret'] || '')
  const authHeader = (req.headers['authorization'] || req.headers['Authorization'] || '')
  const providedBearer = (typeof authHeader === 'string' && authHeader.trim().toLowerCase().startsWith('bearer ')) ? authHeader.trim().slice(7) : ''

  if (!debug && secretEnv) {
    if (!providedHeader && !providedBearer) {
      return res.status(401).json({ error: 'Unauthorized: missing process secret' })
    }
    if (providedHeader && providedHeader !== secretEnv) return res.status(401).json({ error: 'Unauthorized: invalid process secret header' })
    if (providedBearer && providedBearer !== secretEnv) return res.status(401).json({ error: 'Unauthorized: invalid bearer token' })
  } else if (!debug && !secretEnv) {
    return res.status(403).json({ error: 'Processing endpoint disabled: set PROCESS_CRON_SECRET or enable DEBUG_SEND' })
  }

  try {
    const db = admin.firestore()
    const now = admin.firestore.Timestamp.now()
    const q = db.collection('campaigns')
      .where('status', '==', 'queued')
      .where('scheduledAt', '<=', now)
      .limit(100)

    const snap = await q.get()
    if (snap.empty) return res.status(200).json({ processed: 0, message: 'nothing to process' })

    let sendUsingBrevoOrSmtp
    try {
      const sh = await import('../server/sendHelper.js')
      sendUsingBrevoOrSmtp = sh.sendUsingBrevoOrSmtp || sh.default?.sendUsingBrevoOrSmtp || sh.default
    } catch (e) {
      console.error('[process-queued-campaigns] failed to import sendHelper', e)
      return res.status(500).json({ error: 'server misconfiguration: send helper not available' })
    }

    const results = []
    for (const doc of snap.docs) {
      const id = doc.id
      const data = doc.data() || {}
      const docRef = db.collection('campaigns').doc(id)
      try {
        const payload = {
          tenantId: data.tenantId,
          subject: data.subject,
          htmlContent: data.htmlContent,
          to: data.to,
          campaignId: id,
          sender: data.sender || { name: process.env.DEFAULT_FROM_NAME || 'No Reply', email: process.env.DEFAULT_FROM_EMAIL || `no-reply@${process.env.DEFAULT_HOST || 'localhost'}` },
          idempotencyKey: data.idempotencyKey
        }
        const result = await sendUsingBrevoOrSmtp({ tenantId: data.tenantId, payload })
        const updates = {
          status: 'sent',
          attempts: (data.attempts || 0) + 1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          httpStatus: result.status || null,
          responseBody: result.data || null,
          result: result.data || null,
        }
        if (result.data && result.data.messageId) updates.messageId = result.data.messageId
        await docRef.update(updates)
        results.push({ id, status: 'sent', httpStatus: result.status })
      } catch (e) {
        console.error('[process-queued-campaigns] send failed for', id, e && (e.response?.data || e.message || e))
        try {
          await docRef.update({ status: 'failed', attempts: admin.firestore.FieldValue.increment(1), updatedAt: admin.firestore.FieldValue.serverTimestamp(), error: (e && (e.response?.data || e.message)) || String(e), httpStatus: e?.response?.status || 500, responseBody: e?.response?.data || null })
        } catch (u) {
          console.error('[process-queued-campaigns] failed to persist failure', id, u)
        }
        results.push({ id, status: 'failed', error: e && (e.response?.data || e.message || String(e)) })
      }
    }

    return res.status(200).json({ processed: results.length, results })
  } catch (err) {
    console.error('[process-queued-campaigns] handler error', err)
    return res.status(500).json({ error: 'processing failed', details: err && (err.message || String(err)) })
  }
}

export const config = { runtime: 'nodejs' }
