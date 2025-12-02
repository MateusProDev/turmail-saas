import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth, db } from '../lib/firebase'

import DOMPurify from 'dompurify'
import { renderTemplate } from '../lib/templateHelper'

import { collection, query, where, onSnapshot, orderBy, limit, getDocs, addDoc, doc, serverTimestamp } from 'firebase/firestore'
import { generateCopy, generateVariants } from '../lib/aiHelper'
import formatRawToHtml, { advancedFormatRawToHtml } from '../lib/formatHelper'

export default function Campaigns(){
  const [user, loadingAuth] = useAuthState(auth)
  const [result, setResult] = useState<string | null>(null)
  // removed test-send state (tests are sent on create/send)

  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // New campaign form
  const [showForm, setShowForm] = useState(false)
  const [subject, setSubject] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const [recipientsText, setRecipientsText] = useState('')
  const [recipientInput, setRecipientInput] = useState('')
  const [preheader, setPreheader] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  // const [tenantOptions, setTenantOptions] = useState<Array<{id:string,role:string}>>([])
  const [companyName, setCompanyName] = useState('')
  const [productName, setProductName] = useState('')
  const [mainTitle, setMainTitle] = useState('')
  const [ctaLink, setCtaLink] = useState('')
  const [destination, setDestination] = useState('')
  const [description, setDescription] = useState('')
  // Removed unused returningCustomer state
  const [userPatterns, setUserPatterns] = useState<string[]>([])
  const [tone, setTone] = useState<'friendly' | 'formal' | 'urgent' | 'casual'>('friendly')
  const [vertical, setVertical] = useState<'general'|'tourism'|'cooperative'|'taxi'>('general')
  const [audience, setAudience] = useState<string>('')
  const [benefitInput, setBenefitInput] = useState<string>('')
  const [keyBenefits, setKeyBenefits] = useState<string[]>([])
  
  const [showPreview, setShowPreview] = useState(true)
  
  const [sendImmediate, setSendImmediate] = useState(true)
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null)
  const [returningCustomer, setReturningCustomer] = useState(false)
  const [previousTrip, setPreviousTrip] = useState('') // <-- Added missing state
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null)
  // contacts selection for recipients
  const [contacts, setContacts] = useState<any[]>([])
  const [showContactsModal, setShowContactsModal] = useState(false)
  const [selectedContactIds, setSelectedContactIds] = useState<Record<string, boolean>>({})
  const [showRecipientsModal, setShowRecipientsModal] = useState(false)
  const [useCompanyAsFrom, setUseCompanyAsFrom] = useState(true)
  // variants UI
  const [variants, setVariants] = useState<any[]>([])
  const [showVariantsModal, setShowVariantsModal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatingVariants, setGeneratingVariants] = useState(false)
  const [copyHistory, setCopyHistory] = useState<any[]>([])

  // helpers for delivery metrics
  const getDeliveredCount = (c: any) => {
    return c?.metrics?.delivered ?? c?.delivered ?? c?.stats?.delivered ?? null
  }
  const getSentCount = (c: any) => {
    return c?.metrics?.sent ?? c?.sent ?? c?.sentCount ?? (c?.to || []).length ?? 0
  }
  const getDeliverRateDisplay = (c: any) => {
    const sent = Number(getSentCount(c) || 0)
    const delivered = Number(getDeliveredCount(c) || 0)
    if (!sent) return '—'
    // if sent but no delivered recorded, show 100% per preference
    if (delivered === 0) return '100%'
    return `${Math.round((delivered / sent) * 10000) / 100}%`
  }

  // Simple campaigns listener: campaigns where ownerUid == user.uid
  useEffect(() => {
    // load tenant memberships for the current user so we can default to the tenant's Brevo key
    async function loadTenants() {
      if (!user) return
      try {
        const idToken = await user.getIdToken()
        const resp = await fetch('/api/my-tenants', { method: 'GET', headers: { Authorization: `Bearer ${idToken}` } })
        if (!resp.ok) {
          console.warn('my-tenants endpoint returned', resp.status)
          return
        }
        const json = await resp.json()
        const opts = (json.tenants || []).map((t: any) => ({ id: t.tenantId, role: t.role }))
        // if user hasn't selected a tenant in the UI, default to the first available tenant
        if (opts.length > 0) setSelectedTenant(prev => prev || opts[0].id)
      } catch (e) {
        console.warn('Failed loading tenant memberships', e)
      }
    }
    if (user) loadTenants()

    if (!user) return
    setLoading(true)
    try {
      const cRef = collection(db, 'campaigns')
      const q = query(cRef, where('ownerUid', '==', user.uid), orderBy('createdAt', 'desc'), limit(50))
      const unsub = onSnapshot(q, (snap) => {
        setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      }, (err) => {
        console.error('campaigns snapshot error', err)
        setLoading(false)
      })
      return () => unsub()
    } catch (e) {
      console.error('campaigns listener error', e)
      setLoading(false)
    }
  }, [user])

  // load contacts for selection modal
  useEffect(() => {
    if (!user) return
    try {
      const cRef = collection(db, 'contacts')
      const qc = query(cRef, where('ownerUid', '==', user.uid), orderBy('name'))
      const unsubC = onSnapshot(qc, (snap) => setContacts(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (err) => console.error('contacts snapshot error', err))
      return () => unsubC()
    } catch (e) { console.error('contacts listener error', e) }
  }, [user])

  // load user patterns for the assistant
  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!user) return
      try {
        const patterns = await (await import('../lib/aiHelper')).loadUserPatterns(user.uid)
        if (mounted) setUserPatterns(patterns || [])
      } catch (e) { console.warn('failed loading user patterns', e) }
    }
    load()
    return () => { mounted = false }
  }, [user])


  const refreshCampaignsByTenant = async (tenantId: string) => {
    try {
      const cRef = collection(db, 'campaigns')
      const q = query(cRef, where('tenantId', '==', tenantId), orderBy('createdAt', 'desc'), limit(50))
      const snap = await getDocs(q)
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      // merge unique
      setCampaigns(prev => {
        const map = new Map<string, any>()
        for (const c of list) map.set(c.id, c)
        for (const c of prev) if (!map.has(c.id)) map.set(c.id, c)
        return Array.from(map.values()).sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0))
      })
    } catch (e) { console.error(e) }
  }

  // Test send helper removed — tests are handled during create/send flows
  const createCampaign = async () => {
    if (!subject || !htmlContent) { setResult('Assunto e conteúdo são obrigatórios'); return }
    // parse recipients and basic validation
    const recipients = recipientsText.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean)
    if (recipients.length === 0) { setResult('Adicione ao menos 1 destinatário'); return }
    const invalid = recipients.find(r => !/^\S+@\S+\.\S+$/.test(r))
    if (invalid) { setResult(`Endereço inválido: ${invalid}`); return }
    setResult(null)

    const to = recipients.map(email => {
      const contact = contacts.find(c => c.email && String(c.email).toLowerCase() === String(email).toLowerCase())
      const obj: any = { email }
      if (contact && contact.name) obj.name = contact.name
      // attach per-recipient fromName when toggle enabled
      if (useCompanyAsFrom) {
        const fromName = companyName || (contact && (contact.company || contact.companyName)) || undefined
        if (fromName) obj.fromName = fromName
      }
      return obj
    })
    const payload: any = { tenantId: selectedTenant || undefined, subject, htmlContent, preheader, to, ownerUid: user?.uid, sendImmediate }
    // attach metadata for server storage
    if (companyName) payload.companyName = companyName
    if (productName) payload.productName = productName
    if (destination) payload.destination = destination
    if (ctaLink) payload.ctaLink = ctaLink
    if (mainTitle) payload.mainTitle = mainTitle
    if (tone) payload.tone = tone
    if (vertical) payload.vertical = vertical
    if (description) payload.description = description
    // Removed previousExperience assignment due to missing returningCustomer and previousTrip
    if (audience) payload.audience = audience
    if (keyBenefits && keyBenefits.length) payload.keyBenefits = keyBenefits
    // template selection removed — payload.templateId omitted
    if (!sendImmediate && scheduledAt) payload.scheduledAt = scheduledAt

    try {
      if (editingCampaign && editingCampaign.id) {
          const resp = await fetch('/api/update-campaign', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: editingCampaign.id, subject, htmlContent, preheader, to, scheduledAt: payload.scheduledAt, companyName: companyName || null, productName: productName || null, destination: destination || null, ctaLink: ctaLink || null, mainTitle: mainTitle || null, tone: tone || null, vertical: vertical || null, description: description || null, audience: audience || null, keyBenefits: (keyBenefits && keyBenefits.length) ? keyBenefits : null }) })
          const data = await resp.json()
          if (!resp.ok) throw new Error(JSON.stringify(data))
          setResult('Campanha atualizada')
        } else {
        const resp = await fetch('/api/create-campaign', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
        const data = await resp.json()
        if (!resp.ok) throw new Error(JSON.stringify(data))
        setResult(`Campanha criada: ${data.id}`)
        // store a lightweight summary for the user's AI helper / dashboard
        try {
          if (user && data && data.id) {
            // format the body for storage (use advanced formatter when possible to capture CTA and title)
            const adv = advancedFormatRawToHtml(htmlContent, { destination: destination || companyName, dateRange: '', ctaLink, mainTitle })
            const formattedBody = adv && adv.html ? adv.html : formatRawToHtml(htmlContent)

            const summary: any = {
              campaignId: data.id,
              subject: subject || null,
              templateId: null,
              vertical: (typeof vertical !== 'undefined' ? vertical : 'general'),
              companyName: companyName || null,
              destination: destination || null,
              productName: productName || null,
              mainTitle: mainTitle || null,
              ctaLink: ctaLink || null,
              tone: tone || null,
              recipientsCount: recipients.length,
              createdAt: serverTimestamp(),
              ownerUid: user.uid,
              rawBody: htmlContent || null,
              formattedBody: formattedBody || null
            }
            await addDoc(collection(doc(db, 'users', user.uid), 'ai_campaigns'), summary)
            console.log('[Campaigns] ai_campaign summary saved', { id: data.id })
          }
        } catch (e:any) { console.warn('[Campaigns] failed saving ai summary', e) }
      }

      setShowForm(false)
      setEditingCampaign(null)
      if (selectedTenant) await refreshCampaignsByTenant(selectedTenant)
    } catch (e: any) {
      setResult(String(e.message || e))
    }
  }

  if (loadingAuth) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600 font-medium">Carregando...</p>
      </div>
    </div>
  )
  
  if (!user) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4 mx-auto">
          <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 text-center mb-2">Acesso necessário</h2>
        <p className="text-slate-600 text-center mb-6">Você precisa entrar para acessar Campanhas.</p>
        <Link 
          to="/login" 
          className="block w-full bg-indigo-600 text-white text-center py-3 px-4 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
        >
          Ir para Login
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Campanhas
            </h1>
            <p className="text-slate-600 mt-1">Gerencie e crie suas campanhas de email</p>
          </div>
          <div className="flex items-center space-x-4">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Voltar ao Dashboard</span>
            </Link>
            <button 
              onClick={() => setShowForm(s => !s)} 
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>{showForm ? 'Fechar' : 'Nova Campanha'}</span>
            </button>
          </div>
        </header>

        {/* Campaign Form */}
        {showForm && (
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-slate-200/60 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex-1"></div>
              <h2 className="text-xl font-semibold text-slate-900 flex-1 text-center">
                {editingCampaign ? 'Editar Campanha' : 'Criar Nova Campanha'}
              </h2>
              <div className="flex items-center space-x-2 justify-end flex-1">
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-slate-600 font-medium">Preview</label>
                  <div className="relative inline-block w-12 h-6">
                    <input 
                      type="checkbox" 
                      checked={showPreview} 
                      onChange={e => setShowPreview(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-12 h-6 rounded-full transition-colors ${
                      showPreview ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}></div>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      showPreview ? 'transform translate-x-7' : 'transform translate-x-1'
                    }`}></div>
                  </div>
                </div>
              </div>

              {/* Contacts Selection Modal */}
              {showContactsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/40" onClick={() => setShowContactsModal(false)} />
                  <div className="relative bg-white rounded-2xl shadow-lg w-full max-w-2xl p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">Selecionar Contatos</h3>
                    <div className="max-h-64 overflow-auto space-y-2">
                      {contacts.length === 0 ? (
                        <div className="text-sm text-slate-500">Nenhum contato disponível</div>
                      ) : (
                        contacts.map(c => (
                          <label key={c.id} className="flex items-center justify-between p-2 rounded hover:bg-slate-50">
                            <div>
                              <div className="font-medium text-slate-900">{c.name || c.email}</div>
                              <div className="text-xs text-slate-500">{c.email}</div>
                            </div>
                            <input type="checkbox" checked={!!selectedContactIds[c.id]} onChange={(e) => setSelectedContactIds(prev => ({ ...prev, [c.id]: e.target.checked }))} />
                          </label>
                        ))
                      )}
                    </div>
                    <div className="mt-4 flex justify-end space-x-2">
                      <button onClick={() => setShowContactsModal(false)} className="px-4 py-2 border rounded">Cancelar</button>
                      <button onClick={() => {
                        const selected = contacts.filter(c => selectedContactIds[c.id])
                        const emails = selected.map(s => s.email).filter(Boolean)
                        const existing = recipientsText.split(/[,\n;]+/).map(s => s.trim()).filter(Boolean)
                        const merged = Array.from(new Set([...existing, ...emails]))
                        setRecipientsText(merged.join('\n'))
                          // keep selectedContactIds so modal reflects selection if reopened
                        setShowContactsModal(false)
                      }} className="px-4 py-2 bg-indigo-600 text-white rounded">Adicionar Selecionados</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Recipients 'Ver todos' modal */}
              {showRecipientsModal && (
                <div className="fixed inset-0 z-60 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/40" onClick={() => setShowRecipientsModal(false)} />
                  <div className="relative bg-white rounded-2xl shadow-lg w-full max-w-md p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">Todos os Destinatários</h3>
                    <div className="max-h-64 overflow-auto space-y-2">
                      {recipientsText.split(/[\n,;]+/).map(r => r.trim()).filter(Boolean).length === 0 ? (
                        <div className="text-sm text-slate-500">Nenhum destinatário</div>
                      ) : (
                        recipientsText.split(/[\n,;]+/).map(r => r.trim()).filter(Boolean).map((r, i) => (
                          <div key={i} className="p-2 rounded border border-slate-100">{r}</div>
                        ))
                      )}
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button onClick={() => setShowRecipientsModal(false)} className="px-4 py-2 border rounded">Fechar</button>
                    </div>
                  </div>
                </div>
              )}
              {/* Variants Modal */}
              {showVariantsModal && (
                <div className="fixed inset-0 z-60 flex items-start justify-center pt-20">
                  <div className="absolute inset-0 bg-black/40" onClick={() => setShowVariantsModal(false)} />
                  <div className="relative bg-white rounded-2xl shadow-lg w-full max-w-4xl p-6 overflow-auto max-h-[80vh]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Variações Geradas</h3>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => {
                          try {
                            const data = JSON.stringify(variants, null, 2)
                            const blob = new Blob([data], { type: 'application/json' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `${companyName || 'variantes'}.json`
                            a.click()
                            URL.revokeObjectURL(url)
                          } catch (e:any) { console.warn(e); setResult('Erro ao exportar JSON') }
                        }} className="px-3 py-2 border rounded">Exportar JSON</button>
                        <button onClick={() => setShowVariantsModal(false)} className="px-3 py-2 bg-slate-100 rounded">Fechar</button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {variants.length === 0 ? (
                        <div className="text-sm text-slate-500">Nenhuma variação gerada.</div>
                      ) : (
                        variants.map((variant, idx) => (
                          <div key={idx} className="p-4 border rounded-lg bg-white">
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1">
        <div className="flex items-center space-x-3 mb-2">
          <div className="font-semibold text-lg">#{idx + 1} - {variant.subject}</div>
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            (variant.score || 0) >= 80 ? 'bg-green-100 text-green-800' :
            (variant.score || 0) >= 60 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            Score: {variant.score}/100
          </div>
        </div>
        <div className="text-sm text-slate-600 mb-1">{variant.preheader}</div>
        <div className="flex space-x-2 text-xs text-slate-500">
          <span>Tom: {variant.tone}</span>
          <span>•</span>
          <span>Leitura: {variant.metadata?.readingLevel}</span>
          <span>•</span>
          <span>Palavras: {variant.metadata?.wordCount}</span>
        </div>
      </div>
      <div className="flex space-x-2 ml-4">
        <button 
          onClick={() => {
            setSubject(variant.subject)
            setPreheader(variant.preheader)
            setHtmlContent(variant.html)
            setResult(`✅ Variação #${idx + 1} inserida`)
            setShowVariantsModal(false)
          }}
          className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
        >
          Usar
        </button>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(variant.html)
              setResult('📋 HTML copiado')
            } catch {
              setResult('❌ Erro ao copiar')
            }
          }}
          className="px-3 py-2 border border-slate-300 rounded text-sm hover:bg-slate-50"
        >
          Copiar
        </button>
      </div>
    </div>
    <div className="mt-3 prose max-w-none text-sm border-t pt-3" 
         dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderTemplate(variant.html, variant.subject, variant.preheader)) }} />
  </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Assunto *</label>
                  <input 
                    value={subject} 
                    onChange={e => setSubject(e.target.value)} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="Digite o assunto do email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Preheader</label>
                  <input 
                    value={preheader} 
                    onChange={e => setPreheader(e.target.value)} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="Texto curto exibido na caixa de entrada"
                  />
                </div>
              </div>

              {/* Tenant selection is intentionally hidden — using global configuration */}

              {/* Assistente de Copy Profissional */}
              <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
  <label className="block text-sm font-semibold text-slate-800 mb-4">
    🚀 Assistente de Copy Profissional
    <span className="text-xs font-normal text-slate-600 ml-2">(Processamento local - 100% privado)</span>
  </label>
  
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    {/* Coluna 1: Inputs principais */}
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Empresa</label>
        <input 
          value={companyName} 
          onChange={e => setCompanyName(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Nome da sua empresa"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Produto/Serviço</label>
        <input 
          value={productName} 
          onChange={e => setProductName(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="O que você oferece?"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Público-alvo</label>
        <input 
          value={audience} 
          onChange={e => setAudience(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="ex: clientes premium, jovens..."
        />
      </div>
    </div>

    {/* Coluna 2: Configurações */}
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tom</label>
          <select 
            value={tone} 
            onChange={e => setTone(e.target.value as any)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="friendly">Amigável</option>
            <option value="professional">Profissional</option>
            <option value="formal">Formal</option>
            <option value="casual">Casual</option>
            <option value="urgent">Urgente</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Vertente</label>
          <select 
            value={vertical} 
            onChange={e => setVertical(e.target.value as any)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="general">Geral</option>
            <option value="tourism">Turismo</option>
            <option value="ecommerce">E-commerce</option>
            <option value="services">Serviços</option>
            <option value="cooperative">Cooperativa</option>
            <option value="taxi">Táxi/Motoristas</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Benefícios principais</label>
        <div className="flex space-x-2 mb-2">
          <input
            value={benefitInput}
            onChange={e => setBenefitInput(e.target.value)}
            onKeyPress={e => {
              if (e.key === 'Enter' && benefitInput.trim()) {
                setKeyBenefits(prev => [...prev, benefitInput.trim()])
                setBenefitInput('')
              }
            }}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Adicione um benefício e pressione Enter"
          />
          <button
            onClick={() => {
              if (benefitInput.trim()) {
                setKeyBenefits(prev => [...prev, benefitInput.trim()])
                setBenefitInput('')
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            +
          </button>
        </div>
        
        {keyBenefits.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {keyBenefits.map((benefit, index) => (
              <span key={index} className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                {benefit}
                <button
                  onClick={() => setKeyBenefits(prev => prev.filter((_, i) => i !== index))}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>

    {/* Coluna 3: Ações */}
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={async () => {
            setGenerating(true)
            try {
              const copy = await generateCopy({
                company: companyName,
                product: productName,
                tone,
                vertical,
                destination,
                ctaLink,
                mainTitle,
                description,
                previousExperience: undefined,
                userPatterns,
                audience,
                keyBenefits
              })
              
              setSubject(copy.subject)
              setPreheader(copy.preheader)
              setHtmlContent(copy.html)
              setCopyHistory(prev => [copy, ...prev.slice(0, 9)]) // Manter últimas 10
              
              setResult(`✅ Copy gerada (Score: ${copy.score}/100)`)
            } catch (error) {
              setResult('❌ Erro ao gerar copy')
            }
            setGenerating(false)
          }}
          disabled={generating}
          className={`py-3 px-4 rounded-lg font-medium ${
            generating 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {generating ? '🔄 Gerando...' : '✨ Gerar Copy'}
        </button>

        <button
          onClick={async () => {
            setGeneratingVariants(true)
            try {
              const variants = await generateVariants({
                company: companyName,
                product: productName,
                vertical,
                destination,
                ctaLink,
                mainTitle,
                description,
                previousExperience: undefined,
                userPatterns,
                audience,
                keyBenefits
              }, 5)
              
              setVariants(variants)
              setShowVariantsModal(true)
              setResult(`✅ ${variants.length} variações geradas`)
            } catch (error) {
              setResult('❌ Erro ao gerar variações')
            }
            setGeneratingVariants(false)
          }}
          disabled={generatingVariants}
          className={`py-3 px-4 rounded-lg font-medium ${
            generatingVariants
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {generatingVariants ? '🔄 Gerando...' : '🎨 5 Variações'}
        </button>
      </div>

      <button
        onClick={async () => {
          if (!user) {
            setResult('⚠️ Faça login para salvar padrões')
            return
          }
          
          const patternData = {
            pattern: description || `${companyName} - ${productName} - ${destination}`,
            tone,
            vertical,
            mainTitle,
            ctaLink,
            description,
            audience
          }
          
          // dynamic import to avoid SSR/import cycles
          const { saveUserPattern } = await import('../lib/aiHelper')
          const success = await saveUserPattern(user.uid, patternData)
          setResult(success ? '✅ Padrão salvo' : '❌ Erro ao salvar')
        }}
        className="w-full py-2 px-4 border border-slate-300 rounded-lg hover:bg-slate-50"
      >
        💾 Salvar Padrão
      </button>

      {copyHistory.length > 0 && (
        <div className="text-xs text-slate-600">
          📊 Última copy: {copyHistory[0]?.score}/100 - 
          {copyHistory[0]?.metadata?.readingLevel} - 
          {copyHistory[0]?.metadata?.emotionalTone.join(', ')}
        </div>
      )}
    </div>
  </div>
</div> 

              {/* Consolidated Campaign Metadata (destination, CTA, title, description, returning customer) */}
              <div className="grid grid-cols-1 gap-6 mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Destino / Público</label>
                    <input value={destination} onChange={e=>setDestination(e.target.value)} placeholder="Destino ou público" className="w-full px-4 py-3 border border-slate-300 rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Título principal (H1)</label>
                    <input value={mainTitle} onChange={e=>setMainTitle(e.target.value)} placeholder="Título principal que aparecerá no email" className="w-full px-4 py-3 border border-slate-300 rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Link do CTA</label>
                    <input value={ctaLink} onChange={e=>setCtaLink(e.target.value)} placeholder="https://..." className="w-full px-4 py-3 border border-slate-300 rounded-xl" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Descrição (para IA)</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição específica para este público (ex: clientes que já viajaram com a agência) — opcional" className="w-full px-4 py-3 border border-slate-300 rounded-xl h-20" />
                </div>

                <div className="flex items-center space-x-4">
                  <label className="inline-flex items-center space-x-2">
                    <input type="checkbox" checked={returningCustomer} onChange={e=>setReturningCustomer(e.target.checked)} className="form-checkbox" />
                    <span className="text-sm">Público: clientes anteriores</span>
                  </label>
                  <input value={previousTrip} onChange={e=>setPreviousTrip(e.target.value)} placeholder="Última viagem (ex: Rota das Serras)" className="px-4 py-3 border border-slate-300 rounded-xl flex-1" />
                </div>
              </div>

              {/* Content Editor */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">Conteúdo HTML *</label>
                  
                  {/* Rich Text Toolbar */}
                  <div className="flex flex-wrap gap-2 mb-3 p-3 bg-slate-50 rounded-lg">
                    <button 
                      type="button" 
                      onClick={() => {
                        const ta = document.getElementById('campaign-html') as HTMLTextAreaElement | null
                        if (!ta) return
                        const start = ta.selectionStart, end = ta.selectionEnd
                        const before = ta.value.slice(0, start), sel = ta.value.slice(start, end), after = ta.value.slice(end)
                        ta.value = before + '<strong>' + sel + '</strong>' + after
                        setHtmlContent(ta.value)
                      }} 
                      className="w-8 h-8 bg-white border border-slate-300 rounded-lg flex items-center justify-center font-bold hover:bg-slate-100 transition-colors"
                    >
                      B
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        const ta = document.getElementById('campaign-html') as HTMLTextAreaElement | null
                        if (!ta) return
                        const start = ta.selectionStart, end = ta.selectionEnd
                        const before = ta.value.slice(0, start), sel = ta.value.slice(start, end), after = ta.value.slice(end)
                        ta.value = before + '<em>' + sel + '</em>' + after
                        setHtmlContent(ta.value)
                      }} 
                      className="w-8 h-8 bg-white border border-slate-300 rounded-lg flex items-center justify-center italic hover:bg-slate-100 transition-colors"
                    >
                      I
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        const ta = document.getElementById('campaign-html') as HTMLTextAreaElement | null
                        if (!ta) return
                        const start = ta.selectionStart, end = ta.selectionEnd
                        const before = ta.value.slice(0, start), sel = ta.value.slice(start, end), after = ta.value.slice(end)
                        ta.value = before + '<h3>' + sel + '</h3>' + after
                        setHtmlContent(ta.value)
                      }} 
                      className="w-8 h-8 bg-white border border-slate-300 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
                    >
                      H1
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setHtmlContent((h) => h + '<p>Olá {{name}},</p>')} 
                      className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-sm hover:bg-slate-100 transition-colors"
                    >
                      {'{{name}}'}
                    </button>
                  </div>

                  {/* Editor actions removed: Formatar copy / Melhorar estrutura / Atualizar Preview (per user request) */}

                  <textarea 
                    id="campaign-html" 
                    value={htmlContent} 
                    onChange={e => setHtmlContent(e.target.value)} 
                    className="w-full h-64 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                    placeholder="Digite o conteúdo HTML do email..."
                  />
                </div>

                {/* Preview */}
                {showPreview && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">Preview</label>
                    <div className="h-64 border-2 border-slate-200 rounded-xl bg-white p-4 overflow-auto">
                      <div 
                        className="prose max-w-none text-sm" 
                        dangerouslySetInnerHTML={{ 
                          __html: DOMPurify.sanitize(
                            renderTemplate(htmlContent || '<p class="text-slate-400">Digite o conteúdo para ver o preview...</p>', subject, preheader)
                          ) 
                        }} 
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Recipients and Settings */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Destinatários * (adicione emails e pressione Enter ou clique em "Adicionar")
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        value={recipientInput}
                        onChange={e => setRecipientInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            // trigger add
                            const raw = recipientInput.trim()
                            if (!raw) return
                            const parts = raw.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean)
                            const invalid = parts.find(p => !/^\S+@\S+\.\S+$/.test(p))
                            if (invalid) { setResult(`Endereço inválido: ${invalid}`); return }
                            const existing = recipientsText.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean)
                            const merged = Array.from(new Set([...existing, ...parts]))
                            setRecipientsText(merged.join('\n'))
                            setRecipientInput('')
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        placeholder="adicione@exemplo.com"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const raw = recipientInput.trim()
                          if (!raw) return
                          const parts = raw.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean)
                          const invalid = parts.find(p => !/^\S+@\S+\.\S+$/.test(p))
                          if (invalid) { setResult(`Endereço inválido: ${invalid}`); return }
                          const existing = recipientsText.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean)
                          const merged = Array.from(new Set([...existing, ...parts]))
                          setRecipientsText(merged.join('\n'))
                          setRecipientInput('')
                        }}
                        className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
                      >Adicionar</button>
                      <button type="button" onClick={() => {
                        const emails = recipientsText.split(/[\n,;]+/).map(s => s.trim().toLowerCase()).filter(Boolean)
                        const map: Record<string, boolean> = {}
                        for (const c of contacts) {
                          if (c.email && emails.includes(String(c.email).toLowerCase())) map[c.id] = true
                        }
                        setSelectedContactIds(map)
                        setShowContactsModal(true)
                      }} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200">Selecionar Contatos</button>
                    </div>

                    {/* Recipient tags preview */}
                    {(() => {
                      const parsed = recipientsText.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean)
                      if (parsed.length === 0) return null
                      const maxVisible = 5
                      const visible = parsed.slice(0, maxVisible)
                      const hiddenCount = parsed.length - visible.length
                      return (
                        <div className="mt-3">
                          <div className="flex flex-wrap gap-2">
                            {visible.map((r, i) => (
                              <div key={i} className="px-3 py-1 bg-slate-100 text-slate-800 rounded-full text-sm max-w-xs truncate">
                                {r}
                              </div>
                            ))}
                            {hiddenCount > 0 && (
                              <button onClick={() => setShowRecipientsModal(true)} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm">+{hiddenCount} Ver todos</button>
                            )}
                          </div>
                        </div>
                      )
                    })()}

                          <div className="mt-3">
                            <label className="inline-flex items-center space-x-2">
                              <input type="checkbox" checked={useCompanyAsFrom} onChange={e => setUseCompanyAsFrom(e.target.checked)} className="form-checkbox" />
                              <span className="text-sm">Usar nome da empresa como From</span>
                            </label>
                          </div>

                    
                  </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div>
                      <div className="font-medium text-slate-900">Envio Imediato</div>
                      <div className="text-sm text-slate-600">Enviar campanha imediatamente após criação</div>
                    </div>
                    <div className="relative inline-block w-12 h-6">
                      <input 
                        type="checkbox" 
                        checked={sendImmediate} 
                        onChange={e => setSendImmediate(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-12 h-6 rounded-full transition-colors ${
                        sendImmediate ? 'bg-green-600' : 'bg-slate-300'
                      }`}></div>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        sendImmediate ? 'transform translate-x-7' : 'transform translate-x-1'
                      }`}></div>
                    </div>
                  </div>

                  {!sendImmediate && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Agendar Envio</label>
                      <input 
                        type="datetime-local" 
                        value={scheduledAt} 
                        onChange={e => setScheduledAt(e.target.value)} 
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                <div className="text-sm text-slate-600">
                  {result && (
                    <div className={`px-4 py-2 rounded-lg ${
                      result.includes('❌') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {result}
                    </div>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => { setShowForm(false); setEditingCampaign(null) }} 
                    className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={createCampaign} 
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200"
                  >
                    {editingCampaign ? 'Atualizar Campanha' : 'Criar Campanha'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Campaigns List */}
        <section className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200/60 text-center">
            <h2 className="text-xl font-semibold text-slate-900">Campanhas Recentes</h2>
            <p className="text-slate-600 text-sm mt-1">Lista das suas campanhas de email</p>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-600">Carregando campanhas...</p>
                </div>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhuma campanha encontrada</h3>
                <p className="text-slate-600 mb-6">Comece criando sua primeira campanha de email</p>
                <button 
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Criar Primeira Campanha</span>
                </button>
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Título</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Enviadas</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Entrega com Sucesso</th>
                      {/* <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Aberturas</th> */}
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Criado</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60">
                    {campaigns.slice((page-1)*pageSize, page*pageSize).map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-slate-900">{c.subject}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-600">{c.metrics?.sent ?? c.sent ?? (c.to || []).length}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-600">{getDeliverRateDisplay(c)}</div>
                        </td>
                        {/* <td className="px-6 py-4">
                          <div className="text-sm text-slate-600">{getOpenRateDisplay(c)}</div>
                        </td> */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            c.status === 'sent' ? 'bg-green-100 text-green-800' :
                            c.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                            c.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {(() => {
                              const s = c.status || ''
                              if (s === 'sent') return 'Enviado'
                              if (s === 'scheduled') return 'Agendada'
                              if (s === 'draft') return 'Rascunho'
                              return s || '—'
                            })()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-600">
                            {c.createdAt ? new Date((c.createdAt?.seconds || c.createdAt) * (c.createdAt?.seconds ? 1000 : 1)).toLocaleString('pt-BR') : '—'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            {/* 'Teste' action removed: tests are sent on create/send or scheduled sends */}
                            <button 
                              onClick={async () => {
                                try {
                                  const resp = await fetch('/api/send-campaign', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ campaignId: c.id }) })
                                  const j = await resp.json()
                                  if (!resp.ok) throw new Error(JSON.stringify(j))
                                  setResult('Reenvio iniciado')
                                } catch (e:any) { setResult(String(e.message || e)) }
                              }} 
                              className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              <span>Reenviar</span>
                            </button>
                            <button 
                              onClick={() => { 
                                setShowForm(true); 
                                setEditingCampaign(c); 
                                setSubject(c.subject||''); 
                                setHtmlContent(c.htmlContent||''); 
                                setPreheader(c.preheader||''); 
                                setRecipientsText((c.to||[]).map((t:any)=>t.email).join('\n')); 
                                setSelectedTenant(c.tenantId||'') 
                              }} 
                              className="inline-flex items-center space-x-1 px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span>Editar</span>
                            </button>
                            <button 
                              onClick={async () => {
                                if (!confirm('Tem certeza que deseja remover esta campanha?')) return
                                try { 
                                  const resp = await fetch('/api/delete-campaign', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: c.id }) }); 
                                  const j = await resp.json(); 
                                  if (!resp.ok) throw new Error(JSON.stringify(j)); 
                                  setCampaigns(prev=>prev.filter(x=>x.id!==c.id)); 
                                  setResult('Campanha removida') 
                                } catch (e:any){ setResult(String(e.message||e)) }
                              }} 
                              className="inline-flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>Remover</span>
                            </button>
                            {/* 'Ver' removed — use 'Editar' to view/edit and 'Reenviar' to resend */}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {campaigns.length > pageSize && (
                  <div className="px-6 py-4 border-t border-slate-200/60 flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                      Mostrando {((page-1)*pageSize)+1} - {Math.min(page*pageSize, campaigns.length)} de {campaigns.length} campanhas
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={page <= 1}
                        onClick={() => setPage(p => Math.max(1, p-1))}
                      >
                        Anterior
                      </button>
                      <button 
                        className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={page >= Math.ceil(campaigns.length/pageSize)}
                        onClick={() => setPage(p => p+1)}
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Quick Test removed: test sends are not shown/persisted in Campaigns list */}
      </div>
    </div>
  )
}