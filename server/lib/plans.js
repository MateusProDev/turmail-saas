/**
 * Planos e limites do sistema
 * Centraliza toda a lógica de planos, preços e limites
 */

export const PLANS = {
  trial: {
    id: 'trial',
    name: 'Trial Gratuito',
    price: 0,
    duration: 7, // dias
    limits: {
      emailsPerDay: 50,
      emailsPerMonth: 350, // 50 * 7
      campaigns: 5,
      contacts: 100,
      templates: 3,
    },
    features: [
      '7 dias grátis',
      '50 emails/dia',
      'Até 100 contatos',
      'Até 5 campanhas',
      '3 templates personalizados',
      'Estatísticas básicas',
    ],
  },
  
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 47,
    priceAnnual: 470, // ~10% desconto (47*12 = 564)
    limits: {
      emailsPerDay: 500,
      emailsPerMonth: 15000,
      campaigns: 50,
      contacts: 5000,
      templates: 20,
    },
    features: [
      '500 emails/dia',
      '15.000 emails/mês',
      'Até 5.000 contatos',
      'Até 50 campanhas',
      '20 templates personalizados',
      'Estatísticas avançadas',
      'Suporte por email',
    ],
  },

  pro: {
    id: 'pro',
    name: 'Pro',
    price: 97,
    priceAnnual: 970, // ~10% desconto (97*12 = 1164)
    limits: {
      emailsPerDay: 2000,
      emailsPerMonth: 60000,
      campaigns: 200,
      contacts: 25000,
      templates: 100,
    },
    features: [
      '2.000 emails/dia',
      '60.000 emails/mês',
      'Até 25.000 contatos',
      'Até 200 campanhas',
      '100 templates personalizados',
      'Estatísticas avançadas',
      'Automações',
      'Suporte prioritário',
      'Webhooks',
    ],
    recommended: true,
  },

  agency: {
    id: 'agency',
    name: 'Agency',
    price: 197,
    priceAnnual: 1970, // ~10% desconto (197*12 = 2364)
    limits: {
      emailsPerDay: 10000,
      emailsPerMonth: 300000,
      campaigns: -1, // ilimitado
      contacts: 100000,
      templates: -1, // ilimitado
    },
    features: [
      '10.000 emails/dia',
      '300.000 emails/mês',
      'Até 100.000 contatos',
      'Campanhas ilimitadas',
      'Templates ilimitados',
      'Estatísticas avançadas',
      'Automações avançadas',
      'Multi-tenant',
      'Suporte prioritário',
      'Webhooks',
      'API completa',
      'White label',
    ],
  },

  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: null, // customizado
    limits: {
      emailsPerDay: -1, // ilimitado
      emailsPerMonth: -1, // ilimitado
      campaigns: -1,
      contacts: -1,
      templates: -1,
    },
    features: [
      'Emails ilimitados',
      'Contatos ilimitados',
      'Campanhas ilimitadas',
      'Templates ilimitados',
      'Suporte dedicado 24/7',
      'SLA garantido',
      'Gerente de conta',
      'Onboarding personalizado',
      'Infraestrutura dedicada',
      'Customizações sob medida',
    ],
  },
}

/**
 * Verifica se um usuário excedeu o limite diário de emails
 * @param {string} tenantId - ID do tenant
 * @param {Object} subscription - Dados da subscription
 * @param {number} emailCount - Quantidade de emails a enviar
 * @returns {Object} { allowed: boolean, limit: number, current: number, message: string }
 */
export async function checkDailyEmailLimit(tenantId, subscription, emailCount = 1) {
  const db = (await import('../firebaseAdmin.js')).default.firestore()
  
  // Determinar o plano atual
  const planId = subscription?.planId || subscription?.plan || 'trial'
  const plan = PLANS[planId] || PLANS.trial
  const dailyLimit = plan.limits.emailsPerDay

  // Se ilimitado (-1), sempre permitir
  if (dailyLimit === -1) {
    return { allowed: true, limit: -1, current: 0, message: 'Plano ilimitado' }
  }

  // Buscar contador de emails de hoje
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const counterRef = db.collection('tenants').doc(tenantId).collection('counters').doc(`emails-${today}`)
  const counterSnap = await counterRef.get()
  const currentCount = counterSnap.exists ? (counterSnap.data()?.count || 0) : 0

  const allowed = (currentCount + emailCount) <= dailyLimit
  const remaining = Math.max(0, dailyLimit - currentCount)

  return {
    allowed,
    limit: dailyLimit,
    current: currentCount,
    remaining,
    message: allowed 
      ? `${remaining} emails restantes hoje` 
      : `Limite diário excedido (${dailyLimit} emails/dia)`,
  }
}

/**
 * Incrementa o contador de emails enviados hoje
 * @param {string} tenantId - ID do tenant
 * @param {number} count - Quantidade de emails enviados
 */
export async function incrementDailyEmailCount(tenantId, count = 1) {
  const admin = (await import('../firebaseAdmin.js')).default
  const db = admin.firestore()
  const today = new Date().toISOString().split('T')[0]
  const counterRef = db.collection('tenants').doc(tenantId).collection('counters').doc(`emails-${today}`)
  
  await counterRef.set({
    count: admin.firestore.FieldValue.increment(count),
    date: today,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true })
}

/**
 * Verifica se o trial expirou
 * @param {Object} subscription - Dados da subscription
 * @returns {Object} { expired: boolean, daysRemaining: number }
 */
export function checkTrialStatus(subscription) {
  if (!subscription || !subscription.trialEndsAt) {
    return { expired: true, daysRemaining: 0 }
  }

  const trialEnd = subscription.trialEndsAt.toDate 
    ? subscription.trialEndsAt.toDate() 
    : new Date(subscription.trialEndsAt)
  
  const now = new Date()
  const msRemaining = trialEnd.getTime() - now.getTime()
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24))

  return {
    expired: daysRemaining <= 0,
    daysRemaining: Math.max(0, daysRemaining),
    endsAt: trialEnd,
  }
}

/**
 * Obtém informações do plano de um tenant/subscription
 * @param {Object} subscription - Dados da subscription
 * @returns {Object} Informações do plano
 */
export function getPlanInfo(subscription) {
  const planId = subscription?.planId || subscription?.plan || 'trial'
  const plan = PLANS[planId] || PLANS.trial
  
  return {
    ...plan,
    isActive: subscription?.status === 'active' || subscription?.status === 'trial',
    isTrial: subscription?.status === 'trial',
  }
}

export default { PLANS, checkDailyEmailLimit, incrementDailyEmailCount, checkTrialStatus, getPlanInfo }
