const Stripe = require('stripe')
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

module.exports = async (req, res) => {
  const sig = req.headers['stripe-signature']
  const rawBody = req.rawBody || ''

  try {
    const event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
    console.log('Stripe webhook event:', event.type)

    // TODO: handle events (invoice.payment_succeeded, checkout.session.completed, etc.)

    res.json({ received: true })
  } catch (err) {
    console.error('Webhook error', err.message)
    res.status(400).send(`Webhook Error: ${err.message}`)
  }
}
