import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'

interface Subscription {
  id?: string
  uid: string
  email: string
  planId: string
  status: string
  limits?: any // eslint-disable-line @typescript-eslint/no-explicit-any
  onboardingCompleted?: boolean
  onboardingProgress?: any // eslint-disable-line @typescript-eslint/no-explicit-any
  stripeSubscriptionId?: string
  stripeCustomerId?: string
  paymentStatus?: string
  lastPaymentDate?: Date
  currentPeriodStart?: Date
  currentPeriodEnd?: Date
  createdAt?: Date | { seconds: number }
  updatedAt?: Date
  trialEndsAt?: Date | { seconds: number }
  [key: string]: any // eslint-disable-line @typescript-eslint/no-explicit-any
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [showWelcome, setShowWelcome] = useState(true)

  const onboardingStepsDef = [
    {
      key: 'profile',
      label: 'Completar perfil (nome, logo)',
      description: 'Configure o nome da sua empresa e adicione um logo para personalizar suas campanhas.',
      href: '/settings',
      icon: '🏢'
    },
    {
      key: 'sending',
      label: 'Configurar remetente (From email)',
      description: 'Configure o email e nome do remetente para suas campanhas de email marketing.',
      href: '/settings',
      icon: '📧'
    },
    {
      key: 'contacts',
      label: 'Importar contatos',
      description: 'Importe sua lista de contatos para começar a enviar campanhas personalizadas.',
      href: '/contacts',
      icon: '👥'
    },
    {
      key: 'campaign',
      label: 'Criar primeira campanha',
      description: 'Crie sua primeira campanha de email marketing com templates prontos.',
      href: '/campaigns',
      icon: '📢'
    },
    {
      key: 'test',
      label: 'Enviar email de teste',
      description: 'Envie um email de teste para verificar se tudo está funcionando corretamente.',
      href: '/campaigns',
      icon: '🧪'
    },
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
        const token = await user.getIdToken()
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
    if (!subscription || !subscription.id) return

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
      } else if (completed && currentStepIndex < onboardingStepsDef.length - 1) {
        // Avançar para o próximo passo se este foi completado
        setCurrentStepIndex(currentStepIndex + 1)
      }
    } catch (e) {
      console.error('failed to update onboarding progress', e)
      alert('Erro ao salvar progresso de onboarding')
    }
  }

  const handleNextStep = () => {
    if (currentStepIndex < onboardingStepsDef.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
    }
  }

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }

  const handleStartOnboarding = () => {
    setShowWelcome(false)
  }

  const currentStep = onboardingStepsDef[currentStepIndex]
  const progress = subscription?.onboardingProgress || {}
  const completedSteps = Object.keys(progress).filter(k => progress[k]).length
  const progressPercentage = (completedSteps / onboardingStepsDef.length) * 100

  const handleCompleteAll = async () => {
    if (!subscription || !subscription.id) return

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

  // Tela de boas-vindas
  if (showWelcome) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <span className="text-3xl">🚀</span>
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-4">Bem-vindo ao Turmail!</h1>
            <p className="text-xl text-slate-600 mb-8">
              Vamos configurar sua conta em apenas {onboardingStepsDef.length} passos simples
            </p>
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                {onboardingStepsDef.map((step, index) => (
                  <div key={step.key} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {index + 1}
                    </div>
                    {index < onboardingStepsDef.length - 1 && (
                      <div className="w-8 h-0.5 bg-slate-300 mx-2"></div>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-slate-600">Passo a passo personalizado para o seu sucesso</p>
            </div>
            <button
              onClick={handleStartOnboarding}
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              Começar Configuração
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header com progresso */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-slate-600 hover:text-slate-800 font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Voltar ao Dashboard
            </button>
            <div className="text-sm text-slate-600">
              {completedSteps} de {onboardingStepsDef.length} passos completos
            </div>
          </div>

          {/* Barra de progresso */}
          <div className="bg-white rounded-full h-3 shadow-sm overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Passo atual */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">
                {currentStep.icon}
              </div>
              <div>
                <div className="text-indigo-100 text-sm font-medium mb-1">
                  Passo {currentStepIndex + 1} de {onboardingStepsDef.length}
                </div>
                <h1 className="text-2xl font-bold">{currentStep.label}</h1>
              </div>
            </div>
            <p className="text-indigo-100 text-lg">{currentStep.description}</p>
          </div>

          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">O que você precisa fazer</h2>
              <p className="text-slate-600 mb-6">
                Clique no botão abaixo para configurar este passo. Você será redirecionado para a página apropriada.
              </p>

              <a
                href={currentStep.href}
                onClick={() => window.sessionStorage.setItem('onboardingStep', currentStep.key)}
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                <span>Configurar Agora</span>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
            </div>

            {/* Status do passo */}
            <div className="bg-slate-50 rounded-2xl p-6 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    progress[currentStep.key] ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}>
                    {progress[currentStep.key] ? (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <span className={`font-medium ${progress[currentStep.key] ? 'text-emerald-700' : 'text-slate-600'}`}>
                    {progress[currentStep.key] ? 'Concluído' : 'Pendente'}
                  </span>
                </div>
                <button
                  onClick={() => handleStepComplete(currentStep.key, !progress[currentStep.key])}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors font-medium ${
                    progress[currentStep.key]
                      ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {progress[currentStep.key] ? 'Desmarcar' : 'Marcar como Concluído'}
                </button>
              </div>
            </div>

            {/* Navegação entre passos */}
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevStep}
                disabled={currentStepIndex === 0}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                  currentStepIndex === 0
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Passo Anterior
              </button>

              <div className="flex items-center gap-2">
                {onboardingStepsDef.map((step, index) => (
                  <button
                    key={step.key}
                    onClick={() => setCurrentStepIndex(index)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      index === currentStepIndex
                        ? 'bg-indigo-600 scale-125'
                        : progress[step.key]
                        ? 'bg-emerald-500'
                        : 'bg-slate-300'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={handleNextStep}
                disabled={currentStepIndex === onboardingStepsDef.length - 1}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                  currentStepIndex === onboardingStepsDef.length - 1
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                }`}
              >
                Próximo Passo
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Ações finais */}
            {completedSteps === onboardingStepsDef.length && (
              <div className="mt-8 text-center">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-6">
                  <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-emerald-800 mb-2">Parabéns! 🎉</h3>
                  <p className="text-emerald-700">Você completou todos os passos de configuração!</p>
                </div>
                <button
                  onClick={handleCompleteAll}
                  className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all"
                >
                  Ir para o Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}