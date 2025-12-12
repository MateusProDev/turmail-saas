#!/usr/bin/env node
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

async function fixSubscription() {
  const subscriptionId = 'h7JYUBFEeNtxgAKREpVo'

  try {
    console.log('🔍 Buscando subscription atual...')
    const subDoc = await db.collection('subscriptions').doc(subscriptionId).get()

    if (!subDoc.exists) {
      console.error('❌ Subscription não encontrada')
      return
    }

    const currentSub = subDoc.data()
    console.log('📋 Subscription atual:', {
      id: subDoc.id,
      status: currentSub.status,
      planId: currentSub.planId,
      tenantId: currentSub.tenantId
    })

    // Simular o que o webhook deveria ter feito
    const updateData = {
      status: 'active',
      lastPaymentAt: new Date(),
      updatedAt: new Date()
    }

    // Assumir que foi pago o plano PRO (baseado no contexto)
    const targetPlanId = 'pro'
    const PLANS = {
      pro: {
        limits: {
          emailsPerDay: -1,
          emailsPerMonth: 10000,
          campaigns: -1,
          contacts: 100000,
          templates: -1
        }
      }
    }

    const planConfig = PLANS[targetPlanId]
    if (planConfig?.limits) {
      updateData.planId = targetPlanId
      updateData.limits = planConfig.limits

      console.log('🔄 Convertendo trial para plano pago:', {
        subscriptionId,
        fromPlanId: currentSub.planId,
        toPlanId: targetPlanId,
        limits: planConfig.limits
      })

      // Atualizar subscription
      await db.collection('subscriptions').doc(subscriptionId).set(updateData, { merge: true })
      console.log('✅ Subscription atualizada')

      // Atualizar tenant
      if (currentSub.tenantId) {
        await db.collection('tenants').doc(currentSub.tenantId).update({
          planId: targetPlanId,
          limits: planConfig.limits,
          status: 'active',
          updatedAt: new Date()
        })
        console.log('✅ Tenant atualizado:', currentSub.tenantId)
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  }
}

fixSubscription()