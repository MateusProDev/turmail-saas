import admin from '../../server/firebaseAdmin.js'

const db = admin.firestore()

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed')

  try {
    const authHeader = req.headers.authorization || ''
    const match = String(authHeader).match(/^Bearer\s+(.+)$/i)
    if (!match) return res.status(401).json({ error: 'Missing Authorization header' })
    const idToken = match[1]
    const decoded = await admin.auth().verifyIdToken(idToken)
    const uid = decoded.uid
    const body = req.body || {}
    const updates = {}
    if (body.company && typeof body.company === 'object') {
      updates.company = body.company
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nothing to update' })

    await db.collection('users').doc(uid).set(updates, { merge: true })
    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('[update-profile] error', e)
    return res.status(500).json({ error: e.message || 'failed' })
  }
}
