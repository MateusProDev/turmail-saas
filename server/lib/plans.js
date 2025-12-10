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
    priceAnnual: 42,
    limits: {
      emailsPerDay: -1,
      emailsPerMonth: 2000,
      campaigns: -1,
      contacts: 25000,
      templates: -1,
    },
    features: [
      'Automação de fluxos para recuperar e fidelizar clientes',
      'Editor visual com templates otimizados por conversão',
      'Prioridade em entregabilidade e qualidade de envio',
      'Segmentação inteligente por comportamento',
      'Relatórios acionáveis e recomendações de otimização',
      'Suporte em português',
    ],
  },

  pro: {
    id: 'pro',
    name: 'Professional',
    price: 97,
    priceAnnual: 87,
    recommended: true,
    limits: {
      emailsPerDay: -1,
      emailsPerMonth: 10000,
      campaigns: -1,
      contacts: 100000,
      templates: -1,
    },
    features: [
      'Automação avançada com gatilhos e personalização por comportamento',
      'Testes A/B de assunto e conteúdo para maximizar conversões',
      'Relatórios em tempo real com sugestões práticas',
      'Mapas de calor de cliques e análise de engajamento',
      'Integrações para enriquecer dados do cliente',
      'Suporte prioritário e onboarding para campanhas críticas',
    ],
  },

  agency: {
    id: 'agency',
    name: 'Agency',
    price: 297,
    priceAnnual: 3207.6, // R$ 3.207,60/ano (equiv. R$ 267,30/mês)
    limits: {
      emailsPerDay: -1,
      emailsPerMonth: 50000,
      campaigns: -1,
      contacts: -1,
      templates: -1,
    },
    features: [
      'Foco em qualidade: entregabilidade e gerenciamento de reputação',
      'White-label e multi-tenant para operar agências',
      'APIs e integrações completas para automação de processos',
      'Relatórios personalizados e consultoria para otimização',
      'Suporte VIP e onboarding dedicado',
      'SLA disponível para operações críticas',
    ],
  },

  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: null, // customizado
    limits: {
      emailsPerDay: -1,
      emailsPerMonth: -1,
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
 * Pacotes Extras (addons) — itens que podem ser comprados separadamente para aumentar limites
 * Cada addon pode ser mapeado para um Price ID no Stripe (gerenciado via env vars)
 */
export const EXTRAS = {
  emails_boost_2000: {
    id: 'emails_boost_2000',
    name: 'Pacote +2.000 emails',
    adds: {
      emailsPerMonth: 2000,
      emailsPerDay: Math.ceil(2000 / 30),
    },
    priceEnv: 'VITE_STRIPE_PRICE_ADDON_EMAILS_2000',
  },
  contacts_boost_10000: {
    id: 'contacts_boost_10000',
    name: 'Pacote +10.000 contatos',
    adds: {
      contacts: 10000,
    },
    priceEnv: 'VITE_STRIPE_PRICE_ADDON_CONTACTS_10000',
  },
}

/**
 * Aplica uma lista de addons sobre um objeto de limites, retornando novos limites calculados
 */
export function applyAddonsToLimits(baseLimits = {}, addons = []) {
  const result = { ...baseLimits }
  for (const a of addons || []) {
    const def = EXTRAS[a]
    if (!def) continue
    const adds = def.adds || {}
    for (const k of Object.keys(adds)) {
      const addVal = adds[k]
      if (typeof addVal === 'number') {
        if (result[k] === -1 || result[k] === undefined) {
          // if base is unlimited or missing, keep as unlimited or set numeric
          result[k] = result[k] === -1 ? -1 : (addVal)
        } else {
          result[k] = (result[k] || 0) + addVal
        }
      }
    }
  }
  return result
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
  const monthlyLimit = plan.limits.emailsPerMonth

  // Determine effective daily limit:
  // - if plan has a numeric emailsPerDay, use it
  // - if emailsPerDay is -1 (ilimitado) but there is a finite monthlyLimit, cap daily at monthlyLimit
  // - if both are -1, treat as unlimited
  let effectiveDailyLimit
  if (dailyLimit === -1) {
    effectiveDailyLimit = (monthlyLimit === -1 || monthlyLimit === undefined) ? -1 : monthlyLimit
  } else {
    effectiveDailyLimit = dailyLimit
  }

  // If effectively unlimited, allow
  if (effectiveDailyLimit === -1) {
    return { allowed: true, limit: -1, current: 0, message: 'Plano ilimitado' }
  }

  // Buscar contador de emails de hoje
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const counterRef = db.collection('tenants').doc(tenantId).collection('counters').doc(`emails-${today}`)
  const counterSnap = await counterRef.get()
  const currentCount = counterSnap.exists ? (counterSnap.data()?.count || 0) : 0

  const allowed = (currentCount + emailCount) <= effectiveDailyLimit
  const remaining = Math.max(0, effectiveDailyLimit - currentCount)

  return {
    allowed,
    limit: effectiveDailyLimit,
    current: currentCount,
    remaining,
    message: allowed 
      ? `${remaining} emails restantes hoje` 
      : `Limite diário excedido (${effectiveDailyLimit} emails/dia)`,
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

export default {
  PLANS,
  EXTRAS,
  applyAddonsToLimits,
  checkDailyEmailLimit,
  incrementDailyEmailCount,
  checkTrialStatus,
  getPlanInfo
}