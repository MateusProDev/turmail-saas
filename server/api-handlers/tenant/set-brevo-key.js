import admin from '../../firebaseAdmin.js'
import axios from 'axios'

const db = admin.firestore()

/**
 * POST /api/tenant/set-brevo-key
 * Now used to save tenant-specific sender configuration (fromEmail, fromName, smtpLogin)
 * The global Brevo API key is managed via Vercel environment variables
 */
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
    console.log('[tenant/set-brevo-key] incoming request', {
      method: req.method,
      url: req.url,
      ip: req.headers['x-forwarded-for'] || req.ip || 'unknown',
    })

    const authHeader = req.headers.authorization || ''
    if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing auth token' })
    const idToken = authHeader.split(' ')[1]
    const decoded = await admin.auth().verifyIdToken(idToken)
    const uid = decoded.uid
    console.log('[tenant/set-brevo-key] auth verified uid=', uid)

    const body = req.body || {}
    const tenantId = body.tenantId
    
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' })

    // check membership role for uid in tenant
    const memberRef = db.collection('tenants').doc(tenantId).collection('members').doc(uid)
    const memberSnap = await memberRef.get()
    const isOwnerOrAdmin = memberSnap.exists && ['owner', 'admin'].includes(memberSnap.data()?.role)

    // allow admin site-level users (custom claim) to set too
    const isSiteAdmin = !!decoded.admin
    if (!isOwnerOrAdmin && !isSiteAdmin) {
      return res.status(403).json({ error: 'Not authorized to configure tenant settings' })
    }

    const { smtpLogin, fromEmail, fromName } = body

    // Use global Brevo API key to fetch senders if needed
    const globalApiKey = process.env.BREVO_API_KEY
    let detectedSenders = []
    
    if (globalApiKey) {
      try {
        console.log('[tenant/set-brevo-key] Fetching senders from Brevo API using global key...')
        const sendersResp = await axios.get('https://api.brevo.com/v3/senders', {
          headers: { 'api-key': globalApiKey },
          timeout: 5000
        })
        if (sendersResp.data && Array.isArray(sendersResp.data.senders)) {
          detectedSenders = sendersResp.data.senders.filter(s => s.active)
          console.log('[tenant/set-brevo-key] Detected active senders:', detectedSenders.length)
        }
      } catch (apiError) {
        console.error('[tenant/set-brevo-key] Failed to fetch senders from Brevo:', apiError.message)
      }
    }

    // Save tenant-specific sender configuration
    const secretsUpdate = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: uid
    }
    
    if (smtpLogin) secretsUpdate.smtpLogin = smtpLogin
    if (fromEmail) secretsUpdate.fromEmail = fromEmail
    if (fromName) secretsUpdate.fromName = fromName
    
    // Auto-detect sender if not provided
    if (detectedSenders.length > 0 && (!fromEmail || !fromName)) {
      const firstSender = detectedSenders[0]
      if (!fromEmail) secretsUpdate.fromEmail = firstSender.email
      if (!fromName) secretsUpdate.fromName = firstSender.name
      console.log('[tenant/set-brevo-key] Auto-saved sender:', { 
        email: secretsUpdate.fromEmail, 
        name: secretsUpdate.fromName 
      })
    }
    
    await db.collection('tenants').doc(tenantId).collection('settings').doc('secrets')
      .set(secretsUpdate, { merge: true })

    return res.status(200).json({ 
      ok: true,
      senders: detectedSenders,
      savedConfig: {
        smtpLogin: secretsUpdate.smtpLogin || null,
        fromEmail: secretsUpdate.fromEmail || null,
        fromName: secretsUpdate.fromName || null
      }
    })
  } catch (e) {
    console.error('[tenant/set-brevo-key] error', e && (e.response?.data || e.message || e))
    return res.status(500).json({ error: e.message || 'internal error' })
  }
}
