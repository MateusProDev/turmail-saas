import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import './Success.css'

export default function Success() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!sessionId) return
    setLoading(true)
    fetch(`/api/get-session?sessionId=${encodeURIComponent(sessionId)}`)
      .then((r) => r.json())
      .then((json) => setSession(json))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (!sessionId) return <div className="p-8">session_id ausente</div>

  return (
    <div className="p-8 success-container">
      <h1 className="text-2xl font-bold">Pagamento concluído</h1>
      {loading && <p>Carregando informações da sessão...</p>}
      {session && (
        <div className="mt-4 session-card shadow">
          <p><strong>Session ID:</strong> {session.id}</p>
          <p><strong>Status:</strong> {session.status}</p>
          <p><strong>Customer email:</strong> {session.customer_details?.email}</p>
          <p><strong>Amount:</strong> {(session.amount_total || session.display_items?.[0]?.amount || 0) / 100}</p>
        </div>
      )}
      {!loading && !session && <p className="mt-4">Não foi possível recuperar a sessão.</p>}
    </div>
  )
}
