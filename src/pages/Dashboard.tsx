// React import not required with the new JSX transform
import { useAuthState } from 'react-firebase-hooks/auth'
import './Dashboard.css'
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
        }, (err) => console.error('subscription-by-email snapshot error', err))
      }
    }, (err) => console.error('subscription snapshot error', err))

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
      }, (err) => console.error('campaigns snapshot error', err))
      return () => unsub()
    } catch (e) {
      console.error('campaigns listener error', e)
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
      }, (err) => console.error('contacts snapshot error', err))
      return () => unsub()
    } catch (e) {
      console.error('contacts listener error', e)
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
          <aside className="col-span-1 bg-white p-4 rounded shadow">
            <div className="mb-4">
              <h3 className="text-sm text-gray-500">Conta</h3>
              <div className="font-medium">{user.email}</div>
            </div>
            <nav className="flex flex-col gap-2">
              <Link to="/dashboard" className="text-sm text-indigo-600">Visão Geral</Link>
              <Link to="/campaigns" className="text-sm text-gray-700">Campanhas</Link>
              <Link to="/contacts" className="text-sm text-gray-700">Contatos</Link>
              <Link to="/reports" className="text-sm text-gray-700">Relatórios</Link>
              <Link to="/settings" className="text-sm text-gray-700">Configurações</Link>
            </nav>
          </aside>

          <main className="col-span-1 lg:col-span-3">
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-white rounded shadow">
                <div className="text-sm text-gray-500">Contatos</div>
                <div className="mt-2 text-2xl font-bold">{contactsCount ?? '—'}</div>
                <div className="text-xs text-gray-400 mt-1">Total de contatos importados</div>
              </div>

              <div className="p-4 bg-white rounded shadow">
                <div className="text-sm text-gray-500">Campanhas (recentes)</div>
                <div className="mt-2 text-2xl font-bold">{campaignsSent}</div>
                <div className="text-xs text-gray-400 mt-1">Campanhas mostradas: {campaigns.length}</div>
              </div>

              <div className="p-4 bg-white rounded shadow">
                <div className="text-sm text-gray-500">Taxa de abertura</div>
                <div className="mt-2 text-2xl font-bold">{openRate != null ? `${openRate}%` : '—'}</div>
                <div className="text-xs text-gray-400 mt-1">Média das campanhas recentes</div>
              </div>
            </section>

            <section className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold">Campanhas recentes</h2>
                <Link to="/campaigns" className="text-sm text-indigo-600">Ver todas</Link>
              </div>
              <div className="bg-white rounded shadow overflow-auto">
                <table className="min-w-full table-auto">
                  <thead className="text-left text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-3">Título</th>
                      <th className="px-4 py-3">Enviadas</th>
                      <th className="px-4 py-3">Aberturas</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Criado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">Nenhuma campanha encontrada</td></tr>
                    )}
                    {campaigns.map(c => (
                      <tr key={c.id} className="border-t">
                        <td className="px-4 py-3">{c.title || c.name || 'Sem título'}</td>
                        <td className="px-4 py-3">{c.sentCount ?? '—'}</td>
                        <td className="px-4 py-3">{c.openRate ? `${c.openRate}%` : (c.stats?.openRate ? `${c.stats.openRate}%` : '—')}</td>
                        <td className="px-4 py-3">{c.status || '—'}</td>
                        <td className="px-4 py-3">{c.createdAt ? new Date((c.createdAt?.seconds || c.createdAt) * (c.createdAt?.seconds ? 1000 : 1)).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">Atividade recente</h2>
              <div className="bg-white rounded shadow p-4">
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
