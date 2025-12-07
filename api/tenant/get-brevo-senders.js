import admin from '../../server/firebaseAdmin.js'
import crypto from 'crypto'
import axios from 'axios'

const db = admin.firestore()
const ENC_KEY = process.env.TENANT_ENCRYPTION_KEY || ''

function tryDecrypt(val) {
  if (!val) return null
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : null
    if (!parsed || !parsed.iv || !parsed.tag || !parsed.data) return val
    if (!ENC_KEY) return null
    const key = Buffer.from(ENC_KEY, 'base64')
    if (key.length !== 32) return null
    const iv = Buffer.from(parsed.iv, 'base64')
    const tag = Buffer.from(parsed.tag, 'base64')
    const data = Buffer.from(parsed.data, 'base64')
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
    return decrypted.toString('utf8')
  } catch (err) {
    return val
  }
}

/**
 * GET /api/tenant/get-brevo-senders
 * Busca lista de remetentes configurados na conta Brevo global
 * Retorna: { senders: [{ id, name, email, active }] }
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // Authenticate user
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' })
    }
    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await admin.auth().verifyIdToken(idToken)
    const uid = decodedToken.uid

    const tenantId = req.query.tenantId
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' })

    // Verify user is member of tenant
    const memberRef = db.doc(`tenants/${tenantId}/members/${uid}`)
    const memberSnap = await memberRef.get()
    if (!memberSnap.exists) {
      return res.status(403).json({ error: 'Not a member of this tenant' })
    }

    // Use global Brevo API key from environment
    const brevoApiKey = process.env.BREVO_API_KEY

    if (!brevoApiKey) {
      return res.status(400).json({ error: 'Global Brevo API key not configured in environment variables' })
    }

    // Call Brevo API to get senders
    const response = await axios.get('https://api.brevo.com/v3/senders', {
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey
      }
    })

    const senders = (response.data.senders || []).map(s => ({
      id: s.id,
      name: s.name,
      email: s.email,
      active: s.active
    }))

    return res.status(200).json({ senders })

  } catch (err) {
    console.error('[get-brevo-senders] error', err.response?.data || err.message || err)
    
    if (err.response?.status === 401) {
      return res.status(401).json({ error: 'Invalid Brevo API key' })
    }
    
    return res.status(500).json({ 
      error: 'Failed to fetch senders from Brevo',
      details: err.response?.data?.message || err.message
    })
  }
}
