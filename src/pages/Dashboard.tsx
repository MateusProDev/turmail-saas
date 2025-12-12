// React import not required with the new JSX transform
import { useAuthState } from 'react-firebase-hooks/auth'
// Use Tailwind for all styles in this file
import { auth, db } from '../lib/firebase'
import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { collection, query, where, onSnapshot, orderBy, limit, doc, getDoc, setDoc, addDoc, updateDoc } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { Link, useNavigate } from 'react-router-dom'
import EmailUsageCard from '../components/EmailUsageCard'
import { uploadImage } from '../lib/cloudinary'

// Type definitions
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

interface Tenant {
  id?: string
  ownerUid: string
  ownerEmail: string
  name: string
  plan: string
  status: string
  limits?: any // eslint-disable-line @typescript-eslint/no-explicit-any
  onboardingCompleted?: boolean
  onboardingProgress?: any // eslint-disable-line @typescript-eslint/no-explicit-any
  stripeSubscriptionId?: string
  createdAt?: Date
  updatedAt?: Date
  logoUrl?: string
  industry?: string
  [key: string]: any // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface OnboardingStep {
  key: string
  label: string
  href: string
}

interface BrevoStats {
  sent?: number
  delivered?: number
  opened?: number
  clicked?: number
  bounced?: number
  unsubscribed?: number
  emailStats?: any // eslint-disable-line @typescript-eslint/no-explicit-any
  errors?: any // eslint-disable-line @typescript-eslint/no-explicit-any
  campaigns?: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
  [key: string]: unknown
}

// Helper function to compute open rate

