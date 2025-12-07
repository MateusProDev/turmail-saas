import Stripe from 'stripe'
import { PLANS } from '../lib/plans.js'
import { auth as firebaseAuth } from '../firebaseAdmin.js'

// Mapeamento seguro de Price IDs para Plan IDs
// Isso impede que usuário manipule localStorage para pagar menos
const PRICE_TO_PLAN_MAP = {
  // Starter
  [process.env.VITE_STRIPE_PRICE_STARTER]: 'starter',
  [process.env.VITE_STRIPE_PRICE_STARTER_ANNUAL]: 'starter',
  
  // Pro
  [process.env.VITE_STRIPE_PRICE_PRO]: 'pro',
  [process.env.VITE_STRIPE_PRICE_PRO_ANNUAL]: 'pro',
  
  // Agency
  [process.env.VITE_STRIPE_PRICE_AGENCY]: 'agency',
  [process.env.VITE_STRIPE_PRICE_AGENCY_ANNUAL]: 'agency',
}

export default async function handler(req, res) {
  const debug = process.env.DEBUG_API === 'true'
  if (debug) console.log('[stripe-checkout] invoked', { method: req.method })

  if (req.method !== 'POST') return res.status(405).end('Method not allowed')

  try {
    // SEGURANÇA: Verificar autenticação (usuário deve estar logado)
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - Authentication required' })
    }

    const token = authHeader.split('Bearer ')[1]
    let decodedToken
    try {
      decodedToken = await firebaseAuth.verifyIdToken(token)
    } catch (authErr) {
      console.error('[stripe-checkout] Token verification failed:', authErr.message)
      return res.status(401).json({ error: 'Invalid authentication token' })
    }

    const { priceId, planId: clientPlanId, email } = req.body || {}
    if (!priceId) return res.status(400).json({ error: 'priceId required' })

    // SEGURANÇA: Verificar se email do body corresponde ao email autenticado
    if (email && email !== decodedToken.email) {
      console.warn('[stripe-checkout] Email mismatch! token:', decodedToken.email, 'body:', email)
      // Usar email do token (autenticado), não do body
    }
    const verifiedEmail = decodedToken.email

    const secret = process.env.STRIPE_SECRET_KEY
    if (!secret) return res.status(500).json({ error: 'Stripe secret key not configured' })

    // SEGURANÇA: Validar priceId no servidor (não confiar no cliente)
    const planId = PRICE_TO_PLAN_MAP[priceId]
    if (!planId) {
      console.error('[stripe-checkout] Invalid priceId:', priceId)
      return res.status(400).json({ error: 'Invalid price ID' })
    }

    // SEGURANÇA: Verificar se plano existe na nossa configuração
    const planConfig = PLANS[planId]
    if (!planConfig) {
      console.error('[stripe-checkout] Plan not found:', planId)
      return res.status(400).json({ error: 'Plan configuration not found' })
    }

    // SEGURANÇA: Se cliente enviou planId, validar se corresponde ao priceId
    if (clientPlanId && clientPlanId !== planId) {
      console.warn('[stripe-checkout] planId mismatch! client:', clientPlanId, 'expected:', planId)
      // Ignorar planId do cliente e usar o validado pelo servidor
    }

    // Log de auditoria
    console.log('[stripe-checkout] Creating session for user:', {
      uid: decodedToken.uid,
      email: verifiedEmail,
      planId,
      priceId
    })

    const stripe = new Stripe(secret)

    const host = process.env.DEFAULT_HOST ? (process.env.DEFAULT_HOST.startsWith('http') ? process.env.DEFAULT_HOST : `https://${process.env.DEFAULT_HOST}`) : `https://` + (req.headers.host || 'localhost')
    const successUrl = `${host}/dashboard?checkout=success`
    const cancelUrl = `${host}/plans`

    const sessionConfig = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { 
        planId,  // planId VALIDADO pelo servidor, não do cliente
        priceId, // guardar priceId para double-check no webhook
        uid: decodedToken.uid, // Guardar UID do usuário autenticado
      },
    }

    if (verifiedEmail) {
      sessionConfig.customer_email = verifiedEmail
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

    return res.json({ url: session.url, id: session.id })
  } catch (err) {
    console.error('[stripe-checkout] error', err && err.message ? err.message : err)
    return res.status(500).json({ error: err && err.message ? err.message : 'internal' })
  }
}
