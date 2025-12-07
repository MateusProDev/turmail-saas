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
  }
  sent?: number
  delivered?: number
  opens?: number
  clicks?: number
  createdAt?: any
}

interface BrevoStats {
  account?: any
  emailStats?: {
    requests: number
    delivered: number
    uniqueOpens: number
    uniqueClicks: number
    hardBounces: number
    softBounces: number
    unsubscriptions: number
  }
  campaigns?: any[]
}

export default function Reports() {
  const [currentUser] = useAuthState(auth)
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [brevoStats, setBrevoStats] = useState<BrevoStats | null>(null)
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

  // Fetch Brevo stats (overall metrics) AND Firestore campaigns (your created campaigns)
  useEffect(() => {
    async function fetchStats() {
      if (!currentUser || !tenantId) return
      setLoading(true)
      try {
        const token = await currentUser.getIdToken()
        
        // 1. Fetch overall stats from Brevo API (account info, global email stats)
        const res = await fetch('/api/get-brevo-stats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ tenantId })
        })
        const data = await res.json()
        
        console.log('[Reports] Brevo stats response:', data)
        
        if (data.success && data.stats) {
          setBrevoStats(data.stats)
        }
        
        // 2. Fetch YOUR campaigns from Firestore (created in Turmail)
        try {
          console.log('[Reports] Current user UID:', currentUser?.uid)
          console.log('[Reports] Current tenant ID:', tenantId)
          
          // Fetch campaigns filtered by tenantId
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
          
          console.log('[Reports] Campaigns for this tenant:', firestoreCampaigns.length)
          console.log('[Reports] Sample campaign:', firestoreCampaigns[0])
          
          setCampaigns(firestoreCampaigns)
        } catch (firestoreErr: any) {
          console.error('[Reports] Error fetching Firestore campaigns:', firestoreErr)
          console.error('[Reports] Error code:', firestoreErr?.code)
          console.error('[Reports] Error message:', firestoreErr?.message)
          setCampaigns([])
        }
      } catch (err) {
        console.error('[Reports] Error fetching stats:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [currentUser, tenantId])

  // Calculate analytics
  const analytics = useMemo(() => {
    if (!brevoStats?.emailStats) return null

    const stats = brevoStats.emailStats
    const deliveryRate = stats.requests > 0 ? (stats.delivered / stats.requests) * 100 : 0
    const openRate = stats.delivered > 0 ? (stats.uniqueOpens / stats.delivered) * 100 : 0
    const clickRate = stats.delivered > 0 ? (stats.uniqueClicks / stats.delivered) * 100 : 0
    const clickToOpenRate = stats.uniqueOpens > 0 ? (stats.uniqueClicks / stats.uniqueOpens) * 100 : 0
    const bounceRate = stats.requests > 0 ? ((stats.hardBounces + stats.softBounces) / stats.requests) * 100 : 0
    const unsubscribeRate = stats.delivered > 0 ? (stats.unsubscriptions / stats.delivered) * 100 : 0

    return {
      deliveryRate,
      openRate,
      clickRate,
      clickToOpenRate,
      bounceRate,
      unsubscribeRate,
      totalSent: stats.requests,
      totalDelivered: stats.delivered,
      totalOpens: stats.uniqueOpens,
      totalClicks: stats.uniqueClicks,
      totalBounces: stats.hardBounces + stats.softBounces,
      totalUnsubscribes: stats.unsubscriptions
    }
  }, [brevoStats])

  // Top performing campaigns
  const topCampaigns = useMemo(() => {
    console.log('[Reports] Computing topCampaigns from:', campaigns.length, 'campaigns')
    if (!Array.isArray(campaigns) || campaigns.length === 0) {
      console.log('[Reports] No campaigns to display')
      return []
    }
    
    const processed = campaigns
      .map(c => {
        const sent = c.metrics?.sent ?? c.sent ?? 0
        const opens = c.metrics?.opens ?? c.opens ?? 0
        const clicks = c.metrics?.clicks ?? c.clicks ?? 0
        const delivered = c.metrics?.delivered ?? c.delivered ?? sent
        
        const openRate = delivered > 0 ? (opens / delivered) * 100 : 0
        const clickRate = delivered > 0 ? (clicks / delivered) * 100 : 0
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
          engagement
        }
      })
      // Show ALL campaigns, even without metrics
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 10)
    
    console.log('[Reports] Processed topCampaigns:', processed.length)
    console.log('[Reports] First campaign:', processed[0])
    return processed
  }, [campaigns])

  // Generate AI insights
  const generateAIInsights = async () => {
    if (!analytics || !topCampaigns.length) return
    
    setGeneratingInsights(true)
    
    // Simulate AI analysis (in production, call OpenAI/Claude API)
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const insights: string[] = []
    
    // Performance insights
    if (analytics.openRate < 15) {
      insights.push('📧 **Taxa de abertura baixa**: Sua taxa de abertura está abaixo da média (15%). Teste assuntos mais curtos, personalizados e com senso de urgência.')
    } else if (analytics.openRate > 25) {
      insights.push('🎯 **Excelente taxa de abertura**: Suas campanhas estão performando acima da média! Continue usando assuntos diretos e personalizados.')
    }
    
    if (analytics.clickRate < 2) {
      insights.push('🖱️ **Baixo engajamento**: Apenas ' + analytics.clickRate.toFixed(1) + '% clicam. Adicione CTAs mais visíveis, use botões coloridos e posicione links estrategicamente.')
    } else if (analytics.clickRate > 5) {
      insights.push('💎 **Alto engajamento**: Taxa de cliques excelente! Seu conteúdo está ressoando com a audiência.')
    }
    
    if (analytics.bounceRate > 5) {
      insights.push('⚠️ **Taxa de rejeição alta**: ' + analytics.bounceRate.toFixed(1) + '% de bounces. Limpe sua lista removendo emails inválidos e implemente double opt-in.')
    }
    
    // Best practices from top campaigns
    if (topCampaigns.length > 0) {
      const bestCampaign = topCampaigns[0]
      insights.push(`✨ **Campanha destaque**: "${bestCampaign.name}" teve ${bestCampaign.openRate.toFixed(1)}% de abertura. Analise o assunto e horário de envio para replicar o sucesso.`)
    }
    
    // Timing insights
    insights.push('⏰ **Melhor horário**: Estudos mostram que terças e quintas às 10h ou 14h têm maior taxa de abertura. Teste agendar nestes períodos.')
    
    // Personalization
    insights.push('🎨 **Personalização**: Use o nome do destinatário no assunto e no corpo do email. Isso pode aumentar a taxa de abertura em até 26%.')
    
    // A/B Testing
    insights.push('🧪 **Teste A/B**: Experimente diferentes assuntos, horários e CTAs. Pequenas mudanças podem gerar grandes resultados.')
    
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
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum dado disponível</h3>
            <p className="text-slate-500 mb-6">Configure sua conta Brevo para ver relatórios detalhados</p>
            <Link
              to="/settings"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Configurar Brevo
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
