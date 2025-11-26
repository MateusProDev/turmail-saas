import Stripe from 'stripe'

export default async function handler(req, res) {
  const debug = process.env.DEBUG_API === 'true'
  if (debug) console.log('[stripe-checkout] invoked', { method: req.method })

  if (req.method !== 'POST') return res.status(405).end('Method not allowed')

  try {
    const { priceId } = req.body || {}
    if (!priceId) return res.status(400).json({ error: 'priceId required' })

    const secret = process.env.STRIPE_SECRET_KEY
    if (!secret) return res.status(500).json({ error: 'Stripe secret key not configured' })

    const stripe = new Stripe(secret)

    const host = process.env.DEFAULT_HOST ? (process.env.DEFAULT_HOST.startsWith('http') ? process.env.DEFAULT_HOST : `https://${process.env.DEFAULT_HOST}`) : `https://` + (req.headers.host || 'localhost')
    const successUrl = `${host}/plans?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${host}/plans`

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    return res.json({ url: session.url, id: session.id })
  } catch (err) {
    console.error('[stripe-checkout] error', err && err.message ? err.message : err)
    return res.status(500).json({ error: err && err.message ? err.message : 'internal' })
  }
}
