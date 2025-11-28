import axios from 'axios'
import admin from '../server/firebaseAdmin.js'

const debug = process.env.DEBUG_API === 'true'

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
    const authHeader = req.headers.authorization || ''
    if (!authHeader.startsWith('Bearer ')) {
      console.log('[set-brevo-key] missing Authorization header on request from', req.headers['x-forwarded-for'] || req.ip || 'unknown')
      return res.status(401).json({ error: 'Missing auth token. Re-login or provide ID token in Authorization header.' })
    }
    const idToken = authHeader.split(' ')[1]
    const decoded = await admin.auth().verifyIdToken(idToken)
    if (debug) console.log('[set-brevo-key] decoded token', { uid: decoded.uid, email: decoded.email })
    console.log('[set-brevo-key] auth check uid=%s email=%s admin=%s', decoded.uid, decoded.email, !!decoded.admin)

    // admin guard: prefer Firebase custom claim `admin: true` for multi-admin SaaS.
    // Fall back to ADMIN_UID / ADMIN_EMAIL for compatibility if claims are not used yet.
    const adminUid = process.env.ADMIN_UID
    const adminEmail = process.env.ADMIN_EMAIL
    const isAdminClaim = !!decoded.admin
    if (!isAdminClaim) {
      if (adminUid && decoded.uid !== adminUid) {
        console.log('[set-brevo-key] uid not allowed', decoded.uid)
        return res.status(403).json({ error: 'Not authorized (uid mismatch). Ensure ADMIN_UID or admin claim.' })
      }
      if (adminEmail && decoded.email !== adminEmail) {
        console.log('[set-brevo-key] email not allowed', decoded.email)
        return res.status(403).json({ error: 'Not authorized (email mismatch). Ensure ADMIN_EMAIL or admin claim.' })
      }
      // if no ADMIN_UID/EMAIL provided and no admin claim, deny access
      if (!adminUid && !adminEmail) return res.status(403).json({ error: 'Not authorized. No admin claim and no ADMIN_UID/EMAIL configured.' })
    }

    const { key } = req.body || {}
    if (!key) {
      console.log('[set-brevo-key] missing key in request body')
      return res.status(400).json({ error: 'Key is required' })
    }
    const maskedKey = typeof key === 'string' ? `${key.slice(0,6)}...(${key.length} chars)` : String(key)
    console.log('[set-brevo-key] request to set BREVO_API_KEY, masked=%s', maskedKey)

    // Vercel config from server env
    const vercelToken = process.env.VERCEL_TOKEN
    const projectId = process.env.VERCEL_PROJECT_ID
    if (!vercelToken || !projectId) {
      console.log('[set-brevo-key] VERCEL_TOKEN or VERCEL_PROJECT_ID missing in env')
      return res.status(500).json({ error: 'Vercel config missing on server' })
    }

    // list env vars to find existing
    const listUrl = `https://api.vercel.com/v9/projects/${projectId}/env`
    const listResp = await axios.get(listUrl, { headers: { Authorization: `Bearer ${vercelToken}` } })
    // Vercel may return data in different shapes (e.g. { envs: [...] })
    const envs = listResp.data?.envs || listResp.data || []
    const existing = (Array.isArray(envs) ? envs : []).find((v) => v.key === 'BREVO_API_KEY')

    if (existing) {
      // update
      const patchUrl = `https://api.vercel.com/v9/projects/${projectId}/env/${existing.id}`
      await axios.patch(patchUrl, {
        value: key,
        target: ['production','preview','development'],
        type: 'encrypted',
      }, { headers: { Authorization: `Bearer ${vercelToken}` } })
      console.log('[set-brevo-key] updated Vercel env for project %s envId=%s', projectId, existing.id)
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
    console.log('[set-brevo-key] created Vercel env for project %s', projectId)
    return res.status(200).json({ ok: true, action: 'created' })
  } catch (err) {
    console.error('[set-brevo-key] error', err.response?.data || err.message || err)
    return res.status(500).json({ error: err.response?.data || err.message || 'internal error' })
  }
}
