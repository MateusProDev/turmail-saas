import admin from '../firebaseAdmin.js'

export default async function handler(req, res) {
  // Only enable this in development/debug mode
  if (process.env.DEBUG_API !== 'true') return res.status(404).json({ error: 'Not found' })
  try {
    const authHeader = req.headers.authorization || ''
    if (!authHeader.startsWith('Bearer ')) return res.status(400).json({ error: 'Missing Authorization header' })
    const idToken = authHeader.split(' ')[1]
    const decoded = await admin.auth().verifyIdToken(idToken)
    // Return only non-sensitive decoded token info
    return res.status(200).json({ uid: decoded.uid, email: decoded.email, claims: decoded })
  } catch (err) {
    console.error('[debug/token] error', err)
    return res.status(500).json({ error: err.message || 'internal error' })
  }
}
