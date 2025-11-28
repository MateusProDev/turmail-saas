import admin from '../../firebaseAdmin.js'

const db = admin.firestore()

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const authHeader = req.headers.authorization || ''
    if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing auth token' })
    const idToken = authHeader.split(' ')[1]
    const decoded = await admin.auth().verifyIdToken(idToken)
    const uid = decoded.uid

    const { tenantId } = req.body || {}
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' })

    // check membership
    const memberRef = db.collection('tenants').doc(tenantId).collection('members').doc(uid)
    const memberSnap = await memberRef.get()
    const isOwnerOrAdmin = memberSnap.exists && ['owner', 'admin'].includes(memberSnap.data()?.role)
    const isSiteAdmin = !!decoded.admin
    if (!isOwnerOrAdmin && !isSiteAdmin) return res.status(403).json({ error: 'Not authorized' })

    const keysCol = db.collection('tenants').doc(tenantId).collection('settings').doc('keys').collection('list')
    const snaps = await keysCol.orderBy('createdAt', 'desc').get()
    const keys = snaps.docs.map(d => {
      const data = d.data() || {}
      return { id: d.id, createdAt: data.createdAt || null, createdBy: data.createdBy || null, smtpLogin: data.smtpLogin || null, memberLevel: !!data.memberLevel }
    })
    return res.status(200).json({ ok: true, keys })
  } catch (e) {
    console.error('[tenant/list-keys] error', e)
    return res.status(500).json({ error: e.message || 'internal error' })
  }
}
