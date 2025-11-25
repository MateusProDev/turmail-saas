import admin from '../../api/firebaseAdmin.js'
import crypto from 'crypto'

const db = admin.firestore()
const debug = process.env.DEBUG_API === 'true'
const ENC_KEY = process.env.TENANT_ENCRYPTION_KEY || '' // base64 or raw

function encryptText(plain) {
  if (!ENC_KEY) return null
  try {
    // expect ENC_KEY as base64 32 bytes
    const key = Buffer.from(ENC_KEY, 'base64')
    if (key.length !== 32) throw new Error('encryption key must be 32 bytes (base64)')
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return JSON.stringify({ v: 1, alg: 'aes-256-gcm', iv: iv.toString('base64'), tag: tag.toString('base64'), data: encrypted.toString('base64') })
  } catch (err) {
    if (debug) console.error('[tenant/set-brevo-key] encrypt error', err)
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const authHeader = req.headers.authorization || ''
    if (!authHeader.startsWith('Bearer ')) {
      console.log('[tenant/set-brevo-key] missing Authorization header')
      return res.status(401).json({ error: 'Missing auth token' })
    }
    const idToken = authHeader.split(' ')[1]
    const decoded = await admin.auth().verifyIdToken(idToken)
    console.log('[tenant/set-brevo-key] decoded uid=%s email=%s', decoded.uid, decoded.email)

    const { tenantId: bodyTenantId, key } = req.body || {}
    if (!key) {
      console.log('[tenant/set-brevo-key] no key in body')
      return res.status(400).json({ error: 'key is required' })
    }
    // do not log full key; log masked version for debugging
    const maskedKey = typeof key === 'string' ? `${key.slice(0,6)}...(${key.length} chars)` : String(key)
    console.log('[tenant/set-brevo-key] received key:', maskedKey)

    let tenantId = bodyTenantId

    // If tenantId not provided, try to infer from membership docs (owner/admin)
    if (!tenantId) {
      // collectionGroup documentId() returns full path; instead query by role and filter by doc.id === uid
      const q = db.collectionGroup('members').where('role', 'in', ['owner', 'admin'])
      const snaps = await q.get()
      console.log('[tenant/set-brevo-key] membership docs found:', snaps.size)
      if (snaps.empty) return res.status(403).json({ error: 'Not a member of any tenant' })
      // collect matching tenantIds where doc id equals uid
      const matching = []
      snaps.forEach(docSnap => {
        if (docSnap.id !== decoded.uid) return
        const role = docSnap.data()?.role || 'member'
        if (['owner', 'admin'].includes(role)) {
          const tenantDoc = docSnap.ref.parent.parent
          if (tenantDoc && tenantDoc.id) matching.push(tenantDoc.id)
        }
      })
      if (matching.length === 0) return res.status(403).json({ error: 'No tenant membership with owner/admin role found' })
      if (matching.length > 1) return res.status(409).json({ error: 'Multiple tenant memberships found; please specify tenantId', tenants: matching })
      tenantId = matching[0]
      console.log('[tenant/set-brevo-key] inferred tenantId', tenantId)
    }

    // check membership for the resolved tenantId
    const memberRef = db.collection('tenants').doc(tenantId).collection('members').doc(decoded.uid)
    const memberSnap = await memberRef.get()
    if (!memberSnap.exists) return res.status(403).json({ error: 'Not a member of tenant' })
    const role = memberSnap.data()?.role || 'member'
    if (!['owner', 'admin'].includes(role)) return res.status(403).json({ error: 'Insufficient role' })

    // save key under tenant settings; encrypt if ENC_KEY present
    const settingsRef = db.collection('tenants').doc(tenantId).collection('settings').doc('secrets')
    const encrypted = encryptText(String(key))
    if (encrypted) {
      await settingsRef.set({ brevoApiKey: encrypted, encrypted: true }, { merge: true })
      console.log('[tenant/set-brevo-key] saved encrypted key for tenant', tenantId)
    } else {
      await settingsRef.set({ brevoApiKey: String(key), encrypted: false }, { merge: true })
      console.log('[tenant/set-brevo-key] saved plain key for tenant', tenantId)
    }
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[tenant/set-brevo-key] error', err?.response?.data || err.message || err)
    return res.status(500).json({ error: err.message || 'internal error' })
  }
}
