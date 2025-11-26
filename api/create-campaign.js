import admin from '../server/firebaseAdmin.js'
import { nanoid } from 'nanoid'

const db = admin.firestore()

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed')

  try {
    const body = req.body || {}
    // basic validation
    const { tenantId, subject, htmlContent, to, scheduledAt } = body
    if (!subject || !htmlContent) return res.status(400).json({ error: 'subject and htmlContent are required' })

    const id = `camp_${nanoid(10)}`
    const doc = {
      tenantId: tenantId || null,
      subject,
      htmlContent,
      to: to || null,
      status: 'queued',
      attempts: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      scheduledAt: scheduledAt ? admin.firestore.Timestamp.fromDate(new Date(scheduledAt)) : admin.firestore.FieldValue.serverTimestamp(),
    }

    await db.collection('campaigns').doc(id).set(doc)
    return res.status(201).json({ id, action: 'queued' })
  } catch (err) {
    console.error('[create-campaign] error', err)
    return res.status(500).json({ error: 'failed to create campaign' })
  }
}
