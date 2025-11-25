const Stripe = require('stripe')
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

module.exports = async (req, res) => {
  const debug = process.env.DEBUG_API === 'true'
  if (debug) console.log('[stripe-checkout] invoked', { method: req.method, headers: req.headers })

  if (req.method !== 'POST') {
    if (debug) console.log('[stripe-checkout] method not allowed', req.method)
    return res.status(405).end('Method not allowed')
  }

  try {
    const { priceId } = req.body || {}
    if (debug) console.log('[stripe-checkout] body', req.body)
    if (!priceId) return res.status(400).json({ error: 'priceId required' })

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[stripe-checkout] STRIPE_SECRET_KEY missing')
      return res.status(500).json({ error: 'stripe key missing' })
    }

    const successUrl = (process.env.SUCCESS_URL || 'https://your-site.com/success') + '?session_id={CHECKOUT_SESSION_ID}'
    const cancelUrl = process.env.CANCEL_URL || 'https://your-site.com/cancel'

    if (debug) console.log('[stripe-checkout] creating session', { priceId, successUrl, cancelUrl })

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    if (debug) console.log('[stripe-checkout] session created', { id: session.id, url: session.url })
    return res.json({ url: session.url, id: session.id })
  } catch (err) {
    console.error('[stripe-checkout] error', err && err.message ? err.message : err)
    if (debug) {
      return res.status(500).json({ error: String(err && err.message ? err.message : 'internal'), stack: err.stack })
    }
    return res.status(500).json({ error: 'internal' })
  }
}
