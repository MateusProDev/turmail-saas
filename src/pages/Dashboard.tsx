// React import not required with the new JSX transform
import { useAuthState } from 'react-firebase-hooks/auth'
import './Dashboard.css'
import { auth, db } from '../lib/firebase'
import { useEffect, useState } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { Link, useNavigate } from 'react-router-dom'

export default function Dashboard(){
  const [user, loading, error] = useAuthState(auth)
  const [subscription, setSubscription] = useState<any>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) return
    const fetchSubscription = async () => {
      try {
        const subsRef = collection(db, 'subscriptions')
        // Use ownerUid to scope subscriptions to the authenticated user
        const q = query(subsRef, where('ownerUid', '==', user.uid))
        const snap = await getDocs(q)
        if (!snap.empty) {
          const doc = snap.docs[0]
          setSubscription({ id: doc.id, ...doc.data() })
        } else {
          setSubscription(null)
        }
      } catch (err) {
        console.error('failed to fetch subscription', err)
      }
    }
    fetchSubscription()
  }, [user])

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

  const features = subscription && subscription.status === 'active'

  return (
    <div className="dashboard p-6">
      <div className="dashboard-top flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-600">Bem-vindo, {user?.email}</p>
        </div>
        <div className="dashboard-actions">
          <button onClick={handleLogout} className="btn-ghost">Sair</button>
          <Link to="/plans" className="btn-outline ml-3">Ver Planos</Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="subscription-card p-4 bg-white rounded shadow">
          <h2 className="font-semibold">Assinatura</h2>
          {subscription ? (
            <div className="mt-2">
              <p className="text-sm">Plano: <strong>{subscription.planName || subscription.planId || subscription.stripePriceId || 'Assinado'}</strong></p>
              <p className="text-sm">Status: <span className={subscription.status === 'active' ? 'text-green-600' : 'text-yellow-600'}>{subscription.status}</span></p>
              {subscription.status === 'trial' && subscription.trialEndsAt && (
                (() => {
                  const toDate = (t: any) => {
                    if (!t) return null
                    if (typeof t.toDate === 'function') return t.toDate()
                    if (t.seconds) return new Date(t.seconds * 1000)
                    return new Date(t)
                  }
                  const trialEnds = toDate(subscription.trialEndsAt)
                  const now = new Date()
                  const daysLeft = trialEnds ? Math.max(0, Math.ceil((trialEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null
                  return (
                    <div className="mt-2 text-sm text-gray-700">
                      <div>Teste válido até: <strong>{trialEnds ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(trialEnds) : '—'}</strong></div>
                      {daysLeft !== null && <div className="text-xs text-gray-500">Dias restantes: {daysLeft} dia(s)</div>}
                    </div>
                  )
                })()
              )}
              <div className="mt-3">
                <Link to="/plans" className="text-indigo-600 text-sm">Alterar plano</Link>
              </div>
            </div>
          ) : (
            <div className="mt-2">
              <p className="text-sm">Você não possui um plano ativo.</p>
              <div className="mt-2">
                <Link to="/plans" className="text-indigo-600 text-sm">Ver planos e assinar</Link>
              </div>
            </div>
          )}
        </div>

        <div className="metrics-card p-4 bg-white rounded shadow">
          <h2 className="font-semibold">Contatos</h2>
          <p className="mt-2 text-3xl font-bold">—</p>
          <p className="text-sm text-gray-500 mt-1">Importe contatos para começar</p>
        </div>

        <div className="actions-card p-4 bg-white rounded shadow">
          <h2 className="font-semibold">Ações</h2>
          <div className="mt-3 flex flex-col gap-2">
            <Link to="/dashboard" className="btn-primary">Criar Campanha</Link>
            <Link to="/plans" className="btn-secondary">Gerenciar Assinatura</Link>
          </div>
        </div>
      </div>

      <div className="mt-6 features">
        <h2 className="font-semibold">Funcionalidades</h2>
        <ul className="mt-2 list-disc list-inside">
          <li>Ver contatos {features ? '(disponível)' : '(bloqueado)'}</li>
          <li>Enviar campanha {features ? '(disponível)' : '(bloqueado)'}</li>
        </ul>
      </div>
    </div>
  )
}
