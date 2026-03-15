import { Link } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { FaShoppingCart, FaInstagram, FaWhatsapp, FaTruck, FaShieldAlt, FaStar, FaChevronLeft, FaChevronRight, FaSpinner, FaSearch } from 'react-icons/fa'
import { useCart, FRETE_GRATIS_MIN } from '../contexts/CartContext'
import { listFeaturedProducts, listProducts, listReviews, getProductStats, formatBRL, type Product, optimizedImage } from '../lib/productService'
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
    category: 'Whey Protein' as string | null,
  },
  {
    id: 2,
    title: 'Creatinas com até 14% OFF',
    subtitle: 'Promoção por tempo limitado',
    price: 'R$ 64,90',
    cta: 'Aproveitar',
    bg: 'from-black via-gray-900 to-green-900',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80',
    category: 'Creatina' as string | null,
  },
  {
    id: 3,
    title: `Frete Grátis acima de R$${FRETE_GRATIS_MIN.toFixed(1).replace('.', ',')}`,
    subtitle: 'Para toda Fortaleza',
    price: '',
    cta: 'Ver Ofertas',
    bg: 'from-green-800 via-green-950 to-black',
    image: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=1200&q=80',
    category: null as string | null,
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
    category: p.category,
  }
}

/** Gera número de vendas do dia por produto (seed pelo ID — consistente entre renders) */
function getSeed(id: string | number): number {
  return String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0)
}
function getViews(id: string | number): number { return 120 + (getSeed(id) % 340) }
function getLikes(id: string | number): number { return 18 + (getSeed(id) % 73) }

