import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'

/* ── Tipagem de Produto ── */
export interface Product {
  id: string
  name: string
  price: number          // valor numérico (ex: 189.90)
  oldPrice?: number      // preço antigo (riscado)
  image: string          // URL da imagem
  tag?: string           // ex: "Mais Vendido", "-25%", "Novo"
  category: string       // ex: "Whey Protein", "Creatina"
  description?: string
  featured?: boolean     // aparece na Home
  active?: boolean       // visível na loja
  createdAt?: any
  updatedAt?: any
}

export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>

const COLLECTION = 'store_products'

/* ── Helpers ── */
const colRef = () => collection(db, COLLECTION)
const docRef = (id: string) => doc(db, COLLECTION, id)

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
  let q
  if (onlyActive) {
    q = query(colRef(), where('active', '==', true), orderBy('createdAt', 'desc'))
  } else {
    q = query(colRef(), orderBy('createdAt', 'desc'))
  }
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product))
}

/** Lista apenas produtos destaque (featured) para a Home */
export async function listFeaturedProducts(): Promise<Product[]> {
  const q = query(
    colRef(),
    where('active', '==', true),
    where('featured', '==', true),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product))
}

/** Busca produto por ID */
export async function getProduct(id: string): Promise<Product | null> {
  const snap = await getDoc(docRef(id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Product
}

/** Cria novo produto */
export async function createProduct(data: ProductInput): Promise<string> {
  const docSnap = await addDoc(colRef(), {
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
  await updateDoc(docRef(id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

/** Deleta produto */
export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(docRef(id))
}
