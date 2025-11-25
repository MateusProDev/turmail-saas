import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

export default function TenantMembers(){
  const { tenantId } = useParams()
  const [members, setMembers] = useState<any[]>([])
  const [newUid, setNewUid] = useState('')
  const [newRole, setNewRole] = useState('member')

  useEffect(() => {
    if (!tenantId) return
    const col = collection(db, 'tenants', tenantId, 'members')
    const unsub = onSnapshot(col, snap => setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    return () => unsub()
  }, [tenantId])

  const addMember = async () => {
    if (!tenantId || !newUid) return
    const ref = doc(db, 'tenants', tenantId, 'members', newUid)
    await setDoc(ref, { role: newRole })
    setNewUid('')
  }

  const removeMember = async (uid: string) => {
    if (!tenantId) return
    const ref = doc(db, 'tenants', tenantId, 'members', uid)
    await deleteDoc(ref)
  }

  const changeRole = async (uid: string, role: string) => {
    if (!tenantId) return
    const ref = doc(db, 'tenants', tenantId, 'members', uid)
    await setDoc(ref, { role }, { merge: true })
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Membros do Tenant {tenantId}</h1>
        <Link to="/dashboard" className="text-sm text-gray-600">Voltar</Link>
      </header>

      <div className="bg-white rounded shadow p-4 mb-4">
        <h2 className="font-medium">Adicionar membro</h2>
        <div className="flex gap-2 mt-2">
          <input value={newUid} onChange={e => setNewUid(e.target.value)} className="border rounded px-3 py-2" placeholder="UID do usuário" />
          <select value={newRole} onChange={e => setNewRole(e.target.value)} className="border rounded px-3 py-2">
            <option value="member">member</option>
            <option value="admin">admin</option>
            <option value="owner">owner</option>
          </select>
          <button onClick={addMember} className="px-3 py-2 bg-indigo-600 text-white rounded">Adicionar</button>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4">
        <h2 className="font-medium mb-2">Lista de membros</h2>
        {members.length === 0 ? <div className="text-sm text-gray-500">Nenhum membro encontrado.</div> : (
          <ul className="space-y-2">
            {members.map(m => (
              <li key={m.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{m.id}</div>
                  <div className="text-xs text-gray-500">{m.role}</div>
                </div>
                <div className="flex items-center gap-2">
                  <select value={m.role} onChange={e => changeRole(m.id, e.target.value)} className="border rounded px-2 py-1 text-sm">
                    <option value="member">member</option>
                    <option value="admin">admin</option>
                    <option value="owner">owner</option>
                  </select>
                  <button onClick={() => removeMember(m.id)} className="text-red-600 text-sm">Remover</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
