import { Link } from 'react-router-dom'
import { FaShoppingCart, FaWhatsapp, FaFire, FaTag, FaBolt, FaStar, FaLock, FaTruck } from 'react-icons/fa'
import { useEffect, useState } from 'react'
import { useCart } from '../contexts/CartContext'
import { listProducts, formatBRL, type Product, optimizedImage } from '../lib/productService'

const IMG_FALLBACK = 'https://placehold.co/400x400/1a1a1a/22c55e?text=BenSuplementos'
const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  const el = e.currentTarget
  if (!el.dataset.fallback) { el.dataset.fallback = '1'; el.src = IMG_FALLBACK }
}

function getDiscount(price: number, oldPrice?: number): number {
  if (!oldPrice || oldPrice <= price) return 0
  return Math.round(((oldPrice - price) / oldPrice) * 100)
}

function isOnSale(p: Product) {
  const t = (p.tag ?? '').toLowerCase()
  return t.includes('%') || t.includes('promo') || t.includes('mais') || t.startsWith('-') || (!!p.oldPrice && p.oldPrice > p.price)
}

function _seed(id: string | number) { return String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0) }
function seedViews(id: string | number) { return 120 + (_seed(id) % 340) }
function seedLikes(id: string | number) { return 18 + (_seed(id) % 73) }

