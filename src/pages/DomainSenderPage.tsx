import { useAuth } from '../contexts/AuthContext'
import DomainSenderManager from '../components/DomainSenderManager'

export default function DomainSenderPage() {
  const { user } = useAuth()

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Acesso Negado</h1>
          <p className="text-gray-600">Você precisa estar logado para gerenciar domínios e remetentes.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ⚙️ Gerenciar Domínios e Remetentes
          </h1>
          <p className="text-gray-600">
            Configure domínios personalizados e identidades de remetente para suas campanhas de email.
          </p>
        </div>

        <DomainSenderManager />

        {/* Info Section */}
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              📧 Sobre Domínios de Envio
            </h2>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                <strong>Domínios de envio</strong> permitem que você envie emails usando seu próprio domínio
                (ex: newsletter@minhacompany.com) ao invés de um domínio genérico.
              </p>
              <p>
                <strong>Benefícios:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Melhor taxa de entrega</li>
                <li>Credibilidade profissional</li>
                <li>Proteção contra spam</li>
                <li>Autenticação SPF/DKIM</li>
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              👤 Sobre Identidades de Remetente
            </h2>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                <strong>Identidades de remetente</strong> são os emails e nomes que aparecem como
                "De:" nas suas campanhas de email.
              </p>
              <p>
                <strong>Requisitos:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Email deve existir e ser acessível</li>
                <li>Verificação obrigatória por email</li>
                <li>Um remetente por domínio de envio</li>
                <li>Máximo de remetentes por conta varia por plano</li>
              </ul>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            ❓ Perguntas Frequentes
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-800">Quanto tempo leva para configurar um domínio?</h3>
              <p className="text-sm text-gray-600 mt-1">
                A configuração técnica leva cerca de 30-60 minutos. A propagação DNS pode levar até 24-48 horas.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-800">Posso usar subdomínios?</h3>
              <p className="text-sm text-gray-600 mt-1">
                Sim! Você pode configurar domínios como "mail.minhaempresa.com" ou "newsletter.loja.com".
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-800">O que acontece se eu não verificar o domínio?</h3>
              <p className="text-sm text-gray-600 mt-1">
                Sem verificação, você não poderá usar o domínio para envio. Os emails serão enviados do domínio padrão.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-800">Posso mudar o remetente depois de criar uma campanha?</h3>
              <p className="text-sm text-gray-600 mt-1">
                Sim, mas apenas para campanhas não enviadas. Campanhas em andamento mantêm o remetente original.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}