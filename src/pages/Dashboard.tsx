// React import not required with the new JSX transform
import { useAuthState } from 'react-firebase-hooks/auth'
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
        const q = query(subsRef, where('email', '==', user.email))
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
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div>
          <button onClick={handleLogout} className="text-sm text-gray-600 mr-4">Sair</button>
        </div>
      </div>
      <p className="mt-4">Bem-vindo, {user?.email}</p>

      <div className="mt-6">
        <h2 className="font-semibold">Assinatura</h2>
        {subscription ? (
          <div className="mt-2">
            <p>Plano: {subscription.planName || subscription.stripePriceId || 'Assinado'}</p>
            <p>Status: {subscription.status}</p>
          </div>
        ) : (
          <div className="mt-2">
            <p>Você não possui um plano ativo.</p>
            <Link to="/plans" className="text-indigo-600">Ver planos e assinar</Link>
          </div>
        )}
      </div>

      <div className="mt-6">
        <h2 className="font-semibold">Funcionalidades</h2>
        <ul className="mt-2 list-disc list-inside">
          <li>Ver contatos {features ? '(disponível)' : '(bloqueado)'}</li>
          <li>Enviar campanha {features ? '(disponível)' : '(bloqueado)'}</li>
        </ul>
      </div>
    </div>
  )
}
