import { Link } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { FaShoppingCart, FaInstagram, FaWhatsapp, FaTruck, FaShieldAlt, FaStar, FaChevronLeft, FaChevronRight, FaSpinner, FaSearch } from 'react-icons/fa'
import { useCart } from '../contexts/CartContext'
import { listFeaturedProducts, formatBRL, type Product, optimizedImage } from '../lib/productService'
import './Home.css'

/* ── Banners do Carrossel (troque imagens/textos aqui) ── */
const banners = [
  {
    id: 1,
    title: 'Combo Creatina + Whey Black Skull',
    subtitle: 'A partir de',
    price: 'R$ 169,90',
    cta: 'Comprar Agora',
    bg: 'from-green-700 via-green-900 to-black',
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 2,
    title: 'Creatinas com até 14% OFF',
    subtitle: 'Promoção por tempo limitado',
    price: 'R$ 64,90',
    cta: 'Aproveitar',
    bg: 'from-black via-gray-900 to-green-900',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 3,
    title: 'Frete Grátis acima de R$149,90',
    subtitle: 'Para toda Fortaleza',
    price: '',
    cta: 'Ver Ofertas',
    bg: 'from-green-800 via-green-950 to-black',
    image: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=1200&q=80',
  },
]

/* ── Fallback para imagens que não carregam ── */
const IMG_FALLBACK = 'https://placehold.co/400x400/1a1a1a/22c55e?text=BenSuplementos'
const BANNER_FALLBACK = 'https://placehold.co/1200x500/1a1a1a/22c55e?text=BenSuplementos'
const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  const el = e.currentTarget
  if (!el.dataset.fallback) {
    el.dataset.fallback = '1'
    el.src = el.closest('[data-banner]') ? BANNER_FALLBACK : IMG_FALLBACK
  }
}

/* ── Produtos fallback (quando Firestore vazio/offline) ── */
const fallbackProducts = [
  {
    id: 'fb-1' as string | number,
    name: 'Whey Isolado 900g',
    price: 'R$ 189,90',
    priceNum: 189.90,
    oldPrice: 'R$ 249,90',
    image: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=400&h=400&q=80',
    tag: 'Mais Vendido',
  },
  {
    id: 'fb-2' as string | number,
    name: 'Creatina 300g',
    price: 'R$ 89,90',
    priceNum: 89.90,
    oldPrice: 'R$ 119,90',
    image: 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&w=400&h=400&q=80',
    tag: '-25%',
  },
  {
    id: 'fb-3' as string | number,
    name: 'Pré-Treino 300g',
    price: 'R$ 129,90',
    priceNum: 129.90,
    oldPrice: 'R$ 169,90',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=400&h=400&q=80',
    tag: 'Novo',
  },
  {
    id: 'fb-4' as string | number,
    name: 'BCAA 120 Cáps',
    price: 'R$ 59,90',
    priceNum: 59.90,
    oldPrice: 'R$ 79,90',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=400&h=400&q=80',
    tag: '-25%',
  },
]

/* Converte Firestore Product → formato da Home */
function toHomeProduct(p: Product) {
  return {
    id: p.id,
    name: p.name,
    price: formatBRL(p.price),
    priceNum: p.price,
    oldPrice: p.oldPrice ? formatBRL(p.oldPrice) : '',
    image: p.image,
    tag: p.tag || '',
  }
}

