import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { FaShoppingCart, FaStar, FaArrowLeft, FaSpinner, FaSearch, FaHeart, FaEye, FaWhatsapp, FaShareAlt, FaCheck } from 'react-icons/fa'
import { useCart } from '../contexts/CartContext'
import { listProducts, formatBRL, type Product, type ProductVariant, getProductStats, incrementProductView, toggleProductLike } from '../lib/productService'

/* ── Fallback ── */
const IMG_FALLBACK = 'https://placehold.co/400x400/1a1a1a/22c55e?text=BenSuplementos'
const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  const el = e.currentTarget
  if (!el.dataset.fallback) { el.dataset.fallback = '1'; el.src = IMG_FALLBACK }
}

/* Tipo unificado para exibição */
interface DisplayProduct {
  id: string | number
  name: string
  price: string
  priceNum: number
  oldPrice: string
  image: string
  tag: string
  cat: string
  brand: string
  desc: string
  variants?: ProductVariant[]
}

/* Converte Firestore → DisplayProduct */
function toDisplay(p: Product): DisplayProduct {
  return {
    id: p.id,
    name: p.name,
    price: formatBRL(p.price),
    priceNum: p.price,
    oldPrice: p.oldPrice ? formatBRL(p.oldPrice) : '',
    image: p.image,
    tag: p.tag || '',
    cat: p.category,
    brand: p.brand || '',
    desc: p.description || '',
    variants: p.variants,
  }
}

