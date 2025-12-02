import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'
import { auth } from '../lib/firebase'
import { EMAIL_TEMPLATES, EmailTemplate } from '../lib/emailTemplates'
import './PagePlaceholder.css'

export default function Templates() {
  const [user, loading] = useAuthState(auth)
  const navigate = useNavigate()
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [previewData, setPreviewData] = useState({
    companyName: 'TurViagem',
    destination: 'Fernando de Noronha',
    mainTitle: 'Descubra o Paraíso',
    description: 'Uma experiência única em um dos destinos mais incríveis do Brasil',
    ctaLink: '#',
    ctaText: 'Ver Pacote Completo',
    keyBenefits: ['Guias locais especializados', 'Hospedagem premium à beira-mar', 'Translados e passeios inclusos'],
    priceInfo: 'A partir de R$ 3.999',
    dateRange: 'Saídas diárias',
    productName: 'Webinar Destinos 2025'
  })

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login')
    }
  }, [user, loading, navigate])

  const getCategoryName = (category: string) => {
    const names: Record<string, string> = {
      tourism: 'Turismo',
      promotional: 'Promocional',
      newsletter: 'Newsletter',
      event: 'Evento',
      retention: 'Fidelização'
    }
    return names[category] || category
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      tourism: 'bg-blue-100 text-blue-700',
      promotional: 'bg-red-100 text-red-700',
      newsletter: 'bg-purple-100 text-purple-700',
      event: 'bg-green-100 text-green-700',
      retention: 'bg-yellow-100 text-yellow-700'
    }
    return colors[category] || 'bg-gray-100 text-gray-700'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-blue-50/20 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              📧 Templates de Email
            </h1>
            <p className="text-slate-600 mt-1">Modelos profissionais prontos para usar</p>
          </div>
          <Link 
            to="/dashboard" 
            className="inline-flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Voltar ao Dashboard</span>
          </Link>
        </header>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {EMAIL_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer border border-slate-200 hover:border-indigo-300"
              onClick={() => setSelectedTemplate(template)}
            >
              {/* Thumbnail */}
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 h-40 flex items-center justify-center text-white group-hover:scale-105 transition-transform duration-300">
                <div className="text-7xl">{template.thumbnail}</div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold text-slate-900">{template.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getCategoryColor(template.category)}`}>
                    {getCategoryName(template.category)}
                  </span>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2 mb-4">{template.description}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedTemplate(template)
                  }}
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
                >
                  Visualizar Template
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Preview Modal */}
        {selectedTemplate && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedTemplate(null)}>
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-4xl">{selectedTemplate.thumbnail}</span>
                    <div>
                      <h2 className="text-2xl font-bold">{selectedTemplate.name}</h2>
                      <p className="text-indigo-100 text-sm">{selectedTemplate.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-slate-600 mb-2"><strong>Assunto:</strong> {selectedTemplate.generate(previewData).subject}</p>
                  <p className="text-sm text-slate-600"><strong>Pré-header:</strong> {selectedTemplate.generate(previewData).preheader}</p>
                </div>
                
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <iframe
                    srcDoc={selectedTemplate.generate(previewData).html}
                    className="w-full h-[500px]"
                    title="Email Preview"
                  />
                </div>

                <div className="mt-6 flex space-x-3">
                  <Link
                    to="/campaigns"
                    state={{ selectedTemplateId: selectedTemplate.id }}
                    className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors font-semibold text-center"
                  >
                    Usar Este Template
                  </Link>
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="px-6 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium text-slate-700"
                  >
                    Fechar
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="bg-white rounded-2xl shadow-sm p-8 border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">💡 Como usar os templates</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex flex-col items-start">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-2xl">1️⃣</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Escolha um template</h3>
              <p className="text-sm text-slate-600">Selecione o modelo que melhor se adequa à sua campanha</p>
            </div>
            <div className="flex flex-col items-start">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-2xl">2️⃣</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Personalize</h3>
              <p className="text-sm text-slate-600">Ajuste textos, imagens e cores conforme sua marca</p>
            </div>
            <div className="flex flex-col items-start">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-2xl">3️⃣</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Envie</h3>
              <p className="text-sm text-slate-600">Crie sua campanha e alcance seus clientes</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
