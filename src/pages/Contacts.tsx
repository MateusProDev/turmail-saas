import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, where, orderBy } from 'firebase/firestore'
import { db, auth } from '../lib/firebase'
import { useAuthState } from 'react-firebase-hooks/auth'

export default function Contacts(){
  const [user] = useAuthState(auth)
  const [contacts, setContacts] = useState<any[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [editing, setEditing] = useState<any | null>(null)

  useEffect(() => {
    // show only contacts owned by the current user in real-time
    if (!user) return
    try {
      console.log('[Contacts] starting listener', { ownerUid: user.uid })
      const cRef = collection(db, 'contacts')
      const q = query(cRef, where('ownerUid', '==', user.uid), orderBy('createdAt', 'desc'))
      const unsub = onSnapshot(q, (snap) => {
        console.log('[Contacts] onSnapshot start', { ownerUid: user.uid, size: snap.size, empty: snap.empty, fromCache: snap.metadata?.fromCache, hasPendingWrites: snap.metadata?.hasPendingWrites })
        try {
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          console.debug('[Contacts] docs', docs)
          setContacts(docs)
          console.log('[Contacts] state updated', { contactsCount: docs.length })
        } catch (e) {
          console.error('[Contacts] error processing snapshot docs', e)
        }
      }, (err) => {
        console.error('[Contacts] snapshot error', err)
        setResult('Erro ao carregar contatos: ' + (err && err.message ? err.message : String(err)))
      })
      return () => { console.log('[Contacts] unsubscribing listener'); unsub() }
    } catch (e) { console.error('contacts listener error', e) }
  }, [user])

  const saveContact = async () => {
    if (!user) { setResult('Faça login para salvar contatos'); return }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) { setResult('Email inválido'); return }
    setLoading(true); setResult(null)
    try {
      if (editing && editing.id) {
        const d = doc(db, 'contacts', editing.id)
        // only set fields that have values to avoid creating empty/null fields
        const updates: any = {}
        if (name && name.trim()) updates.name = name.trim()
        if (email && email.trim()) updates.email = email.trim()
        if (phone && phone.trim()) updates.phone = phone.trim()
        if (Object.keys(updates).length > 0) {
          await updateDoc(d, updates)
          console.log('[Contacts] updated', { id: editing.id, updates })
        } else {
          console.log('[Contacts] update called but no updates to apply', { id: editing.id })
        }
        setResult('Contato atualizado')
      } else {
        const payload: any = { ownerUid: user.uid, email: email.trim(), createdAt: new Date() }
        if (name && name.trim()) payload.name = name.trim()
        if (phone && phone.trim()) payload.phone = phone.trim()
        const ref = await addDoc(collection(db, 'contacts'), payload)
        console.log('[Contacts] added', { id: ref.id, payload })
        setResult('Contato adicionado')
      }
      setName(''); setEmail(''); setPhone(''); setEditing(null)
    } catch (e:any) { console.error(e); setResult(String(e.message || e)) }
    setLoading(false)
  }

  const removeContact = async (id: string) => {
    if (!confirm('Remover contato?')) return
    try {
      await deleteDoc(doc(db, 'contacts', id))
      console.log('[Contacts] removed', { id })
      setResult('Contato removido')
    } catch (e:any) {
      console.error('[Contacts] remove failed', e)
      setResult(String(e.message || e))
    }
  }

  return (
    <div className="py-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contatos</h1>
          <p className="text-sm text-slate-600">Gerencie seus contatos para usar nas campanhas</p>
        </div>
        <div>
          <Link to="/dashboard" className="text-sm text-indigo-600">Voltar ao Dashboard</Link>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white/80 backdrop-blur-lg rounded-2xl border border-slate-200/60 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Adicionar / Editar</h2>
          {result && <div className={`mb-3 px-3 py-2 rounded ${result.includes('invál') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{result}</div>}
          <label className="block text-sm font-medium text-slate-700">Nome</label>
          <input value={name} onChange={e=>setName(e.target.value)} className="w-full px-3 py-2 border rounded mt-1 mb-3" />
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} className="w-full px-3 py-2 border rounded mt-1 mb-3" />
          <label className="block text-sm font-medium text-slate-700">Telefone</label>
          <input value={phone} onChange={e=>setPhone(e.target.value)} className="w-full px-3 py-2 border rounded mt-1 mb-4" />
          <div className="flex space-x-2">
            <button onClick={saveContact} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded">{editing ? 'Atualizar' : 'Adicionar'}</button>
            <button onClick={() => { setName(''); setEmail(''); setPhone(''); setEditing(null); setResult(null) }} className="px-4 py-2 border rounded">Limpar</button>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white/80 backdrop-blur-lg rounded-2xl border border-slate-200/60 p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Lista de Contatos</h2>
          {contacts.length === 0 ? (
            <div className="text-sm text-slate-500">Nenhum contato encontrado.</div>
          ) : (
            <ul className="space-y-3">
              {contacts.map(c => (
                <li key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                  <div>
                    <div className="font-medium text-slate-900">{c.name || c.email}</div>
                    <div className="text-xs text-slate-500">{c.email} {c.phone ? `• ${c.phone}` : ''}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => { setEditing(c); setName(c.name||''); setEmail(c.email||''); setPhone(c.phone||'') }} className="text-xs px-3 py-1 bg-slate-100 rounded text-slate-700">Editar</button>
                    <button onClick={() => removeContact(c.id)} className="text-xs px-3 py-1 bg-red-100 rounded text-red-700">Remover</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
