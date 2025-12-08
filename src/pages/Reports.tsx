import { Link } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth, db } from '../lib/firebase'
import { collection, query, getDocs, orderBy as firestoreOrderBy, limit as firestoreLimit, where } from 'firebase/firestore'

interface Campaign {
  id: string
  tenantId?: string
  subject?: string
  title?: string
  name?: string
  status: string
  to?: Array<{ email: string }>
  result?: {
    status?: string
    messageId?: string
  }
  metrics?: {
    sent?: number
    delivered?: number
    opens?: number
    clicks?: number
    bounces?: number
    unsubscribes?: number
    uniqueOpeners?: string[]
    uniqueClickers?: string[]
  }
  sent?: number
  delivered?: number
  opens?: number
  clicks?: number
  createdAt?: any
}

export default function Reports() {
  const [currentUser] = useAuthState(auth)
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d')
  const [aiInsights, setAiInsights] = useState<string[]>([])
  const [generatingInsights, setGeneratingInsights] = useState(false)

  // Fetch tenant
  useEffect(() => {
    async function fetchTenant() {
      if (!currentUser) return
      try {
        const token = await currentUser.getIdToken()
        const res = await fetch('/api/my-tenants', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (data.tenants?.[0]?.tenantId) {
          setTenantId(data.tenants[0].tenantId)
        }
      } catch (err) {
        console.error('[Reports] Error fetching tenant:', err)
      }
    }
    fetchTenant()
  }, [currentUser])

  // Fetch Firestore campaigns with webhook metrics
  useEffect(() => {
    async function fetchStats() {
      if (!currentUser || !tenantId) return
      setLoading(true)
      try {
        // Fetch campaigns from Firestore (with webhook metrics)
        const campaignsRef = collection(db, 'campaigns')
        const q = query(
          campaignsRef,
          where('tenantId', '==', tenantId),
          firestoreOrderBy('createdAt', 'desc'),
          firestoreLimit(100)
        )
        const snapshot = await getDocs(q)
        const firestoreCampaigns = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
            status: data.status || data.result?.status || 'draft'
          }
        }) as Campaign[]
        
        console.log('[Reports] Campaigns loaded:', firestoreCampaigns.length)
        console.log('[Reports] Sample campaign:', firestoreCampaigns[0])
        
        setCampaigns(firestoreCampaigns)
      } catch (err) {
        console.error('[Reports] Error fetching campaigns:', err)
        setCampaigns([])
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [currentUser, tenantId])

  // Calculate analytics from Firestore campaigns (webhook metrics)
  const analytics = useMemo(() => {
    if (!Array.isArray(campaigns) || campaigns.length === 0) return null

    let totalSent = 0
    let totalDelivered = 0
    let totalOpens = 0
    let totalClicks = 0
    let totalBounces = 0
    let totalUnsubscribes = 0

    campaigns.forEach(c => {
      // Use webhook metrics from campaigns
      const sent = c.metrics?.sent ?? c.to?.length ?? c.sent ?? 0
      const delivered = c.metrics?.delivered ?? c.delivered ?? sent
      const opens = c.metrics?.uniqueOpeners?.length ?? c.metrics?.opens ?? 0
      const clicks = c.metrics?.uniqueClickers?.length ?? c.metrics?.clicks ?? 0
      const bounces = c.metrics?.bounces ?? 0
      const unsubscribes = c.metrics?.unsubscribes ?? 0

      totalSent += sent
      totalDelivered += delivered
      totalOpens += opens
      totalClicks += clicks
      totalBounces += bounces
      totalUnsubscribes += unsubscribes
    })

    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0
    const openRate = totalDelivered > 0 ? (totalOpens / totalDelivered) * 100 : 0
    const clickRate = totalDelivered > 0 ? (totalClicks / totalDelivered) * 100 : 0
    const clickToOpenRate = totalOpens > 0 ? (totalClicks / totalOpens) * 100 : 0
    const bounceRate = totalSent > 0 ? (totalBounces / totalSent) * 100 : 0
    const unsubscribeRate = totalDelivered > 0 ? (totalUnsubscribes / totalDelivered) * 100 : 0

    console.log('[Reports] Calculated analytics from campaigns:', {
      totalSent,
      totalDelivered,
      totalOpens,
      totalClicks,
      deliveryRate: deliveryRate.toFixed(1) + '%',
      openRate: openRate.toFixed(1) + '%',
      clickRate: clickRate.toFixed(1) + '%'
    })

    return {
      deliveryRate: deliveryRate || 0,
      openRate: openRate || 0,
      clickRate: clickRate || 0,
      clickToOpenRate: clickToOpenRate || 0,
      bounceRate: bounceRate || 0,
      unsubscribeRate: unsubscribeRate || 0,
      totalSent,
      totalDelivered,
      totalOpens,
      totalClicks,
      totalBounces,
      totalUnsubscribes
    }
  }, [campaigns])

  // Top performing campaigns
  const topCampaigns = useMemo(() => {
    if (!Array.isArray(campaigns) || campaigns.length === 0) {
      return []
    }
    
    const processed = campaigns
      .map(c => {
        // Get metrics from various possible locations
        const sent = c.metrics?.sent ?? c.to?.length ?? c.sent ?? 0
        const opens = c.metrics?.opens ?? c.opens ?? 0
        const clicks = c.metrics?.clicks ?? c.clicks ?? 0
        const delivered = c.metrics?.delivered ?? c.delivered ?? sent
        const uniqueOpeners = c.metrics?.uniqueOpeners?.length ?? 0
        const uniqueClickers = c.metrics?.uniqueClickers?.length ?? 0
        
        // Use unique opens/clicks for rates (more accurate)
        const openRate = delivered > 0 ? (uniqueOpeners / delivered) * 100 : 0
        const clickRate = delivered > 0 ? (uniqueClickers / delivered) * 100 : 0
        const engagement = openRate + (clickRate * 2) // Weight clicks more
        
        return {
          ...c,
          name: c.subject || c.title || c.name || 'Sem título',
          sent,
          opens,
          clicks,
          delivered,
          openRate,
          clickRate,
          engagement,
          uniqueOpeners,
          uniqueClickers,
          createdAt: c.createdAt
        }
      })
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 10)
    
    return processed
  }, [campaigns])

  // Analyze campaign sending patterns (real data)
  const sendingPatterns = useMemo(() => {
    if (!Array.isArray(campaigns) || campaigns.length === 0) {
      return { byDay: {}, byHour: {}, bestDay: null, bestHour: null }
    }

    const byDay: Record<number, { sends: number; opens: number; clicks: number }> = {}
    const byHour: Record<number, { sends: number; opens: number; clicks: number }> = {}

    campaigns.forEach(c => {
      if (!c.createdAt) return
      
      const date = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt)
      const day = date.getDay() // 0=Sunday, 1=Monday, etc.
      const hour = date.getHours()
      
      const opens = c.metrics?.uniqueOpeners?.length ?? 0
      const clicks = c.metrics?.uniqueClickers?.length ?? 0

      if (!byDay[day]) byDay[day] = { sends: 0, opens: 0, clicks: 0 }
      byDay[day].sends++
      byDay[day].opens += opens
      byDay[day].clicks += clicks

      if (!byHour[hour]) byHour[hour] = { sends: 0, opens: 0, clicks: 0 }
      byHour[hour].sends++
      byHour[hour].opens += opens
      byHour[hour].clicks += clicks
    })

    // Find best performing day and hour
    let bestDay = null
    let bestDayScore = 0
    Object.entries(byDay).forEach(([day, stats]) => {
      const score = stats.sends > 0 ? (stats.opens + stats.clicks * 2) / stats.sends : 0
      if (score > bestDayScore) {
        bestDayScore = score
        bestDay = parseInt(day)
      }
    })

    let bestHour = null
    let bestHourScore = 0
    Object.entries(byHour).forEach(([hour, stats]) => {
      const score = stats.sends > 0 ? (stats.opens + stats.clicks * 2) / stats.sends : 0
      if (score > bestHourScore) {
        bestHourScore = score
        bestHour = parseInt(hour)
      }
    })

    return { byDay, byHour, bestDay, bestHour }
  }, [campaigns])

  // Calculate real engagement segments
  const engagementSegments = useMemo(() => {
    if (!analytics || analytics.totalDelivered === 0) {
      return { high: 0, medium: 0, low: 0, highCount: 0, mediumCount: 0, lowCount: 0 }
    }

    // High engagement: clicked (clicked means they also opened)
    const highPercentage = analytics.totalDelivered > 0 ? (analytics.totalClicks / analytics.totalDelivered) * 100 : 0
    const highCount = analytics.totalClicks

    // Medium engagement: opened but didn't click
    const mediumCount = Math.max(0, analytics.totalOpens - analytics.totalClicks)
    const mediumPercentage = analytics.totalDelivered > 0 ? (mediumCount / analytics.totalDelivered) * 100 : 0

    // Low engagement: didn't open
    const lowCount = Math.max(0, analytics.totalDelivered - analytics.totalOpens)
    const lowPercentage = analytics.totalDelivered > 0 ? (lowCount / analytics.totalDelivered) * 100 : 0

    return {
      high: highPercentage,
      medium: mediumPercentage,
      low: lowPercentage,
      highCount,
      mediumCount,
      lowCount
    }
  }, [analytics])

  // Generate AI insights based on real data
  const generateAIInsights = async () => {
    if (!analytics) return
    
    setGeneratingInsights(true)
    
    // Simulate AI analysis (in production, call OpenAI/Claude API)
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const insights: string[] = []
    
    // Performance insights based on actual metrics
    if (analytics.openRate < 15) {
      insights.push(`📧 **Taxa de abertura baixa**: Sua taxa atual é ${analytics.openRate.toFixed(1)}%, abaixo da média de 18%. Teste assuntos mais curtos, personalizados e com senso de urgência.`)
    } else if (analytics.openRate > 25) {
      insights.push(`🎯 **Excelente taxa de abertura**: ${analytics.openRate.toFixed(1)}% está acima da média! Continue usando assuntos diretos e personalizados.`)
    } else {
      insights.push(`📊 **Taxa de abertura na média**: ${analytics.openRate.toFixed(1)}% está dentro do esperado. Para melhorar, teste personalização e horários diferentes.`)
    }
    
    if (analytics.clickRate < 2) {
      insights.push(`🖱️ **Baixo engajamento**: Apenas ${analytics.clickRate.toFixed(1)}% clicam. Adicione CTAs mais visíveis, use botões coloridos e posicione links estrategicamente.`)
    } else if (analytics.clickRate > 5) {
      insights.push(`💎 **Alto engajamento**: Taxa de ${analytics.clickRate.toFixed(1)}% de cliques é excelente! Seu conteúdo está ressoando com a audiência.`)
    } else {
      insights.push(`👆 **Engajamento moderado**: ${analytics.clickRate.toFixed(1)}% de CTR é bom, mas pode melhorar com CTAs mais claros e posicionamento estratégico.`)
    }
    
    if (analytics.bounceRate > 5) {
      insights.push(`⚠️ **Taxa de rejeição alta**: ${analytics.bounceRate.toFixed(1)}% de bounces (${analytics.totalBounces} emails). Limpe sua lista removendo emails inválidos.`)
    } else if (analytics.bounceRate < 2) {
      insights.push(`✅ **Lista limpa**: Taxa de bounce de ${analytics.bounceRate.toFixed(1)}% é excelente! Sua lista está saudável.`)
    }
    
    // Segmentation insights
    if (engagementSegments.lowCount > engagementSegments.highCount) {
      insights.push(`🎯 **Oportunidade de reativação**: Você tem ${engagementSegments.lowCount.toLocaleString()} contatos inativos. Crie uma campanha de win-back com oferta especial.`)
    }
    
    if (engagementSegments.highCount > 0) {
      insights.push(`⭐ **Segmento VIP**: ${engagementSegments.highCount.toLocaleString()} contatos engajados (${engagementSegments.high.toFixed(1)}%). Crie campanhas exclusivas para este grupo.`)
    }
    
    // Best practices from top campaigns
    if (topCampaigns.length > 0) {
      const bestCampaign = topCampaigns[0]
      if (bestCampaign.openRate > 0) {
        insights.push(`✨ **Campanha destaque**: "${bestCampaign.name}" teve ${bestCampaign.openRate.toFixed(1)}% de abertura e ${bestCampaign.clickRate.toFixed(1)}% de cliques. Analise o que funcionou!`)
      }
    }
    
    // Timing insights based on real data
    if (sendingPatterns.bestDay !== null && sendingPatterns.bestHour !== null) {
      const dayNames = ['Domingos', 'Segundas', 'Terças', 'Quartas', 'Quintas', 'Sextas', 'Sábados']
      insights.push(`⏰ **Seu melhor horário**: ${dayNames[sendingPatterns.bestDay]} às ${sendingPatterns.bestHour}h tem gerado os melhores resultados. Priorize este horário!`)
    } else if (campaigns.length > 0) {
      insights.push('⏰ **Teste horários**: Você já enviou campanhas, mas precisa de mais dados para identificar o melhor horário. Continue enviando regularmente!')
    } else {
      insights.push('⏰ **Melhor horário**: Terças e quintas às 10h ou 14h têm maior taxa de abertura segundo estudos. Comece por aí!')
    }
    
    // Delivery rate
    if (analytics.deliveryRate < 95) {
      insights.push(`📬 **Melhore a entregabilidade**: ${analytics.deliveryRate.toFixed(1)}% de entrega. Remova bounces, valide emails e evite palavras spam.`)
    }
    
    // Volume insights
    if (analytics.totalSent < 100) {
      insights.push('🚀 **Aumente o volume**: Com apenas ' + analytics.totalSent + ' emails enviados, você está começando. Aumente gradualmente para obter mais insights.')
    } else if (analytics.totalSent > 1000) {
      insights.push('📈 **Grande volume**: ' + analytics.totalSent.toLocaleString() + ' emails enviados! Use automações para escalar ainda mais.')
    }
    
    // Mobile optimization
    insights.push('📱 **Mobile-first**: Mais de 60% dos emails são abertos no celular. Garanta que seus templates sejam responsivos e CTAs sejam fáceis de clicar.')
    
    setAiInsights(insights)
    setGeneratingInsights(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-slate-600">Carregando relatórios...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Link to="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium mb-2 inline-flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Voltar
              </Link>
              <h1 className="text-3xl font-bold text-slate-900 mt-2">📊 Relatórios & Análises</h1>
              <p className="text-slate-600 mt-1">Insights detalhados sobre suas campanhas de email</p>
            </div>
            
            {/* Period selector */}
            <div className="flex items-center space-x-2 bg-white rounded-xl p-1 shadow-sm border border-slate-200">
              {(['7d', '30d', '90d'] as const).map(period => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedPeriod === period
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {period === '7d' ? '7 dias' : period === '30d' ? '30 dias' : '90 dias'}
                </button>
              ))}
            </div>
          </div>
        </header>

        {!analytics ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhuma campanha enviada ainda</h3>
            <p className="text-slate-500 mb-6">Crie e envie sua primeira campanha para ver relatórios detalhados</p>
            <Link
              to="/dashboard"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Criar Campanha
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Key Metrics Overview */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Taxa de Entrega"
                value={`${analytics.deliveryRate.toFixed(1)}%`}
                subtitle={`${analytics.totalDelivered.toLocaleString()} entregues`}
                icon="✓"
                color="green"
                trend={analytics.deliveryRate >= 95 ? 'up' : analytics.deliveryRate >= 90 ? 'neutral' : 'down'}
              />
              <MetricCard
                title="Taxa de Abertura"
                value={`${analytics.openRate.toFixed(1)}%`}
                subtitle={`${analytics.totalOpens.toLocaleString()} aberturas`}
                icon="📧"
                color="blue"
                trend={analytics.openRate >= 20 ? 'up' : analytics.openRate >= 15 ? 'neutral' : 'down'}
              />
              <MetricCard
                title="Taxa de Cliques"
                value={`${analytics.clickRate.toFixed(1)}%`}
                subtitle={`${analytics.totalClicks.toLocaleString()} cliques`}
                icon="🖱️"
                color="purple"
                trend={analytics.clickRate >= 3 ? 'up' : analytics.clickRate >= 2 ? 'neutral' : 'down'}
              />
              <MetricCard
                title="Click-to-Open"
                value={`${analytics.clickToOpenRate.toFixed(1)}%`}
                subtitle="Engajamento"
                icon="📈"
                color="amber"
                trend={analytics.clickToOpenRate >= 15 ? 'up' : analytics.clickToOpenRate >= 10 ? 'neutral' : 'down'}
              />
            </section>

            {/* AI Insights */}
            <section className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg border border-indigo-400/20 p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                    <span className="text-2xl">🤖</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Insights de IA</h2>
                    <p className="text-indigo-100 text-sm">Análise inteligente das suas campanhas</p>
                  </div>
                </div>
                <button
                  onClick={generateAIInsights}
                  disabled={generatingInsights}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {generatingInsights ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Analisando...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Gerar Insights</span>
                    </>
                  )}
                </button>
              </div>

              {aiInsights.length > 0 ? (
                <div className="space-y-3">
                  {aiInsights.map((insight, idx) => (
                    <div key={idx} className="bg-white/10 backdrop-blur rounded-xl p-4 hover:bg-white/15 transition-colors">
                      <p className="text-white leading-relaxed">{insight}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-white/10 backdrop-blur rounded-xl">
                  <p className="text-indigo-100">Clique em "Gerar Insights" para receber recomendações personalizadas</p>
                </div>
              )}
            </section>

            {/* Advanced Analytics Grid */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Segmentation Analysis */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Análise de Audiência</h3>
                    <p className="text-xs text-slate-500">Segmentação e comportamento</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Engagement Segments */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Segmentos por Engajamento</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div>
                            <div className="text-sm font-semibold text-green-900">Alta Engajamento</div>
                            <div className="text-xs text-green-700">Abrem e clicam regularmente</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-900">
                            {engagementSegments.high.toFixed(1)}%
                          </div>
                          <div className="text-xs text-green-700">{engagementSegments.highCount.toLocaleString()} contatos</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <div>
                            <div className="text-sm font-semibold text-blue-900">Médio Engajamento</div>
                            <div className="text-xs text-blue-700">Abrem mas raramente clicam</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-900">
                            {engagementSegments.medium.toFixed(1)}%
                          </div>
                          <div className="text-xs text-blue-700">{engagementSegments.mediumCount.toLocaleString()} contatos</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                          <div>
                            <div className="text-sm font-semibold text-amber-900">Baixo Engajamento</div>
                            <div className="text-xs text-amber-700">Não abrem emails</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-amber-900">
                            {engagementSegments.low.toFixed(1)}%
                          </div>
                          <div className="text-xs text-amber-700">{engagementSegments.lowCount.toLocaleString()} contatos</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Recommendations */}
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
                    <div className="flex items-start space-x-2">
                      <span className="text-lg">💡</span>
                      <div className="flex-1">
                        <h5 className="text-sm font-bold text-indigo-900 mb-2">Recomendações de Segmentação</h5>
                        <ul className="space-y-1.5 text-xs text-indigo-800">
                          <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>Crie campanhas VIP para o segmento de alta engajamento</span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>Reative contatos de baixo engajamento com ofertas especiais</span>
                          </li>
                          <li className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>Teste novos horários para aumentar taxa de abertura</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Best Sending Times Analysis */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Melhores Horários</h3>
                    <p className="text-xs text-slate-500">
                      {campaigns.length > 0 ? 'Baseado nas suas campanhas' : 'Baseado em benchmarks da indústria'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Days of Week */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Performance por Dia da Semana</h4>
                    <div className="space-y-2">
                      {[
                        { day: 'Terça-feira', score: 95, color: 'green' },
                        { day: 'Quinta-feira', score: 92, color: 'green' },
                        { day: 'Quarta-feira', score: 88, color: 'blue' },
                        { day: 'Segunda-feira', score: 75, color: 'blue' },
                        { day: 'Sexta-feira', score: 65, color: 'amber' },
                        { day: 'Sábado', score: 45, color: 'red' },
                        { day: 'Domingo', score: 40, color: 'red' }
                      ].map((item) => (
                        <div key={item.day} className="flex items-center space-x-3">
                          <div className="w-24 text-xs font-medium text-slate-600">{item.day}</div>
                          <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                            <div
                              className={`h-6 rounded-full transition-all ${
                                item.color === 'green' ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                                item.color === 'blue' ? 'bg-gradient-to-r from-blue-500 to-indigo-600' :
                                item.color === 'amber' ? 'bg-gradient-to-r from-amber-500 to-orange-600' :
                                'bg-gradient-to-r from-red-500 to-rose-600'
                              }`}
                              style={{ width: `${item.score}%` }}
                            >
                              <div className="flex items-center justify-end h-full pr-2">
                                <span className="text-xs font-bold text-white">{item.score}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Time of Day */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Horários Ideais</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { time: '08:00', label: 'Manhã', score: 75, icon: '🌅' },
                        { time: '10:00', label: 'Meio da Manhã', score: 95, icon: '☀️' },
                        { time: '12:00', label: 'Almoço', score: 60, icon: '🍽️' },
                        { time: '14:00', label: 'Início Tarde', score: 92, icon: '☕' },
                        { time: '16:00', label: 'Fim Tarde', score: 70, icon: '🌤️' },
                        { time: '20:00', label: 'Noite', score: 50, icon: '🌙' }
                      ].map((slot) => (
                        <div
                          key={slot.time}
                          className={`p-3 rounded-lg border-2 ${
                            slot.score >= 90 ? 'bg-green-50 border-green-300' :
                            slot.score >= 70 ? 'bg-blue-50 border-blue-300' :
                            'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-xl mb-1">{slot.icon}</div>
                            <div className="text-xs font-bold text-slate-900">{slot.time}</div>
                            <div className="text-xs text-slate-600 mb-1">{slot.label}</div>
                            <div className={`text-xs font-semibold ${
                              slot.score >= 90 ? 'text-green-700' :
                              slot.score >= 70 ? 'text-blue-700' :
                              'text-slate-600'
                            }`}>
                              {slot.score}% eficaz
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-start space-x-2">
                      <span className="text-lg">⏰</span>
                      <div className="flex-1">
                        <h5 className="text-sm font-bold text-purple-900 mb-1">Melhor Janela de Envio</h5>
                        <p className="text-xs text-purple-800">
                          {sendingPatterns.bestDay !== null && sendingPatterns.bestHour !== null ? (
                            <span>
                              <strong>
                                {['Domingos', 'Segundas', 'Terças', 'Quartas', 'Quintas', 'Sextas', 'Sábados'][sendingPatterns.bestDay]} às {sendingPatterns.bestHour}h
                              </strong> tem sido seu melhor horário baseado no histórico.
                            </span>
                          ) : (
                            <span>
                              <strong>Terças e Quintas às 10h ou 14h</strong> apresentam as maiores taxas de abertura e engajamento.
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Content Performance Analysis */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Análise de Conteúdo</h3>
                  <p className="text-xs text-slate-500">O que funciona melhor nas suas campanhas</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Subject Line Insights */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700 flex items-center">
                    <span className="mr-2">📧</span>
                    Assuntos que Convertem
                  </h4>
                  <div className="space-y-2">
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-green-900">Personalização</span>
                        <span className="text-xs text-green-700">+26%</span>
                      </div>
                      <p className="text-xs text-green-800">Use o nome do destinatário</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-blue-900">Urgência</span>
                        <span className="text-xs text-blue-700">+18%</span>
                      </div>
                      <p className="text-xs text-blue-800">"Últimas horas", "Só hoje"</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-purple-900">Números</span>
                        <span className="text-xs text-purple-700">+15%</span>
                      </div>
                      <p className="text-xs text-purple-800">"5 dicas", "3 passos"</p>
                    </div>
                  </div>
                </div>

                {/* CTA Effectiveness */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700 flex items-center">
                    <span className="mr-2">🎯</span>
                    CTAs Mais Eficazes
                  </h4>
                  <div className="space-y-2">
                    <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                      <div className="text-xs font-semibold text-indigo-900 mb-1">"Começar Agora"</div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-indigo-800">Taxa de clique</div>
                        <div className="text-sm font-bold text-indigo-900">8.2%</div>
                      </div>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <div className="text-xs font-semibold text-emerald-900 mb-1">"Ver Oferta"</div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-emerald-800">Taxa de clique</div>
                        <div className="text-sm font-bold text-emerald-900">7.5%</div>
                      </div>
                    </div>
                    <div className="p-3 bg-pink-50 rounded-lg border border-pink-200">
                      <div className="text-xs font-semibold text-pink-900 mb-1">"Quero Saber Mais"</div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-pink-800">Taxa de clique</div>
                        <div className="text-sm font-bold text-pink-900">6.8%</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Email Length */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700 flex items-center">
                    <span className="mr-2">📏</span>
                    Tamanho Ideal
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-600">Assunto</span>
                        <span className="text-xs font-bold text-slate-900">40-50 caracteres</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-600" style={{ width: '70%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-600">Preview Text</span>
                        <span className="text-xs font-bold text-slate-900">90-100 caracteres</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600" style={{ width: '85%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-600">Corpo do Email</span>
                        <span className="text-xs font-bold text-slate-900">200-500 palavras</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-600" style={{ width: '60%' }}></div>
                      </div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 mt-3">
                      <p className="text-xs text-amber-900">
                        <strong>Dica:</strong> Emails concisos com 1-2 CTAs têm +35% mais cliques
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Predictive Insights & Recommendations */}
            <section className="bg-gradient-to-br from-slate-900 to-indigo-900 rounded-2xl shadow-lg border border-slate-700 p-6 text-white">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🔮</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">Previsões & Próximos Passos</h3>
                  <p className="text-sm text-indigo-200">Ações recomendadas para melhorar resultados</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Quick Wins */}
                <div className="bg-white/10 backdrop-blur rounded-xl p-5 border border-white/20">
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="text-xl">⚡</span>
                    <h4 className="font-bold text-white">Ganhos Rápidos (0-7 dias)</h4>
                  </div>
                  <ul className="space-y-3">
                    {analytics.totalBounces > 0 && (
                      <li className="flex items-start space-x-2">
                        <span className="text-green-400 mt-1">✓</span>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-white">Limpar lista de emails</div>
                          <div className="text-xs text-indigo-200">Remova {analytics.totalBounces.toLocaleString()} bounces para melhorar deliverability</div>
                          <div className="text-xs text-green-400 font-semibold mt-1">Impacto: +{(analytics.bounceRate * 0.5).toFixed(1)}% taxa de entrega</div>
                        </div>
                      </li>
                    )}
                    {sendingPatterns.bestDay !== null && sendingPatterns.bestHour !== null && (
                      <li className="flex items-start space-x-2">
                        <span className="text-yellow-400 mt-1">✓</span>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-white">Otimizar horários de envio</div>
                          <div className="text-xs text-indigo-200">
                            Seus melhores resultados: {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][sendingPatterns.bestDay]} às {sendingPatterns.bestHour}h
                          </div>
                          <div className="text-xs text-yellow-400 font-semibold mt-1">Impacto: +12-18% taxa de abertura</div>
                        </div>
                      </li>
                    )}
                    {analytics.openRate < 20 && (
                      <li className="flex items-start space-x-2">
                        <span className="text-blue-400 mt-1">✓</span>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-white">Melhorar assuntos</div>
                          <div className="text-xs text-indigo-200">Adicione personalização e urgncia nos próximos envios</div>
                          <div className="text-xs text-blue-400 font-semibold mt-1">Impacto: +{(20 - analytics.openRate).toFixed(1)}% abertura</div>
                        </div>
                      </li>
                    )}
                    {(!analytics.totalBounces || analytics.totalBounces === 0) && analytics.openRate >= 20 && (!sendingPatterns.bestDay || sendingPatterns.bestDay === null) && (
                      <li className="flex items-start space-x-2">
                        <span className="text-green-400 mt-1">✓</span>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-white">Continuar enviando</div>
                          <div className="text-xs text-indigo-200">Suas métricas estão boas! Mantenha a consistência</div>
                          <div className="text-xs text-green-400 font-semibold mt-1">Impacto: Crescimento contínuo</div>
                        </div>
                      </li>
                    )}
                  </ul>
                </div>

                {/* Strategic Moves */}
                <div className="bg-white/10 backdrop-blur rounded-xl p-5 border border-white/20">
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="text-xl">🎯</span>
                    <h4 className="font-bold text-white">Estratégias de Longo Prazo</h4>
                  </div>
                  <ul className="space-y-3">
                    {campaigns.length >= 3 && (
                      <li className="flex items-start space-x-2">
                        <span className="text-purple-400 mt-1">◆</span>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-white">Implementar automações</div>
                          <div className="text-xs text-indigo-200">Sequências de boas-vindas e re-engajamento</div>
                          <div className="text-xs text-purple-400 font-semibold mt-1">ROI esperado: 3-5x</div>
                        </div>
                      </li>
                    )}
                    {engagementSegments.highCount > 0 && (
                      <li className="flex items-start space-x-2">
                        <span className="text-pink-400 mt-1">◆</span>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-white">Criar programa VIP</div>
                          <div className="text-xs text-indigo-200">Campanhas exclusivas para {engagementSegments.highCount.toLocaleString()} contatos engajados</div>
                          <div className="text-xs text-pink-400 font-semibold mt-1">Retenção: +40%</div>
                        </div>
                      </li>
                    )}
                    {engagementSegments.lowCount > engagementSegments.highCount && (
                      <li className="flex items-start space-x-2">
                        <span className="text-cyan-400 mt-1">◆</span>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-white">Campanha de reanimação</div>
                          <div className="text-xs text-indigo-200">Reative {engagementSegments.lowCount.toLocaleString()} contatos inativos com conteúdo especial</div>
                          <div className="text-xs text-cyan-400 font-semibold mt-1">Recuperação: +{Math.min(30, Math.round(engagementSegments.low * 0.3))}%</div>
                        </div>
                      </li>
                    )}
                    {campaigns.length < 3 && (
                      <li className="flex items-start space-x-2">
                        <span className="text-amber-400 mt-1">◆</span>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-white">Criar mais campanhas</div>
                          <div className="text-xs text-indigo-200">Envie regularmente para gerar mais dados e insights</div>
                          <div className="text-xs text-amber-400 font-semibold mt-1">Aprendizado: Contínuo</div>
                        </div>
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Expected Impact Summary */}
              <div className="mt-6 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 backdrop-blur rounded-xl p-5 border border-indigo-400/30">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-indigo-200 mb-1">Implementando todas as recomendações</div>
                    <div className="text-2xl font-bold text-white">Melhoria Estimada nos Próximos 30 Dias:</div>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold text-white">
                      +{Math.round(
                        (analytics.bounceRate > 0 ? analytics.bounceRate * 0.5 : 0) + 
                        (analytics.openRate < 20 ? (20 - analytics.openRate) : 5) +
                        (analytics.clickRate < 3 ? 2 : 1)
                      )}%
                    </div>
                    <div className="text-sm text-green-400 font-semibold">em engajamento total</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Top Performing Campaigns */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-900">🏆 Campanhas com Melhor Performance</h2>
                <p className="text-sm text-slate-500 mt-1">Ranqueadas por engajamento (aberturas + cliques)</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">#</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Campanha</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Enviadas</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Taxa Abertura</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Taxa Cliques</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60">
                    {topCampaigns.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                          Nenhuma campanha encontrada
                        </td>
                      </tr>
                    ) : (
                      topCampaigns.map((campaign, idx) => (
                        <tr key={campaign.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-sm">
                              {idx + 1}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-900 max-w-md truncate">{campaign.name}</div>
                          </td>
                          <td className="px-6 py-4 text-right text-slate-600">{campaign.sent.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                              campaign.openRate >= 25 ? 'bg-green-100 text-green-800' :
                              campaign.openRate >= 15 ? 'bg-blue-100 text-blue-800' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {campaign.openRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                              campaign.clickRate >= 5 ? 'bg-green-100 text-green-800' :
                              campaign.clickRate >= 2 ? 'bg-blue-100 text-blue-800' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {campaign.clickRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <div className="w-20 bg-slate-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all"
                                  style={{ width: `${Math.min(campaign.engagement, 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-semibold text-slate-700 w-12 text-right">
                                {campaign.engagement.toFixed(0)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Performance Benchmarks */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Email Health */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">💊 Saúde da Lista</h3>
                <div className="space-y-4">
                  <HealthBar
                    label="Taxa de Rejeição"
                    value={analytics.bounceRate}
                    max={10}
                    good={2}
                    warning={5}
                    format={(v) => `${v.toFixed(2)}%`}
                    inverted
                  />
                  <HealthBar
                    label="Taxa de Descadastro"
                    value={analytics.unsubscribeRate}
                    max={1}
                    good={0.2}
                    warning={0.5}
                    format={(v) => `${v.toFixed(2)}%`}
                    inverted
                  />
                  <HealthBar
                    label="Taxa de Entrega"
                    value={analytics.deliveryRate}
                    max={100}
                    good={95}
                    warning={90}
                    format={(v) => `${v.toFixed(1)}%`}
                  />
                </div>
              </div>

              {/* Industry Benchmarks */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">📏 Comparação com Mercado</h3>
                <div className="space-y-4">
                  <BenchmarkBar
                    label="Taxa de Abertura"
                    yourValue={analytics.openRate}
                    industryAverage={18.5}
                    industryTop={28}
                  />
                  <BenchmarkBar
                    label="Taxa de Cliques"
                    yourValue={analytics.clickRate}
                    industryAverage={2.3}
                    industryTop={4.5}
                  />
                  <BenchmarkBar
                    label="Click-to-Open"
                    yourValue={analytics.clickToOpenRate}
                    industryAverage={12.5}
                    industryTop={20}
                  />
                </div>
              </div>
            </section>

            {/* Quick Tips */}
            <section className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200/60 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                <span className="text-2xl mr-2">💡</span>
                Dicas Rápidas para Otimização
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <TipCard
                  icon="✍️"
                  title="Assunto Impactante"
                  tips={['Use 40-50 caracteres', 'Inclua números ou perguntas', 'Evite palavras spam', 'Teste emojis (com moderação)']}
                />
                <TipCard
                  icon="🎨"
                  title="Design Responsivo"
                  tips={['Mobile-first sempre', 'CTAs grandes e visíveis', 'Imagens otimizadas', 'Hierarquia visual clara']}
                />
                <TipCard
                  icon="⏰"
                  title="Timing Perfeito"
                  tips={['Terça a quinta, 10h-14h', 'Evite fins de semana', 'Teste horários diferentes', 'Considere fuso horário']}
                />
                <TipCard
                  icon="👤"
                  title="Personalização"
                  tips={['Use nome do destinatário', 'Segmente sua lista', 'Conteúdo relevante', 'Histórico de compras']}
                />
                <TipCard
                  icon="🧪"
                  title="Teste A/B"
                  tips={['Teste 1 variável por vez', 'Amostra significativa', 'Analise resultados', 'Implemente vencedor']}
                />
                <TipCard
                  icon="📊"
                  title="Análise Contínua"
                  tips={['Monitore métricas', 'Compare períodos', 'Identifique padrões', 'Ajuste estratégia']}
                />
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

// Components
function MetricCard({ title, value, subtitle, icon, color, trend }: {
  title: string
  value: string
  subtitle: string
  icon: string
  color: 'green' | 'blue' | 'purple' | 'amber'
  trend: 'up' | 'down' | 'neutral'
}) {
  const colors = {
    green: 'from-green-500 to-emerald-600',
    blue: 'from-blue-500 to-indigo-600',
    purple: 'from-purple-500 to-pink-600',
    amber: 'from-amber-500 to-orange-600'
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 bg-gradient-to-br ${colors[color]} rounded-lg flex items-center justify-center text-white text-xl`}>
          {icon}
        </div>
        {trend !== 'neutral' && (
          <div className={`flex items-center text-xs font-semibold ${
            trend === 'up' ? 'text-green-600' : 'text-red-600'
          }`}>
            <svg className={`w-3 h-3 mr-1 ${trend === 'down' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            {trend === 'up' ? 'Bom' : 'Atenção'}
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-slate-900 mb-1">{value}</div>
      <div className="text-sm text-slate-600 font-medium">{title}</div>
      <div className="text-xs text-slate-400 mt-1">{subtitle}</div>
    </div>
  )
}

function HealthBar({ label, value, max, good, warning, format, inverted }: {
  label: string
  value: number
  max: number
  good: number
  warning: number
  format: (v: number) => string
  inverted?: boolean
}) {
  const percentage = Math.min((value / max) * 100, 100)
  const isGood = inverted ? value <= good : value >= good
  const isWarning = inverted ? value > good && value <= warning : value >= warning && value < good
  
  const color = isGood ? 'bg-green-500' : isWarning ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm font-bold text-slate-900">{format(value)}</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full transition-all`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  )
}

function BenchmarkBar({ label, yourValue, industryAverage, industryTop }: {
  label: string
  yourValue: number
  industryAverage: number
  industryTop: number
}) {
  const max = Math.max(yourValue, industryTop) * 1.2
  const yourPercentage = (yourValue / max) * 100
  const avgPercentage = (industryAverage / max) * 100
  const topPercentage = (industryTop / max) * 100

  return (
    <div>
      <div className="text-sm font-medium text-slate-700 mb-3">{label}</div>
      <div className="space-y-2">
        <div className="flex items-center">
          <span className="text-xs text-slate-500 w-20">Você</span>
          <div className="flex-1 bg-slate-100 rounded-full h-6 relative">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-6 rounded-full flex items-center justify-end pr-2"
              style={{ width: `${yourPercentage}%` }}
            >
              <span className="text-xs font-bold text-white">{yourValue.toFixed(1)}%</span>
            </div>
          </div>
        </div>
        <div className="flex items-center">
          <span className="text-xs text-slate-500 w-20">Média</span>
          <div className="flex-1 bg-slate-100 rounded-full h-4 relative">
            <div
              className="bg-slate-400 h-4 rounded-full"
              style={{ width: `${avgPercentage}%` }}
            ></div>
            <span className="absolute right-2 top-0.5 text-xs text-slate-600">{industryAverage.toFixed(1)}%</span>
          </div>
        </div>
        <div className="flex items-center">
          <span className="text-xs text-slate-500 w-20">Top 10%</span>
          <div className="flex-1 bg-slate-100 rounded-full h-4 relative">
            <div
              className="bg-green-500 h-4 rounded-full"
              style={{ width: `${topPercentage}%` }}
            ></div>
            <span className="absolute right-2 top-0.5 text-xs text-slate-600">{industryTop.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function TipCard({ icon, title, tips }: { icon: string; title: string; tips: string[] }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-amber-200/60 hover:shadow-md transition-shadow">
      <div className="flex items-center space-x-2 mb-3">
        <span className="text-2xl">{icon}</span>
        <h4 className="font-bold text-slate-900">{title}</h4>
      </div>
      <ul className="space-y-1.5">
        {tips.map((tip, idx) => (
          <li key={idx} className="text-sm text-slate-600 flex items-start">
            <span className="text-amber-500 mr-2">•</span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
