import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collectionGroup, query, where, getDocs } from 'firebase/firestore'
import { db, auth } from '../lib/firebase'

export default function Settings(){
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [testSending, setTestSending] = useState(false)
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null)
  const [testMessage, setTestMessage] = useState<string | null>(null)

  const testBrevo = async () => {
    setTesting(true); setResult(null)
    try {
      // Keep ping behavior for legacy; call server-side ping endpoint
      const res = await fetch('/api/ping')
      if (!res.ok) throw new Error(`status ${res.status}`)
      setResult(`Brevo endpoint reachable (status ${res.status})`)
    } catch (e: any) {
      setResult(String(e.message || e))
    } finally { setTesting(false) }
  }

  const sendTestEmailFromUI = async () => {
    setTestSending(true)
    setTestSuccess(null)
    setTestMessage(null)
    try {
      const userEmail = auth.currentUser?.email || 'test@example.com'
      const payload: any = {
        tenantId: selectedTenant || undefined,
        sender: { name: 'TurMail Test', email: `no-reply@${window.location.hostname}` },
        to: [{ email: userEmail }],
        subject: `Teste de envio (${selectedTenant || 'global'})`,
        htmlContent: `<p>Teste de envio do tenant ${selectedTenant || 'global'}</p>`,
      }
      const resp = await fetch('/api/send-campaign', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(JSON.stringify(data))
      setTestSuccess(true)
      setTestMessage(data && data.messageId ? `Enviado (id ${data.messageId})` : 'Enviado com sucesso')
    } catch (err: any) {
      setTestSuccess(false)
      setTestMessage(String(err.message || err))
    } finally {
      setTestSending(false)
    }
  }

  const [brevoKey, setBrevoKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [showBrevoKey, setShowBrevoKey] = useState(false)
  const [tenantKey, setTenantKey] = useState('')
  const [smtpLogin, setSmtpLogin] = useState('')
  const [smtpMemberLevel, setSmtpMemberLevel] = useState(false)
  const [savingTenant, setSavingTenant] = useState(false)
  const [showTenantKey, setShowTenantKey] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null)
  const [tenantOptions, setTenantOptions] = useState<Array<{ id: string, role: string }>>([])
  const [loadingTenants, setLoadingTenants] = useState(false)

  const saveToVercel = async () => {
    setSaving(true); setResult(null)
    try {
      // get id token to authenticate with server
      // safe token retrieval: currentUser may be null while auth initializes
      const getIdTokenSafe = async (force = false) => {
        if (auth.currentUser) {
          try { return await auth.currentUser.getIdToken(force) } catch (e) { return null }
        }
        return await new Promise<string | null>((resolve) => {
          const unsub = auth.onAuthStateChanged(async (u) => {
            unsub()
            if (!u) return resolve(null)
            try { const t = await u.getIdToken(force); resolve(t) } catch (e) { resolve(null) }
          })
        })
      }

      let token = await getIdTokenSafe(false)
      // If no token (or claims recently changed), force refresh once
      if (!token) {
        console.log('[Settings] no token found, forcing refresh')
        try {
          token = await getIdTokenSafe(true)
        } catch (err) {
          console.warn('[Settings] token refresh failed', err)
        }
      }
      console.log('[Settings] saveToVercel invoked; hasToken=', !!token)
      const masked = brevoKey ? `${brevoKey.slice(0,6)}...(${brevoKey.length} chars)` : '<empty>'
      console.log('[Settings] saving global brevo key masked=%s', masked)
      // if using react-firebase-hooks, fallback to calling endpoint without token will fail
      const headers: any = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      else {
        setResult('Não autenticado: atualize a página e faça login novamente (token ausente).')
        setSaving(false)
        return
      }

      const resp = await fetch('/api/set-brevo-key', {
        method: 'POST',
        headers,
        body: JSON.stringify({ key: brevoKey }),
      })
      const data = await resp.json()
      console.log('[Settings] saveToVercel response', resp.status, data)
      if (!resp.ok) throw new Error(JSON.stringify(data))
      setResult(`Saved: ${data.action}`)
      setBrevoKey('')
      setShowBrevoKey(false)
    } catch (e: any) {
      console.error('[Settings] saveToVercel error', e)
      setResult(String(e.message || e))
    } finally { setSaving(false) }
  }

  const saveTenantKey = async () => {
    setSavingTenant(true); setResult(null)
    try {
      const getIdTokenSafe = async (force = false) => {
        if (auth.currentUser) {
          try { return await auth.currentUser.getIdToken(force) } catch (e) { return null }
        }
        return await new Promise<string | null>((resolve) => {
          const unsub = auth.onAuthStateChanged(async (u) => {
            unsub()
            if (!u) return resolve(null)
            try { const t = await u.getIdToken(force); resolve(t) } catch (e) { resolve(null) }
          })
        })
      }

      const token = await getIdTokenSafe(false)
      console.log('[Settings] saveTenantKey invoked; hasToken=', !!token, 'selectedTenant=', selectedTenant)
      const maskedTenant = tenantKey ? `${tenantKey.slice(0,6)}...(${tenantKey.length} chars)` : '<empty>'
      console.log('[Settings] tenantKey masked=%s', maskedTenant)
      if (!token) throw new Error('User not authenticated')
      // Call endpoint with selected tenantId if we auto-detected one, otherwise let backend infer
      const body: any = { key: tenantKey }
      if (selectedTenant) body.tenantId = selectedTenant
      if (smtpLogin) body.smtpLogin = smtpLogin
      if (smtpMemberLevel) body.memberLevel = true

      const resp = await fetch('/api/tenant/set-brevo-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const data = await resp.json()
      console.log('[Settings] saveTenantKey response', resp.status, data)
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

  // Auto-select tenant based on logged-in user's memberships (owner preferred)
  useEffect(() => {
    const unsub = (window as any).firebase?.auth()?.onAuthStateChanged(async (user: any) => {
      if (!user) {
        setSelectedTenant(null)
        return
      }
      try {
        setLoadingTenants(true)
        // Query membership documents by role and filter by doc id (member uid)
        const q = query(collectionGroup(db, 'members'), where('role', 'in', ['owner', 'admin']))
        const snaps = await getDocs(q)
        const tenants: Array<{ id: string, role: string }> = []
        snaps.forEach(s => {
          if (s.id !== user.uid) return
          const role = s.data()?.role || 'member'
          const tenantDoc = s.ref.parent.parent
          if (tenantDoc && tenantDoc.id) tenants.push({ id: tenantDoc.id, role })
        })
        console.log('[Settings] loaded tenant memberships for uid=%s count=%d', user.uid, tenants.length)
        if (tenants.length === 0) {
          setSelectedTenant(null)
          setTenantOptions([])
        } else {
          // prefer owner then admin then first
          const owner = tenants.find(t => t.role === 'owner')
          const admin = tenants.find(t => t.role === 'admin')
          const chosen = owner ? owner.id : (admin ? admin.id : tenants[0].id)
          console.log('[Settings] selectedTenant chosen=%s from list=%o', chosen, tenants.map(t => t.id))
          setSelectedTenant(chosen)
          setTenantOptions(tenants)
        }
      } catch (err) {
        console.error('Failed to load tenant memberships', err)
      } finally {
        setLoadingTenants(false)
      }
    })
    return () => unsub && unsub()
  }, [])

  return (
    <div className="py-6">
      <header className="page-header">
        <div>
          <h1 className="page-title">Configurações</h1>
        </div>
        <div>
          <Link to="/dashboard" className="text-sm text-gray-600">Voltar</Link>
        </div>
      </header>

      <div className="page-section mb-4">
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
          <div className="text-xs text-gray-500 mt-2">Requer que o servidor possua <code>VERCEL_TOKEN</code> e <code>VERCEL_PROJECT_ID</code> e que você esteja autenticado com permissão (ADMIN_UID/ADMIN_EMAIL opcional).</div>
        </div>
      </div>
      
      <div className="page-section mt-4">
        <h2 className="font-medium">Chave Brevo por Tenant</h2>
        <p className="text-sm text-gray-500 mb-2">Cada tenant pode usar sua própria chave. Cole a chave abaixo; o sistema tentará identificar automaticamente seu tenant.</p>
        <div className="grid grid-cols-1 gap-2">
          <div className="flex gap-2 items-center">
            <input value={tenantKey} onChange={e => setTenantKey(e.target.value)} type={showTenantKey ? 'text' : 'password'} className="flex-1 border rounded px-3 py-2" placeholder="chave Brevo do tenant" />
            <button onClick={() => setShowTenantKey(s => !s)} type="button" className="px-2 py-1 border rounded text-sm">{showTenantKey ? 'Ocultar' : 'Mostrar'}</button>
          </div>
          <div className="flex gap-2 items-center">
            <input value={smtpLogin} onChange={e => setSmtpLogin(e.target.value)} type="text" className="flex-1 border rounded px-3 py-2" placeholder="SMTP login (ex: 9c6dd5001@smtp-brevo.com)" />
            <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={smtpMemberLevel} onChange={e => setSmtpMemberLevel(e.target.checked)} /> Salvar como login SMTP no nível do membro</label>
          </div>
          <div>
            {loadingTenants ? (
              <div className="text-sm text-gray-600">Carregando tenants...</div>
            ) : tenantOptions && tenantOptions.length > 1 ? (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Selecionar tenant:</label>
                <select value={selectedTenant ?? ''} onChange={e => setSelectedTenant(e.target.value)} className="border rounded px-2 py-1">
                  {tenantOptions.map(t => (
                    <option key={t.id} value={t.id}>{t.id} {t.role ? `(${t.role})` : ''}</option>
                  ))}
                </select>
              </div>
            ) : selectedTenant ? (
              <div className="text-sm text-gray-600">Tenant selecionado: <strong>{selectedTenant}</strong></div>
            ) : null}
          </div>
          <div className="flex gap-2">
              <button onClick={saveTenantKey} disabled={savingTenant} className="px-3 py-2 bg-indigo-600 text-white rounded">Salvar para este tenant</button>
            <div className="text-sm text-gray-600">{savingTenant ? 'Salvando...' : null}</div>
          </div>
            <div className="flex gap-2 items-center mt-2">
              <button onClick={sendTestEmailFromUI} disabled={testSending} className="px-3 py-2 bg-green-600 text-white rounded">Enviar e-mail de teste</button>
              {testSending ? <div className="text-sm text-gray-600">Enviando...</div> : null}
              {testSuccess === true ? <div className="text-sm text-green-700">✅ {testMessage}</div> : null}
              {testSuccess === false ? <div className="text-sm text-red-600">❌ {testMessage}</div> : null}
            </div>
          <div className="text-xs text-gray-500">Requer que você seja membro <code>owner</code> ou <code>admin</code> do tenant; se pertencer a vários tenants, especifique manualmente.</div>
        </div>
      </div>

      <div className="page-section">
        <h2 className="font-medium">Preferências</h2>
        <div className="text-sm text-gray-500 mt-2">Aqui você poderá ajustar preferências da conta, notificações e integrações.</div>
      </div>
    </div>
  )
}
