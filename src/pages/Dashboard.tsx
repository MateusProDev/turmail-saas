// React import not required with the new JSX transform
import { useAuthState } from 'react-firebase-hooks/auth'
// Use Tailwind for all styles in this file
import { auth, db } from '../lib/firebase'
import { useEffect, useState, useMemo } from 'react'
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { Link, useNavigate } from 'react-router-dom'

export default function Dashboard(){
  const [user, loading, error] = useAuthState(auth)
  const [subscription, setSubscription] = useState<any>(null)
  const navigate = useNavigate()

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

  // derived metrics (hooks must be called unconditionally)
  const campaignsSent = useMemo(() => campaigns.length, [campaigns])
  const openRate = useMemo(() => {
    const rates = campaigns.map(c => (c.openRate || c.stats?.openRate)).filter(Boolean)
    if (!rates.length) return null
    const sum = rates.reduce((s: number, v: number) => s + v, 0)
    return Math.round((sum / rates.length) * 100) / 100
  }, [campaigns])

  if(loading) return <div>Carregando...</div>
  if(error) return <div>Erro: {String(error)}</div>
  if(!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Acesso necessário</h1>
        <p>Você precisa entrar para acessar o dashboard.</p>
        <div className="mt-4">
          <Link to="/login" className="text-indigo-600">Ir para Login</Link>
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


  return (
    <div className="dashboard p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Painel</h1>
            <p className="text-sm text-gray-600">Visão geral da sua conta e atividade</p>
          </div>
          <div className="flex items-center gap-3">
            {subscription && subscription.trialEndsAt && (function() {
              const end = toDate(subscription.trialEndsAt)
              if (!end) return <span className="text-xs text-gray-500">Aguardando ativação do teste...</span>
              const active = end.getTime() > Date.now()
              return active ? (
                <div className="inline-block mr-2">
                  <CountdownDisplay end={end} />
                </div>
              ) : <span className="text-xs text-red-600">Teste expirado</span>
            })()}
            <button onClick={handleLogout} className="btn-ghost">Sair</button>
            <Link to="/plans" className="btn-outline ml-3">Ver Planos</Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="col-span-1 bg-white rounded-lg shadow p-4 flex flex-col gap-3 min-w-0">
            <div className="mb-4 flex flex-col items-start gap-2">
              <h3 className="text-sm text-gray-500 flex items-center gap-2">
                <span style={{display:'inline-flex',alignItems:'center'}}>
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#6366f1" style={{marginRight:8}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12A4 4 0 1 1 8 12a4 4 0 0 1 8 0ZM12 14v4m0 0H8m4 0h4"/></svg>
                  Conta
                </span>
              </h3>
              <div className="break-all bg-slate-50 px-2 py-1 rounded w-full flex items-center gap-2 text-[0.35rem] text-slate-400 leading-none">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" style={{marginRight:8}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z"/></svg>
                {user.email}
              </div>
            </div>
            <nav className="flex flex-col gap-2 w-full">
              <Link to="/dashboard" className="flex items-center gap-2 p-2 rounded w-full text-sm text-indigo-600 hover:bg-slate-100">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M3 13h8V3H3v10zM13 21h8V11h-8v10zM13 3v6h8" />
                </svg>
                <span>Visão Geral</span>
              </Link>
              <Link to="/campaigns" className="flex items-center gap-2 p-2 rounded w-full text-sm text-gray-700 hover:bg-slate-100">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M22 12v2a2 2 0 0 1-2 2h-3l-4 3v-8l4-3h3a2 2 0 0 1 2 2v2zM2 12h4" />
                </svg>
                <span>Campanhas</span>
              </Link>
              <Link to="/contacts" className="flex items-center gap-2 p-2 rounded w-full text-sm text-gray-700 hover:bg-slate-100">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>Contatos</span>
              </Link>
              <Link to="/reports" className="flex items-center gap-2 p-2 rounded w-full text-sm text-gray-700 hover:bg-slate-100">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M3 3v18h18" />
                  <path d="M7 13v5" />
                  <path d="M12 9v9" />
                  <path d="M17 5v13" />
                </svg>
                <span>Relatórios</span>
              </Link>
              <Link to="/settings" className="flex items-center gap-2 p-2 rounded w-full text-sm text-gray-700 hover:bg-slate-100">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 0 1 2.3 17.3l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09c.7 0 1.29-.41 1.51-1a1.65 1.65 0 0 0-.33-1.82L4.3 6.7A2 2 0 0 1 7.13 3.87l.06.06a1.65 1.65 0 0 0 1.82.33c.45-.26.97-.4 1.51-.4H12c.54 0 1.06.14 1.51.4.63.36 1.38.36 2.01 0 .45-.26.97-.4 1.51-.4H20a2 2 0 0 1 0 4h-.09c-.7 0-1.29.41-1.51 1-.26.86.07 1.82.33 1.82l.06.06A2 2 0 0 1 19.4 15z" />
                </svg>
                <span>Configurações</span>
              </Link>
            </nav>
          </aside>

          <main className="col-span-1 lg:col-span-3">
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow p-4 flex flex-col gap-2 min-w-0">
                <div className="text-sm text-slate-500 font-medium">Contatos</div>
                <div className="text-2xl font-bold text-slate-900">{contactsCount ?? '—'}</div>
                <div className="text-sm text-slate-400">Total de contatos importados</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 flex flex-col gap-2 min-w-0">
                <div className="text-sm text-slate-500 font-medium">Campanhas (recentes)</div>
                <div className="text-2xl font-bold text-slate-900">{campaignsSent}</div>
                <div className="text-sm text-slate-400">Campanhas mostradas: {campaigns.length}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 flex flex-col gap-2 min-w-0">
                <div className="text-sm text-slate-500 font-medium">Taxa de abertura</div>
                <div className="text-2xl font-bold text-slate-900">{openRate != null ? `${openRate}%` : '—'}</div>
                <div className="text-sm text-slate-400">Média das campanhas recentes</div>
              </div>
            </section>

            <section className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold">Campanhas recentes</h2>
                <Link to="/campaigns" className="text-sm text-indigo-600">Ver todas</Link>
              </div>
              <div className="overflow-x-auto bg-white rounded-lg shadow p-4">
                <table className="min-w-full table-auto">
                  <thead className="text-left text-xs text-gray-500 uppercase">
                    <tr>
                      <th>Título</th>
                      <th>Enviadas</th>
                      <th>Aberturas</th>
                      <th>Status</th>
                      <th>Criado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">Nenhuma campanha encontrada</td></tr>
                    )}
                    {campaigns.map(c => (
                      <tr key={c.id} className="border-t">
                        <td>{c.title || c.name || 'Sem título'}</td>
                        <td>{c.sentCount ?? '—'}</td>
                        <td>{c.openRate ? `${c.openRate}%` : (c.stats?.openRate ? `${c.stats.openRate}%` : '—')}</td>
                        <td>{c.status || '—'}</td>
                        <td>{c.createdAt ? new Date((c.createdAt?.seconds || c.createdAt) * (c.createdAt?.seconds ? 1000 : 1)).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-2">Atividade recente</h2>
              <div className="p-4 bg-white rounded-lg shadow">
                <ActivityFeed campaigns={campaigns} />
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}

function ActivityFeed({ campaigns }: { campaigns: any[] }) {
  if (!campaigns || campaigns.length === 0) {
    return <div className="text-sm text-gray-500">Nenhuma atividade recente.</div>
  }
  return (
    <ul className="space-y-3">
      {campaigns.map(c => (
        <li key={c.id} className="flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2" />
          <div>
            <div className="text-sm font-medium">{c.title || c.name || 'Campanha'}</div>
            <div className="text-xs text-gray-500">{c.sentCount ? `${c.sentCount} enviados` : 'Agendada/rascunho' } • {c.status || '—'}</div>
          </div>
        </li>
      ))}
    </ul>
  )
}

function CountdownDisplay({ end }: { end: Date }) {
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, end.getTime() - Date.now()))

  useEffect(() => {
    const tick = () => setRemainingMs(Math.max(0, end.getTime() - Date.now()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [end])

  if (remainingMs <= 0) return <div className="mt-1 text-xs text-red-600">Teste expirado</div>

  const totalSec = Math.floor(remainingMs / 1000)
  const days = Math.floor(totalSec / (3600 * 24))
  const hours = Math.floor((totalSec % (3600 * 24)) / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60

  const two = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="mt-1 text-sm">
      <span className="font-medium">Tempo restante: </span>
      {days > 0 ? <span>{days} dia(s) </span> : null}
      <span>{two(hours)}:{two(minutes)}:{two(seconds)}</span>
    </div>
  )
}
