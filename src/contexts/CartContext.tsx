import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

export interface CartItem {
  id: string | number         // chave única do slot (pode ser composta com variantes)
  productId?: string | number // ID original do produto
  name: string
  price: string       // "R$ 189,90"
  priceNum: number    // 189.90
  image: string
  qty: number
  category?: string   // ex: "Pré-Treino", "Whey Protein"
  selectedVariants?: Record<string, string> // ex: { "Sabor": "Chocolate", "Tamanho": "900g" }
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
export const FRETE_GRATIS_MIN = 199.90

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

/**
 * Coordenadas aproximadas das principais cidades brasileiras.
 * Usadas como fallback quando a API não retorna coordenadas exatas.
 */
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  // Ceará
  'fortaleza':      { lat: -3.7172,  lon: -38.5433 },
  'caucaia':        { lat: -3.7348,  lon: -38.6587 },
  'maracanau':      { lat: -3.7772,  lon: -38.6258 },
  'maracanaú':      { lat: -3.7772,  lon: -38.6258 },
  'eusebio':        { lat: -3.8850,  lon: -38.4523 },
  'eusébio':        { lat: -3.8850,  lon: -38.4523 },
  'horizonte':      { lat: -4.0953,  lon: -38.4849 },
  'aquiraz':        { lat: -3.9007,  lon: -38.3932 },
  'pacatuba':       { lat: -3.9729,  lon: -38.6161 },
  'maranguape':     { lat: -3.8886,  lon: -38.6882 },
  'itaitinga':      { lat: -3.9647,  lon: -38.5305 },
  'guaiuba':        { lat: -4.0384,  lon: -38.6450 },
  'sobral':         { lat: -3.6861,  lon: -40.3492 },
  'juazeiro do norte': { lat: -7.2130, lon: -39.3150 },
  'crato':          { lat: -7.2341,  lon: -39.4095 },
  'iguatu':         { lat: -6.3597,  lon: -39.2982 },
  // SP / RJ / demais
  'sao paulo':      { lat: -23.5505, lon: -46.6333 },
  'são paulo':      { lat: -23.5505, lon: -46.6333 },
  'rio de janeiro': { lat: -22.9068, lon: -43.1729 },
  'brasilia':       { lat: -15.7801, lon: -47.9292 },
  'brasília':       { lat: -15.7801, lon: -47.9292 },
  'belo horizonte': { lat: -19.9167, lon: -43.9345 },
  'salvador':       { lat: -12.9714, lon: -38.5014 },
  'recife':         { lat: -8.0539,  lon: -34.8811 },
  'natal':          { lat: -5.7945,  lon: -35.2110 },
  'joao pessoa':    { lat: -7.1153,  lon: -34.8641 },
  'joão pessoa':    { lat: -7.1153,  lon: -34.8641 },
  'maceio':         { lat: -9.6658,  lon: -35.7353 },
  'maceió':         { lat: -9.6658,  lon: -35.7353 },
  'teresina':       { lat: -5.0892,  lon: -42.8019 },
  'manaus':         { lat: -3.1190,  lon: -60.0217 },
  'belem':          { lat: -1.4558,  lon: -48.5044 },
  'belém':          { lat: -1.4558,  lon: -48.5044 },
  'curitiba':       { lat: -25.4284, lon: -49.2733 },
  'porto alegre':   { lat: -30.0346, lon: -51.2177 },
  'goiania':        { lat: -16.6869, lon: -49.2648 },
  'goiânia':        { lat: -16.6869, lon: -49.2648 },
}

