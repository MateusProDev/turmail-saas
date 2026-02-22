import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

export interface CartItem {
  id: string | number
  name: string
  price: string       // "R$ 189,90"
  priceNum: number    // 189.90
  image: string
  qty: number
}

interface Coupon {
  code: string
  percent: number
}

const VALID_COUPONS: Record<string, number> = {
  BEN10: 10,
  BEN15: 15,
  BEN20: 20,
}

interface CartCtx {
  items: CartItem[]
  isOpen: boolean
  coupon: Coupon | null
  couponError: string
  totalItems: number
  subtotal: number
  discount: number
  total: number
  open: () => void
  close: () => void
  toggle: () => void
  addItem: (item: Omit<CartItem, 'qty'>) => void
  removeItem: (id: string | number) => void
  updateQty: (id: string | number, qty: number) => void
  applyCoupon: (code: string) => void
  removeCoupon: () => void
  clearCart: () => void
}

const CartContext = createContext<CartCtx | null>(null)

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be inside CartProvider')
  return ctx
}

/** Parse "R$ 189,90" → 189.90 */
function parsePrice(s: string): number {
  return parseFloat(s.replace(/[^\d,]/g, '').replace(',', '.')) || 0
}

/* ── localStorage helpers ── */
const CART_KEY = 'ben_cart_items'
const COUPON_KEY = 'ben_cart_coupon'

function loadItems(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function loadCoupon(): Coupon | null {
  try {
    const raw = localStorage.getItem(COUPON_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadItems)
  const [isOpen, setIsOpen] = useState(false)
  const [coupon, setCoupon] = useState<Coupon | null>(loadCoupon)
  const [couponError, setCouponError] = useState('')

  /* Persistir items no localStorage */
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items))
  }, [items])

  /* Persistir cupom no localStorage */
  useEffect(() => {
    if (coupon) {
      localStorage.setItem(COUPON_KEY, JSON.stringify(coupon))
    } else {
      localStorage.removeItem(COUPON_KEY)
    }
  }, [coupon])

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen(v => !v), [])

  const addItem = useCallback((item: Omit<CartItem, 'qty'>) => {
    const priceNum = item.priceNum || parsePrice(item.price)
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === item.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 }
        return next
      }
      return [...prev, { ...item, priceNum, qty: 1 }]
    })
  }, [])

  const removeItem = useCallback((id: string | number) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const updateQty = useCallback((id: string | number, qty: number) => {
    if (qty < 1) return removeItem(id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, qty } : i))
  }, [removeItem])

  const applyCoupon = useCallback((code: string) => {
    const upper = code.trim().toUpperCase()
    const percent = VALID_COUPONS[upper]
    if (percent) {
      setCoupon({ code: upper, percent })
      setCouponError('')
    } else {
      setCoupon(null)
      setCouponError('Cupom inválido')
    }
  }, [])

  const removeCoupon = useCallback(() => {
    setCoupon(null)
    setCouponError('')
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    setCoupon(null)
    setCouponError('')
  }, [])

  const totalItems = items.reduce((s, i) => s + i.qty, 0)
  const subtotal = items.reduce((s, i) => s + i.priceNum * i.qty, 0)
  const discount = coupon ? subtotal * (coupon.percent / 100) : 0
  const total = subtotal - discount

  return (
    <CartContext.Provider value={{
      items, isOpen, coupon, couponError,
      totalItems, subtotal, discount, total,
      open, close, toggle, addItem, removeItem, updateQty,
      applyCoupon, removeCoupon, clearCart,
    }}>
      {children}
    </CartContext.Provider>
  )
}
