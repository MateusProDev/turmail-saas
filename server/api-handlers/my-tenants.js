import admin from '../server/firebaseAdmin.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end('Method not allowed')

  const authHeader = req.headers.authorization || req.headers.Authorization || ''
  const match = (Array.isArray(authHeader) ? authHeader[0] : authHeader).toString().trim().match(/^Bearer (.+)$/i)
  if (!match) return res.status(401).json({ error: 'Missing Authorization Bearer token' })

  const idToken = match[1]
  try {
    const decoded = await admin.auth().verifyIdToken(idToken)
    const uid = decoded.uid
    const db = admin.firestore()
    // collectionGroup read via Admin SDK (bypasses rules) and filter by document id == uid
    const mems = await db.collectionGroup('members').get()
    const results = []
    mems.docs.forEach(d => {
      if (d.id !== uid) return
      const tenantId = d.ref.parent.parent ? d.ref.parent.parent.id : null
      results.push({ tenantId, role: d.data()?.role || null })
    })
    return res.status(200).json({ tenants: results })
  } catch (e) {
    console.error('[my-tenants] error verifying token or fetching memberships', e)
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
