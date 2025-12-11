import { useState, useEffect } from 'react'
import { FaCheck } from 'react-icons/fa'
import './Plans.css'
import { createCheckoutSession } from '../lib/stripe'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth, db } from '../lib/firebase'
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore'
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
      emailsPerMonth: 1500,
      campaigns: -1,
      contacts: 1000,
    },
    features: [
      '14 dias grátis',
      '50 emails/dia',
      '1.500 emails/mês',
      '1.000 contatos',
      'Campanhas ilimitadas',
      'Templates ilimitados',
      'Sem cartão de crédito',
    ]
  },
  { 
    id: 'starter', 
    name: 'Starter', 
    price: 47,
    priceAnnual: 42,
    priceIdEnvMonthly: 'VITE_STRIPE_PRICE_STARTER',
    priceIdEnvAnnual: 'VITE_STRIPE_PRICE_STARTER_ANNUAL',
    limits: {
      emailsPerDay: -1,
      emailsPerMonth: 2000,
      campaigns: -1,
      contacts: 25000,
    },
    features: [
      'Automação de fluxos para recuperar e fidelizar clientes',
      'Editor visual com templates otimizados por conversão',
      'Prioridade em entregabilidade e qualidade de envio',
      'Segmentação inteligente por comportamento',
      'Relatórios acionáveis e recomendações de otimização',
      'Suporte em português',
    ]
  },
  { 
    id: 'pro', 
    name: 'Professional', 
    price: 97,
    priceAnnual: 87,
    priceIdEnvMonthly: 'VITE_STRIPE_PRICE_PRO',
    priceIdEnvAnnual: 'VITE_STRIPE_PRICE_PRO_ANNUAL',
    recommended: true,
    limits: {
      emailsPerDay: -1,
      emailsPerMonth: 10000,
      campaigns: -1,
      contacts: 100000,
    },
    features: [
      'Automação avançada com gatilhos e personalização por comportamento',
      'Testes A/B de assunto e conteúdo para maximizar conversões',
      'Relatórios em tempo real com sugestões práticas',
      'Mapas de calor de cliques e análise de engajamento',
      'Integrações para enriquecer dados do cliente',
      'Suporte prioritário e onboarding para campanhas críticas',
    ]
  },
  { 
    id: 'agency', 
    name: 'Agency', 
    price: 297,
    priceAnnual: 3207.6,
    priceIdEnvMonthly: 'VITE_STRIPE_PRICE_AGENCY',
    priceIdEnvAnnual: 'VITE_STRIPE_PRICE_AGENCY_ANNUAL',
    limits: {
      emailsPerDay: -1,
      emailsPerMonth: 50000,
      campaigns: -1,
      contacts: -1,
    },
    features: [
      'Foco em qualidade: entregabilidade e gerenciamento de reputação',
      'White-label e multi-tenant para operar agências',
      'APIs e integrações completas para automação de processos',
      'Relatórios personalizados e consultoria para otimização',
      'Suporte VIP e onboarding dedicado',
      'SLA disponível para operações críticas',
    ]
  },
]

