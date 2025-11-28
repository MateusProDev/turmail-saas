import admin from '../../firebaseAdmin.js'
import crypto from 'crypto'

const db = admin.firestore()

function encryptValue(val) {
  const keyB64 = process.env.TENANT_ENCRYPTION_KEY || ''
  if (!keyB64) return val
  try {
    const key = Buffer.from(keyB64, 'base64')
    if (key.length !== 32) return val
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([cipher.update(String(val), 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return JSON.stringify({ iv: iv.toString('base64'), tag: tag.toString('base64'), data: encrypted.toString('base64') })
  } catch (e) {
    return val
  }
}

export default async function handler(req, res) {
  // respond to CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    return res.status(204).end()
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    // Safe debugging: log request meta but never log secrets (the key)
    try {
      console.log('[tenant/set-brevo-key] incoming request', {
        method: req.method,
        url: req.url,
        ip: req.headers['x-forwarded-for'] || req.ip || 'unknown',
      })
    } catch (e) {
      // ignore logging errors
    }

    const authHeader = req.headers.authorization || ''
    if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing auth token' })
    const idToken = authHeader.split(' ')[1]
    const decoded = await admin.auth().verifyIdToken(idToken)
    const uid = decoded.uid
    // Log the authenticated uid for debugging (not the token)
    try { console.log('[tenant/set-brevo-key] auth verified uid=', uid) } catch(_) {}

    const body = req.body || {}
    const tenantId = body.tenantId
    // Do not log body.key. Log only presence/length for diagnostics.
    try {
      const keyLen = body && typeof body.key === 'string' ? body.key.length : null
      console.log('[tenant/set-brevo-key] body received', { tenantId: tenantId || '<none>', keyLen })
    } catch (_) {}
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' })

    // check membership role for uid in tenant
    const memberRef = db.collection('tenants').doc(tenantId).collection('members').doc(uid)
    const memberSnap = await memberRef.get()
    const isOwnerOrAdmin = memberSnap.exists && ['owner', 'admin'].includes(memberSnap.data()?.role)

    // allow admin site-level users (custom claim) to set too
    const isSiteAdmin = !!decoded.admin
    if (!isOwnerOrAdmin && !isSiteAdmin) return res.status(403).json({ error: 'Not authorized to set tenant key' })

    const { key, smtpLogin, memberLevel } = body
    if (!key) return res.status(400).json({ error: 'key required' })

    // Create a new key document under tenants/{tenantId}/settings/keys/{keyId}
    const keysCol = db.collection('tenants').doc(tenantId).collection('settings').doc('keys').collection('list')
    const newKeyRef = keysCol.doc()
    const encrypted = encryptValue(key)
    const keyDoc = {
      id: newKeyRef.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: uid,
      brevoApiKey: encrypted,
      smtpLogin: smtpLogin || null,
      memberLevel: !!memberLevel,
    }
    await newKeyRef.set(keyDoc, { merge: true })

    // set this key as the active key id on the secrets doc for backward compatibility
    await db.collection('tenants').doc(tenantId).collection('settings').doc('secrets').set({ activeKeyId: newKeyRef.id, updatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedBy: uid }, { merge: true })

    return res.status(200).json({ ok: true, keyId: newKeyRef.id })
  } catch (e) {
    console.error('[tenant/set-brevo-key] error', e && (e.response?.data || e.message || e))
    return res.status(500).json({ error: e.message || 'internal error' })
  }
}
