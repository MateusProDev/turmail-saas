/* NOTE: firestore imports and `db` are loaded dynamically inside functions
   to avoid pulling the entire Firebase client into the initial bundle.
*/

/* ── Tipagem de Variante ── */
export interface ProductVariant {
  type: string     // ex: "Sabor", "Tamanho"
  values: string[] // ex: ["Chocolate", "Baunilha", "Morango"]
}

/* ── Tipagem de Produto ── */
export interface Product {
  id: string
  name: string
  price: number          // valor numérico (ex: 189.90)
  oldPrice?: number      // preço antigo (riscado)
  image: string          // URL da imagem
  tag?: string           // ex: "Mais Vendido", "-25%", "Novo"
  category: string       // ex: "Whey Protein", "Creatina"
  brand?: string         // ex: "MaxTitanium", "IntegralMédica"
  description?: string
  featured?: boolean     // aparece na Home
  active?: boolean       // visível na loja
  wholesalePrice?: number // custo interno (atacado) — NÃO exibido na loja
  repassePrice?: number   // valor de repasse ao afiliado — NÃO exibido na loja
  variants?: ProductVariant[] // variantes de sabor/tamanho
  createdAt?: any
  updatedAt?: any
}

export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>

const COLLECTION = 'store_products'

/* ── Helpers ── */
// helpers removed: use dynamic imports in each function to reduce bundle size

/* Formata preço numérico → "R$ 189,90" */
export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/**
 * Gera URL otimizada para provedores comuns (Cloudinary, Unsplash).
 * - Para Cloudinary injeta `f_auto,q_auto,w_{width}` nas transformations
 * - Para Unsplash adiciona `auto=format&fit=crop&w={width}&q=80`
 */
export function optimizedImage(url: string, width = 720): string {
  if (!url) return url
  try {
    if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
      return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`)
    }
    if (url.includes('images.unsplash.com')) {
      const sep = url.includes('?') ? '&' : '?'
      return `${url}${sep}auto=format&fit=crop&w=${width}&q=80`
    }
    return url
  } catch {
    return url
  }
}

/** Gera um srcset com 3 larguras (360,720,1200) usando optimizedImage */
export function imageSrcSet(url: string): string {
  return `${optimizedImage(url, 360)} 360w, ${optimizedImage(url, 720)} 720w, ${optimizedImage(url, 1200)} 1200w`
}

/* ── CRUD ── */

/** Lista todos os produtos (opcionalmente filtra por ativos) */
export async function listProducts(onlyActive = false): Promise<Product[]> {
  const [{ collection, getDocs, query, where, orderBy }, { db }] = await Promise.all([
    import('firebase/firestore'),
    import('./firebase')
  ])
  let q
  if (onlyActive) {
    q = query(collection(db, COLLECTION), where('active', '==', true), orderBy('createdAt', 'desc'))
  } else {
    q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'))
  }
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product))
}

/** Lista apenas produtos destaque (featured) para a Home */
export async function listFeaturedProducts(): Promise<Product[]> {
  const [{ collection, getDocs, query, where, orderBy }, { db }] = await Promise.all([
    import('firebase/firestore'),
    import('./firebase')
  ])
  const q = query(
    collection(db, COLLECTION),
    where('active', '==', true),
    where('featured', '==', true),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product))
}

/** Busca produto por ID */
export async function getProduct(id: string): Promise<Product | null> {
  const [{ doc, getDoc }, { db }] = await Promise.all([
    import('firebase/firestore'),
    import('./firebase')
  ])
  const snap = await getDoc(doc(db, COLLECTION, id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Product
}

/** Cria novo produto */
export async function createProduct(data: ProductInput): Promise<string> {
  const [{ addDoc, collection, serverTimestamp }, { db }] = await Promise.all([
    import('firebase/firestore'),
    import('./firebase')
  ])
  const docSnap = await addDoc(collection(db, COLLECTION), {
    ...data,
    active: data.active ?? true,
    featured: data.featured ?? false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docSnap.id
}

/** Atualiza produto existente */
export async function updateProduct(id: string, data: Partial<ProductInput>): Promise<void> {
  const [{ updateDoc, doc, serverTimestamp }, { db }] = await Promise.all([
    import('firebase/firestore'),
    import('./firebase')
  ])
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

/** Deleta produto */
export async function deleteProduct(id: string): Promise<void> {
  const [{ deleteDoc, doc }, { db }] = await Promise.all([
    import('firebase/firestore'),
    import('./firebase')
  ])
  await deleteDoc(doc(db, COLLECTION, id))
}

/* ── Depoimentos ── */
export interface Review {
  id?: string
  name: string
  text: string
  stars?: number
  createdAt?: unknown
}

/** Lista depoimentos da coleção store_reviews (fallback: array vazio) */
export async function listReviews(): Promise<Review[]> {
  try {
    const [{ collection, getDocs, query, orderBy, limit }, { db }] = await Promise.all([
      import('firebase/firestore'),
      import('./firebase')
    ])
    const q = query(collection(db, 'store_reviews'), orderBy('createdAt', 'desc'), limit(6))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Review))
  } catch {
    return []
  }
}

/* ── Stats de produto (visualizações + curtidas) ── */
export interface ProductStats {
  views: number
  likes: number
}

/** Busca stats (views/likes) de um produto */
export async function getProductStats(id: string): Promise<ProductStats> {
  try {
    const [{ doc, getDoc }, { db }] = await Promise.all([
      import('firebase/firestore'),
      import('./firebase')
    ])
    const snap = await getDoc(doc(db, 'product_stats', id))
    if (!snap.exists()) return { views: 0, likes: 0 }
    const d = snap.data()
    return { views: d.views ?? 0, likes: d.likes ?? 0 }
  } catch { return { views: 0, likes: 0 } }
}

/** Incrementa views atomicamente (público, sem login) */
export async function incrementProductView(id: string): Promise<void> {
  try {
    const [{ doc, setDoc, increment }, { db }] = await Promise.all([
      import('firebase/firestore'),
      import('./firebase')
    ])
    await setDoc(doc(db, 'product_stats', id), { views: increment(1) }, { merge: true })
  } catch { /* silent */ }
}

/** Alterna curtida atomicamente (liked=true incrementa, false decrementa) */
export async function toggleProductLike(id: string, liked: boolean): Promise<void> {
  try {
    const [{ doc, setDoc, increment }, { db }] = await Promise.all([
      import('firebase/firestore'),
      import('./firebase')
    ])
    await setDoc(doc(db, 'product_stats', id), { likes: increment(liked ? 1 : -1) }, { merge: true })
  } catch { /* silent */ }
}

/* ── Brand Images ── */
const BRAND_IMAGES_COLLECTION = 'store_brand_images'

/** Lista todas as imagens de marcas: { brandName: imageUrl } */
export async function listBrandImages(): Promise<Record<string, string>> {
  try {
    const [{ collection, getDocs }, { db }] = await Promise.all([
      import('firebase/firestore'),
      import('./firebase')
    ])
    const snap = await getDocs(collection(db, BRAND_IMAGES_COLLECTION))
    const map: Record<string, string> = {}
    snap.docs.forEach(d => { map[d.id] = (d.data() as any).image || '' })
    return map
  } catch { return {} }
}

/** Salva/atualiza a imagem (logo) de uma marca */
export async function saveBrandImage(name: string, image: string): Promise<void> {
  const [{ doc, setDoc }, { db }] = await Promise.all([
    import('firebase/firestore'),
    import('./firebase')
  ])
  await setDoc(doc(db, BRAND_IMAGES_COLLECTION, name), { image })
}
