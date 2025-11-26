import admin from '../server/firebaseAdmin.js'

const db = admin.firestore()

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed')
  try {
    const body = req.body || {}
    const { id, subject, htmlContent, to, scheduledAt, templateId } = body
    if (!id) return res.status(400).json({ error: 'id required' })
    const updates = {}
    if (subject !== undefined) updates.subject = subject
    if (htmlContent !== undefined) updates.htmlContent = htmlContent
    if (to !== undefined) updates.to = to
    if (templateId !== undefined) updates.templateId = templateId
    if (scheduledAt !== undefined) updates.scheduledAt = scheduledAt ? admin.firestore.Timestamp.fromDate(new Date(scheduledAt)) : null
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp()
    await db.collection('campaigns').doc(id).update(updates)
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[update-campaign] error', err)
    return res.status(500).json({ ok: false, error: String(err) })
  }
}
