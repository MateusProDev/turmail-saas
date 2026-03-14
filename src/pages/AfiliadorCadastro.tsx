import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaUser, FaEnvelope, FaLock, FaPhone, FaInstagram, FaTag, FaSpinner, FaArrowRight } from 'react-icons/fa'
import { registerAffiliate, loginAffiliate } from '../lib/affiliateService'

type Mode = 'login' | 'register'

export default function AfiliadorCadastro() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')

  /* ── Login state ── */
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  /* ── Register state ── */
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [phone, setPhone] = useState('')
  const [instagram, setInstagram] = useState('')
  const [coupon, setCoupon] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  /* ── Login ── */
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await loginAffiliate(loginEmail.trim(), loginPassword)
      navigate('/afiliado/painel')
    } catch (err: any) {
      const msg = err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
        ? 'E-mail ou senha incorretos.'
        : err.message || 'Erro ao fazer login.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  /* ── Register ── */
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (!coupon.trim()) {
      setError('Informe o código do cupom desejado.')
      return
    }

    setLoading(true)
    try {
      await registerAffiliate({ name, email: email.trim(), password, phone, instagram, coupon })
      setSuccess('Cadastro realizado! Aguarde a aprovação da loja. Você receberá um contato no WhatsApp.')
      setTimeout(() => navigate('/afiliado/painel'), 2500)
    } catch (err: any) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'Este e-mail já está cadastrado. Faça login.'
        : err.message || 'Erro ao cadastrar.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="bg-black border-b border-gray-800 px-4 py-4">
        <Link to="/" className="flex items-center gap-2 w-fit">
          <img src="/android-icon-48x48.png" alt="BenSuplementos" className="w-9 h-9 rounded-lg object-contain" />
          <span className="text-base font-extrabold text-white">Ben<span className="text-green-400">Suplementos</span></span>
        </Link>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-1.5 bg-green-900/40 border border-green-700 text-green-400 text-xs font-bold px-3 py-1.5 rounded-full">
              <FaTag className="w-3 h-3" />
              Programa de Afiliados
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white text-center mb-1">
            {mode === 'login' ? 'Entrar no Painel' : 'Torne-se Afiliado'}
          </h1>
          <p className="text-gray-400 text-sm text-center mb-6">
            {mode === 'login'
              ? 'Acesse seu painel para acompanhar suas vendas'
              : 'Cadastre-se e ganhe comissão por cada indicação'}
          </p>

          {/* Tabs */}
          <div className="flex bg-gray-900 rounded-xl p-1 mb-6">
            <button
              onClick={() => { setMode('login'); setError('') }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
                mode === 'login' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => { setMode('register'); setError('') }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
                mode === 'register' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Cadastrar
            </button>
          </div>

          {/* Feedback */}
          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 text-xs px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-900/40 border border-green-700 text-green-300 text-xs px-4 py-3 rounded-lg mb-4">
              ✅ {success}
            </div>
          )}

          {/* ── LOGIN FORM ── */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="email"
                  placeholder="Seu e-mail"
                  required
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 bg-gray-900 border border-gray-700 text-white text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500"
                />
              </div>
              <div className="relative">
                <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="password"
                  placeholder="Sua senha"
                  required
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 bg-gray-900 border border-gray-700 text-white text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <FaSpinner className="w-4 h-4 animate-spin" /> : <><FaArrowRight className="w-3.5 h-3.5" /> Entrar no painel</>}
              </button>
            </form>
          )}

          {/* ── REGISTER FORM ── */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="relative">
                <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Nome completo"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 bg-gray-900 border border-gray-700 text-white text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500"
                />
              </div>
              <div className="relative">
                <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="email"
                  placeholder="Seu e-mail"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 bg-gray-900 border border-gray-700 text-white text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                  <input
                    type="password"
                    placeholder="Senha"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 bg-gray-900 border border-gray-700 text-white text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500"
                  />
                </div>
                <div className="relative">
                  <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                  <input
                    type="password"
                    placeholder="Confirmar"
                    required
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 bg-gray-900 border border-gray-700 text-white text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500"
                  />
                </div>
              </div>
              <div className="relative">
                <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="tel"
                  placeholder="WhatsApp (85 9XXXX-XXXX)"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 bg-gray-900 border border-gray-700 text-white text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500"
                />
              </div>
              <div className="relative">
                <FaInstagram className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Instagram (opcional)"
                  value={instagram}
                  onChange={e => setInstagram(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 bg-gray-900 border border-gray-700 text-white text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500"
                />
              </div>
              <div className="relative">
                <FaTag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Código do cupom desejado (ex: JOAO10)"
                  required
                  value={coupon}
                  onChange={e => setCoupon(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  className="w-full pl-9 pr-4 py-3 bg-gray-900 border border-gray-700 text-white text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500 font-mono tracking-widest"
                />
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Após o cadastro, sua conta ficará com status <span className="text-yellow-400 font-bold">pendente</span> até aprovação da loja.
                Você receberá uma confirmação no WhatsApp.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <FaSpinner className="w-4 h-4 animate-spin" /> : <><FaTag className="w-3.5 h-3.5" /> Cadastrar como Afiliado</>}
              </button>
            </form>
          )}

          <p className="text-center text-gray-600 text-xs mt-6">
            <Link to="/" className="hover:text-green-400 transition-colors">← Voltar para a loja</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
