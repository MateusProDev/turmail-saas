import admin from '../../firebaseAdmin.js'

const db = admin.firestore()

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const authHeader = req.headers.authorization || ''
    if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing auth token' })
    const idToken = authHeader.split(' ')[1]
    let decoded
    try {
      decoded = await admin.auth().verifyIdToken(idToken)
    } catch (err) {
      // Log masked token info to help debug invalid/truncated tokens without printing secrets
      try {
        const prefix = (idToken || '').slice(0, 12)
        const len = (idToken || '').length
        console.error('[tenant/create-tenant] verifyIdToken failed; token prefix:', prefix, 'length:', len)
      } catch (e) {
        // ignore
      }
      throw err
    }
    const uid = decoded.uid

    const body = req.body || {}
    const name = body.name || `Account ${uid}`
    const tenantId = `tenant_${uid}`

    const memberRef = db.collection('tenants').doc(tenantId).collection('members').doc(uid)
    // include email and displayName for better UX/debugging
    let displayName = ''
    let email = decoded.email || ''
    try {
      const userRecord = await admin.auth().getUser(uid)
      displayName = userRecord.displayName || ''
      email = userRecord.email || ''
    } catch (e) {
      // ignore
    }

    const tenantRef = db.collection('tenants').doc(tenantId)
    // Persist tenant with ownerEmail and ownerUid (ownerEmail is required)
    await tenantRef.set({ createdAt: admin.firestore.FieldValue.serverTimestamp(), ownerUid: uid, ownerEmail: email || '', name }, { merge: true })

    await memberRef.set({ role: 'owner', createdAt: admin.firestore.FieldValue.serverTimestamp(), email, displayName }, { merge: true })
    const secretsRef = tenantRef.collection('settings').doc('secrets')
    await secretsRef.set({ brevoApiKey: null, smtpLogin: null, encrypted: false }, { merge: true })

    return res.status(200).json({ ok: true, tenantId })
  } catch (e) {
    console.error('[tenant/create-tenant] error', e)
    return res.status(500).json({ error: e.message || 'internal error' })
  }
}
