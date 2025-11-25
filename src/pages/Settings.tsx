import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Settings(){
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const testBrevo = async () => {
    setTesting(true); setResult(null)
    try {
      // Use a lightweight ping endpoint instead of OPTIONS to avoid 405.
      const res = await fetch('/api/ping')
      if (!res.ok) throw new Error(`status ${res.status}`)
      setResult(`Brevo endpoint reachable (status ${res.status})`)
    } catch (e: any) {
      setResult(String(e.message || e))
    } finally { setTesting(false) }
  }

  const [brevoKey, setBrevoKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [showBrevoKey, setShowBrevoKey] = useState(false)
  const [tenantKey, setTenantKey] = useState('')
  const [savingTenant, setSavingTenant] = useState(false)
  const [showTenantKey, setShowTenantKey] = useState(false)

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
      setBrevoKey('')
      setShowBrevoKey(false)
    } catch (e: any) {
      setResult(String(e.message || e))
    } finally { setSaving(false) }
  }

  const saveTenantKey = async () => {
    setSavingTenant(true); setResult(null)
    try {
      const token = await (window as any).firebase?.auth()?.currentUser?.getIdToken()
      if (!token) throw new Error('User not authenticated')

      // Call endpoint without tenantId; backend will infer tenant for this user
      const resp = await fetch('/api/tenant/set-brevo-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ key: tenantKey }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(JSON.stringify(data))
      setResult('Chave salva para o tenant')
      setTenantKey('')
      setShowTenantKey(false)
    } catch (e: any) {
      // try to show backend-provided tenants list if present
      try {
        const parsed = JSON.parse(String(e.message || e))
        if (parsed && parsed.tenants) {
          setResult('Múltiplos tenants encontrados: ' + parsed.tenants.join(', ') + '. Especifique manualmente.')
        } else {
          setResult(String(e.message || e))
        }
      } catch (_) {
        setResult(String(e.message || e))
      }
    } finally { setSavingTenant(false) }
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
          <div className="flex gap-2 items-center">
            <input value={brevoKey} onChange={e => setBrevoKey(e.target.value)} type={showBrevoKey ? 'text' : 'password'} className="flex-1 border rounded px-3 py-2" placeholder="sk_live_xxx" />
            <button onClick={() => setShowBrevoKey(s => !s)} type="button" className="px-2 py-1 border rounded text-sm">{showBrevoKey ? 'Ocultar' : 'Mostrar'}</button>
            <button onClick={saveToVercel} disabled={saving} className="px-3 py-2 bg-green-600 text-white rounded">Salvar na Vercel</button>
          </div>
          <div className="text-xs text-gray-500 mt-2">Requer que o servidor possua `VERCEL_TOKEN` e `VERCEL_PROJECT_ID` e que você esteja autenticado com permissão (ADMIN_UID/ADMIN_EMAIL opcional).</div>
        </div>
      </div>
      
      <div className="bg-white rounded shadow p-4 mt-4">
        <h2 className="font-medium">Chave Brevo por Tenant</h2>
        <p className="text-sm text-gray-500 mb-2">Cada tenant pode usar sua própria chave. Cole a chave abaixo; o sistema tentará identificar automaticamente seu tenant.</p>
        <div className="grid grid-cols-1 gap-2">
          <div className="flex gap-2 items-center">
            <input value={tenantKey} onChange={e => setTenantKey(e.target.value)} type={showTenantKey ? 'text' : 'password'} className="flex-1 border rounded px-3 py-2" placeholder="chave Brevo do tenant" />
            <button onClick={() => setShowTenantKey(s => !s)} type="button" className="px-2 py-1 border rounded text-sm">{showTenantKey ? 'Ocultar' : 'Mostrar'}</button>
          </div>
          <div className="flex gap-2">
            <button onClick={saveTenantKey} disabled={savingTenant} className="px-3 py-2 bg-indigo-600 text-white rounded">Salvar para este tenant</button>
            <div className="text-sm text-gray-600">{savingTenant ? 'Salvando...' : null}</div>
          </div>
          <div className="text-xs text-gray-500">Requer que você seja membro `owner` ou `admin` do tenant; se pertencer a vários tenants, especifique manualmente.</div>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4">
        <h2 className="font-medium">Preferências</h2>
        <div className="text-sm text-gray-500 mt-2">Aqui você poderá ajustar preferências da conta, notificações e integrações.</div>
      </div>
    </div>
  )
}