export default function Home() {
  const { addItem, toggle, totalItems } = useCart()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [userCity, setUserCity] = useState<string>('')
  const [userRegion, setUserRegion] = useState<string>('')

  /* detectar cidade/estado do usuário (IP geolocation) */
  useEffect(() => {
    fetch('https://ipwho.is/')
      .then(r => r.json())
      .then(d => {
        if (d?.city) setUserCity(d.city)
        if (d?.region) setUserRegion(d.region)
      })
      .catch(() => {})
  }, [])
  const [current, setCurrent] = useState(0)
  const [products, setProducts] = useState(fallbackProducts)
  const [categoriesList, setCategoriesList] = useState<{ name: string; image: string }[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [productStats, setProductStats] = useState<Record<string, { views: number; likes: number }>>({})  
  const [timer, setTimer] = useState({ h: '00', m: '00', s: '00' })
  const [exitPopup, setExitPopup] = useState(false)
  const [reviews, setReviews] = useState([
    { name: 'Lucas M.', text: 'Melhor custo-benefício! Entrega antes do prazo.' },
    { name: 'Ana P.', text: 'Creatina pura, diferença absurda nos treinos!' },
    { name: 'Carlos R.', text: 'Pré-treino Extreme é insano, recomendo muito.' },
  ])

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

  /* Carregar stats reais (views/likes) dos produtos do Firestore */
  useEffect(() => {
    if (products.length === 0) return
    Promise.all(
      products.map(p =>
        getProductStats(String(p.id)).then(s => ({ id: String(p.id), ...s }))
      )
    ).then(results => {
      const map: Record<string, { views: number; likes: number }> = {}
      for (const r of results) map[r.id] = { views: r.views, likes: r.likes }
      setProductStats(map)
    }).catch(() => {})
  }, [products])

  /* Buscar categorias existentes (uma imagem por categoria) */
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const all = await listProducts(true)
        if (cancelled) return
        const map = new Map<string, string>()
        for (const p of all) {
          if (!p.category) continue
          if (!map.has(p.category)) map.set(p.category, p.image)
        }
        const out = Array.from(map.entries()).map(([name, image]) => ({ name, image }))
        if (out.length > 0) setCategoriesList(out)
      } catch {
        /* ignore */
      }
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

  /* Temporizador diário — conta até meia-noite */
  useEffect(() => {
    function tick() {
      const now = new Date()
      const end = new Date(now); end.setHours(23, 59, 59, 0)
      const diff = Math.max(0, end.getTime() - now.getTime())
      setTimer({
        h: String(Math.floor(diff / 3600000)).padStart(2, '0'),
        m: String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0'),
        s: String(Math.floor((diff % 60000) / 1000)).padStart(2, '0'),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  /* Exit-intent popup */
  useEffect(() => {
    if (localStorage.getItem('ben_exit_dismissed')) return
    const onLeave = (e: MouseEvent) => { if (e.clientY < 10) setExitPopup(true) }
    const mobileId = setTimeout(() => {
      if (!localStorage.getItem('ben_exit_dismissed')) setExitPopup(true)
    }, 50000)
    document.addEventListener('mouseleave', onLeave)
    return () => { document.removeEventListener('mouseleave', onLeave); clearTimeout(mobileId) }
  }, [])

  /* Carregar depoimentos do Firestore */
  useEffect(() => {
    listReviews().then(data => {
      if (data.length > 0) setReviews(data.map(r => ({ name: r.name, text: r.text })))
    }).catch(() => {})
  }, [])

  /* Schema.org ProductList */
  useEffect(() => {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Suplementos — BenSuplementos',
      itemListElement: products.slice(0, 8).map((p, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        item: {
          '@type': 'Product',
          name: p.name,
          image: p.image,
          offers: { '@type': 'Offer', price: String(p.priceNum.toFixed(2)), priceCurrency: 'BRL', availability: 'https://schema.org/InStock' },
        },
      })),
    }
    let el = document.getElementById('schema-products') as HTMLScriptElement | null
    if (!el) {
      el = document.createElement('script')
      el.id = 'schema-products'
      el.type = 'application/ld+json'
      document.head.appendChild(el)
    }
    el.textContent = JSON.stringify(schema)
    return () => { document.getElementById('schema-products')?.remove() }
  }, [products])

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* ─── Top strip ─── */}
      <div className="bg-black text-center py-1.5 px-2 text-[11px] sm:text-xs font-medium text-gray-300 tracking-wide">
        <span className="text-green-400 font-bold">FRETE GRÁTIS</span> a partir de R${FRETE_GRATIS_MIN.toFixed(1).replace('.', ',')}
        {(userCity || userRegion) && (
          <>&nbsp;|&nbsp; 📍 <span className="text-blue-400">{userCity}{userCity && userRegion ? ', ' : ''}{userRegion}</span></>
        )}
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
                  <Link
                    to={b.category ? '/produtos' : '/ofertas'}
                    state={b.category ? { initialCategory: b.category } : undefined}
                    className="mt-4 sm:mt-6 px-6 py-2.5 sm:px-8 sm:py-3 bg-green-600 hover:bg-green-500 text-white text-sm sm:text-base font-bold rounded-lg transition-colors"
                  >
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

        {/* ─── Urgência / Timer ─── */}
        <div className="bg-red-600 text-white py-1.5 text-center text-xs font-bold tracking-wide">
          ⏳ Promoções do dia encerram em:&nbsp;
          <span className="font-mono">{timer.h}:{timer.m}:{timer.s}</span>
          &nbsp;·&nbsp;
          <Link to="/ofertas" className="underline hover:no-underline">Ver todas as ofertas →</Link>
        </div>

        {/* ─── Trust Bar (compacto) ─── */}
        <section className="bg-green-600 py-2 sm:py-3">
          <div className="max-w-7xl mx-auto px-3 flex justify-around text-white text-[10px] sm:text-xs font-medium">
            <span className="flex items-center gap-1"><FaTruck className="w-3 h-3 sm:w-4 sm:h-4" /> Entrega Rápida</span>
            <span className="flex items-center gap-1"><FaShieldAlt className="w-3 h-3 sm:w-4 sm:h-4" /> Compra Segura</span>
            <span className="flex items-center gap-1"><FaStar className="w-3 h-3 sm:w-4 sm:h-4" /> 4.9★</span>
          </div>
        </section>

        {/* ═══════ PRODUTOS EM DESTAQUE ═══════ */}
        {/* ═══════ CATEGORIAS (círculos horizontais) ═══════ */}
        {categoriesList.length > 0 && (
          <section className="py-4 sm:py-6 px-3 sm:px-6 max-w-7xl mx-auto">
            <h3 className="text-sm sm:text-base font-bold mb-3">Categorias</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {categoriesList.map(cat => (
                <Link
                  key={cat.name}
                  to="/produtos"
                  state={{ initialCategory: cat.name }}
                  className="flex-shrink-0 w-20 sm:w-24 text-center"
                >
                  <div className="w-20 sm:w-24 h-20 sm:h-24 rounded-full overflow-hidden mx-auto border border-gray-100 shadow-sm">
                    <img src={optimizedImage(cat.image, 360)} alt={cat.name} onError={handleImgError} className="w-full h-full object-cover" />
                  </div>
                  <div className="text-xs mt-2 text-gray-700 font-semibold">{cat.name}</div>
                </Link>
              ))}
            </div>
          </section>
        )}

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
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5 flex items-center gap-2">
                    <span>👁 {productStats[String(p.id)]?.views ?? getViews(p.id)}</span>
                    <span>❤️ {productStats[String(p.id)]?.likes ?? getLikes(p.id)}</span>
                  </p>
                  <button
                    onClick={() => addItem({ id: p.id, name: p.name, price: p.price, priceNum: p.priceNum, image: p.image, category: (p as any).category })}
                    className="mt-2 sm:mt-3 w-full py-2 sm:py-2.5 bg-black text-white text-[11px] sm:text-sm font-bold rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
                  >
                    <FaShoppingCart className="w-3 h-3" />
                    <span className="hidden sm:inline">Adicionar ao Carrinho</span>
                    <span className="sm:hidden">Adicionar</span>
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
              {reviews.map((r, i) => (
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

        {/* ═══════ REDES SOCIAIS ═══════ */}
        <section className="py-10 sm:py-16 bg-black text-center px-4">
          <h2 className="text-xl sm:text-3xl font-black text-white mb-2">
            Fique por dentro das <span className="text-green-400">promoções</span>
          </h2>
          <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
            Entre no nosso grupo do WhatsApp para receber ofertas e cupons exclusivos — e siga a gente no Instagram para novidades.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a
              href="https://chat.whatsapp.com/FXWPyvKCDTY2MXMklqOHx9?mode=gi_t"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors text-sm sm:text-base"
            >
              <FaWhatsapp className="w-4 h-4" />
              Grupo de Promoções
            </a>
            <a
              href="https://www.instagram.com/bensuplementos_"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-bold rounded-lg transition-colors text-sm sm:text-base"
            >
              <FaInstagram className="w-4 h-4" />
              Seguir no Instagram
            </a>
          </div>
        </section>
      </main>

      {/* ─── Exit-intent popup ─── */}
      {exitPopup && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 px-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl p-7 max-w-sm w-full text-center shadow-2xl relative">
            <button
              onClick={() => { setExitPopup(false); localStorage.setItem('ben_exit_dismissed', '1') }}
              className="absolute top-3 right-4 text-gray-400 hover:text-gray-700 text-2xl leading-none"
              aria-label="Fechar"
            >×</button>
            <div className="text-4xl mb-3">🎁</div>
            <h3 className="text-xl font-black mb-1 text-gray-900">Espera! Não vá embora ainda.</h3>
            <p className="text-gray-600 text-sm mb-5">
              Entre no nosso grupo do WhatsApp e encontre <strong>cupons exclusivos</strong> na descrição do grupo antes de fechar.
            </p>
            <a
              href="https://chat.whatsapp.com/FXWPyvKCDTY2MXMklqOHx9?mode=gi_t"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => { setExitPopup(false); localStorage.setItem('ben_exit_dismissed', '1') }}
              className="inline-flex items-center justify-center gap-2 w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors text-sm"
            >
              <FaWhatsapp className="w-4 h-4" />
              Quero meu cupom exclusivo!
            </a>
            <button
              onClick={() => { setExitPopup(false); localStorage.setItem('ben_exit_dismissed', '1') }}
              className="mt-3 block w-full text-xs text-gray-400 hover:text-gray-600"
            >
              Não, obrigado
            </button>
          </div>
        </div>
      )}

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
                <li><Link to="/afiliado/cadastro" className="hover:text-green-400 text-green-500 font-semibold">Seja Afiliado</Link></li>
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