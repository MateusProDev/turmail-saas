/**
 * Planos e limites do sistema
 * Centraliza toda a lógica de planos, preços e limites
 */

export const PLANS = {
  trial: {
    id: 'trial',
    name: 'Trial Gratuito',
    price: 0,
    duration: 14, // dias
    limits: {
      emailsPerDay: 50,
      emailsPerMonth: 1500, // 50/dia * 30 dias
      campaigns: -1, // ILIMITADO
      contacts: 1000, // GENEROSO: 1.000 contatos no trial
      templates: -1, // ILIMITADO
    },
    features: [
      '14 dias grátis',
      '50 emails/dia',
      '1.500 emails/mês',
      '1.000 contatos',
      'Campanhas ilimitadas',
      'Templates ilimitados',
      'Todos os recursos incluídos',
      'Sem cartão de crédito',
    ],
  },
  
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 47,
    priceAnnual: 42, // 10% desconto anual (R$ 504/ano)
    limits: {
      emailsPerDay: 167,
      emailsPerMonth: 5000,
      campaigns: -1, // ILIMITADO
      contacts: 25000, // GENEROSO: 25mil contatos (vs 500k do Brevo mas mais emails)
      templates: -1, // ILIMITADO
    },
    features: [
      '5.000 emails/mês',
      '167 emails por dia',
      '25.000 contatos incluídos',
      'Campanhas ilimitadas',
      'Templates ilimitados',
      'Editor drag & drop',
      'IA para criar conteúdo',
      'Galeria de imagens',
      'Relatórios e analytics',
      'Suporte em português',
    ],
  },

  pro: {
    id: 'pro',
    name: 'Professional',
    price: 97,
    priceAnnual: 87, // 10% desconto anual (R$ 1.044/ano)
    limits: {
      emailsPerDay: 667,
      emailsPerMonth: 20000,
      campaigns: -1, // ILIMITADO
      contacts: 100000, // GENEROSO: 100mil contatos
      templates: -1, // ILIMITADO
    },
    features: [
      '20.000 emails/mês',
      '667 emails por dia',
      '100.000 contatos incluídos',
      'Campanhas ilimitadas',
      'Templates ilimitados',
      'Tudo do Starter, mais:',
      'Automação avançada',
      'Testes A/B',
      'Relatórios em tempo real',
      'Mapas de calor de cliques',
      'Webhooks personalizados',
      'Suporte prioritário',
      'Sem marca Turmail',
    ],
    recommended: true,
  },

  agency: {
    id: 'agency',
    name: 'Agency',
    price: 197,
    priceAnnual: 177, // 10% desconto anual (R$ 2.124/ano)
    limits: {
      emailsPerDay: 1667,
      emailsPerMonth: 50000,
      campaigns: -1, // ILIMITADO
      contacts: -1, // ILIMITADO (diferencial KILLER!)
      templates: -1, // ILIMITADO
    },
    features: [
      '50.000 emails/mês',
      '1.667 emails por dia',
      'Contatos ILIMITADOS',
      'Campanhas ilimitadas',
      'Templates ilimitados',
      'Tudo do Professional, mais:',
      'Multi-tenant (múltiplos clientes)',
      'White-label completo',
      'API ilimitada',
      'Integração com CRM',
      'Relatórios personalizados',
      'Suporte VIP dedicado',
      'Onboarding personalizado',
      'SLA garantido',
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
