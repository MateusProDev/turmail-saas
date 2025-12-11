import Stripe from 'stripe'
import admin from '../firebaseAdmin.js'
const firebaseAuth = admin.auth()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  const debug = process.env.DEBUG_API === 'true'
  if (debug) console.log('[get-session] invoked', { method: req.method, query: req.query })

  if (req.method !== 'GET') return res.status(405).end('Method not allowed')
  const { session_id } = req.query || {}
  if (!session_id) return res.status(400).json({ error: 'session_id required' })

  // SEGURANÇA: Verificar autenticação
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - Authentication required' })
  }

  const token = authHeader.split('Bearer ')[1]
  let decodedToken
  try {
    decodedToken = await firebaseAuth.verifyIdToken(token)
  } catch (authErr) {
    console.error('[get-session] Token verification failed:', authErr.message)
    return res.status(401).json({ error: 'Invalid authentication token' })
  }

  try {
    if (debug) console.log('[get-session] retrieving session', session_id)
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['line_items', 'customer', 'subscription'],
    })
    
    // SEGURANÇA: Verificar se o usuário autenticado é o dono da sessão
    if (session.metadata?.uid && session.metadata.uid !== decodedToken.uid) {
      console.warn('[get-session] User tried to access session they don\'t own:', {
        requestedUid: decodedToken.uid,
        sessionUid: session.metadata.uid
      })
      return res.status(403).json({ error: 'Access denied' })
    }
    
    if (debug) console.log('[get-session] retrieved', { id: session.id, subscription: session.subscription?.id })
    return res.json(session)
  } catch (err) {
    console.error('[get-session] error', err && err.message ? err.message : err)
    if (debug) return res.status(500).json({ error: String(err && err.message ? err.message : 'failed to retrieve'), stack: err.stack })
    return res.status(500).json({ error: 'failed to retrieve' })
  }
}
