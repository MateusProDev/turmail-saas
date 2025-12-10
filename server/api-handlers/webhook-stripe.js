import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
import admin, { db } from '../firebaseAdmin.js'

// ==================== FUNÇÕES AUXILIARES ====================

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

async function findTenant(email, stripeCustomerId, ownerUid) {
  const tenantsRef = db.collection('tenants')
  
  console.log('[webhook-stripe] findTenant buscando:', { email, stripeCustomerId, ownerUid })
  
  // 1. Tentar por ownerUid (mais direto e confiável)
  if (ownerUid) {
    const tQ = await tenantsRef.where('ownerUid', '==', ownerUid).limit(1).get()
    if (!tQ.empty) {
      console.log('[webhook-stripe] Tenant encontrado por ownerUid:', ownerUid)
      return tQ.docs[0]
    }
  }
  
  // 2. Tentar por email
  if (email) {
    const tQ = await tenantsRef.where('ownerEmail', '==', email).limit(1).get()
    if (!tQ.empty) {
      console.log('[webhook-stripe] Tenant encontrado por email:', email)
      return tQ.docs[0]
    }
  }
  
  // 3. Tentar via stripeCustomerId → user → ownerUid
  if (stripeCustomerId) {
    const usersRef = db.collection('users')
    const uQ = await usersRef.where('stripeCustomerId', '==', stripeCustomerId).limit(1).get()
    if (!uQ.empty) {
      const userDoc = uQ.docs[0]
      const userOwnerUid = userDoc.id
      const tQ2 = await tenantsRef.where('ownerUid', '==', userOwnerUid).limit(1).get()
      if (!tQ2.empty) {
        console.log('[webhook-stripe] Tenant encontrado via stripeCustomerId:', stripeCustomerId)
        return tQ2.docs[0]
      }
    }
  }
  
  console.warn('[webhook-stripe] Nenhum tenant encontrado com os critérios:', { email, stripeCustomerId, ownerUid })
  return null
}

async function ensureUserWithStripeCustomer(email, stripeCustomerId) {
  if (!email) return null
  
  const usersRef = db.collection('users')
  const q = await usersRef.where('email', '==', email).limit(1).get()
  
  if (q.empty) {
    console.log('[webhook-stripe] Criando novo usuário para:', email)
    const { makeInitialUserForServer } = await import('./initUser.js')
    const userObj = makeInitialUserForServer({ email, stripeCustomerId })
    const docRef = await usersRef.add(userObj)
    return { uid: docRef.id, email }
  } else {
    const doc = q.docs[0]
    console.log('[webhook-stripe] Atualizando usuário existente:', doc.id)
    await doc.ref.update({ 
      stripeCustomerId,
      updatedAt: new Date()
    })
    return { uid: doc.id, email: doc.data().email }
  }
}

function getInitialOnboardingProgress(hasTrialStarted = true) {
  const baseProgress = {
    billing: { 
      completed: true, 
      completedAt: new Date(),
      autoCompleted: true 
    }
  }
  
  if (hasTrialStarted) {
    baseProgress.trialStarted = { 
      completed: true, 
      completedAt: new Date(),
      autoCompleted: true 
    }
  }
  
  return baseProgress
}

