/**
 * affiliateService.ts
 * Gerenciamento de afiliados e rastreamento de pedidos via cupom.
 */

import { auth, db } from './firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import {
  collection,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore'

/* ── Tipos ── */

export interface Affiliate {
  uid: string
  name: string
  email: string
  phone: string
  instagram?: string
  coupon: string            // código do cupom associado (ex: "GUGU5")
  couponPercent: number     // % de desconto (ex: 5)
  couponCategories: string[] // categorias onde aplica; vazio = todas
  status: 'pending' | 'active' | 'suspended'
  createdAt?: any
}

export interface AffiliateOrder {
  id?: string
  couponCode: string
  affiliateId: string
  affiliateName?: string
  items: { name: string; qty: number; price: string }[]
  subtotal: number
  discount: number
  total: number
  status: 'pending' | 'confirmed'
  cep?: string
  createdAt?: any
}

/* ── Registro de novo afiliado ── */

export async function registerAffiliate(data: {
  name: string
  email: string
  password: string
  phone: string
  instagram?: string
  coupon: string
}): Promise<Affiliate> {
  const { name, email, password, phone, instagram, coupon } = data
  const couponUpper = coupon.trim().toUpperCase()

  // Verificar se o cupom já está em uso
  const q = query(collection(db, 'affiliates'), where('coupon', '==', couponUpper))
  const existing = await getDocs(q)
  if (!existing.empty) {
    throw new Error('Este cupom já está em uso por outro afiliado.')
  }

  const cred = await createUserWithEmailAndPassword(auth, email, password)
  const uid = cred.user.uid

  const affiliate: Affiliate = {
    uid,
    name,
    email,
    phone,
    instagram: instagram || '',
    coupon: couponUpper,
    couponPercent: 5,
    couponCategories: [],
    status: 'active',
    createdAt: serverTimestamp(),
  }

  await setDoc(doc(db, 'affiliates', uid), affiliate)
  return affiliate
}

/* ── Login de afiliado ── */

export async function loginAffiliate(email: string, password: string): Promise<Affiliate> {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  const snap = await getDoc(doc(db, 'affiliates', cred.user.uid))
  if (!snap.exists()) {
    await signOut(auth)
    throw new Error('Conta não encontrada como afiliado. Verifique seu e-mail.')
  }
  return snap.data() as Affiliate
}

/* ── Logout ── */

export function logoutAffiliate() {
  return signOut(auth)
}

/* ── Buscar dados do afiliado por UID ── */

export async function getAffiliate(uid: string): Promise<Affiliate | null> {
  const snap = await getDoc(doc(db, 'affiliates', uid))
  return snap.exists() ? (snap.data() as Affiliate) : null
}

/* ── Buscar afiliado pelo código do cupom ── */

export async function getAffiliateByCoupon(coupon: string): Promise<Affiliate | null> {
  const q = query(
    collection(db, 'affiliates'),
    where('coupon', '==', coupon.trim().toUpperCase())
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  return snap.docs[0].data() as Affiliate
}

/* ── Salvar pedido de afiliado (disparado no checkout do carrinho) ── */

export async function saveAffiliateOrder(order: Omit<AffiliateOrder, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'affiliate_orders'), {
    ...order,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

/* ── Listar pedidos de um cupom específico ── */

export async function getOrdersByCoupon(couponCode: string): Promise<AffiliateOrder[]> {
  const q = query(
    collection(db, 'affiliate_orders'),
    where('couponCode', '==', couponCode.toUpperCase()),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AffiliateOrder))
}

/* ── Admin: listar todos os pedidos de afiliados ── */

export async function getAllAffiliateOrders(): Promise<AffiliateOrder[]> {
  const snap = await getDocs(
    query(collection(db, 'affiliate_orders'), orderBy('createdAt', 'desc'))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AffiliateOrder))
}

/* ── Admin: listar todos os afiliados ── */

export async function getAllAffiliates(): Promise<Affiliate[]> {
  const snap = await getDocs(collection(db, 'affiliates'))
  return snap.docs.map(d => d.data() as Affiliate)
}

/* ── Admin: confirmar um pedido como venda fechada ── */

export async function confirmOrder(orderId: string): Promise<void> {
  await updateDoc(doc(db, 'affiliate_orders', orderId), { status: 'confirmed' })
}

/* ── Admin: atualizar status do afiliado ── */

export async function updateAffiliateStatus(
  uid: string,
  status: 'pending' | 'active' | 'suspended'
): Promise<void> {
  await updateDoc(doc(db, 'affiliates', uid), { status })
}

/* ── Admin: atualizar configuração do cupom do afiliado ── */

export async function updateAffiliateCouponConfig(
  uid: string,
  couponPercent: number,
  couponCategories: string[]
): Promise<void> {
  await updateDoc(doc(db, 'affiliates', uid), { couponPercent, couponCategories })
}
