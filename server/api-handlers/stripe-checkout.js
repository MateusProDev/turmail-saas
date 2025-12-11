import Stripe from 'stripe'
import { PLANS } from '../lib/plans.js'
import admin from '../firebaseAdmin.js'
const firebaseAuth = admin.auth()

// Mapeamento seguro de Price IDs para items (planos ou addons)
// Isso impede que usuário manipule localStorage para pagar menor preço
const PRICE_TO_ITEM_MAP = {
  // Starter
  [process.env.VITE_STRIPE_PRICE_STARTER]: { type: 'plan', id: 'starter' },
  [process.env.VITE_STRIPE_PRICE_STARTER_ANNUAL]: { type: 'plan', id: 'starter' },
  
  // Pro
  [process.env.VITE_STRIPE_PRICE_PRO]: { type: 'plan', id: 'pro' },
  [process.env.VITE_STRIPE_PRICE_PRO_ANNUAL]: { type: 'plan', id: 'pro' },
  
  // Agency
  [process.env.VITE_STRIPE_PRICE_AGENCY]: { type: 'plan', id: 'agency' },
  [process.env.VITE_STRIPE_PRICE_AGENCY_ANNUAL]: { type: 'plan', id: 'agency' },

  // Addons / Pacotes Extras (configurar as Price IDs nas env vars)
  [process.env.VITE_STRIPE_PRICE_ADDON_EMAILS_2000]: { type: 'addon', id: 'emails_boost_2000' },
  [process.env.VITE_STRIPE_PRICE_ADDON_CONTACTS_10000]: { type: 'addon', id: 'contacts_boost_10000' },
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
    const mapped = PRICE_TO_ITEM_MAP[priceId]
    if (!mapped) {
      console.error('[stripe-checkout] Invalid priceId:', priceId)
      return res.status(400).json({ error: 'Invalid price ID' })
    }

    // Se for um plano, validaremos a configuração do plano
    let planId = null
    let addonId = null
    if (mapped.type === 'plan') {
      planId = mapped.id
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
    } else if (mapped.type === 'addon') {
      addonId = mapped.id
      // não é necessário validar como plano; addons são tratados separadamente
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
    const successUrl = `${host}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}&plan=${planId}&uid=${decodedToken.uid}`
    const cancelUrl = `${host}/plans?cancel=1&plan=${planId}`

    const sessionConfig = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { 
        priceId, // guardar priceId para double-check no webhook
        uid: decodedToken.uid, // Guardar UID do usuário autenticado
        email: verifiedEmail, // Email verificado
        planId: planId, // ID do plano
        planName: planConfig?.name || planId, // Nome do plano
        timestamp: Date.now().toString(), // Timestamp para idempotência
        requiresOnboarding: planId !== 'trial' ? 'true' : 'false', // Planos pagos precisam de onboarding
        source: 'stripe_checkout' // Origem da transação
      },
      customer_email: verifiedEmail,
      client_reference_id: decodedToken.uid,
      redirect_on_completion: 'always'
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

    return res.json({ url: session.url, id: session.id })
  } catch (err) {
    console.error('[stripe-checkout] error', err && err.message ? err.message : err)
    return res.status(500).json({ error: err && err.message ? err.message : 'internal' })
  }
}
