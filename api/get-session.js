const Stripe = require('stripe')
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).end('Method not allowed')
  const { sessionId } = req.query || {}
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' })

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'customer'],
    })
    return res.json(session)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'failed to retrieve' })
  }
}
