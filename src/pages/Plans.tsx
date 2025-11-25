import { useState, useEffect } from 'react'
import './Plans.css'
import { createCheckoutSession } from '../lib/stripe'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth, db } from '../lib/firebase'
import { addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore'
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
        await addDoc(collection(db, 'subscriptions'), {
          email: user.email || null,
          uid: user.uid || null,
          ownerUid: user.uid || null,
          planId: 'free',
          status: 'active',
          createdAt: serverTimestamp(),
        })
        alert('Plano gratuito ativado!')
        navigate('/dashboard')
      } catch (err) {
        console.error('failed to set free plan', err)
        alert('Falha ao ativar plano gratuito')
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
          // if user has no subscription, treat 'free' as current
          const isCurrent = subscription ? (subscription.planId === p.id) : p.id === 'free'
          return (
            <div
              key={p.id}
              className={`plans-card bg-white rounded p-4 ${featured ? 'featured' : 'shadow-sm'}`}
            >
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-lg font-semibold">{p.name}</h2>
                  {featured && <span className="plans-badge">Recomendado</span>}
                  {isCurrent && <span className="plans-badge current">Atual</span>}
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

                <ul className="mt-2 text-sm text-gray-600 space-y-2 text-left list-disc list-inside">
                  {(function renderFeatures() {
                    if (p.id === 'free') {
                      return [
                        'Conectar conta Brevo (inserir API Key) — limitado',
                        'Envio de campanhas básico (limite mensal)',
                        'Templates básicos de e-mail para agências de turismo',
                        'Gestão de contatos (limitação de tamanho)'
                      ].map((f) => <li key={f}>{f}</li>)
                    }

                    if (p.id === 'pro') {
                      return [
                        'Conectar Brevo com API Key secreta (full access)',
                        'Templates premium de e-mail voltados para agências de turismo',
                        'Cotas de envio conforme sua conta Brevo (nós intermediamos envio e automações)',
                        'Segmentação de contatos e tags',
                        'Acesso a modelos personalizáveis e editor de templates',
                        'Métricas e relatórios fornecidos pela nossa plataforma (baseado nos dados do Brevo)'
                      ].map((f) => <li key={f}>{f}</li>)
                    }

                    // agency
                    return [
                      'Suporte para múltiplas contas/teams e gerenciamento de clientes',
                      'Templates avançados e automações específicas para agências de turismo',
                      'Cotas de envio conforme as contas Brevo dos seus clientes (intermediação pela nossa plataforma)',
                      'Relatórios e análises avançadas por campanha (agregadas a partir dos dados do Brevo)',
                      'Suporte prioritário e onboarding dedicado'
                    ].map((f) => <li key={f}>{f}</li>)
                  })()}
                </ul>

                <div className="mt-6 w-full">
                  {p.id === 'free' ? (
                    <div className="text-sm text-gray-600">Plano gratuito já ativado no cadastro</div>
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
