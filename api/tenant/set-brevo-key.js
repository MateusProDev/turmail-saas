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
    if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing auth token' })
    const idToken = authHeader.split(' ')[1]
    const decoded = await admin.auth().verifyIdToken(idToken)
    if (debug) console.log('[tenant/set-brevo-key] decoded', { uid: decoded.uid })

    const { tenantId, key } = req.body || {}
    if (!tenantId || !key) return res.status(400).json({ error: 'tenantId and key are required' })

    // check membership
    const memberRef = db.collection('tenants').doc(tenantId).collection('members').doc(decoded.uid)
    const memberSnap = await memberRef.get()
    if (!memberSnap.exists) return res.status(403).json({ error: 'Not a member of tenant' })
    const role = memberSnap.data()?.role || 'member'
    if (!['owner', 'admin'].includes(role)) return res.status(403).json({ error: 'Insufficient role' })

    // save key under tenant settings; consider encrypting in future
    const settingsRef = db.collection('tenants').doc(tenantId).collection('settings').doc('secrets')
    await settingsRef.set({ brevoApiKey: key }, { merge: true })
    if (debug) console.log('[tenant/set-brevo-key] saved key for tenant', tenantId)
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[tenant/set-brevo-key] error', err)
    return res.status(500).json({ error: err.message || 'internal error' })
  }
}
