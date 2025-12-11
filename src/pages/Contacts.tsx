import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, where, orderBy, limit } from 'firebase/firestore'
import { db, auth } from '../lib/firebase'
import { useAuthState } from 'react-firebase-hooks/auth'

// Tipos de metadados específicos para turismo
interface CampaignInteraction {
  campaignId: string
  campaignName?: string
  sentAt: Date
  delivered?: boolean
  deliveredAt?: Date
  opened?: boolean
  openedAt?: Date
  clicked?: boolean
  clickedAt?: Date
  clickedLinks?: string[]
  bounced?: boolean
  unsubscribed?: boolean
}

interface ContactMetadata {
  // Dados Demográficos
  age?: number
  city?: string
  state?: string
  country?: string
  
  // Preferências de Viagem
  preferredDestinations?: string[]
  travelStyle?: 'luxo' | 'econômico' | 'aventura' | 'cultural' | 'praia' | 'montanha'
  budgetRange?: 'até 2k' | '2k-5k' | '5k-10k' | '10k-20k' | '20k+'
  travelFrequency?: 'primeira vez' | 'anual' | 'semestral' | 'mensal'
  companions?: 'solo' | 'casal' | 'família' | 'amigos' | 'grupo'
  
  // Comportamento
  lastInteraction?: Date
  totalInteractions?: number
  emailsOpened?: number
  emailsClicked?: number
  bookingsCompleted?: number
  averageBookingValue?: number
  
  // Segmentação Inteligente
  leadScore?: number // 0-100
  temperature?: 'cold' | 'warm' | 'hot' | 'cliente'
  stage?: 'lead' | 'qualificado' | 'negociação' | 'cliente' | 'perdido'
  
  // Histórico de Campanhas
  campaignHistory?: CampaignInteraction[]
  totalCampaignsReceived?: number
  
  // Análise Comportamental Avançada
  preferredTopics?: string[] // Tópicos das campanhas que mais engaja
  bestDayToOpen?: string // Dia da semana que mais abre emails
  bestTimeToOpen?: string // Horário que mais abre emails
  avgTimeToOpen?: number // Tempo médio em minutos para abrir email
  
  // Interesses Específicos
  interests?: string[]
  lastBookingDate?: Date
  nextTripPlanned?: Date
  
  // Tags Personalizadas
  tags?: string[]
  notes?: string
}

interface Contact {
  id: string
  name: string
  email: string
  phone?: string
  ownerUid: string
  tenantId?: string
  createdAt: Date
  metadata?: ContactMetadata
}

