import React, { useState } from 'react'
import './Login.css'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../lib/firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import makeInitialUserData from '../lib/initUser'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const navigate = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (isSignup) {
        const userCred = await createUserWithEmailAndPassword(auth, email, password)
        // create user doc in Firestore
        try {
          // initialize user doc with canonical fields; use merge to avoid
          // overwriting anything that might already exist
          const init = makeInitialUserData(userCred.user.uid, userCred.user.email)
          // persist company name provided during signup
          if (!init.company) init.company = { name: '', website: '' }
          init.company.name = companyName || ''
          await setDoc(doc(db, 'users', userCred.user.uid), init, { merge: true })
        
          // Start 14-day trial automatically on signup (server will record IP + trial window)
          try {
            await fetch('/api/start-trial', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ uid: userCred.user.uid, email: userCred.user.email, planId: 'free' }),
            })
          } catch (trialErr) {
            console.error('failed to start trial on signup', trialErr)
          }
          // Create tenant server-side to avoid Firestore rules issues
          try {
            const token = await userCred.user.getIdToken()
            await fetch('/api/tenant/create-tenant', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ name: companyName || `Account ${userCred.user.uid}` }),
            })
            console.log('[signup] requested server-side tenant creation for', userCred.user.uid)
          } catch (tenantErr) {
            console.error('failed to request tenant creation on signup', tenantErr)
          }
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
        {isSignup && (
          <input className="w-full p-2 border mb-2" placeholder="Nome da empresa (opcional)" value={companyName} onChange={e=>setCompanyName(e.target.value)} />
        )}
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
