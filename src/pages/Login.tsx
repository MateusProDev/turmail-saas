import React, { useState } from 'react'
import './Login.css'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../lib/firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const navigate = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (isSignup) {
        const userCred = await createUserWithEmailAndPassword(auth, email, password)
        // create user doc in Firestore
        try {
          await setDoc(doc(db, 'users', userCred.user.uid), {
            email: userCred.user.email,
            uid: userCred.user.uid,
            createdAt: serverTimestamp(),
          })
        } catch (setErr) {
          console.error('failed to create user doc', setErr)
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
      navigate('/dashboard')
    } catch (err: any) {
      console.error(err)
      const code = err?.code || ''
      if (code.includes('auth/email-already-in-use')) {
        alert('Este e-mail já está em uso. Tente entrar.')
      } else if (code.includes('auth/wrong-password')) {
        alert('Senha incorreta')
      } else if (code.includes('auth/user-not-found')) {
        alert('Usuário não encontrado')
      } else {
        alert('Erro no login')
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={submit} className="p-8 bg-white rounded shadow w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-4">{isSignup ? 'Criar conta' : 'Entrar'}</h2>
        <input required autoComplete="email" className="w-full p-2 border mb-2" placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input required autoComplete={isSignup ? 'new-password' : 'current-password'} className="w-full p-2 border mb-4" placeholder="senha" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
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
