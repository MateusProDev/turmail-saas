#!/usr/bin/env node
import admin from '../server/firebaseAdmin.js'

async function main(){
  const debug = process.env.DEBUG_SEND === 'true' || process.env.DEBUG_API === 'true'
  const db = admin.firestore()
  const now = admin.firestore.Timestamp.now()

  console.log('[process-queued-campaigns] starting', { now: now.toDate().toISOString() })

  try {
    const q = db.collection('campaigns')
      .where('status', '==', 'queued')
      .where('scheduledAt', '<=', now)
      .limit(50)

    const snap = await q.get()
    if (snap.empty) {
      console.log('[process-queued-campaigns] nothing to process')
      return process.exit(0)
    }

    // lazy import of send helper
    let sendUsingBrevoOrSmtp
    try {
      const sh = await import('../server/sendHelper.js')
      sendUsingBrevoOrSmtp = sh.sendUsingBrevoOrSmtp || sh.default?.sendUsingBrevoOrSmtp || sh.default
    } catch (e) {
      console.error('[process-queued-campaigns] failed to import sendHelper', e)
      return process.exit(2)
    }

    for (const doc of snap.docs) {
      const id = doc.id
      const data = doc.data() || {}
      console.log('[process-queued-campaigns] processing', id, { tenantId: data.tenantId, toCount: (data.to||[]).length })
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
        console.log('[process-queued-campaigns] sent', id, { httpStatus: result.status })
      } catch (e) {
        console.error('[process-queued-campaigns] send failed for', id, e && (e.response?.data || e.message || e))
        try {
          await docRef.update({ status: 'failed', attempts: admin.firestore.FieldValue.increment(1), updatedAt: admin.firestore.FieldValue.serverTimestamp(), error: (e && (e.response?.data || e.message)) || String(e), httpStatus: e?.response?.status || 500, responseBody: e?.response?.data || null })
        } catch (u) {
          console.error('[process-queued-campaigns] failed to persist failure', id, u)
        }
      }
    }

    console.log('[process-queued-campaigns] done')
    process.exit(0)
  } catch (err) {
    console.error('[process-queued-campaigns] error', err)
    process.exit(3)
  }
}

main()