export default function Contacts() {
  const [user] = useAuthState(auth)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [subscription, setSubscription] = useState<any>(null)
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null)
  
  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  // Metadata states
  const [city, setCity] = useState('')
  const [travelStyle, setTravelStyle] = useState<ContactMetadata['travelStyle']>()
  const [budgetRange, setBudgetRange] = useState<ContactMetadata['budgetRange']>()
  const [temperature, setTemperature] = useState<ContactMetadata['temperature']>('cold')
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [notes, setNotes] = useState('')
  
  // View states
  const [filterTemp, setFilterTemp] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'date'>('date')
  
  // Buscar tenant
  useEffect(() => {
    if (!user) return
    
    const fetchTenant = async () => {
      try {
        const token = await user.getIdToken()
        const resp = await fetch('/api/my-tenants', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await resp.json()
        if (data.tenants && data.tenants.length > 0) {
          setSelectedTenant(data.tenants[0].tenantId)
        }
      } catch (e) {
        console.error('Error fetching tenant:', e)
      }
    }
    
    fetchTenant()
  }, [user])
  
  // Buscar subscription para limites
  useEffect(() => {
    if (!user) return
    
    const subsRef = collection(db, 'subscriptions')
    const q = query(subsRef, where('ownerUid', '==', user.uid), orderBy('createdAt', 'desc'), limit(1))
    
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setSubscription({ id: snap.docs[0].id, ...snap.docs[0].data() })
      }
    })
    
    return () => unsub()
  }, [user])
  
  // Listener de contatos
  useEffect(() => {
    if (!user) return
    
    try {
      const cRef = collection(db, 'contacts')
      const q = query(
        cRef, 
        where('ownerUid', '==', user.uid), 
        orderBy('createdAt', 'desc')
      )
      
      const unsub = onSnapshot(q, (snap) => {
        const docs = snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate?.() || new Date(d.data().createdAt)
        })) as Contact[]
        
        setContacts(docs)
      }, (err) => {
        console.error('Contacts snapshot error:', err)
        setResult('Erro ao carregar contatos')
      })
      
      return () => unsub()
    } catch (e) {
      console.error('Contacts listener error:', e)
    }
  }, [user])
  
  // Cálculo de lead score automático
  const calculateLeadScore = (metadata?: ContactMetadata): number => {
    if (!metadata) return 0
    
    let score = 0
    
    // Temperatura (+30)
    if (metadata.temperature === 'hot') score += 30
    else if (metadata.temperature === 'warm') score += 20
    else if (metadata.temperature === 'cold') score += 10
    
    // Engajamento (+25)
    const openRate = metadata.totalInteractions && metadata.emailsOpened 
      ? (metadata.emailsOpened / metadata.totalInteractions) * 25
      : 0
    score += openRate
    
    // Compras anteriores (+20)
    if (metadata.bookingsCompleted) {
      score += Math.min(20, metadata.bookingsCompleted * 5)
    }
    
    // Budget (+15)
    const budgetScores = {
      'até 2k': 5,
      '2k-5k': 8,
      '5k-10k': 11,
      '10k-20k': 13,
      '20k+': 15
    }
    score += budgetScores[metadata.budgetRange || 'até 2k']
    
    // Recência (+10)
    if (metadata.lastInteraction) {
      const daysSince = (Date.now() - new Date(metadata.lastInteraction).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince < 7) score += 10
      else if (daysSince < 30) score += 7
      else if (daysSince < 90) score += 4
    }
    
    return Math.min(100, Math.round(score))
  }
  
  // Contatos filtrados e ordenados
  const filteredContacts = useMemo(() => {
    let filtered = [...contacts]
    
    // Filtro de busca
    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.metadata?.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }
    
    // Filtro de temperatura
    if (filterTemp !== 'all') {
      filtered = filtered.filter(c => c.metadata?.temperature === filterTemp)
    }
    
    // Ordenação
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '')
      } else if (sortBy === 'score') {
        const scoreA = calculateLeadScore(a.metadata)
        const scoreB = calculateLeadScore(b.metadata)
        return scoreB - scoreA
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })
    
    return filtered
  }, [contacts, searchTerm, filterTemp, sortBy])
  
  // Estatísticas
  const stats = useMemo(() => {
    const total = contacts.length
    const hot = contacts.filter(c => c.metadata?.temperature === 'hot').length
    const warm = contacts.filter(c => c.metadata?.temperature === 'warm').length
    const cold = contacts.filter(c => c.metadata?.temperature === 'cold').length
    const clientes = contacts.filter(c => c.metadata?.temperature === 'cliente').length
    const avgScore = contacts.reduce((sum, c) => sum + calculateLeadScore(c.metadata), 0) / (total || 1)
    
    return { total, hot, warm, cold, clientes, avgScore: Math.round(avgScore) }
  }, [contacts])
  
  // Verificar limite do plano
  const contactLimit = subscription?.limits?.contacts || 100
  const canAddContact = contactLimit === -1 || contacts.length < contactLimit
  
  const saveContact = async () => {
    if (!user) {
      setResult('Faça login para salvar contatos')
      return
    }
    
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setResult('Email inválido')
      return
    }
    
    if (!canAddContact && !editing) {
      setResult(`Limite de ${contactLimit} contatos atingido. Faça upgrade do plano!`)
      return
    }
    
    setLoading(true)
    setResult(null)
    
    try {
      // Criar metadata apenas com valores definidos (Firestore não aceita undefined)
      const metadata: ContactMetadata = {
        temperature,
        tags,
        totalInteractions: editing?.metadata?.totalInteractions || 0,
        emailsOpened: editing?.metadata?.emailsOpened || 0,
        emailsClicked: editing?.metadata?.emailsClicked || 0,
        bookingsCompleted: editing?.metadata?.bookingsCompleted || 0,
      }
      
      // Adicionar campos opcionais apenas se tiverem valor
      if (city) metadata.city = city
      if (travelStyle) metadata.travelStyle = travelStyle
      if (budgetRange) metadata.budgetRange = budgetRange
      if (notes) metadata.notes = notes
      if (editing?.metadata?.lastInteraction) metadata.lastInteraction = editing.metadata.lastInteraction
      
      metadata.leadScore = calculateLeadScore(metadata)
      
      if (editing && editing.id) {
        const d = doc(db, 'contacts', editing.id)
        const updates: any = {
          name: name.trim(),
          email: email.trim(),
          metadata
        }
        if (phone) updates.phone = phone.trim()
        if (selectedTenant) updates.tenantId = selectedTenant
        
        await updateDoc(d, updates)
        setResult('✅ Contato atualizado com sucesso!')
      } else {
        const payload: any = {
          ownerUid: user.uid,
          email: email.trim(),
          name: name.trim() || email.split('@')[0],
          createdAt: new Date(),
          metadata
        }
        if (phone) payload.phone = phone.trim()
        if (selectedTenant) payload.tenantId = selectedTenant
        
        await addDoc(collection(db, 'contacts'), payload)
        setResult('✅ Contato adicionado com sucesso!')
      }
      
      resetForm()
    } catch (e: any) {
      console.error(e)
      setResult('❌ ' + (e.message || String(e)))
    }
    
    setLoading(false)
  }
  
  const resetForm = () => {
    setName('')
    setEmail('')
    setPhone('')
    setCity('')
    setTravelStyle(undefined)
    setBudgetRange(undefined)
    setTemperature('cold')
    setTags([])
    setNotes('')
    setEditing(null)
    setShowAdvanced(false)
  }
  
  const editContact = (contact: Contact) => {
    setEditing(contact)
    setName(contact.name || '')
    setEmail(contact.email || '')
    setPhone(contact.phone || '')
    setCity(contact.metadata?.city || '')
    setTravelStyle(contact.metadata?.travelStyle)
    setBudgetRange(contact.metadata?.budgetRange)
    setTemperature(contact.metadata?.temperature || 'cold')
    setTags(contact.metadata?.tags || [])
    setNotes(contact.metadata?.notes || '')
    setShowAdvanced(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  
  const removeContact = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este contato?')) return
    
    try {
      await deleteDoc(doc(db, 'contacts', id))
      setResult('✅ Contato removido')
    } catch (e: any) {
      console.error(e)
      setResult('❌ ' + (e.message || String(e)))
    }
  }
  
  const addTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag])
      setNewTag('')
    }
  }
  
  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }
  
  const getTemperatureColor = (temp?: string) => {
    switch (temp) {
      case 'hot': return 'text-red-600 bg-red-50 border-red-200'
      case 'warm': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'cold': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'cliente': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }
  
  const getTemperatureIcon = (temp?: string) => {
    switch (temp) {
      case 'hot': return '🔥'
      case 'warm': return '☀️'
      case 'cold': return '❄️'
      case 'cliente': return '⭐'
      default: return '❓'
    }
  }
  
  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600'
    if (score >= 50) return 'text-orange-600'
    return 'text-gray-600'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div className="mb-4 lg:mb-0">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent flex items-center">
              👥 Contatos Inteligentes
            </h1>
            <p className="text-slate-600 mt-1">Gestão avançada com scoring e segmentação automática</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {contactLimit !== -1 && (
              <div className="bg-white rounded-xl px-4 py-2 shadow-sm border border-slate-200">
                <div className="text-xs text-slate-500">Contatos</div>
                <div className="text-lg font-bold text-slate-900">
                  {contacts.length} / {contactLimit === -1 ? '∞' : contactLimit}
                </div>
              </div>
            )}
            
            <Link 
              to="/dashboard" 
              className="inline-flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Dashboard</span>
            </Link>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
            <div className="text-xs text-slate-500">Total</div>
          </div>
          
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 shadow-sm border border-red-200">
            <div className="text-2xl font-bold text-red-700 flex items-center">
              🔥 {stats.hot}
            </div>
            <div className="text-xs text-red-600">Quentes</div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 shadow-sm border border-orange-200">
            <div className="text-2xl font-bold text-orange-700 flex items-center">
              ☀️ {stats.warm}
            </div>
            <div className="text-xs text-orange-600">Mornos</div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 shadow-sm border border-blue-200">
            <div className="text-2xl font-bold text-blue-700 flex items-center">
              ❄️ {stats.cold}
            </div>
            <div className="text-xs text-blue-600">Frios</div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 shadow-sm border border-green-200">
            <div className="text-2xl font-bold text-green-700 flex items-center">
              ⭐ {stats.clientes}
            </div>
            <div className="text-xs text-green-600">Clientes</div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 shadow-sm border border-purple-200">
            <div className="text-2xl font-bold text-purple-700">{stats.avgScore}</div>
            <div className="text-xs text-purple-600">Score Médio</div>
          </div>
        </div>

        {/* Add/Edit Contact Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center justify-between">
            <span>{editing ? '✏️ Editar Contato' : '➕ Novo Contato'}</span>
            {editing && (
              <button
                onClick={resetForm}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
            )}
          </h2>
          
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nome *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="João Silva"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="joao@email.com"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Telefone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Advanced Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium mb-4 flex items-center"
          >
            {showAdvanced ? '▼' : '▶'} Dados Avançados (Segmentação & Scoring)
          </button>
          
          {showAdvanced && (
            <div className="space-y-4 p-4 bg-slate-50 rounded-xl mb-4">
              {/* Location & Style */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    📍 Cidade
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="São Paulo - SP"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    ✈️ Estilo de Viagem
                  </label>
                  <select
                    value={travelStyle}
                    onChange={(e) => setTravelStyle(e.target.value as any)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="luxo">🌟 Luxo</option>
                    <option value="econômico">💰 Econômico</option>
                    <option value="aventura">🏔️ Aventura</option>
                    <option value="cultural">🏛️ Cultural</option>
                    <option value="praia">🏖️ Praia</option>
                    <option value="montanha">⛰️ Montanha</option>
                  </select>
                </div>
              </div>
              
              {/* Budget & Temperature */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    💵 Faixa de Orçamento
                  </label>
                  <select
                    value={budgetRange}
                    onChange={(e) => setBudgetRange(e.target.value as any)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="até 2k">Até R$ 2.000</option>
                    <option value="2k-5k">R$ 2.000 - R$ 5.000</option>
                    <option value="5k-10k">R$ 5.000 - R$ 10.000</option>
                    <option value="10k-20k">R$ 10.000 - R$ 20.000</option>
                    <option value="20k+">Acima de R$ 20.000</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    🌡️ Temperatura do Lead
                  </label>
                  <select
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value as any)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="cold">❄️ Frio (Novo lead)</option>
                    <option value="warm">☀️ Morno (Engajado)</option>
                    <option value="hot">🔥 Quente (Pronto para comprar)</option>
                    <option value="cliente">⭐ Cliente</option>
                  </select>
                </div>
              </div>
              
              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  🏷️ Tags (Ex: VIP, Casais, Família, etc)
                </label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    placeholder="Digite e pressione Enter"
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={addTag}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Adicionar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center space-x-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                    >
                      <span>{tag}</span>
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-indigo-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  📝 Observações
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas sobre preferências, histórico, etc..."
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}
          
          {/* Save Button */}
          <div className="flex items-center justify-between">
            <div>
              {result && (
                <div className={`text-sm ${result.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                  {result}
                </div>
              )}
            </div>
            
            <button
              onClick={saveContact}
              disabled={loading || (!canAddContact && !editing)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <span>{editing ? 'Atualizar' : 'Adicionar'} Contato</span>
                </>
              )}
            </button>
          </div>
          
          {!canAddContact && !editing && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
                <div>
                  <div className="font-semibold text-amber-800">Limite de contatos atingido</div>
                  <div className="text-sm text-amber-700 mt-1">
                    Você atingiu o limite de {contactLimit} contatos do seu plano.
                    <Link to="/plans" className="ml-1 underline hover:text-amber-900 font-medium">
                      Faça upgrade para adicionar mais!
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔍 Buscar por nome, email ou tag..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <select
                value={filterTemp}
                onChange={(e) => setFilterTemp(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Todas Temperaturas</option>
                <option value="hot">🔥 Quentes</option>
                <option value="warm">☀️ Mornos</option>
                <option value="cold">❄️ Frios</option>
                <option value="cliente">⭐ Clientes</option>
              </select>
            </div>
            
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="date">Mais Recentes</option>
                <option value="score">Maior Score</option>
                <option value="name">Nome A-Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contacts List/Grid */}
        {filteredContacts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              {searchTerm || filterTemp !== 'all' ? 'Nenhum contato encontrado' : 'Nenhum contato ainda'}
            </h3>
            <p className="text-slate-600 mb-4">
              {searchTerm || filterTemp !== 'all' 
                ? 'Tente ajustar os filtros de busca' 
                : 'Adicione seu primeiro contato usando o formulário acima'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContacts.map((contact) => {
              const score = calculateLeadScore(contact.metadata)
              
              return (
                <div
                  key={contact.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-lg transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 text-lg">
                        {contact.name || contact.email.split('@')[0]}
                      </h3>
                      <p className="text-sm text-slate-500">{contact.email}</p>
                      {contact.phone && (
                        <p className="text-sm text-slate-500">📞 {contact.phone}</p>
                      )}
                    </div>
                    
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getTemperatureColor(contact.metadata?.temperature)}`}>
                      {getTemperatureIcon(contact.metadata?.temperature)} {contact.metadata?.temperature || 'cold'}
                    </div>
                  </div>
                  
                  {/* Score */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-600">Lead Score</span>
                      <span className={`font-bold ${getScoreColor(score)}`}>{score}/100</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${score >= 75 ? 'bg-green-500' : score >= 50 ? 'bg-orange-500' : 'bg-gray-400'}`}
                        style={{ width: `${score}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Metadata */}
                  {contact.metadata && (
                    <div className="space-y-2 text-sm mb-3">
                      {contact.metadata.city && (
                        <div className="text-slate-600">📍 {contact.metadata.city}</div>
                      )}
                      {contact.metadata.travelStyle && (
                        <div className="text-slate-600">✈️ {contact.metadata.travelStyle}</div>
                      )}
                      {contact.metadata.budgetRange && (
                        <div className="text-slate-600">💵 {contact.metadata.budgetRange}</div>
                      )}
                      {contact.metadata.bestDayToOpen && (
                        <div className="text-slate-600">📅 Melhor dia: {contact.metadata.bestDayToOpen}</div>
                      )}
                      {contact.metadata.bestTimeToOpen && (
                        <div className="text-slate-600">⏰ Melhor horário: {contact.metadata.bestTimeToOpen}</div>
                      )}
                      {contact.metadata.avgTimeToOpen && (
                        <div className="text-slate-600">
                          ⚡ Abre em média: {contact.metadata.avgTimeToOpen < 60 
                            ? `${contact.metadata.avgTimeToOpen}min` 
                            : `${Math.round(contact.metadata.avgTimeToOpen / 60)}h`}
                        </div>
                      )}
                      {contact.metadata.totalCampaignsReceived && (
                        <div className="text-slate-600">
                          📧 Campanhas recebidas: {contact.metadata.totalCampaignsReceived}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Tags */}
                  {contact.metadata?.tags && contact.metadata.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {contact.metadata.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                      {contact.metadata.tags.length > 3 && (
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs">
                          +{contact.metadata.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex space-x-2 pt-3 border-t border-slate-200">
                    <button
                      onClick={() => editContact(contact)}
                      className="flex-1 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 text-sm font-medium transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => removeContact(contact.id)}
                      className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium transition-colors"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