export default function Dashboard(){
  const [user, loading, error] = useAuthState(auth)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [brevoStats, setBrevoStats] = useState<BrevoStats | null>(null)
  const [loadingBrevo, setLoadingBrevo] = useState(false)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const navigate = useNavigate()

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Onboarding modal state
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [checkoutPending, setCheckoutPending] = useState(false)
  const [isOnboardingReady, setIsOnboardingReady] = useState(false)
  const [onboardingJustCompleted, setOnboardingJustCompleted] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  
  // Form states for onboarding steps
  const [companyName, setCompanyName] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  
  // Contact form states
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  
  // Test email states
  const [testEmailAdditional, setTestEmailAdditional] = useState('')
  const [testEmailSent, setTestEmailSent] = useState(false)
  const [sendingTestEmail, setSendingTestEmail] = useState(false)
  
  // Estado simplificado de carregamento
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  
  const onboardingStepsDef = useMemo<OnboardingStep[]>(() => [
    { key: 'profile', label: 'Completar perfil (nome, logo)', href: '/settings' },
    { key: 'contacts', label: 'Adicionar contatos', href: '/contacts' },
    { key: 'campaign', label: 'Criar primeira campanha', href: '/campaigns' },
    { key: 'test', label: 'Enviar email de teste', href: '/campaigns' },
  ], [])

  // Controle de carregamento inicial - REDUZIDO PARA 500ms
  useEffect(() => {
    if (!loading && user !== undefined) {
      // Aguardar um pouco para garantir que os listeners sejam configurados
      const timer = setTimeout(() => {
        setInitialLoadComplete(true)
      }, 500) // Reduzido de 1000ms para 500ms

      return () => clearTimeout(timer)
    }
  }, [loading, user])

  // Check for checkout success in URL
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null)
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const checkoutSuccess = params.get('checkout')
    const sessionId = params.get('session_id')
    
    if (checkoutSuccess === 'success') {
      // console.log('[Dashboard] 🔄 Processando redirecionamento pós-pagamento...', { sessionId, planId, uid })
      
      // Store session ID for fallback verification
      if (sessionId) {
        setCheckoutSessionId(sessionId)
      }
      
      // Show success toast
      setShowSuccessToast(true)
      setTimeout(() => setShowSuccessToast(false), 5000)
      
      // Mark that checkout just completed so we can show onboarding even if subscription hasn't synced yet
      setCheckoutPending(true)
      
      // Clean URL immediately to avoid multiple executions
      window.history.replaceState({}, '', '/dashboard')
      
      // Optional: Show loading state while webhook processes
      // This gives time for the webhook to update the database
      // console.log('[Dashboard] Checkout success detected, setCheckoutPending=true')
    }
  }, [])

  // Fallback: Check subscription status if we have a checkout session ID
  useEffect(() => {
    if (!checkoutSessionId || subscription || loading) return

    // console.log('[Dashboard] Checking subscription status for session:', checkoutSessionId)
    
    const checkSubscriptionStatus = async () => {
      try {
        const token = await user?.getIdToken()
        if (!token) return

        const response = await fetch(`/api/get-session?session_id=${checkoutSessionId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (response.ok) {
          const sessionData = await response.json()
          // console.log('[Dashboard] Session data retrieved:', {
          //   id: sessionData.id,
          //   payment_status: sessionData.payment_status,
          //   subscription: sessionData.subscription?.id,
          //   status: sessionData.status
          // })
          
          if (sessionData.subscription) {
            // console.log('[Dashboard] Subscription found via session check, reloading...')
            // Force reload to get updated subscription data
            window.location.reload()
          } else if (sessionData.payment_status === 'paid') {
            // console.log('[Dashboard] Payment was successful but no subscription found, webhook may have failed')
            // Show message to user that payment was processed but subscription setup failed
            alert('Pagamento processado com sucesso! Estamos configurando sua conta. Se o problema persistir, contate o suporte.')
          }
        } else {
          console.error('[Dashboard] Failed to get session data:', response.status, await response.text())
        }
      } catch (error) {
        console.error('[Dashboard] Error checking subscription status:', error)
      }
    }

    // Check immediately and then every 5 seconds for up to 2 minutes
    checkSubscriptionStatus()
    const interval = setInterval(checkSubscriptionStatus, 5000)
    const timeout = setTimeout(() => {
      clearInterval(interval)
      // console.log('[Dashboard] Stopped checking subscription status after 2 minutes')
      if (!subscription) {
        // console.log('[Dashboard] No subscription found after 2 minutes, user may need manual intervention')
        alert('Não conseguimos verificar sua subscription. Tente recarregar a página ou contate o suporte.')
      }
    }, 120000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [checkoutSessionId, subscription, loading, user])

  // 🎯 SOLUÇÃO DEFINITIVA: Onboarding sempre abre para novas contas
  const onboardingEffect = useCallback(() => {
    // Não fazer nada enquanto loading
    if (loading) {
      if (isOnboardingReady) {
        setIsOnboardingReady(false)
      }
      return
    }

    // Verificar se os dados necessários estão prontos
    const subscriptionLoaded = subscription !== undefined && subscription !== null
    const tenantLoaded = tenant !== undefined && tenant !== null

    if (!subscriptionLoaded || !tenantLoaded) {
      if (isOnboardingReady) {
        setIsOnboardingReady(false)
      }
      return
    }

    // ✅ Dados prontos - marcar como ready apenas se não estiver
    if (!isOnboardingReady) {
      setIsOnboardingReady(true)
    }

    // Calcular variáveis de decisão de onboarding
    const isNewAccount = !subscription?.onboardingCompleted && subscription?.planId
    const shouldOpenOnboarding = isNewAccount || checkoutPending

    if (shouldOpenOnboarding && !onboardingOpen && !onboardingJustCompleted) {
      // Pequeno delay para garantir que tudo está carregado
      const timer = setTimeout(() => {
        setOnboardingOpen(true)
        setCurrentStep(0) // Reset to first step
      }, 500)
      return () => clearTimeout(timer)
    } else if (!shouldOpenOnboarding && onboardingOpen) {
      setOnboardingOpen(false)
      return () => {}
    } else {
      // No change needed
      return () => {}
    }
  }, [subscription?.onboardingCompleted, subscription?.planId, tenant, loading, checkoutPending, onboardingOpen, onboardingJustCompleted, isOnboardingReady])

  useEffect(onboardingEffect, [onboardingEffect])
  

  // Fechar modal quando onboarding for completado (backup - caso o estado seja atualizado por outro meio)
  useEffect(() => {
    // console.log('[Dashboard] useEffect check - onboardingCompleted:', subscription?.onboardingCompleted, 'onboardingOpen:', onboardingOpen)
    if (subscription?.onboardingCompleted === true && onboardingOpen) {
      // console.log('[Dashboard] Closing onboarding modal due to completed status')
      setOnboardingOpen(false)
      setCheckoutPending(false)
    }
  }, [subscription?.onboardingCompleted, onboardingOpen])

  // Auto-concluir passo de onboarding ao voltar do local configurado
  useEffect(() => {
    const lastStep = window.sessionStorage.getItem('onboardingStep')
    if (lastStep && subscription && subscription.onboardingProgress && !subscription.onboardingProgress[lastStep]) {
      (async () => {
        try {
          if (!subscription?.id) return
          const newProgress = { ...(subscription.onboardingProgress || {}), [lastStep]: { completed: true, completedAt: new Date(), autoCompleted: true } }
          const allDone = onboardingStepsDef.every(st => newProgress[st.key])
          await setDoc(doc(db, 'subscriptions', subscription.id), {
            onboardingProgress: newProgress,
            onboardingCompleted: allDone
          }, { merge: true })
          window.sessionStorage.removeItem('onboardingStep')
        } catch {
          // Silenciar erro
        }
      })()
    }
  }, [subscription, onboardingStepsDef])

  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      const el = menuRef.current
      if (!el) return
      if (e.target instanceof Node && !el.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('click', handleDocClick)
    return () => document.removeEventListener('click', handleDocClick)
  }, [menuOpen])

  // Buscar tenant do usuário
  useEffect(() => {
    if (!user) return
    
    const fetchTenant = async () => {
      try {
        const token = await user.getIdToken()
        const resp = await fetch('/api/my-tenants', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        const data = await resp.json()
        // console.log('[Dashboard] My tenants response:', data)
        
        if (data.tenants && data.tenants.length > 0) {
          const firstTenant = data.tenants[0]
          // console.log('[Dashboard] Found tenant:', firstTenant.tenantId)
          setTenantId(firstTenant.tenantId)
          
          // Buscar dados completos do tenant incluindo logoUrl
          const tenantRef = doc(db, 'tenants', firstTenant.tenantId)
          const tenantSnap = await getDoc(tenantRef)
          if (tenantSnap.exists()) {
            setTenant({ id: tenantSnap.id, ...tenantSnap.data() } as Tenant)
          }
        } else {
          // console.log('[Dashboard] No tenant found for user')
          setTenantId(null)
          setTenant(null)
        }
      } catch (e) {
        console.error('[Dashboard] Error fetching tenant:', e)
        setTenantId(null)
      }
    }
    
    fetchTenant()
  }, [user])

  // Listener em tempo real para dados do tenant (incluindo logo)
  useEffect(() => {
    if (!tenantId) return
    
    const tenantRef = doc(db, 'tenants', tenantId)
    const unsubscribe = onSnapshot(tenantRef, (snap) => {
      if (snap.exists()) {
        setTenant({ id: snap.id, ...snap.data() } as Tenant)
        // console.log('[Dashboard] Tenant data updated:', snap.data())
      }
    })
    
    return () => unsubscribe()
  }, [tenantId])

  // subscription via API - MAIS SEGURO E CONSISTENTE
  useEffect(() => {
    if (!user || !user.uid || !tenantId) {
      // console.log('[Dashboard] User or tenant not ready for subscription fetch')
      setSubscription(null)
      return
    }

    const fetchSubscription = async () => {
      try {
        // console.log('[Dashboard] Fetching subscription via API for tenant:', tenantId)
        const token = await user.getIdToken()
        const response = await fetch(`/api/subscription?tenantId=${tenantId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`)
        }

        const data = await response.json()
        // console.log('[Dashboard] Subscription API response:', data)

        if (data.subscription) {
          // console.log('[Dashboard] Subscription loaded via API:', {
          //   id: data.subscription.id,
          //   status: data.subscription.status,
          //   planId: data.subscription.planId
          // })
          setSubscription(data.subscription)
          // Se carregou subscription com sucesso, não está mais em checkout pending
          if (checkoutPending) {
            setCheckoutPending(false)
          }
        } else {
          // console.log('[Dashboard] No subscription found via API')
          setSubscription(null)
        }
      } catch (error) {
        console.error('[Dashboard] Error fetching subscription via API:', error)
        setSubscription(null)
      }
    }

    fetchSubscription()
  }, [user?.uid, tenantId]) // ✅ Dependências corretas

// recent campaigns listener
  const [campaigns, setCampaigns] = useState<any[]>([]) // eslint-disable-line @typescript-eslint/no-explicit-any
  useEffect(() => {
    if (!user) return
    try {
      const cRef = collection(db, 'campaigns')
      const q = query(cRef, where('ownerUid', '==', user.uid), orderBy('createdAt', 'desc'), limit(6))
      const unsub = onSnapshot(q, (snap) => {
        setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      }, (err) => {
        console.error('campaigns snapshot error', err)
        setCampaigns([])
      })
      return () => unsub()
    } catch (e) {
      console.error('campaigns listener error', e)
      setCampaigns([])
    }
  }, [user])

  // contacts count (simple realtime count)
  const [contactsCount, setContactsCount] = useState<number | null>(null)
  useEffect(() => {
    if (!user) return
    try {
      const cRef = collection(db, 'contacts')
      const q = query(cRef, where('ownerUid', '==', user.uid))
      const unsub = onSnapshot(q, (snap) => {
        setContactsCount(snap.size)
      }, (err) => {
        console.error('contacts snapshot error', err)
        setContactsCount(null)
      })
      return () => unsub()
    } catch (e) {
      console.error('contacts listener error', e)
      setContactsCount(null)
    }
  }, [user])

  // Buscar estatísticas da Brevo
  useEffect(() => {
    if (!user || !tenantId) return
    
    const fetchBrevoStats = async () => {
      try {
        setLoadingBrevo(true)
        const token = await user.getIdToken()
        // console.log('[Dashboard] Fetching Brevo stats for tenant:', tenantId)
        
        const resp = await fetch(`/api/get-brevo-stats?tenantId=${tenantId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        const data = await resp.json()
        // console.log('[Dashboard] Brevo stats response:', data)
        
        if (data.success && data.stats) {
          // console.log('[Dashboard] Stats received:', {
          //   hasAccount: !!data.stats.account,
          //   hasEmailStats: !!data.stats.emailStats,
          //   hasCampaigns: !!data.stats.campaigns,
          //   emailStats: data.stats.emailStats,
          //   errors: data.stats.errors
          // })
          
          // Log errors if any
          if (data.stats.errors) {
            if (data.stats.errors.account) console.error('[Dashboard] Account error:', data.stats.errors.account)
            if (data.stats.errors.emailStats) console.error('[Dashboard] EmailStats error:', data.stats.errors.emailStats)
            if (data.stats.errors.campaigns) console.error('[Dashboard] Campaigns error:', data.stats.errors.campaigns)
          }
          
          setBrevoStats(data.stats)
        } else {
          console.warn('[Dashboard] Failed to fetch stats:', data.error)
          setBrevoStats(null)
        }
      } catch (err) {
        console.error('[Dashboard] Error fetching Brevo stats:', err)
        setBrevoStats(null)
      } finally {
        setLoadingBrevo(false)
      }
    }

    fetchBrevoStats()
    // Recarregar stats a cada 5 minutos
    const interval = setInterval(fetchBrevoStats, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user, tenantId])

  // delivery rate (successful deliveries / sent)
  const getDeliveredCount = useCallback((c: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    return c?.metrics?.delivered ?? c?.delivered ?? c?.stats?.delivered ?? null
  }, [])
  
  const getSentCount = useCallback((c: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    return c?.metrics?.sent ?? c?.sent ?? c?.sentCount ?? (c?.to || []).length ?? 0
  }, [])

  const deliverRate = useMemo(() => {
    // Usar estatísticas isoladas por tenant da Brevo
    if (brevoStats?.emailStats) {
      const stats = brevoStats.emailStats
      const delivered = stats.totalDelivered || 0
      const sent = stats.totalSent || 0
      if (sent > 0) {
        return parseFloat(stats.deliveryRate) || Math.round((delivered / sent) * 10000) / 100
      }
    }
    
    // Fallback para estatísticas locais das campanhas
    const campaigns = brevoStats?.campaigns || []
    const totals = campaigns.reduce((acc: { sent: number; delivered: number }, c: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const sent = Number(getSentCount(c) || 0)
      const delivered = Number(getDeliveredCount(c) || 0)
      return { sent: acc.sent + sent, delivered: acc.delivered + delivered }
    }, { sent: 0, delivered: 0 })
    
    if (!totals.sent) return null
    // If there were sent emails but no delivered metric recorded, show 100% per user preference
    if (totals.delivered === 0) return 100
    return Math.round((totals.delivered / totals.sent) * 10000) / 100
  }, [campaigns, brevoStats, getDeliveredCount, getSentCount])

  // Estatísticas isoladas por tenant
  const brevoMetrics = useMemo(() => {
    console.log('[Dashboard] Computing brevoMetrics, brevoStats:', brevoStats)
    
    if (!brevoStats?.emailStats) {
      console.log('[Dashboard] No emailStats available')
      return null
    }
    
    const stats = brevoStats.emailStats
    console.log('[Dashboard] Email stats data:', stats)
    
    const metrics = {
      sent: stats.totalSent || 0,
      delivered: stats.totalDelivered || 0,
      opens: stats.totalOpens || 0,
      clicks: stats.totalClicks || 0,
      uniqueOpeners: stats.uniqueOpeners || 0,
      uniqueClickers: stats.uniqueClickers || 0,
      openRate: parseFloat(stats.openRate) || 0,
      clickRate: parseFloat(stats.clickRate) || 0,
      bounces: stats.totalBounces || 0,
      unsubscribes: stats.totalUnsubscribes || 0
    }
    
    console.log('[Dashboard] Computed metrics:', metrics)
    return metrics
  }, [brevoStats])

  // Redirecionamento inteligente - só após inicialização completa
  useEffect(() => {
    if (loading || !initialLoadComplete) return

    // Não redirecionar se:
    // 1. Ainda está processando checkout
    // 2. Tem erro mas pode recuperar
    if (checkoutPending) {
      console.log('[Dashboard] Not redirecting - checkout pending')
      return
    }

    // Aguardar mais tempo para subscription carregar completamente
    const redirectTimer = setTimeout(() => {
      if (!subscription) {
        console.log('[Dashboard] No subscription found after full initialization, redirecting to plans')
        navigate('/plans', { replace: true })
      }
    }, 8000) // Aumentado para 8 segundos

    return () => clearTimeout(redirectTimer)
  }, [user, loading, subscription, checkoutPending, initialLoadComplete, navigate])

  // ✅ ORDEM CORRETA DE RENDERIZAÇÃO - PREVINE TELA BRANCA

  // 1. Ainda carregando autenticação
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/10 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-700 font-medium">Verificando autenticação...</p>
          <p className="text-slate-500 text-sm mt-2">Conectando com sua conta</p>
        </div>
      </div>
    )
  }

  // 2. Erro de autenticação
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/10 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 max-w-md w-full mx-4 border border-slate-200">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 text-center mb-2">Erro de autenticação</h2>
          <p className="text-slate-600 text-center mb-6">Erro: {String(error)}</p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm hover:shadow"
            >
              Tentar Novamente
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex-1 bg-slate-200 text-slate-700 py-3 px-4 rounded-xl font-semibold hover:bg-slate-300 transition-all"
            >
              Fazer Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 3. Usuário não autenticado
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/10 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 max-w-md w-full mx-4 border border-slate-200">
          <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mb-4 mx-auto">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 text-center mb-2">Acesso necessário</h2>
          <p className="text-slate-600 text-center mb-6">Você precisa entrar para acessar o dashboard.</p>
          <Link
            to="/login"
            className="block w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-center py-3 px-4 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm hover:shadow"
          >
            Fazer Login
          </Link>
        </div>
      </div>
    )
  }

  // 4. Ainda inicializando dados (listeners configurando)
  if (!initialLoadComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/10 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-700 font-medium">Carregando seu dashboard...</p>
          <p className="text-slate-500 text-sm mt-2">Configurando conexões em tempo real</p>
        </div>
      </div>
    )
  }

  // 5. Estado intermediário: aguardando subscription
  if (!subscription && !checkoutPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/10 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-700 font-medium">Buscando sua assinatura...</p>
          <p className="text-slate-500 text-sm mt-2">Verificando status da conta</p>
        </div>
      </div>
    )
  }

  // 6. Estado especial: processamento de checkout
  if (checkoutPending && !subscription) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/10 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 max-w-md w-full mx-4 border border-slate-200">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4 mx-auto">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 text-center mb-2">Pagamento confirmado!</h2>
          <p className="text-slate-600 text-center mb-6">Estamos finalizando a configuração da sua conta. Isso pode levar alguns segundos...</p>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    )
  }

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/login')
  }

  const toDate = (t: unknown) => {
    if (!t) return null

    try {
      // Firestore Timestamp object
      if (typeof t === 'object' && t !== null && typeof (t as { toDate?: () => Date }).toDate === 'function') {
        return (t as { toDate: () => Date }).toDate()
      }

      // Firestore Timestamp with _seconds (from JSON serialization)
      if (typeof t === 'object' && t !== null && '_seconds' in t) {
        const ts = t as { _seconds: number; _nanoseconds?: number }
        return new Date(ts._seconds * 1000 + (ts._nanoseconds || 0) / 1000000)
      }

      // Firestore Timestamp with seconds
      if (typeof t === 'object' && t !== null && 'seconds' in t) {
        return new Date((t as { seconds: number }).seconds * 1000)
      }

      // String or number
      if (typeof t === 'string' || typeof t === 'number') {
        return new Date(t)
      }

      // Already a Date
      if (t instanceof Date) {
        return t
      }

      console.warn('[Dashboard] Unknown date format:', t)
      return null
    } catch (error) {
      console.error('[Dashboard] Error parsing date:', error, t)
      return null
    }
  }

  // compute trial badge info
  const trialInfo = (() => {
    try {
      console.log('[Dashboard] Computing trialInfo:', {
        subscription: !!subscription,
        trialEndsAt: subscription?.trialEndsAt,
        planId: subscription?.planId,
        status: subscription?.status
      })

      // Só mostrar trial se o status for 'trial'
      if (!subscription || subscription.status !== 'trial' || !subscription.trialEndsAt) {
        console.log('[Dashboard] Not showing trial - status is not trial or no trialEndsAt')
        return null
      }

      const end = toDate(subscription.trialEndsAt)
      console.log('[Dashboard] Trial end date:', end)

      if (!end) {
        console.log('[Dashboard] Failed to parse trial end date, returning null')
        return null
      }

      if (isNaN(end.getTime())) {
        console.log('[Dashboard] Invalid trial end date, returning null')
        return null
      }

      const now = Date.now()
      const diff = end.getTime() - now
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24)) // Use ceil instead of floor for more accurate counting

      console.log('[Dashboard] Trial calculation:', {
        end: end.toISOString(),
        now: new Date(now).toISOString(),
        diff,
        days
      })

      const result = { days: Math.max(0, days), expired: diff <= 0 }

      console.log('[Dashboard] Trial info result:', result)
      return result
    } catch (error) {
      console.error('[Dashboard] Error computing trial info:', error)
      return null
    }
  })()

  // Onboarding helper functions
  const handleLogoUpload = async (file: File) => {
    if (!tenantId || !user) return
    
    try {
      setUploadingLogo(true)
      
      // Preview local
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      
      // Upload para Cloudinary
      const response = await uploadImage(file)
      const imageUrl = response.secure_url || response.url
      
      // Atualizar tenant
      const tenantRef = doc(db, 'tenants', tenantId)
      await updateDoc(tenantRef, {
        logoUrl: imageUrl,
        updatedAt: new Date()
      })
      
      console.log('[Onboarding] Logo uploaded successfully:', imageUrl)
      return imageUrl
    } catch (error) {
      console.error('[Onboarding] Error uploading logo:', error)
      alert('Erro ao fazer upload da logo. Tente novamente.')
      return null
    } finally {
      setUploadingLogo(false)
    }
  }

  const saveCompanyProfile = async () => {
    if (!tenantId || !user) return false
    
    try {
      const tenantRef = doc(db, 'tenants', tenantId)
      const updates: any = { updatedAt: new Date() }
      
      if (companyName.trim()) {
        updates.name = companyName.trim()
      }
      
      if (logoFile) {
        const logoUrl = await handleLogoUpload(logoFile)
        if (logoUrl) {
          updates.logoUrl = logoUrl
        }
      }
      
      await updateDoc(tenantRef, updates)
      console.log('[Onboarding] Company profile saved successfully')
      return true
    } catch (error) {
      console.error('[Onboarding] Error saving company profile:', error)
      alert('Erro ao salvar perfil da empresa. Tente novamente.')
      return false
    }
  }

  const addContact = async () => {
    if (!user || !contactEmail.trim()) return false
    
    try {
      const payload: any = {
        ownerUid: user.uid,
        email: contactEmail.trim(),
        name: contactName.trim() || contactEmail.split('@')[0],
        createdAt: new Date(),
        metadata: {
          temperature: 'warm',
          tags: ['onboarding'],
          totalInteractions: 0,
          emailsOpened: 0,
          emailsClicked: 0,
          bookingsCompleted: 0,
          leadScore: 50
        }
      }
      
      if (contactPhone.trim()) {
        payload.phone = contactPhone.trim()
      }
      
      if (tenantId) {
        payload.tenantId = tenantId
      }
      
      await addDoc(collection(db, 'contacts'), payload)
      console.log('[Onboarding] Contact added successfully')
      
      // Reset form
      setContactName('')
      setContactEmail('')
      setContactPhone('')
      
      return true
    } catch (error) {
      console.error('[Onboarding] Error adding contact:', error)
      alert('Erro ao adicionar contato. Tente novamente.')
      return false
    }
  }

  const sendTestEmail = async () => {
    if (!user || !tenantId) return false
    
    try {
      setSendingTestEmail(true)
      
      const userEmail = user.email || 'test@example.com'
      const recipients = [{ email: userEmail }]
      
      // Adicionar email adicional se fornecido
      if (testEmailAdditional.trim()) {
        recipients.push({ email: testEmailAdditional.trim() })
      }
      
      const payload = {
        tenantId,
        to: recipients,
        subject: '🎉 Bem-vindo ao Turmail!',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1f2937; text-align: center;">🎉 Bem-vindo ao Turmail!</h1>
            <p style="color: #6b7280; line-height: 1.6;">
              Parabéns! Sua conta foi configurada com sucesso. Você já pode começar a enviar campanhas de email marketing incríveis.
            </p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin-top: 0;">🚀 Próximos passos:</h3>
              <ul style="color: #6b7280; padding-left: 20px;">
                <li>Configure seu remetente de email</li>
                <li>Importe mais contatos</li>
                <li>Crie sua primeira campanha</li>
                <li>Envie emails personalizados</li>
              </ul>
            </div>
            <p style="color: #6b7280; text-align: center;">
              Se tiver dúvidas, nossa equipe está aqui para ajudar!
            </p>
          </div>
        `,
      }
      
      const response = await fetch('/api/send-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      if (!response.ok) {
        throw new Error('Erro ao enviar email de teste')
      }
      
      const data = await response.json()
      console.log('[Onboarding] Test email sent successfully:', data)
      setTestEmailSent(true)
      return true
    } catch (error) {
      console.error('[Onboarding] Error sending test email:', error)
      alert('Erro ao enviar email de teste. Tente novamente.')
      return false
    } finally {
      setSendingTestEmail(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/10">
      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 z-50 animate-slideIn">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl shadow-lg p-4 max-w-md border border-emerald-400/30">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium">✅ Pagamento confirmado com sucesso!</p>
                <p className="text-xs opacity-90 mt-1">Sua assinatura está ativa. Vamos configurar sua conta.</p>
              </div>
              <button 
                onClick={() => setShowSuccessToast(false)}
                className="ml-4 text-emerald-100 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link to="/dashboard" className="flex items-center space-x-2">
                {tenant?.logoUrl ? (
                  <img 
                    src={tenant.logoUrl} 
                    alt="Logo" 
                    className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    T
                  </div>
                )}
                <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Turmail</span>
              </Link>
              
              {/* Trial Badge */}
              {trialInfo && (
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                  trialInfo.expired 
                    ? 'bg-red-100 text-red-700 border-red-200' 
                    : 'bg-amber-100 text-amber-700 border-amber-200'
                }`}>
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  {trialInfo.expired ? 'Trial Expirado' : `Trial ${trialInfo.days}d`}
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center space-x-3 bg-white/80 hover:bg-white border border-slate-200/60 rounded-xl px-3 py-2 transition-all duration-200 hover:shadow-sm"
              >
                <div className="flex items-center space-x-2">
                  {tenant?.logoUrl ? (
                    <img 
                      src={tenant.logoUrl} 
                      alt="Logo" 
                      className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-sm">
                      {user && user.displayName ? user.displayName.split(' ').map(s=>s[0]).slice(0,2).join('') : (user && user.email ? user.email[0].toUpperCase() : 'U')}
                    </div>
                  )}
                  <div className="text-left hidden sm:block">
                    <div className="text-sm font-medium text-slate-900 truncate max-w-[150px]">{user.email}</div>
                    <div className="text-xs text-slate-500">Conta {subscription?.planId && `• ${subscription.planId}`}</div>
                  </div>
                </div>
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white/95 backdrop-blur-lg rounded-xl shadow-lg border border-slate-200/60 py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-200/60">
                    <div className="text-sm font-medium text-slate-900 truncate">{user.email}</div>
                    <div className="text-xs text-slate-500">{subscription?.planId ? `Plano ${subscription.planId}` : 'Sem plano'}</div>
                  </div>
                  <Link 
                    to="/settings" 
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Meu Perfil</span>
                  </Link>
                  <Link 
                    to="/plans" 
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    <span>Planos</span>
                  </Link>
                  <div className="border-t border-slate-200/60 my-1"></div>
                  <button 
                    onClick={() => { setMenuOpen(false); handleLogout(); }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sair</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Onboarding Modal: guided checklist for new users */}
        {(onboardingOpen && isOnboardingReady) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" onClick={() => {
              setOnboardingOpen(false)
              // Se não é uma nova conta (já tem onboarding completado), reset checkout pending
              if (subscription?.onboardingCompleted) {
                setCheckoutPending(false)
              }
            }} />
            <div 
              role="dialog" 
              aria-modal="true" 
              aria-label="Onboarding" 
              className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 z-50 animate-scaleIn border border-slate-200/50"
              onClick={(e) => e.stopPropagation()}
            >
              {!subscription && checkoutPending ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <h3 className="text-lg font-bold text-slate-900">Pagamento confirmado — Preparando sua conta</h3>
                  <p className="text-sm text-slate-600 mt-2">Aguarde um momento enquanto sincronizamos sua assinatura.</p>
                </div>
              ) : (
                <>
                  {/* Botão fechar */}
                  <button 
                    onClick={() => {
                      setOnboardingOpen(false)
                      // Se não é uma nova conta (já tem onboarding completado), reset checkout pending
                      if (subscription?.onboardingCompleted) {
                        setCheckoutPending(false)
                      }
                    }}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors z-10"
                    aria-label="Fechar onboarding"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {/* Header com progresso */}
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-2 rounded-full mb-3">
                      <span className="text-2xl">👋</span>
                      <span className="text-sm font-medium text-indigo-700">Bem-vindo ao Turmail</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-1">Vamos configurar sua conta</h3>
                    <p className="text-sm text-slate-600">Siga os passos abaixo para começar a enviar emails incríveis</p>
                  </div>

                  {/* Indicador de progresso */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                          currentStep >= 0 ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {currentStep > 0 ? '✓' : '1'}
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                          currentStep >= 1 ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {currentStep > 1 ? '✓' : '2'}
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                          currentStep >= 2 ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {currentStep > 2 ? '✓' : '3'}
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                          currentStep >= 3 ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {currentStep > 3 ? '✓' : '4'}
                        </div>
                      </div>
                      <span className="text-sm font-medium text-slate-700">
                        {Math.round(((currentStep + 1) / onboardingStepsDef.length) * 100)}% concluído
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${((currentStep + 1) / onboardingStepsDef.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Passo atual */}
                  {(() => {
                    const step = onboardingStepsDef[currentStep]
                    const progress = subscription?.onboardingProgress || {}
                    const done = !!progress[step.key]
                    
                    return (
                      <div className="mb-5">
                        <div className={`p-6 rounded-2xl border-2 transition-all duration-300 shadow-sm ${
                          done 
                            ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200 shadow-emerald-100' 
                            : 'bg-gradient-to-br from-slate-50 to-indigo-50/30 border-slate-200 shadow-slate-100'
                        }`}>
                          <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0 transition-all duration-300 ${
                              done 
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' 
                                : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-200'
                            }`}>
                              {done ? '✓' : currentStep + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-lg font-semibold text-slate-900 mb-2">{step.label}</h4>
                              
                              {/* Formulários específicos por passo */}
                              {step.key === 'profile' && (
                                <div className="space-y-4">
                                  <p className="text-sm text-slate-600 leading-relaxed">
                                    Configure o nome e logo da sua empresa para personalizar seus emails.
                                  </p>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Nome da empresa */}
                                    <div>
                                      <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Nome da Empresa *
                                      </label>
                                      <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        placeholder="Digite o nome da sua empresa"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                                      />
                                    </div>
                                    
                                    {/* Upload de logo */}
                                    <div>
                                      <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Logo da Empresa (opcional)
                                      </label>
                                      <div className="flex items-center gap-3">
                                        <input
                                          type="file"
                                          accept="image/*"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                              setLogoFile(file)
                                              const reader = new FileReader()
                                              reader.onloadend = () => {
                                                setLogoPreview(reader.result as string)
                                              }
                                              reader.readAsDataURL(file)
                                            }
                                          }}
                                          className="hidden"
                                          id="logo-upload"
                                        />
                                        <label
                                          htmlFor="logo-upload"
                                          className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-colors text-sm"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                          </svg>
                                          Escolher imagem
                                        </label>
                                        {logoPreview && (
                                          <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-300">
                                            <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                                          </div>
                                        )}
                                        {uploadingLogo && (
                                          <div className="animate-spin w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
                                        )}
                                      </div>
                                      <p className="text-xs text-slate-500 mt-1">Máximo 2MB, formatos: JPG, PNG, GIF</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {step.key === 'contacts' && (
                                <div className="space-y-3">
                                  <p className="text-sm text-slate-600 leading-relaxed">
                                    Adicione seu primeiro contato para começar a enviar emails.
                                  </p>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                      <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Nome (opcional)
                                      </label>
                                      <input
                                        type="text"
                                        value={contactName}
                                        onChange={(e) => setContactName(e.target.value)}
                                        placeholder="Nome do contato"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                                      />
                                    </div>
                                    
                                    <div>
                                      <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Email *
                                      </label>
                                      <input
                                        type="email"
                                        value={contactEmail}
                                        onChange={(e) => setContactEmail(e.target.value)}
                                        placeholder="email@exemplo.com"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                                      />
                                    </div>
                                    
                                    <div>
                                      <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Telefone (opcional)
                                      </label>
                                      <input
                                        type="tel"
                                        value={contactPhone}
                                        onChange={(e) => setContactPhone(e.target.value)}
                                        placeholder="(11) 99999-9999"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {step.key === 'campaign' && (
                                <div className="space-y-3">
                                  <p className="text-sm text-slate-600">
                                    Crie sua primeira campanha de email marketing.
                                  </p>
                                  <p className="text-sm text-slate-500">
                                    Você será redirecionado para a página de campanhas onde poderá criar sua primeira campanha.
                                  </p>
                                </div>
                              )}
                              
                              {step.key === 'test' && (
                                <div className="space-y-4">
                                  <p className="text-sm text-slate-600 leading-relaxed">
                                    Envie um email de teste para verificar se tudo está funcionando.
                                  </p>
                                  
                                  {/* Campo para email adicional */}
                                  <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                      Email adicional (opcional)
                                    </label>
                                    <input
                                      type="email"
                                      value={testEmailAdditional}
                                      onChange={(e) => setTestEmailAdditional(e.target.value)}
                                      placeholder="exemplo@empresa.com"
                                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                      Adicione um email extra para receber o teste junto com {user?.email}
                                    </p>
                                  </div>
                                  
                                  {testEmailSent ? (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                                      <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="text-sm font-medium text-emerald-800">Email de teste enviado com sucesso!</span>
                                      </div>
                                      <p className="text-sm text-emerald-700 mt-1">
                                        Verifique sua caixa de entrada {user?.email && `(${user.email}`}{testEmailAdditional.trim() && ` e ${testEmailAdditional.trim()}`}{user?.email && `)`}
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                      <p className="text-sm text-blue-800">
                                        Um email de boas-vindas será enviado para <strong>{user?.email}</strong>{testEmailAdditional.trim() && ` e <strong>${testEmailAdditional.trim()}</strong>`}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Link para página completa (sempre disponível) */}
                              <a 
                                href={step.href} 
                                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium rounded-lg transition-all duration-200 hover:shadow-sm"
                              >
                                Ir para {step.key === 'profile' ? 'Configurações' : step.key === 'contacts' ? 'Contatos' : step.key === 'campaign' ? 'Campanhas' : 'Campanhas'}
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Navegação */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                    <button 
                      onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                      disabled={currentStep === 0}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:text-slate-800 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 rounded-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                      Anterior
                    </button>

                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          setOnboardingOpen(false)
                          // Se não é uma nova conta (já tem onboarding completado), reset checkout pending
                          if (subscription?.onboardingCompleted) {
                            setCheckoutPending(false)
                          }
                        }}
                        className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-800 font-medium transition-all duration-200 hover:bg-slate-50 rounded-lg"
                      >
                        Fazer depois
                      </button>
                      
                      {(() => {
                        const step = onboardingStepsDef[currentStep]
                        const progress = subscription?.onboardingProgress || {}
                        const done = !!progress[step.key]
                        
                        const handleStepAction = async () => {
                          if (!subscription?.id) return
                          
                          let success = false
                          
                          if (step.key === 'profile') {
                            success = await saveCompanyProfile()
                          } else if (step.key === 'contacts') {
                            success = await addContact()
                          } else if (step.key === 'test') {
                            success = await sendTestEmail()
                          } else {
                            // Para campaign, apenas marcar como feito
                            success = true
                          }
                          
                          if (success) {
                            // Atualizar progresso
                            const newProgress = { ...(subscription.onboardingProgress || {}), [step.key]: true }
                            await setDoc(doc(db, 'subscriptions', subscription.id), { 
                              onboardingProgress: newProgress
                            }, { merge: true })
                            
                            // Avançar para o próximo passo
                            if (currentStep < onboardingStepsDef.length - 1) {
                              setTimeout(() => setCurrentStep(currentStep + 1), 500)
                            }
                          }
                        }
                        
                        return (
                          <button
                            onClick={handleStepAction}
                            disabled={
                              (step.key === 'profile' && !companyName.trim() && !logoFile) ||
                              (step.key === 'contacts' && !contactEmail.trim()) ||
                              (step.key === 'test' && sendingTestEmail) ||
                              uploadingLogo
                            }
                            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg ${
                              done 
                                ? 'bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400' 
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white hover:shadow-xl hover:scale-105'
                            }`}
                          >
                            {uploadingLogo || sendingTestEmail ? (
                              <div className="flex items-center gap-2">
                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                {uploadingLogo ? 'Enviando...' : 'Enviando...'}
                              </div>
                            ) : done ? 'Concluído' : 
                              step.key === 'profile' ? 'Salvar perfil' :
                              step.key === 'contacts' ? 'Adicionar contato' :
                              step.key === 'campaign' ? 'Ir para campanhas' :
                              step.key === 'test' ? (testEmailSent ? 'Enviado' : 'Enviar teste') :
                              'Concluir'
                            }
                          </button>
                        )
                      })()}
                      
                      {currentStep === onboardingStepsDef.length - 1 && (
                        <button
                          onClick={async () => {
                            console.log('[Dashboard] Finalizar button clicked, currentStep:', currentStep, 'total steps:', onboardingStepsDef.length)
                            if (!subscription?.id) {
                              console.error('[Dashboard] No subscription ID for finalizar')
                              return
                            }
                            try {
                              console.log('[Dashboard] Starting onboarding completion...')
                              const newProgress = onboardingStepsDef.reduce((acc, st) => ({
                                ...acc,
                                [st.key]: true
                              }), {})
                              await setDoc(doc(db, 'subscriptions', subscription.id), {
                                onboardingProgress: newProgress,
                                onboardingCompleted: true
                              }, { merge: true })

                              console.log('[Dashboard] Firestore updated successfully, closing modal...')
                              // ✅ Fechar modal imediatamente após sucesso
                              setOnboardingOpen(false)
                              setCheckoutPending(false)
                              setOnboardingJustCompleted(true)
                              
                              // Reset flag after 5 seconds
                              setTimeout(() => setOnboardingJustCompleted(false), 5000)
                              
                              console.log('[Dashboard] Onboarding completed successfully, modal closed')
                            } catch (e) {
                              console.error('failed to mark onboarding complete', e)
                              alert('Erro ao marcar onboarding como completo')
                            }
                          }} 
                          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                        >
                          Finalizar
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Loading overlay enquanto dados não estão prontos */}
        {(!tenant || !subscription) && !loading && (
          <div className="mb-6 bg-white/80 backdrop-blur-lg rounded-2xl shadow-sm border border-slate-200/60 p-8 text-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-700 font-medium">Finalizando configuração da sua conta...</p>
            <p className="text-sm text-slate-500 mt-1">Isso deve levar apenas alguns segundos</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-sm border border-slate-200/60 p-6 sticky top-24">
              {/* User Card */}
              <div className="text-center mb-8">
                {tenant?.logoUrl ? (
                  <img 
                    src={tenant.logoUrl} 
                    alt="Logo da Empresa" 
                    className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3 shadow-lg border-2 border-white"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-3 shadow-lg">
                    {user && user.displayName ? user.displayName.split(' ').map(s=>s[0]).slice(0,2).join('') : (user && user.email ? user.email[0].toUpperCase() : 'U')}
                  </div>
                )}
                <h3 className="font-semibold text-slate-900 truncate">{tenant?.name || user.email}</h3>
                <p className="text-sm text-slate-500 mt-1">{tenant?.industry || 'Turismo'}</p>
                {trialInfo && (
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mt-2 ${
                    trialInfo.expired 
                      ? 'bg-red-100 text-red-700 border border-red-200' 
                      : 'bg-amber-100 text-amber-700 border border-amber-200'
                  }`}>
                    {trialInfo.expired ? 'Trial Expirado' : `Trial • ${trialInfo.days} dias`}
                  </div>
                )}
              </div>

              {/* Navigation */}
              <nav className="space-y-1">
                <Link 
                  to="/dashboard" 
                  className="flex items-center space-x-3 p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-indigo-50/50 text-indigo-700 font-medium transition-all duration-200 group border border-indigo-100"
                >
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm group-hover:shadow transition-shadow">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 13h8V3H3v10zM13 21h8V11h-8v10zM13 3v6h8" />
                    </svg>
                  </div>
                  <span>Visão Geral</span>
                </Link>
                
                <Link 
                  to="/campaigns" 
                  className="flex items-center space-x-3 p-3 rounded-xl text-slate-700 hover:bg-slate-50/80 font-medium transition-all duration-200 group hover:border hover:border-slate-200"
                >
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow transition-shadow">
                    <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M22 12v2a2 2 0 0 1-2 2h-3l-4 3v-8l4-3h3a2 2 0 0 1 2 2v2zM2 12h4" />
                    </svg>
                  </div>
                  <span>Campanhas</span>
                </Link>
                
                <Link 
                  to="/contacts" 
                  className="flex items-center space-x-3 p-3 rounded-xl text-slate-700 hover:bg-slate-50/80 font-medium transition-all duration-200 group hover:border hover:border-slate-200"
                >
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow transition-shadow">
                    <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <span>Contatos</span>
                </Link>
                
                <Link 
                  to="/reports" 
                  className="flex items-center space-x-3 p-3 rounded-xl text-slate-700 hover:bg-slate-50/80 font-medium transition-all duration-200 group hover:border hover:border-slate-200"
                >
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow transition-shadow">
                    <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3v18h18" />
                      <path d="M7 13v5" />
                      <path d="M12 9v9" />
                      <path d="M17 5v13" />
                    </svg>
                  </div>
                  <span>Relatórios</span>
                </Link>
                
                <Link 
                  to="/settings" 
                  className="flex items-center space-x-3 p-3 rounded-xl text-slate-700 hover:bg-slate-50/80 font-medium transition-all duration-200 group hover:border hover:border-slate-200"
                >
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow transition-shadow">
                    <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 0 1 2.3 17.3l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09c.7 0 1.29-.41 1.51-1a1.65 1.65 0 0 0-.33-1.82L4.3 6.7A2 2 0 0 1 7.13 3.87l.06.06a1.65 1.65 0 0 0 1.82.33c.45-.26.97-.4 1.51-.4H12c.54 0 1.06.14 1.51.4.63.36 1.38.36 2.01 0 .45-.26.97-.4 1.51-.4H20a2 2 0 0 1 0 4h-.09c-.7 0-1.29.41-1.51 1-.26.86.07 1.82.33 1.82l.06.06A2 2 0 0 1 19.4 15z" />
                    </svg>
                  </div>
                  <span>Configurações</span>
                </Link>

                <Link
                  to="/domain-sender"
                  className="flex items-center space-x-3 p-3 rounded-xl text-slate-700 hover:bg-slate-50/80 font-medium transition-all duration-200 group hover:border hover:border-slate-200"
                >
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow transition-shadow">
                    <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7l4 4m0 0l-4 4m4-4H7"/>
                    </svg>
                  </div>
                  <span>Domínios & Remetentes</span>
                </Link>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3 space-y-6">
            {/* Alerta: Configurar Brevo */}
            {!loadingBrevo && !brevoStats?.account && !brevoStats?.emailStats && brevoStats?.errors && (
              <div className="bg-red-50 border-l-4 border-red-400 rounded-xl p-5 shadow-sm">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-red-800">
                      Chave Brevo inválida ou expirada
                    </h3>
                    <p className="mt-1 text-sm text-red-700">
                      A chave API da Brevo configurada não é mais válida. Por favor, gere uma nova chave em sua conta Brevo e atualize nas Configurações.
                    </p>
                    {brevoStats.errors.account && (
                      <p className="mt-2 text-xs text-red-600 font-mono bg-red-100 p-2 rounded">
                        Erro: {brevoStats.errors.account.message || JSON.stringify(brevoStats.errors.account)}
                      </p>
                    )}
                    <div className="mt-3 flex items-center space-x-3">
                      <a 
                        href="https://app.brevo.com/settings/keys/api" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 text-sm font-medium rounded-lg transition-colors border border-red-200"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                        </svg>
                        Gerar Nova Chave Brevo
                      </a>
                      <Link 
                        to="/settings" 
                        className="inline-flex items-center px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg border border-slate-300 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        Atualizar Configurações
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {!loadingBrevo && !brevoStats?.account && !brevoStats?.emailStats && !brevoStats?.errors && (
              <div className="bg-amber-50 border-l-4 border-amber-400 rounded-xl p-5 shadow-sm">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-amber-800">
                      Configure sua chave Brevo
                    </h3>
                    <p className="mt-1 text-sm text-amber-700">
                      Para visualizar estatísticas em tempo real da sua conta Brevo, configure sua chave API em Configurações.
                    </p>
                    <div className="mt-3">
                      <Link 
                        to="/settings" 
                        className="inline-flex items-center px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-medium rounded-lg transition-colors border border-amber-200"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        Ir para Configurações
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Plan Info Banner */}
            {/* Email Usage Card - mostrar sempre que tiver subscription */}
            {subscription && tenantId && (
              <EmailUsageCard tenantId={tenantId} subscription={subscription} />
            )}

            {/* Metrics Grid - Estilo Brevo */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Estatísticas dos Últimos 30 Dias</h2>
                {loadingBrevo && (
                  <div className="flex items-center space-x-2 text-sm text-slate-500">
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Atualizando...</span>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* E-mails Enviados */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-slate-900 mb-1">
                    {brevoMetrics?.sent?.toLocaleString('pt-BR') || '0'}
                  </div>
                  <div className="text-sm text-slate-600 font-medium">E-mails Enviados</div>
                  <div className="text-xs text-slate-400 mt-1">Total de envios realizados</div>
                </div>

                {/* Taxa de Entrega */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-50 to-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-slate-900 mb-1">
                    {deliverRate != null ? `${deliverRate}%` : '—'}
                  </div>
                  <div className="text-sm text-slate-600 font-medium">Taxa de Entrega</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {brevoMetrics?.delivered?.toLocaleString('pt-BR') || '0'} entregues
                  </div>
                </div>

                {/* Taxa de Abertura */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-slate-900 mb-1">
                    {brevoMetrics?.openRate != null ? `${brevoMetrics.openRate}%` : '—'}
                  </div>
                  <div className="text-sm text-slate-600 font-medium">Taxa de Abertura</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {brevoMetrics?.opens?.toLocaleString('pt-BR') || '0'} aberturas únicas
                  </div>
                </div>

                {/* Taxa de Cliques */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/>
                      </svg>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-slate-900 mb-1">
                    {brevoMetrics?.clickRate != null ? `${brevoMetrics.clickRate}%` : '—'}
                  </div>
                  <div className="text-sm text-slate-600 font-medium">Taxa de Cliques</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {brevoMetrics?.clicks?.toLocaleString('pt-BR') || '0'} cliques únicos
                  </div>
                </div>
              </div>

              {/* Métricas Adicionais */}
              {brevoMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  {/* Contatos */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-slate-900">{contactsCount?.toLocaleString('pt-BR') || '0'}</div>
                        <div className="text-xs text-slate-500">Total de Contatos</div>
                      </div>
                    </div>
                  </div>

                  {/* Bounces */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-red-50 to-red-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-slate-900">{brevoMetrics.bounces?.toLocaleString('pt-BR')}</div>
                        <div className="text-xs text-slate-500">E-mails Rejeitados</div>
                      </div>
                    </div>
                  </div>

                  {/* Descadastros */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6"/>
                        </svg>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-slate-900">{brevoMetrics.unsubscribes?.toLocaleString('pt-BR')}</div>
                        <div className="text-xs text-slate-500">Descadastros</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Recent Campaigns */}
            <section className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200/60">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Campanhas Recentes</h2>
                  <Link 
                    to="/campaigns" 
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center space-x-1 transition-colors"
                  >
                    <span>Ver todas</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
              
              {/* Desktop/Tablet: show table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Título</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Enviadas</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Criado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60">
                    {campaigns.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center">
                          <div className="text-slate-400 mb-2">
                            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                            </svg>
                          </div>
                          <p className="text-slate-500 font-medium">Nenhuma campanha encontrada</p>
                          <p className="text-slate-400 text-sm mt-1">Crie sua primeira campanha para começar</p>
                          <div className="mt-4">
                            <Link 
                              to="/campaigns" 
                              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm hover:shadow"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                              </svg>
                              Criar Primeira Campanha
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      campaigns.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-slate-900">{c.subject || c.title || c.name || 'Sem título'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-600">{c.metrics?.sent ?? c.sent ?? c.sentCount ?? (c.to || []).length}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              c.status === 'sent' ? 'bg-green-100 text-green-800' :
                              c.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                              c.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                              c.status === 'active' ? 'bg-green-100 text-green-800' :
                              c.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                              'bg-slate-100 text-slate-800'
                            }`}>
                              {(() => {
                                const s = c.status || ''
                                if (s === 'sent') return 'Enviado'
                                if (s === 'scheduled') return 'Agendada'
                                if (s === 'draft') return 'Rascunho'
                                if (s === 'active') return 'Ativo'
                                if (s === 'completed') return 'Concluído'
                                return s || '—'
                              })()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            {c.createdAt ? new Date((c.createdAt?.seconds || c.createdAt) * (c.createdAt?.seconds ? 1000 : 1)).toLocaleDateString('pt-BR') : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile: stacked cards */}
              <div className="md:hidden px-4 py-3">
                {campaigns.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-slate-400 mb-2">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                      </svg>
                    </div>
                    <p className="text-slate-500 font-medium">Nenhuma campanha encontrada</p>
                    <p className="text-slate-400 text-sm mt-1">Crie sua primeira campanha para começar</p>
                    <div className="mt-4">
                      <Link 
                        to="/campaigns" 
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm hover:shadow"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Criar Primeira Campanha
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {campaigns.map(c => (
                      <div key={c.id} className="p-4 bg-white rounded-xl shadow-sm border border-slate-200/60">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-900 truncate">{c.subject || c.title || c.name || 'Sem título'}</div>
                            <div className="text-xs text-slate-500 mt-1">{c.createdAt ? new Date((c.createdAt?.seconds || c.createdAt) * (c.createdAt?.seconds ? 1000 : 1)).toLocaleDateString('pt-BR') : '—'}</div>
                          </div>
                            <div className="text-right text-xs text-slate-500">
                              <div>{(c.metrics?.sent ?? c.sent ?? c.sentCount) ? `${c.metrics?.sent ?? c.sent ?? c.sentCount} enviados` : '—'}</div>
                              <div className="mt-1"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                c.status === 'sent' ? 'bg-green-100 text-green-800' :
                                c.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                c.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                                c.status === 'active' ? 'bg-green-100 text-green-800' :
                                c.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                'bg-slate-100 text-slate-800'
                              }`}>{(() => {
                                const s = c.status || ''
                                if (s === 'sent') return 'Enviado'
                                if (s === 'scheduled') return 'Agendada'
                                if (s === 'draft') return 'Rascunho'
                                if (s === 'active') return 'Ativo'
                                if (s === 'completed') return 'Concluído'
                                return s || '—'
                              })()}</span></div>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <Link to="/campaigns" className="text-sm text-indigo-600 font-medium">Ver</Link>
                          <button onClick={() => { /* trigger test send or navigate to edit */ }} className="text-sm text-gray-600">Enviar teste</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}