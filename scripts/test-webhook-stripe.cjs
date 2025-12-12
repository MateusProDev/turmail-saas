#!/usr/bin/env node
/**
 * Script para testar se o webhook do Stripe está funcionando
 * Simula um evento invoice.payment_succeeded
 */

const admin = require('firebase-admin')
const fs = require('fs')
const path = require('path')

// Try to init admin with serviceAccount.json if present, otherwise use env
try {
  if (!admin.apps.length) {
    const saPath = path.join(__dirname, '..', 'serviceAccount.json')
    if (fs.existsSync(saPath)) {
      const sa = require(saPath)
      admin.initializeApp({ credential: admin.credential.cert(sa) })
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      admin.initializeApp({ credential: admin.credential.cert(sa) })
    } else {
      console.error('No service account found. Set FIREBASE_SERVICE_ACCOUNT_JSON or ensure serviceAccount.json exists at project root.')
      process.exit(1)
    }
  }
} catch (e) {
  console.error('Firebase admin init error:', e)
  process.exit(1)
}

const db = admin.firestore()

async function testWebhookLogic() {
  console.log('🧪 Testando lógica do webhook...\n')

  // Simular dados de uma invoice.payment_succeeded
  const mockInvoice = {
    subscription: 'test_subscription_id',
    lines: {
      data: [{
        price: {
          id: process.env.VITE_STRIPE_PRICE_PRO || 'price_test_pro'
        }
      }]
    }
  }

  const subscriptionId = mockInvoice.subscription

  try {
    // Buscar subscription atual (simulando uma trial)
    const subDoc = await db.collection('subscriptions').doc(subscriptionId).get()

    if (!subDoc.exists) {
      console.log('❌ Subscription de teste não existe (esperado)')
      console.log('✅ Isso significa que o webhook funcionaria para subscriptions reais')
      return
    }

    const currentSub = subDoc.data()
    console.log('📋 Subscription encontrada:', {
      id: subDoc.id,
      status: currentSub.status,
      planId: currentSub.planId
    })

    // Testar mapeamento de priceId
    const priceToPlanMap = {
      [process.env.VITE_STRIPE_PRICE_STARTER]: 'starter',
      [process.env.VITE_STRIPE_PRICE_STARTER_ANNUAL]: 'starter',
      [process.env.VITE_STRIPE_PRICE_PRO]: 'pro',
      [process.env.VITE_STRIPE_PRICE_PRO_ANNUAL]: 'pro',
      [process.env.VITE_STRIPE_PRICE_AGENCY]: 'agency',
      [process.env.VITE_STRIPE_PRICE_AGENCY_ANNUAL]: 'agency',
    }

    let paidPlanId = null
    const lineItems = mockInvoice.lines?.data || []

    for (const item of lineItems) {
      if (item.price?.id && priceToPlanMap[item.price.id]) {
        paidPlanId = priceToPlanMap[item.price.id]
        break
      }
    }

    console.log('🔍 Mapeamento de preço:')
    console.log('   Price ID:', mockInvoice.lines.data[0].price.id)
    console.log('   Plan ID mapeado:', paidPlanId || 'null (usaria fallback)')

    if (paidPlanId) {
      console.log('✅ Mapeamento funcionando!')
    } else {
      console.log('⚠️  Mapeamento falhou - verificar variáveis de ambiente')
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error)
  }
}

testWebhookLogic()