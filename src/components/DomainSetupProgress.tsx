import { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'

interface DomainStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  requiredRecords?: Array<{
    type: string
    name: string
    value: string
    verified?: boolean
  }>
}

interface DomainSetupProgressProps {
  tenantId: string
  domain: string
  onComplete?: () => void
}

export default function DomainSetupProgress({ tenantId, domain, onComplete }: DomainSetupProgressProps) {
  const [steps, setSteps] = useState<DomainStep[]>([])
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    if (!tenantId || !domain) return

    const loadDomainSetup = async () => {
      try {
        // Buscar configuração de domínio existente
        const domainRef = doc(db, `tenants/${tenantId}/domains/${domain}`)
        const domainSnap = await getDoc(domainRef)

        let domainData = null
        if (domainSnap.exists()) {
          domainData = domainSnap.data()
        }

        // Etapas padrão de configuração
        const defaultSteps: DomainStep[] = [
          {
            id: 'domain_verification',
            title: 'Verificação de Domínio',
            description: 'Verificar propriedade do domínio',
            status: domainData?.verified ? 'completed' : 'pending',
            requiredRecords: [
              {
                type: 'TXT',
                name: `_turmail-${tenantId}`,
                value: `turmail-verification-${Date.now()}`,
                verified: domainData?.verificationRecord?.verified || false
              }
            ]
          },
          {
            id: 'mx_records',
            title: 'Configuração MX',
            description: 'Configurar registros MX para recebimento de emails',
            status: domainData?.mxConfigured ? 'completed' : 'pending',
            requiredRecords: [
              {
                type: 'MX',
                name: domain,
                value: 'mx.turmail.com',
                verified: domainData?.mxVerified || false
              }
            ]
          },
          {
            id: 'spf_dkim',
            title: 'SPF e DKIM',
            description: 'Configurar autenticação de email',
            status: domainData?.spfDkimConfigured ? 'completed' : 'pending',
            requiredRecords: [
              {
                type: 'TXT',
                name: domain,
                value: 'v=spf1 include:_spf.turmail.com ~all',
                verified: domainData?.spfVerified || false
              },
              {
                type: 'TXT',
                name: `turmail._domainkey.${domain}`,
                value: 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...',
                verified: domainData?.dkimVerified || false
              }
            ]
          },
          {
            id: 'dmarc',
            title: 'DMARC',
            description: 'Configurar política DMARC para proteção',
            status: domainData?.dmarcConfigured ? 'completed' : 'pending',
            requiredRecords: [
              {
                type: 'TXT',
                name: `_dmarc.${domain}`,
                value: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@turmail.com',
                verified: domainData?.dmarcVerified || false
              }
            ]
          },
          {
            id: 'email_testing',
            title: 'Teste de Envio',
            description: 'Enviar email de teste para verificar configuração',
            status: domainData?.testEmailSent ? 'completed' : 'pending'
          },
          {
            id: 'activation',
            title: 'Ativação Final',
            description: 'Domínio pronto para uso em campanhas',
            status: domainData?.activated ? 'completed' : 'pending'
          }
        ]

        setSteps(defaultSteps)
      } catch (error) {
        console.error('Failed to load domain setup:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDomainSetup()
  }, [tenantId, domain])

  const verifyRecords = async (stepId: string) => {
    setVerifying(true)
    try {
      // Simular verificação DNS (em produção, isso seria uma chamada para API)
      const response = await fetch(`/api/domain/verify-records?domain=${domain}&tenantId=${tenantId}&step=${stepId}`)
      const result = await response.json()

      if (result.success) {
        // Atualizar status da etapa
        setSteps(prev => prev.map(step =>
          step.id === stepId
            ? { ...step, status: 'completed' as const }
            : step
        ))

        // Salvar no Firestore
        const domainRef = doc(db, `tenants/${tenantId}/domains/${domain}`)
        const updateData: any = {}
        updateData[`${stepId}Verified`] = true
        updateData[`${stepId}Configured`] = true
        await updateDoc(domainRef, updateData, { merge: true })

        // Verificar se todas as etapas estão completas
        const allCompleted = steps.every(s => s.id === stepId || s.status === 'completed')
        if (allCompleted && onComplete) {
          onComplete()
        }
      }
    } catch (error) {
      console.error('Failed to verify records:', error)
    } finally {
      setVerifying(false)
    }
  }

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅'
      case 'in_progress':
        return '🔄'
      case 'failed':
        return '❌'
      default:
        return '⏳'
    }
  }

  const completedSteps = steps.filter(s => s.status === 'completed').length
  const progressPercentage = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            🔧 Configuração de Domínio: {domain}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {completedSteps} de {steps.length} etapas concluídas
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            {Math.round(progressPercentage)}%
          </div>
          <div className="text-xs text-gray-500">Concluído</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
        <div
          className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start space-x-4">
            {/* Step Number */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step.status === 'completed'
                ? 'bg-green-500 text-white'
                : step.status === 'in_progress'
                ? 'bg-blue-500 text-white animate-pulse'
                : 'bg-gray-200 text-gray-600'
            }`}>
              {step.status === 'completed' ? '✓' : index + 1}
            </div>

            {/* Step Content */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-800">
                  {getStepIcon(step.status)} {step.title}
                </h4>
                {step.status === 'pending' && (
                  <button
                    onClick={() => verifyRecords(step.id)}
                    disabled={verifying}
                    className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    {verifying ? 'Verificando...' : 'Verificar'}
                  </button>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-3">{step.description}</p>

              {/* DNS Records */}
              {step.requiredRecords && step.requiredRecords.length > 0 && (
                <div className="bg-gray-50 rounded p-3 mb-3">
                  <p className="text-xs font-medium text-gray-700 mb-2">Registros DNS necessários:</p>
                  <div className="space-y-2">
                    {step.requiredRecords.map((record, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono bg-white px-2 py-1 rounded border">
                            {record.type}
                          </span>
                          <span className="font-mono text-gray-800">{record.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${
                            record.verified ? 'bg-green-500' : 'bg-gray-300'
                          }`}></span>
                          <span className={record.verified ? 'text-green-600' : 'text-gray-500'}>
                            {record.verified ? 'Verificado' : 'Pendente'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Message */}
              <div className={`text-xs px-2 py-1 rounded inline-block ${
                step.status === 'completed'
                  ? 'bg-green-100 text-green-700'
                  : step.status === 'failed'
                  ? 'bg-red-100 text-red-700'
                  : step.status === 'in_progress'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {step.status === 'completed' && '✅ Concluído'}
                {step.status === 'in_progress' && '🔄 Em andamento'}
                {step.status === 'failed' && '❌ Falhou - tente novamente'}
                {step.status === 'pending' && '⏳ Aguardando configuração'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Help Section */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <h4 className="font-medium text-blue-800 mb-2">💡 Dicas para Configuração</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Acesse o painel do seu provedor de domínio (GoDaddy, Namecheap, etc.)</li>
          <li>• Vá para configurações DNS e adicione os registros mostrados acima</li>
          <li>• As mudanças DNS podem levar até 24-48 horas para propagar</li>
          <li>• Clique em "Verificar" após adicionar cada registro</li>
        </ul>
      </div>
    </div>
  )
}