import admin from '../../firebaseAdmin.js'
import crypto from 'crypto'
import axios from 'axios'

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

    const { key, smtpLogin, memberLevel, fromEmail, fromName } = body
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
      fromEmail: fromEmail || null,
      fromName: fromName || null,
      memberLevel: !!memberLevel,
    }
    await newKeyRef.set(keyDoc, { merge: true })

    // set this key as the active key id on the secrets doc for backward compatibility
    // ALSO save smtpLogin in secrets so sendHelper can find it easily
    const secretsUpdate = {
      activeKeyId: newKeyRef.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: uid
    }
    if (smtpLogin) secretsUpdate.smtpLogin = smtpLogin
    if (fromEmail) secretsUpdate.fromEmail = fromEmail
    if (fromName) secretsUpdate.fromName = fromName
    await db.collection('tenants').doc(tenantId).collection('settings').doc('secrets').set(secretsUpdate, { merge: true })

    // AUTO-DETECT senders from Brevo API
    let detectedSenders = []
    try {
      console.log('[tenant/set-brevo-key] Fetching senders from Brevo API...')
      const sendersResp = await axios.get('https://api.brevo.com/v3/senders', {
        headers: { 'api-key': key },
        timeout: 5000
      })
      if (sendersResp.data && Array.isArray(sendersResp.data.senders)) {
        detectedSenders = sendersResp.data.senders.filter(s => s.active)
        console.log('[tenant/set-brevo-key] Detected active senders:', detectedSenders.length)
        
        // If fromEmail/fromName not provided, use first active sender
        if (detectedSenders.length > 0 && (!fromEmail || !fromName)) {
          const firstSender = detectedSenders[0]
          const autoFromEmail = fromEmail || firstSender.email
          const autoFromName = fromName || firstSender.name
          
          // Update secrets with detected sender
          await db.collection('tenants').doc(tenantId).collection('settings').doc('secrets').set({
            fromEmail: autoFromEmail,
            fromName: autoFromName,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: uid
          }, { merge: true })
          
          // Also update the key document
          await newKeyRef.set({
            fromEmail: autoFromEmail,
            fromName: autoFromName
          }, { merge: true })
          
          console.log('[tenant/set-brevo-key] Auto-saved sender:', { autoFromEmail, autoFromName })
        }
      }
    } catch (apiError) {
      console.error('[tenant/set-brevo-key] Failed to fetch senders from Brevo:', apiError.message)
      // Don't fail the whole operation if sender detection fails
    }

    return res.status(200).json({ 
      ok: true, 
      keyId: newKeyRef.id,
      senders: detectedSenders // Return detected senders to frontend
    })
  } catch (e) {
    console.error('[tenant/set-brevo-key] error', e && (e.response?.data || e.message || e))
    return res.status(500).json({ error: e.message || 'internal error' })
  }
}
