// React import not required with the new JSX transform
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '../lib/firebase'

export default function Dashboard(){
  const [user, loading, error] = useAuthState(auth)

  if(loading) return <div>Carregando...</div>
  if(error) return <div>Erro: {String(error)}</div>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-4">Bem-vindo, {user?.email}</p>
      <div className="mt-6">
        <h2 className="font-semibold">Ações</h2>
        <ul className="mt-2 list-disc list-inside">
          <li>Ver contatos</li>
          <li>Enviar campanha</li>
          <li>
            <a href="/plans" className="text-indigo-600">Ver planos e assinar</a>
          </li>
        </ul>
      </div>
    </div>
  )
}