export default function Ofertas() {
  const { addItem, totalItems, toggle } = useCart()
  const [offers, setOffers]       = useState<Product[] | null>(null)
  const [loading, setLoading]     = useState(true)
  const [catFilter, setCatFilter] = useState('Todos')
  const [sort, setSort]           = useState<'default' | 'desc' | 'asc'>('default')
  const [timer, setTimer]         = useState({ h: '00', m: '00', s: '00' })
  const [added, setAdded]         = useState<string | number | null>(null)

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
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await listProducts(true)
        if (cancelled) return
        const promos = data.filter(isOnSale)
        setOffers(promos.length > 0 ? promos : data)
      } catch {
        if (!cancelled) setOffers([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  function handleAdd(o: Product) {
    addItem({ id: o.id, name: o.name, price: formatBRL(o.price), priceNum: o.price, image: optimizedImage(o.image, 720), category: o.category })
    setAdded(o.id)
    setTimeout(() => setAdded(null), 1500)
  }

  const cats = ['Todos', ...Array.from(new Set((offers ?? []).map(o => o.category).filter(Boolean)))]
  let filtered = catFilter === 'Todos' ? (offers ?? []) : (offers ?? []).filter(o => o.category === catFilter)
  if (sort === 'asc')  filtered = [...filtered].sort((a, b) => a.price - b.price)
  if (sort === 'desc') filtered = [...filtered].sort((a, b) => b.price - a.price)
  const maxDisc = Math.max(0, ...((offers ?? []).map(o => getDiscount(o.price, o.oldPrice))))

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-black shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between h-14 sm:h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src="/android-icon-48x48.png" alt="BenSuplementos" className="w-9 h-9 rounded-lg object-contain" />
            <span className="text-base sm:text-lg font-extrabold text-white">Ben<span className="text-green-400">Suplementos</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/" className="hidden sm:block text-xs text-gray-400 hover:text-white transition-colors">← Início</Link>
            <Link to="/produtos" className="hidden sm:block text-xs text-gray-400 hover:text-white transition-colors">Todos os produtos</Link>
            <button onClick={toggle} className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-sm transition-colors">
              <FaShoppingCart className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Carrinho</span>
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-[10px] font-bold rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Timer bar */}
      <div className="bg-red-600 text-white py-2 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-3 flex-wrap">
          <span className="text-sm">🔥 <strong>Ofertas encerram em:</strong></span>
          <div className="flex items-center gap-1">
            <span className="bg-black/30 rounded px-2 py-0.5 font-mono font-bold text-sm tabular-nums">{timer.h}</span>
            <span className="font-bold text-xs opacity-75">:</span>
            <span className="bg-black/30 rounded px-2 py-0.5 font-mono font-bold text-sm tabular-nums">{timer.m}</span>
            <span className="font-bold text-xs opacity-75">:</span>
            <span className="bg-black/30 rounded px-2 py-0.5 font-mono font-bold text-sm tabular-nums">{timer.s}</span>
          </div>
          <span className="text-xs opacity-75 hidden sm:block">· Aproveite agora!</span>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white px-4 py-10 sm:py-14">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
            <FaBolt className="w-3 h-3" /> Ofertas do Dia
          </div>
          <h1 className="text-3xl sm:text-5xl font-black leading-tight mb-3">
            Até <span className="text-green-400">{maxDisc > 0 ? `${maxDisc}% OFF` : '40% OFF'}</span> nos<br className="hidden sm:block" /> melhores suplementos
          </h1>
          <p className="text-gray-300 text-sm sm:text-base mb-6 max-w-lg mx-auto">
            Preços reais com desconto real. Estoque limitado — aproveite enquanto durar!
          </p>
          <div className="flex items-center justify-center gap-5 mb-6 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs text-gray-400"><FaTruck className="text-green-400 w-3.5 h-3.5" /> Entrega rápida</span>
            <span className="flex items-center gap-1.5 text-xs text-gray-400"><FaLock className="text-green-400 w-3.5 h-3.5" /> Compra segura</span>
            <span className="flex items-center gap-1.5 text-xs text-gray-400"><FaStar className="text-yellow-400 w-3.5 h-3.5" /> 4.9 ★ avaliações</span>
          </div>
          <a
            href="https://chat.whatsapp.com/FXWPyvKCDTY2MXMklqOHx9?mode=gi_t"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white font-black px-6 py-3 rounded-full text-sm transition-all active:scale-95 shadow-lg"
          >
            <FaWhatsapp className="w-4 h-4" /> Entrar no Grupo de Promoções
          </a>
          <p className="text-gray-500 text-xs mt-3">Cupons exclusivos e alertas de oferta no WhatsApp</p>
        </div>
      </div>

      {/* Conteúdo */}
      <main className="max-w-7xl mx-auto px-4 py-8">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-100 text-sm">
              <FaFire className="text-red-500 w-3.5 h-3.5" />
              <span className="font-bold text-gray-800">{offers?.length ?? 0} <span className="font-normal text-gray-500">em oferta</span></span>
            </div>
            <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-100 text-sm">
              <FaTag className="text-green-600 w-3.5 h-3.5" />
              <span className="font-bold text-gray-800">{maxDisc > 0 ? `Até -${maxDisc}%` : 'Desconto real'}</span>
            </div>
          </div>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as typeof sort)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
          >
            <option value="default">Ordenar: Destaque</option>
            <option value="asc">Menor preço</option>
            <option value="desc">Maior preço</option>
          </select>
        </div>

        {cats.length > 2 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6" style={{ scrollbarWidth: 'none' }}>
            {cats.map(c => (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  catFilter === c ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-800'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="animate-spin border-4 border-green-600 border-t-transparent rounded-full w-10 h-10" />
            <p className="text-gray-400 text-sm">Carregando ofertas…</p>
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {filtered.map(o => {
              const disc = getDiscount(o.price, o.oldPrice)
              return (
                <div key={o.id} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col">
                  <Link to="/produtos" state={{ openProductId: o.id }} className="block relative aspect-square bg-gray-50 overflow-hidden">
                    <img
                      src={optimizedImage(o.image, 720)}
                      srcSet={`${optimizedImage(o.image, 720)} 720w, ${optimizedImage(o.image, 1200)} 1200w`}
                      sizes="(max-width: 640px) 100vw, 329px"
                      alt={o.name} loading="lazy" onError={handleImgError}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {disc > 0 ? (
                      <span className="absolute top-2 left-2 bg-red-600 text-white text-[11px] font-black px-2 py-0.5 rounded-lg shadow">-{disc}%</span>
                    ) : o.tag ? (
                      <span className="absolute top-2 left-2 bg-green-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-lg">{o.tag}</span>
                    ) : null}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 bg-white text-gray-900 text-[11px] font-bold px-3 py-1.5 rounded-full shadow transition-opacity">
                        Ver detalhes
                      </span>
                    </div>
                  </Link>
                  <div className="p-3 sm:p-4 flex flex-col flex-1">
                    <Link to="/produtos" state={{ openProductId: o.id }}>
                      <h3 className="text-xs sm:text-sm font-bold text-gray-900 leading-tight line-clamp-2 hover:text-green-700 transition-colors mb-2">{o.name}</h3>
                    </Link>
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="text-base sm:text-lg font-black text-green-700">{formatBRL(o.price)}</span>
                      {o.oldPrice && <span className="text-xs text-gray-400 line-through">{formatBRL(o.oldPrice)}</span>}
                    </div>
                    <p className="text-[10px] text-green-600 font-semibold mb-1">
                      💳 PIX: {(o.price * 0.95).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                    <p className="text-[10px] text-gray-400 mb-3 flex items-center gap-2">
                      <span>👁 {seedViews(o.id)}</span>
                      <span>❤️ {seedLikes(o.id)}</span>
                    </p>
                    <button
                      onClick={() => handleAdd(o)}
                      className={`mt-auto w-full py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                        added === o.id ? 'bg-green-500 text-white' : 'bg-black hover:bg-green-700 text-white'
                      }`}
                    >
                      <FaShoppingCart className="w-3 h-3" />
                      {added === o.id ? '✓ Adicionado!' : <><span className="hidden sm:inline">Adicionar ao Carrinho</span><span className="sm:hidden">Adicionar</span></>}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">😢</p>
            <p className="text-gray-600 font-bold text-lg mb-1">Nenhuma oferta nesta categoria.</p>
            <p className="text-gray-400 text-sm mb-6">Tente outra categoria ou veja todos os produtos.</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={() => setCatFilter('Todos')} className="px-6 py-2 bg-black text-white rounded-full text-sm font-bold hover:bg-green-700 transition-colors">
                Ver todas as ofertas
              </button>
              <Link to="/produtos" className="px-6 py-2 border border-gray-300 text-gray-700 rounded-full text-sm font-bold hover:border-black transition-colors">
                Ver todos os produtos
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Footer CTA */}
      <div className="bg-gradient-to-r from-green-700 to-green-600 text-white py-10 px-4 mt-10">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-xl font-black mb-2">Quer ser avisado das promoções?</p>
          <p className="text-sm text-green-100 mb-5">Cupons exclusivos, lançamentos e alertas de estoque direto no WhatsApp.</p>
          <a
            href="https://chat.whatsapp.com/FXWPyvKCDTY2MXMklqOHx9?mode=gi_t"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-green-700 font-black px-7 py-3.5 rounded-full text-sm hover:bg-green-50 transition-all active:scale-95 shadow-lg"
          >
            <FaWhatsapp className="w-4 h-4" /> Entrar no Grupo Agora
          </a>
          <p className="mt-3 text-green-200 text-xs">Mais de 400 clientes no grupo · Grátis</p>
        </div>
      </div>

    </div>
  )
}
