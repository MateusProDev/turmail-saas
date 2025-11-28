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

    const { tenantId, keyId } = req.body || {}
    if (!tenantId || !keyId) return res.status(400).json({ error: 'tenantId and keyId required' })

    const memberRef = db.collection('tenants').doc(tenantId).collection('members').doc(uid)
    const memberSnap = await memberRef.get()
    const isOwnerOrAdmin = memberSnap.exists && ['owner', 'admin'].includes(memberSnap.data()?.role)
    const isSiteAdmin = !!decoded.admin
    if (!isOwnerOrAdmin && !isSiteAdmin) return res.status(403).json({ error: 'Not authorized' })

    // ensure key exists
    const keyRef = db.collection('tenants').doc(tenantId).collection('settings').doc('keys').collection('list').doc(keyId)
    const keySnap = await keyRef.get()
    if (!keySnap.exists) return res.status(404).json({ error: 'key not found' })

    await db.collection('tenants').doc(tenantId).collection('settings').doc('secrets').set({ activeKeyId: keyId, updatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedBy: uid }, { merge: true })
    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('[tenant/set-active-key] error', e)
    return res.status(500).json({ error: e.message || 'internal error' })
  }
}
