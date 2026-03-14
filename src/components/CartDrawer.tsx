import { useState } from 'react'
import { useCart } from '../contexts/CartContext'
import { FaTimes, FaPlus, FaMinus, FaTrash, FaTag, FaWhatsapp, FaShoppingCart, FaTruck, FaSpinner } from 'react-icons/fa'
import { getAffiliateByCoupon, saveAffiliateOrder } from '../lib/affiliateService'

export default function CartDrawer() {
  const {
    items, isOpen, coupon, couponError, couponLoading,
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
            🛒 <span>{totalItems > 0 ? `Seu carrinho — ${totalItems} ${totalItems === 1 ? 'item' : 'itens'}` : 'Seu carrinho'}</span>
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
                <div>
                  {(() => {
                    const hasCategories = !!(coupon.categories && coupon.categories.length > 0)
                    const hasCatItems = hasCategories
                      ? items.some(i => coupon.categories!.includes(i.category || ''))
                      : true
                    const catLabel = hasCategories ? coupon.categories!.join(', ') : null
                    return (
                      <>
                        <div className={`flex items-center justify-between rounded-lg px-3 py-2 border ${
                          hasCatItems ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                        }`}>
                          <div className={`flex items-center gap-2 text-xs font-bold ${
                            hasCatItems ? 'text-green-700' : 'text-yellow-700'
                          }`}>
                            <FaTag className="w-3 h-3" />
                            {coupon.code}
                            {coupon.affiliate && <span className="text-[9px] font-normal bg-yellow-100 text-yellow-700 border border-yellow-300 px-1 rounded">AFILIADO</span>}
                            {hasCatItems && <span>(-{coupon.percent}%{catLabel ? ` em ${catLabel}` : ''})</span>}
                          </div>
                          <button onClick={removeCoupon} className="text-gray-400 hover:text-red-500">
                            <FaTimes className="w-3 h-3" />
                          </button>
                        </div>
                        {hasCatItems ? (
                          <p className="text-green-700 text-[12px] mt-2">
                            Cupom <span className="font-bold">{coupon.code}</span> aplicado — {coupon.percent}% OFF{catLabel ? <> em <span className="font-bold">{catLabel}</span></> : ' em todos os produtos'}
                          </p>
                        ) : (
                          <p className="text-yellow-700 text-[12px] mt-2">
                            Cupom <span className="font-bold">{coupon.code}</span> registrado. Desconto de {coupon.percent}% aplica em <span className="font-bold">{catLabel}</span>.
                          </p>
                        )}
                      </>
                    )
                  })()}
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
                      onKeyDown={e => { if (e.key === 'Enter') { applyCoupon(couponInput); setCouponInput('') } }}
                    />
                    <button
                      onClick={() => { applyCoupon(couponInput); setCouponInput('') }}
                      disabled={couponLoading}
                      className="px-3 py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-60 flex items-center gap-1"
                    >
                      {couponLoading ? <FaSpinner className="w-3 h-3 animate-spin" /> : 'Aplicar'}
                    </button>
                  </div>
                  {couponError && <p className="text-red-500 text-[11px] mt-2">{couponError}</p>}
                  <p className="text-gray-500 text-[11px] mt-2">Use <b>BEN5</b> = 5% OFF · <b>BEN10</b> = 10% OFF · ou cupom de afiliado</p>
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
              onClick={async () => {
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

                // Rastrear pedido de afiliado (fire & forget, não bloqueia checkout)
                if (coupon?.affiliate && coupon?.code) {
                  try {
                    const aff = await getAffiliateByCoupon(coupon.code)
                    if (aff) {
                      await saveAffiliateOrder({
                        couponCode: coupon.code,
                        affiliateId: aff.uid,
                        affiliateName: aff.name,
                        items: items.map(it => ({ name: it.name, qty: it.qty, price: it.price })),
                        subtotal,
                        discount,
                        total,
                        status: 'pending',
                        cep: cep || '',
                      })
                    }
                  } catch {
                    // não bloquear o checkout por falha no tracking
                  }
                }

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
