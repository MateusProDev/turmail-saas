import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import DomainSetupProgress from '../components/DomainSetupProgress'

export default function DomainSetupPage() {
  const { user } = useAuth()
  const [selectedDomain, setSelectedDomain] = useState('')
  const [showProgress, setShowProgress] = useState(false)

  const handleStartSetup = () => {
    if (selectedDomain.trim()) {
      setShowProgress(true)
    }
  }

  const handleSetupComplete = () => {
    alert('🎉 Configuração de domínio concluída! O domínio está pronto para uso.')
    setShowProgress(false)
    setSelectedDomain('')
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Acesso Negado</h1>
          <p className="text-gray-600">Você precisa estar logado para configurar domínios.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ⚙️ Configuração de Domínio Personalizado
          </h1>
          <p className="text-gray-600">
            Configure seu próprio domínio para enviar emails profissionais e aumentar a taxa de entrega.
          </p>
        </div>

        {!showProgress ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              🚀 Começar Configuração
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-2">
                  Digite seu domínio (ex: minhacompany.com)
                </label>
                <input
                  type="text"
                  id="domain"
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                  placeholder="seudominio.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleStartSetup}
                disabled={!selectedDomain.trim()}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                🔧 Iniciar Configuração
              </button>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <h3 className="font-medium text-yellow-800 mb-2">⚠️ Pré-requisitos</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Você deve ter acesso administrativo ao painel DNS do seu domínio</li>
                <li>• O domínio deve estar registrado e ativo</li>
                <li>• Tenha cerca de 30-60 minutos disponíveis para a configuração</li>
              </ul>
            </div>
          </div>
        ) : (
          <DomainSetupProgress
            tenantId={user.uid} // Usando user.uid como tenantId por simplicidade
            domain={selectedDomain}
            onComplete={handleSetupComplete}
          />
        )}

        {/* Benefits Section */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            ✨ Benefícios do Domínio Personalizado
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">📧</div>
              <div>
                <h3 className="font-medium text-gray-800">Email Profissional</h3>
                <p className="text-sm text-gray-600">Envie emails com seu próprio domínio (@seudominio.com)</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="text-2xl">📈</div>
              <div>
                <h3 className="font-medium text-gray-800">Melhor Entrega</h3>
                <p className="text-sm text-gray-600">Aumente a taxa de entrega e evite filtros de spam</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="text-2xl">🔒</div>
              <div>
                <h3 className="font-medium text-gray-800">Autenticação SPF/DKIM</h3>
                <p className="text-sm text-gray-600">Proteja sua reputação com autenticação avançada</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="text-2xl">🎯</div>
              <div>
                <h3 className="font-medium text-gray-800">Branding Consistente</h3>
                <p className="text-sm text-gray-600">Reforce sua marca em todas as comunicações</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}