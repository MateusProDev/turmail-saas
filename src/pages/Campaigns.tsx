import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Campaigns(){
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Campanhas</h1>
        <div>
          <Link to="/dashboard" className="text-sm text-gray-600 mr-3">Voltar</Link>
          <button className="bg-indigo-600 text-white px-3 py-1 rounded">Nova Campanha</button>
        </div>
      </header>

      <section className="mb-6">
        <div className="text-sm text-gray-500 mb-2">Lista de campanhas recentes</div>
        <div className="bg-white rounded shadow p-4 text-sm text-gray-600">Nenhuma campanha ainda. Use "Nova Campanha" para começar.</div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Enviar teste rápido</h2>
        <p className="text-sm text-gray-500 mb-2">Use o endpoint server-side para enviar um email de teste (Brevo).</p>
        <div className="flex gap-2">
          <button className="px-3 py-2 bg-indigo-600 text-white rounded" disabled={sending} onClick={async () => {
            setSending(true); setResult(null)
            try {
              const resp = await fetch('/api/send-campaign', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({sender:{name:'Test',email:'no-reply@example.com'},to:[{email:'test@example.com',name:'Teste'}],subject:'Teste Brevo',htmlContent:'<p>Teste de envio</p>'})})
              const data = await resp.json()
              setResult(JSON.stringify(data))
            } catch (e: any) {
              setResult(String(e.message || e))
            } finally { setSending(false) }
          }}>{sending ? 'Enviando...' : 'Enviar teste'}</button>
          <div className="text-sm text-gray-500">{result ? <pre className="mt-2 text-xs bg-slate-100 p-2 rounded">{result}</pre> : null}</div>
        </div>
      </section>
    </div>
  )
}