/* ── Catálogo fallback (caso Firestore esteja vazio / offline) ── */
const fallbackProducts: DisplayProduct[] = [
  { id: 'fb-1', name: 'Whey Isolado 900g', price: 'R$ 189,90', priceNum: 189.90, oldPrice: 'R$ 249,90', image: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=400&h=400&q=80', tag: 'Mais Vendido', cat: 'Whey Protein', brand: '', desc: 'Whey Protein Isolado de alta pureza, 27g de proteína por dose.' },
  { id: 'fb-2', name: 'Creatina 300g', price: 'R$ 89,90', priceNum: 89.90, oldPrice: 'R$ 119,90', image: 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&w=400&h=400&q=80', tag: '-25%', cat: 'Creatina', brand: '', desc: 'Creatina Monohidratada pura, 5g por dose.' },
  { id: 'fb-3', name: 'Pré-Treino Extreme 300g', price: 'R$ 129,90', priceNum: 129.90, oldPrice: 'R$ 169,90', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=400&h=400&q=80', tag: 'Novo', cat: 'Pré-Treino', brand: '', desc: 'Pré-treino com cafeína, beta-alanina e citrulina.' },
  { id: 'fb-4', name: 'BCAA 2:1:1 120 Cáps', price: 'R$ 59,90', priceNum: 59.90, oldPrice: 'R$ 79,90', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=400&h=400&q=80', tag: '-25%', cat: 'Aminoácidos', brand: '', desc: 'BCAA na proporção 2:1:1 para recuperação muscular acelerada.' },
]

const categories = ['Todos', 'Whey Protein', 'Creatina', 'Pré-Treino', 'Aminoácidos', 'Vitaminas']

/* Seed social-proof base para views e likes (consistente por produto) */
function _seed(id: string | number): number {
  return String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0)
}
function seedViews(id: string | number): number { return 120 + (_seed(id) % 340) }
function seedLikes(id: string | number): number { return 18 + (_seed(id) % 73) }

export default function Products() {
  const { addItem, toggle, totalItems } = useCart()
  const [filter, setFilter] = useState('Todos')
  const [filterBrand, setFilterBrand] = useState('Todos')
  const [detail, setDetail] = useState<DisplayProduct | null>(null)
  const [products, setProducts] = useState<DisplayProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const location = useLocation()

  /* Stats do detalhe */
  const [detailStats, setDetailStats] = useState({ views: 0, likes: 0 })
  const [isLiked, setIsLiked] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  /* Variantes selecionadas no detalhe */
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})

  /* Buscar produtos do Firestore */
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await listProducts(true) // apenas ativos
        if (!cancelled) {
          const prods = data.length > 0 ? data.map(toDisplay) : fallbackProducts
          setProducts(prods)
          // Abrir produto direto via URL ?produto=ID (vindo de link compartilhado)
          const params = new URLSearchParams(window.location.search)
          const productIdFromUrl = params.get('produto')
          if (productIdFromUrl) {
            const found = prods.find(p => String(p.id) === String(productIdFromUrl))
            if (found) setDetail(found)
          }
        }
      } catch {
        if (!cancelled) setProducts(fallbackProducts)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Abrir detalhe quando navegamos com state from Home
  useEffect(() => {
    const s = (location.state as any) || {}
    if (s.openProductId && products.length > 0) {
      const found = products.find(p => String(p.id) === String(s.openProductId))
      if (found) setDetail(found)
    }
    // Se navegamos a partir da Home com uma categoria inicial, aplica o filtro
    if (s.initialCategory && products.length > 0) {
      const exists = products.some(p => p.cat === s.initialCategory)
      if (exists) setFilter(s.initialCategory)
    }
    // Se navegamos com uma marca inicial, aplica o filtro de marca
    if (s.initialBrand && products.length > 0) {
      const exists = products.some(p => p.brand === s.initialBrand)
      if (exists) setFilterBrand(s.initialBrand)
    }
  }, [location.state, products])

  /* Quando muda o produto em detalhe: incrementa view + carrega stats */
  useEffect(() => {
    if (!detail) return
    // Resetar variantes selecionadas ao trocar de produto
    setSelectedVariants({})
    const id = String(detail.id)
    setIsLiked(!!localStorage.getItem(`ben_liked_${id}`))
    setDetailStats({ views: 0, likes: 0 })
    // Carrega stats e já soma +1 da visita atual otimisticamente
    getProductStats(id)
      .then(s => {
        setDetailStats({ views: s.views + 1, likes: s.likes })
        incrementProductView(id) // confirma no servidor em paralelo
      })
      .catch(() => { incrementProductView(id) })
  }, [detail])

  const handleLike = async () => {
    if (!detail || likeLoading) return
    const id = String(detail.id)
    const newLiked = !isLiked
    setLikeLoading(true)
    setIsLiked(newLiked)
    setDetailStats(s => ({ ...s, likes: Math.max(0, s.likes + (newLiked ? 1 : -1)) }))
    if (newLiked) localStorage.setItem(`ben_liked_${id}`, '1')
    else localStorage.removeItem(`ben_liked_${id}`)
    await toggleProductLike(id, newLiked)
    setLikeLoading(false)
  }

  const catFiltered = filter === 'Todos' ? products : products.filter(p => p.cat === filter)
  const brandFiltered = filterBrand === 'Todos' ? catFiltered : catFiltered.filter(p => p.brand === filterBrand)
  const filtered = searchTerm.trim()
    ? brandFiltered.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : brandFiltered

  /* Marcas disponíveis nos produtos carregados */
  const availableBrands = [...new Set(products.map(p => p.brand).filter(Boolean))] as string[]

  const handleAdd = (p: DisplayProduct, variants?: Record<string, string>) => {
    addItem({ id: p.id, name: p.name, price: p.price, priceNum: p.priceNum, image: p.image, category: p.cat, selectedVariants: variants && Object.keys(variants).length > 0 ? variants : undefined })
  }

  /* ── Product Detail View ── */
  if (detail) {
    const similar = products.filter(p => p.cat === detail.cat && String(p.id) !== String(detail.id)).slice(0, 4)
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-black">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between h-16 sm:h-20">
            <Link to="/" className="flex items-center gap-1.5">
              <img src="/android-icon-48x48.png" alt="BenSuplementos" className="w-12 h-12 rounded-lg object-contain" />
              <span className="text-lg sm:text-xl font-extrabold text-white leading-none">Ben<span className="text-green-400">Suplementos</span></span>
            </Link>
            <button onClick={toggle} className="relative flex items-center gap-1.5 text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-lg bg-green-600 text-white font-bold hover:bg-green-500 transition-colors">
              <FaShoppingCart className="w-3.5 h-3.5" />
              {totalItems > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-[10px] font-bold rounded-full flex items-center justify-center">{totalItems}</span>}
            </button>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
          <button onClick={() => setDetail(null)} className="flex items-center gap-2 text-sm text-green-600 font-semibold mb-6 hover:underline">
            <FaArrowLeft className="w-3 h-3" /> Voltar aos produtos
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Imagem */}
            <div className="relative">
              <div className="aspect-square bg-gray-50 rounded-2xl overflow-hidden">
                <img src={detail.image} alt={detail.name} onError={handleImgError} className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Info */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                {detail.tag && <span className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-lg">{detail.tag}</span>}
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">{detail.cat}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-2 leading-tight text-left">{detail.name}</h1>

              {/* ─── PAINEL DE STATS ─── */}
              <div className="flex items-stretch gap-3 mt-4">
                {/* Views */}
                <div className="flex-1 flex items-center gap-2.5 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FaEye className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-base font-black text-gray-900 leading-none">
                      {(seedViews(detail.id) + detailStats.views).toLocaleString('pt-BR')}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">visualizações</p>
                  </div>
                </div>
                {/* Curtidas + botão */}
                <button
                  onClick={handleLike}
                  disabled={likeLoading}
                  className={`flex-1 flex items-center gap-2.5 border rounded-xl px-4 py-3 transition-all active:scale-95 ${
                    isLiked
                      ? 'bg-red-50 border-red-300'
                      : 'bg-gray-50 border-gray-100 hover:bg-red-50 hover:border-red-200'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                    isLiked ? 'bg-red-500' : 'bg-gray-200 group-hover:bg-red-100'
                  }`}>
                    <FaHeart className={`w-3.5 h-3.5 ${ isLiked ? 'text-white' : 'text-gray-400'}`} />
                  </div>
                  <div className="text-left">
                    <p className={`text-base font-black leading-none ${ isLiked ? 'text-red-500' : 'text-gray-900'}`}>
                      {(seedLikes(detail.id) + detailStats.likes).toLocaleString('pt-BR')}
                    </p>
                    <p className={`text-[10px] mt-0.5 ${ isLiked ? 'text-red-400' : 'text-gray-400'}`}>
                      {isLiked ? 'curtido por você ❤️' : 'toque para curtir'}
                    </p>
                  </div>
                </button>
              </div>

              <div className="flex items-baseline gap-3 mt-5">
                <span className="text-3xl sm:text-4xl font-black text-green-700">{detail.price}</span>
                {detail.oldPrice && <span className="text-base text-gray-400 line-through">{detail.oldPrice}</span>}
              </div>
              <p className="text-xs text-green-600 font-semibold mt-1 text-left">
                💳 No PIX com 5% OFF: {(detail.priceNum * 0.95).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>

              <div className="flex items-center gap-0.5 mt-4">
                {[...Array(5)].map((_, i) => <FaStar key={i} className="w-3.5 h-3.5 text-yellow-400" />)}
                <span className="text-xs text-gray-400 ml-1">(120+ avaliações)</span>
              </div>

              {detail.desc && (
                <p className="text-sm text-gray-600 mt-5 leading-relaxed border-t pt-4 text-left">{detail.desc}</p>
              )}

              {/* ── Seletor de Variantes ── */}
              {detail.variants && detail.variants.length > 0 && (
                <div className="mt-5 space-y-4 border-t pt-4">
                  {detail.variants.map(group => (
                    <div key={group.type}>
                      <p className="text-xs font-bold text-gray-700 mb-2">{group.type}:</p>
                      <div className="flex flex-wrap gap-2">
                        {group.values.map(val => (
                          <button
                            key={val}
                            onClick={() => setSelectedVariants(prev => ({ ...prev, [group.type]: val }))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                              selectedVariants[group.type] === val
                                ? 'bg-green-600 text-white border-green-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-green-500 hover:text-green-600'
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {/* Alerta se nem todas as variantes foram selecionadas */}
                  {detail.variants.some(g => !selectedVariants[g.type]) && (
                    <p className="text-[11px] text-orange-600 font-semibold">
                      ⚠️ Selecione {detail.variants.filter(g => !selectedVariants[g.type]).map(g => g.type.toLowerCase()).join(' e ')} para continuar
                    </p>
                  )}
                </div>
              )}

              <div className="mt-6 flex flex-col gap-2">
                <button
                  onClick={() => { handleAdd(detail, selectedVariants); toggle() }}
                  disabled={!!(detail.variants?.length && detail.variants.some(g => !selectedVariants[g.type]))}
                  className="w-full py-3.5 bg-green-600 hover:bg-green-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <FaShoppingCart className="w-4 h-4" />
                  Comprar agora
                </button>
                <button
                  onClick={() => handleAdd(detail, selectedVariants)}
                  disabled={!!(detail.variants?.length && detail.variants.some(g => !selectedVariants[g.type]))}
                  className="w-full py-3 border-2 border-green-600 text-green-700 hover:bg-green-50 disabled:opacity-60 disabled:cursor-not-allowed font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <FaShoppingCart className="w-3.5 h-3.5" />
                  Adicionar ao Carrinho
                </button>
                <a
                  href={`https://wa.me/5585991470709?text=Olá! Tenho interesse no produto: ${encodeURIComponent(detail.name)} (${detail.price})`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-gray-900 hover:bg-gray-700 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <FaWhatsapp className="w-4 h-4 text-green-400" />
                  Tirar dúvidas no WhatsApp
                </a>
                {/* Botão compartilhar — gera link OG que mostra foto do produto no WhatsApp */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={async () => {
                      const url = `${window.location.origin}/api/produto?id=${detail.id}`
                      try {
                        if (navigator.share) {
                          await navigator.share({ title: detail.name, text: `${detail.name} — ${detail.price}`, url })
                          return
                        }
                      } catch {}
                      try { await navigator.clipboard.writeText(url) } catch {}
                      setShareCopied(true)
                      setTimeout(() => setShareCopied(false), 2500)
                    }}
                    className="flex items-center justify-center gap-2 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    {shareCopied
                      ? <><FaCheck className="w-3.5 h-3.5 text-green-500" /><span className="text-green-600">Link copiado!</span></>
                      : <><FaShareAlt className="w-3.5 h-3.5" /> Copiar link</>
                    }
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`${detail.name} — ${detail.price}\n${window.location.origin}/api/produto?id=${detail.id}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-xl text-sm font-bold transition-colors"
                  >
                    <FaWhatsapp className="w-4 h-4" /> Compartilhar
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Produtos similares */}
          {similar.length > 0 && (
            <div className="mt-12 border-t pt-10">
              <h2 className="text-lg sm:text-xl font-black text-gray-900 mb-5">Produtos Similares</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {similar.map(p => (
                  <div
                    key={p.id}
                    onClick={() => { setDetail(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    className="group cursor-pointer bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-square bg-gray-50 overflow-hidden">
                      <img src={p.image} alt={p.name} onError={handleImgError} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-bold text-gray-800 line-clamp-2 leading-tight">{p.name}</p>
                      <p className="text-sm font-black text-green-700 mt-1">{p.price}</p>
                      <button
                        onClick={e => { e.stopPropagation(); handleAdd(p) }}
                        className="mt-2 w-full py-1.5 bg-black hover:bg-green-600 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <FaShoppingCart className="w-2.5 h-2.5" /> Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ── Products List View ── */
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between h-16 sm:h-20">
          <Link to="/" className="flex items-center gap-1.5">
            <img src="/android-icon-48x48.png" alt="BenSuplementos" className="w-12 h-12 rounded-lg object-contain" />
            <span className="text-lg sm:text-xl font-extrabold text-white leading-none">Ben<span className="text-green-400">Suplementos</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/" className="hidden md:block text-sm text-gray-300 hover:text-green-400 transition-colors">Início</Link>
            <button onClick={toggle} className="relative flex items-center gap-1.5 text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-lg bg-green-600 text-white font-bold hover:bg-green-500 transition-colors">
              <FaShoppingCart className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Carrinho</span>
              {totalItems > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-[10px] font-bold rounded-full flex items-center justify-center">{totalItems}</span>}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
        <div className="flex items-center gap-2 mb-4">
          <Link to="/" className="text-green-600 text-xs hover:underline">Início</Link>
          <span className="text-gray-300 text-xs">/</span>
          <span className="text-xs text-gray-500 font-medium">Produtos</span>
        </div>

        <h1 className="text-xl sm:text-3xl font-black text-gray-900 mb-4 sm:mb-6">Todos os Produtos</h1>

        {/* Search bar */}
        <div className="relative mb-4">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome do produto..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 text-gray-900 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <FaSpinner className="w-6 h-6 text-green-600 animate-spin" />
            <span className="ml-2 text-gray-500 text-sm">Carregando produtos...</span>
          </div>
        ) : (
        <>
        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-colors ${
                filter === cat
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Brand filters */}
        {availableBrands.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-hide mb-6">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide flex-shrink-0">Marca:</span>
            {['Todos', ...availableBrands].map(b => (
              <button
                key={b}
                onClick={() => setFilterBrand(b)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-colors border ${
                  filterBrand === b
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        )}

        {/* Product grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {filtered.map(p => (
            <div key={p.id} className="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
              {/* Image - click for detail */}
              <button onClick={() => setDetail(p)} className="w-full relative aspect-square bg-gray-50 overflow-hidden">
                <img src={p.image} alt={p.name} onError={handleImgError} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                <span className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 px-2 py-0.5 bg-green-600 text-white text-[10px] sm:text-xs font-bold rounded">{p.tag}</span>
              </button>
              {/* Info */}
              <div className="p-2.5 sm:p-4">
                <button onClick={() => setDetail(p)} className="text-left w-full">
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 leading-tight line-clamp-2 hover:text-green-600 transition-colors">{p.name}</h3>
                </button>
                {p.brand && (
                  <button
                    onClick={() => setFilterBrand(filterBrand === p.brand ? 'Todos' : p.brand)}
                    className="mt-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded hover:bg-blue-100 transition-colors"
                  >
                    {p.brand}
                  </button>
                )}
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-sm sm:text-lg font-black text-green-700">{p.price}</span>
                  <span className="text-[10px] sm:text-xs text-gray-400 line-through">{p.oldPrice}</span>
                </div>
                <button
                  onClick={() => handleAdd(p)}
                  className="mt-2 sm:mt-3 w-full py-2 sm:py-2.5 bg-black text-white text-[11px] sm:text-sm font-bold rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
                >
                  <FaShoppingCart className="w-3 h-3" />
                  Add ao Carrinho
                </button>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-10">Nenhum produto nesta categoria.</p>
        )}
        </>
        )}
      </div>
    </div>
  )
}
