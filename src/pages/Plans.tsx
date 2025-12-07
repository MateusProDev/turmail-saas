import { useState, useEffect } from 'react'
import { FaCheck } from 'react-icons/fa'
import './Plans.css'
import { createCheckoutSession } from '../lib/stripe'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth, db } from '../lib/firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'

const PLANS: { 
  id: string
  name: string
  price?: number
  priceAnnual?: number
  priceIdEnvMonthly?: string
  priceIdEnvAnnual?: string
  recommended?: boolean
  limits?: {
    emailsPerDay: number
    emailsPerMonth: number
    campaigns: number
    contacts: number
  }
  features: string[]
}[] = [
  { 
    id: 'trial', 
    name: 'Trial Gratuito', 
    price: 0,
    limits: {
      emailsPerDay: 50,
      emailsPerMonth: 350,
      campaigns: 5,
      contacts: 100,
    },
    features: [
      '7 dias grátis',
      '50 emails/dia',
      'Até 100 contatos',
      'Até 5 campanhas',
      '3 templates',
      'Estatísticas básicas',
    ]
  },
  { 
    id: 'starter', 
    name: 'Starter', 
    price: 47,
    priceAnnual: 470,
    priceIdEnvMonthly: 'VITE_STRIPE_PRICE_STARTER',
    priceIdEnvAnnual: 'VITE_STRIPE_PRICE_STARTER_ANNUAL',
    limits: {
      emailsPerDay: 500,
      emailsPerMonth: 15000,
      campaigns: 50,
      contacts: 5000,
    },
    features: [
      '500 emails/dia',
      '15.000 emails/mês',
      'Até 5.000 contatos',
      'Até 50 campanhas',
      '20 templates',
      'Estatísticas avançadas',
      'Suporte por email',
    ]
  },
  { 
    id: 'pro', 
    name: 'Pro', 
    price: 97,
    priceAnnual: 970,
    priceIdEnvMonthly: 'VITE_STRIPE_PRICE_PRO',
    priceIdEnvAnnual: 'VITE_STRIPE_PRICE_PRO_ANNUAL',
    recommended: true,
    limits: {
      emailsPerDay: 2000,
      emailsPerMonth: 60000,
      campaigns: 200,
      contacts: 25000,
    },
    features: [
      '2.000 emails/dia',
      '60.000 emails/mês',
      'Até 25.000 contatos',
      'Até 200 campanhas',
      '100 templates',
      'Automações',
      'Estatísticas avançadas',
      'Suporte prioritário',
      'Webhooks',
    ]
  },
  { 
    id: 'agency', 
    name: 'Agency', 
    price: 197,
    priceAnnual: 1970,
    priceIdEnvMonthly: 'VITE_STRIPE_PRICE_AGENCY',
    priceIdEnvAnnual: 'VITE_STRIPE_PRICE_AGENCY_ANNUAL',
    limits: {
      emailsPerDay: 10000,
      emailsPerMonth: 300000,
      campaigns: -1,
      contacts: 100000,
    },
    features: [
      '10.000 emails/dia',
      '300.000 emails/mês',
      'Até 100.000 contatos',
      'Campanhas ilimitadas',
      'Templates ilimitados',
      'Automações avançadas',
      'Multi-tenant',
      'White label',
      'Suporte prioritário',
      'API completa',
    ]
  },
]

