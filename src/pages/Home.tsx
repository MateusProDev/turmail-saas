import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import './Home.css'

export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-white text-gray-800 overflow-hidden">
      {/* Header Moderno */}
      <header className={`fixed w-full top-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">TM</span>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Turmail
                </span>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">Início</Link>
              <Link to="/features" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">Funcionalidades</Link>
              <Link to="/plans" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">Planos</Link>
              <Link to="/templates" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">Templates</Link>
              <Link to="/login" className="text-sm px-4 py-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:shadow-lg transition-all">
                Entrar
              </Link>
            </nav>

            <div className="md:hidden">
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Abrir menu"
                className="p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {mobileOpen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-md border-t">
            <div className="px-4 pt-4 pb-6 space-y-4">
              <Link to="/" className="block text-gray-700 font-medium py-2">Início</Link>
              <Link to="/features" className="block text-gray-700 font-medium py-2">Funcionalidades</Link>
              <Link to="/plans" className="block text-gray-700 font-medium py-2">Planos</Link>
              <Link to="/templates" className="block text-gray-700 font-medium py-2">Templates</Link>
              <Link to="/login" className="block bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center font-medium py-3 rounded-full mt-4">
                Entrar
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section Absurdamente Melhor */}
      <main className="pt-20">
        <section className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-hidden">
          <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                  🚀 Especializado para Agências de Turismo
                </div>
                
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">
                  Transforme 
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> passageiros </span>
                  em clientes fiéis
                </h1>
                
                <p className="mt-6 text-xl text-gray-600 max-w-2xl leading-relaxed">
                  Automatize sua comunicação e <strong>aumente em 3x as reservas recorrentes</strong> com emails personalizados para cada etapa da jornada do seu cliente.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Link 
                    to="/plans" 
                    className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  >
                    <span className="relative z-10">Começar Agora - 7 Dias Grátis</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </Link>
                  
                  <Link 
                    to="/demo" 
                    className="px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:border-blue-500 hover:text-blue-600 transition-all duration-300"
                  >
                    Ver Demonstração
                  </Link>
                </div>

                <div className="mt-8 flex items-center justify-center lg:justify-start gap-6 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Setup em 5 minutos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Sem cartão necessário</span>
                  </div>
                </div>
              </div>

              {/* Dashboard Preview */}
              <div className="relative">
                <div className="relative bg-white rounded-2xl shadow-2xl p-2 transform rotate-1 hover:rotate-0 transition-transform duration-500">
                  <div className="bg-gray-900 rounded-xl p-4">
                    <div className="flex gap-2 mb-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-6">
                      <div className="text-white font-mono text-sm">
                        <div className="text-green-400">// Dashboard Turmail</div>
                        <div className="mt-2 text-blue-400">clientesAtivos: <span className="text-white">1.247</span></div>
                        <div className="text-blue-400">taxaReversas: <span className="text-white">"68%"</span></div>
                        <div className="text-blue-400">receitaMensal: <span className="text-white">"R$ 45.230"</span></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Floating Elements */}
                <div className="absolute -top-4 -right-4 bg-white p-4 rounded-xl shadow-lg border">
                  <div className="text-sm font-semibold text-green-600">+42%</div>
                  <div className="text-xs text-gray-500">Reservas</div>
                </div>
                
                <div className="absolute -bottom-4 -left-4 bg-white p-4 rounded-xl shadow-lg border">
                  <div className="text-sm font-semibold text-blue-600">3.2x</div>
                  <div className="text-xs text-gray-500">Fidelização</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="bg-gray-50 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-gray-600 font-medium">Confiança de mais de 200 agências de turismo</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 opacity-60">
              {['ViagemTop', 'TourBrasil', 'EcoTravel', 'LuxoTur'].map((brand) => (
                <div key={brand} className="text-center text-gray-400 font-semibold text-lg">
                  {brand}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid Melhorado */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Tudo que você precisa para 
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> fidelizar clientes</span>
              </h2>
              <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
                Ferramentas especializadas para o mercado de turismo, desde a primeira reserva até a viagem dos sonhos recorrente.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: '✈️',
                  title: 'Templates para Viagens',
                  description: 'Modelos prontos para confirmações, lembretes e pós-viagem que convertem passageiros em fãs.',
                  features: ['Confirmação automática', 'Check-in digital', 'Pós-viagem']
                },
                {
                  icon: '📧',
                  title: 'Campanhas Inteligentes',
                  description: 'Automações que enviam a mensagem certa na hora certa, baseado no comportamento do cliente.',
                  features: ['Abandoned cart', 'Recomendações', 'Ofertas personalizadas']
                },
                {
                  icon: '📊',
                  title: 'Analytics do Turismo',
                  description: 'Métricas que importam: taxa de reversa, destino preferido, gasto médio por cliente.',
                  features: ['Dashboard especializado', 'Relatórios automáticos', 'KPIs do setor']
                },
                {
                  icon: '🔄',
                  title: 'Integração Brevo',
                  description: 'Use toda potência da Brevo com uma interface feita especialmente para agências de turismo.',
                  features: ['Setup em 5min', 'API Key segura', 'Sync em tempo real']
                },
                {
                  icon: '💸',
                  title: 'Monetização Fácil',
                  description: 'Planos com cobrança recorrente integrada ao Stripe. Comece a ganhar desde o primeiro dia.',
                  features: ['Checkout transparente', 'Multiplanos', 'Gestão de assinaturas']
                },
                {
                  icon: '🎯',
                  title: 'Segmentação Avançada',
                  description: 'Agrupe clientes por destino preferido, tipo de viagem, gasto médio e muito mais.',
                  features: ['Tags inteligentes', 'Comportamento', 'Histórico de viagens']
                }
              ].map((feature, index) => (
                <div 
                  key={index}
                  className="group bg-white p-8 rounded-2xl border border-gray-100 hover:border-blue-200 shadow-sm hover:shadow-xl transition-all duration-300 hover:transform hover:-translate-y-2"
                >
                  <div className="text-3xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 mb-4 leading-relaxed">{feature.description}</p>
                  <ul className="space-y-2">
                    {feature.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-700">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Pronto para transformar seu negócio?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Junte-se a mais de 200 agências que já aumentaram suas reservas recorrentes com o Turmail.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/plans" 
                className="px-8 py-4 bg-white text-blue-600 font-bold rounded-xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300"
              >
                Começar Agora - 7 Dias Grátis
              </Link>
              <Link 
                to="/demo" 
                className="px-8 py-4 border-2 border-white text-white font-semibold rounded-xl hover:bg-white hover:text-blue-600 transition-all duration-300"
              >
                Agendar Demonstração
              </Link>
            </div>
            <p className="mt-4 text-blue-200 text-sm">
              Não pedimos cartão de crédito. Cancele quando quiser.
            </p>
          </div>
        </section>
      </main>

      {/* Footer Melhorado */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-gray-900 font-bold text-sm">TM</span>
                </div>
                <span className="text-xl font-bold text-white">Turmail</span>
              </div>
              <p className="text-gray-400 text-sm">
                Soluções de email marketing especializadas para o mercado de turismo.
              </p>
            </div>
            
            {[
              {
                title: 'Produto',
                links: ['Funcionalidades', 'Planos', 'Templates', 'API']
              },
              {
                title: 'Recursos',
                links: ['Documentação', 'Tutoriais', 'Blog', 'Suporte']
              },
              {
                title: 'Empresa',
                links: ['Sobre', 'Contato', 'Termos', 'Privacidade']
              }
            ].map((column, index) => (
              <div key={index}>
                <h4 className="font-semibold text-white mb-4">{column.title}</h4>
                <ul className="space-y-2">
                  {column.links.map((link, idx) => (
                    <li key={idx}>
                      <Link to={`/${link.toLowerCase()}`} className="text-gray-400 hover:text-white text-sm transition-colors">
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
            <p>© 2024 Turmail. Feito com ❤️ para agências de turismo brasileiras.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}