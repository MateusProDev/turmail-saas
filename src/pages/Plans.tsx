import { useState } from 'react'
import './Plans.css'
import { createCheckoutSession } from '../lib/stripe'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth, db } from '../lib/firebase'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'

const PLANS: { id: string; name: string; price: string; priceIdEnv?: string }[] = [
  { id: 'free', name: 'Free', price: 'R$0/mês' },
  { id: 'pro', name: 'Pro', price: 'R$29/mês', priceIdEnv: 'VITE_STRIPE_PRICE_PRO' },
  { id: 'agency', name: 'Agency', price: 'R$99/mês', priceIdEnv: 'VITE_STRIPE_PRICE_AGENCY' },
]

export default function Plans() {
  const [loading, setLoading] = useState(false)
  const [user] = useAuthState(auth)
  const navigate = useNavigate()

  const handleCheckout = async (plan: typeof PLANS[number]) => {
    if (!plan.priceIdEnv) {
      // free plan - create a simple subscription record for the user
      if (!user) {
        alert('Você precisa entrar para selecionar o plano gratuito')
        navigate('/login')
        return
      }
      try {
        setLoading(true)
        await addDoc(collection(db, 'subscriptions'), {
          email: user.email || null,
          uid: user.uid || null,
          ownerUid: user.uid || null,
          planId: 'free',
          status: 'active',
          createdAt: serverTimestamp(),
        })
        alert('Plano gratuito ativado!')
        navigate('/dashboard')
      } catch (err) {
        console.error('failed to set free plan', err)
        alert('Falha ao ativar plano gratuito')
      } finally {
        setLoading(false)
      }
      return
    }

    const priceId = (import.meta.env as any)[plan.priceIdEnv]
    if (!priceId) {
      alert('Price ID não configurado. Verifique suas variáveis de ambiente.')
      return
    }

    try {
      setLoading(true)
      const json = await createCheckoutSession(priceId)
      if (json?.url) {
        window.location.href = json.url
      } else {
        alert('Falha ao iniciar checkout')
      }
    } catch (err) {
      console.error(err)
      alert('Erro no checkout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Planos</h1>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((p) => (
          <div key={p.id} className="border rounded p-4 bg-white">
            <h2 className="font-semibold">{p.name}</h2>
            <p className="text-gray-600 mt-2">{p.price}</p>
            <div className="mt-4">
              <button
                className="px-4 py-2 bg-indigo-600 text-white rounded"
                onClick={() => handleCheckout(p)}
                disabled={loading}
              >
                {p.price === 'R$0/mês' ? 'Escolher' : 'Assinar'}
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-gray-500">Nota: configure `VITE_STRIPE_PRICE_PRO` e `VITE_STRIPE_PRICE_AGENCY` no `.env` ou no painel do Vercel.</p>
    </div>
  )
}