export default function Plans() {
  const [loading, setLoading] = useState(false)
  const [user] = useAuthState(auth)
  const [subscription, setSubscription] = useState<any>(null)
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly')
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      setSubscription(null)
      return
    }
    const subsRef = collection(db, 'subscriptions')
    // Listen by ownerUid, then fallback to email if not found
    const qByUid = query(subsRef, where('ownerUid', '==', user.uid))
    let unsubUid: any = null
    let unsubEmail: any = null

    const handleSnap = (snap: any) => {
      if (!snap.empty) {
        const doc = snap.docs[0]
        setSubscription({ id: doc.id, ...doc.data() })
        return true
      }
      return false
    }

    unsubUid = onSnapshot(qByUid, (snap) => {
      const found = handleSnap(snap)
      if (!found && user.email) {
        if (unsubEmail) unsubEmail()
        const qByEmail = query(subsRef, where('email', '==', user.email))
        unsubEmail = onSnapshot(qByEmail, (snap2) => {
          if (!snap2.empty) {
            const doc = snap2.docs[0]
            setSubscription({ id: doc.id, ...doc.data() })
          } else {
            setSubscription(null)
          }
        }, (err) => console.error('subscription-by-email snapshot error', err))
      }
    }, (err) => console.error('subscription snapshot error', err))

    return () => {
      if (unsubUid) unsubUid()
      if (unsubEmail) unsubEmail()
    }
  }, [user])

  const handleCheckout = async (plan: typeof PLANS[number]) => {
    // Se usuário não estiver logado, salvar plano e redirecionar para signup
    if (!user) {
      // Salvar dados do plano escolhido no localStorage com nome do plano
      localStorage.setItem('pendingPlan', JSON.stringify({
        planId: plan.id,
        planName: plan.name,
        price: plan.price,
        priceIdEnvMonthly: (plan as any).priceIdEnvMonthly,
        priceIdEnvAnnual: (plan as any).priceIdEnvAnnual,
        billingInterval,
      }))
      
      // Redirecionar para login com flag de signup
      navigate('/login?signup=1')
      return
    }

    // detect trial plan
    if (plan.id === 'trial' || plan.price === 0) {
      try {
        setLoading(true)
        // Call server endpoint to start a 7-day trial
        const resp = await fetch('/api/start-trial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: user.uid, email: user.email, planId: 'trial' }),
        })
        const json = await resp.json()
        if (!resp.ok) {
          console.error('start-trial failed', json)
          alert('Falha ao iniciar trial gratuito: ' + (json.error || 'erro desconhecido'))
        } else {
          alert('🎉 Trial gratuito iniciado! Você tem 7 dias com 50 emails/dia.')
          navigate('/dashboard')
        }
      } catch (err) {
        console.error('failed to start trial', err)
        alert('Falha ao iniciar trial gratuito')
      } finally {
        setLoading(false)
      }
      return
    }

    // decide which Price ID env var to use depending on billing interval
    const envKey =
      billingInterval === 'annual'
        ? (plan as any).priceIdEnvAnnual || (plan as any).priceIdEnvMonthly
        : (plan as any).priceIdEnvMonthly || (plan as any).priceIdEnvAnnual
    const priceId = envKey ? (import.meta.env as any)[envKey] : null
    if (!priceId) {
      alert('Price ID não configurado para esse intervalo. Verifique suas variáveis de ambiente.')
      return
    }

    try {
      setLoading(true)
      const json = await createCheckoutSession(priceId, plan.id, user?.email || null)
      if (json?.url) {
        window.location.href = json.url
      } else {
        alert('Falha ao iniciar checkout')
      }
    } catch (err) {
      console.error(err)
      alert('Erro no checkout')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (p: typeof PLANS[number]) => {
    const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    if (p.price === 0 || p.id === 'trial') {
      return { type: 'free', label: 'Grátis' }
    }

    const monthly = p.price || 0
    const monthlyLabel = `${fmt.format(monthly)}/mês`
    if (billingInterval === 'monthly') return { type: 'monthly', label: monthlyLabel }

    // annual - use priceAnnual if available
    const annualPrice = p.priceAnnual || (monthly * 12 * 0.9) // 10% discount default
    const equivMonthly = `${fmt.format(Math.round(annualPrice / 12))}/mês`
    const discountedLabel = `${fmt.format(annualPrice)}/ano`
    return {
      type: 'annual',
      discounted: discountedLabel,
      equivMonthly,
    }
  }

  return (
    <div className="plans-root w-full p-8">
      <header className="plans-header mb-6">
        <h1 className="text-2xl font-bold">Planos</h1>
        <p className="text-sm text-gray-600 mt-1">Escolha um plano que atenda seu projeto — atualize quando quiser.</p>
      </header>

      {/* Trial Banner - Discreto */}
      {!subscription?.planId || subscription?.planId === 'trial' ? (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">🎉 Teste Grátis - 7 Dias</h3>
              <p className="text-sm text-blue-700">
                Comece agora com 50 emails/dia • Sem cartão de crédito
              </p>
            </div>
            <button
              onClick={() => {
                const trialPlan = PLANS.find(p => p.id === 'trial')
                if (trialPlan) handleCheckout(trialPlan)
              }}
              disabled={loading || (subscription?.planId === 'trial')}
              className={`px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors ${loading || subscription?.planId === 'trial' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {subscription?.planId === 'trial' ? '✓ Trial Ativo' : 'Começar Grátis'}
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="text-sm text-gray-600">Cobrança:</div>
        <div className="flex items-center gap-2">
          <button
            className={`px-3 py-1 rounded ${billingInterval === 'monthly' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => setBillingInterval('monthly')}
          >
            Mensal
          </button>
          <button
            className={`px-3 py-1 rounded ${billingInterval === 'annual' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => setBillingInterval('annual')}
          >
            Anual (10% off)
          </button>
        </div>
      </div>

      <div className="plans-grid mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.filter(p => p.id !== 'trial').map((p) => {
          const featured = !!p.recommended
          const isCurrent = subscription ? (subscription.planId === p.id) : false
          
          return (
            <div
              key={p.id}
              className={`plans-card bg-white rounded-lg p-6 ${featured ? 'ring-2 ring-blue-600 shadow-xl scale-105 relative' : 'shadow-lg border border-gray-200'}`}
            >
              {featured && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    ⭐ Recomendado
                  </span>
                </div>
              )}
              
              <div className="flex flex-col items-start">
                <div className="flex flex-col items-center mb-4 w-full">
                  <h2 className="text-2xl font-bold text-gray-900">{p.name}</h2>
                  {isCurrent && (
                    <span className="mt-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                      ✓ Plano Atual
                    </span>
                  )}
                </div>

                <div className="text-center w-full mb-4">
                  <div className="text-4xl font-bold text-gray-900 mb-1">
                    {(() => {
                      const pr = formatPrice(p)
                      if (pr.type === 'monthly') return pr.label
                      if (pr.type === 'annual') return pr.equivMonthly
                      return pr.label
                    })()}
                  </div>
                  <div className="text-sm text-gray-600">
                    {billingInterval === 'annual' ? (
                      <>Cobrado anualmente • 10% desconto</>
                    ) : (
                      <>Cobrado mensalmente</>
                    )}
                  </div>
                </div>

                {/* Limits display */}
                {p.limits && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg w-full">
                    <div className="font-semibold text-gray-900 mb-3 text-center">Limites</div>
                    <div className="space-y-2 text-gray-700">
                      <div className="flex items-center justify-between">
                        <span>📧 Emails/dia</span>
                        <span className="font-semibold">{p.limits.emailsPerDay === -1 ? 'Ilimitado' : p.limits.emailsPerDay.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>📊 Campanhas</span>
                        <span className="font-semibold">{p.limits.campaigns === -1 ? 'Ilimitado' : p.limits.campaigns.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>👥 Contatos</span>
                        <span className="font-semibold">{p.limits.contacts === -1 ? 'Ilimitado' : p.limits.contacts.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-4 mb-6 w-full">
                  <ul className="space-y-3 text-sm text-gray-700">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-3">
                        <FaCheck className="text-blue-600 w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto w-full">
                  <button
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center ${
                      featured 
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg' 
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    } ${loading || isCurrent ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => handleCheckout(p)}
                    disabled={loading || isCurrent}
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Processando...
                      </>
                    ) : isCurrent ? (
                      '✓ Plano Atual'
                    ) : (
                      `Ativar ${p.name}`
                    )}
                  </button>
                  {!user && (
                    <p className="text-xs text-gray-500 text-center mt-2">
                      Você será direcionado para criar uma conta
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer note removed per user request (env setup instructions were previously shown here) */}
    </div>
  )
}

