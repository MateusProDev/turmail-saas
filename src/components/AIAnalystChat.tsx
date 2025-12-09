import { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AIAnalystChatProps {
  campaigns: any[]
  contacts: any[]
  sendingPatterns: any
  subjectAnalysis: any
  engagementSegments: any
}

export default function AIAnalystChat({ 
  campaigns, 
  contacts,
  sendingPatterns,
  subjectAnalysis,
  engagementSegments
}: AIAnalystChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `👋 **Olá! Sou seu Analista de Marketing Sênior com IA.**

🤖 **Sobre mim:**
- Modelo: **Gemini 1.5 Flash** (Google AI)
- Experiência: Especialista em email marketing
- Superpoder: Analiso SEUS dados em tempo real

📊 **Tenho acesso a:**
${campaigns.length > 0 ? `✅ ${campaigns.length} campanhas suas
✅ ${contacts.length} contatos ativos
✅ Padrões de performance únicos
✅ Benchmarks da indústria 2025` : '⏳ Aguardando suas primeiras campanhas...'}

💬 **Posso ajudar com:**
- Análise profunda de métricas
- Recomendações personalizadas  
- Otimização de horários
- Padrões de assuntos vencedores
- Segmentação estratégica

🚀 **Diferencial:** Cada resposta é baseada nos SEUS dados específicos!

**Pergunte qualquer coisa!** Quanto mais específico, melhor posso ajudar. 😊`,
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Função para renderizar markdown básico
  const renderMarkdown = (text: string) => {
    return text
      .split('\n')
      .map((line, i) => {
        // Negrito
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Itálico
        line = line.replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Lista
        if (line.trim().startsWith('- ')) {
          return `<div key="${i}" class="ml-4">• ${line.substring(2)}</div>`
        }
        // Checkmark
        if (line.trim().startsWith('✅')) {
          return `<div key="${i}" class="flex items-start gap-2"><span class="text-green-500">✅</span><span>${line.substring(2)}</span></div>`
        }
        return `<div key="${i}">${line || '<br/>'}</div>`
      })
      .join('')
  }

  const prepareContext = () => {
    const totalCampaigns = campaigns.length
    const totalSent = campaigns.reduce((sum: number, c: any) => sum + (c.totalRecipients || 0), 0)
    const totalDelivered = campaigns.reduce((sum: number, c: any) => sum + (c.metrics?.delivered || 0), 0)
    const totalOpens = campaigns.reduce((sum: number, c: any) => sum + (c.metrics?.opens || 0), 0)
    const totalClicks = campaigns.reduce((sum: number, c: any) => sum + (c.metrics?.clicks || 0), 0)

    const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : '0'
    const openRate = totalDelivered > 0 ? ((totalOpens / totalDelivered) * 100).toFixed(1) : '0'
    const clickRate = totalDelivered > 0 ? ((totalClicks / totalDelivered) * 100).toFixed(1) : '0'
    const clickToOpenRate = totalOpens > 0 ? ((totalClicks / totalOpens) * 100).toFixed(1) : '0'

    const topCampaigns = campaigns
      .filter((c: any) => c.metrics?.delivered > 0)
      .map((c: any) => ({
        name: c.name,
        openRate: ((c.metrics.opens / c.metrics.delivered) * 100).toFixed(1),
        clickRate: ((c.metrics.clicks / c.metrics.delivered) * 100).toFixed(1),
        sent: c.totalRecipients
      }))
      .sort((a: any, b: any) => parseFloat(b.openRate) - parseFloat(a.openRate))
      .slice(0, 5)

    const bestDay = sendingPatterns?.dayPerformance?.[0]?.day || null
    const bestHour = sendingPatterns?.hourPerformance?.[0]?.hour || null

    const subjectPatterns = subjectAnalysis?.patterns || []

    return {
      totalCampaigns,
      totalSent,
      totalDelivered,
      totalOpens,
      totalClicks,
      deliveryRate,
      openRate,
      clickRate,
      clickToOpenRate,
      totalContacts: contacts.length,
      topCampaigns,
      bestDay,
      bestHour,
      subjectPatterns,
      dayPerformance: sendingPatterns?.dayPerformance || [],
      hourPerformance: sendingPatterns?.hourPerformance || [],
      highEngagement: {
        count: engagementSegments?.highCount || 0,
        percentage: engagementSegments?.high?.toFixed(0) || '0'
      },
      mediumEngagement: {
        count: engagementSegments?.mediumCount || 0,
        percentage: engagementSegments?.medium?.toFixed(0) || '0'
      },
      lowEngagement: {
        count: engagementSegments?.lowCount || 0,
        percentage: engagementSegments?.low?.toFixed(0) || '0'
      }
    }
  }

  const generateSystemPrompt = () => {
    const ctx = prepareContext()
    
    return `Você é um ANALISTA SÊNIOR DE EMAIL MARKETING extremamente inteligente e prestativo.

DADOS COMPLETOS DO CLIENTE (TEMPO REAL):
Total de Campanhas: ${ctx.totalCampaigns}
Total Enviados: ${ctx.totalSent}
Total Entregues: ${ctx.totalDelivered}
Taxa de Entrega: ${ctx.deliveryRate}%
Taxa de Abertura: ${ctx.openRate}%
Taxa de Cliques: ${ctx.clickRate}%
Click-to-Open: ${ctx.clickToOpenRate}%
Total de Contatos: ${ctx.totalContacts}
Melhor Dia: ${ctx.bestDay || 'Dados insuficientes'}
Melhor Hora: ${ctx.bestHour || 'Dados insuficientes'}

Top 3 Campanhas:
${ctx.topCampaigns.slice(0, 3).map((c: any, i: number) => `${i + 1}. "${c.name}" - ${c.openRate}% abertura, ${c.clickRate}% cliques`).join('\n')}

Padrões de Assunto:
${ctx.subjectPatterns.slice(0, 3).map((p: any, i: number) => `${i + 1}. ${p.name}: +${p.lift}% performance`).join('\n')}

Segmentação por Engajamento:
- Alta: ${ctx.highEngagement.count} contatos (${ctx.highEngagement.percentage}%)
- Média: ${ctx.mediumEngagement.count} contatos (${ctx.mediumEngagement.percentage}%)
- Baixa: ${ctx.lowEngagement.count} contatos (${ctx.lowEngagement.percentage}%)

BENCHMARKS DA INDÚSTRIA (Email Marketing 2025):
- Taxa de abertura: 18-22% (média), 28%+ (excelente)
- Taxa de cliques: 2-3% (média), 5%+ (excelente)
- Click-to-open: 12-15% (média), 20%+ (excelente)
- Taxa de entrega: >95% (saudável)

SUA MISSÃO:
1. SEMPRE use dados REAIS do contexto acima
2. SEMPRE compare com benchmarks
3. SEMPRE dê próximos passos acionáveis
4. Seja conversacional mas profissional
5. Use emojis estrategicamente
6. Celebre vitórias e seja empático em desafios
7. Seja específico com números exatos
8. Faça perguntas de follow-up quando apropriado

Responda em português brasileiro de forma natural e útil.`
  }

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = input
    setInput('')
    setLoading(true)

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      
      if (!apiKey) {
        console.warn('VITE_GEMINI_API_KEY não encontrada')
        throw new Error('API key não configurada')
      }

      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash-latest',
        generationConfig: {
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })

      const chat = model.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: generateSystemPrompt() }]
          },
          {
            role: 'model',
            parts: [{ text: 'Entendi perfeitamente! Analisando seus dados agora... Sou seu analista sênior dedicado. Tenho acesso completo às suas métricas, campanhas e padrões. Pode me fazer qualquer pergunta!' }]
          },
          ...messages.slice(1).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          }))
        ]
      })

      const result = await chat.sendMessage(currentInput)
      const response = result.response.text()

      console.log('✅ Gemini respondeu:', response.substring(0, 100))

      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('❌ Erro ao chamar Gemini:', error)
      
      const ctx = prepareContext()
      const fallbackResponse = `Desculpe, houve um problema ao conectar com a IA. 😔

Mas posso te dar alguns insights baseados nos seus dados:

📊 **Suas Métricas:**
- Taxa de abertura: ${ctx.openRate}% ${parseFloat(ctx.openRate) > 22 ? '🎯 (Excelente!)' : parseFloat(ctx.openRate) > 18 ? '✅ (Boa)' : '📈 (Pode melhorar)'}
- Taxa de cliques: ${ctx.clickRate}% ${parseFloat(ctx.clickRate) > 5 ? '🚀 (Excepcional!)' : parseFloat(ctx.clickRate) > 2 ? '👍 (Sólida)' : '💡 (Otimizável)'}
- Total de contatos: ${ctx.totalContacts}
- Campanhas enviadas: ${ctx.totalCampaigns}

${ctx.bestDay ? `⏰ **Melhor horário:** ${ctx.bestDay} às ${ctx.bestHour}h` : ''}

${ctx.topCampaigns.length > 0 ? `🏆 **Sua melhor campanha:** "${ctx.topCampaigns[0].name}" com ${ctx.topCampaigns[0].openRate}% de abertura` : ''}

Tente perguntar novamente!`

      const assistantMessage: Message = {
        role: 'assistant',
        content: fallbackResponse,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, assistantMessage])
    } finally {
      setLoading(false)
    }
  }

  const suggestedQuestions = [
    "📊 Como está minha performance geral?",
    "⏰ Qual meu melhor dia e horário?",
    "🚀 Como dobrar minha taxa de abertura?",
    "🏆 Analise minhas top 3 campanhas",
    "💡 Dê 5 recomendações personalizadas",
    "🎯 Qual o padrão de assunto vencedor?",
    "👥 Como segmentar melhor minha lista?"
  ]

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white">🤖 Analista IA</h3>
            <p className="text-xs text-indigo-100">Análise inteligente em tempo real</p>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-white">Online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="h-96 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-slate-50 to-white">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-900 shadow-sm'
              }`}
            >
              <div 
                className="text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
              />
              <div className={`text-xs mt-1 ${message.role === 'user' ? 'text-indigo-100' : 'text-slate-400'}`}>
                {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-pink-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length === 1 && (
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
          <p className="text-xs font-semibold text-slate-700 mb-2">💡 Perguntas sugeridas:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, idx) => (
              <button
                key={idx}
                onClick={() => setInput(question)}
                className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-full hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Pergunte sobre suas campanhas..."
            className="flex-1 px-4 py-2 border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={loading}
          />
          <button
            onClick={handleSendMessage}
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
          >
            {loading ? '...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}
