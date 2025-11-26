import admin from '../server/firebaseAdmin.js'

const db = admin.firestore()

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed')
  try {
    const body = req.body || {}
    const { id } = body
    if (!id) return res.status(400).json({ error: 'id required' })
    await db.collection('campaigns').doc(id).delete()
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[delete-campaign] error', err)
    return res.status(500).json({ ok: false, error: String(err) })
  }
}
