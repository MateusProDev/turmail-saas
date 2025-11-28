import admin from '../firebaseAdmin.js'

const db = admin.firestore()

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed')
  try {
    const body = req.body || {}
    const { id, subject, htmlContent, to, scheduledAt, templateId, companyName, productName, destination, ctaLink, mainTitle, tone, vertical, description, previousExperience, audience, keyBenefits } = body
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
    // optional metadata updates
    if (companyName !== undefined) updates.companyName = companyName === null ? admin.firestore.FieldValue.delete() : companyName
    if (productName !== undefined) updates.productName = productName === null ? admin.firestore.FieldValue.delete() : productName
    if (destination !== undefined) updates.destination = destination === null ? admin.firestore.FieldValue.delete() : destination
    if (ctaLink !== undefined) updates.ctaLink = ctaLink === null ? admin.firestore.FieldValue.delete() : ctaLink
    if (mainTitle !== undefined) updates.mainTitle = mainTitle === null ? admin.firestore.FieldValue.delete() : mainTitle
    if (tone !== undefined) updates.tone = tone === null ? admin.firestore.FieldValue.delete() : tone
    if (vertical !== undefined) updates.vertical = vertical === null ? admin.firestore.FieldValue.delete() : vertical
    if (description !== undefined) updates.description = description === null ? admin.firestore.FieldValue.delete() : description
    if (previousExperience !== undefined) updates.previousExperience = previousExperience === null ? admin.firestore.FieldValue.delete() : previousExperience
    if (audience !== undefined) updates.audience = audience === null ? admin.firestore.FieldValue.delete() : audience
    if (keyBenefits !== undefined) updates.keyBenefits = keyBenefits === null ? admin.firestore.FieldValue.delete() : keyBenefits
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
