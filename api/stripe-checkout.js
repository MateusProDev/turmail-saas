const Stripe = require('stripe')
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed')

  try {
    const { priceId } = req.body || {}
    if (!priceId) return res.status(400).json({ error: 'priceId required' })

    const successUrl = (process.env.SUCCESS_URL || 'https://your-site.com/success') + '?session_id={CHECKOUT_SESSION_ID}'
    const cancelUrl = process.env.CANCEL_URL || 'https://your-site.com/cancel'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    return res.json({ url: session.url, id: session.id })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'internal' })
  }
}
