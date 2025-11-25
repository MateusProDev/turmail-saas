import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
import { db } from './firebaseAdmin.js'

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  const debug = process.env.DEBUG_API === 'true'
  if (debug) console.log('[webhook-stripe] invoked', { method: req.method, headers: req.headers })

  if (req.method !== 'POST') return res.status(405).end('Method not allowed')

  const sig = req.headers['stripe-signature'] || req.headers['Stripe-Signature']
  if (!sig) {
    console.error('[webhook-stripe] stripe-signature header missing')
    return res.status(400).send('Missing stripe signature')
  }

  try {
    const rawBodyBuffer = req.rawBody ? (Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(req.rawBody)) : await getRawBody(req)
    if (debug) console.log('[webhook-stripe] rawBody length', rawBodyBuffer && rawBodyBuffer.length)

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('[webhook-stripe] STRIPE_WEBHOOK_SECRET missing')
      return res.status(500).send('Stripe webhook secret not configured')
    }

    const event = stripe.webhooks.constructEvent(rawBodyBuffer, sig, webhookSecret)
    console.log('[webhook-stripe] Stripe webhook event:', event.type)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const email = session.customer_details?.email || null
      const stripeCustomerId = session.customer
      const stripeSubscriptionId = session.subscription || null

      if (debug) console.log('[webhook-stripe] session', { email, stripeCustomerId, stripeSubscriptionId })

      if (email) {
        const usersRef = db.collection('users')
        const q = await usersRef.where('email', '==', email).limit(1).get()
        if (q.empty) {
          // create a full initial user object for consistency
          const { makeInitialUserForServer } = await import('./initUser.js')
          const userObj = makeInitialUserForServer({ email, stripeCustomerId })
          await usersRef.add(userObj)
        } else {
          const doc = q.docs[0]
          await doc.ref.update({ stripeCustomerId })
        }
      }

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

    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object
      const subscriptionId = invoice.subscription
      if (subscriptionId) {
        await db.collection('subscriptions').doc(subscriptionId).set({ status: 'active', lastPaymentAt: new Date() }, { merge: true })
      }
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object
      const subscriptionId = sub.id
      const status = sub.status
      await db.collection('subscriptions').doc(subscriptionId).set({ status, updatedAt: new Date() }, { merge: true })
    }

    res.json({ received: true })
  } catch (err) {
    console.error('[webhook-stripe] Webhook error', err && err.message ? err.message : err)
    if (debug) return res.status(400).send(`Webhook Error: ${err && err.message ? err.message : err}`)
    res.status(400).send('Webhook Error')
  }
}
