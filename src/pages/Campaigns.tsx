import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth, db } from '../lib/firebase'

import { collection, query, where, onSnapshot, orderBy, limit, getDocs, collectionGroup, documentId } from 'firebase/firestore'

export default function Campaigns(){
  const [user, loadingAuth] = useAuthState(auth)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // New campaign form
  const [showForm, setShowForm] = useState(false)
  const [subject, setSubject] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const [recipientsText, setRecipientsText] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [tenantOptions, setTenantOptions] = useState<Array<{id:string,role:string}>>([])
  const [templateId, setTemplateId] = useState<string>('')
  
  const [sendImmediate, setSendImmediate] = useState(true)
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null)

  // Simple campaigns listener: campaigns where ownerUid == user.uid
  useEffect(() => {
    // load tenant memberships for the current user so they can choose tenant-scoped keys
    async function loadTenants() {
      if (!user) return
      try {
        // Use collectionGroup to find member docs across tenants where the
        // document ID equals the current user's uid. This avoids listing the
        // `tenants` root collection which our security rules don't permit.
        const membersGroup = collectionGroup(db, 'members')
        const q = query(membersGroup, where(documentId(), '==', user.uid))
        const snap = await getDocs(q)
        const opts: Array<{id:string, role:string}> = []
        for (const md of snap.docs) {
          // member doc path: tenants/{tenantId}/members/{memberId}
          const tenantId = md.ref.parent.parent?.id
          if (tenantId) opts.push({ id: tenantId, role: md.data()?.role || '' })
        }
        setTenantOptions(opts)
      } catch (e) {
        console.warn('Failed loading tenant memberships', e)
      }
    }
    if (user) loadTenants()

    if (!user) return
    setLoading(true)
    try {
      const cRef = collection(db, 'campaigns')
      const q = query(cRef, where('ownerUid', '==', user.uid), orderBy('createdAt', 'desc'), limit(50))
      const unsub = onSnapshot(q, (snap) => {
        setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      }, (err) => {
        console.error('campaigns snapshot error', err)
        setLoading(false)
      })
      return () => unsub()
    } catch (e) {
      console.error('campaigns listener error', e)
      setLoading(false)
    }
  }, [user])

  const refreshCampaignsByTenant = async (tenantId: string) => {
    try {
      const cRef = collection(db, 'campaigns')
      const q = query(cRef, where('tenantId', '==', tenantId), orderBy('createdAt', 'desc'), limit(50))
      const snap = await getDocs(q)
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      // merge unique
      setCampaigns(prev => {
        const map = new Map<string, any>()
        for (const c of list) map.set(c.id, c)
        for (const c of prev) if (!map.has(c.id)) map.set(c.id, c)
        return Array.from(map.values()).sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0))
      })
    } catch (e) { console.error(e) }
  }

  const sendTestForCampaign = async (c: any) => {
    setSending(true); setResult(null)
    try {
      const payload = {
        tenantId: c.tenantId || undefined,
        sender: c.sender || { name: 'TurMail Test', email: `no-reply@${window.location.hostname}` },
        to: c.to || [{ email: (user && user.email) || 'test@example.com' }],
        subject: c.subject || 'Teste',
        htmlContent: c.htmlContent || '<p>Teste</p>',
      }
      const resp = await fetch('/api/send-campaign', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      const data = await resp.json()
      if (!resp.ok) throw new Error(JSON.stringify(data))
      setResult(data && data.messageId ? `✅ Enviado (id ${data.messageId})` : '✅ Enviado')
    } catch (e: any) {
      setResult(`❌ ${String(e.message || e)}`)
    } finally { setSending(false) }
  }

  const createCampaign = async () => {
    if (!subject || (!htmlContent && !templateId)) { setResult('Assunto e conteúdo ou template são obrigatórios'); return }
    // parse recipients and basic validation
    const recipients = recipientsText.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean)
    if (recipients.length === 0) { setResult('Adicione ao menos 1 destinatário'); return }
    const invalid = recipients.find(r => !/^\S+@\S+\.\S+$/.test(r))
    if (invalid) { setResult(`Endereço inválido: ${invalid}`); return }
    setResult(null)

    const to = recipients.map(email => ({ email }))
    const payload: any = { tenantId: selectedTenant || undefined, subject, htmlContent, to, ownerUid: user?.uid, sendImmediate }
    if (templateId) payload.templateId = Number(templateId)
    if (!sendImmediate && scheduledAt) payload.scheduledAt = scheduledAt

    try {
      if (editingCampaign && editingCampaign.id) {
        const resp = await fetch('/api/update-campaign', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: editingCampaign.id, subject, htmlContent, to, scheduledAt: payload.scheduledAt, templateId: payload.templateId }) })
        const data = await resp.json()
        if (!resp.ok) throw new Error(JSON.stringify(data))
        setResult('Campanha atualizada')
      } else {
        const resp = await fetch('/api/create-campaign', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
        const data = await resp.json()
        if (!resp.ok) throw new Error(JSON.stringify(data))
        setResult(`Campanha criada: ${data.id}`)
      }

      setShowForm(false)
      setEditingCampaign(null)
      if (selectedTenant) await refreshCampaignsByTenant(selectedTenant)
    } catch (e: any) {
      setResult(String(e.message || e))
    }
  }

  if (loadingAuth) return <div>Carregando...</div>
  if (!user) return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold">Acesso necessário</h1>
      <p>Você precisa entrar para acessar Campanhas.</p>
      <Link to="/login" className="text-indigo-600">Ir para Login</Link>
    </div>
  )

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Campanhas</h1>
        <div>
          <Link to="/dashboard" className="text-sm text-gray-600 mr-3">Voltar</Link>
          <button onClick={() => setShowForm(s => !s)} className="bg-indigo-600 text-white px-3 py-1 rounded">{showForm ? 'Fechar' : 'Nova Campanha'}</button>
        </div>
      </header>

      {showForm && (
        <div className="bg-white rounded shadow p-4 mb-6">
          <h2 className="font-medium">Criar nova campanha</h2>
          <div className="grid gap-2 mt-3">
            <input value={subject} onChange={e => setSubject(e.target.value)} className="border rounded px-3 py-2" placeholder="Assunto" />
            <select value={selectedTenant ?? ''} onChange={e => setSelectedTenant(e.target.value || null)} className="border rounded px-3 py-2">
              <option value="">(usar global)</option>
              {tenantOptions.map(t => (<option key={t.id} value={t.id}>{t.id} {t.role ? `(${t.role})` : ''}</option>))}
            </select>
            <textarea value={htmlContent} onChange={e => setHtmlContent(e.target.value)} className="border rounded px-3 py-2 h-36" placeholder="Conteúdo HTML (ou deixe em branco se usar template)" />
            <div className="grid sm:grid-cols-2 gap-2">
              <textarea value={recipientsText} onChange={e => setRecipientsText(e.target.value)} className="border rounded px-3 py-2" placeholder="Destinatários (uma linha por e-mail ou separados por vírgula)" />
              <div className="flex flex-col gap-2">
                <input value={templateId} onChange={e => setTemplateId(e.target.value)} className="border rounded px-3 py-2" placeholder="Template ID (opcional)" />
                <div className="flex items-center gap-2">
                  <label className="text-sm">Enviar imediata</label>
                  <input type="checkbox" checked={sendImmediate} onChange={e => setSendImmediate(e.target.checked)} />
                </div>
                <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="border rounded px-3 py-2" disabled={sendImmediate} />
                <button onClick={() => null} className="text-sm text-gray-600 underline">Visualizar conteúdo</button>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <button onClick={createCampaign} className="px-3 py-2 bg-green-600 text-white rounded">Criar</button>
              <button onClick={() => { setShowForm(false) }} className="px-3 py-2 border rounded">Cancelar</button>
              <div className="text-sm text-gray-600">{result}</div>
            </div>
          </div>
        </div>
      )}

      <section className="mb-6">
        <div className="text-sm text-gray-500 mb-2">Lista de campanhas recentes</div>
        <div className="bg-white rounded shadow p-4 text-sm text-gray-600">
          {loading ? <div>Carregando campanhas...</div> : (
            campaigns.length === 0 ? <div>Nenhuma campanha encontrada.</div> : (
              <>
              <table className="min-w-full table-auto text-sm">
                <thead className="text-left text-xs text-gray-500 uppercase"><tr><th>Assunto</th><th>Destinatários</th><th>Status</th><th>Criado</th><th>Ações</th></tr></thead>
                <tbody>
                  {campaigns.slice((page-1)*pageSize, page*pageSize).map(c => (
                    <tr key={c.id} className="border-t">
                      <td className="px-2 py-2">{c.subject}</td>
                      <td className="px-2 py-2">{(c.to || []).length}</td>
                      <td className="px-2 py-2">{c.status || '—'}</td>
                      <td className="px-2 py-2">{c.createdAt ? new Date((c.createdAt?.seconds || c.createdAt) * (c.createdAt?.seconds ? 1000 : 1)).toLocaleString() : '—'}</td>
                      <td className="px-2 py-2">
                        <button onClick={() => sendTestForCampaign(c)} className="px-2 py-1 bg-indigo-600 text-white rounded text-xs mr-2">Enviar teste</button>
                        <button onClick={() => { setShowForm(true); setEditingCampaign(c); setSubject(c.subject||''); setHtmlContent(c.htmlContent||''); setRecipientsText((c.to||[]).map((t:any)=>t.email).join('\n')); setSelectedTenant(c.tenantId||'') }} className="text-xs text-gray-600 mr-2">Editar</button>
                        <button onClick={async ()=>{
                          if (!confirm('Confirma remover esta campanha?')) return
                          try { const resp = await fetch('/api/delete-campaign', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: c.id }) }); const j = await resp.json(); if (!resp.ok) throw new Error(JSON.stringify(j)); setCampaigns(prev=>prev.filter(x=>x.id!==c.id)); setResult('Campanha removida') } catch (e:any){ setResult(String(e.message||e)) }
                        }} className="text-xs text-red-600 mr-2">Remover</button>
                        <Link to={`/campaigns/${c.id}`} className="text-xs text-gray-600">Ver</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-sm text-gray-600">Página {page} de {Math.max(1, Math.ceil(campaigns.length / pageSize))}</div>
                <div className="flex gap-2">
                  <button className="px-2 py-1 border rounded" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Anterior</button>
                  <button className="px-2 py-1 border rounded" disabled={page>=Math.ceil(campaigns.length/pageSize)} onClick={()=>setPage(p=>p+1)}>Próxima</button>
                </div>
              </div>
              </>
            )
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Enviar teste rápido</h2>
        <p className="text-sm text-gray-500 mb-2">Use o endpoint server-side para enviar um email de teste (Brevo).</p>
        <div className="flex gap-2">
          <button className="px-3 py-2 bg-indigo-600 text-white rounded" disabled={sending} onClick={async () => {
            setSending(true); setResult(null)
            try {
              const resp = await fetch('/api/send-campaign', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({sender:{name:'Test',email:'no-reply@example.com'},to:[{email:user.email,name:'Teste'}],subject:'Teste Brevo',htmlContent:'<p>Teste de envio</p>'})})
              const data = await resp.json()
              setResult(data && data.messageId ? `✅ Enviado (id ${data.messageId})` : JSON.stringify(data))
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

// end of `Campaigns` component
