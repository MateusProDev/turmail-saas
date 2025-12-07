import { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

interface UsageStats {
  current: number
  limit: number
  remaining: number
  percentage: number
  isUnlimited: boolean
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
        
        const current = counterSnap.exists() ? (counterSnap.data()?.count || 0) : 0
        const limits = subscription.limits || { emailsPerDay: 50 }
        const limit = limits.emailsPerDay || 50
        const isUnlimited = limit === -1
        
        const remaining = isUnlimited ? -1 : Math.max(0, limit - current)
        const percentage = isUnlimited ? 0 : Math.min(100, (current / limit) * 100)

        setUsage({
          current,
          limit,
          remaining,
          percentage,
          isUnlimited,
        })
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
        <h3 className="text-lg font-semibold text-gray-800">📧 Uso de Emails Hoje</h3>
        {subscription?.planId && (
          <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-800 rounded">
            {subscription.planId.toUpperCase()}
          </span>
        )}
      </div>

      {usage.isUnlimited ? (
        <div className="space-y-2">
          <div className="text-3xl font-bold text-purple-600">
            {usage.current.toLocaleString()}
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

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-300 ${getProgressColor()}`}
              style={{ width: `${Math.min(100, usage.percentage)}%` }}
            ></div>
          </div>

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
              ⚠️ Você está próximo do limite diário. Considere fazer upgrade.
            </div>
          )}

          {usage.remaining === 0 && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
              🚫 Limite diário atingido. Volte amanhã ou faça upgrade para enviar mais.
            </div>
          )}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <div>• Limite reseta à meia-noite</div>
          {subscription?.limits?.emailsPerMonth && subscription.limits.emailsPerMonth !== -1 && (
            <div>• Limite mensal: {subscription.limits.emailsPerMonth.toLocaleString()} emails</div>
          )}
        </div>
      </div>
    </div>
  )
}
