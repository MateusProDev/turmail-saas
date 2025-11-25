import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Settings(){
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const testBrevo = async () => {
    setTesting(true); setResult(null)
    try {
      const res = await fetch('/api/send-campaign', { method: 'OPTIONS' })
      setResult(`Brevo endpoint reachable (status ${res.status})`)
    } catch (e: any) {
      setResult(String(e.message || e))
    } finally { setTesting(false) }
  }

  const [brevoKey, setBrevoKey] = useState('')
  const [saving, setSaving] = useState(false)

  const saveToVercel = async () => {
    setSaving(true); setResult(null)
    try {
      // get id token to authenticate with server
      const token = await (window as any).firebase?.auth()?.currentUser?.getIdToken()
      // if using react-firebase-hooks, fallback to calling endpoint without token will fail
      const headers: any = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const resp = await fetch('/api/set-brevo-key', {
        method: 'POST',
        headers,
        body: JSON.stringify({ key: brevoKey }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(JSON.stringify(data))
      setResult(`Saved: ${data.action}`)
    } catch (e: any) {
      setResult(String(e.message || e))
    } finally { setSaving(false) }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Configurações</h1>
        <Link to="/dashboard" className="text-sm text-gray-600">Voltar</Link>
      </header>

      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-medium">Integração Brevo</h2>
        <p className="text-sm text-gray-500 mb-2">A chave da Brevo deve ficar no servidor (variável de ambiente <code>BREVO_API_KEY</code>). Não insira sua chave diretamente no cliente.</p>
        <div className="flex items-center gap-2 mb-3">
          <button onClick={testBrevo} disabled={testing} className="px-3 py-2 bg-indigo-600 text-white rounded">Testar integração Brevo</button>
          {result ? <div className="text-sm text-gray-600">{result}</div> : null}
        </div>

        <div className="mt-4">
          <label className="block text-sm text-slate-600 mb-2">Inserir chave Brevo (será salva no Vercel)</label>
          <div className="flex gap-2">
            <input value={brevoKey} onChange={e => setBrevoKey(e.target.value)} className="flex-1 border rounded px-3 py-2" placeholder="sk_live_xxx" />
            <button onClick={saveToVercel} disabled={saving} className="px-3 py-2 bg-green-600 text-white rounded">Salvar na Vercel</button>
          </div>
          <div className="text-xs text-gray-500 mt-2">Requer que o servidor possua `VERCEL_TOKEN` e `VERCEL_PROJECT_ID` e que você esteja autenticado com permissão (ADMIN_UID/ADMIN_EMAIL opcional).</div>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4">
        <h2 className="font-medium">Preferências</h2>
        <div className="text-sm text-gray-500 mt-2">Aqui você poderá ajustar preferências da conta, notificações e integrações.</div>
      </div>
    </div>
  )
}
