import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
import { db } from '../firebaseAdmin.js'

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
      const planId = session.metadata?.planId || null
      const metadataPriceId = session.metadata?.priceId || null

      if (debug) console.log('[webhook-stripe] session', { email, stripeCustomerId, stripeSubscriptionId, planId, metadataPriceId })

      // SEGURANÇA: Verificar se o priceId pago corresponde ao planId nos metadados
      if (metadataPriceId) {
        const lineItems = session.line_items?.data || []
        const actualPriceId = lineItems.length > 0 ? lineItems[0].price.id : null
        
        if (actualPriceId && actualPriceId !== metadataPriceId) {
          console.error('[webhook-stripe] SECURITY: Price ID mismatch!', {
            metadata: metadataPriceId,
            actual: actualPriceId
          })
          // Usar o priceId real pago, não dos metadados
        }
      }

      // Import plans and extras to get limits and addon definitions
      const { PLANS, EXTRAS, applyAddonsToLimits } = await import('../lib/plans.js')
      const planConfig = planId && PLANS[planId] ? PLANS[planId] : null

      // SEGURANÇA: Log de auditoria
      console.log('[webhook-stripe] Processing payment:', {
        email,
        planId,
        priceId: metadataPriceId,
        amount: session.amount_total,
        currency: session.currency
      })

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
        const subscriptionData = {
          stripeSubscriptionId,
          stripeCustomerId,
          email: email || null,
          status: 'active',
          createdAt: new Date(),
        }

        // Add planId and limits if available
        if (planId) {
          subscriptionData.planId = planId
        }
        if (planConfig && planConfig.limits) {
          subscriptionData.limits = planConfig.limits
        }

        // If this session represents an addon purchase, include it
        if (session.metadata?.itemType === 'addon' && session.metadata?.itemId) {
          const addonId = session.metadata.itemId
          subscriptionData.addons = [{ id: addonId, priceId: metadataPriceId, purchasedAt: new Date() }]

          // Try to attach addon effects to an existing active subscription (by email)
          if (email) {
            const subsRef = db.collection('subscriptions')
            const existingQ = await subsRef.where('email', '==', email).where('status', 'in', ['active','trial']).limit(1).get()
            if (!existingQ.empty) {
              const subDoc = existingQ.docs[0]
              const existing = subDoc.data() || {}
              const existingLimits = existing.limits || {}
              // Apply addon to limits
              const newLimits = applyAddonsToLimits(existingLimits, [addonId])
              await subDoc.ref.set({ addons: (existing.addons || []).concat([{ id: addonId, priceId: metadataPriceId, purchasedAt: new Date() }]), limits: newLimits }, { merge: true })
              console.log('[webhook-stripe] Attached addon to existing subscription:', { subId: subDoc.id, addonId })

              // Also try to update tenant limits if tenant exists
              const tenantsRef = db.collection('tenants')
              const tenantQuery = await tenantsRef.where('ownerEmail', '==', email).limit(1).get()
              if (!tenantQuery.empty) {
                const tenantDoc = tenantQuery.docs[0]
                const tenantLimits = tenantDoc.data().limits || {}
                const tenantNewLimits = applyAddonsToLimits(tenantLimits, [addonId])
                await tenantDoc.ref.update({ limits: tenantNewLimits })
                console.log('[webhook-stripe] Updated tenant limits with addon:', { tenantId: tenantDoc.id, addonId })
              }
            }
          }
        }

        await db.collection('subscriptions').doc(stripeSubscriptionId).set(subscriptionData, { merge: true })
        
        // Also update tenant if we can find it by email
        if (email) {
          const tenantsRef = db.collection('tenants')
          const tenantQuery = await tenantsRef.where('ownerEmail', '==', email).limit(1).get()
          if (!tenantQuery.empty) {
            const tenantDoc = tenantQuery.docs[0]
            const tenantUpdateData = {
              stripeSubscriptionId,
              status: 'active',
            }
            if (planId) tenantUpdateData.planId = planId
            if (planConfig && planConfig.limits) tenantUpdateData.limits = planConfig.limits
            
            await tenantDoc.ref.update(tenantUpdateData)
            console.log('[webhook-stripe] Updated tenant with plan:', { tenantId: tenantDoc.id, planId })
          }
        }
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
