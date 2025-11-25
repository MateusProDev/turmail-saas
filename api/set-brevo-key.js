import axios from 'axios'
import admin from './firebaseAdmin.js'

const debug = process.env.DEBUG_API === 'true'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const authHeader = req.headers.authorization || ''
    if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing auth token' })
    const idToken = authHeader.split(' ')[1]
    const decoded = await admin.auth().verifyIdToken(idToken)
    if (debug) console.log('[set-brevo-key] decoded token', { uid: decoded.uid, email: decoded.email })

    // admin guard: prefer Firebase custom claim `admin: true` for multi-admin SaaS.
    // Fall back to ADMIN_UID / ADMIN_EMAIL for compatibility if claims are not used yet.
    const adminUid = process.env.ADMIN_UID
    const adminEmail = process.env.ADMIN_EMAIL
    const isAdminClaim = !!decoded.admin
    if (!isAdminClaim) {
      if (adminUid && decoded.uid !== adminUid) return res.status(403).json({ error: 'Not authorized' })
      if (adminEmail && decoded.email !== adminEmail) return res.status(403).json({ error: 'Not authorized' })
      // if no ADMIN_UID/EMAIL provided and no admin claim, deny access
      if (!adminUid && !adminEmail) return res.status(403).json({ error: 'Not authorized' })
    }

    const { key } = req.body || {}
    if (!key) return res.status(400).json({ error: 'Key is required' })

    // Vercel config from server env
    const vercelToken = process.env.VERCEL_TOKEN
    const projectId = process.env.VERCEL_PROJECT_ID
    if (!vercelToken || !projectId) return res.status(500).json({ error: 'Vercel config missing on server' })

    // list env vars to find existing
    const listUrl = `https://api.vercel.com/v9/projects/${projectId}/env`
    const listResp = await axios.get(listUrl, { headers: { Authorization: `Bearer ${vercelToken}` } })
    const existing = (listResp.data || []).find((v) => v.key === 'BREVO_API_KEY')

    if (existing) {
      // update
      const patchUrl = `https://api.vercel.com/v9/projects/${projectId}/env/${existing.id}`
      await axios.patch(patchUrl, {
        value: key,
        target: ['production','preview','development'],
        type: 'encrypted',
      }, { headers: { Authorization: `Bearer ${vercelToken}` } })
      if (debug) console.log('[set-brevo-key] updated env')
      return res.status(200).json({ ok: true, action: 'updated' })
    }

    // create
    const createUrl = `https://api.vercel.com/v9/projects/${projectId}/env`
    await axios.post(createUrl, {
      key: 'BREVO_API_KEY',
      value: key,
      target: ['production','preview','development'],
      type: 'encrypted',
    }, { headers: { Authorization: `Bearer ${vercelToken}` } })

    if (debug) console.log('[set-brevo-key] created env')
    return res.status(200).json({ ok: true, action: 'created' })
  } catch (err) {
    console.error('[set-brevo-key] error', err.response?.data || err.message || err)
    return res.status(500).json({ error: err.response?.data || err.message || 'internal error' })
  }
}
