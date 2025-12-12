import { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import { doc, setDoc, collection, query, getDocs } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'

interface SendingDomain {
  id: string
  domain: string
  status: 'pending' | 'verified' | 'failed'
  dkimStatus: 'pending' | 'verified' | 'failed'
  spfStatus: 'pending' | 'verified' | 'failed'
  createdAt: Date
  verifiedAt?: Date
  brevoDomainId?: string
}

interface SenderIdentity {
  id: string
  email: string
  name: string
  status: 'pending' | 'verified' | 'failed'
  createdAt: Date
  verifiedAt?: Date
  brevoSenderId?: string
}

export default function DomainSenderManager() {
  const { user, loading: authLoading } = useAuth()
  console.log('[DomainSenderManager] Component rendered, authLoading:', authLoading, 'user:', !!user)
  const [sendingDomains, setSendingDomains] = useState<SendingDomain[]>([])
  const [senderIdentities, setSenderIdentities] = useState<SenderIdentity[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'domains' | 'senders'>('domains')

  // Form states
  const [newDomain, setNewDomain] = useState('')
  const [newSenderEmail, setNewSenderEmail] = useState('')
  const [newSenderName, setNewSenderName] = useState('')
  const [addingDomain, setAddingDomain] = useState(false)
  const [addingSender, setAddingSender] = useState(false)

  // Verificar autenticação
  console.log('[DomainSenderManager] Checking auth - authLoading:', authLoading, 'user:', !!user)
  if (authLoading) {
    console.log('[DomainSenderManager] Still loading auth, showing loading state')
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    console.log('[DomainSenderManager] No user, showing access denied')
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <h3 className="text-lg font-medium text-gray-800 mb-2">Acesso Negado</h3>
          <p className="text-sm text-gray-600">Você precisa estar logado para gerenciar domínios e remetentes.</p>
        </div>
      </div>
    )
  }

  useEffect(() => {
    console.log('[DomainSenderManager] useEffect triggered, user:', !!user)
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    console.log('[DomainSenderManager] loadData called')
    if (!user) {
      console.log('[DomainSenderManager] No user, returning')
      return
    }

    try {
      console.log('[DomainSenderManager] Setting dataLoading to true')
      setDataLoading(true)

      // Load sending domains
      console.log('[DomainSenderManager] Loading sending domains...')
      const domainsQuery = query(
        collection(db, `tenants/${user.uid}/sendingDomains`)
      )
      const domainsSnap = await getDocs(domainsQuery)
      console.log('[DomainSenderManager] Domains query result:', domainsSnap.docs.length, 'documents')
      const domains = domainsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        verifiedAt: doc.data().verifiedAt?.toDate()
      })) as SendingDomain[]
      console.log('[DomainSenderManager] Setting domains:', domains.length)
      setSendingDomains(domains)

      // Load sender identities
      console.log('[DomainSenderManager] Loading sender identities...')
      const sendersQuery = query(
        collection(db, `tenants/${user.uid}/senderIdentities`)
      )
      const sendersSnap = await getDocs(sendersQuery)
      console.log('[DomainSenderManager] Senders query result:', sendersSnap.docs.length, 'documents')
      const senders = sendersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        verifiedAt: doc.data().verifiedAt?.toDate()
      })) as SenderIdentity[]
      console.log('[DomainSenderManager] Setting senders:', senders.length)
      setSenderIdentities(senders)

    } catch (error) {
      console.error('[DomainSenderManager] Failed to load domain/sender data:', error)
    } finally {
      console.log('[DomainSenderManager] Setting dataLoading to false')
      setDataLoading(false)
    }
  }

  const addSendingDomain = async () => {
    if (!newDomain.trim() || !user) return

    try {
      setAddingDomain(true)

      // Validar domínio
      const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
      if (!domainRegex.test(newDomain)) {
        alert('Domínio inválido. Use apenas letras, números e hífens.')
        return
      }

      // Verificar se domínio já existe
      const existingDomain = sendingDomains.find(d => d.domain === newDomain)
      if (existingDomain) {
        alert('Este domínio já está cadastrado.')
        return
      }

      // Criar domínio na Brevo via API
      const response = await fetch('/api/brevo/create-sending-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: newDomain,
          tenantId: user.uid
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Falha ao criar domínio na Brevo')
      }

      // Salvar no Firestore
      const domainRef = doc(collection(db, `tenants/${user.uid}/sendingDomains`))
      await setDoc(domainRef, {
        domain: newDomain,
        status: 'pending',
        dkimStatus: 'pending',
        spfStatus: 'pending',
        brevoDomainId: result.brevoDomainId,
        createdAt: new Date()
      })

      setNewDomain('')
      loadData()

      alert(`✅ Domínio ${newDomain} adicionado! Agora configure os registros DNS.`)

    } catch (error) {
      console.error('Failed to add domain:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      alert('Erro ao adicionar domínio: ' + errorMessage)
    } finally {
      setAddingDomain(false)
    }
  }

  const addSenderIdentity = async () => {
    if (!newSenderEmail.trim() || !newSenderName.trim() || !user) return

    try {
      setAddingSender(true)

      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(newSenderEmail)) {
        alert('Email inválido.')
        return
      }

      // Verificar se sender já existe
      const existingSender = senderIdentities.find(s => s.email === newSenderEmail)
      if (existingSender) {
        alert('Este email já está cadastrado como remetente.')
        return
      }

      // Criar sender na Brevo via API
      const response = await fetch('/api/brevo/create-sender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newSenderEmail,
          name: newSenderName,
          tenantId: user.uid
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Falha ao criar remetente na Brevo')
      }

      // Salvar no Firestore
      const senderRef = doc(collection(db, `tenants/${user.uid}/senderIdentities`))
      await setDoc(senderRef, {
        email: newSenderEmail,
        name: newSenderName,
        status: 'pending',
        brevoSenderId: result.brevoSenderId,
        createdAt: new Date()
      })

      setNewSenderEmail('')
      setNewSenderName('')
      loadData()

      alert(`✅ Remetente ${newSenderEmail} adicionado! Verifique seu email para confirmar.`)

    } catch (error) {
      console.error('Failed to add sender:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      alert('Erro ao adicionar remetente: ' + errorMessage)
    } finally {
      setAddingSender(false)
    }
  }

  const verifyDomain = async (domainId: string) => {
    if (!user) return

    try {
      const response = await fetch('/api/brevo/verify-sending-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId,
          tenantId: user.uid
        })
      })

      const result = await response.json()

      if (result.success) {
        loadData()
        alert('✅ Domínio verificado com sucesso!')
      } else {
        alert('❌ Verificação falhou. Verifique os registros DNS.')
      }
    } catch (error) {
      console.error('Failed to verify domain:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      alert('Erro ao verificar domínio: ' + errorMessage)
    }
  }

  const verifySender = async (senderId: string) => {
    if (!user) return

    try {
      const response = await fetch('/api/brevo/verify-sender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId,
          tenantId: user.uid
        })
      })

      const result = await response.json()

      if (result.success) {
        loadData()
        alert('✅ Remetente verificado com sucesso!')
      } else {
        alert('❌ Verificação falhou. Verifique seu email.')
      }
    } catch (error) {
      console.error('Failed to verify sender:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      alert('Erro ao verificar remetente: ' + errorMessage)
    }
  }

  if (dataLoading) {
    console.log('[DomainSenderManager] Data loading, showing loading state')
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
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

  console.log('[DomainSenderManager] Rendering main component, dataLoading:', dataLoading, 'domains:', sendingDomains.length, 'senders:', senderIdentities.length)

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          <button
            onClick={() => setActiveTab('domains')}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'domains'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📧 Domínios de Envio
          </button>
          <button
            onClick={() => setActiveTab('senders')}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'senders'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            👤 Identidades de Remetente
          </button>
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'domains' ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Domínios de Envio
                </h2>
                <p className="text-sm text-gray-600">
                  Configure domínios personalizados para envio de emails
                </p>
              </div>
            </div>

            {/* Add Domain Form */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-gray-800 mb-3">Adicionar Novo Domínio</h3>
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="ex: minhacompany.com"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addSendingDomain}
                  disabled={addingDomain || !newDomain.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {addingDomain ? 'Adicionando...' : 'Adicionar'}
                </button>
              </div>
            </div>

            {/* Domains List */}
            <div className="space-y-4">
              {sendingDomains.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Nenhum domínio configurado ainda.</p>
                  <p className="text-sm">Adicione seu primeiro domínio acima.</p>
                </div>
              ) : (
                sendingDomains.map((domain) => (
                  <div key={domain.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium text-gray-800">{domain.domain}</span>
                        <span className={`px-2 py-1 text-xs rounded ${
                          domain.status === 'verified'
                            ? 'bg-green-100 text-green-700'
                            : domain.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {domain.status === 'verified' ? '✅ Verificado' :
                           domain.status === 'failed' ? '❌ Falhou' : '⏳ Pendente'}
                        </span>
                      </div>
                      {domain.status !== 'verified' && (
                        <button
                          onClick={() => verifyDomain(domain.id)}
                          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Verificar
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">DKIM:</span>
                        <span className={`ml-2 ${
                          domain.dkimStatus === 'verified' ? 'text-green-600' :
                          domain.dkimStatus === 'failed' ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          {domain.dkimStatus === 'verified' ? '✅ Verificado' :
                           domain.dkimStatus === 'failed' ? '❌ Falhou' : '⏳ Pendente'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">SPF:</span>
                        <span className={`ml-2 ${
                          domain.spfStatus === 'verified' ? 'text-green-600' :
                          domain.spfStatus === 'failed' ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          {domain.spfStatus === 'verified' ? '✅ Verificado' :
                           domain.spfStatus === 'failed' ? '❌ Falhou' : '⏳ Pendente'}
                        </span>
                      </div>
                    </div>

                    {domain.status === 'pending' && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm text-yellow-800">
                          <strong>Configure estes registros DNS:</strong>
                        </p>
                        <div className="mt-2 space-y-1 text-xs font-mono">
                          <div>TXT: _brevo.{domain.domain} = "brevo-verification=abc123"</div>
                          <div>TXT: {domain.domain} = "v=spf1 include:spf.brevo.com ~all"</div>
                          <div>TXT: brevo._domainkey.{domain.domain} = "k=rsa; p=..."</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Identidades de Remetente
                </h2>
                <p className="text-sm text-gray-600">
                  Configure emails e nomes para envio de campanhas
                </p>
              </div>
            </div>

            {/* Add Sender Form */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-gray-800 mb-3">Adicionar Novo Remetente</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={newSenderName}
                  onChange={(e) => setNewSenderName(e.target.value)}
                  placeholder="Nome do remetente"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="email"
                  value={newSenderEmail}
                  onChange={(e) => setNewSenderEmail(e.target.value)}
                  placeholder="email@dominio.com"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addSenderIdentity}
                  disabled={addingSender || !newSenderEmail.trim() || !newSenderName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {addingSender ? 'Adicionando...' : 'Adicionar'}
                </button>
              </div>
            </div>

            {/* Senders List */}
            <div className="space-y-4">
              {senderIdentities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Nenhum remetente configurado ainda.</p>
                  <p className="text-sm">Adicione seu primeiro remetente acima.</p>
                </div>
              ) : (
                senderIdentities.map((sender) => (
                  <div key={sender.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-800">{sender.name}</div>
                        <div className="text-sm text-gray-600">{sender.email}</div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 text-xs rounded ${
                          sender.status === 'verified'
                            ? 'bg-green-100 text-green-700'
                            : sender.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {sender.status === 'verified' ? '✅ Verificado' :
                           sender.status === 'failed' ? '❌ Falhou' : '⏳ Pendente'}
                        </span>
                        {sender.status !== 'verified' && (
                          <button
                            onClick={() => verifySender(sender.id)}
                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Verificar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}