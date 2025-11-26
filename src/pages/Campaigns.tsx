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
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [sendImmediate, setSendImmediate] = useState(true)
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null)

  // Simple campaigns listener: campaigns where ownerUid == user.uid
  useEffect(() => {
    // load tenant memberships for the current user so they can choose tenant-scoped keys
    async function loadTenants() {
      try {
        const cg = collectionGroup(db, 'members')
        const q = query(cg, where(documentId(), '==', user.uid))
        const snap = await getDocs(q)
        const opts: Array<{id:string, role:string}> = snap.docs.map(d => {
          const tenantId = d.ref.parent.parent ? d.ref.parent.parent.id : null
          return tenantId ? { id: tenantId, role: d.data()?.role || '' } : null
        }).filter(Boolean) as Array<{id:string,role:string}>
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
    if (!subject || !htmlContent) { setResult('Assunto e conteúdo são obrigatórios'); return }
    // parse recipients and basic validation
    const recipients = recipientsText.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean)
    if (recipients.length === 0) { setResult('Adicione ao menos 1 destinatário'); return }
    const invalid = recipients.find(r => !/^\S+@\S+\.\S+$/.test(r))
    if (invalid) { setResult(`Endereço inválido: ${invalid}`); return }
    setResult(null)
    try {
      const to = recipients.map(email => ({ email }))
      const payload: any = { tenantId: selectedTenant || undefined, subject, htmlContent, to }
      if (templateId) payload.templateId = Number(templateId)
      if (!sendImmediate && scheduledAt) payload.scheduledAt = scheduledAt
      const resp = await fetch('/api/create-campaign', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      const data = await resp.json()
      if (!resp.ok) throw new Error(JSON.stringify(data))
      setResult(`Campanha criada: ${data.id}`)
      setShowForm(false)
      // refresh lists
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
                <button onClick={() => setPreviewId('local')} className="text-sm text-gray-600 underline">Visualizar conteúdo</button>
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

      {/* preview modal / area */}
      {previewId === 'local' && (
        <div className="mb-6 bg-white p-4 rounded shadow">
          <h3 className="font-medium">Pré-visualização</h3>
          <div className="mt-2 border rounded p-3 text-sm text-gray-800">
            <div dangerouslySetInnerHTML={{ __html: htmlContent || '<em>Nenhum conteúdo</em>' }} />
          </div>
          <div className="mt-2 text-right">
            <button onClick={() => setPreviewId(null)} className="px-3 py-1 border rounded">Fechar pré-visualização</button>
          </div>
        </div>
      )}

      <section className="mb-6">
        <div className="text-sm text-gray-500 mb-2">Lista de campanhas recentes</div>
        <div className="bg-white rounded shadow p-4 text-sm text-gray-600">
          {loading ? <div>Carregando campanhas...</div> : (
            campaigns.length === 0 ? <div>Nenhuma campanha encontrada.</div> : (
              <table className="min-w-full table-auto text-sm">
                <thead className="text-left text-xs text-gray-500 uppercase"><tr><th>Assunto</th><th>Destinatários</th><th>Status</th><th>Criado</th><th>Ações</th></tr></thead>
                <tbody>
                  {campaigns.map(c => (
                    <tr key={c.id} className="border-t">
                      <td className="px-2 py-2">{c.subject}</td>
                      <td className="px-2 py-2">{(c.to || []).length}</td>
                      <td className="px-2 py-2">{c.status || '—'}</td>
                      <td className="px-2 py-2">{c.createdAt ? new Date((c.createdAt?.seconds || c.createdAt) * (c.createdAt?.seconds ? 1000 : 1)).toLocaleString() : '—'}</td>
                      <td className="px-2 py-2">
                        <button onClick={() => sendTestForCampaign(c)} className="px-2 py-1 bg-indigo-600 text-white rounded text-xs mr-2">Enviar teste</button>
                        <Link to={`/campaigns/${c.id}`} className="text-xs text-gray-600">Ver</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
