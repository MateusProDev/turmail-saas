import admin from '../../firebaseAdmin.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end()
  try {
    return res.status(200).json({ ok: true, message: 'tenant test handler reachable' })
  } catch (e) {
    console.error('[tenant/test] error', e)
    return res.status(500).json({ error: 'internal' })
  }
}
