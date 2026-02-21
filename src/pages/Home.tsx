import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { FaShoppingCart, FaDumbbell, FaLeaf, FaCheck, FaInstagram, FaWhatsapp, FaFacebook, FaTruck, FaShieldAlt, FaStar, FaBolt, FaHeart, FaFire, FaCertificate } from 'react-icons/fa'
import './Home.css'

const products = [
  {
    id: 1,
    name: 'Whey Protein Isolado',
    brand: 'BenSupplementos',
    price: 'R$ 189,90',
    originalPrice: 'R$ 249,90',
    image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2c843?w=400&h=400&fit=crop',
    tag: 'Mais Vendido',
    rating: 4.9,
    reviews: 342
  },
  {
    id: 2,
    name: 'Creatina Monohidratada 300g',
    brand: 'BenSupplementos',
    price: 'R$ 89,90',
    originalPrice: 'R$ 119,90',
    image: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=400&h=400&fit=crop',
    tag: 'Oferta',
    rating: 4.8,
    reviews: 218
  },
  {
    id: 3,
    name: 'BCAA 2:1:1 - 120 Cáps',
    brand: 'BenSupplementos',
    price: 'R$ 59,90',
    originalPrice: 'R$ 79,90',
    image: 'https://images.unsplash.com/photo-1614859324967-bdf413c78a1f?w=400&h=400&fit=crop',
    tag: 'Novo',
    rating: 4.7,
    reviews: 156
  },
  {
    id: 4,
    name: 'Pré-Treino Extreme 300g',
    brand: 'BenSupplementos',
    price: 'R$ 129,90',
    originalPrice: 'R$ 169,90',
    image: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400&h=400&fit=crop',
    tag: 'Lançamento',
    rating: 4.9,
    reviews: 89
  },
  {
    id: 5,
    name: 'Glutamina Pura 300g',
    brand: 'BenSupplementos',
    price: 'R$ 69,90',
    originalPrice: 'R$ 99,90',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop',
    tag: 'Promoção',
    rating: 4.6,
    reviews: 127
  },
  {
    id: 6,
    name: 'Multivitamínico Daily 60 Cáps',
    brand: 'BenSupplementos',
    price: 'R$ 49,90',
    originalPrice: 'R$ 69,90',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop',
    tag: 'Essencial',
    rating: 4.8,
    reviews: 203
  }
]

