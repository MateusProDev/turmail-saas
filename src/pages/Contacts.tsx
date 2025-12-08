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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Contatos
            </h1>
            <p className="text-slate-600 mt-1">Gerencie seus contatos para usar nas campanhas de email</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add/Edit Contact Form */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-slate-200/60 p-6 sticky top-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    {editing ? 'Editar Contato' : 'Novo Contato'}
                  </h2>
                  <p className="text-slate-600 text-sm">
                    {editing ? 'Atualize os dados do contato' : 'Adicione um novo contato à sua lista'}
                  </p>
                </div>
              </div>

              {/* Result Message */}
              {result && (
                <div className={`mb-6 px-4 py-3 rounded-xl ${
                  result.includes('inválido') || result.includes('Erro') || result.includes('❌') 
                    ? 'bg-red-100 text-red-700 border border-red-200' 
                    : 'bg-green-100 text-green-700 border border-green-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    {result.includes('inválido') || result.includes('Erro') || result.includes('❌') ? (
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    <span className="text-sm font-medium">{result}</span>
                  </div>
                </div>
              )}

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nome <span className="text-slate-400">(Opcional)</span>
                  </label>
                  <input 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="Nome do contato"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="email@exemplo.com"
                    type="email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Telefone <span className="text-slate-400">(Opcional)</span>
                  </label>
                  <input 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button 
                    onClick={saveContact} 
                    disabled={loading}
                    className="flex-1 inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{editing ? 'Atualizar' : 'Adicionar'}</span>
                      </>
                    )}
                  </button>
                  
                  <button 
                    onClick={() => { setName(''); setEmail(''); setPhone(''); setEditing(null); setResult(null) }} 
                    className="inline-flex items-center space-x-2 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                    <span>Limpar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Contacts List */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-slate-200/60 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Lista de Contatos</h2>
                    <p className="text-slate-600 text-sm">
                      {contacts.length} {contacts.length === 1 ? 'contato' : 'contatos'} encontrados
                    </p>
                  </div>
                </div>
                
                {contacts.length > 0 && (
                  <div className="text-sm text-slate-500 bg-slate-100 rounded-lg px-3 py-1">
                    Total: {contacts.length}
                  </div>
                )}
              </div>

              {contacts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum contato encontrado</h3>
                  <p className="text-slate-600 mb-6">Comece adicionando seu primeiro contato usando o formulário ao lado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contacts.map(c => (
                    <div 
                      key={c.id} 
                      className="flex items-center justify-between p-4 rounded-xl border border-slate-200/60 hover:border-slate-300 hover:bg-slate-50/50 transition-all duration-200"
                    >
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {c.name ? c.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('') : c.email[0].toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-900 truncate">
                            {c.name || c.email}
                          </div>
                          <div className="text-sm text-slate-600 truncate">
                            {c.email}
                            {c.phone && (
                              <span className="text-slate-400 ml-2">• {c.phone}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                        <button 
                          onClick={() => { 
                            setEditing(c); 
                            setName(c.name||''); 
                            setEmail(c.email||''); 
                            setPhone(c.phone||''); 
                            setResult(null);
                            // Scroll to form
                            document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' });
                          }} 
                          className="inline-flex items-center space-x-1 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span>Editar</span>
                        </button>
                        
                        <button 
                          onClick={() => removeContact(c.id)} 
                          className="inline-flex items-center space-x-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Remover</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div> 
          </div>
        </div>
      </div>
    </div>
  )
}