export default function Plans() {
  const [loading, setLoading] = useState(false)
  const [user] = useAuthState(auth)
  const [subscription, setSubscription] = useState<any>(null)
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly')
  const [trialStarted, setTrialStarted] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      setSubscription(null)
      return
    }
    const subsRef = collection(db, 'subscriptions')
    // Listen by ownerUid, then fallback to email if not found
    const qByUid = query(subsRef, where('ownerUid', '==', user.uid), limit(1))
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
        const qByEmail = query(subsRef, where('email', '==', user.email), limit(1))
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

  // Check for cancel parameter to auto-start trial
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const isCancel = params.get('cancel') === '1' || localStorage.getItem('paymentCancel') === '1'
    if (isCancel && user && subscription === null) {
      // Automatically start trial after payment cancel
      setTrialStarted(true)
      localStorage.setItem('paymentCancel', '1') // Persist in case of reload
      handleCheckout(PLANS.find(p => p.id === 'trial')!)
      // Clean URL and localStorage after attempt
      window.history.replaceState({}, '', '/plans')
      localStorage.removeItem('paymentCancel')
    }
  }, [user, subscription, trialStarted])

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
        const token = await user.getIdToken()
        // Call server endpoint to start a 7-day trial
        const resp = await fetch('/api/start-trial', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ uid: user.uid, email: user.email, planId: 'trial' }),
        })
        const json = await resp.json()
        if (!resp.ok) {
          console.error('start-trial failed', json)
          alert('Falha ao iniciar trial gratuito: ' + (json.error || 'erro desconhecido'))
        } else {
          alert('🎉 Trial gratuito iniciado! Você tem 14 dias com 50 emails/dia e 1.000 contatos.')
          navigate('/onboarding')
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
    const equivMonthly = `${fmt.format(annualPrice / 12)}/mês`
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

      {/* Trial Banner - Destacado */}
      {!subscription?.planId || subscription?.planId === 'trial' ? (
        <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-2xl shadow-lg relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          </div>
          
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center space-x-2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold mb-3">
                <span>✨</span>
                <span>OFERTA ESPECIAL</span>
              </div>
              <h3 className="font-bold text-blue-900 text-xl mb-2">🎉 Teste Grátis - 14 Dias Completos</h3>
              <p className="text-blue-700 text-sm md:text-base">
                Comece agora com <strong>50 emails/dia</strong> e <strong>1.000 contatos</strong> • Todos os recursos incluídos • Sem cartão de crédito
              </p>
              <div className="mt-3 flex flex-wrap gap-2 justify-center md:justify-start">
                <span className="inline-flex items-center text-xs bg-white/60 px-2 py-1 rounded-lg">
                  <svg className="w-3 h-3 mr-1 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  IA Integrada
                </span>
                <span className="inline-flex items-center text-xs bg-white/60 px-2 py-1 rounded-lg">
                  <svg className="w-3 h-3 mr-1 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  Templates Ilimitados
                </span>
                <span className="inline-flex items-center text-xs bg-white/60 px-2 py-1 rounded-lg">
                  <svg className="w-3 h-3 mr-1 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  Analytics Completo
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                const trialPlan = PLANS.find(p => p.id === 'trial')
                if (trialPlan) handleCheckout(trialPlan)
              }}
              disabled={loading || (subscription?.planId === 'trial')}
              className={`px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex-shrink-0 ${loading || subscription?.planId === 'trial' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processando...</span>
                </div>
              ) : subscription?.planId === 'trial' ? (
                <span>✓ Trial Ativo</span>
              ) : (
                <span>Começar Grátis Agora →</span>
              )}
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
                      {p.limits.emailsPerDay === -1 && p.limits.emailsPerMonth && p.limits.emailsPerMonth > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          *Ilimitado na prática — limitado a <strong>{p.limits.emailsPerMonth.toLocaleString()}</strong> emails/mês (teto mensal).
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span className="ml-5">Emails/mês</span>
                        <span className="font-medium">{p.limits.emailsPerMonth === -1 ? 'Ilimitado' : p.limits.emailsPerMonth.toLocaleString()}</span>
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

      {/* Pacotes Extras */}
      <section className="mt-10">
        <h3 className="text-xl font-semibold mb-4">Pacotes Extras</h3>
        <p className="text-sm text-gray-600 mb-4">Adicione capacidade extra conforme a necessidade — cobramos separadamente por pacote.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              id: 'emails_boost_2000',
              title: '+2.000 emails',
              desc: 'Aumente sua cota mensal com +2.000 emails para campanhas e automações.',
              priceEnv: 'VITE_STRIPE_PRICE_ADDON_EMAILS_2000',
            },
            {
              id: 'contacts_boost_10000',
              title: '+10.000 contatos',
              desc: 'Adicione 10.000 contatos adicionais ao seu tenant.',
              priceEnv: 'VITE_STRIPE_PRICE_ADDON_CONTACTS_10000',
            }
          ].map((ex) => (
            <div key={ex.id} className="p-4 bg-white rounded-lg shadow-md border border-gray-100 flex flex-col">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{ex.title}</h4>
                <p className="text-sm text-gray-600 mt-2">{ex.desc}</p>
              </div>
              <div className="mt-4">
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-md"
                  onClick={async () => {
                    if (!user) {
                      localStorage.setItem('pendingPlan', JSON.stringify({ planId: ex.id, planName: ex.title, priceIdEnvMonthly: ex.priceEnv, billingInterval }))
                      navigate('/login?signup=1')
                      return
                    }

                    const envKey = ex.priceEnv
                    const priceId = (import.meta.env as any)[envKey]
                    if (!priceId) {
                      alert('Price ID do pacote não configurado. Verifique as variáveis de ambiente.')
                      return
                    }

                    try {
                      setLoading(true)
                      const json = await createCheckoutSession(priceId, null, user?.email || null)
                      if (json?.url) window.location.href = json.url
                      else alert('Falha ao iniciar checkout do pacote')
                    } catch (err) {
                      console.error(err)
                      alert('Erro ao iniciar checkout')
                    } finally { setLoading(false) }
                  }}
                >
                  Comprar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer note removed per user request (env setup instructions were previously shown here) */}
    </div>
  )
}

