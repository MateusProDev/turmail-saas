import React, { useState } from 'react'
import { auth } from '../lib/firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
    } catch (err) {
      console.error(err)
      alert('Erro no login')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={submit} className="p-8 bg-white rounded shadow w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-4">{isSignup ? 'Criar conta' : 'Entrar'}</h2>
        <input className="w-full p-2 border mb-2" placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full p-2 border mb-4" placeholder="senha" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="w-full bg-indigo-600 text-white p-2 rounded">{isSignup ? 'Cadastrar' : 'Entrar'}</button>
        <div className="mt-4 text-sm text-center">
          <button type="button" className="text-indigo-600" onClick={()=>setIsSignup(s=>!s)}>
            {isSignup ? 'Já tenho conta' : 'Criar nova conta'}
          </button>
        </div>
      </form>
    </div>
  )
}
