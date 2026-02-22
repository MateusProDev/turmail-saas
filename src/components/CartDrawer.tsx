import { useState } from 'react'
import { useCart } from '../contexts/CartContext'
import { FaTimes, FaPlus, FaMinus, FaTrash, FaTag, FaWhatsapp, FaShoppingCart, FaTruck } from 'react-icons/fa'

export default function CartDrawer() {
  const {
    items, isOpen, coupon, couponError,
    totalItems, subtotal, discount, total, freteGratis, freteStatus, cep, setCep,
    close, removeItem, updateQty,
    applyCoupon, removeCoupon, markCouponUsed, clearCart,
  } = useCart()

  const [couponInput, setCouponInput] = useState('')

  const fmt = (n: number) =>
    n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={close} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white z-[70] shadow-2xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-black text-white">
          <div className="flex items-center gap-2 font-bold text-sm">
            🛒 Carrinho ({totalItems})
          </div>
          <button onClick={close} className="p-1.5 hover:bg-gray-800 rounded transition-colors">
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
              <FaShoppingCart className="w-10 h-10" />
              <p className="text-sm font-medium">Seu carrinho está vazio</p>
              <button onClick={close} className="text-green-600 text-sm font-bold hover:underline">
                Continuar comprando
              </button>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex gap-3 bg-gray-50 rounded-lg p-3">
                {/* Thumb */}
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                />
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-gray-900 leading-tight line-clamp-2">{item.name}</h4>
                  <p className="text-sm font-black text-green-700 mt-0.5">{item.price}</p>
                  {/* Qty controls */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      onClick={() => updateQty(item.id, item.qty - 1)}
                      className="w-6 h-6 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded text-xs transition-colors"
                    >
                      <FaMinus className="w-2 h-2" />
                    </button>
                    <span className="text-xs font-bold w-5 text-center">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.id, item.qty + 1)}
                      className="w-6 h-6 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded text-xs transition-colors"
                    >
                      <FaPlus className="w-2 h-2" />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="ml-auto text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <FaTrash className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer (only if items) */}
        {items.length > 0 && (
          <div className="border-t p-4 space-y-3 bg-white">
            {/* Coupon */}
            <div>
              {coupon ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 text-green-700 text-xs font-bold">
                    <FaTag className="w-3 h-3" />
                    {coupon.code} (-{coupon.percent}%)
                  </div>
                  <button onClick={removeCoupon} className="text-gray-400 hover:text-red-500">
                    <FaTimes className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={e => setCouponInput(e.target.value)}
                      placeholder="Cupom de desconto"
                      className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      onKeyDown={e => e.key === 'Enter' && (applyCoupon(couponInput), setCouponInput(''))}
                    />
                    <button
                      onClick={() => { applyCoupon(couponInput); setCouponInput('') }}
                      className="px-3 py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      Aplicar
                    </button>
                  </div>
                  {couponError && <p className="text-red-500 text-[10px] mt-1">{couponError}</p>}
                  <p className="text-gray-400 text-[10px] mt-1">Experimente: BEN10, BEN15 ou BEN20</p>
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600 font-bold">
                  <span>Desconto ({coupon?.percent}%)</span>
                  <span>-{fmt(discount)}</span>
                </div>
              )}

              {/* CEP + Frete */}
              <div className="border-t pt-2 space-y-1.5">
                <p className="text-[10px] text-gray-500 font-medium flex items-center gap-1"><FaTruck className="w-3 h-3" /> Calcular frete</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cep}
                    onChange={e => setCep(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                    className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-mono tracking-wider"
                  />
                </div>
                {freteStatus === 'gratis' && (
                  <p className="text-green-600 font-bold text-[11px] flex items-center gap-1">✅ Frete GRÁTIS para Fortaleza!</p>
                )}
                {freteStatus === 'combinar' && (
                  <p className="text-yellow-600 font-semibold text-[11px]">📦 Frete a combinar (fora de Fortaleza)</p>
                )}
                {freteStatus === 'pendente' && cep.replace(/\D/g, '').length === 8 && subtotal < 199.90 && (
                  <p className="text-gray-400 text-[10px]">Frete grátis para Fortaleza acima de R$ 199,90</p>
                )}
                {freteStatus === 'pendente' && cep.replace(/\D/g, '').length < 8 && (
                  <p className="text-gray-400 text-[10px]">Digite seu CEP para calcular o frete</p>
                )}
              </div>

              <div className="flex justify-between text-base font-black text-gray-900 pt-1 border-t">
                <span>Total</span>
                <span>{fmt(total)}</span>
              </div>
            </div>

            {/* Checkout via WhatsApp */}
            <button
              onClick={() => {
                const lines = items.map(
                  (it) => `• ${it.qty}x ${it.name} — ${it.price}`
                )
                const msg = [
                  '🛒 *Pedido BenSuplementos*',
                  '',
                  ...lines,
                  '',
                  discount > 0 ? `Cupom: ${coupon?.code} (-${coupon?.percent}%)` : '',
                  cep ? `📍 CEP: ${cep}` : '',
                  freteGratis ? '🚚 Frete Grátis (Fortaleza)' : freteStatus === 'combinar' ? '📦 Frete a combinar' : '',
                  `*Total: ${fmt(total)}*`,
                  '',
                  'Olá! Gostaria de finalizar este pedido 🙂',
                ]
                  .filter(Boolean)
                  .join('%0A')
                // Marcar cupom como usado neste dispositivo
                markCouponUsed()
                clearCart()
                window.open(`https://wa.me/5585991470709?text=${msg}`, '_blank')
              }}
              className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
            >
              <FaWhatsapp className="w-4 h-4" />
              Finalizar pelo WhatsApp
            </button>
          </div>
        )}
      </div>
    </>
  )
}
