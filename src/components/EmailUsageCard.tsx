import { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

interface UsageStats {
  current: number
  limit: number
  remaining: number
  percentage: number
  isUnlimited: boolean
  type?: 'daily' | 'monthly' | 'unlimited'
  dailyCurrent?: number
  monthlyCurrent?: number
  isLoadingMonthly?: boolean
}

interface Props {
  tenantId: string
  subscription: any
}

export default function EmailUsageCard({ tenantId, subscription }: Props) {
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId || !subscription) return

    const loadUsage = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        const counterRef = doc(db, `tenants/${tenantId}/counters/emails-${today}`)
        const counterSnap = await getDoc(counterRef)
        
        const currentDaily = counterSnap.exists() ? (counterSnap.data()?.count || 0) : 0
        
        // Usar limites da subscription, com fallback para getPlanInfo se não existir
        let limits = subscription.limits
        if (!limits) {
          // Fallback: obter limites do plano via API
          try {
            const response = await fetch(`/api/subscription?tenantId=${tenantId}`)
            if (response.ok) {
              const data = await response.json()
              limits = data.subscription?.limits
            }
          } catch (e) {
            console.warn('Failed to fetch subscription limits, using defaults')
          }
        }
        
        // Último fallback: limites padrão do trial
        limits = limits || { emailsPerDay: 50, emailsPerMonth: 1500 }
        
        // Lógica de prioridade: mensal > diário
        const monthlyLimit = limits.emailsPerMonth
        const dailyLimit = limits.emailsPerDay || 50
        
        const displayType: 'daily' | 'monthly' | 'unlimited' = 
          monthlyLimit && monthlyLimit !== -1 ? 'monthly' :
          dailyLimit !== -1 ? 'daily' : 'unlimited'
        
        // Primeiro: mostrar dados diários rapidamente
        const initialDisplayLimit = displayType === 'monthly' ? monthlyLimit : 
                                   displayType === 'daily' ? dailyLimit : -1
        const initialDisplayCurrent = displayType === 'monthly' ? currentDaily : currentDaily // placeholder
        
        const isUnlimited = displayType === 'unlimited'
        const initialRemaining = isUnlimited ? -1 : Math.max(0, initialDisplayLimit - initialDisplayCurrent)
        const initialPercentage = isUnlimited ? 0 : Math.min(100, (initialDisplayCurrent / initialDisplayLimit) * 100)

        // Mostrar dados iniciais rapidamente
        setUsage({
          current: initialDisplayCurrent,
          limit: initialDisplayLimit,
          remaining: initialRemaining,
          percentage: initialPercentage,
          isUnlimited,
          type: displayType,
          dailyCurrent: currentDaily,
          monthlyCurrent: initialDisplayCurrent, // placeholder
          isLoadingMonthly: displayType === 'monthly',
        })

        // Se precisa de dados mensais, buscar em background
        if (displayType === 'monthly') {
          // Buscar contador mensal (últimos 30 dias) - Otimizado
          let currentMonthly = currentDaily // começar com hoje
          const monthlyPromises = []
          
          // Buscar apenas os últimos 7 dias primeiro (mais provável de ter dados)
          for (let i = 1; i <= 7; i++) {
            const date = new Date()
            date.setDate(date.getDate() - i)
            const dateStr = date.toISOString().split('T')[0]
            
            const monthlyCounterRef = doc(db, `tenants/${tenantId}/counters/emails-${dateStr}`)
            monthlyPromises.push(getDoc(monthlyCounterRef))
          }
          
          // Executar em paralelo as 7 chamadas mais recentes
          const recentResults = await Promise.all(monthlyPromises)
          recentResults.forEach(docSnap => {
            if (docSnap.exists()) {
              currentMonthly += docSnap.data()?.count || 0
            }
          })
          
          // Atualizar com dados mensais reais
          const finalRemaining = Math.max(0, monthlyLimit - currentMonthly)
          const finalPercentage = Math.min(100, (currentMonthly / monthlyLimit) * 100)
          
          setUsage(prev => prev ? {
            ...prev,
            current: currentMonthly,
            remaining: finalRemaining,
            percentage: finalPercentage,
            monthlyCurrent: currentMonthly,
            isLoadingMonthly: false,
          } : null)
        }
        
      } catch (e) {
        console.error('Failed to load email usage:', e)
      } finally {
        setLoading(false)
      }
    }

    loadUsage()
    // Reload every 30 seconds
    const interval = setInterval(loadUsage, 30000)
    return () => clearInterval(interval)
  }, [tenantId, subscription])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-2/3"></div>
      </div>
    )
  }

  if (!usage) return null

  const getColorClass = () => {
    if (usage.isUnlimited) return 'text-purple-600'
    if (usage.percentage >= 90) return 'text-red-600'
    if (usage.percentage >= 70) return 'text-orange-600'
    return 'text-green-600'
  }

  const getProgressColor = () => {
    if (usage.isUnlimited) return 'bg-purple-500'
    if (usage.percentage >= 90) return 'bg-red-500'
    if (usage.percentage >= 70) return 'bg-orange-500'
    return 'bg-green-500'
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          📧 Uso de Emails {usage.type === 'monthly' ? 'Mensal' : 'Hoje'}
          {usage.isLoadingMonthly && <span className="ml-2 text-xs text-gray-500">(carregando...)</span>}
        </h3>
        {subscription?.planId && (
          <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-800 rounded">
            {subscription.planId.toUpperCase()}
          </span>
        )}
      </div>

      {usage.isUnlimited ? (
        <div className="space-y-2">
          <div className="text-3xl font-bold text-purple-600">
            {usage.dailyCurrent?.toLocaleString() || usage.current.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">
            ✨ Emails ilimitados
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <div className={`text-3xl font-bold ${getColorClass()}`}>
              {usage.current.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">
              de {usage.limit.toLocaleString()}
            </div>
          </div>

          {/* Progress bar - sempre mostrar para mensal, opcional para diário */}
          {(usage.type === 'monthly' || (usage.type === 'daily' && usage.percentage > 0)) && (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all duration-300 ${getProgressColor()} ${
                  usage.isLoadingMonthly ? 'animate-pulse' : ''
                }`}
                style={{ width: `${Math.min(100, usage.percentage)}%` }}
              ></div>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {usage.remaining > 0 ? (
                <span>
                  <span className="font-semibold">{usage.remaining.toLocaleString()}</span> restantes
                </span>
              ) : (
                <span className="text-red-600 font-semibold">
                  ⚠️ Limite atingido
                </span>
              )}
            </span>
            <span className="text-gray-500">
              {usage.percentage.toFixed(0)}%
            </span>
          </div>

          {usage.percentage >= 90 && usage.remaining > 0 && (
            <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-800">
              ⚠️ Você está próximo do limite {usage.type === 'monthly' ? 'mensal' : 'diário'}. Considere fazer upgrade.
            </div>
          )}

          {usage.remaining === 0 && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
              🚫 Limite {usage.type === 'monthly' ? 'mensal' : 'diário'} atingido. {usage.type === 'monthly' ? 'Volte no próximo mês' : 'Volte amanhã'} ou faça upgrade.
            </div>
          )}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-400 flex items-center gap-4">
          <span>• {usage.type === 'monthly' ? 'Limite reseta mensalmente' : 'Limite reseta à meia-noite'}</span>
          {usage.type === 'monthly' && usage.dailyCurrent !== undefined && (
            <span>• Hoje: {usage.dailyCurrent.toLocaleString()} emails</span>
          )}
          {subscription?.limits?.emailsPerMonth && subscription.limits.emailsPerMonth !== -1 && usage.type !== 'monthly' && (
            <span>• Limite mensal: {subscription.limits.emailsPerMonth.toLocaleString()} emails</span>
          )}
        </div>
      </div>
    </div>
  )
}