/** Normaliza cidade para lookup na tabela */
function normCity(city: string): string {
  return city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

/**
 * Mapa de prefixo CEP (5 dígitos) → coordenadas aproximadas do bairro.
 * Cobre todos os bairros de Fortaleza e municípios da Grande Fortaleza.
 * Consultado IMEDIATAMENTE, sem chamada de API.
 */
const CEP_PREFIX_COORDS: Record<string, { lat: number; lon: number }> = {
  // ── CENTRO ──────────────────────────────────────────────────────────────
  '60010': { lat: -3.7271, lon: -38.5314 }, // Centro
  '60015': { lat: -3.7290, lon: -38.5360 }, // Centro
  '60020': { lat: -3.7265, lon: -38.5288 }, // Centro
  '60025': { lat: -3.7307, lon: -38.5307 }, // Centro
  '60030': { lat: -3.7281, lon: -38.5256 }, // Centro
  '60035': { lat: -3.7321, lon: -38.5273 }, // Praia de Iracema / Centro
  '60040': { lat: -3.7197, lon: -38.5189 }, // Praia de Iracema
  '60050': { lat: -3.7279, lon: -38.5189 }, // Moreira / Centro
  '60055': { lat: -3.7237, lon: -38.5161 }, // Praia de Iracema
  '60060': { lat: -3.7197, lon: -38.5189 }, // Praia de Iracema
  '60070': { lat: -3.7338, lon: -38.5133 }, // Cais do Porto
  '60075': { lat: -3.7350, lon: -38.5100 }, // Moura Brasil
  '60080': { lat: -3.7289, lon: -38.5099 }, // Farias Brito
  '60085': { lat: -3.7313, lon: -38.5210 }, // São João do Tauape
  '60090': { lat: -3.7356, lon: -38.5403 }, // José Bonifácio

  // ── ZONA LESTE / ALDEOTA / MEIRELES ─────────────────────────────────────
  '60110': { lat: -3.7447, lon: -38.5592 }, // Benfica
  '60115': { lat: -3.7521, lon: -38.5564 }, // Benfica
  '60120': { lat: -3.7539, lon: -38.5444 }, // Fátima
  '60125': { lat: -3.7574, lon: -38.5508 }, // Fátima
  '60130': { lat: -3.7461, lon: -38.5221 }, // Dionísio Torres
  '60135': { lat: -3.7489, lon: -38.5189 }, // Dionísio Torres
  '60140': { lat: -3.7397, lon: -38.5047 }, // Aldeota
  '60145': { lat: -3.7421, lon: -38.5087 }, // Aldeota
  '60150': { lat: -3.7378, lon: -38.5009 }, // Aldeota
  '60155': { lat: -3.7356, lon: -38.4977 }, // Aldeota
  '60160': { lat: -3.7231, lon: -38.5072 }, // Meireles
  '60165': { lat: -3.7252, lon: -38.5044 }, // Meireles
  '60170': { lat: -3.7178, lon: -38.5022 }, // Meireles / Varjota
  '60175': { lat: -3.7267, lon: -38.5003 }, // Varjota / Papicu
  '60177': { lat: -3.7281, lon: -38.4953 }, // Papicu
  '60180': { lat: -3.7136, lon: -38.4794 }, // Mucuripe
  '60182': { lat: -3.7097, lon: -38.4769 }, // Mucuripe / Cais do Porto
  '60185': { lat: -3.7189, lon: -38.5003 }, // Varjota
  '60190': { lat: -3.7481, lon: -38.4839 }, // Cocó
  '60192': { lat: -3.7503, lon: -38.4811 }, // Cocó

  // ── JOAQUIM TÁVORA / FÁTIMA / RAMOS ─────────────────────────────────────
  '60200': { lat: -3.7563, lon: -38.5267 }, // Joaquim Távora
  '60210': { lat: -3.7597, lon: -38.5311 }, // Joaquim Távora
  '60215': { lat: -3.7621, lon: -38.5350 }, // São Gerardo
  '60220': { lat: -3.7650, lon: -38.5389 }, // Rodolfo Teófilo
  '60430': { lat: -3.7627, lon: -38.5533 }, // Damas
  '60425': { lat: -3.7589, lon: -38.5478 }, // Damas / Parangaba

  // ── PARANGABA / MONTESE / ITAPERI ───────────────────────────────────────
  '60720': { lat: -3.7969, lon: -38.5744 }, // Parangaba
  '60721': { lat: -3.7947, lon: -38.5711 }, // Parangaba
  '60722': { lat: -3.7983, lon: -38.5711 }, // Parangaba
  '60310': { lat: -3.7553, lon: -38.5731 }, // Montese
  '60315': { lat: -3.7578, lon: -38.5764 }, // Montese
  '60320': { lat: -3.7619, lon: -38.5803 }, // Itaperi
  '60325': { lat: -3.7647, lon: -38.5842 }, // Itaperi

  // ── ZONA NORTE – BARRA DO CEARÁ / QUINTINO / CARLITO PAMPLONA ───────────
  '60330': { lat: -3.7269, lon: -38.5797 }, // Carlito Pamplona
  '60335': { lat: -3.7241, lon: -38.5836 }, // Carlito Pamplona / Pirambu
  '60340': { lat: -3.7197, lon: -38.5889 }, // Pirambu
  '60345': { lat: -3.7097, lon: -38.5908 }, // Barra do Ceará
  '60347': { lat: -3.7054, lon: -38.5940 }, // Barra do Ceará
  '60350': { lat: -3.7321, lon: -38.5942 }, // Quintino Cunha
  '60355': { lat: -3.7364, lon: -38.5978 }, // Quintino Cunha
  '60360': { lat: -3.7408, lon: -38.6022 }, // Presidente Kennedy

  // ── ZONA OESTE – ANTONIO BEZERRA / JOÃO XXIII ───────────────────────────
  '60400': { lat: -3.7797, lon: -38.5817 }, // Antônio Bezerra
  '60410': { lat: -3.7714, lon: -38.5936 }, // Vila Velha / Pici
  '60415': { lat: -3.7742, lon: -38.5964 }, // Pici
  '60420': { lat: -3.7667, lon: -38.5956 }, // Pici
  '60440': { lat: -3.7753, lon: -38.6061 }, // Antônio Bezerra
  '60450': { lat: -3.7694, lon: -38.6100 }, // Antônio Bezerra
  '60452': { lat: -3.7641, lon: -38.6044 }, // Antônio Bezerra
  '60460': { lat: -3.7894, lon: -38.6150 }, // João XXIII
  '60463': { lat: -3.7853, lon: -38.6183 }, // João XXIII / Siqueira
  '60465': { lat: -3.7922, lon: -38.6219 }, // Siqueira
  '60467': { lat: -3.7953, lon: -38.6258 }, // Siqueira

  // ── CONJUNTO CEARÁ / BONSUCESSO ──────────────────────────────────────────
  '60510': { lat: -3.8164, lon: -38.6058 }, // Conjunto Ceará I
  '60520': { lat: -3.8200, lon: -38.6083 }, // Conjunto Ceará II
  '60530': { lat: -3.8147, lon: -38.6119 }, // Conjunto Ceará / Bonsucesso
  '60533': { lat: -3.8183, lon: -38.6158 }, // Bonsucesso
  '60535': { lat: -3.8214, lon: -38.6186 }, // Bonsucesso

  // ── BOM JARDIM / GRANJA LISBOA / GRANJA PORTUGAL ────────────────────────
  '60540': { lat: -3.8053, lon: -38.6306 }, // Bom Jardim
  '60541': { lat: -3.8120, lon: -38.6470 }, // Granja Lisboa
  '60542': { lat: -3.8164, lon: -38.6508 }, // Granja Lisboa
  '60543': { lat: -3.8064, lon: -38.6511 }, // Granja Portugal
  '60544': { lat: -3.8086, lon: -38.6358 }, // Bom Jardim
  '60545': { lat: -3.8324, lon: -38.6417 }, // Canindezinho
  '60546': { lat: -3.8372, lon: -38.6453 }, // Canindezinho

  // ── MARAPONGA / JARDIM DAS OLIVEIRAS ────────────────────────────────────
  '60710': { lat: -3.8022, lon: -38.5817 }, // Maraponga
  '60711': { lat: -3.8047, lon: -38.5842 }, // Maraponga
  '60715': { lat: -3.8064, lon: -38.5869 }, // Jardim Cearense
  '60716': { lat: -3.8086, lon: -38.5831 }, // Jardim das Oliveiras
  '60718': { lat: -3.7983, lon: -38.5783 }, // Maraponga

  // ── MONDUBIM / ARACAPÉ ───────────────────────────────────────────────────
  '60760': { lat: -3.8214, lon: -38.5942 }, // Mondubim
  '60764': { lat: -3.8286, lon: -38.5967 }, // Mondubim
  '60766': { lat: -3.8319, lon: -38.5992 }, // Mondubim
  '60768': { lat: -3.8353, lon: -38.6019 }, // Aracapé

  // ── PASSARÉ / PREFEITO JOSÉ WALTER / SÃO BENTO ─────────────────────────
  '60740': { lat: -3.8353, lon: -38.5417 }, // Passaré
  '60743': { lat: -3.8386, lon: -38.5453 }, // Passaré
  '60745': { lat: -3.8422, lon: -38.5489 }, // Parque Dois Irmãos
  '60750': { lat: -3.8317, lon: -38.5536 }, // Prefeito José Walter
  '60751': { lat: -3.8353, lon: -38.5567 }, // Prefeito José Walter
  '60755': { lat: -3.8389, lon: -38.5603 }, // Prefeito José Walter
  '60758': { lat: -3.8422, lon: -38.5644 }, // São Bento

  // ── EDSON QUEIROZ / CURIÓ / ANEL VIÁRIO ─────────────────────────────────
  '60810': { lat: -3.7936, lon: -38.4808 }, // Lagoa Redonda (norte)
  '60820': { lat: -3.8061, lon: -38.4847 }, // Edson Queiroz
  '60821': { lat: -3.8092, lon: -38.4817 }, // Edson Queiroz
  '60822': { lat: -3.8119, lon: -38.4789 }, // Curió
  '60823': { lat: -3.8147, lon: -38.4769 }, // Curió
  '60824': { lat: -3.8175, lon: -38.4742 }, // Aerolândia
  '60826': { lat: -3.8200, lon: -38.4719 }, // Aerolândia

  // ── SAPIRANGA / COITÉ ────────────────────────────────────────────────────
  '60830': { lat: -3.8011, lon: -38.4564 }, // Sapiranga / Coité
  '60833': { lat: -3.8047, lon: -38.4594 }, // Sapiranga
  '60835': { lat: -3.8083, lon: -38.4617 }, // Sapiranga
  '60836': { lat: -3.8119, lon: -38.4644 }, // Lagoa Redonda
  '60838': { lat: -3.8158, lon: -38.4669 }, // Lagoa Redonda

  // ── MESSEJANA / CAJAZEIRAS / GUAJERÚ ────────────────────────────────────
  '60840': { lat: -3.8369, lon: -38.4964 }, // Messejana
  '60841': { lat: -3.8397, lon: -38.4992 }, // Messejana
  '60844': { lat: -3.8431, lon: -38.5014 }, // Messejana
  '60846': { lat: -3.8463, lon: -38.5036 }, // Guajerú
  '60850': { lat: -3.8500, lon: -38.5061 }, // Cajazeiras I
  '60854': { lat: -3.8528, lon: -38.5089 }, // Cajazeiras II
  '60856': { lat: -3.8556, lon: -38.5117 }, // Cajazeiras III
  '60858': { lat: -3.8583, lon: -38.5144 }, // Cajazeiras IV
  '60860': { lat: -3.8611, lon: -38.5172 }, // Cajazeiras V
  '60861': { lat: -3.8639, lon: -38.5200 }, // Cajazeiras VI
  '60862': { lat: -3.8667, lon: -38.5228 }, // Cajazeiras VII
  '60863': { lat: -3.8694, lon: -38.5256 }, // Cajazeiras VIII
  '60864': { lat: -3.8722, lon: -38.5283 }, // Cajazeiras IX
  '60865': { lat: -3.8750, lon: -38.5311 }, // Cajazeiras X / XI

  // ── CIDADE DOS FUNCIONÁRIOS / SÃO CRISTÓVÃO ─────────────────────────────
  '60801': { lat: -3.7908, lon: -38.5058 }, // Cidade dos Funcionários
  '60802': { lat: -3.7942, lon: -38.5086 }, // Cidade dos Funcionários
  '60803': { lat: -3.7975, lon: -38.5114 }, // Parque Manibura
  '60870': { lat: -3.8314, lon: -38.5228 }, // São Cristóvão
  '60871': { lat: -3.8344, lon: -38.5200 }, // São Cristóvão / Barroso
  '60873': { lat: -3.8603, lon: -38.4908 }, // Paupina
  '60875': { lat: -3.8639, lon: -38.4936 }, // Paupina

  // ── CAUCAIA (Grande Fortaleza) ───────────────────────────────────────────
  '61600': { lat: -3.7253, lon: -38.6592 }, // Caucaia centro
  '61605': { lat: -3.7289, lon: -38.6628 }, // Caucaia
  '61611': { lat: -3.7033, lon: -38.6769 }, // Jurema / Araturi
  '61619': { lat: -3.6814, lon: -38.6950 }, // Caucaia litoral
  '61620': { lat: -3.7514, lon: -38.6564 }, // Antônio Justa
  '61625': { lat: -3.7889, lon: -38.6806 }, // Caucaia sul
  '61635': { lat: -3.8114, lon: -38.7003 }, // Parque Albano / Planalto Caucaia

  // ── MARACANAÚ (Grande Fortaleza) ─────────────────────────────────────────
  '61900': { lat: -3.7847, lon: -38.6267 }, // Maracanaú centro
  '61905': { lat: -3.7919, lon: -38.6311 }, // Maracanaú
  '61910': { lat: -3.7969, lon: -38.6353 }, // Maracanaú
  '61915': { lat: -3.8042, lon: -38.6425 }, // Maracanaú sul
  '61919': { lat: -3.7694, lon: -38.6183 }, // Maracanaú norte

  // ── EUSÉBIO (Grande Fortaleza) ───────────────────────────────────────────
  '61760': { lat: -3.8850, lon: -38.4523 }, // Eusébio
  '61773': { lat: -3.8783, lon: -38.4486 }, // Eusébio litoral
  '61775': { lat: -3.8817, lon: -38.4508 }, // Eusébio

  // ── HORIZONTE / PACAJUS ──────────────────────────────────────────────────
  '62880': { lat: -4.0953, lon: -38.4849 }, // Horizonte
  '62870': { lat: -4.1539, lon: -38.4594 }, // Pacajus
}

/**
 * Retorna coordenadas a partir do prefixo de 5 dígitos do CEP.
 * Tenta primeiro o match exato, depois os prefixos menores (4, 3 dígitos).
 */
function coordsByPrefix(digits: string): { lat: number; lon: number } | null {
  // Match exato de 5 dígitos
  const k5 = digits.slice(0, 5)
  if (CEP_PREFIX_COORDS[k5]) return CEP_PREFIX_COORDS[k5]
  // Busca pelo prefixo de 4 dígitos (vizinhos)
  const k4 = digits.slice(0, 4)
  const match4 = Object.entries(CEP_PREFIX_COORDS).find(([k]) => k.startsWith(k4))
  if (match4) return match4[1]
  return null
}

/** Busca lat/lon de um CEP:
 *  0) Lookup imediato por prefixo de CEP (bairros de Fortaleza e Grande Fortaleza)
 *  1) BrasilAPI v2 com coordenadas exatas
 *  2) Fallback: ViaCEP → lookup por cidade na tabela acima
 */
async function getCepCoords(cep: string): Promise<{ lat: number; lon: number } | null> {
  const digits = cep.replace(/\D/g, '')

  // 0) Lookup instantâneo por prefixo — sem chamada de API
  const fromPrefix = coordsByPrefix(digits)
  if (fromPrefix) return fromPrefix

  try {
    // 1) BrasilAPI v2 (retorna coordenadas quando disponível)
    const r = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`)
    if (r.ok) {
      const d = await r.json()
      const lat = d?.location?.coordinates?.latitude
      const lon = d?.location?.coordinates?.longitude
      if (lat && lon) return { lat: parseFloat(lat), lon: parseFloat(lon) }

      // BrasilAPI sem coordenadas → usa cidade
      const city = d?.city || ''
      const key = normCity(city)
      if (CITY_COORDS[key]) return CITY_COORDS[key]
    }
  } catch { /* ignora, tenta ViaCEP */ }

  try {
    // 2) ViaCEP (fallback confiável para cidade/estado)
    const r2 = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
    if (r2.ok) {
      const d2 = await r2.json()
      if (d2.erro) return null
      const city = d2?.localidade || ''
      const key = normCity(city)
      if (CITY_COORDS[key]) return CITY_COORDS[key]

      // Cidade não está na tabela — usa UF para estimar
      const uf = (d2?.uf || '').toUpperCase()
      if (uf === 'CE') {
        // Interior do Ceará: distância estimada ~150km da capital
        return { lat: -5.5, lon: -39.3 }
      }
    }
  } catch { /* ignora */ }

  return null
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

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen(v => !v), [])

  const addItem = useCallback((item: Omit<CartItem, 'qty'>) => {
    const priceNum = item.priceNum || parsePrice(item.price)
    // Gera chave única considerando variantes selecionadas
    const variantStr = item.selectedVariants && Object.keys(item.selectedVariants).length > 0
      ? '|' + Object.entries(item.selectedVariants).sort().map(([k, v]) => `${k}=${v}`).join('|')
      : ''
    const slotId = variantStr ? `${item.id}${variantStr}` : item.id
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === slotId)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 }
        return next
      }
      return [...prev, {
        ...item,
        id: slotId,
        productId: item.productId ?? item.id,
        priceNum,
        qty: 1,
      }]
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

  /* ── Calcular frete por distância (depende de subtotal) ── */
  useEffect(() => {
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8) { setFreteValor(null); return }
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
