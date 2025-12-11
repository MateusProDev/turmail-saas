import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'

export default function Onboarding() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const onboardingStepsDef = [
    { key: 'profile', label: 'Completar perfil (nome, logo)', href: '/settings' },
    { key: 'sending', label: 'Configurar remetente (From email)', href: '/settings' },
    { key: 'contacts', label: 'Importar contatos', href: '/contacts' },
    { key: 'campaign', label: 'Criar primeira campanha', href: '/campaigns' },
    { key: 'test', label: 'Enviar email de teste', href: '/campaigns' },
  ]

  // Buscar subscription do usuário
  useEffect(() => {
    if (!user) {
      console.log('[Onboarding] Usuário não autenticado, redirecionando para login')
      navigate('/login')
      return
    }

    const fetchSubscription = async () => {
      try {
        console.log('[Onboarding] Buscando tenant e subscription para usuário:', user.uid)
        const token = await (user as any).getIdToken()
        const tenantResp = await fetch('/api/my-tenants', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const tenantData = await tenantResp.json()
        console.log('[Onboarding] tenantData:', tenantData)

        if (!tenantData.tenants || tenantData.tenants.length === 0) {
          console.log('[Onboarding] Nenhum tenant encontrado, aguardando...')
          setTimeout(fetchSubscription, 2000)
          return
        }

        const tenantId = tenantData.tenants[0].tenantId

        // Buscar subscription
        const subResp = await fetch(`/api/subscription?tenantId=${tenantId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const subData = await subResp.json()
        console.log('[Onboarding] subData:', subData)

        if (subData.subscription) {
          setSubscription(subData.subscription)
        } else {
          console.log('[Onboarding] Subscription não encontrada, tentando novamente...')
          setTimeout(fetchSubscription, 2000)
        }
      } catch (error) {
        console.error('[Onboarding] Error fetching subscription:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSubscription()
  }, [user, navigate])

  const handleStepComplete = async (stepKey: string, completed: boolean) => {
    if (!subscription) return

    try {
      const newProgress = { ...(subscription.onboardingProgress || {}), [stepKey]: completed }
      const allDone = onboardingStepsDef.every(st => newProgress[st.key])

      await setDoc(doc(db, 'subscriptions', subscription.id), {
        onboardingProgress: newProgress,
        onboardingCompleted: allDone
      }, { merge: true })

      // Atualizar estado local
      setSubscription({
        ...subscription,
        onboardingProgress: newProgress,
        onboardingCompleted: allDone
      })

      // Se completou tudo, ir para dashboard
      if (allDone) {
        navigate('/dashboard')
      }
    } catch (e) {
      console.error('failed to update onboarding progress', e)
      alert('Erro ao salvar progresso de onboarding')
    }
  }

  const handleCompleteAll = async () => {
    if (!subscription) return

    try {
      const newProgress = onboardingStepsDef.reduce((acc, st) => ({
        ...acc,
        [st.key]: true
      }), {})

      await setDoc(doc(db, 'subscriptions', subscription.id), {
        onboardingProgress: newProgress,
        onboardingCompleted: true
      }, { merge: true })

      navigate('/dashboard')
    } catch (e) {
      console.error('failed to mark onboarding complete', e)
      alert('Erro ao marcar onboarding como completo')
    }
  }

  if (loading) {
    console.log('[Onboarding] loading subscription:', subscription)
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-slate-900">Preparando sua conta...</h2>
          <p className="text-slate-600 mt-2">Aguarde, estamos finalizando a ativação do seu plano.</p>
        </div>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-slate-900">Erro ao carregar assinatura</h2>
          <p className="text-slate-600 mt-2">Tente novamente mais tarde</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Ir para Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl">🚀</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Bem-vindo ao Turmail!</h1>
          <p className="text-lg text-slate-600">
            Complete estes passos rápidos para começar a enviar suas primeiras campanhas de email marketing.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="space-y-4 mb-8">
            {onboardingStepsDef.map((step, index) => {
              const progress = subscription?.onboardingProgress || {}
              const done = !!progress[step.key]

              return (
                <div key={step.key} className={`p-6 rounded-xl border transition-all ${done ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        {done ? '✓' : (index + 1)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">{step.label}</h3>
                        <a
                          href={step.href}
                          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                          onClick={() => window.sessionStorage.setItem('onboardingStep', step.key)}
                        >
                          Configurar agora
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </a>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStepComplete(step.key, !done)}
                      className={`px-4 py-2 text-sm rounded-lg transition-colors font-medium ${
                        done
                          ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {done ? 'Desmarcar' : 'Concluir'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-200">
            <div className="text-sm text-slate-500">
              {subscription && subscription.onboardingProgress ? (
                <span>
                  {Object.keys(subscription.onboardingProgress).filter(k => subscription.onboardingProgress[k]).length} de {onboardingStepsDef.length} passos completos
                </span>
              ) : 'Comece agora'}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-6 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
              >
                Pular por enquanto
              </button>
              <button
                onClick={handleCompleteAll}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium transition-all shadow-sm hover:shadow"
              >
                Concluir tudo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}