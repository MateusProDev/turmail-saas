// React import not required with the new JSX transform
import { useAuthState } from 'react-firebase-hooks/auth'
// Use Tailwind for all styles in this file
import { auth, db } from '../lib/firebase'
import { useEffect, useState, useMemo, useRef } from 'react'
import { collection, query, where, onSnapshot, orderBy, limit, doc, getDoc } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { Link, useNavigate } from 'react-router-dom'

// Helper function to compute open rate

export default function Dashboard(){
  const [user, loading, error] = useAuthState(auth)
  const [subscription, setSubscription] = useState<any>(null)
  const [brevoStats, setBrevoStats] = useState<any>(null)
  const [loadingBrevo, setLoadingBrevo] = useState(false)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [tenant, setTenant] = useState<any>(null)
  const navigate = useNavigate()

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Check for checkout success in URL
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const checkoutSuccess = params.get('checkout')
    
    if (checkoutSuccess === 'success') {
      // Show success toast
      setShowSuccessToast(true)
      setTimeout(() => setShowSuccessToast(false), 5000)
      
      // Clean URL
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [])

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
        console.log('[Dashboard] My tenants response:', data)
        
        if (data.tenants && data.tenants.length > 0) {
          const firstTenant = data.tenants[0]
          console.log('[Dashboard] Found tenant:', firstTenant.tenantId)
          setTenantId(firstTenant.tenantId)
          
          // Buscar dados completos do tenant incluindo logoUrl
          const tenantRef = doc(db, 'tenants', firstTenant.tenantId)
          const tenantSnap = await getDoc(tenantRef)
          if (tenantSnap.exists()) {
            setTenant({ id: tenantSnap.id, ...tenantSnap.data() })
          }
        } else {
          console.log('[Dashboard] No tenant found for user')
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
        setTenant({ id: snap.id, ...snap.data() })
        console.log('[Dashboard] Tenant data updated:', snap.data())
      }
    })
    
    return () => unsubscribe()
  }, [tenantId])

  // subscription listener (ownerUid preferred, fallback to email)
  useEffect(() => {
    if (!user) return
    const subsRef = collection(db, 'subscriptions')
    const qByUid = query(subsRef, where('ownerUid', '==', user.uid))
    let unsubUid: any = null
    let unsubEmail: any = null

    const handleSnap = (snap: any) => {
      if (!snap.empty) {
        const doc = snap.docs[0]
        setSubscription({ id: doc.id, ...doc.data() })
        return true
      }
      return false
    }

    unsubUid = onSnapshot(qByUid, (snap) => {
      const found = handleSnap(snap)
      if (!found && user.email) {
        if (unsubEmail) unsubEmail()
        const qByEmail = query(subsRef, where('email', '==', user.email))
        unsubEmail = onSnapshot(qByEmail, (snap2) => {
          if (!snap2.empty) {
            const doc = snap2.docs[0]
            setSubscription({ id: doc.id, ...doc.data() })
          } else {
            setSubscription(null)
          }
        }, (err) => {
          console.error('subscription-by-email snapshot error', err)
          setSubscription(null)
        })
      }
    }, (err) => {
      console.error('subscription snapshot error', err)
      setSubscription(null)
    })

    return () => {
      if (unsubUid) unsubUid()
      if (unsubEmail) unsubEmail()
    }
  }, [user])

  // recent campaigns listener
  const [campaigns, setCampaigns] = useState<any[]>([])
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
        console.log('[Dashboard] Fetching Brevo stats for tenant:', tenantId)
        
        const resp = await fetch(`/api/get-brevo-stats?tenantId=${tenantId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        const data = await resp.json()
        console.log('[Dashboard] Brevo stats response:', data)
        
        if (data.success && data.stats) {
          console.log('[Dashboard] Stats received:', {
            hasAccount: !!data.stats.account,
            hasEmailStats: !!data.stats.emailStats,
            hasCampaigns: !!data.stats.campaigns,
            emailStats: data.stats.emailStats,
            errors: data.stats.errors
          })
          
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

  // derived metrics (hooks must be called unconditionally)
  // Removed unused getOpenRateNumeric function

  // const openRate = useMemo(() => {
  //   const rates = campaigns.map(c => getOpenRateNumeric(c)).filter((r: any) => typeof r === 'number')
  //   if (!rates.length) return null
  //   const sum = rates.reduce((s: number, v: number) => s + v, 0)
  //   return Math.round((sum / rates.length) * 100) / 100
  // }, [campaigns])

    // delivery rate (successful deliveries / sent)
    const getDeliveredCount = (c: any) => {
      return c?.metrics?.delivered ?? c?.delivered ?? c?.stats?.delivered ?? null
    }
    const getSentCount = (c: any) => {
      return c?.metrics?.sent ?? c?.sent ?? c?.sentCount ?? (c?.to || []).length ?? 0
    }

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
    const totals = campaigns.reduce((acc: { sent: number; delivered: number }, c: any) => {
      const sent = Number(getSentCount(c) || 0)
      const delivered = Number(getDeliveredCount(c) || 0)
      return { sent: acc.sent + sent, delivered: acc.delivered + delivered }
    }, { sent: 0, delivered: 0 })
    if (!totals.sent) return null
    // If there were sent emails but no delivered metric recorded, show 100% per user preference
    if (totals.delivered === 0) return 100
    return Math.round((totals.delivered / totals.sent) * 10000) / 100
  }, [campaigns, brevoStats])

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

  if(loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600 font-medium">Carregando seu dashboard...</p>
      </div>
    </div>
  )
  
  if(error) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 text-center mb-2">Erro ao carregar</h2>
        <p className="text-slate-600 text-center mb-6">Ocorreu um erro: {String(error)}</p>
        <button 
          onClick={() => window.location.reload()}
          className="w-full bg-indigo-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    </div>
  )
  
  if(!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4 mx-auto">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 text-center mb-2">Acesso necessário</h2>
          <p className="text-slate-600 text-center mb-6">Você precisa entrar para acessar o dashboard.</p>
          <Link 
            to="/login" 
            className="block w-full bg-indigo-600 text-white text-center py-3 px-4 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            Ir para Login
          </Link>
        </div>
      </div>
    )
  }

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/login')
  }

  const toDate = (t: any) => {
    if (!t) return null
    if (typeof t.toDate === 'function') return t.toDate()
    if (t.seconds) return new Date(t.seconds * 1000)
    return new Date(t)
  }

  // compute trial badge info
  const trialInfo = (() => {
    try {
      if (!subscription || !subscription.trialEndsAt) return null
      const end = toDate(subscription.trialEndsAt)
      if (!end) return null
      const diff = end.getTime() - Date.now()
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
      return { days, expired: diff <= 0 }
    } catch (e) { return null }
  })()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 z-50 animate-slideInRight">
          <div className="bg-white rounded-xl shadow-2xl border-2 border-green-200 p-4 max-w-md">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-green-900 text-sm">🎉 Pagamento Confirmado!</h3>
                <p className="text-green-700 text-xs mt-1">Seu plano foi ativado com sucesso. Aproveite todos os recursos!</p>
              </div>
              <button 
                onClick={() => setShowSuccessToast(false)}
                className="flex-shrink-0 text-green-600 hover:text-green-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200/60 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              {tenant?.logoUrl ? (
                <img 
                  src={tenant.logoUrl} 
                  alt="Logo" 
                  className="w-8 h-8 rounded-lg object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">M</span>
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  Dashboard
                </h1>
                <p className="text-sm text-slate-500">Visão geral da sua conta</p>
              </div>
            </div>

            {/* User Menu */}
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center space-x-3 bg-white/60 hover:bg-white/80 border border-slate-200/60 rounded-xl px-3 py-2 transition-all duration-200 hover:shadow-sm"
              >
                <div className="flex items-center space-x-2">
                  {tenant?.logoUrl ? (
                    <img 
                      src={tenant.logoUrl} 
                      alt="Logo" 
                      className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                      {user && user.displayName ? user.displayName.split(' ').map(s=>s[0]).slice(0,2).join('') : (user && user.email ? user.email[0].toUpperCase() : 'U')}
                    </div>
                  )}
                  <div className="text-left hidden sm:block">
                    <div className="text-sm font-medium text-slate-900">{user.email}</div>
                    <div className="text-xs text-slate-500">Conta {trialInfo && `• ${trialInfo.expired ? 'Trial Expirado' : `Trial ${trialInfo.days}d`}`}</div>
                  </div>
                </div>
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white/95 backdrop-blur-lg rounded-xl shadow-lg border border-slate-200/60 py-2 z-50">
                  <Link 
                    to="/settings" 
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50/80 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Meu Perfil</span>
                  </Link>
                  <Link 
                    to="/plans" 
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50/80 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    <span>Planos</span>
                  </Link>
                  <div className="border-t border-slate-200/60 my-1"></div>
                  <button 
                    onClick={() => { setMenuOpen(false); handleLogout(); }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50/80 transition-colors"
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-sm border border-slate-200/60 p-6">
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
                <h3 className="font-semibold text-slate-900 truncate">{user.email}</h3>
                <p className="text-sm text-slate-500 mt-1">Membro</p>
                {trialInfo && (
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mt-2 ${
                    trialInfo.expired 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {trialInfo.expired ? 'Trial Expirado' : `Trial • ${trialInfo.days} dias`}
                  </div>
                )}
              </div>

              {/* Navigation */}
              <nav className="space-y-1">
                <Link 
                  to="/dashboard" 
                  className="flex items-center space-x-3 p-3 rounded-xl bg-indigo-50 text-indigo-700 font-medium transition-all duration-200 group"
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
                  className="flex items-center space-x-3 p-3 rounded-xl text-slate-700 hover:bg-slate-50/80 font-medium transition-all duration-200 group"
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
                  className="flex items-center space-x-3 p-3 rounded-xl text-slate-700 hover:bg-slate-50/80 font-medium transition-all duration-200 group"
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
                  className="flex items-center space-x-3 p-3 rounded-xl text-slate-700 hover:bg-slate-50/80 font-medium transition-all duration-200 group"
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
                  className="flex items-center space-x-3 p-3 rounded-xl text-slate-700 hover:bg-slate-50/80 font-medium transition-all duration-200 group"
                >
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow transition-shadow">
                    <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 0 1 2.3 17.3l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09c.7 0 1.29-.41 1.51-1a1.65 1.65 0 0 0-.33-1.82L4.3 6.7A2 2 0 0 1 7.13 3.87l.06.06a1.65 1.65 0 0 0 1.82.33c.45-.26.97-.4 1.51-.4H12c.54 0 1.06.14 1.51.4.63.36 1.38.36 2.01 0 .45-.26.97-.4 1.51-.4H20a2 2 0 0 1 0 4h-.09c-.7 0-1.29.41-1.51 1-.26.86.07 1.82.33 1.82l.06.06A2 2 0 0 1 19.4 15z" />
                    </svg>
                  </div>
                  <span>Configurações</span>
                </Link>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3 space-y-6">
            {/* Alerta: Configurar Brevo */}
            {!loadingBrevo && !brevoStats?.account && !brevoStats?.emailStats && brevoStats?.errors && (
              <div className="bg-red-50 border-l-4 border-red-400 rounded-xl p-5">
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
                        className="inline-flex items-center px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 text-sm font-medium rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                        </svg>
                        Gerar Nova Chave Brevo
                      </a>
                      <Link 
                        to="/settings" 
                        className="inline-flex items-center px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-300 transition-colors"
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
              <div className="bg-amber-50 border-l-4 border-amber-400 rounded-xl p-5">
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
                        className="inline-flex items-center px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-medium rounded-lg transition-colors"
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
            
            {/* Brevo Account Info Banner */}
            {brevoStats?.account && (
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl shadow-sm p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      <span className="font-semibold">Conta Brevo Conectada</span>
                    </div>
                    <p className="text-emerald-50 text-sm">
                      {brevoStats.account.email || brevoStats.account.companyName || 'Sua conta'}
                    </p>
                    {brevoStats.account.plan && (
                      <p className="text-emerald-100 text-xs mt-1">
                        Plano: {brevoStats.account.plan[0]?.type || 'Standard'}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{brevoStats.account.plan?.[0]?.credits || '—'}</div>
                    <div className="text-emerald-100 text-sm">Créditos disponíveis</div>
                  </div>
                </div>
              </div>
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
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
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
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
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
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
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
                    <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
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
                      <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
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
                      <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
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
                      <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
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
                      {/* <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Aberturas</th> */}
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
                          {/* <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-600">
                              {c.metrics?.opens ?? c.opens ?? (c.openRate ? `${c.openRate}%` : (c.stats?.openRate ? `${c.stats.openRate}%` : '—'))}
                            </div>
                          </td> */}
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

