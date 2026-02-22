import { Link } from 'react-router-dom'
import { FaTag, FaShoppingCart } from 'react-icons/fa'
import { useCart } from '../contexts/CartContext'

export default function Ofertas() {
  const { addItem, totalItems, toggle } = useCart()

  const sampleOffers = [
    { id: 'of-1', name: 'Combo Whey + Creatina', price: 'R$ 169,90', image: 'https://placehold.co/400x400/1a1a1a/22c55e?text=Combo' },
    { id: 'of-2', name: 'Pré-Treino Extreme', price: 'R$ 99,90', image: 'https://placehold.co/400x400/1a1a1a/22c55e?text=Pré-Treino' },
  ]

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
        <h1 className="text-2xl font-black mb-4">Ofertas Especiais</h1>
        <p className="text-gray-600 mb-6">Confira nossas promoções exclusivas para combos e produtos selecionados.</p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sampleOffers.map(o => (
            <div key={o.id} className="bg-white rounded-xl border p-3 shadow-sm">
              <img src={o.image} alt={o.name} className="w-full h-36 object-cover rounded-md mb-3" />
              <h3 className="text-sm font-bold">{o.name}</h3>
              <p className="text-green-700 font-black mt-1">{o.price}</p>
              <button onClick={() => addItem({ id: o.id, name: o.name, price: o.price, priceNum: parseFloat(o.price.replace(/[^\\d,]/g, '').replace(',', '.')), image: o.image })} className="mt-3 w-full py-2 bg-black text-white rounded-lg font-bold">Adicionar</button>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
