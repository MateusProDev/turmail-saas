import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { FaEnvelope, FaChartBar, FaBullseye, FaCheck, FaTwitter, FaInstagram, FaLinkedin, FaGithub, FaPlane, FaMapMarkerAlt, FaShip, FaUmbrellaBeach } from 'react-icons/fa'
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
      {/* Header Moderno com Paleta Azul Turística */}
      <header className={`fixed w-full top-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <img
                src="/logoturmailsemfundo.png"
                alt="Turmail Logo"
                className="w-30 h-12 object-contain"
                style={{ borderRadius: '0.5rem' }}
              />
            </div>

            <nav className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-sm font-medium text-gray-700 hover:text-cyan-600 transition-colors">Início</Link>
              <Link to="/features" className="text-sm font-medium text-gray-700 hover:text-cyan-600 transition-colors">Funcionalidades</Link>
              <Link to="/plans" className="text-sm font-medium text-gray-700 hover:text-cyan-600 transition-colors">Planos</Link>
              <Link to="/templates" className="text-sm font-medium text-gray-700 hover:text-cyan-600 transition-colors">Templates</Link>
              <Link to="/plans" className="text-sm px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all">
                Começar
              </Link>
            </nav>

            <div className="md:hidden flex items-center gap-2">
              <Link to="/plans" className="text-sm px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:shadow-lg transition-all">
                Começar
              </Link>
              <button
                aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
                className="ml-2 p-2 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
                onClick={() => setMobileOpen((v) => !v)}
              >
                {mobileOpen ? (
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
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
              <Link to="/login" className="block bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-center font-medium py-3 rounded-full mt-4">
                Entrar
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section com Tema Azul Turístico */}
      <main className="pt-20">
        <section className="relative bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-50 overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1488646953014-85cb44e25828?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] opacity-5 bg-cover bg-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/90" />
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-2 bg-cyan-100 text-cyan-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <FaShip className="w-4 h-4" />
                  Email marketing que aumenta reservas para agências de turismo
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">
                  Triplique suas reservas com automação de e-mails para turismo
                  <span className="bg-gradient-to-r from-cyan-600 to-blue-800 bg-clip-text text-transparent"> comprovada</span>
                </h1>

                <p className="mt-6 text-xl text-gray-600 max-w-2xl leading-relaxed">
                  Envie campanhas automáticas para captar, reter e vender mais viagens. Teste grátis por 14 dias — sem cartão de crédito. Resultados já no primeiro mês.
                </p>

                <div className="mt-8 flex flex-row gap-4 justify-center lg:justify-start">
                  <Link 
                    to="/plans" 
                    className="group relative px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:shadow-cyan-500/25 transform hover:scale-105 transition-all duration-300"
                  >
                    <span className="relative z-10">Começar Agora - 14 Dias Grátis</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </Link>
                  <Link 
                    to="/demo" 
                    className="px-6 py-3 border-2 border-cyan-200 text-cyan-700 font-semibold rounded-xl hover:border-cyan-500 hover:bg-cyan-50 transition-all duration-300"
                  >
                    Agendar Demonstração
                  </Link>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Setup em 5 minutos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Sem cartão necessário</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Foco em turismo</span>
                  </div>
                </div>
              </div>

              {/* Dashboard Preview com Tema Turístico */}
              <div className="relative">
                <div className="relative bg-white rounded-2xl shadow-2xl p-2 transform rotate-1 hover:rotate-0 transition-transform duration-500">
                  <div className="bg-gradient-to-br from-cyan-900 to-blue-900 rounded-xl p-4">
                    <div className="flex gap-2 mb-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="bg-blue-800/50 rounded-lg p-6 backdrop-blur-sm">
                      <div className="text-white font-mono text-sm">
                        <div className="text-cyan-300 flex items-center gap-2">
                          <FaMapMarkerAlt className="w-3 h-3" />
                          Dashboard Turmail - Resultados Reais
                        </div>
                        <div className="mt-3 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-blue-200">Aumento de reservas:</span>
                            <span className="text-white font-bold">3x</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-200">Taxa de abertura:</span>
                            <span className="text-white font-bold">45%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-200">Receita estimada:</span>
                            <span className="text-white font-bold">+120%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Floating Elements Turísticos */}
                <div className="absolute -top-4 -right-4 bg-white p-4 rounded-xl shadow-lg border border-cyan-100">
                  <div className="text-sm font-semibold text-cyan-600 flex items-center gap-1">
                    <FaUmbrellaBeach className="w-3 h-3" />
                    Reservas: <span className="text-gray-700">+3x</span>
                  </div>
                  <div className="text-xs text-gray-500">(após automações)</div>
                </div>

                <div className="absolute -bottom-4 -left-4 bg-white p-4 rounded-xl shadow-lg border border-blue-100">
                  <div className="text-sm font-semibold text-blue-600 flex items-center gap-1">
                    <FaShip className="w-3 h-3" />
                    Retenção: <span className="text-gray-700">+25%</span>
                  </div>
                  <div className="text-xs text-gray-500">(exemplo de resultado)</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="bg-gradient-to-r from-cyan-50 to-blue-50 py-12 border-y border-cyan-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-gray-600 font-medium mb-6">Estamos em piloto com agências selecionadas. Inscreva-se para testar o piloto.</p>
            <div className="flex justify-center">
              <Link to="/demo" className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-md font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all">
                Solicitar acesso ao piloto
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid com Tema Turístico */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Tudo que você precisa para 
                <span className="bg-gradient-to-r from-cyan-600 to-blue-800 bg-clip-text text-transparent"> fidelizar viajantes</span>
              </h2>
              <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
                Ferramentas especializadas para o mercado de turismo, desde a primeira reserva até a viagem dos sonhos recorrente.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: <FaEnvelope className="w-8 h-8 text-cyan-600" />,
                  title: 'Campanhas Inteligentes',
                  description: 'Automações que enviam a mensagem certa na hora certa, baseado no comportamento do cliente.',
                  features: ['Abandoned cart', 'Recomendações', 'Ofertas personalizadas'],
                  color: 'from-cyan-50 to-blue-50'
                },
                {
                  icon: <FaChartBar className="w-8 h-8 text-blue-600" />,
                  title: 'Analytics do Turismo',
                  description: 'Métricas que importam: taxa de reserva, destino preferido, gasto médio por cliente.',
                  features: ['Dashboard especializado', 'Relatórios automáticos', 'KPIs do setor'],
                  color: 'from-blue-50 to-cyan-50'
                },
                {
                  icon: <FaBullseye className="w-8 h-8 text-sky-600" />,
                  title: 'Segmentação Avançada',
                  description: 'Agrupe clientes por destino preferido, tipo de viagem, gasto médio e muito mais.',
                  features: ['Tags inteligentes', 'Comportamento', 'Histórico de viagens'],
                  color: 'from-sky-50 to-blue-50'
                }
              ].map((feature, index) => (
                <div 
                  key={index}
                  className="group bg-gradient-to-br from-white to-gray-50 p-8 rounded-2xl border border-gray-100 hover:border-cyan-200 shadow-sm hover:shadow-xl transition-all duration-300 hover:transform hover:-translate-y-2"
                >
                  <div className={`mb-4 flex items-center justify-center p-4 rounded-xl bg-gradient-to-br ${feature.color}`}>
                    <div className="p-3 bg-white rounded-lg shadow-sm">
                      {feature.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 mb-4 leading-relaxed">{feature.description}</p>
                  <ul className="space-y-2">
                    {feature.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-sm text-gray-500">
                        <FaCheck className="text-cyan-500 w-4 h-4 flex-shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section com Gradiente Azul Turístico */}
        <section className="py-20 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519681393784-d120267933ba?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] opacity-10 bg-cover bg-center" />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Pronto para navegar em águas mais calmas?
            </h2>
            <p className="text-xl text-cyan-100 mb-8 max-w-2xl mx-auto">
              Teste grátis por 14 dias e veja como a automação pode aumentar suas reservas recorrentes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/plans" 
                className="px-8 py-4 bg-white text-cyan-700 font-bold rounded-xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 hover:bg-cyan-50"
              >
                Começar Agora - 14 Dias Grátis
              </Link>
              <Link 
                to="/demo" 
                className="px-8 py-4 border-2 border-white text-white font-semibold rounded-xl hover:bg-white hover:text-cyan-700 transition-all duration-300"
              >
                Agendar Demonstração
              </Link>
            </div>
            <p className="mt-4 text-cyan-200 text-sm">
              Não pedimos cartão de crédito. Cancele quando quiser.
            </p>
          </div>
        </section>
      </main>

      {/* Footer com Tema Azul Marinho */}
      <footer className="bg-gradient-to-b from-blue-900 to-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-left">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <FaPlane className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-xl font-bold">Turmail</div>
                </div>
                <div className="text-gray-400 text-sm">Email marketing especializado para agências de turismo.</div>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <a href="#" aria-label="Twitter" className="text-gray-400 hover:text-cyan-300 transition-colors"><FaTwitter className="w-5 h-5" /></a>
                <a href="#" aria-label="Instagram" className="text-gray-400 hover:text-cyan-300 transition-colors"><FaInstagram className="w-5 h-5" /></a>
                <a href="#" aria-label="LinkedIn" className="text-gray-400 hover:text-cyan-300 transition-colors"><FaLinkedin className="w-5 h-5" /></a>
                <a href="#" aria-label="GitHub" className="text-gray-400 hover:text-cyan-300 transition-colors"><FaGithub className="w-5 h-5" /></a>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-3">Produto</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link to="/features" className="hover:text-cyan-300 transition-colors">Funcionalidades</Link></li>
                <li><Link to="/plans" className="hover:text-cyan-300 transition-colors">Planos</Link></li>
                <li><Link to="/templates" className="hover:text-cyan-300 transition-colors">Templates</Link></li>
                <li><Link to="/integrations" className="hover:text-cyan-300 transition-colors">Integrações</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-3">Empresa</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link to="/about" className="hover:text-cyan-300 transition-colors">Sobre</Link></li>
                <li><Link to="/contact" className="hover:text-cyan-300 transition-colors">Contato</Link></li>
                <li><Link to="/blog" className="hover:text-cyan-300 transition-colors">Blog</Link></li>
                <li><Link to="/careers" className="hover:text-cyan-300 transition-colors">Carreiras</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-3">Receba novidades</h4>
              <p className="text-gray-400 text-sm mb-4">Inscreva-se para receber atualizações do piloto e dicas para aumentar reservas.</p>
              <form onSubmit={(e) => { e.preventDefault(); alert('Obrigado! Entraremos em contato.'); }} className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="Seu melhor email" 
                  className="w-full px-3 py-2 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500" 
                />
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-md hover:shadow-lg transition-all"
                >
                  Inscrever
                </button>
              </form>
              <p className="text-gray-500 text-xs mt-3">Respeitamos sua privacidade. Sem spam.</p>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col md:flex-row items-center justify-between text-sm text-gray-400">
            <p>© 2025 Turmail. Feito com ❤️ para agências de turismo brasileiras.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <Link to="/terms" className="hover:text-cyan-300 transition-colors">Termos</Link>
              <Link to="/privacy" className="hover:text-cyan-300 transition-colors">Privacidade</Link>
              <Link to="/contact" className="hover:text-cyan-300 transition-colors">Suporte</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}