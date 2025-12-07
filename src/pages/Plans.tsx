import { useState, useEffect } from 'react'
import { FaCheck, FaStar, FaTag } from 'react-icons/fa'
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
    // detect trial plan
    if (plan.id === 'trial' || plan.price === 0) {
      if (!user) {
        alert('Você precisa fazer login para iniciar o trial gratuito')
        navigate('/login')
        return
      }
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
      const json = await createCheckoutSession(priceId)
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

      <div className="flex items-center justify-between gap-4 mb-4">
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
            Anual
          </button>
        </div>
      </div>

      <div className="plans-grid mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((p) => {
          const featured = !!p.recommended
          const isCurrent = subscription ? (subscription.planId === p.id) : p.id === 'trial'
          const userHasTrial = !!(subscription && subscription.planId === 'trial')
          return (
            <div
              key={p.id}
              className={`plans-card bg-white rounded p-4 ${featured ? 'featured' : 'shadow-sm'}`}
            >
              <div className="flex flex-col items-start">
                            <div className="flex flex-col items-center mb-2 w-full">
                              <div className="p-2 bg-blue-50 rounded-full inline-flex items-center justify-center mb-2">
                                <FaTag className="text-blue-600 w-5 h-5" />
                              </div>
                              <h2 className="text-lg font-semibold">{p.name}</h2>
                              <div className="flex items-center gap-2 mt-2">
                                {featured && <span className="plans-badge"><FaStar className="inline mr-2 text-yellow-400" />Recomendado</span>}
                                {isCurrent && <span className="plans-badge current">Atual</span>}
                              </div>
                            </div>

                <div className="text-gray-500 text-sm mb-1">
                  {p.id === 'trial' ? '7 dias grátis' : billingInterval === 'monthly' ? 'Cobrança mensal' : 'Cobrança anual (10% desconto)'}
                </div>
                <div className="mb-3">
                  {(() => {
                    const pr = formatPrice(p)
                    if (!pr) return null
                    if (pr.type === 'free') {
                      return <div className="text-2xl font-bold">{pr.label}</div>
                    }
                    if (pr.type === 'monthly') {
                      return <div className="text-2xl font-bold">{pr.label}</div>
                    }
                    return (
                      <div className="price-annual">
                        <div className="text-2xl font-bold discounted">{pr.discounted}</div>
                        <div className="text-sm text-gray-500 equiv">Equiv. {pr.equivMonthly}</div>
                      </div>
                    )
                  })()}
                </div>

                {/* Limits display */}
                {p.limits && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm">
                    <div className="font-semibold text-blue-900 mb-2">Limites</div>
                    <div className="space-y-1 text-blue-800">
                      <div>📧 {p.limits.emailsPerDay === -1 ? 'Ilimitado' : `${p.limits.emailsPerDay.toLocaleString()} emails/dia`}</div>
                      <div>📊 {p.limits.campaigns === -1 ? 'Ilimitado' : `${p.limits.campaigns} campanhas`}</div>
                      <div>👥 {p.limits.contacts === -1 ? 'Ilimitado' : `${p.limits.contacts.toLocaleString()} contatos`}</div>
                    </div>
                  </div>
                )}

                <ul className="mt-2 text-sm text-gray-600 space-y-3 text-left">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-gray-600">
                      <FaCheck className="text-blue-500 w-4 h-4 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 w-full">
                  {p.id === 'trial' ? (
                    userHasTrial ? (
                      (function renderTrialInfo() {
                        const data: any = subscription || {}
                        const toDate = (t: any) => {
                          if (!t) return null
                          if (typeof t.toDate === 'function') return t.toDate()
                          if (t.seconds) return new Date(t.seconds * 1000)
                          return new Date(t)
                        }
                        const trialEnds = toDate(data.trialEndsAt)
                        const now = new Date()
                        const diffMs = trialEnds ? trialEnds.getTime() - now.getTime() : null
                        const daysLeft = diffMs !== null ? Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24))) : null

                        return (
                          <div className="text-sm">
                            {daysLeft !== null && daysLeft > 0 ? (
                              <div className="p-3 bg-green-50 rounded-lg">
                                <div className="font-semibold text-green-900">✅ Trial Ativo</div>
                                <div className="text-green-700 mt-1">{daysLeft} dia{daysLeft > 1 ? 's' : ''} restante{daysLeft > 1 ? 's' : ''}</div>
                              </div>
                            ) : (
                              <div className="p-3 bg-red-50 rounded-lg">
                                <div className="font-semibold text-red-900">❌ Trial Expirado</div>
                                <div className="text-red-700 mt-1">Faça upgrade para continuar</div>
                              </div>
                            )}
                          </div>
                        )
                      })()
                    ) : (
                      !user ? (
                        <div className="text-sm text-gray-600">
                          <div>Faça login para começar seu teste gratuito de 7 dias.</div>
                          <div className="mt-2">
                            <button onClick={() => navigate('/login')} className="px-4 py-2 bg-blue-600 text-white rounded-md">Entrar</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className={`plans-cta w-full ${loading ? 'disabled' : ''}`}
                          onClick={() => handleCheckout(p)}
                          disabled={loading}
                        >
                          {loading ? 'Processando...' : '🎉 Começar Trial Grátis'}
                        </button>
                      )
                    )
                  ) : (
                    <button
                      className={`plans-cta ${loading ? 'disabled' : ''}`}
                      onClick={() => handleCheckout(p)}
                      aria-disabled={loading}
                      disabled={loading}
                    >
                      {'Ativar plano'}
                    </button>
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

