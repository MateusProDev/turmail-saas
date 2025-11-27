import admin from '../server/firebaseAdmin.js'

const db = admin.firestore()

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed')
  try {
    const body = req.body || {}
    const { id, subject, htmlContent, to, scheduledAt, templateId } = body
    if (!id) return res.status(400).json({ error: 'id required' })
    const updates = {}
    if (subject !== undefined && subject !== null) updates.subject = subject
    if (htmlContent !== undefined && htmlContent !== null) updates.htmlContent = htmlContent
    if (to !== undefined) {
      // if caller explicitly sends null, remove the field; otherwise set array
      if (to === null) updates.to = admin.firestore.FieldValue.delete()
      else updates.to = to
    }
    if (templateId !== undefined) {
      if (templateId === null) updates.templateId = admin.firestore.FieldValue.delete()
      else updates.templateId = templateId
    }
    if (scheduledAt !== undefined) {
      if (scheduledAt === null) updates.scheduledAt = admin.firestore.FieldValue.delete()
      else updates.scheduledAt = admin.firestore.Timestamp.fromDate(new Date(scheduledAt))
    }
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp()
    // Only update if there is something to write (avoid empty updates)
    if (Object.keys(updates).length === 0) return res.status(200).json({ ok: true })
    await db.collection('campaigns').doc(id).update(updates)
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[update-campaign] error', err)
    return res.status(500).json({ ok: false, error: String(err) })
  }
}