const categories = [
  { name: 'Whey Protein', icon: <FaDumbbell className="w-6 h-6" />, count: 24 },
  { name: 'Creatina', icon: <FaBolt className="w-6 h-6" />, count: 12 },
  { name: 'Pré-Treino', icon: <FaFire className="w-6 h-6" />, count: 18 },
  { name: 'Vitaminas', icon: <FaLeaf className="w-6 h-6" />, count: 30 },
  { name: 'Aminoácidos', icon: <FaHeart className="w-6 h-6" />, count: 15 },
  { name: 'Naturais', icon: <FaCertificate className="w-6 h-6" />, count: 20 },
]

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
      {/* Top Bar */}
      <div className="bg-black text-white text-center text-xs sm:text-sm py-2 font-medium tracking-wide">
        <span className="text-green-400">FRETE GRÁTIS</span> em compras acima de R$ 199 | Use o cupom <span className="text-green-400 font-bold">BEN10</span> e ganhe 10% OFF
      </div>

      {/* Header */}
      <header className={`fixed w-full top-8 z-50 transition-all duration-300 ${
        scrolled ? 'bg-black/95 backdrop-blur-md shadow-lg shadow-green-900/10' : 'bg-black'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
                <FaLeaf className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-extrabold text-white tracking-tight">Ben</span>
                <span className="text-xl font-extrabold text-green-400 tracking-tight">Suplementos</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-sm font-medium text-gray-300 hover:text-green-400 transition-colors">Início</Link>
              <Link to="/features" className="text-sm font-medium text-gray-300 hover:text-green-400 transition-colors">Produtos</Link>
              <Link to="/plans" className="text-sm font-medium text-gray-300 hover:text-green-400 transition-colors">Ofertas</Link>
              <Link to="/about" className="text-sm font-medium text-gray-300 hover:text-green-400 transition-colors">Sobre Nós</Link>
              <Link to="/templates" className="text-sm font-medium text-gray-300 hover:text-green-400 transition-colors">Blog</Link>
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <Link to="/login" className="text-sm font-medium text-gray-300 hover:text-green-400 transition-colors">
                Entrar
              </Link>
              <Link to="/plans" className="flex items-center gap-2 text-sm px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold hover:shadow-lg hover:shadow-green-500/30 transition-all transform hover:scale-105">
                <FaShoppingCart className="w-4 h-4" />
                Comprar
              </Link>
            </div>

            <div className="md:hidden flex items-center gap-2">
              <Link to="/plans" className="text-sm px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold hover:shadow-lg transition-all">
                <FaShoppingCart className="w-4 h-4" />
              </Link>
              <button
                aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
                className="ml-1 p-2 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                onClick={() => setMobileOpen((v) => !v)}
              >
                {mobileOpen ? (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden bg-black/95 backdrop-blur-md border-t border-gray-800">
            <div className="px-4 pt-4 pb-6 space-y-3">
              <Link to="/" className="block text-gray-300 font-medium py-2 hover:text-green-400">Início</Link>
              <Link to="/features" className="block text-gray-300 font-medium py-2 hover:text-green-400">Produtos</Link>
              <Link to="/plans" className="block text-gray-300 font-medium py-2 hover:text-green-400">Ofertas</Link>
              <Link to="/about" className="block text-gray-300 font-medium py-2 hover:text-green-400">Sobre Nós</Link>
              <Link to="/templates" className="block text-gray-300 font-medium py-2 hover:text-green-400">Blog</Link>
              <Link to="/login" className="block bg-gradient-to-r from-green-500 to-green-600 text-white text-center font-semibold py-3 rounded-xl mt-4">
                Entrar na Conta
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <main className="pt-24">
        <section className="relative bg-black overflow-hidden min-h-[600px] flex items-center">
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-green-950" />
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-20 right-20 w-96 h-96 bg-green-500 rounded-full blur-[120px]" />
            <div className="absolute bottom-10 left-10 w-72 h-72 bg-green-600 rounded-full blur-[100px]" />
          </div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <FaFire className="w-4 h-4" />
                  Super Ofertas de Fevereiro - Até 40% OFF
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight">
                  Seu treino merece os
                  <span className="bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent"> melhores suplementos</span>
                </h1>

                <p className="mt-6 text-lg text-gray-400 max-w-xl leading-relaxed">
                  Whey Protein, Creatina, Pré-treino e muito mais. Produtos de alta qualidade com os melhores preços do mercado. Entrega rápida para todo o Brasil.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Link 
                    to="/plans" 
                    className="group relative px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/40 transform hover:scale-105 transition-all duration-300 text-lg"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <FaShoppingCart className="w-5 h-5" />
                      Comprar Agora
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-green-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </Link>
                  <Link 
                    to="/features" 
                    className="px-8 py-4 border-2 border-green-500/50 text-green-400 font-semibold rounded-xl hover:border-green-400 hover:bg-green-500/10 transition-all duration-300 text-lg"
                  >
                    Ver Catálogo
                  </Link>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row gap-6 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <FaTruck className="w-4 h-4 text-green-500" />
                    <span>Frete Grátis +R$199</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaShieldAlt className="w-4 h-4 text-green-500" />
                    <span>Compra 100% Segura</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaStar className="w-4 h-4 text-green-500" />
                    <span>+10.000 Clientes</span>
                  </div>
                </div>
              </div>

              {/* Hero Visual */}
              <div className="relative flex justify-center">
                <div className="relative">
                  <div className="w-80 h-80 lg:w-96 lg:h-96 bg-gradient-to-br from-green-500/20 to-green-700/20 rounded-full flex items-center justify-center border border-green-500/20">
                    <div className="w-64 h-64 lg:w-80 lg:h-80 bg-gradient-to-br from-green-500/30 to-green-700/30 rounded-full flex items-center justify-center border border-green-500/30">
                      <FaDumbbell className="w-24 h-24 lg:w-32 lg:h-32 text-green-400 drop-shadow-2xl" />
                    </div>
                  </div>
                  
                  {/* Floating Cards */}
                  <div className="absolute -top-4 -right-4 bg-white p-3 rounded-xl shadow-2xl animate-bounce-slow">
                    <div className="text-sm font-bold text-gray-900">Whey Isolado</div>
                    <div className="text-green-600 font-extrabold">R$ 189,90</div>
                    <div className="flex text-yellow-400 text-xs mt-1">
                      <FaStar /><FaStar /><FaStar /><FaStar /><FaStar />
                    </div>
                  </div>

                  <div className="absolute -bottom-4 -left-4 bg-white p-3 rounded-xl shadow-2xl animate-bounce-slow-delay">
                    <div className="text-sm font-bold text-gray-900">Creatina 300g</div>
                    <div className="text-green-600 font-extrabold">R$ 89,90</div>
                    <div className="text-xs text-gray-500 line-through">R$ 119,90</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Bar */}
        <section className="bg-gradient-to-r from-green-600 to-green-700 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-white text-center">
              <div className="flex items-center justify-center gap-2">
                <FaTruck className="w-5 h-5" />
                <span className="text-sm font-medium">Entrega Rápida</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <FaShieldAlt className="w-5 h-5" />
                <span className="text-sm font-medium">Pagamento Seguro</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <FaCertificate className="w-5 h-5" />
                <span className="text-sm font-medium">Produtos Originais</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <FaStar className="w-5 h-5" />
                <span className="text-sm font-medium">4.9/5 Avaliações</span>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900">
                Navegue por
                <span className="bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent"> Categorias</span>
              </h2>
              <p className="mt-3 text-lg text-gray-500">Encontre o suplemento ideal para o seu objetivo</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.map((cat, index) => (
                <Link
                  key={index}
                  to="/features"
                  className="group flex flex-col items-center p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:border-green-300 hover:bg-green-50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                >
                  <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-all duration-300 shadow-sm">
                    {cat.icon}
                  </div>
                  <span className="mt-3 text-sm font-bold text-gray-800">{cat.name}</span>
                  <span className="text-xs text-gray-400">{cat.count} produtos</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Products Grid */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h2 className="text-3xl sm:text-4xl font-black text-gray-900">
                  Produtos em
                  <span className="bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent"> Destaque</span>
                </h2>
                <p className="mt-2 text-gray-500">Os mais vendidos da semana</p>
              </div>
              <Link to="/features" className="hidden sm:flex items-center gap-2 text-green-600 font-semibold hover:text-green-700 transition-colors">
                Ver todos
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div 
                  key={product.id}
                  className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="relative overflow-hidden bg-gray-100 aspect-square">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full">
                        {product.tag}
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                    <button className="absolute bottom-3 right-3 w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 hover:bg-green-700 shadow-lg">
                      <FaShoppingCart className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-5">
                    <div className="text-xs text-green-600 font-semibold uppercase tracking-wider mb-1">{product.brand}</div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{product.name}</h3>
                    <div className="flex items-center gap-1 mb-3">
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <FaStar key={i} className="w-3 h-3" />
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">({product.reviews})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-black text-gray-900">{product.price}</span>
                      <span className="text-sm text-gray-400 line-through">{product.originalPrice}</span>
                    </div>
                    <button className="mt-4 w-full py-3 bg-black text-white font-bold rounded-xl hover:bg-green-600 transition-colors duration-300 flex items-center justify-center gap-2">
                      <FaShoppingCart className="w-4 h-4" />
                      Adicionar ao Carrinho
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-10 sm:hidden">
              <Link to="/features" className="inline-flex items-center gap-2 text-green-600 font-semibold hover:text-green-700 transition-colors">
                Ver todos os produtos
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900">
                Por que escolher a
                <span className="bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent"> BenSuplementos?</span>
              </h2>
              <p className="mt-4 text-xl text-gray-500 max-w-2xl mx-auto">
                Qualidade, preço justo e compromisso com sua saúde e performance
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: <FaCertificate className="w-8 h-8 text-green-600" />,
                  title: 'Produtos Certificados',
                  description: 'Todos os nossos suplementos passam por rigoroso controle de qualidade e possuem registro na ANVISA.',
                  features: ['Registro ANVISA', 'Laudos laboratoriais', 'Selo de qualidade'],
                },
                {
                  icon: <FaTruck className="w-8 h-8 text-green-600" />,
                  title: 'Entrega Super Rápida',
                  description: 'Enviamos para todo o Brasil com rastreamento em tempo real. Frete grátis acima de R$ 199.',
                  features: ['Entrega em 24-48h*', 'Frete grátis +R$199', 'Rastreamento em tempo real'],
                },
                {
                  icon: <FaShieldAlt className="w-8 h-8 text-green-600" />,
                  title: 'Compra 100% Segura',
                  description: 'Pagamento seguro com as principais bandeiras e PIX com desconto adicional de 5%.',
                  features: ['PIX com 5% OFF', 'Parcelamento em até 12x', 'Garantia de satisfação'],
                }
              ].map((feature, index) => (
                <div 
                  key={index}
                  className="group bg-white p-8 rounded-2xl border-2 border-gray-100 hover:border-green-300 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
                >
                  <div className="mb-6 w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition-all duration-300">
                    <div className="group-hover:text-white transition-colors duration-300">
                      {feature.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-500 mb-4 leading-relaxed">{feature.description}</p>
                  <ul className="space-y-2">
                    {feature.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-sm text-gray-500">
                        <FaCheck className="text-green-500 w-4 h-4 flex-shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900">
                O que nossos
                <span className="bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent"> clientes dizem</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { name: 'Lucas M.', text: 'Melhor custo-benefício que já encontrei! O Whey Isolado é top e a entrega chegou antes do prazo.', stars: 5 },
                { name: 'Ana Paula S.', text: 'A creatina é pura mesmo, deu uma diferença absurda nos treinos. Já virei cliente fiel!', stars: 5 },
                { name: 'Carlos R.', text: 'Atendimento excelente e produtos de qualidade. O pré-treino Extreme é insano, recomendo muito.', stars: 5 },
              ].map((review, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex text-yellow-400 mb-3">
                    {[...Array(review.stars)].map((_, j) => <FaStar key={j} className="w-4 h-4" />)}
                  </div>
                  <p className="text-gray-600 mb-4 italic">"{review.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-sm">
                      {review.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{review.name}</div>
                      <div className="text-xs text-green-600">Cliente verificado</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-black relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-10 right-20 w-96 h-96 bg-green-500 rounded-full blur-[120px]" />
            <div className="absolute bottom-10 left-20 w-72 h-72 bg-green-600 rounded-full blur-[100px]" />
          </div>
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
              Pronto para transformar seus
              <span className="bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent"> resultados?</span>
            </h2>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Cadastre-se agora e ganhe 15% de desconto na primeira compra. Não perca tempo, sua evolução começa aqui!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/plans" 
                className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-xl shadow-2xl shadow-green-500/25 hover:shadow-green-500/40 transform hover:scale-105 transition-all duration-300 text-lg"
              >
                Criar Minha Conta - 15% OFF
              </Link>
              <Link 
                to="/features" 
                className="px-8 py-4 border-2 border-white/30 text-white font-semibold rounded-xl hover:bg-white hover:text-black transition-all duration-300 text-lg"
              >
                Explorar Produtos
              </Link>
            </div>
            <p className="mt-6 text-gray-500 text-sm">
              Mais de 10.000 clientes satisfeitos em todo o Brasil
            </p>
          </div>
        </section>
      </main>

      {/* Newsletter */}
      <section className="bg-green-600 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-2">Receba ofertas exclusivas!</h3>
          <p className="text-green-100 mb-6">Cadastre-se e fique por dentro das melhores promoções e lançamentos</p>
          <form onSubmit={(e) => { e.preventDefault(); alert('Cadastrado com sucesso! Você receberá nossas ofertas.'); }} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
            <input 
              type="email" 
              placeholder="Seu melhor e-mail" 
              className="flex-1 px-4 py-3 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-300" 
            />
            <button 
              type="submit" 
              className="px-6 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-all"
            >
              Quero Ofertas!
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-left">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center">
                    <FaLeaf className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-xl font-extrabold text-white">Ben</span>
                    <span className="text-xl font-extrabold text-green-400">Suplementos</span>
                  </div>
                </div>
                <div className="text-gray-400 text-sm">Sua loja de suplementos de confiança. Qualidade, preço justo e entrega rápida.</div>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <a href="#" aria-label="Instagram" className="text-gray-400 hover:text-green-400 transition-colors"><FaInstagram className="w-5 h-5" /></a>
                <a href="#" aria-label="Facebook" className="text-gray-400 hover:text-green-400 transition-colors"><FaFacebook className="w-5 h-5" /></a>
                <a href="#" aria-label="WhatsApp" className="text-gray-400 hover:text-green-400 transition-colors"><FaWhatsapp className="w-5 h-5" /></a>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-3">Loja</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link to="/features" className="hover:text-green-400 transition-colors">Whey Protein</Link></li>
                <li><Link to="/features" className="hover:text-green-400 transition-colors">Creatina</Link></li>
                <li><Link to="/features" className="hover:text-green-400 transition-colors">Pré-Treino</Link></li>
                <li><Link to="/features" className="hover:text-green-400 transition-colors">Vitaminas</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-3">Institucional</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link to="/about" className="hover:text-green-400 transition-colors">Sobre Nós</Link></li>
                <li><Link to="/privacy" className="hover:text-green-400 transition-colors">Política de Privacidade</Link></li>
                <li><Link to="/terms" className="hover:text-green-400 transition-colors">Termos de Uso</Link></li>
                <li><a href="#" className="hover:text-green-400 transition-colors">Trocas e Devoluções</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-3">Atendimento</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li className="flex items-center gap-2"><FaWhatsapp className="w-4 h-4 text-green-500" /> (11) 99999-9999</li>
                <li>contato@bensuplementos.com.br</li>
                <li>Seg-Sex: 9h às 18h</li>
              </ul>
              <div className="mt-4">
                <h5 className="text-xs text-gray-500 mb-2">Formas de Pagamento</h5>
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-1 bg-gray-800 rounded text-gray-400">PIX</span>
                  <span className="px-2 py-1 bg-gray-800 rounded text-gray-400">Cartão</span>
                  <span className="px-2 py-1 bg-gray-800 rounded text-gray-400">Boleto</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col md:flex-row items-center justify-between text-sm text-gray-500">
            <p>© 2026 BenSuplementos. Todos os direitos reservados. CNPJ: XX.XXX.XXX/0001-XX</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <Link to="/terms" className="hover:text-green-400 transition-colors">Termos</Link>
              <Link to="/privacy" className="hover:text-green-400 transition-colors">Privacidade</Link>
              <a href="#" className="hover:text-green-400 transition-colors">Suporte</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}