export default function Home() {
  const { addItem, toggle, totalItems } = useCart()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [current, setCurrent] = useState(0)
  const [products, setProducts] = useState(fallbackProducts)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  /* Buscar produtos destaque do Firestore */
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await listFeaturedProducts()
        if (!cancelled && data.length > 0) {
          setProducts(data.map(toHomeProduct))
        }
      } catch { /* usa fallback */ }
      finally { if (!cancelled) setLoadingProducts(false) }
    })()
    return () => { cancelled = true }
  }, [])

  /* scroll listener */
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  /* auto-play carrossel */
  const next = useCallback(() => setCurrent(c => (c + 1) % banners.length), [])
  const prev = useCallback(() => setCurrent(c => (c - 1 + banners.length) % banners.length), [])

  useEffect(() => {
    const id = setInterval(next, 4500)
    return () => clearInterval(id)
  }, [next])

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* ─── Top strip ─── */}
      <div className="bg-black text-center py-1.5 px-2 text-[11px] sm:text-xs font-medium text-gray-300 tracking-wide">
        <span className="text-green-400 font-bold">FRETE GRÁTIS</span> a partir de R$149,90 &nbsp;|&nbsp; Cupom <span className="text-green-400 font-bold">BEN5</span> = 5% OFF
      </div>

      {/* ─── Header ─── */}
      <header className={`sticky top-0 z-50 transition-all duration-200 ${
        scrolled ? 'bg-black/95 backdrop-blur-md shadow-md' : 'bg-black'
      }`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-1.5">
              <img src="/android-icon-48x48.png" alt="BenSuplementos" className="w-12 h-12 rounded-lg object-contain" />
              <span className="text-lg sm:text-xl font-extrabold text-white leading-none">Ben<span className="text-green-400">Suplementos</span></span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-gray-300">
              <Link to="/" className="hover:text-green-400 transition-colors">Início</Link>
              <Link to="/produtos" className="hover:text-green-400 transition-colors">Produtos</Link>
              <Link to="/ofertas" className="hover:text-green-400 transition-colors">Ofertas</Link>
              <Link to="/about" className="hover:text-green-400 transition-colors">Sobre</Link>
              {/* Search inline */}
              <div className="relative">
                <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setSearchOpen(true) }}
                  onFocus={() => setSearchOpen(true)}
                  placeholder="Buscar..."
                  className="pl-8 pr-3 py-1.5 w-40 bg-gray-800 text-white text-xs rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500"
                />
                {searchOpen && searchTerm.trim().length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-lg shadow-xl border border-gray-200 max-h-80 overflow-y-auto z-50">
                    {products
                      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                      .length === 0 ? (
                        <p className="p-3 text-xs text-gray-400">Nenhum produto encontrado</p>
                      ) : (
                        products
                          .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                          .map(p => (
                              <Link
                                key={p.id}
                                to="/produtos"
                                state={{ openProductId: p.id }}
                                onClick={() => { setSearchTerm(''); setSearchOpen(false) }}
                                className="flex items-center gap-3 p-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                              >
                              <img src={optimizedImage(p.image, 160)} srcSet={`${optimizedImage(p.image,160)} 160w, ${optimizedImage(p.image,360)} 360w`} sizes="64px" alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                              <div>
                                <p className="text-xs font-bold text-gray-900">{p.name}</p>
                                <p className="text-xs font-black text-green-700">{p.price}</p>
                              </div>
                            </Link>
                          ))
                      )}
                  </div>
                )}
              </div>
            </nav>

            {/* Actions */}
              <div className="flex items-center gap-2">
              {/* Mobile search toggle */}
              <button
                onClick={() => setSearchOpen(v => !v)}
                className="md:hidden p-1.5 text-gray-300 hover:text-green-400"
                aria-label="Buscar"
              >
                <FaSearch className="w-4 h-4" />
              </button>
              <a href="https://chat.whatsapp.com/FXWPyvKCDTY2MXMklqOHx9?mode=gi_t" target="_blank" rel="noopener noreferrer" className="hidden md:block text-sm text-gray-300 hover:text-green-400 transition-colors">Entrar</a>
              <button onClick={toggle} className="relative flex items-center gap-1.5 text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-lg bg-green-600 text-white font-bold hover:bg-green-500 transition-colors">
                <FaShoppingCart className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Carrinho</span>
                {totalItems > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-[10px] font-bold rounded-full flex items-center justify-center">{totalItems}</span>}
              </button>
              {/* Mobile hamburger */}
              <button
                aria-label="Menu"
                className="md:hidden p-1.5"
                onClick={() => setMobileOpen(v => !v)}
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileOpen
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <nav className="md:hidden bg-black border-t border-gray-800 px-4 py-3 space-y-2 text-sm">
            {['Início', 'Produtos', 'Ofertas', 'Sobre'].map((label, i) => (
              <Link key={i} to={['/', '/produtos', '/ofertas', '/about'][i]} className="block py-1.5 text-gray-300 hover:text-green-400" onClick={() => setMobileOpen(false)}>
                {label}
              </Link>
            ))}
            <a href="https://chat.whatsapp.com/FXWPyvKCDTY2MXMklqOHx9?mode=gi_t" target="_blank" rel="noopener noreferrer" className="block text-center py-2 mt-2 bg-green-600 text-white font-bold rounded-lg" onClick={() => setMobileOpen(false)}>
              Entrar
            </a>
          </nav>
        )}

        {/* Mobile search bar */}
        {searchOpen && (
          <div className="md:hidden bg-black border-t border-gray-800 px-3 py-2">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar produtos..."
                autoFocus
                className="w-full pl-9 pr-3 py-2.5 bg-gray-800 text-white text-sm rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-500"
              />
            </div>
            {searchTerm.trim().length > 0 && (
              <div className="mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-60 overflow-y-auto">
                {products
                  .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .length === 0 ? (
                    <p className="p-3 text-xs text-gray-400">Nenhum produto encontrado</p>
                  ) : (
                    products
                      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map(p => (
                        <Link
                          key={p.id}
                          to="/produtos"
                          state={{ openProductId: p.id }}
                          onClick={() => { setSearchTerm(''); setSearchOpen(false) }}
                          className="flex items-center gap-3 p-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                        >
                          <img src={optimizedImage(p.image, 160)} srcSet={`${optimizedImage(p.image,160)} 160w, ${optimizedImage(p.image,360)} 360w`} sizes="64px" alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-gray-900">{p.name}</p>
                            <p className="text-xs font-black text-green-700">{p.price}</p>
                          </div>
                        </Link>
                      ))
                  )}
              </div>
            )}
          </div>
        )}
      </header>

      <main>
        {/* ═══════ BANNER CARROSSEL ═══════ */}
        <section className="relative w-full overflow-hidden bg-black" style={{ aspectRatio: '21/9' }}>
          {/* Slides */}
          <div
            className="flex transition-transform duration-500 ease-out h-full"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {banners.map((b, i) => (
              <div key={b.id} data-banner className={`relative flex-shrink-0 w-full h-full bg-gradient-to-r ${b.bg}`}>
                {/* bg image */}
                <img
                  src={i === current ? optimizedImage(b.image, 1200) : optimizedImage(b.image, 720)}
                  srcSet={`${optimizedImage(b.image, 720)} 720w, ${optimizedImage(b.image, 1200)} 1200w`}
                  sizes="(max-width: 640px) 100vw, 1200px"
                  alt=""
                  onError={handleImgError}
                  className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-luminosity"
                  fetchPriority={i === current ? 'high' : 'low'}
                  loading={i === current ? 'eager' : 'lazy'}
                />
                {/* content */}
                <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
                  <p className="text-green-400 text-xs sm:text-sm font-semibold uppercase tracking-widest mb-1">{b.subtitle}</p>
                  <h2 className="text-xl sm:text-3xl lg:text-5xl font-black text-white leading-tight max-w-2xl">{b.title}</h2>
                  {b.price && <p className="text-2xl sm:text-4xl font-black text-green-400 mt-2">{b.price}</p>}
                  <Link to="/produtos" className="mt-4 sm:mt-6 px-6 py-2.5 sm:px-8 sm:py-3 bg-green-600 hover:bg-green-500 text-white text-sm sm:text-base font-bold rounded-lg transition-colors">
                    {b.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Arrows (desktop) */}
          <button onClick={prev} aria-label="Anterior" className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-green-600 text-white rounded-full items-center justify-center transition-colors">
            <FaChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button onClick={next} aria-label="Próximo" className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-green-600 text-white rounded-full items-center justify-center transition-colors">
            <FaChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                aria-label={`Banner ${i + 1}`}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-colors ${i === current ? 'bg-green-400' : 'bg-white/40'}`}
              />
            ))}
          </div>
        </section>

        {/* ─── Trust Bar (compacto) ─── */}
        <section className="bg-green-600 py-2 sm:py-3">
          <div className="max-w-7xl mx-auto px-3 flex justify-around text-white text-[10px] sm:text-xs font-medium">
            <span className="flex items-center gap-1"><FaTruck className="w-3 h-3 sm:w-4 sm:h-4" /> Entrega Rápida</span>
            <span className="flex items-center gap-1"><FaShieldAlt className="w-3 h-3 sm:w-4 sm:h-4" /> Compra Segura</span>
            <span className="flex items-center gap-1"><FaStar className="w-3 h-3 sm:w-4 sm:h-4" /> 4.9★</span>
          </div>
        </section>

        {/* ═══════ PRODUTOS EM DESTAQUE ═══════ */}
        <section className="py-6 sm:py-10 px-3 sm:px-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-2xl font-black">Mais Vendidos</h2>
            <Link to="/produtos" className="text-xs sm:text-sm text-green-600 font-semibold hover:underline">Ver todos →</Link>
          </div>

          {loadingProducts ? (
            <div className="flex items-center justify-center py-10">
              <FaSpinner className="w-5 h-5 text-green-600 animate-spin" />
            </div>
          ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {products.map(p => (
              <div key={p.id} className="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
                {/* Imagem - clique abre detalhe do produto */}
                <Link to="/produtos" state={{ openProductId: p.id }} className="block relative aspect-square bg-gray-50 overflow-hidden">
                  <img src={optimizedImage(p.image, 720)} srcSet={`${optimizedImage(p.image,720)} 720w, ${optimizedImage(p.image,1200)} 1200w`} sizes="(max-width: 640px) 100vw, 329px" alt={p.name} onError={handleImgError} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  <span className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 px-2 py-0.5 bg-green-600 text-white text-[10px] sm:text-xs font-bold rounded">
                    {p.tag}
                  </span>
                </Link>
                {/* Info */}
                <div className="p-2.5 sm:p-4">
                  <Link to="/produtos" state={{ openProductId: p.id }} className="block">
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 leading-tight line-clamp-2 hover:text-green-600 transition-colors">{p.name}</h3>
                  </Link>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-sm sm:text-lg font-black text-green-700">{p.price}</span>
                    <span className="text-[10px] sm:text-xs text-gray-400 line-through">{p.oldPrice}</span>
                  </div>
                  <button
                    onClick={() => addItem({ id: p.id, name: p.name, price: p.price, priceNum: p.priceNum, image: p.image })}
                    className="mt-2 sm:mt-3 w-full py-2 sm:py-2.5 bg-black text-white text-[11px] sm:text-sm font-bold rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
                  >
                    <FaShoppingCart className="w-3 h-3" />
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
          )}
        </section>

        {/* ─── Depoimentos (compacto, horizontal scroll no mobile) ─── */}
        <section className="py-6 sm:py-10 bg-gray-50">
          <div className="max-w-7xl mx-auto px-3 sm:px-6">
            <h2 className="text-lg sm:text-2xl font-black mb-4 sm:mb-6">Clientes Satisfeitos</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
              {[
                { name: 'Lucas M.', text: 'Melhor custo-benefício! Entrega antes do prazo.' },
                { name: 'Ana P.', text: 'Creatina pura, diferença absurda nos treinos!' },
                { name: 'Carlos R.', text: 'Pré-treino Extreme é insano, recomendo muito.' },
              ].map((r, i) => (
                <div key={i} className="flex-shrink-0 w-[260px] sm:w-auto sm:flex-1 bg-white p-4 rounded-xl border border-gray-100 snap-start">
                  <div className="flex text-yellow-400 gap-0.5 mb-2">
                    {[...Array(5)].map((_, j) => <FaStar key={j} className="w-3 h-3" />)}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-3">"{r.text}"</p>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center text-green-700 text-xs font-bold">{r.name[0]}</div>
                    <div className="text-xs font-bold text-gray-800">{r.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ CTA FINAL ═══════ */}
        <section className="py-10 sm:py-16 bg-black text-center px-4">
          <h2 className="text-xl sm:text-3xl font-black text-white mb-2">
            Ganhe <span className="text-green-400">10% OFF</span> nos Combos
          </h2>
          <p className="text-sm text-gray-400 mb-5 max-w-md mx-auto">Entre no nosso grupo do WhatsApp e resgate seu cupom na descrição do grupo!</p>
          <a
            href="https://chat.whatsapp.com/FXWPyvKCDTY2MXMklqOHx9?mode=gi_t"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors text-sm sm:text-base"
          >
            <FaWhatsapp className="w-4 h-4" />
            Entrar no Grupo de Promoções
          </a>
        </section>
      </main>

      {/* ─── Footer (compacto) ─── */}
      <footer className="bg-black text-gray-400 py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs sm:text-sm">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="flex items-center gap-1.5 mb-3">
                <img src="/android-icon-36x36.png" alt="BenSuplementos" className="w-10 h-10 rounded-lg object-contain" />
                <span className="text-sm font-extrabold text-white">Ben<span className="text-green-400">Suplementos</span></span>
              </Link>
              <p className="text-gray-500 text-xs leading-relaxed">Qualidade, preço justo e entrega rápida.</p>
              <div className="flex gap-3 mt-3">
                <a href="https://www.instagram.com/bensuplementos_" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-green-400"><FaInstagram className="w-4 h-4" /></a>
                <a href="https://wa.me/5585991470709" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="hover:text-green-400"><FaWhatsapp className="w-4 h-4" /></a>
              </div>
            </div>

            {/* Loja */}
            <div>
              <h4 className="font-bold text-white mb-2">Loja</h4>
              <ul className="space-y-1.5">
                <li><Link to="/produtos" className="hover:text-green-400">Whey Protein</Link></li>
                <li><Link to="/produtos" className="hover:text-green-400">Creatina</Link></li>
                <li><Link to="/produtos" className="hover:text-green-400">Pré-Treino</Link></li>
                <li><Link to="/produtos" className="hover:text-green-400">Vitaminas</Link></li>
              </ul>
            </div>

            {/* Institucional */}
            <div>
              <h4 className="font-bold text-white mb-2">Ajuda</h4>
              <ul className="space-y-1.5">
                <li><Link to="/about" className="hover:text-green-400">Sobre Nós</Link></li>
                <li><Link to="/privacy" className="hover:text-green-400">Privacidade</Link></li>
                <li><Link to="/terms" className="hover:text-green-400">Termos</Link></li>
                <li><a href="#" className="hover:text-green-400">Trocas</a></li>
              </ul>
            </div>

            {/* Contato */}
            <div>
              <h4 className="font-bold text-white mb-2">Contato</h4>
              <ul className="space-y-1.5">
                <li><a href="https://wa.me/5585991470709" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-green-400"><FaWhatsapp className="w-3 h-3 text-green-500" /> (85) 99147-0709</a></li>
                <li>contato@bensuplementos.com.br</li>
              </ul>
              <div className="flex gap-1.5 mt-3">
                <span className="px-2 py-0.5 bg-gray-800 rounded text-[10px]">PIX</span>
                <span className="px-2 py-0.5 bg-gray-800 rounded text-[10px]">Cartão</span>
                <span className="px-2 py-0.5 bg-gray-800 rounded text-[10px]">Boleto</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-6 pt-4 text-[10px] sm:text-xs text-gray-600 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>© 2026 BenSuplementos. Todos os direitos reservados.</p>
            <div className="flex gap-3">
              <Link to="/terms" className="hover:text-green-400">Termos</Link>
              <Link to="/privacy" className="hover:text-green-400">Privacidade</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}