import { Link } from 'react-router-dom'
import { FaShoppingCart } from 'react-icons/fa'
import { useEffect, useState } from 'react'
import { useCart } from '../contexts/CartContext'
import { listProducts, formatBRL, type Product } from '../lib/productService'

function isPromoTag(tag?: string) {
  if (!tag) return false
  const t = tag.toLowerCase()
  return t.includes('%') || t.includes('promo') || t.includes('mais') || t.includes('novo') || t.startsWith('-')
}

export default function Ofertas() {
  const { addItem, totalItems, toggle } = useCart()
  const [offers, setOffers] = useState<Product[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await listProducts(true)
        if (cancelled) return
        const promos = data.filter(p => isPromoTag(p.tag))
        setOffers(promos.length > 0 ? promos : [])
      } catch (e) {
        if (!cancelled) setOffers([])
      } finally {
        if (!cancelled) setLoading(false)
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
            <h1 className="text-2xl font-black">Ofertas BenSuplementos</h1>
            <p className="text-gray-600">Promoções e combos com tag promocional — entre no grupo do WhatsApp para cupons exclusivos.</p>
          </div>
          <a href="https://chat.whatsapp.com/FXWPyvKCDTY2MXMklqOHx9?mode=gi_t" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-black text-white rounded-lg font-bold">Entrar no Grupo</a>
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
                  <img src={o.image} alt={o.name} className="w-full h-36 object-cover rounded-md mb-3" />
                  {o.tag && <span className="absolute top-2 left-2 bg-green-600 text-white text-[11px] font-bold px-2 py-0.5 rounded">{o.tag}</span>}
                </div>
                <h3 className="text-sm font-bold">{o.name}</h3>
                <div className="mt-1">
                  <span className="text-green-700 font-black">{formatBRL(o.price)}</span>
                  {o.oldPrice && <span className="text-[11px] text-gray-400 line-through ml-2">{formatBRL(o.oldPrice)}</span>}
                </div>
                <button onClick={() => addItem({ id: o.id, name: o.name, price: formatBRL(o.price), priceNum: o.price, image: o.image })} className="mt-3 w-full py-2 bg-black text-white rounded-lg font-bold">Adicionar</button>
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
