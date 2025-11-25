import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  const debug = process.env.DEBUG_API === 'true'
  if (debug) console.log('[get-session] invoked', { method: req.method, query: req.query })

  if (req.method !== 'GET') return res.status(405).end('Method not allowed')
  const { sessionId } = req.query || {}
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' })

  try {
    if (debug) console.log('[get-session] retrieving session', sessionId)
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'customer'],
    })
    if (debug) console.log('[get-session] retrieved', { id: session.id })
    return res.json(session)
  } catch (err) {
    console.error('[get-session] error', err && err.message ? err.message : err)
    if (debug) return res.status(500).json({ error: String(err && err.message ? err.message : 'failed to retrieve'), stack: err.stack })
    return res.status(500).json({ error: 'failed to retrieve' })
  }
}
