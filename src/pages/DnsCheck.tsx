import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../lib/firebase'

interface DnsCheckResult {
  spf: { status: 'success' | 'warning' | 'error'; message: string }
  dkim: { status: 'success' | 'warning' | 'error'; message: string }
  dmarc: { status: 'success' | 'warning' | 'error'; message: string }
  domain: string
}

export default function DnsCheck() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [domain, setDomain] = useState('')
  const [result, setResult] = useState<DnsCheckResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      if (!u) navigate('/login')
    })
    return () => unsubscribe()
  }, [navigate])

  const checkDns = async () => {
    if (!domain.trim()) {
      setError('Digite um domínio válido (ex: turvia.com.br)')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const token = await auth.currentUser?.getIdToken()
      const resp = await fetch('/api/check-dns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ domain: domain.trim() })
      })

      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || 'Erro ao verificar DNS')
      
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Erro ao verificar DNS')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    if (status === 'success') return '✅'
    if (status === 'warning') return '⚠️'
    return '❌'
  }

  const getStatusColor = (status: string) => {
    if (status === 'success') return 'text-green-600'
    if (status === 'warning') return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-slate-600 hover:text-slate-900 mb-4 flex items-center gap-2"
          >
            ← Voltar ao Dashboard
          </button>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Verificação de DNS
          </h1>
          <p className="text-slate-600">
            Verifique se seu domínio está configurado corretamente para envio de emails
          </p>
        </div>

        {/* Input */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Digite seu domínio
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="exemplo: turvia.com.br"
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && checkDns()}
            />
            <button
              onClick={checkDns}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Verificando...' : 'Verificar'}
            </button>
          </div>
          {error && (
            <p className="text-red-600 text-sm mt-2">{error}</p>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* SPF */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getStatusIcon(result.spf.status)}</span>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    SPF (Sender Policy Framework)
                  </h3>
                  <p className={`text-sm ${getStatusColor(result.spf.status)} mb-2`}>
                    {result.spf.message}
                  </p>
                  {result.spf.status !== 'success' && (
                    <div className="bg-slate-50 rounded-lg p-4 mt-3">
                      <p className="text-xs font-mono text-slate-700 mb-2">
                        <strong>Adicione este registro TXT no seu DNS:</strong>
                      </p>
                      <div className="bg-white border border-slate-200 rounded p-3 text-xs font-mono">
                        <div><strong>Tipo:</strong> TXT</div>
                        <div><strong>Nome:</strong> @</div>
                        <div><strong>Valor:</strong> v=spf1 include:spf.brevo.com ~all</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* DKIM */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getStatusIcon(result.dkim.status)}</span>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    DKIM (DomainKeys Identified Mail)
                  </h3>
                  <p className={`text-sm ${getStatusColor(result.dkim.status)} mb-2`}>
                    {result.dkim.message}
                  </p>
                  {result.dkim.status !== 'success' && (
                    <div className="bg-slate-50 rounded-lg p-4 mt-3">
                      <p className="text-xs text-slate-700">
                        <strong>Como configurar:</strong>
                      </p>
                      <ol className="list-decimal list-inside text-xs text-slate-600 mt-2 space-y-1">
                        <li>Acesse Brevo → Senders → Domains</li>
                        <li>Adicione seu domínio {result.domain}</li>
                        <li>Copie os registros DKIM fornecidos</li>
                        <li>Adicione no seu provedor de DNS</li>
                        <li>Aguarde propagação (até 48h)</li>
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* DMARC */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getStatusIcon(result.dmarc.status)}</span>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    DMARC (Domain-based Message Authentication)
                  </h3>
                  <p className={`text-sm ${getStatusColor(result.dmarc.status)} mb-2`}>
                    {result.dmarc.message}
                  </p>
                  {result.dmarc.status !== 'success' && (
                    <div className="bg-slate-50 rounded-lg p-4 mt-3">
                      <p className="text-xs font-mono text-slate-700 mb-2">
                        <strong>Adicione este registro TXT no seu DNS:</strong>
                      </p>
                      <div className="bg-white border border-slate-200 rounded p-3 text-xs font-mono">
                        <div><strong>Tipo:</strong> TXT</div>
                        <div><strong>Nome:</strong> _dmarc</div>
                        <div><strong>Valor:</strong> v=DMARC1; p=none; rua=mailto:postmaster@{result.domain}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">
                💡 Por que isso é importante?
              </h3>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• <strong>SPF:</strong> Autoriza servidores Brevo a enviar emails pelo seu domínio</li>
                <li>• <strong>DKIM:</strong> Assina digitalmente seus emails (prova de autenticidade)</li>
                <li>• <strong>DMARC:</strong> Define política contra falsificação do seu domínio</li>
              </ul>
              <p className="text-xs text-blue-700 mt-3">
                ⚠️ <strong>Sem esses registros:</strong> seus emails têm alta chance de ir para spam
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
