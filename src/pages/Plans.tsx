import { useState, useEffect } from 'react'
import { FaCheck, FaStar, FaTag } from 'react-icons/fa'
import './Plans.css'
import { createCheckoutSession } from '../lib/stripe'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth, db } from '../lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'

const PLANS: { id: string; name: string; priceMonthly?: number; priceIdEnvMonthly?: string; priceIdEnvAnnual?: string; recommended?: boolean }[] = [
  { id: 'free', name: 'Free', priceMonthly: 0 },
  { id: 'pro', name: 'Pro', priceMonthly: 97, priceIdEnvMonthly: 'VITE_STRIPE_PRICE_PRO', /* add annual env var if available */ recommended: true },
  { id: 'agency', name: 'Agency', priceMonthly: 197, priceIdEnvMonthly: 'VITE_STRIPE_PRICE_AGENCY' },
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
    const fetchSubscription = async () => {
      try {
        const subsRef = collection(db, 'subscriptions')
        const q = query(subsRef, where('ownerUid', '==', user.uid))
        const snap = await getDocs(q)
        if (!snap.empty) {
          const doc = snap.docs[0]
          setSubscription({ id: doc.id, ...doc.data() })
        } else {
          setSubscription(null)
        }
      } catch (err) {
        console.error('failed to fetch subscription', err)
        setSubscription(null)
      }
    }
    fetchSubscription()
  }, [user])

  const handleCheckout = async (plan: typeof PLANS[number]) => {
    // detect free plan by id or priceMonthly === 0
    if (plan.id === 'free' || (plan.priceMonthly !== undefined && plan.priceMonthly === 0)) {
      if (!user) {
        alert('Você precisa entrar para selecionar o plano gratuito')
        navigate('/login')
        return
      }
      try {
        setLoading(true)
        // Call server endpoint to start a 14-day trial and record client IP server-side.
        const resp = await fetch('/api/start-trial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: user.uid, email: user.email, planId: 'free' }),
        })
        const json = await resp.json()
        if (!resp.ok) {
          console.error('start-trial failed', json)
          alert('Falha ao iniciar teste gratuito')
        } else {
          alert('Teste gratuito iniciado — 14 dias!')
          navigate('/dashboard')
        }
      } catch (err) {
        console.error('failed to start trial', err)
        alert('Falha ao iniciar teste gratuito')
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
    if ((!p.priceMonthly && p.id === 'free') || p.priceMonthly === 0) {
      return { type: 'free', label: 'R$0/mês' }
    }

    const monthly = p.priceMonthly || 0
    const monthlyLabel = `${fmt.format(monthly)}/mês`
    if (billingInterval === 'monthly') return { type: 'monthly', label: monthlyLabel }

    // annual - apply 5% discount on total yearly price
    const annualRaw = monthly * 12
    const discounted = Math.round(annualRaw * 0.95)
    const originalLabel = `${fmt.format(annualRaw)}/ano`
    const discountedLabel = `${fmt.format(discounted)}/ano (5% off)`
    const equivMonthly = `${fmt.format(Math.round(discounted / 12))}/mês`
    return {
      type: 'annual',
      original: originalLabel,
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
          // keep visual 'current' badge for free when user has no subscription,
          // but treat an actual free subscription separately when showing trial info
          const isCurrent = subscription ? (subscription.planId === p.id) : p.id === 'free'
          const userHasFree = !!(subscription && subscription.planId === 'free')
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

                <div className="text-gray-500 text-sm mb-1">{p.id === 'free' ? 'Sem compromisso' : billingInterval === 'monthly' ? 'Cobrança mensal' : 'Cobrança anual'}</div>
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
                        <div className="text-sm text-gray-500 original">{pr.original}</div>
                        <div className="text-2xl font-bold discounted">{pr.discounted}</div>
                        <div className="text-sm text-gray-500 equiv">Equiv. {pr.equivMonthly}</div>
                      </div>
                    )
                  })()}
                </div>

                <ul className="mt-2 text-sm text-gray-600 space-y-3 text-left">
                  {(function renderFeatures() {
                    if (p.id === 'free') {
                      return [
                        'Conectar conta Brevo (inserir API Key) — limitado',
                        'Envio de campanhas básico (limite mensal)',
                        'Templates básicos de e-mail para agências de turismo',
                        'Gestão de contatos (limitação de tamanho)'
                      ].map((f) => (
                          <li key={f} className="flex items-center gap-3 text-sm text-gray-600">
                            <FaCheck className="text-blue-500 w-4 h-4 flex-shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))
                    }

                    if (p.id === 'pro') {
                      return [
                        'Conectar Brevo com API Key secreta (full access)',
                        'Templates premium de e-mail voltados para agências de turismo',
                        'Cotas de envio conforme sua conta Brevo (nós intermediamos envio e automações)',
                        'Segmentação de contatos e tags',
                        'Acesso a modelos personalizáveis e editor de templates',
                        'Métricas e relatórios fornecidos pela nossa plataforma (baseado nos dados do Brevo)'
                      ].map((f) => (
                          <li key={f} className="flex items-center gap-3 text-sm text-gray-600">
                            <FaCheck className="text-blue-500 w-4 h-4 flex-shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))
                    }

                    // agency
                    return [
                      'Suporte para múltiplas contas/teams e gerenciamento de clientes',
                      'Templates avançados e automações específicas para agências de turismo',
                      'Cotas de envio conforme as contas Brevo dos seus clientes (intermediação pela nossa plataforma)',
                      'Relatórios e análises avançadas por campanha (agregadas a partir dos dados do Brevo)',
                      'Suporte prioritário e onboarding dedicado'
                    ].map((f) => (
                      <li key={f} className="flex items-center gap-3 text-sm text-gray-600">
                        <FaCheck className="text-blue-500 w-4 h-4 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))
                  })()}
                </ul>

                <div className="mt-6 w-full">
                  {p.id === 'free' ? (
                    userHasFree ? (
                      (function renderTrialInfo() {
                        const data: any = subscription || {}
                        const toDate = (t: any) => {
                          if (!t) return null
                          if (typeof t.toDate === 'function') return t.toDate()
                          if (t.seconds) return new Date(t.seconds * 1000)
                          return new Date(t)
                        }
                        const trialEnds = toDate(data.trialEndsAt)
                        const startedAt = toDate(data.createdAt) || null
                        const now = new Date()
                        const diffMs = trialEnds ? trialEnds.getTime() - now.getTime() : null
                        const daysLeft = diffMs !== null ? Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24))) : null

                        return (
                          <div className="text-sm text-gray-700">
                            {startedAt && (
                              <div>Teste iniciado em: <span className="font-medium">{new Intl.DateTimeFormat('pt-BR').format(startedAt)}</span></div>
                            )}
                            {trialEnds && daysLeft !== null ? (
                              <div className="mt-1">Dias restantes: <span className="font-medium">{daysLeft} dia(s)</span></div>
                            ) : (
                              <div className="mt-1">Período de teste ativo</div>
                            )}
                            <div className="mt-3 text-xs text-gray-500">Ao término do teste, será necessário ativar um plano pago.</div>
                          </div>
                        )
                      })()
                    ) : (
                      !user ? (
                        <div className="text-sm text-gray-600">
                          <div>Faça login para começar seu teste gratuito de 14 dias.</div>
                          <div className="mt-2">
                            <button onClick={() => navigate('/login')} className="px-4 py-2 bg-blue-600 text-white rounded-md">Entrar</button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600">
                          <div>Seu teste gratuito de 14 dias é ativado automaticamente ao acessar o dashboard.</div>
                          <div className="mt-2">
                            <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-blue-600 text-white rounded-md">Ir para o dashboard</button>
                          </div>
                        </div>
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