// ==================== HANDLER PRINCIPAL ====================

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

    let event
    try {
      event = stripe.webhooks.constructEvent(rawBodyBuffer, sig, webhookSecret)
      console.log('[webhook-stripe] Stripe webhook event:', event.type)
    } catch (verifyErr) {
      console.error('[webhook-stripe] signature verification failed:', verifyErr?.message || verifyErr)
      
      // Persist failed verification payload for debugging (non-blocking)
      try {
        const failedDoc = {
          receivedAt: new Date(),
          error: verifyErr?.message || String(verifyErr),
          headers: req.headers || {},
          rawBase64: rawBodyBuffer ? rawBodyBuffer.toString('base64') : null,
        }
        db.collection('debug_webhooks_failed').add(failedDoc).catch(err => {
          console.error('[webhook-stripe] failed to write debug_webhooks_failed doc:', err?.message || err)
        })
      } catch (e) {
        console.error('[webhook-stripe] error saving failed debug payload:', e?.message || e)
      }
      return res.status(400).send(`Webhook Error: ${verifyErr?.message || verifyErr}`)
    }

    if (debug) {
      try {
        console.log('[webhook-stripe] event.data.object (debug):', JSON.stringify(event.data.object))
      } catch (e) {
        console.log('[webhook-stripe] event.data.object (debug) could not be stringified')
      }
    }

    // Persist raw webhook payload for debugging/reconciliation (non-blocking)
    try {
      const debugDoc = {
        receivedAt: new Date(),
        eventType: event.type,
        payload: event.data?.object || null,
        headers: req.headers || {},
        rawBase64: rawBodyBuffer ? rawBodyBuffer.toString('base64') : null,
      }
      db.collection('debug_webhooks').add(debugDoc).catch(err => {
        console.error('[webhook-stripe] failed to write debug_webhooks doc:', err?.message || err)
      })
    } catch (e) {
      console.error('[webhook-stripe] error saving debug payload:', e?.message || e)
    }

    // ================ checkout.session.completed ================
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
          // Log de segurança, mas continuamos com o priceId real
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

      // 1. Garantir que usuário existe e tem stripeCustomerId
      const userInfo = await ensureUserWithStripeCustomer(email, stripeCustomerId)
      const ownerUid = userInfo?.uid || null

      // 2. Encontrar tenant com nossa nova função robusta
      let tenantDoc = await findTenant(email, stripeCustomerId, ownerUid)
      
      if (tenantDoc) {
        console.log('[webhook-stripe] tenant resolvido para sessão:', tenantDoc.id)
        
        // IMPORTANTE: Garantir que tenant tem ownerEmail se ainda não tiver
        const tenantData = tenantDoc.data() || {}
        if (email && !tenantData.ownerEmail) {
          console.log('[webhook-stripe] Adicionando ownerEmail ao tenant:', email)
          await tenantDoc.ref.update({ 
            ownerEmail: email,
            updatedAt: new Date()
          })
        }
      } else {
        console.warn('[webhook-stripe] tenant NÃO encontrado para sessão; criando registro de reconciliação')
        
        // Criar tenant mínimo para reconciliação
        if (email || ownerUid) {
          const tenantId = `recon_${Date.now()}_${ownerUid || email.replace(/[^a-z0-9]/gi, '_')}`
          const tenantsRef = db.collection('tenants')
          const tenantRef = tenantsRef.doc(tenantId)
          
          await tenantRef.set({
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            ownerUid: ownerUid || null,
            ownerEmail: email || null,
            name: `Reconciliação ${email || tenantId}`,
            status: 'reconciled',
            reconciledAt: new Date(),
            originalSessionId: session.id
          })
          
          tenantDoc = await tenantRef.get()
          console.log('[webhook-stripe] Criado tenant de reconciliação:', tenantId)
        }
      }

      // 3. Criar/atualizar subscription com dados completos
      if (stripeSubscriptionId) {
        const subscriptionData = {
          stripeSubscriptionId,
          stripeCustomerId,
          email: email || null,
          status: 'active',
          createdAt: new Date(),
          tenantId: tenantDoc?.id || null,
          ownerUid: ownerUid || null
        }

        // Adicionar planId e limites se disponíveis
        if (planId) {
          subscriptionData.planId = planId
        }
        if (planConfig?.limits) {
          subscriptionData.limits = planConfig.limits
        }

        // ✅ NOVO: Inicializar onboardingProgress automaticamente
        subscriptionData.onboardingProgress = getInitialOnboardingProgress(true)
        subscriptionData.onboardingCompleted = false // Mantém modal visível para próximos passos

        // Se esta sessão representa uma compra de addon
        if (session.metadata?.itemType === 'addon' && session.metadata?.itemId) {
          const addonId = session.metadata.itemId
          subscriptionData.addons = [{ 
            id: addonId, 
            priceId: metadataPriceId, 
            purchasedAt: new Date() 
          }]

          // Tentar anexar addon a uma subscription existente (por email)
          if (email) {
            const subsRef = db.collection('subscriptions')
            const existingQ = await subsRef
              .where('email', '==', email)
              .where('status', 'in', ['active','trial'])
              .limit(1).get()
              
            if (!existingQ.empty) {
              const subDoc = existingQ.docs[0]
              const existing = subDoc.data() || {}
              const existingLimits = existing.limits || {}
              
              // Aplicar addon aos limites
              const newLimits = applyAddonsToLimits(existingLimits, [addonId])
              await subDoc.ref.set({ 
                addons: (existing.addons || []).concat([{ 
                  id: addonId, 
                  priceId: metadataPriceId, 
                  purchasedAt: new Date() 
                }]), 
                limits: newLimits,
                updatedAt: new Date()
              }, { merge: true })
              
              console.log('[webhook-stripe] Addon anexado à subscription existente:', { 
                subId: subDoc.id, 
                addonId 
              })

              // Atualizar limites do tenant se existir
              if (tenantDoc) {
                const tenantLimits = tenantDoc.data().limits || {}
                const tenantNewLimits = applyAddonsToLimits(tenantLimits, [addonId])
                await tenantDoc.ref.update({ 
                  limits: tenantNewLimits,
                  updatedAt: new Date()
                })
                console.log('[webhook-stripe] Limites do tenant atualizados com addon:', { 
                  tenantId: tenantDoc.id, 
                  addonId 
                })
              }
            }
          }
        }

        // Escrita idempotente da subscription
        const subRef = db.collection('subscriptions').doc(stripeSubscriptionId)
        const existingSub = await subRef.get()
        
        if (existingSub.exists) {
          console.log('[webhook-stripe] Subscription existe, atualizando:', stripeSubscriptionId)
          await subRef.set(Object.assign({}, subscriptionData, { 
            updatedAt: new Date() 
          }), { merge: true })
        } else {
          console.log('[webhook-stripe] Criando subscription document:', stripeSubscriptionId)
          await subRef.set(Object.assign({}, subscriptionData, { 
            createdAt: new Date() 
          }))
        }
        
        // 4. Atualizar tenant se encontramos um
        if (tenantDoc) {
          const tenantUpdateData = {
            stripeSubscriptionId,
            status: 'active',
            planId: planId || null,
            updatedAt: new Date()
          }
          
          if (planConfig?.limits) {
            tenantUpdateData.limits = planConfig.limits
          }
          
          // ✅ NOVO: Atualizar onboardingProgress do tenant também
          const currentData = tenantDoc.data() || {}
          const currentProgress = currentData.onboardingProgress || {}
          
          tenantUpdateData.onboardingProgress = {
            ...currentProgress,
            ...getInitialOnboardingProgress(true)
          }
          
          // Se tenant estava em trial, marcar como completo
          if (currentData.status === 'trial') {
            tenantUpdateData.trialCompletedAt = new Date()
          }
          
          await tenantDoc.ref.update(tenantUpdateData)
          console.log('[webhook-stripe] Tenant atualizado com plano e onboarding:', { 
            tenantId: tenantDoc.id, 
            planId,
            onboardingUpdated: true 
          })
        }
      }
    }

    // ================ invoice.payment_succeeded ================
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object
      const subscriptionId = invoice.subscription
      
      if (subscriptionId) {
        await db.collection('subscriptions').doc(subscriptionId).set({ 
          status: 'active', 
          lastPaymentAt: new Date(),
          updatedAt: new Date()
        }, { merge: true })
        
        console.log('[webhook-stripe] Pagamento confirmado para subscription:', subscriptionId)
      }
    }

    // ================ customer.subscription.updated/deleted ================
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object
      const subscriptionId = sub.id
      const status = sub.status
      
      await db.collection('subscriptions').doc(subscriptionId).set({ 
        status, 
        updatedAt: new Date() 
      }, { merge: true })
      
      console.log('[webhook-stripe] Subscription atualizada:', { subscriptionId, status })
      
      // Se subscription foi cancelada, atualizar tenant também
      if (status === 'canceled' || status === 'unpaid') {
        const subDoc = await db.collection('subscriptions').doc(subscriptionId).get()
        const subData = subDoc.data() || {}
        const tenantId = subData.tenantId
        
        if (tenantId) {
          await db.collection('tenants').doc(tenantId).update({
            status: status === 'canceled' ? 'canceled' : 'unpaid',
            updatedAt: new Date()
          })
          console.log('[webhook-stripe] Tenant status atualizado:', { tenantId, status })
        }
      }
    }

    // ================ customer.subscription.created ================
    if (event.type === 'customer.subscription.created') {
      const sub = event.data.object
      const subscriptionId = sub.id
      const stripeCustomerId = sub.customer
      const status = sub.status || 'active'

      // Tentar descobrir email/ownerUid do usuário usando stripeCustomerId
      let email = null
      let ownerUid = null
      
      try {
        if (stripeCustomerId) {
          const usersRef = db.collection('users')
          const uQ = await usersRef.where('stripeCustomerId', '==', stripeCustomerId).limit(1).get()
          if (!uQ.empty) {
            const uDoc = uQ.docs[0]
            ownerUid = uDoc.id
            email = uDoc.data()?.email || null
          }
        }
      } catch (e) {
        console.error('[webhook-stripe] Erro buscando usuário por stripeCustomerId', e)
      }

      // Se ainda não tem email, tentar customer email field
      if (!email && sub.customer_email) email = sub.customer_email

      // Encontrar ou criar tenant
      let tenantDoc = null
      try {
        tenantDoc = await findTenant(email, stripeCustomerId, ownerUid)

        // Se nenhum tenant encontrado, criar um para reconciliação
        if (!tenantDoc) {
          const tenantId = `tenant_${ownerUid || (email ? email.replace(/[^a-z0-9]/gi, '_') : subscriptionId)}`
          const tenantsRef = db.collection('tenants')
          const tenantRef = tenantsRef.doc(tenantId)
          
          await tenantRef.set({
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            ownerUid: ownerUid || null,
            ownerEmail: email || null,
            name: `Reconciliado ${tenantId}`,
            status: 'reconciled',
            reconciledAt: new Date()
          }, { merge: true })
          
          tenantDoc = await tenantRef.get()
          console.log('[webhook-stripe] Tenant de reconciliação criado:', tenantRef.id)
        }
      } catch (e) {
        console.error('[webhook-stripe] Erro garantindo tenant para subscription.created', e)
      }

      // Construir subscription document
      try {
        const subscriptionData = {
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId: stripeCustomerId || null,
          email: email || null,
          status: status,
          createdAt: new Date(),
          tenantId: tenantDoc?.id || null,
          ownerUid: ownerUid || null,
          // ✅ NOVO: Inicializar onboarding
          onboardingProgress: getInitialOnboardingProgress(true),
          onboardingCompleted: false
        }

        const subRef = db.collection('subscriptions').doc(subscriptionId)
        const exists = await subRef.get()
        
        if (exists.exists) {
          await subRef.set(Object.assign({}, subscriptionData, { 
            updatedAt: new Date() 
          }), { merge: true })
          console.log('[webhook-stripe] Subscription atualizada de customer.subscription.created:', subscriptionId)
        } else {
          await subRef.set(Object.assign({}, subscriptionData, { 
            createdAt: new Date() 
          }))
          console.log('[webhook-stripe] Subscription criada de customer.subscription.created:', subscriptionId)
        }

        // Garantir que tenant tem link para subscription
        if (tenantDoc) {
          try {
            const currentData = tenantDoc.data() || {}
            const currentProgress = currentData.onboardingProgress || {}
            
            await tenantDoc.ref.update({ 
              stripeSubscriptionId: subscriptionId, 
              status,
              onboardingProgress: {
                ...currentProgress,
                ...getInitialOnboardingProgress(true)
              },
              updatedAt: new Date()
            })
          } catch (e) {
            console.error('[webhook-stripe] Falha atualizando tenant com subscriptionId', e)
          }
        }
      } catch (e) {
        console.error('[webhook-stripe] Falha escrevendo subscription para customer.subscription.created', e)
      }
    }

    // ================ customer.subscription.trial_will_end ================
    if (event.type === 'customer.subscription.trial_will_end') {
      const sub = event.data.object
      const subscriptionId = sub.id
      
      console.log('[webhook-stripe] Trial prestes a acabar para subscription:', subscriptionId)
      
      // Atualizar subscription com alerta de trial ending
      await db.collection('subscriptions').doc(subscriptionId).set({
        trialEndingSoon: true,
        trialWillEndAt: new Date(sub.trial_end * 1000),
        updatedAt: new Date()
      }, { merge: true })
      
      // Também atualizar tenant se possível
      const subDoc = await db.collection('subscriptions').doc(subscriptionId).get()
      const subData = subDoc.data() || {}
      const tenantId = subData.tenantId
      
      if (tenantId) {
        await db.collection('tenants').doc(tenantId).update({
          trialEndingSoon: true,
          trialWillEndAt: new Date(sub.trial_end * 1000),
          updatedAt: new Date()
        })
      }
    }

    res.json({ received: true, processed: true, eventType: event.type })
    
  } catch (err) {
    console.error('[webhook-stripe] Webhook error', err?.message || err)
    
    // Log do erro completo para debug
    const errorDoc = {
      receivedAt: new Date(),
      error: err?.message || String(err),
      stack: err?.stack || null,
      eventType: event?.type || 'unknown'
    }
    
    db.collection('debug_webhooks_errors').add(errorDoc).catch(e => {
      console.error('[webhook-stripe] Failed to log error:', e?.message || e)
    })
    
    if (debug) {
      return res.status(400).send(`Webhook Error: ${err?.message || err}`)
    }
    res.status(400).send('Webhook Error')
  }
}