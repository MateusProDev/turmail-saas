const Stripe = require('stripe')
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const { db } = require('./firebaseAdmin')

module.exports = async (req, res) => {
  const sig = req.headers['stripe-signature']
  const rawBody = req.rawBody || ''

  try {
    const event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
    console.log('Stripe webhook event:', event.type)

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      // session.customer, session.subscription, session.customer_details.email
      const email = session.customer_details?.email || null
      const stripeCustomerId = session.customer
      const stripeSubscriptionId = session.subscription || null

      // create or update user by email
      if (email) {
        const usersRef = db.collection('users')
        const q = await usersRef.where('email', '==', email).limit(1).get()
        if (q.empty) {
          await usersRef.add({
            email,
            stripeCustomerId,
            createdAt: new Date(),
          })
        } else {
          const doc = q.docs[0]
          await doc.ref.update({ stripeCustomerId })
        }
      }

      // save subscription record
      if (stripeSubscriptionId) {
        await db.collection('subscriptions').doc(stripeSubscriptionId).set({
          stripeSubscriptionId,
          stripeCustomerId,
          email: email || null,
          status: 'active',
          createdAt: new Date(),
        }, { merge: true })
      }
    }

    // Handle invoice.payment_succeeded -> update subscription status
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object
      const subscriptionId = invoice.subscription
      if (subscriptionId) {
        await db.collection('subscriptions').doc(subscriptionId).set({
          status: 'active',
          lastPaymentAt: new Date(),
        }, { merge: true })
      }
    }

    // Handle customer.subscription.updated / deleted
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object
      const subscriptionId = sub.id
      const status = sub.status
      await db.collection('subscriptions').doc(subscriptionId).set({
        status,
        updatedAt: new Date(),
      }, { merge: true })
    }

    res.json({ received: true })
  } catch (err) {
    console.error('Webhook error', err.message || err)
    res.status(400).send(`Webhook Error: ${err.message || err}`)
  }
}
