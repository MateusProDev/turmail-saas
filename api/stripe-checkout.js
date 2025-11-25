const Stripe = require('stripe')
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed')

  try {
    const { priceId } = req.body || {}
    if (!priceId) return res.status(400).json({ error: 'priceId required' })

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: process.env.SUCCESS_URL || 'https://your-site.com/success',
      cancel_url: process.env.CANCEL_URL || 'https://your-site.com/cancel',
    })

    return res.json({ url: session.url })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'internal' })
  }
}
