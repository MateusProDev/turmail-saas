import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import './Success.css'

export default function Success() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const sessionId = searchParams.get('session_id')
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    if (!sessionId) {
      navigate('/dashboard')
      return
    }
    
    // Buscar dados da sessão
    fetch(`/api/get-session?sessionId=${encodeURIComponent(sessionId)}`)
      .then((r) => r.json())
      .then((json) => {
        setSession(json)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [sessionId, navigate])

  // Countdown e redirecionamento automático
  useEffect(() => {
    if (loading || !session) return
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          navigate('/onboarding')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [loading, session, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Processando pagamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Success Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center">
          {/* Checkmark animado */}
          <div className="relative mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto animate-scaleIn shadow-lg">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            {/* Confetti effect */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-6xl animate-bounce">🎉</span>
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            Pagamento Confirmado!
          </h1>
          
          <p className="text-lg text-slate-600 mb-8">
            Seu plano foi ativado com sucesso. Agora você tem acesso completo a todos os recursos!
          </p>

          {session && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-8 border border-blue-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Email</p>
                  <p className="text-sm font-medium text-slate-900">{session.customer_details?.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Valor Pago</p>
                  <p className="text-sm font-medium text-slate-900">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      (session.amount_total || 0) / 100
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Status</p>
                  <p className="text-sm font-medium text-green-600 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                    {session.payment_status === 'paid' ? 'Pago' : session.status}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Transação</p>
                  <p className="text-xs font-mono text-slate-600 truncate">{session.id}</p>
                </div>
              </div>
            </div>
          )}

          {/* Countdown */}
          <div className="flex items-center justify-center space-x-2 mb-6">
            <div className="w-3 h-3 bg-indigo-600 rounded-full animate-pulse"></div>
            <p className="text-sm text-slate-500">
              Redirecionando para o Dashboard em <span className="font-bold text-indigo-600">{countdown}s</span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/onboarding')}
              className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Começar Onboarding
            </button>
            <button
              onClick={() => navigate('/campaigns')}
              className="px-8 py-3 bg-white border-2 border-indigo-200 text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-all"
            >
              Criar Primeira Campanha
            </button>
          </div>
        </div>

        {/* Features reminder */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4">
            <div className="text-2xl mb-2">✨</div>
            <p className="text-sm font-semibold text-slate-900">IA Integrada</p>
            <p className="text-xs text-slate-600 mt-1">Crie conteúdo com inteligência artificial</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4">
            <div className="text-2xl mb-2">📊</div>
            <p className="text-sm font-semibold text-slate-900">Analytics em Tempo Real</p>
            <p className="text-xs text-slate-600 mt-1">Acompanhe aberturas e cliques</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4">
            <div className="text-2xl mb-2">🚀</div>
            <p className="text-sm font-semibold text-slate-900">Suporte Dedicado</p>
            <p className="text-xs text-slate-600 mt-1">Estamos aqui para ajudar</p>
          </div>
        </div>
      </div>
    </div>
  )
}
