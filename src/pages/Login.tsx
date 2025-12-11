import React, { useState, useEffect, useRef } from 'react'
import './Login.css'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../lib/firebase'
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  getRedirectResult,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  sendEmailVerification
} from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { SignupStateManager, SIGNUP_PHASES } from '../utils/signupStateMachine';
import { handleAccountCreationError, getAuthErrorMessage } from '../lib/accountRollback';
import { createCheckoutSession } from '../lib/stripe';
import makeInitialUserData from '../lib/initUser';

const Login: React.FC = () => {
  // Funções auxiliares
  const getPendingPlan = () => {
    const pendingPlanStr = localStorage.getItem('pendingPlan');
    if (!pendingPlanStr) return null;
    try {
      return JSON.parse(pendingPlanStr);
    } catch (e) {
      console.error('Error parsing pending plan:', e);
      return null;
    }
  };

  const clearPendingPlan = () => {
    localStorage.removeItem('pendingPlan');
  };

  const createCompleteAccount = async (params: any) => {
    const response = await fetch('/api/create-complete-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create account');
    }
    return response.json();
  };
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const passwordInputRef = useRef<HTMLInputElement>(null)
  const [isSignup, setIsSignup] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  // Verificar se usuário veio da página de planos para criar conta
  const [selectedPlan, setSelectedPlan] = useState<any>(null)
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const pendingPlanStr = localStorage.getItem('pendingPlan')
    if (params.get('signup') === '1') {
      if (!pendingPlanStr) {
        navigate('/plans', { replace: true })
        return
      }
      setIsSignup(true)
    }
    // Verificar se há plano pendente e mostrar banner
    if (pendingPlanStr) {
      try {
        const pendingPlan = JSON.parse(pendingPlanStr)
        setSelectedPlan(pendingPlan)
      } catch (e) {
        console.error('Error parsing pending plan:', e)
      }
    }
  }, [navigate])

  // Verificar resultado do redirect do Google OAuth
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth)
        
        if (result && result.user) {
          setLoading(true)
          const user = result.user

          // Criar documento do usuário se não existir
          try {
            const init = makeInitialUserData(user.uid, user.email)
            if (!init.company) init.company = { name: '', website: '' }
            init.company.name = user.displayName || ''
            init.photoURL = user.photoURL || ''
            init.displayName = user.displayName || ''
            await setDoc(doc(db, 'users', user.uid), init, { merge: true })

            // Iniciar trial (já cria tenant)
            try {
              const token = await user.getIdToken()
              await fetch('/api/start-trial', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ uid: user.uid, email: user.email, planId: 'free' }),
              })
            } catch (trialErr) {
              console.error('failed to start trial', trialErr)
            }

            // Tenant já criado pelo start-trial, não precisa chamar create-tenant novamente
          } catch (setErr) {
            console.error('failed to create user doc', setErr)
          }

          // Verificar se há plano pendente
          const hasPendingPlan = await processPendingPlan(user)
          if (hasPendingPlan) {
            // processPendingPlan já faz o redirecionamento
            return
          }

          navigate('/dashboard')
        }
      } catch (err: any) {
        console.error('Redirect result error:', err)
        if (err.code && err.code !== 'auth/popup-closed-by-user') {
          setError('Erro ao fazer login com Google')
        }
      } finally {
        setLoading(false)
      }
    }

    checkRedirectResult()
  }, [navigate])

  // Processar checkout de plano pendente
  const processPendingPlan = async (user: any) => {
    const pendingPlanStr = localStorage.getItem('pendingPlan')
    if (!pendingPlanStr) return false

    try {
      const pendingPlan = JSON.parse(pendingPlanStr)
      const { planId, priceIdEnvMonthly, priceIdEnvAnnual, billingInterval } = pendingPlan

      // Do not remove pendingPlan yet — remove only after successful checkout/trial creation

      // Se for trial, iniciar trial
      if (planId === 'trial') {
        const token = await user.getIdToken()
        const resp = await fetch('/api/start-trial', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ uid: user.uid, email: user.email, planId: 'trial' }),
        })
        if (resp.ok) {
          // trial created successfully — remove pendingPlan and go to dashboard
          localStorage.removeItem('pendingPlan')
          navigate('/dashboard')
          return true
        } else {
          // Keep pendingPlan so user can retry; surface error
          const json = await resp.json().catch(() => ({}))
          console.error('start-trial failed', json)
          alert('Falha ao iniciar trial automático. Tente novamente.')
          return false
        }
      }

      // Obter Price ID do plano
      const envKey = billingInterval === 'annual' ? priceIdEnvAnnual : priceIdEnvMonthly
      const priceId = envKey ? (import.meta as any).env[envKey] : null

      if (!priceId) {
        console.error('Price ID not found for pending plan')
        alert('Plano selecionado não está configurado corretamente. Contate o suporte.')
        return false
      }

      // Criar sessão de checkout
      const token = await user.getIdToken()
      const checkoutResp = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: { 
          'content-type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          priceId, 
          planId,
          email: user.email 
        }),
      })

      const checkoutData = await checkoutResp.json()
      if (checkoutData?.url) {
        // Remove pendingPlan only after we successfully created a session
        localStorage.removeItem('pendingPlan')
        // Redirecionar para Stripe Checkout
        window.location.href = checkoutData.url
        return true
      } else {
        console.error('checkout session creation failed', checkoutData)
        alert('Falha ao iniciar pagamento. Tente novamente.')
        return false
      }
    } catch (err) {
      console.error('Error processing pending plan:', err)
      // Keep pendingPlan so user can retry
      alert('Erro ao processar o plano pendente. Verifique sua conexão e tente novamente.')
    }

    return false
  }

  // Validação de senha forte
  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return 'A senha deve ter no mínimo 8 caracteres'
    if (!/[A-Z]/.test(pwd)) return 'A senha deve conter pelo menos uma letra maiúscula'
    if (!/[a-z]/.test(pwd)) return 'A senha deve conter pelo menos uma letra minúscula'
    if (!/[0-9]/.test(pwd)) return 'A senha deve conter pelo menos um número'
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return 'A senha deve conter pelo menos um caractere especial'
    return null
  }

  // Login com Google
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Limpar estados expirados
      const signupManager = new SignupStateManager();
      signupManager.cleanupExpired();
      
      // Registrar início do processo
      signupManager.setState(SIGNUP_PHASES.AUTH_PROCESSING, {
        authProvider: 'google',
        timestamp: Date.now()
      });
      
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Verificar se é novo usuário
      const isNewUser = user.metadata.creationTime === user.metadata.lastSignInTime;
      
      if (isNewUser) {
        const pendingPlan = getPendingPlan();
        const planId = pendingPlan ? pendingPlan.planId : 'trial';
        const companyName = pendingPlan?.companyName || '';
        
        // Registrar seleção de plano
        signupManager.setState(SIGNUP_PHASES.PLAN_SELECTED, {
          planId,
          planName: pendingPlan?.planName || 'Trial Gratuito',
          source: 'google'
        });
        
        // Criar conta completa com transação
        signupManager.setState(SIGNUP_PHASES.CREATING_ACCOUNT, {
          userId: user.uid,
          email: user.email
        });
        
        try {
          const { requiresPayment } = 
            await createCompleteAccount({
              uid: user.uid,
              email: user.email,
              name: user.displayName,
              planId,
              companyName
            });
          
          // Limpar plano pendente
          clearPendingPlan();
          
          if (requiresPayment) {
            // Processar pagamento
            signupManager.setState(SIGNUP_PHASES.PAYMENT_PROCESSING);
            
            const priceId = pendingPlan ? 
              (pendingPlan.billingInterval === 'annual' ? 
                pendingPlan.priceIdEnvAnnual : 
                pendingPlan.priceIdEnvMonthly) :
              'VITE_STRIPE_PRICE_STARTER';
            
            const checkout = await createCheckoutSession(
              priceId, 
              planId, 
              user.email
            );
            
            // Redirecionar para Stripe
            window.location.href = checkout.url;
            return; // Não continuar aqui, o Stripe redirecionará de volta
          } else {
            // Trial: ir direto para dashboard
            signupManager.setState(SIGNUP_PHASES.COMPLETE);
            navigate('/dashboard');
          }
        } catch (creationError: any) {
          // Rollback automático
          await handleAccountCreationError(user.uid, creationError);
          
          // Registrar erro
          signupManager.setState(SIGNUP_PHASES.IDLE, {
            error: creationError.message,
            phase: 'creating_account'
          });
          
          throw creationError;
        }
      } else {
        // Usuário existente
        const pendingPlan = getPendingPlan();
        if (pendingPlan) {
          // Processar plano pendente
          await processPendingPlan(user);
        } else {
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      setError(getAuthErrorMessage(error));
      
      // Registrar falha
      const signupManager = new SignupStateManager();
      signupManager.setState(SIGNUP_PHASES.IDLE, {
        error: error.message,
        phase: 'auth_processing'
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset de senha
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError('Digite seu e-mail para recuperar a senha')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')
    
    try {
      await sendPasswordResetEmail(auth, email)
      setSuccess('E-mail de recuperação enviado! Verifique sua caixa de entrada.')
      setTimeout(() => {
        setShowResetPassword(false)
        setSuccess('')
      }, 3000)
    } catch (err: any) {
      console.error('Password reset error:', err)
      if (err.code === 'auth/user-not-found') {
        setError('E-mail não encontrado')
      } else if (err.code === 'auth/invalid-email') {
        setError('E-mail inválido')
      } else {
        setError('Erro ao enviar e-mail de recuperação')
      }
    } finally {
      setLoading(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      // Validações de signup
      if (isSignup) {
        const passwordError = validatePassword(password)
        if (passwordError) {
          setError(passwordError)
          setLoading(false)
          setPassword('')
          setConfirmPassword('')
          passwordInputRef.current?.focus()
          return
        }

        if (password !== confirmPassword) {
          setError('As senhas não coincidem')
          setLoading(false)
          setPassword('')
          setConfirmPassword('')
          passwordInputRef.current?.focus()
          return
        }
      }

      if (isSignup) {
        const userCred = await createUserWithEmailAndPassword(auth, email, password)
        // Enviar verificação de email
        try {
          await sendEmailVerification(userCred.user)
          setSuccess('Conta criada! Verifique seu e-mail para ativá-la.')
        } catch (verifyErr) {
          console.warn('Failed to send verification email', verifyErr)
        }
        // create user doc in Firestore
        try {
          const init = makeInitialUserData(userCred.user.uid, userCred.user.email)
          if (!init.company) init.company = { name: '', website: '' }
          init.company.name = companyName || ''
          await setDoc(doc(db, 'users', userCred.user.uid), init, { merge: true })
          // Start trial
          try {
            const token = await userCred.user.getIdToken()
            await fetch('/api/start-trial', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ uid: userCred.user.uid, email: userCred.user.email, planId: 'free' }),
            })
          } catch (trialErr) {
            console.error('failed to start trial on signup', trialErr)
          }
          // Create tenant
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
        // Verificar se há plano pendente para processar checkout
        const hasPendingPlan = await processPendingPlan(userCred.user)
        if (hasPendingPlan) {
          // processPendingPlan já faz o redirecionamento
          return
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password)
        // Verificar se há plano pendente após login
        const hasPendingPlan = await processPendingPlan(auth.currentUser)
        if (hasPendingPlan) {
          // processPendingPlan já faz o redirecionamento
          return
        }
      }
      navigate('/dashboard')
    } catch (err: any) {
      console.error(err)
      const code = err?.code || ''
      
      // Mensagens de erro mais amigáveis
      if (code.includes('auth/email-already-in-use')) {
        setError('Este e-mail já está em uso. Tente fazer login.')
      } else if (code.includes('auth/wrong-password') || code.includes('auth/invalid-credential')) {
        setError('E-mail ou senha incorretos')
      } else if (code.includes('auth/user-not-found')) {
        setError('Usuário não encontrado. Crie uma conta.')
      } else if (code.includes('auth/invalid-email')) {
        setError('E-mail inválido')
      } else if (code.includes('auth/weak-password')) {
        setError('Senha muito fraca. Use pelo menos 6 caracteres.')
      } else if (code.includes('auth/too-many-requests')) {
        setError('Muitas tentativas. Tente novamente mais tarde.')
      } else if (code.includes('auth/network-request-failed')) {
        setError('Erro de conexão. Verifique sua internet.')
      } else {
        setError('Erro ao autenticar. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Banner do Plano Selecionado */}
        {selectedPlan && isSignup && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 shadow-sm animate-fadeIn" aria-live="polite">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-900 text-sm">Plano Selecionado: {selectedPlan.planName || selectedPlan.planId}</h3>
                <p className="text-green-700 text-xs mt-1">
                  {selectedPlan.planId === 'trial' 
                    ? 'Após criar sua conta, você terá 7 dias grátis!' 
                    : `Após criar sua conta, você será direcionado para o pagamento.`}
                </p>
                {/* Nota sobre "Ilimitado" diário ter teto prático mensal */}
                {selectedPlan.planId !== 'trial' && (
                  <p className="text-xs text-gray-600 mt-2">
                    <strong>Nota:</strong> quando um plano exibe "Ilimitado" por dia, existe um teto prático equivalente ao limite mensal do plano — verifique a página <a href="/plans" className="text-indigo-600 underline">Planos</a> para detalhes.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Logo e Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {showResetPassword ? 'Recuperar Senha' : isSignup ? 'Criar sua conta' : 'Bem-vindo de volta'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {showResetPassword ? (
              'Digite seu e-mail para receber instruções'
            ) : isSignup ? (
              <>
                Já tem uma conta?{' '}
                <button
                  type="button"
                  onClick={() => {setIsSignup(false); setError(''); setSuccess('')}}
                  className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                >
                  Faça login
                </button>
              </>
            ) : (
              <>
                Não tem uma conta?{' '}
                {selectedPlan ? (
                  <button
                    type="button"
                    onClick={() => {setIsSignup(true); setError(''); setSuccess('')}}
                    className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                  >
                    Cadastre-se grátis
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/plans')}
                    className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                  >
                    Escolher um plano
                  </button>
                )}
              </>
            )}
          </p>
        </div>

        {/* Card de Login/Signup */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-200/60 p-8">
          {/* Mensagens de Erro e Sucesso acessíveis */}
          {(!!error || !!success) && (
            <div className={`mb-4 px-4 py-3 rounded-xl flex items-start border text-sm ${error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`} aria-live="polite">
              {error ? (
                <>
                  <svg className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                  {error.includes('Usuário não encontrado') && (
                    <button onClick={() => navigate('/plans')} className="underline text-indigo-600 ml-2">Escolher um plano</button>
                  )}
                </>
              ) : (
                <>
                  <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{success}</span>
                </>
              )}
            </div>
          )}

          {showResetPassword ? (
            /* Formulário de Reset de Senha */
            <form onSubmit={handlePasswordReset} className="space-y-6">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail
                </label>
                <input
                  id="reset-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  placeholder="seu@email.com"
                />
              </div>

              <div className="flex flex-col space-y-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Enviando...
                    </div>
                  ) : (
                    'Enviar link de recuperação'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {setShowResetPassword(false); setError(''); setSuccess('')}}
                  className="w-full py-3 px-4 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Voltar ao login
                </button>
              </div>
            </form>
          ) : (
            /* Formulário de Login/Signup */
            <form onSubmit={submit} className="space-y-6">
              {/* Login com Google - Destaque */}
              <div>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center py-3 px-4 border-2 border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all group"
                >
                  <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="group-hover:text-gray-900 transition-colors">
                    {isSignup ? 'Cadastrar com Google' : 'Entrar com Google'}
                  </span>
                </button>
              </div>

              {/* Divisor */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Ou continue com e-mail</span>
                </div>
              </div>

              {isSignup && (
                <div>
                  <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Nome da Empresa
                  </label>
                  <input
                    id="company-name"
                    name="companyName"
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    placeholder="Minha Empresa"
                  />
                </div>
              )}

              <div>
                <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="appearance-none relative block w-full px-4 py-3 pr-12 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    placeholder={isSignup ? "Crie uma senha forte" : "Digite sua senha"}
                    ref={passwordInputRef}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {isSignup && (
                  <p className="mt-2 text-xs text-gray-500">
                    Mínimo 8 caracteres com letras maiúsculas, minúsculas, números e símbolos
                  </p>
                )}
              </div>

              {isSignup && (
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar Senha
                  </label>
                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    placeholder="Digite a senha novamente"
                    disabled={loading}
                  />
                </div>
              )}

              {!isSignup && (
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {setShowResetPassword(true); setError(''); setSuccess('')}}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                  >
                    Esqueceu sua senha?
                  </button>
                </div>
              )}

              <div>
                {isSignup && !selectedPlan ? (
                  <button
                    type="button"
                    className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-lg hover:shadow-xl"
                    onClick={() => navigate('/plans')}
                  >
                    Escolher um plano
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        {isSignup ? 'Criando conta...' : 'Entrando...'}
                      </div>
                    ) : (
                      <span>{isSignup ? 'Criar conta grátis' : 'Entrar'}</span>
                    )}
                  </button>
                )}
              </div>

              {isSignup && (
                <p className="text-xs text-center text-gray-500">
                  Ao criar uma conta, você concorda com nossos{' '}
                  <a href="/terms" className="text-indigo-600 hover:text-indigo-500 underline">
                    Termos de Uso
                  </a>{' '}
                  e{' '}
                  <a href="/privacy" className="text-indigo-600 hover:text-indigo-500 underline">
                    Política de Privacidade
                  </a>
                </p>
              )}
            </form>
          )}
        </div>

        {/* Indicadores de Segurança */}
        <div className="mt-6">
          <div className="flex items-center justify-center space-x-6 text-xs text-gray-500">
            <div className="flex items-center">
              <svg className="h-4 w-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Protegido por SSL</span>
            </div>
            <div className="flex items-center">
              <svg className="h-4 w-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>Dados Criptografados</span>
            </div>
            <div className="flex items-center">
              <svg className="h-4 w-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Firebase Auth</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login;
