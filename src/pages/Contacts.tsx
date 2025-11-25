import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'

export default function Contacts(){
  const [contacts, setContacts] = useState<any[]>([])

  useEffect(() => {
    try {
      const cRef = collection(db, 'contacts')
      const q = query(cRef)
      const unsub = onSnapshot(q, snap => setContacts(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      return () => unsub()
    } catch (e) { console.error(e) }
  }, [])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Contatos</h1>
        <Link to="/dashboard" className="text-sm text-gray-600">Voltar</Link>
      </header>

      <div className="bg-white rounded shadow p-4">
        {contacts.length === 0 ? (
          <div className="text-sm text-gray-500">Nenhum contato encontrado.</div>
        ) : (
          <ul className="space-y-2">
            {contacts.map(c => (
              <li key={c.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{c.name || c.email}</div>
                  <div className="text-xs text-gray-500">{c.email}</div>
                </div>
                <div className="text-sm text-gray-500">{c.phone || '—'}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
