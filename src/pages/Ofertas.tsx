import { Link } from 'react-router-dom'
import { FaShoppingCart, FaWhatsapp, FaFire, FaTag, FaBolt } from 'react-icons/fa'
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

function isPromoTag(tag?: string) {
  if (!tag) return false
  const t = tag.toLowerCase()
  return t.includes('%') || t.includes('promo') || t.includes('mais') || t.includes('novo') || t.startsWith('-')
}

function isOnSale(p: Product) {
  return isPromoTag(p.tag) || (!!p.oldPrice && p.oldPrice > p.price)
}

/* Seed para social proof */
function _seed(id: string | number) { return String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0) }
function seedViews(id: string | number) { return 120 + (_seed(id) % 340) }
function seedLikes(id: string | number) { return 18 + (_seed(id) % 73) }

export default function Ofertas() {
  const { addItem, totalItems, toggle } = useCart()
  const [offers, setOffers] = useState<Product[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [catFilter, setCatFilter] = useState('Todos')
  const [timer, setTimer] = useState({ h: '00', m: '00', s: '00' })
  const [added, setAdded] = useState<string | number | null>(null)

  /* Timer até meia-noite */
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
  const filtered = catFilter === 'Todos' ? (offers ?? []) : (offers ?? []).filter(o => o.category === catFilter)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-black shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between h-14 sm:h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src="/android-icon-48x48.png" alt="BenSuplementos" className="w-9 h-9 rounded-lg object-contain" />
            <span className="text-base sm:text-lg font-extrabold text-white">Ben<span className="text-green-400">Suplementos</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/produtos" className="hidden sm:block text-xs text-gray-400 hover:text-white transition-colors">Ver todos os produtos</Link>
            <button onClick={toggle} className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-sm transition-colors">
              <FaShoppingCart className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Carrinho</span>
              {totalItems > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-[10px] font-bold rounded-full flex items-center justify-center">{totalItems}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* ── Timer bar ── */}
      <div className="bg-red-600 text-white py-2 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-3 flex-wrap">
          <span className="text-sm">🔥 <strong>Ofertas relâmpago encerram em:</strong></span>
          <div className="flex items-center gap-1">
            <span className="bg-black/30 rounded px-2 py-0.5 font-mono font-bold text-sm tabular-nums">{timer.h}</span>
            <span className="font-bold text-xs opacity-75">:</span>
            <span className="bg-black/30 rounded px-2 py-0.5 font-mono font-bold text-sm tabular-nums">{timer.m}</span>
            <span className="font-bold text-xs opacity-75">:</span>
            <span className="bg-black/30 rounded px-2 py-0.5 font-mono font-bold text-sm tabular-nums">{timer.s}</span>
          </div>
        </div>
      </div>

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white px-4 py-10 sm:py-14">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
            <FaBolt className="w-3 h-3" /> Ofertas do Dia
          </div>
          <h1 className="text-3xl sm:text-5xl font-black leading-tight mb-3">
            Descontos de até <span className="text-green-400">40% OFF</span>
          </h1>
          <p className="text-gray-300 text-sm sm:text-base mb-6 max-w-lg mx-auto">
            Suplementos premium com os melhores preços. Aproveite antes que acabe — estoque limitado!
          </p>
          <a
            href="https://chat.whatsapp.com/FXWPyvKCDTY2MXMklqOHx9?mode=gi_t"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white font-black px-6 py-3 rounded-full text-sm transition-all active:scale-95 shadow-lg shadow-green-900/40"
          >
            <FaWhatsapp className="w-4 h-4" /> Entrar no Grupo de Promoções
          </a>
          <p className="text-gray-500 text-xs mt-3">Cupons exclusivos direto no WhatsApp</p>
        </div>
      </div>

      {/* ── Conteúdo ── */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats rápidos */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 shadow-sm border border-gray-100">
            <FaFire className="text-red-500 w-4 h-4" />
            <span className="text-sm font-bold text-gray-800">{offers?.length ?? 0} produtos em oferta</span>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 shadow-sm border border-gray-100">
            <FaTag className="text-green-600 w-4 h-4" />
            <span className="text-sm font-bold text-gray-800">Descontos reais no preço</span>
          </div>
        </div>

        {/* Filtro categorias */}
        {cats.length > 2 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
            {cats.map(c => (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  catFilter === c
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-black'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="animate-spin border-4 border-green-600 border-t-transparent rounded-full w-10 h-10" />
            <p className="text-gray-400 text-sm">Carregando ofertas…</p>
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {filtered.map(o => {
              const disc = getDiscount(o.price, o.oldPrice)
              const isJustAdded = added === o.id
              return (
                <div key={o.id} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col">
                  {/* Imagem */}
                  <Link to="/produtos" state={{ openProductId: o.id }} className="block relative aspect-square bg-gray-50 overflow-hidden">
                    <img
                      src={optimizedImage(o.image, 720)}
                      srcSet={`${optimizedImage(o.image, 720)} 720w, ${optimizedImage(o.image, 1200)} 1200w`}
                      sizes="(max-width: 640px) 100vw, 329px"
                      alt={o.name}
                      loading="lazy"
                      onError={handleImgError}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Badge desconto */}
                    {disc > 0 && (
                      <span className="absolute top-2 left-2 bg-red-600 text-white text-[11px] font-black px-2 py-0.5 rounded-lg shadow">
                        -{disc}%
                      </span>
                    )}
                    {/* Badge tag */}
                    {o.tag && disc === 0 && (
                      <span className="absolute top-2 left-2 bg-green-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-lg">
                        {o.tag}
                      </span>
                    )}
                  </Link>

                  {/* Info */}
                  <div className="p-3 sm:p-4 flex flex-col flex-1">
                    <Link to="/produtos" state={{ openProductId: o.id }}>
                      <h3 className="text-xs sm:text-sm font-bold text-gray-900 leading-tight line-clamp-2 hover:text-green-700 transition-colors mb-2">{o.name}</h3>
                    </Link>

                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="text-base sm:text-lg font-black text-green-700">{formatBRL(o.price)}</span>
                      {o.oldPrice && <span className="text-xs text-gray-400 line-through">{formatBRL(o.oldPrice)}</span>}
                    </div>

                    {/* PIX */}
                    <p className="text-[10px] text-green-600 font-semibold mb-1">
                      💳 PIX: {(o.price * 0.95).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>

                    {/* Social proof */}
                    <p className="text-[10px] text-gray-400 font-medium mb-3 flex items-center gap-2">
                      <span>👁 {seedViews(o.id)}</span>
                      <span>❤️ {seedLikes(o.id)}</span>
                    </p>

                    <button
                      onClick={() => handleAdd(o)}
                      className={`mt-auto w-full py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                        isJustAdded
                          ? 'bg-green-500 text-white'
                          : 'bg-black hover:bg-green-700 text-white'
                      }`}
                    >
                      <FaShoppingCart className="w-3 h-3" />
                      {isJustAdded ? '✓ Adicionado!' : <><span className="hidden sm:inline">Adicionar ao Carrinho</span><span className="sm:hidden">Adicionar</span></>}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">😢</p>
            <p className="text-gray-500 font-semibold">Nenhuma oferta encontrada nesta categoria.</p>
            <button onClick={() => setCatFilter('Todos')} className="mt-4 px-6 py-2 bg-black text-white rounded-full text-sm font-bold hover:bg-green-700 transition-colors">Ver todas as ofertas</button>
          </div>
        )}
      </main>

      {/* ── Footer CTA WhatsApp ── */}
      <div className="bg-green-600 text-white py-8 px-4 mt-8">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-lg font-black mb-1">Quer promoções antes de todo mundo?</p>
          <p className="text-sm text-green-100 mb-4">Cupons exclusivos, lançamentos e ofertas relâmpago no nosso grupo.</p>
          <a
            href="https://chat.whatsapp.com/FXWPyvKCDTY2MXMklqOHx9?mode=gi_t"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-green-700 font-black px-6 py-3 rounded-full text-sm hover:bg-green-50 transition-all active:scale-95"
          >
            <FaWhatsapp className="w-4 h-4" /> Entrar no Grupo Agora
          </a>
        </div>
      </div>
    </div>
  )
}
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-black">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between h-16 sm:h-20">
          <Link to="/" className="flex items-center gap-2">
            <img src="/android-icon-48x48.png" alt="BenSuplementos" className="w-12 h-12 rounded-lg object-contain" />
            <span className="text-lg sm:text-xl font-extrabold text-white">Ben<span className="text-green-400">Suplementos</span></span>
          </Link>
          <button onClick={toggle} className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white font-bold">
            <FaShoppingCart />
            Carrinho
            {totalItems > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-[11px] font-bold rounded-full flex items-center justify-center">{totalItems}</span>}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black">Ofertas — BenSuplementos</h1>
            <p className="text-gray-600 max-w-xl">Aproveite produtos com desconto: listamos os itens marcados como promoção. Entre no nosso grupo do WhatsApp para resgatar cupons exclusivos, lançamentos e ofertas relâmpago.</p>
          </div>
          <a
            href="https://chat.whatsapp.com/FXWPyvKCDTY2MXMklqOHx9?mode=gi_t"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Entrar no grupo de promoções do WhatsApp"
            className="mt-3 md:mt-0 block md:inline-flex w-full md:w-auto items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold shadow-sm text-center"
          >
            <FaWhatsapp className="w-4 h-4" />
            Entrar no Grupo
          </a>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin border-4 border-green-600 border-t-transparent rounded-full w-8 h-8" />
          </div>
        ) : offers && offers.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {offers.map(o => (
              <div key={o.id} className="bg-white rounded-xl border p-3 shadow-sm">
                <div className="relative">
                  <img src={optimizedImage(o.image, 720)} srcSet={`${optimizedImage(o.image,720)} 720w, ${optimizedImage(o.image,1200)} 1200w`} sizes="(max-width: 640px) 100vw, 329px" alt={o.name} loading="lazy" className="w-full h-36 object-cover rounded-md mb-3" />
                  {o.tag && <span className="absolute top-2 left-2 bg-green-600 text-white text-[11px] font-bold px-2 py-0.5 rounded">{o.tag}</span>}
                </div>
                <h3 className="text-sm font-bold">{o.name}</h3>
                <div className="mt-1">
                  <span className="text-green-700 font-black">{formatBRL(o.price)}</span>
                  {o.oldPrice && <span className="text-[11px] text-gray-400 line-through ml-2">{formatBRL(o.oldPrice)}</span>}
                </div>
                <button onClick={() => addItem({ id: o.id, name: o.name, price: formatBRL(o.price), priceNum: o.price, image: optimizedImage(o.image, 720) })} className="mt-3 w-full py-2 bg-black text-white rounded-lg font-bold">Adicionar</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500">Nenhuma oferta com tag promocional encontrada.</div>
        )}
      </main>
    </div>
  )
}
