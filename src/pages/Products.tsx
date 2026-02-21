import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { FaShoppingCart, FaLeaf, FaStar, FaArrowLeft, FaSpinner, FaSearch } from 'react-icons/fa'
import { useCart } from '../contexts/CartContext'
import { listProducts, formatBRL, type Product } from '../lib/productService'

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
  desc: string
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
    desc: p.description || '',
  }
}

/* ── Catálogo fallback (caso Firestore esteja vazio / offline) ── */
const fallbackProducts: DisplayProduct[] = [
  { id: 'fb-1', name: 'Whey Isolado 900g', price: 'R$ 189,90', priceNum: 189.90, oldPrice: 'R$ 249,90', image: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=400&h=400&q=80', tag: 'Mais Vendido', cat: 'Whey Protein', desc: 'Whey Protein Isolado de alta pureza, 27g de proteína por dose.' },
  { id: 'fb-2', name: 'Creatina 300g', price: 'R$ 89,90', priceNum: 89.90, oldPrice: 'R$ 119,90', image: 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&w=400&h=400&q=80', tag: '-25%', cat: 'Creatina', desc: 'Creatina Monohidratada pura, 5g por dose.' },
  { id: 'fb-3', name: 'Pré-Treino Extreme 300g', price: 'R$ 129,90', priceNum: 129.90, oldPrice: 'R$ 169,90', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=400&h=400&q=80', tag: 'Novo', cat: 'Pré-Treino', desc: 'Pré-treino com cafeína, beta-alanina e citrulina.' },
  { id: 'fb-4', name: 'BCAA 2:1:1 120 Cáps', price: 'R$ 59,90', priceNum: 59.90, oldPrice: 'R$ 79,90', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=400&h=400&q=80', tag: '-25%', cat: 'Aminoácidos', desc: 'BCAA na proporção 2:1:1 para recuperação muscular acelerada.' },
]

const categories = ['Todos', 'Whey Protein', 'Creatina', 'Pré-Treino', 'Aminoácidos', 'Vitaminas']

export default function Products() {
  const { addItem, toggle, totalItems } = useCart()
  const [filter, setFilter] = useState('Todos')
  const [detail, setDetail] = useState<DisplayProduct | null>(null)
  const [products, setProducts] = useState<DisplayProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  /* Buscar produtos do Firestore */
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await listProducts(true) // apenas ativos
        if (!cancelled) {
          if (data.length > 0) {
            setProducts(data.map(toDisplay))
          } else {
            setProducts(fallbackProducts)
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

  const catFiltered = filter === 'Todos' ? products : products.filter(p => p.cat === filter)
  const filtered = searchTerm.trim()
    ? catFiltered.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : catFiltered

  const handleAdd = (p: DisplayProduct) => {
    addItem({ id: p.id, name: p.name, price: p.price, priceNum: p.priceNum, image: p.image })
  }

  /* ── Product Detail View ── */
  if (detail) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-black">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between h-12 sm:h-14">
            <Link to="/" className="flex items-center gap-1.5">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center">
                <FaLeaf className="w-4 h-4 text-white" />
              </div>
              <span className="text-base sm:text-lg font-extrabold text-white leading-none">Ben<span className="text-green-400">Suplementos</span></span>
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
            <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden">
              <img src={detail.image} alt={detail.name} onError={handleImgError} className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded mb-3 inline-block">{detail.tag}</span>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-2">{detail.name}</h1>
              <p className="text-sm text-gray-500 mt-1">{detail.cat}</p>
              <div className="flex items-center gap-1 mt-3">
                {[...Array(5)].map((_, i) => <FaStar key={i} className="w-3.5 h-3.5 text-yellow-400" />)}
                <span className="text-xs text-gray-400 ml-1">(120+ avaliações)</span>
              </div>
              <div className="flex items-baseline gap-3 mt-4">
                <span className="text-3xl font-black text-green-700">{detail.price}</span>
                <span className="text-sm text-gray-400 line-through">{detail.oldPrice}</span>
              </div>
              <p className="text-xs text-green-600 font-medium mt-1">No PIX com 5% OFF: {
                (detail.priceNum * 0.95).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
              }</p>

              <p className="text-sm text-gray-600 mt-6 leading-relaxed">{detail.desc}</p>

              <button
                onClick={() => handleAdd(detail)}
                className="mt-6 w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <FaShoppingCart className="w-4 h-4" />
                Adicionar ao Carrinho
              </button>
              <button
                onClick={toggle}
                className="mt-2 w-full py-3 bg-black hover:bg-gray-800 text-white font-bold rounded-xl transition-colors text-sm"
              >
                Ver Carrinho ({totalItems})
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ── Products List View ── */
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between h-12 sm:h-14">
          <Link to="/" className="flex items-center gap-1.5">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center">
              <FaLeaf className="w-4 h-4 text-white" />
            </div>
            <span className="text-base sm:text-lg font-extrabold text-white leading-none">Ben<span className="text-green-400">Suplementos</span></span>
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
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-6">
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
