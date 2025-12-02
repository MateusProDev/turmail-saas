import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
// Removed unused firestore imports
import { auth } from '../lib/firebase'

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
      setResult(`Conexão com Brevo: OK (status ${res.status})`)
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
        // Don't set sender - let sendHelper use tenant's fromEmail/fromName
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

  /*
  const [brevoKey, setBrevoKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [showBrevoKey, setShowBrevoKey] = useState(false)
  */
  const [tenantKey, setTenantKey] = useState('')
  const [smtpLogin, setSmtpLogin] = useState('')
  const [savingTenant, setSavingTenant] = useState(false)
  const [showTenantKey, setShowTenantKey] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null)
  const [tenantOptions, setTenantOptions] = useState<Array<{ id: string, role: string }>>([])
  const [loadingTenants, setLoadingTenants] = useState(false)
  const [showTenantSelect, setShowTenantSelect] = useState(false)
  const [modalTenantId, setModalTenantId] = useState('')
  const [autoCreateAttempted, setAutoCreateAttempted] = useState(false)
  const [tenantKeys, setTenantKeys] = useState<Array<any>>([])
  const [loadingKeys, setLoadingKeys] = useState(false)

  /*
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
  */

  // perform save for a specific tenantId (used by modal confirm or direct save)
  const performSaveTenantKey = async (tenantId: string | undefined) => {
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
      console.log('[Settings] performSaveTenantKey invoked; hasToken=', !!token, 'tenantId=', tenantId)
      const maskedTenant = tenantKey ? `${tenantKey.slice(0,6)}...(${tenantKey.length} chars)` : '<empty>'
      console.log('[Settings] tenantKey masked=%s', maskedTenant)
      if (!token) throw new Error('User not authenticated')
      if (!tenantId) {
        throw new Error('Nenhum tenant selecionado. Recarregue a página.')
      }
      // Auto-fetch senders from Brevo FIRST to get fromEmail/fromName
      let detectedFromEmail = ''
      let detectedFromName = ''
      
      try {
        const sendersResp = await fetch(`/api/tenant/get-brevo-senders?tenantId=${tenantId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        
        if (sendersResp.ok) {
          const sendersData = await sendersResp.json()
          const senders = sendersData.senders || []
          
          // Find active sender (prefer first active, or first one)
          const activeSender = senders.find((s: any) => s.active) || senders[0]
          
          if (activeSender) {
            detectedFromEmail = activeSender.email
            detectedFromName = activeSender.name
          }
        }
      } catch (senderErr) {
        console.warn('[Settings] Could not fetch senders before saving key', senderErr)
      }

      // Now save the key WITH the detected sender info
      const body: any = { key: tenantKey, tenantId }
      if (smtpLogin) body.smtpLogin = smtpLogin
      if (detectedFromEmail) body.fromEmail = detectedFromEmail
      if (detectedFromName) body.fromName = detectedFromName

      const resp = await fetch('/api/tenant/set-brevo-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const data = await resp.json()
      console.log('[Settings] performSaveTenantKey response', resp.status, data)
      if (!resp.ok) throw new Error(JSON.stringify(data))
      
      // Show success message with detected sender info
      if (detectedFromEmail && detectedFromName) {
        setResult(`✅ Chave salva! Remetente detectado: ${detectedFromName} <${detectedFromEmail}>`)
      } else {
        setResult('✅ Chave salva (nenhum remetente ativo encontrado na Brevo)')
      }
      
      setTenantKey('')
      setShowTenantKey(false)
      // reload keys
      if (tenantId) await loadTenantKeys(tenantId)
    } catch (e: any) {
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

  const loadTenantKeys = async (tenantId: string) => {
    setLoadingKeys(true)
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null
      const resp = await fetch('/api/tenant/list-keys', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ tenantId }) })
      const data = await resp.json()
      if (!resp.ok) throw new Error(JSON.stringify(data))
      setTenantKeys(data.keys || [])
    } catch (e:any) {
      console.error('failed to load tenant keys', e)
    } finally { setLoadingKeys(false) }
  }

  // wrapper called by button: if no selectedTenant, open modal to force selection
  const saveTenantKey = async () => {
    if (!selectedTenant) {
      setModalTenantId('')
      setShowTenantSelect(true)
      return
    }
    await performSaveTenantKey(selectedTenant)
  }

  // Auto-select tenant based on logged-in user's memberships (owner preferred)
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user: any) => {
      if (!user) {
        setSelectedTenant(null)
        return
      }
      try {
        setLoadingTenants(true)
        // Use server endpoint that uses Admin SDK to list tenant memberships (bypasses client rules)
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : null
        if (!token) {
          setTenantOptions([])
          setSelectedTenant(null)
          setLoadingTenants(false)
          return
        }
        const resp = await fetch('/api/my-tenants', { method: 'GET', headers: { Authorization: `Bearer ${token}` } })
        const json = await resp.json()
        if (!resp.ok) throw new Error(JSON.stringify(json))
        const tenants: Array<{ id: string, role: string }> = (json.tenants || []).map((t: any) => ({ id: t.tenantId, role: t.role }))
        console.log('[Settings] loaded tenant memberships for uid=%s count=%d', user.uid, tenants.length)
        if (tenants.length === 0) {
          setSelectedTenant(null)
          setTenantOptions([])
          // If no tenant exists for this user, attempt to create one automatically (idempotent)
          try {
            if (!autoCreateAttempted) {
              setAutoCreateAttempted(true)
              const createResp = await fetch('/api/tenant/create-tenant', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: `Tenant ${user.uid}` }) })
              const createJson = await createResp.json()
              if (createResp.ok && createJson && createJson.tenantId) {
                // reload tenants after create
                const reload = await fetch('/api/my-tenants', { method: 'GET', headers: { Authorization: `Bearer ${token}` } })
                const reloadJson = await reload.json()
                const newTenants: Array<{ id: string, role: string }> = (reloadJson.tenants || []).map((t: any) => ({ id: t.tenantId, role: t.role }))
                if (newTenants.length > 0) {
                  const owner = newTenants.find(t => t.role === 'owner')
                  const admin = newTenants.find(t => t.role === 'admin')
                  const chosen = owner ? owner.id : (admin ? admin.id : newTenants[0].id)
                  setSelectedTenant(chosen)
                  setTenantOptions(newTenants)
                }
              }
            }
          } catch (e) {
            console.warn('[Settings] auto-create tenant failed', e)
          }
        } else {
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

  // Load tenant keys when selectedTenant changes
  useEffect(() => {
    if (selectedTenant) {
      loadTenantKeys(selectedTenant)
    }
  }, [selectedTenant])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Configurações da Conta
            </h1>
            <p className="text-slate-600 mt-1">Gerencie integrações, chaves e preferências da sua conta</p>
          </div>
          <div className="flex items-center space-x-4">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Voltar ao Dashboard</span>
            </Link>
          </div>
        </header>

        <div className="space-y-6"> 
          {/* Tenant Brevo Key Section */}
          <section className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-slate-200/60 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Configuração Brevo</h2>
                <p className="text-slate-600 text-sm">
                  Cole sua chave API da Brevo. O remetente será detectado automaticamente.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50/80 rounded-xl p-4">
                <div className="space-y-4">
                  {/* Tenant Key Input */}
                  <div className="flex space-x-3">
                    <div className="flex-1 relative">
                      <input 
                        value={tenantKey} 
                        onChange={e => setTenantKey(e.target.value)} 
                        type={showTenantKey ? 'text' : 'password'} 
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors pr-24"
                        placeholder="Cole a chave API da Brevo"
                      />
                      <button 
                        onClick={() => setShowTenantKey(s => !s)} 
                        type="button" 
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                      >
                        {showTenantKey ? 'Ocultar' : 'Mostrar'}
                      </button>
                    </div>
                  </div>

                  {/* Login SMTP (opcional para chaves xsmtp) */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Login SMTP 
                      <span className="text-slate-500 font-normal ml-2">(opcional - apenas para chaves xsmtp)</span>
                    </label>
                    <input 
                      value={smtpLogin} 
                      onChange={e => setSmtpLogin(e.target.value)} 
                      type="text" 
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      placeholder="ex: 9c6dd5001@smtp-brevo.com"
                    />
                  </div>

                  {/* Info box sobre detecção automática */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm text-blue-900">
                        <div className="font-semibold mb-1">✨ Detecção Automática</div>
                        <div className="text-blue-800">
                          Ao salvar, o sistema irá detectar automaticamente:
                          <ul className="list-disc list-inside mt-1 ml-2 space-y-0.5">
                            <li>Nome do remetente configurado na Brevo</li>
                            <li>E-mail do remetente verificado</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tenant Selection */}
                  {loadingTenants ? (
                    <div className="flex items-center space-x-2 text-slate-600">
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm">Carregando tenants...</span>
                    </div>
                  ) : tenantOptions && tenantOptions.length > 1 ? (
                    <div className="flex items-center space-x-3 bg-slate-50 rounded-xl p-3">
                      <label className="text-sm font-medium text-slate-700">Selecionar tenant:</label>
                      <select 
                        value={selectedTenant ?? ''} 
                        onChange={e => setSelectedTenant(e.target.value)} 
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      >
                        {tenantOptions.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.id} {t.role ? `(${t.role})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : selectedTenant ? (
                    <div className="bg-blue-50 rounded-xl p-3">
                      <div className="text-sm text-blue-700">
                        Tenant selecionado: <strong className="font-semibold">{selectedTenant}</strong>
                      </div>
                    </div>
                  ) : null}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-3 sm:space-y-0">
                    <div className="flex space-x-3">
                      <button 
                        onClick={saveTenantKey} 
                        disabled={savingTenant}
                        className="inline-flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                      >
                        {savingTenant ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Salvando...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Salvar para este tenant</span>
                          </>
                        )}
                      </button>
                      
                      <button 
                        onClick={sendTestEmailFromUI} 
                        disabled={testSending}
                        className="inline-flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {testSending ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Enviando...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span>Enviar e-mail de teste</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Tenant Keys list */}
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-slate-700 mb-2">Chaves do Tenant</h4>
                      {loadingKeys ? (
                        <div className="text-sm text-slate-600">Carregando chaves...</div>
                      ) : (
                        <div className="space-y-2">
                          {tenantKeys.length === 0 && <div className="text-sm text-slate-500">Nenhuma chave configurada.</div>}
                          {tenantKeys.map(k => (
                            <div key={k.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                              <div>
                                <div className="text-sm font-medium">ID: {k.id}</div>
                                <div className="text-xs text-slate-500">Criada por: {k.createdBy || 'desconhecido'} • {k.createdAt ? new Date(k.createdAt.seconds * 1000).toLocaleString() : ''}</div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button onClick={async () => {
                                  try {
                                    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null
                                    const resp = await fetch('/api/tenant/set-active-key', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ tenantId: selectedTenant, keyId: k.id }) })
                                    const data = await resp.json()
                                    if (!resp.ok) throw new Error(JSON.stringify(data))
                                    setResult('Chave ativada')
                                    await loadTenantKeys(selectedTenant!)
                                  } catch (e:any) { setResult(String(e.message || e)) }
                                }} className="px-3 py-1 bg-indigo-600 text-white rounded">Ativar</button>
                                <button onClick={async () => {
                                  try {
                                    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null
                                    const resp = await fetch('/api/tenant/delete-key', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ tenantId: selectedTenant, keyId: k.id }) })
                                    const data = await resp.json()
                                    if (!resp.ok) throw new Error(JSON.stringify(data))
                                    setResult('Chave removida')
                                    await loadTenantKeys(selectedTenant!)
                                  } catch (e:any) { setResult(String(e.message || e)) }
                                }} className="px-3 py-1 bg-red-600 text-white rounded">Remover</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Test Results */}
                    <div className="flex-1">
                      {testSuccess === true && (
                        <div className="bg-green-100 text-green-700 px-4 py-3 rounded-xl">
                          <div className="text-sm font-medium">✅ {testMessage}</div>
                        </div>
                      )}
                      {testSuccess === false && (
                        <div className="bg-red-100 text-red-700 px-4 py-3 rounded-xl">
                          <div className="text-sm font-medium">❌ {testMessage}</div>
                        </div>
                      )}
                    </div>
                  </div>

                    <p className="text-xs text-slate-500">
                      Para salvar a chave Brevo você precisa ser <strong>Owner</strong> ou <strong>Admin</strong> da conta. Se administra várias contas, selecione a conta correta no seletor acima.
                    </p>

                    {/* Tenant selection modal (shown when user clicks Save without a selected tenant) */}
                    {showTenantSelect && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                        <div className="w-full max-w-lg bg-white rounded-xl p-6 shadow-xl">
                          <h3 className="text-lg font-semibold mb-2">Selecione a conta para salvar a chave</h3>
                          <p className="text-sm text-slate-600 mb-4">Escolha uma das suas contas (tenant) ou cole o ID manualmente.</p>
                          <div className="space-y-3">
                            {tenantOptions && tenantOptions.length > 0 ? (
                              <select value={modalTenantId} onChange={e => setModalTenantId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                                <option value="">-- Selecione uma conta --</option>
                                {tenantOptions.map(t => (
                                  <option key={t.id} value={t.id}>{t.id} {t.role ? `(${t.role})` : ''}</option>
                                ))}
                              </select>
                            ) : (
                              <div className="text-sm text-slate-500">Nenhuma conta listada. Cole o ID do tenant manualmente abaixo.</div>
                            )}
                            <input value={modalTenantId} onChange={e => setModalTenantId(e.target.value)} placeholder="ID do tenant (ex: tenant_abc123)" className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                          </div>
                          <div className="flex justify-end space-x-3 mt-6">
                            <button onClick={() => setShowTenantSelect(false)} className="px-4 py-2 rounded-lg bg-slate-100">Cancelar</button>
                            <button onClick={async () => {
                              if (!modalTenantId) {
                                setResult('Escolha ou cole o ID do tenant antes de confirmar.')
                                return
                              }
                              setShowTenantSelect(false)
                              await performSaveTenantKey(modalTenantId)
                            }} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Confirmar e salvar</button>
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </section>

          {/* Test Brevo Connection Card (moved below tenant) */}
          {/* <section className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-slate-200/60 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Testar conexão com Brevo</h2>
                <p className="text-slate-600 text-sm">Verifique se o servidor de emails responde corretamente.</p>
              </div>
            </div>

            <div className="bg-slate-50/80 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <button 
                  onClick={testBrevo} 
                  disabled={testing}
                  className="inline-flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {testing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Testando conexão...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Testar conexão com Brevo</span>
                    </>
                  )}
                </button>
                {result && (
                  <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    result.includes('OK') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {result}
                  </div>
                )}
              </div>
            </div>
          </section> */}
          {/* Brevo Integration Section */}
          <section className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-slate-200/60 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Integração Brevo</h2>
                <p className="text-slate-600 text-sm text-justify">
                  Para usar o Brevo, você precisa gerar uma chave API na sua conta Brevo e inseri-la acima. 
                  Essa integração permite que você envie campanhas, notificações e e-mails transacionais diretamente pelo TurMail.      
                  <br />
                  <span className="text-slate-500">
                  <strong>Segurança:</strong> Mantenha sua chave Brevo em segredo. Apenas usuários com permissão de Owner ou Admin podem salvar ou alterar a chave.
                  </span>
                  <br />
                  <span className="text-slate-500">
                  <strong>Ajuda:</strong> <a href="https://www.guideflow.com/tutorial/how-to-generate-a-new-api-key-in-brevo" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">Como gerar uma chave API no Brevo?</a>
                  </span>
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50/80 rounded-xl p-4">
                
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={testBrevo} 
                    disabled={testing}
                    className="inline-flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {testing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Testando conexão...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Testar conexão com Brevo</span>
                      </>
                    )}
                  </button>
                  {result && (
                    <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
                      result.includes('OK') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {result}
                    </div>
                  )}
                </div>
              </div>

              {/*
                <div className="border-t border-slate-200/60 pt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Inserir chave Brevo (será salva no Vercel)
                  </label>
                  <div className="space-y-3">
                    <div className="flex space-x-3">
                      <div className="flex-1 relative">
                        <input 
                          value={brevoKey} 
                          onChange={e => setBrevoKey(e.target.value)} 
                          type={showBrevoKey ? 'text' : 'password'} 
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors pr-24"
                          placeholder="sk_live_xxx"
                        />
                        <button 
                          onClick={() => setShowBrevoKey(s => !s)} 
                          type="button" 
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                        >
                          {showBrevoKey ? 'Ocultar' : 'Mostrar'}
                        </button>
                      </div>
                      <button 
                        onClick={saveToVercel} 
                        disabled={saving}
                        className="inline-flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {saving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Salvando...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Salvar na Vercel</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">
                      Requer que o servidor possua <code className="bg-slate-200 px-1 py-0.5 rounded">VERCEL_TOKEN</code> e <code className="bg-slate-200 px-1 py-0.5 rounded">VERCEL_PROJECT_ID</code> e que você esteja autenticado com permissão (ADMIN_UID/ADMIN_EMAIL opcional).
                    </p>
                  </div>
                  </div>
                */}
            </div>
          </section>
          {/* Preferences Section */}
          <section className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-slate-200/60 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Preferências</h2>
                <p className="text-slate-600 text-sm">
                  Ajuste as configurações da sua conta e notificações
                </p>
              </div>
            </div>

            <div className="bg-slate-50/80 rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Em Desenvolvimento</h3>
              <p className="text-slate-600">
                Em breve você poderá ajustar preferências da conta, notificações e integrações aqui.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}