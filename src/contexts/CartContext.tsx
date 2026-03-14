import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

export interface CartItem {
  id: string | number
  name: string
  price: string       // "R$ 189,90"
  priceNum: number    // 189.90
  image: string
  qty: number
  category?: string   // ex: "Pré-Treino", "Whey Protein"
}

interface Coupon {
  code: string
  percent: number
  categories?: string[] // se definido e não-vazio, aplica só nessas categorias
  affiliate?: boolean   // cupom de afiliado: sem restrição de uso único
}

// Cupons são gerenciados exclusivamente via Firestore (sistema de afiliados)

interface CartCtx {
  items: CartItem[]
  isOpen: boolean
  coupon: Coupon | null
  couponError: string
  couponLoading: boolean
  totalItems: number
  subtotal: number
  discount: number
  total: number
  freteGratis: boolean
  freteStatus: 'gratis' | 'calculado' | 'calculando' | 'pendente' | 'erro'
  freteValor: number | null
  freteLoading: boolean
  cep: string
  setCep: (cep: string) => void
  open: () => void
  close: () => void
  toggle: () => void
  addItem: (item: Omit<CartItem, 'qty'>) => void
  removeItem: (id: string | number) => void
  updateQty: (id: string | number, qty: number) => void
  applyCoupon: (code: string) => Promise<void>
  removeCoupon: () => void
  clearCart: () => void
  markCouponUsed: () => void
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
const USED_COUPONS_KEY = 'ben_used_coupons'
const CEP_KEY = 'ben_cart_cep'
const FRETE_GRATIS_MIN = 199.90

/** ── CEP da loja (origem do frete) ── */
const STORE_CEP = '60835225'

/** Fórmula de Haversine — retorna distância em km */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Taxa por km: ≤15km → R$1,00 | 15-20km → R$0,90 | >20km → R$0,80 */
function taxaKm(km: number): number {
  if (km <= 15) return 1.00
  if (km <= 20) return 0.90
  return 0.80
}

/** Busca lat/lon de um CEP na BrasilAPI v2 */
async function getCepCoords(cep: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep.replace(/\D/g, '')}`)
    if (!r.ok) return null
    const d = await r.json()
    const lat = d?.location?.coordinates?.latitude
    const lon = d?.location?.coordinates?.longitude
    if (!lat || !lon) return null
    return { lat: parseFloat(lat), lon: parseFloat(lon) }
  } catch { return null }
}

// Cache das coordenadas da loja
let _storeCoordsCache: { lat: number; lon: number } | null = null
async function getStoreCoords() {
  if (_storeCoordsCache) return _storeCoordsCache
  _storeCoordsCache = await getCepCoords(STORE_CEP)
  return _storeCoordsCache
}

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

function loadUsedCoupons(): string[] {
  try {
    const raw = localStorage.getItem(USED_COUPONS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveUsedCoupon(code: string) {
  const used = loadUsedCoupons()
  if (!used.includes(code)) {
    used.push(code)
    localStorage.setItem(USED_COUPONS_KEY, JSON.stringify(used))
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadItems)
  const [isOpen, setIsOpen] = useState(false)
  const [coupon, setCoupon] = useState<Coupon | null>(loadCoupon)
  const [couponError, setCouponError] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [cep, setCepState] = useState(() => localStorage.getItem(CEP_KEY) || '')
  const [freteValor, setFreteValor] = useState<number | null>(null)
  const [freteLoading, setFreteLoading] = useState(false)

  const setCep = useCallback((v: string) => {
    const clean = v.replace(/\D/g, '').slice(0, 8)
    // formata XXXXX-XXX
    const formatted = clean.length > 5 ? clean.slice(0, 5) + '-' + clean.slice(5) : clean
    setCepState(formatted)
    localStorage.setItem(CEP_KEY, formatted)
  }, [setIsOpen])

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

  /* ── Calcular frete por distância ── */
  useEffect(() => {
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8) { setFreteValor(null); return }
    // já carregado como grátis acima do mínimo
    if (subtotal >= FRETE_GRATIS_MIN) { setFreteValor(0); return }
    let cancelled = false
    setFreteLoading(true)
    ;(async () => {
      try {
        const [store, customer] = await Promise.all([getStoreCoords(), getCepCoords(digits)])
        if (cancelled) return
        if (!store || !customer) { setFreteValor(null); setFreteLoading(false); return }
        const km = haversineKm(store.lat, store.lon, customer.lat, customer.lon)
        const valor = Math.round(km * taxaKm(km) * 100) / 100
        setFreteValor(valor)
      } catch {
        if (!cancelled) setFreteValor(null)
      } finally {
        if (!cancelled) setFreteLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [cep, subtotal])

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
    // Abrir o drawer ao adicionar um item para dar feedback ao usuário
    setIsOpen(true)
  }, [])

  const removeItem = useCallback((id: string | number) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const updateQty = useCallback((id: string | number, qty: number) => {
    if (qty < 1) return removeItem(id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, qty } : i))
  }, [removeItem])

  const applyCoupon = useCallback(async (code: string): Promise<void> => {
    const upper = code.trim().toUpperCase()

    // Buscar cupom de afiliado no Firestore
    setCouponLoading(true)
    try {
      const { getAffiliateByCoupon } = await import('../lib/affiliateService')
      const aff = await getAffiliateByCoupon(upper)
      if (!aff) {
        setCoupon(null)
        setCouponError('Cupom inválido')
        return
      }
      if (aff.status !== 'active') {
        setCoupon(null)
        setCouponError('Este cupom não está ativo no momento')
        return
      }
      setCoupon({
        code: upper,
        percent: aff.couponPercent ?? 5,
        categories: aff.couponCategories?.length ? aff.couponCategories : undefined,
        affiliate: true,
      })
      setCouponError('')
    } catch {
      setCouponError('Erro ao verificar cupom. Tente novamente.')
    } finally {
      setCouponLoading(false)
    }
  }, [])

  const markCouponUsed = useCallback(() => {
    if (coupon) {
      saveUsedCoupon(coupon.code)
    }
  }, [coupon])

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
  const discount = coupon
    ? (coupon.categories && coupon.categories.length > 0)
      // desconto apenas nas categorias configuradas
      ? items.reduce((s, i) => {
          if (coupon.categories!.includes(i.category || '')) return s + i.priceNum * i.qty * (coupon.percent / 100)
          return s
        }, 0)
      : subtotal * (coupon.percent / 100)
    : 0
  const total = subtotal - discount

  const cepDigits = cep.replace(/\D/g, '')
  const cepCompleto = cepDigits.length === 8
  const freteGratis = subtotal >= FRETE_GRATIS_MIN
  const freteStatus: 'gratis' | 'calculado' | 'calculando' | 'pendente' | 'erro' =
    !cepCompleto ? 'pendente' :
    freteGratis ? 'gratis' :
    freteLoading ? 'calculando' :
    freteValor !== null ? 'calculado' : 'erro'

  return (
    <CartContext.Provider value={{
      items, isOpen, coupon, couponError, couponLoading,
      totalItems, subtotal, discount, total, freteGratis, freteStatus, freteValor, freteLoading, cep, setCep,
      open, close, toggle, addItem, removeItem, updateQty,
      applyCoupon, removeCoupon, clearCart, markCouponUsed,
    }}>
      {children}
    </CartContext.Provider>
  )
}
