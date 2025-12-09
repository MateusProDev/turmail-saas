import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth, db } from '../lib/firebase'

import DOMPurify from 'dompurify'
import { renderTemplate } from '../lib/templateHelper'
import { EMAIL_TEMPLATES } from '../lib/emailTemplates'
import { uploadImage } from '../lib/cloudinary'
import { ImageGallerySelector } from '../components/ImageGallerySelector'
import { ImageEditablePreview } from '../components/ImageEditablePreview'

import { collection, query, where, onSnapshot, orderBy, limit, getDocs, addDoc, doc, serverTimestamp } from 'firebase/firestore'
import { generateCopy, generateVariants } from '../lib/aiHelper'
import formatRawToHtml, { advancedFormatRawToHtml } from '../lib/formatHelper'
import { getClientImageGallery } from '../lib/imageGallery'

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
  const [mobilePreview, setMobilePreview] = useState(false)
  
  const [sendImmediate, setSendImmediate] = useState(true)
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null)
  // const [returningCustomer, setReturningCustomer] = useState(false) // Removido - campo não usado
  // const [previousTrip, setPreviousTrip] = useState('') // Removido - campo não usado
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null)
  // contacts selection for recipients
  const [contacts, setContacts] = useState<any[]>([])
  const [showContactsModal, setShowContactsModal] = useState(false)
  const [selectedContactIds, setSelectedContactIds] = useState<Record<string, boolean>>({})
  const [showRecipientsModal, setShowRecipientsModal] = useState(false)
  const [useCompanyAsFrom, setUseCompanyAsFrom] = useState(true)
  
  // Filtros do modal de contatos
  const [contactSearchTerm, setContactSearchTerm] = useState('')
  const [contactFilterTemp, setContactFilterTemp] = useState<string>('all')
  const [contactFilterBudget, setContactFilterBudget] = useState<string>('all')
  const [contactFilterStyle, setContactFilterStyle] = useState<string>('all')
  // variants UI
  const [variants, setVariants] = useState<any[]>([])
  const [showVariantsModal, setShowVariantsModal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatingVariants, setGeneratingVariants] = useState(false)
  const [copyHistory, setCopyHistory] = useState<any[]>([])
  
  // Template selection
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [activeTemplate, setActiveTemplate] = useState<string | null>('destination-package') // Template de turismo por padrão
  const [showHtmlCode, setShowHtmlCode] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showAiAssistant, setShowAiAssistant] = useState(false) // Controle do accordion
  const [showPackageDetails, setShowPackageDetails] = useState(false) // Controle do accordion de Detalhes
  
  // Estados para imagens do template
  const [heroImage, setHeroImage] = useState<string>('')
  const [teamImage1, setTeamImage1] = useState<string>('')
  const [teamImage2, setTeamImage2] = useState<string>('')
  const [teamImage3, setTeamImage3] = useState<string>('')
  const [teamImage4, setTeamImage4] = useState<string>('')
  const [locationImage, setLocationImage] = useState<string>('')
  const [logoImage, setLogoImage] = useState<string>('')
  const [showImageGallery, setShowImageGallery] = useState(false)

  // Aplicar template padrão ao carregar a página
  useEffect(() => {
    // Se não houver conteúdo HTML, aplicar template padrão de turismo
    if (!htmlContent && !editingCampaign && activeTemplate) {
      console.log('🎬 Inicializando com template padrão:', activeTemplate)
      const defaultTemplate = EMAIL_TEMPLATES.find(t => t.id === activeTemplate)
      if (defaultTemplate) {
        const generated = defaultTemplate.generate({
          companyName: companyName || 'Sua Agência de Turismo',
          destination: 'Destino dos Sonhos',
          productName: '',
          mainTitle: 'Descubra o Paraíso',
          description: 'Uma experiência inesquecível te espera',
          ctaLink: '#',
          ctaText: 'Ver Pacote Completo',
          keyBenefits: ['Guias especializados', 'Hospedagem premium', 'Translados inclusos'],
          priceInfo: 'A partir de R$ 2.999',
          dateRange: 'Saídas diárias'
        })
        
        setSubject(generated.subject)
        setPreheader(generated.preheader)
        setHtmlContent(generated.html)
        
        // Atualizar editor visual - com retry limitado
        let attempts = 0
        const maxAttempts = 10
        
        const updatePreview = () => {
          const editor = document.getElementById('visual-editor')
          if (editor) {
            const renderedHtml = DOMPurify.sanitize(
              renderTemplate(
                generated.html,
                generated.subject,
                generated.preheader
              )
            )
            editor.innerHTML = renderedHtml
            console.log('✅ Preview inicial carregado, tamanho:', renderedHtml.length)
          } else if (attempts < maxAttempts) {
            attempts++
            setTimeout(updatePreview, 50)
          } else {
            console.warn('⚠️ Editor não encontrado após', maxAttempts, 'tentativas')
          }
        }
        
        requestAnimationFrame(updatePreview)
      }
    }
  }, [activeTemplate])

  // Auto-update template when form fields change (real-time sync)
  useEffect(() => {
    if (!activeTemplate) return
    
    const template = EMAIL_TEMPLATES.find(t => t.id === activeTemplate)
    if (!template) return

    console.log('🔄 Atualizando template:', activeTemplate)

    const generated = template.generate({
      companyName: companyName || 'Sua Agência',
      destination: destination || 'Destino Incrível',
      productName: productName || '',
      mainTitle: mainTitle || `Descubra ${destination || 'Novos Horizontes'}`,
      description: description || 'Uma experiência única te espera',
      ctaLink: ctaLink || '#',
      ctaText: 'Ver Mais',
      keyBenefits: keyBenefits.length > 0 ? keyBenefits : undefined,
      priceInfo: 'Condições especiais',
      dateRange: 'Saídas flexíveis',
      // Passar imagens (templates já têm defaults do Unsplash)
      heroImage: heroImage,
      teamImage1: teamImage1,
      teamImage2: teamImage2,
      teamImage3: teamImage3,
      teamImage4: teamImage4,
      locationImage: locationImage,
      logoImage: logoImage
    })

    setSubject(generated.subject)
    setPreheader(generated.preheader)
    setHtmlContent(generated.html)
    
    // Atualizar editor visual quando template muda
    requestAnimationFrame(() => {
      const editor = document.getElementById('visual-editor')
      console.log('📝 Editor encontrado:', !!editor)
      if (editor) {
        const renderedHtml = DOMPurify.sanitize(
          renderTemplate(
            generated.html,
            generated.subject,
            generated.preheader
          ).replace(/\{\{name\}\}/g, '<span class="bg-yellow-100 px-2 py-1 rounded font-semibold">João Silva</span>')
          .replace(/\{companyName\}/g, companyName || 'Sua Empresa')
          .replace(/\{destination\}/g, destination || 'Destino')
          .replace(/\{productName\}/g, productName || 'Produto')
          .replace(/\{mainTitle\}/g, mainTitle || 'Título')
        )
        editor.innerHTML = renderedHtml
        console.log('✅ Preview atualizado! Tamanho:', renderedHtml.length)
      }
    })
  }, [activeTemplate, companyName, destination, productName, mainTitle, description, ctaLink, keyBenefits, heroImage, teamImage1, teamImage2, teamImage3, teamImage4, locationImage, logoImage])

  // Preview automático removido - agora só mostra ao selecionar template manualmente

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
  
  // Helper para filtrar contatos no modal
  const getFilteredContacts = () => {
    let filtered = [...contacts]
    
    // Search filter
    if (contactSearchTerm) {
      filtered = filtered.filter(c => 
        c.name?.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(contactSearchTerm.toLowerCase())
      )
    }
    
    // Temperature filter
    if (contactFilterTemp !== 'all') {
      filtered = filtered.filter(c => c.metadata?.temperature === contactFilterTemp)
    }
    
    // Budget filter
    if (contactFilterBudget !== 'all') {
      filtered = filtered.filter(c => c.metadata?.budgetRange === contactFilterBudget)
    }
    
    // Style filter
    if (contactFilterStyle !== 'all') {
      filtered = filtered.filter(c => c.metadata?.travelStyle === contactFilterStyle)
    }
    
    return filtered
  }

  // Campaigns listener: filter by tenantId for complete isolation
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

    if (!user || !selectedTenant) return
    setLoading(true)
    try {
      const cRef = collection(db, 'campaigns')
      // ISOLAMENTO: Filtrar por tenantId para isolar dados entre usuários
      const q = query(cRef, where('tenantId', '==', selectedTenant), orderBy('createdAt', 'desc'), limit(50))
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
  }, [user, selectedTenant])

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

  // Load tenant settings in real-time (auto-populate company name, etc)
  useEffect(() => {
    if (!selectedTenant) return
    
    try {
      const settingsRef = doc(db, 'tenants', selectedTenant, 'settings', 'secrets')
      const unsubSettings = onSnapshot(settingsRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data()
          // Auto-populate company name from tenant if not set by user
          if (!companyName && data.companyName) {
            setCompanyName(data.companyName)
          }
        }
      }, (err) => console.error('tenant settings snapshot error', err))
      
      return () => unsubSettings()
    } catch (e) {
      console.error('tenant settings listener error', e)
    }
  }, [selectedTenant])

  // Carregar imagens da galeria automaticamente quando o tenant for selecionado
  useEffect(() => {
    if (!selectedTenant) return
    
    const loadGalleryImages = async () => {
      try {
        const images = await getClientImageGallery(selectedTenant)
        if (images.length === 0) return
        
        // Carregar automaticamente as imagens mais recentes de cada categoria
        const heroImg = images.find(img => img.category === 'hero')
        const logoImg = images.find(img => img.category === 'general' || img.url.includes('logo'))
        const locationImg = images.find(img => img.category === 'location')
        const teamImages = images.filter(img => img.category === 'team')
        
        // Só define se o estado ainda estiver vazio (não sobrescrever seleção do usuário)
        if (heroImg && !heroImage) setHeroImage(heroImg.url)
        if (logoImg && !logoImage) setLogoImage(logoImg.url)
        if (locationImg && !locationImage) setLocationImage(locationImg.url)
        if (teamImages.length > 0 && !teamImage1) setTeamImage1(teamImages[0]?.url || '')
        if (teamImages.length > 1 && !teamImage2) setTeamImage2(teamImages[1]?.url || '')
        if (teamImages.length > 2 && !teamImage3) setTeamImage3(teamImages[2]?.url || '')
        if (teamImages.length > 3 && !teamImage4) setTeamImage4(teamImages[3]?.url || '')
        
        console.log('✅ Imagens da galeria carregadas automaticamente')
      } catch (error) {
        console.error('❌ Erro ao carregar imagens da galeria:', error)
      }
    }
    
    loadGalleryImages()
  }, [selectedTenant])


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
          const ct = resp.headers.get('content-type') || ''
          const text = await resp.text()
          let data: any = null
          if (ct.includes('application/json')) {
            try { data = JSON.parse(text) } catch(e) { data = null }
          }
          if (!resp.ok) {
            // prefer structured error when available
            throw new Error(JSON.stringify(data || { message: text }))
          }
          setResult('Campanha atualizada')
        } else {
        const resp = await fetch('/api/create-campaign', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
        const ct = resp.headers.get('content-type') || ''
        const text = await resp.text()
        let data: any = null
        if (ct.includes('application/json')) {
          try { data = JSON.parse(text) } catch(e) { data = null }
        }
        if (!resp.ok) {
          throw new Error(JSON.stringify(data || { message: text }))
        }
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
            </div>

            <div className="space-y-6">
              {/* CAMPOS ESSENCIAIS DO TEMPLATE */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border-2 border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 flex items-center mb-1">
                      📝 Informações do Pacote
                    </h3>
                    <p className="text-xs text-slate-600">Configure os detalhes principais do seu pacote de viagem</p>
                  </div>
                  {activeTemplate && (
                    <span className="text-xs text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full flex items-center whitespace-nowrap ml-4">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse" />
                      {EMAIL_TEMPLATES.find(t => t.id === activeTemplate)?.name}
                    </span>
                  )}
                </div>

                {/* SEÇÃO 1: EMAIL METADATA (Assunto + Preheader) */}
                <div className="mb-6 pb-6 border-b border-slate-300">
                  <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">📧 Metadados do Email</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Assunto *</label>
                      <input 
                        value={subject} 
                        onChange={e => setSubject(e.target.value)} 
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                        placeholder="✈️ Descubra Novos Horizontes - Oferta Exclusiva"
                      />
                      <p className="text-xs text-slate-500 mt-1">O que seu cliente verá na caixa de entrada</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Preheader</label>
                      <input 
                        value={preheader} 
                        onChange={e => setPreheader(e.target.value)} 
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                        placeholder="Uma experiência única | Saídas flexíveis | Condições especiais"
                      />
                      <p className="text-xs text-slate-500 mt-1">Resumo exibido junto ao assunto</p>
                    </div>
                  </div>
                </div>

                {/* SEÇÃO 2: INFORMAÇÕES OBRIGATÓRIAS */}
                <div className="mb-6 pb-6 border-b border-slate-300">
                  <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">⭐ Informações Obrigatórias</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-2 flex items-center">
                        🏢 Empresa
                        <span className="text-red-500 ml-1">*</span>
                        {activeTemplate && (
                          <span className="ml-2 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full flex items-center flex-shrink-0">
                            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-1" />
                            conectado
                          </span>
                        )}
                      </label>
                      <input 
                        value={companyName} 
                        onChange={e => setCompanyName(e.target.value)}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 transition-all text-sm ${
                          activeTemplate 
                            ? 'border-purple-300 focus:ring-purple-500 focus:border-purple-500' 
                            : 'border-slate-300 focus:ring-blue-500'
                        }`}
                        placeholder="Sua Agência de Turismo Premium"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-2 flex items-center">
                        ✈️ Destino da Viagem
                        <span className="text-red-500 ml-1">*</span>
                        {activeTemplate && (
                          <span className="ml-2 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full flex items-center flex-shrink-0">
                            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-1" />
                            conectado
                          </span>
                        )}
                      </label>
                      <input 
                        value={destination} 
                        onChange={e=>setDestination(e.target.value)} 
                        placeholder="Fernando de Noronha, Europa, Caribe..." 
                        className={`w-full px-4 py-3 border rounded-xl transition-all focus:ring-2 text-sm ${
                          activeTemplate 
                            ? 'border-purple-300 focus:ring-purple-500 focus:border-purple-500' 
                            : 'border-slate-300 focus:ring-blue-500'
                        }`} 
                      />
                    </div>
                  </div>
                </div>

                {/* SEÇÃO 3: DETALHES DO PACOTE */}
                <div className="mb-6 pb-6 border-b border-slate-300">
                  <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">📦 Detalhes do Pacote</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                        🎫 Pacote/Experiência
                        {activeTemplate && (
                          <span className="ml-2 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full flex items-center">
                            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-1" />
                            conectado
                          </span>
                        )}
                      </label>
                      <input 
                        value={productName} 
                        onChange={e => setProductName(e.target.value)}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 transition-all text-sm ${
                          activeTemplate 
                            ? 'border-purple-300 focus:ring-purple-500 focus:border-purple-500' 
                            : 'border-slate-300 focus:ring-blue-500'
                        }`}
                        placeholder="Pacote Nordeste Completo, City Tour SP"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-2 flex items-center">
                        🎯 Título da Oferta
                        <span className="text-red-500 ml-1">*</span>
                        {activeTemplate && (
                          <span className="ml-2 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full flex items-center">
                            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-1" />
                            conectado
                          </span>
                        )}
                      </label>
                      <input 
                        value={mainTitle} 
                        onChange={e=>setMainTitle(e.target.value)} 
                        placeholder="Descubra o Paraíso do Nordeste" 
                        className={`w-full px-4 py-3 border rounded-xl transition-all focus:ring-2 text-sm ${
                          activeTemplate 
                            ? 'border-purple-300 focus:ring-purple-500 focus:border-purple-500' 
                            : 'border-slate-300 focus:ring-blue-500'
                        }`} 
                      />
                    </div>
                  </div>
                </div>

                {/* SEÇÃO 4: AÇÃO E DESCRIÇÃO */}
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">🔗 Link e Descrição</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-800 mb-2 flex items-center">
                        🌐 Link da Reserva/Mais Info
                        <span className="text-red-500 ml-1">*</span>
                        {activeTemplate && (
                          <span className="ml-2 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full flex items-center">
                            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-1" />
                            conectado
                          </span>
                        )}
                      </label>
                      <input 
                        value={ctaLink} 
                        onChange={e=>setCtaLink(e.target.value)} 
                        placeholder="https://sua-agencia.com/pacotes/fernando-noronha" 
                        className={`w-full px-4 py-3 border rounded-xl transition-all focus:ring-2 text-sm ${
                          activeTemplate 
                            ? 'border-purple-300 focus:ring-purple-500 focus:border-purple-500' 
                            : 'border-slate-300 focus:ring-blue-500'
                        }`} 
                      />
                    </div>
                  </div>
                </div>

                {/* ACCORDION - Mais Detalhes */}
                <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
                  <button
                    onClick={() => setShowPackageDetails(!showPackageDetails)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-slate-700">📋 Descrição do Pacote (Detalhes)</span>
                      {activeTemplate && (
                        <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full flex items-center">
                          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-1" />
                          conectado
                        </span>
                      )}
                    </div>
                    <svg 
                      className={`w-5 h-5 text-slate-600 transition-transform ${
                        showPackageDetails ? 'rotate-180' : ''
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showPackageDetails && (
                    <div className="px-4 pb-4 border-t-2 border-slate-200">
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-slate-600 mb-2">
                          Descreva os principais detalhes do pacote
                        </label>
                        <input 
                          value={description} 
                          onChange={e => setDescription(e.target.value)} 
                          placeholder="Ex: 5 dias e 4 noites, café da manhã incluído, transfer aeroporto..." 
                          className={`w-full px-4 py-3 border rounded-xl transition-all focus:ring-2 text-sm ${
                            activeTemplate 
                              ? 'border-purple-300 focus:ring-purple-500 focus:border-purple-500' 
                              : 'border-slate-300 focus:ring-blue-500'
                          }`} 
                        />
                        <p className="text-xs text-slate-500 mt-2">Informações adicionais que vão enriquecer o email</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* ACCORDION - GALERIA DE IMAGENS */}
                <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden mt-4">
                  <button
                    onClick={() => setShowImageGallery(!showImageGallery)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-slate-700">🖼️ Imagens do Pacote (Galeria Cloudinary)</span>
                      <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1" />
                        Opcional
                      </span>
                    </div>
                    <svg 
                      className={`w-5 h-5 text-slate-600 transition-transform ${
                        showImageGallery ? 'rotate-180' : ''
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showImageGallery && selectedTenant && (
                    <div className="px-4 pb-4 border-t-2 border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 space-y-4">
                      <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <ImageGallerySelector
                          clientId={selectedTenant}
                          category="hero"
                          selectedImageUrl={heroImage}
                          onImageSelect={setHeroImage}
                          label="🌄 Banner Principal (Hero)"
                          allowUpload={true}
                        />
                        <ImageGallerySelector
                          clientId={selectedTenant}
                          category="general"
                          selectedImageUrl={logoImage}
                          onImageSelect={setLogoImage}
                          label="🏢 Logo da Empresa"
                          allowUpload={true}
                        />
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <ImageGallerySelector
                          clientId={selectedTenant}
                          category="team"
                          selectedImageUrl={teamImage1}
                          onImageSelect={setTeamImage1}
                          label="📸 Foto do Destino 1"
                          allowUpload={true}
                        />
                        <ImageGallerySelector
                          clientId={selectedTenant}
                          category="team"
                          selectedImageUrl={teamImage2}
                          onImageSelect={setTeamImage2}
                          label="📸 Foto do Destino 2"
                          allowUpload={true}
                        />
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <ImageGallerySelector
                          clientId={selectedTenant}
                          category="team"
                          selectedImageUrl={teamImage3}
                          onImageSelect={setTeamImage3}
                          label="📸 Foto do Destino 3"
                          allowUpload={true}
                        />
                        <ImageGallerySelector
                          clientId={selectedTenant}
                          category="team"
                          selectedImageUrl={teamImage4}
                          onImageSelect={setTeamImage4}
                          label="📸 Foto do Destino 4"
                          allowUpload={true}
                        />
                      </div>
                      <ImageGallerySelector
                        clientId={selectedTenant}
                        category="location"
                        selectedImageUrl={locationImage}
                        onImageSelect={setLocationImage}
                        label="📍 Imagem de Localização (Mapa/Acesso)"
                        allowUpload={true}
                      />
                      <p className="text-xs text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200">
                        💡 Dica: Suas imagens são armazenadas no Cloudinary e salvas em uma galeria individual do cliente para reutilização em futuras campanhas!
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex gap-2">
                  <button
                    onClick={() => setShowTemplateSelector(true)}
                    className="flex-1 py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium flex items-center justify-center space-x-2 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                    <span>📧 Escolher Outro Template</span>
                  </button>
                </div>
              </div>

              {/* ACCORDION - ASSISTENTE DE IA */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 overflow-hidden">
                <button
                  onClick={() => setShowAiAssistant(!showAiAssistant)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-blue-100/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-slate-900">🚀 Assistente de IA para Gerar Copy</h3>
                      <p className="text-sm text-slate-600">Processamento local - 100% privado e seguro</p>
                    </div>
                  </div>
                  <svg 
                    className={`w-6 h-6 text-slate-600 transition-transform ${showAiAssistant ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showAiAssistant && (
                  <div className="px-6 pb-6 space-y-4 border-t-2 border-blue-200 pt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* Coluna 1 */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Perfil do Viajante</label>
                          <input 
                            value={audience} 
                            onChange={e => setAudience(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Ex: casais em lua de mel, famílias..."
                          />
                        </div>
                      </div>

                      {/* Coluna 2 */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tom</label>
                            <select 
                              value={tone} 
                              onChange={e => setTone(e.target.value as any)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
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
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
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
                      </div>

                      {/* Coluna 3 */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Diferenciais do Pacote</label>
                          <div className="flex space-x-2">
                            <input
                              value={benefitInput}
                              onChange={e => setBenefitInput(e.target.value)}
                              onKeyPress={e => {
                                if (e.key === 'Enter' && benefitInput.trim()) {
                                  setKeyBenefits(prev => [...prev, benefitInput.trim()])
                                  setBenefitInput('')
                                }
                              }}
                              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                              placeholder="Ex: Guia em português..."
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (benefitInput.trim()) {
                                  setKeyBenefits(prev => [...prev, benefitInput.trim()])
                                  setBenefitInput('')
                                }
                              }}
                              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                            >
                              +
                            </button>
                          </div>
                          
                          {keyBenefits.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {keyBenefits.map((benefit, index) => (
                                <span key={index} className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                  {benefit}
                                  <button
                                    type="button"
                                    onClick={() => setKeyBenefits(prev => prev.filter((_, i) => i !== index))}
                                    className="ml-1 text-blue-600 hover:text-blue-800 font-bold"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botões de Ação IA */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        type="button"
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
                            setCopyHistory(prev => [copy, ...prev.slice(0, 9)])
                            
                            setResult(`✅ Copy gerada (Score: ${copy.score}/100)`)
                          } catch (error) {
                            setResult('❌ Erro ao gerar copy')
                          }
                          setGenerating(false)
                        }}
                        disabled={generating}
                        className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                          generating 
                            ? 'bg-gray-400 cursor-not-allowed text-white' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                        }`}
                      >
                        {generating ? '🔄 Gerando...' : '✨ Gerar Copy com IA'}
                      </button>

                      <button
                        type="button"
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
                        className={`py-3 px-4 rounded-lg font-medium transition-colors ${
                          generatingVariants
                            ? 'bg-gray-400 cursor-not-allowed text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
                        }`}
                      >
                        {generatingVariants ? '🔄 Gerando...' : '🎨 5 Variações'}
                      </button>
                    </div>

                    <button
                      type="button"
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
                )}
              </div>            {/* Content Editor */}
              <div className="grid grid-cols-1 gap-6">
                {/* Preview em Tamanho Real */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border-2 border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-lg font-semibold text-slate-900">📧 Preview do Email</label>
                    <div className="flex items-center space-x-2">
                      {/* Toolbar de Formatação Visual */}
                      <div className="flex items-center space-x-1 bg-white border-2 border-slate-300 rounded-lg px-2 py-1">
                        <button
                          type="button"
                          onClick={() => document.execCommand('bold', false)}
                          className="px-2 py-1 hover:bg-slate-100 rounded font-bold text-sm"
                          title="Negrito (Ctrl+B)"
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={() => document.execCommand('italic', false)}
                          className="px-2 py-1 hover:bg-slate-100 rounded italic text-sm"
                          title="Itálico (Ctrl+I)"
                        >
                          I
                        </button>
                        <button
                          type="button"
                          onClick={() => document.execCommand('underline', false)}
                          className="px-2 py-1 hover:bg-slate-100 rounded underline text-sm"
                          title="Sublinhado (Ctrl+U)"
                        >
                          U
                        </button>
                        <div className="w-px h-6 bg-slate-300"></div>
                        <button
                          type="button"
                          onClick={() => {
                            const url = prompt('Digite o link:')
                            if (url) document.execCommand('createLink', false, url)
                          }}
                          className="px-2 py-1 hover:bg-slate-100 rounded text-sm"
                          title="Inserir link"
                        >
                          🔗
                        </button>
                        <button
                          type="button"
                          onClick={() => document.execCommand('fontSize', false, '5')}
                          className="px-2 py-1 hover:bg-slate-100 rounded text-sm font-semibold"
                          title="Título grande"
                        >
                          H1
                        </button>
                        <button
                          type="button"
                          onClick={() => document.execCommand('fontSize', false, '4')}
                          className="px-2 py-1 hover:bg-slate-100 rounded text-sm"
                          title="Título médio"
                        >
                          H2
                        </button>
                        <div className="w-px h-6 bg-slate-300"></div>
                        <button
                          type="button"
                          onClick={() => document.execCommand('justifyLeft', false)}
                          className="px-2 py-1 hover:bg-slate-100 rounded text-sm"
                          title="Alinhar à esquerda"
                        >
                          ⬅️
                        </button>
                        <button
                          type="button"
                          onClick={() => document.execCommand('justifyCenter', false)}
                          className="px-2 py-1 hover:bg-slate-100 rounded text-sm"
                          title="Centralizar"
                        >
                          ⬆️
                        </button>
                        <button
                          type="button"
                          onClick={() => document.execCommand('justifyRight', false)}
                          className="px-2 py-1 hover:bg-slate-100 rounded text-sm"
                          title="Alinhar à direita"
                        >
                          ➡️
                        </button>
                        <div className="w-px h-6 bg-slate-300"></div>
                        <button
                          type="button"
                          onClick={() => {
                            const color = prompt('Cor (ex: #FF5733):')
                            if (color) document.execCommand('foreColor', false, color)
                          }}
                          className="px-2 py-1 hover:bg-slate-100 rounded text-sm"
                          title="Cor do texto"
                        >
                          🎨
                        </button>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => setShowHtmlCode(!showHtmlCode)}
                        className="px-4 py-2 bg-white border-2 border-slate-300 text-slate-700 hover:border-indigo-300 rounded-lg font-medium transition-colors flex items-center space-x-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        <span>{showHtmlCode ? 'Esconder Código' : 'Ver HTML'}</span>
                      </button>
                    </div>
                  </div>
                  </div>
                  
                  {/* Preview Real - Editor Visual */}
                  <div className="bg-white rounded-xl shadow-lg border-2 border-slate-300 overflow-hidden mb-4">
                    <div className="bg-slate-800 px-4 py-2 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                        <div className="text-sm text-slate-300 font-mono">Preview - Email Marketing</div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {/* Toggle Desktop/Mobile */}
                        <div className="flex items-center bg-slate-700 rounded-lg p-1">
                          <button
                            type="button"
                            onClick={() => setMobilePreview(false)}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              !mobilePreview ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            🖥️ Desktop
                          </button>
                          <button
                            type="button"
                            onClick={() => setMobilePreview(true)}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              mobilePreview ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            📱 Mobile
                          </button>
                        </div>
                        <span className="text-xs text-green-400 flex items-center">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                          Clique para editar
                        </span>
                      </div>
                    </div>
                    {/* Preview Real - Editor Visual com Overlays Clicáveis */}
                    <div className="w-full bg-slate-100 overflow-y-auto flex justify-center p-4" style={{height: 'calc(100vh - 250px)', minHeight: '600px'}}>
                      <div className={`bg-white transition-all duration-300 h-fit ${
                        mobilePreview ? 'w-full max-w-[375px] shadow-2xl mx-auto' : 'w-full max-w-[800px]'
                      }`}>
                      <style>{`
                        /* CSS para ajustar emails no preview mobile */
                        ${mobilePreview ? `
                          .mobile-preview table {
                            width: 100% !important;
                            max-width: 100% !important;
                          }
                          .mobile-preview table table {
                            width: 100% !important;
                          }
                          .mobile-preview img {
                            max-width: 100% !important;
                            height: auto !important;
                          }
                          .mobile-preview td {
                            display: block !important;
                            width: 100% !important;
                          }
                          .mobile-preview td[width] {
                            width: 100% !important;
                          }
                          .mobile-preview h1 {
                            font-size: 28px !important;
                          }
                          .mobile-preview h2 {
                            font-size: 22px !important;
                          }
                          .mobile-preview h3 {
                            font-size: 18px !important;
                          }
                          .mobile-preview p {
                            font-size: 14px !important;
                          }
                        ` : ''}
                      `}</style>
                      <div className={mobilePreview ? 'mobile-preview' : ''}>
                      {showPreview && selectedTenant && (
                        <ImageEditablePreview
                          key={`${activeTemplate}-${heroImage}-${logoImage}-${teamImage1}-${teamImage2}-${teamImage3}-${teamImage4}-${locationImage}`}
                          clientId={selectedTenant}
                          previewHtml={htmlContent}
                          onHtmlChange={(newHtml) => {
                            setHtmlContent(newHtml)
                          }}
                          imageConfigs={[
                            {
                              type: 'hero',
                              imageUrl: heroImage,
                              onImageSelect: setHeroImage,
                              label: '🌄 Imagem Principal (Hero)',
                              category: 'hero'
                            },
                            {
                              type: 'logo',
                              imageUrl: logoImage,
                              onImageSelect: setLogoImage,
                              label: '🏢 Logo da Empresa',
                              category: 'general'
                            },
                            {
                              type: 'team1',
                              imageUrl: teamImage1,
                              onImageSelect: setTeamImage1,
                              label: '🏨 Hospedagem (Imagem 1)',
                              category: 'team'
                            },
                            {
                              type: 'team2',
                              imageUrl: teamImage2,
                              onImageSelect: setTeamImage2,
                              label: '🍽️ Refeições (Imagem 2)',
                              category: 'team'
                            },
                            {
                              type: 'team3',
                              imageUrl: teamImage3,
                              onImageSelect: setTeamImage3,
                              label: '👨‍🏫 Guias (Imagem 3)',
                              category: 'team'
                            },
                            {
                              type: 'team4',
                              imageUrl: teamImage4,
                              onImageSelect: setTeamImage4,
                              label: '🚌 Transporte (Imagem 4)',
                              category: 'team'
                            },
                            {
                              type: 'location',
                              imageUrl: locationImage,
                              onImageSelect: setLocationImage,
                              label: '📍 Imagem de Localização',
                              category: 'location'
                            }
                          ]}
                        />
                      )}
                      </div>
                      {!showPreview && (
                        <div 
                          id="visual-editor"
                          contentEditable={true}
                          suppressContentEditableWarning={true}
                          onInput={(e) => {
                            // Atualizar HTML em tempo real enquanto edita
                            const newHtml = e.currentTarget.innerHTML
                            setHtmlContent(newHtml)
                          }}
                          onBlur={(e) => {
                            const newHtml = e.currentTarget.innerHTML
                            setHtmlContent(newHtml)
                            console.log('📝 Conteúdo editado salvo')
                          }}
                          className="p-6 outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-inset min-h-[400px] cursor-text"
                          style={{
                            transition: 'all 0.2s ease',
                          }}
                        />
                      )}
                      </div>
                    </div>
                  </div>

                {/* Editor HTML Colapsável */}
                {showHtmlCode && (
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border-2 border-slate-200">
                    <label className="text-lg font-semibold text-slate-900 mb-4 block">✏️ Editor HTML Avançado</label>
                    
                    {/* Rich Text Toolbar */}
                    <div className="flex flex-wrap gap-2 mb-3 p-3 bg-white rounded-lg border border-slate-200">
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
                      className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold hover:bg-slate-100 transition-colors"
                      title="Negrito"
                    >
                      <strong>B</strong>
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
                      className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg italic hover:bg-slate-100 transition-colors"
                      title="Itálico"
                    >
                      <em>I</em>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        const ta = document.getElementById('campaign-html') as HTMLTextAreaElement | null
                        if (!ta) return
                        const start = ta.selectionStart, end = ta.selectionEnd
                        const before = ta.value.slice(0, start), sel = ta.value.slice(start, end), after = ta.value.slice(end)
                        ta.value = before + '<h2>' + sel + '</h2>' + after
                        setHtmlContent(ta.value)
                      }} 
                      className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors font-semibold"
                      title="Título"
                    >
                      H2
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        const ta = document.getElementById('campaign-html') as HTMLTextAreaElement | null
                        if (!ta) return
                        const start = ta.selectionStart, end = ta.selectionEnd
                        const before = ta.value.slice(0, start), sel = ta.value.slice(start, end), after = ta.value.slice(end)
                        ta.value = before + '<a href="' + (ctaLink || '#') + '">' + sel + '</a>' + after
                        setHtmlContent(ta.value)
                      }} 
                      className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Link"
                    >
                      🔗 Link
                    </button>
                    <div className="w-px h-8 bg-slate-300 mx-1"></div>
                    <button 
                      type="button" 
                      onClick={() => setHtmlContent((h) => h + '<p>Olá {{name}},</p>\n')} 
                      className="px-3 py-2 bg-blue-50 border border-blue-300 text-blue-700 rounded-lg text-sm hover:bg-blue-100 transition-colors"
                      title="Saudação personalizada"
                    >
                      👤 {'{{name}}'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setHtmlContent((h) => h + `<p><a href="${ctaLink || '#'}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Ver Mais</a></p>\n`)} 
                      className="px-3 py-2 bg-purple-50 border border-purple-300 text-purple-700 rounded-lg text-sm hover:bg-purple-100 transition-colors"
                      title="Botão CTA"
                    >
                      🔘 Botão CTA
                    </button>
                    <div className="w-px h-8 bg-slate-300 mx-1"></div>
                    
                    {/* Upload de Imagem */}
                    <label 
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer flex items-center space-x-2 ${
                        uploadingImage 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-green-50 border border-green-300 text-green-700 hover:bg-green-100'
                      }`}
                      title="Upload de imagem"
                    >
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingImage}
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          
                          setUploadingImage(true)
                          setResult('📤 Fazendo upload da imagem...')
                          
                          try {
                            const data = await uploadImage(file)
                            const imageUrl = data.secure_url
                            
                            // Inserir imagem no HTML
                            setHtmlContent((h) => h + `\n<p style="text-align: center;"><img src="${imageUrl}" alt="Imagem" style="max-width: 100%; height: auto; border-radius: 8px;" /></p>\n`)
                            setResult('✅ Imagem inserida com sucesso!')
                          } catch (error) {
                            console.error('Upload error:', error)
                            setResult('❌ Erro ao fazer upload da imagem')
                          } finally {
                            setUploadingImage(false)
                            e.target.value = '' // Reset input
                          }
                        }}
                      />
                      {uploadingImage ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full"></div>
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>🖼️ Imagem</span>
                        </>
                      )}
                    </label>

                    {/* Botões de Imagem Pré-definidos */}
                    <button 
                      type="button" 
                      onClick={() => {
                        setHtmlContent((h) => h + `\n<!-- Banner de Topo -->\n<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">\n  <tr>\n    <td>\n      <h1 style="color: white; font-size: 32px; margin: 0;">${mainTitle || 'Título da Oferta'}</h1>\n      <p style="color: white; font-size: 18px; margin: 10px 0 0 0;">Clique para adicionar sua imagem de banner aqui</p>\n    </td>\n  </tr>\n</table>\n`)
                      }} 
                      className="px-3 py-2 bg-indigo-50 border border-indigo-300 text-indigo-700 rounded-lg text-sm hover:bg-indigo-100 transition-colors"
                      title="Inserir seção de banner"
                    >
                      🎨 Banner
                    </button>
                    </div>

                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">Código HTML</span>
                      <span className="text-xs text-slate-500">{htmlContent.length} caracteres</span>
                    </div>
                    <textarea 
                      id="campaign-html" 
                      value={htmlContent} 
                      onChange={e => setHtmlContent(e.target.value)} 
                      className="w-full h-96 px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none font-mono text-sm bg-white"
                      placeholder="<p>Digite o conteúdo HTML do email...</p>"
                    />
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

                  <div>
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

        {/* MODAIS - Renderizados fora do formulário para cobrir toda a página */}
        
        {/* Contacts Selection Modal - MODAL PROFISSIONAL */}
        {showContactsModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-2xl font-bold text-slate-900">👥 Selecionar Contatos</h3>
                  <button 
                    onClick={() => setShowContactsModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Stats */}
                <div className="flex items-center space-x-4 text-sm">
                  <div className="px-3 py-1 bg-slate-100 rounded-lg">
                    <span className="text-slate-600">Total: </span>
                    <span className="font-bold text-slate-900">{contacts.length}</span>
                  </div>
                  <div className="px-3 py-1 bg-indigo-100 rounded-lg">
                    <span className="text-indigo-600">Selecionados: </span>
                    <span className="font-bold text-indigo-900">{Object.values(selectedContactIds).filter(Boolean).length}</span>
                  </div>
                </div>
              </div>

              {/* Filtros e Busca */}
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <input
                    type="search"
                    value={contactSearchTerm}
                    onChange={(e) => setContactSearchTerm(e.target.value)}
                    placeholder="🔍 Buscar por nome ou email..."
                    className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                  
                  <select
                    value={contactFilterTemp}
                    onChange={(e) => setContactFilterTemp(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    <option value="all">Todas Temperaturas</option>
                    <option value="hot">🔥 Quentes</option>
                    <option value="warm">☀️ Mornos</option>
                    <option value="cold">❄️ Frios</option>
                    <option value="cliente">⭐ Clientes</option>
                  </select>
                  
                  <select
                    value={contactFilterBudget}
                    onChange={(e) => setContactFilterBudget(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    <option value="all">Todos os Orçamentos</option>
                    <option value="até 2k">Até R$ 2.000</option>
                    <option value="2k-5k">R$ 2.000 - R$ 5.000</option>
                    <option value="5k-10k">R$ 5.000 - R$ 10.000</option>
                    <option value="10k-20k">R$ 10.000 - R$ 20.000</option>
                    <option value="20k+">Acima de R$ 20.000</option>
                  </select>
                  
                  <select
                    value={contactFilterStyle}
                    onChange={(e) => setContactFilterStyle(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                  >
                    <option value="all">Todos os Estilos</option>
                    <option value="luxo">🌟 Luxo</option>
                    <option value="econômico">💰 Econômico</option>
                    <option value="aventura">🏔️ Aventura</option>
                    <option value="cultural">🏛️ Cultural</option>
                    <option value="praia">🏖️ Praia</option>
                    <option value="montanha">⛰️ Montanha</option>
                  </select>
                </div>
                
                {/* Ações Rápidas */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const filtered = getFilteredContacts()
                      const newSelection: Record<string, boolean> = {}
                      filtered.forEach(c => { newSelection[c.id] = true })
                      setSelectedContactIds(newSelection)
                    }}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
                  >
                    ✓ Selecionar Todos ({getFilteredContacts().length})
                  </button>
                  
                  <button
                    onClick={() => setSelectedContactIds({})}
                    className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-sm hover:bg-slate-300 transition-colors"
                  >
                    ✗ Limpar Seleção
                  </button>
                  
                  <button
                    onClick={() => {
                      const filtered = getFilteredContacts()
                      const newSelection: Record<string, boolean> = {}
                      filtered.forEach(c => { newSelection[c.id] = !selectedContactIds[c.id] })
                      setSelectedContactIds(newSelection)
                    }}
                    className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-sm hover:bg-slate-300 transition-colors"
                  >
                    ⇄ Inverter Seleção
                  </button>
                </div>
              </div>

              {/* Lista de Contatos */}
              <div className="flex-1 overflow-auto px-6 py-4">
                {(() => {
                  const filtered = getFilteredContacts()
                  
                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <div className="text-6xl mb-4">📭</div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">Nenhum contato encontrado</h3>
                        <p className="text-slate-600">
                          {contacts.length === 0 
                            ? 'Você ainda não tem contatos cadastrados' 
                            : 'Tente ajustar os filtros de busca'}
                        </p>
                      </div>
                    )
                  }
                  
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filtered.map(c => {
                        const score = c.metadata?.leadScore || 0
                        const temp = c.metadata?.temperature || 'cold'
                        const tempIcons = { hot: '🔥', warm: '☀️', cold: '❄️', cliente: '⭐' }
                        const tempColors = {
                          hot: 'bg-red-50 border-red-200 text-red-700',
                          warm: 'bg-orange-50 border-orange-200 text-orange-700',
                          cold: 'bg-blue-50 border-blue-200 text-blue-700',
                          cliente: 'bg-green-50 border-green-200 text-green-700'
                        }
                        
                        return (
                          <label
                            key={c.id}
                            className={`flex items-start space-x-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                              selectedContactIds[c.id]
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={!!selectedContactIds[c.id]}
                              onChange={(e) => setSelectedContactIds(prev => ({ ...prev, [c.id]: e.target.checked }))}
                              className="mt-1 w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <div className="font-semibold text-slate-900 truncate">
                                  {c.name || c.email?.split('@')[0] || 'Sem nome'}
                                </div>
                                <div className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${tempColors[temp as keyof typeof tempColors]}`}>
                                  {tempIcons[temp as keyof typeof tempIcons]} {temp}
                                </div>
                              </div>
                              <div className="text-sm text-slate-500 truncate mb-1">{c.email}</div>
                              
                              {/* Score Bar */}
                              <div className="flex items-center space-x-2 mb-1">
                                <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                                  <div
                                    className={`h-1.5 rounded-full ${
                                      score >= 75 ? 'bg-green-500' : score >= 50 ? 'bg-orange-500' : 'bg-gray-400'
                                    }`}
                                    style={{ width: `${score}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs font-semibold text-slate-600">{score}</span>
                              </div>
                              
                              {/* Metadata Tags */}
                              <div className="flex flex-wrap gap-1">
                                {c.metadata?.budgetRange && (
                                  <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                                    💵 {c.metadata.budgetRange}
                                  </span>
                                )}
                                {c.metadata?.travelStyle && (
                                  <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                                    ✈️ {c.metadata.travelStyle}
                                  </span>
                                )}
                                {c.metadata?.city && (
                                  <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                                    📍 {c.metadata.city}
                                  </span>
                                )}
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    {Object.values(selectedContactIds).filter(Boolean).length} contato(s) selecionado(s)
                  </div>
                  <div className="flex space-x-3">
                    <button 
                      onClick={() => setShowContactsModal(false)} 
                      className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-white transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={() => {
                        const selected = contacts.filter(c => selectedContactIds[c.id])
                        const emails = selected.map(s => s.email).filter(Boolean)
                        const existing = recipientsText.split(/[,\n;]+/).map(s => s.trim()).filter(Boolean)
                        const merged = Array.from(new Set([...existing, ...emails]))
                        setRecipientsText(merged.join('\n'))
                        setShowContactsModal(false)
                      }}
                      disabled={Object.values(selectedContactIds).filter(Boolean).length === 0}
                      className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Adicionar {Object.values(selectedContactIds).filter(Boolean).length > 0 && `(${Object.values(selectedContactIds).filter(Boolean).length})`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recipients 'Ver todos' modal */}
        {showRecipientsModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-auto">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowRecipientsModal(false)} />
            <div className="relative bg-white rounded-2xl shadow-lg w-full max-w-md p-6 my-auto">
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
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-auto">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowVariantsModal(false)} />
            <div className="relative bg-white rounded-2xl shadow-lg w-full max-w-4xl p-6 overflow-auto max-h-[90vh] my-auto">
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
        
        {/* Template Selector Modal */}
        {showTemplateSelector && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-auto" onClick={() => setShowTemplateSelector(false)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden my-auto" onClick={(e) => e.stopPropagation()}>
              
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">📧 Escolha um Template</h2>
                    <p className="text-purple-100 text-sm mt-1">Selecione um modelo profissional para sua campanha</p>
                  </div>
                  <button
                    onClick={() => setShowTemplateSelector(false)}
                    className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Templates Grid */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {EMAIL_TEMPLATES.map((template) => (
                    <div
                      key={template.id}
                      className={`bg-white rounded-xl border-2 transition-all cursor-pointer overflow-hidden group ${
                        activeTemplate === template.id 
                          ? 'border-purple-500 ring-2 ring-purple-200' 
                          : 'border-slate-200 hover:border-purple-400'
                      }`}
                      onClick={() => {
                        // Apply template and activate real-time sync
                        const isSameTemplate = activeTemplate === template.id
                        setActiveTemplate(template.id)
                        setShowTemplateSelector(false)
                        setResult(`✅ Template "${template.name}" aplicado! Os campos do formulário agora atualizam o template automaticamente.`)
                        
                        // Se for o mesmo template, forçar atualização do preview
                        if (isSameTemplate) {
                          requestAnimationFrame(() => {
                            const editor = document.getElementById('visual-editor')
                            if (editor && htmlContent) {
                              editor.innerHTML = DOMPurify.sanitize(htmlContent)
                              console.log('🔄 Preview forçado para template já ativo:', template.id)
                            }
                          })
                        }
                      }}
                    >
                      {/* Thumbnail */}
                      <div className="bg-gradient-to-br from-purple-500 to-indigo-600 h-32 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <div className="text-5xl">{template.thumbnail}</div>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <h3 className="font-bold text-slate-900 mb-1">{template.name}</h3>
                        <p className="text-xs text-slate-600 line-clamp-2 mb-3">{template.description}</p>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                            template.category === 'tourism' ? 'bg-blue-100 text-blue-700' :
                            template.category === 'promotional' ? 'bg-red-100 text-red-700' :
                            template.category === 'newsletter' ? 'bg-purple-100 text-purple-700' :
                            template.category === 'event' ? 'bg-green-100 text-green-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {template.category === 'tourism' ? 'Turismo' :
                             template.category === 'promotional' ? 'Promocional' :
                             template.category === 'newsletter' ? 'Newsletter' :
                             template.category === 'event' ? 'Evento' : 'Fidelização'}
                          </span>
                          <button className="text-purple-600 text-sm font-semibold hover:text-purple-700">
                            Usar →
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Dica:</strong> Após selecionar um template, você pode personalizá-lo completamente editando o conteúdo HTML abaixo.
                  </p>
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
                <div className="grid grid-cols-1 gap-4 p-6">
                  {campaigns.slice((page-1)*pageSize, page*pageSize).map(c => {
                    const sent = getSentCount(c)
                    const delivered = getDeliveredCount(c)
                    const deliveryRate = getDeliverRateDisplay(c)
                    
                    return (
                      <div key={c.id} className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl border-2 border-slate-200/60 hover:border-indigo-300/60 hover:shadow-xl transition-all duration-300 overflow-hidden group">
                        {/* Header com Status Badge */}
                        <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 px-6 py-4 border-b border-slate-200/60 flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              c.status === 'sent' ? 'bg-green-100' :
                              c.status === 'scheduled' ? 'bg-blue-100' :
                              'bg-yellow-100'
                            }`}>
                              <svg className={`w-6 h-6 ${
                                c.status === 'sent' ? 'text-green-600' :
                                c.status === 'scheduled' ? 'text-blue-600' :
                                'text-yellow-600'
                              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {c.status === 'sent' ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                ) : c.status === 'scheduled' ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                )}
                              </svg>
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                  {c.subject || 'Sem título'}
                                </h3>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  c.status === 'sent' ? 'bg-green-100 text-green-800 ring-1 ring-green-600/20' :
                                  c.status === 'scheduled' ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-600/20' :
                                  'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-600/20'
                                }`}>
                                  {c.status === 'sent' ? '✓ Enviado' : c.status === 'scheduled' ? '⏰ Agendada' : '📝 Rascunho'}
                                </span>
                              </div>
                              {c.preheader && (
                                <p className="text-sm text-slate-600 mt-1 line-clamp-1">{c.preheader}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Criado em</div>
                            <div className="text-sm font-medium text-slate-900">
                              {c.createdAt ? new Date((c.createdAt?.seconds || c.createdAt) * (c.createdAt?.seconds ? 1000 : 1)).toLocaleDateString('pt-BR') : '—'}
                            </div>
                            <div className="text-xs text-slate-600">
                              {c.createdAt ? new Date((c.createdAt?.seconds || c.createdAt) * (c.createdAt?.seconds ? 1000 : 1)).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}) : ''}
                            </div>
                          </div>
                        </div>

                        {/* Informações do Remetente */}
                        <div className="px-6 py-4 bg-indigo-50/30 border-b border-indigo-100/50">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-start space-x-3">
                              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Remetente</div>
                                <div className="text-sm font-bold text-slate-900 truncate">
                                  {c._tenantFromName || c.companyName || 'Nome não definido'}
                                </div>
                                <div className="text-xs text-slate-600 truncate">
                                  {c._tenantFromEmail || 'E-mail não configurado'}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-start space-x-3">
                              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Destinatários</div>
                                <div className="text-sm font-bold text-slate-900">
                                  {(c.to || []).length} {(c.to || []).length === 1 ? 'pessoa' : 'pessoas'}
                                </div>
                                {(c.to || []).length > 0 && (
                                  <div className="text-xs text-slate-600 truncate">
                                    {(c.to || []).slice(0, 2).map((t: any) => t.email).join(', ')}
                                    {(c.to || []).length > 2 && ` +${(c.to || []).length - 2}`}
                                  </div>
                                )}
                              </div>
                            </div>

                            {c.destination && (
                              <div className="flex items-start space-x-3">
                                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Destino</div>
                                  <div className="text-sm font-bold text-slate-900 truncate">{c.destination}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Métricas de Performance */}
                        <div className="px-6 py-4 bg-white">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200/50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Enviados</span>
                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                              </div>
                              <div className="text-2xl font-bold text-blue-900">{sent || 0}</div>
                            </div>

                            <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-4 border border-green-200/50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">Entregues</span>
                                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <div className="text-2xl font-bold text-green-900">{delivered !== null ? delivered : sent || 0}</div>
                              <div className="text-xs text-green-600 font-semibold mt-1">{deliveryRate}</div>
                            </div>

                            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-4 border border-amber-200/50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Tom</span>
                                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                </svg>
                              </div>
                              <div className="text-sm font-bold text-amber-900 capitalize">
                                {c.tone === 'friendly' ? 'Amigável' : 
                                 c.tone === 'professional' ? 'Profissional' :
                                 c.tone === 'formal' ? 'Formal' :
                                 c.tone === 'casual' ? 'Casual' :
                                 c.tone === 'urgent' ? 'Urgente' : 
                                 c.tone || '—'}
                              </div>
                            </div>

                            <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 border border-purple-200/50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Categoria</span>
                                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                              </div>
                              <div className="text-sm font-bold text-purple-900 capitalize">
                                {c.vertical === 'tourism' ? 'Turismo' :
                                 c.vertical === 'ecommerce' ? 'E-commerce' :
                                 c.vertical === 'services' ? 'Serviços' :
                                 c.vertical === 'cooperative' ? 'Cooperativa' :
                                 c.vertical === 'taxi' ? 'Táxi' :
                                 c.vertical || 'Geral'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Ações */}
                        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200/60 flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-xs text-slate-600">
                            {c.productName && (
                              <div className="flex items-center space-x-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                                <span className="font-medium">{c.productName}</span>
                              </div>
                            )}
                            {c.mainTitle && (
                              <div className="flex items-center space-x-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span>{c.mainTitle}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={async () => {
                                try {
                                  const resp = await fetch('/api/send-campaign', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ campaignId: c.id }) })
                                  const j = await resp.json()
                                  if (!resp.ok) throw new Error(JSON.stringify(j))
                                  setResult('✅ Campanha reenviada com sucesso!')
                                } catch (e:any) { setResult('❌ ' + String(e.message || e)) }
                              }} 
                              className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all duration-200"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                              className="inline-flex items-center space-x-2 px-4 py-2 bg-white border-2 border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 hover:border-indigo-300 transition-all duration-200"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span>Editar</span>
                            </button>
                            <button 
                              onClick={async () => {
                                if (!confirm('⚠️ Tem certeza que deseja remover esta campanha? Esta ação não pode ser desfeita.')) return
                                try { 
                                  const resp = await fetch('/api/delete-campaign', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: c.id }) }); 
                                  const j = await resp.json(); 
                                  if (!resp.ok) throw new Error(JSON.stringify(j)); 
                                  setCampaigns(prev=>prev.filter(x=>x.id!==c.id)); 
                                  setResult('✅ Campanha removida com sucesso') 
                                } catch (e:any){ setResult('❌ ' + String(e.message||e)) }
                              }} 
                              className="inline-flex items-center space-x-2 px-4 py-2 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl text-sm font-semibold hover:bg-red-100 hover:border-red-300 transition-all duration-200"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>Remover</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Pagination */}
                {campaigns.length > pageSize && (
                  <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100/50 border-t-2 border-slate-200/60 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          Exibindo {((page-1)*pageSize)+1} - {Math.min(page*pageSize, campaigns.length)} de {campaigns.length}
                        </div>
                        <div className="text-xs text-slate-600">
                          Página {page} de {Math.ceil(campaigns.length/pageSize)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button 
                        className="inline-flex items-center space-x-2 px-5 py-2.5 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-white hover:border-indigo-300 hover:text-indigo-600 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-slate-300 disabled:hover:text-slate-700"
                        disabled={page <= 1}
                        onClick={() => setPage(p => Math.max(1, p-1))}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Anterior</span>
                      </button>
                      
                      <div className="flex items-center space-x-1">
                        {Array.from({length: Math.ceil(campaigns.length/pageSize)}, (_, i) => i + 1)
                          .filter(p => p === 1 || p === Math.ceil(campaigns.length/pageSize) || Math.abs(p - page) <= 1)
                          .map((p, idx, arr) => (
                            <React.Fragment key={p}>
                              {idx > 0 && arr[idx - 1] !== p - 1 && (
                                <span className="px-2 text-slate-400">...</span>
                              )}
                              <button
                                onClick={() => setPage(p)}
                                className={`w-10 h-10 rounded-lg font-semibold transition-all duration-200 ${
                                  p === page
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                                    : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600'
                                }`}
                              >
                                {p}
                              </button>
                            </React.Fragment>
                          ))}
                      </div>

                      <button 
                        className="inline-flex items-center space-x-2 px-5 py-2.5 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-white hover:border-indigo-300 hover:text-indigo-600 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-slate-300 disabled:hover:text-slate-700"
                        disabled={page >= Math.ceil(campaigns.length/pageSize)}
                        onClick={() => setPage(p => p+1)}
                      >
                        <span>Próxima</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
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