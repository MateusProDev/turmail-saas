export type CopyOptions = {
  company?: string
  product?: string
  tone?: 'friendly' | 'formal' | 'urgent' | 'casual'
  namePlaceholder?: string
  vertical?: 'general' | 'tourism' | 'cooperative' | 'taxi'
  destination?: string
  dateRange?: string
  ctaLink?: string
  description?: string
  // previousExperience indicates this is a returning customer and optional last trip name/date
  previousExperience?: { trip?: string, date?: string }
  // optional user-saved patterns loaded from Firestore
  userPatterns?: string[]
}

function pick<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)] }

function bullets(items: string[]) {
  return `<ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`
}

function mainTitleOrFallback(opts: any) {
  if (opts && opts.mainTitle) return opts.mainTitle
  if (opts && opts.product) return `Conheça ${opts.product}`
  return 'Temos novidades para você'
}

function pickBenefits(opts: CopyOptions) {
  const vert = opts.vertical || 'general'
  const bank: Record<string, string[]> = {
    tourism: [
      `Roteiros personalizados para grupos e famílias`,
      `Guias locais com conhecimento do destino`,
      `Datas flexíveis e descontos para reservas antecipadas`,
      `Atendimento 24/7 durante a viagem`
    ],
    cooperative: [
      `Gerenciamento centralizado de reservas`,
      `Relatórios para otimizar oferta e demanda`,
      `Benefícios exclusivos para cooperados`,
      `Suporte para aumentar vendas locais`
    ],
    taxi: [
      `Dicas para encontrar passageiros nos horários de pico`,
      `Otimização de rota para reduzir tempo ocioso`,
      `Parcerias locais e promoções para aumentar corridas`,
      `Técnicas para melhorar avaliação de passageiros`
    ],
    general: [
      `Soluções simples e fáceis de aplicar`,
      `Suporte dedicado para orientar seus próximos passos`,
      `Melhore resultados com práticas testadas`,
      `Benefícios exclusivos para clientes`
    ]
  }
  const arr = bank[vert] || bank.general
  const shuffled = arr.slice().sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3)
}

function composeCopy(opts: CopyOptions & { mainTitle?: string }) {
  const company = opts.company || opts.namePlaceholder || 'sua empresa'
  const tone = opts.tone || 'friendly'
  const name = opts.namePlaceholder || '{{name}}'
  const dest = opts.destination || ''

  const openings: Record<string, string[]> = {
    friendly: [
      `Olá ${name},`,
      `Oi ${name}!`,
      `Boas notícias, ${name}:`,
      `Olá — temos novidades para quem gosta de viajar, ${name}.`,
      `Saudações ${name},`
    ],
    formal: [
      `Olá ${name},`,
      `Prezado(a) ${name},`,
      `Caro(a) ${name},`
    ],
    urgent: [
      `Atenção ${name}, vagas acabando!`,
      `Última chamada para ${dest || 'reservas'} — ${name}`,
      `Promoção urgente para ${dest || 'reservas'} — não perca!`
    ],
    casual: [
      `Ei ${name}, bora?`,
      `Que tal uma escapada, ${name}?`,
      `Partiu viagem, ${name}?`
    ]
  }

  const introsByVertical: Record<string, string[]> = {
    tourism: [
      `Preparamos experiências em ${dest || 'vários destinos'} com guias locais e roteiros personalizados.`,
      `Roteiros pensados para quem quer viver o melhor de ${dest || 'uma região'}.`,
      `Seleções de passeios especialmente montadas para ${dest || 'sua próxima viagem'}.`,
      `Opções com foco em cultura, gastronomia e aventura em ${dest || 'o destino'}.`
    ],
    cooperative: [
      `Soluções para cooperativas aumentarem reservas e organizarem melhor a operação.`,
      `Ajudamos cooperativas a melhorar vendas e fidelização com ferramentas práticas.`,
      `Ferramentas para simplificar gestão e comunicação entre cooperados.`
    ],
    taxi: [
      `Dicas práticas para motoristas aumentarem corrida e ganhar mais por dia.`,
      `Ferramentas e parcerias locais para otimizar sua operação como motorista.`,
      `Táticas para reduzir tempo ocioso e aumentar corridas em horários chave.`
    ],
    general: [
      `Temos novidades que podem interessar a você.`,
      `Confira opções criadas para tornar sua experiência melhor.`,
      `Soluções pensadas para melhorar sua rotina e resultados.`
    ]
  }

  // subject bank — separate from greeting/opening to avoid repeating the same phrase
  const subjectBank: Record<string, string[]> = {
    friendly: [
      `${company} tem novas experiências para você`,
      `Novidades e pacotes em ${dest || 'vários destinos'}`,
      `Ofertas especiais de ${company} para sua próxima viagem`
    ],
    formal: [
      `${company}: informações sobre novos roteiros`,
      `Oportunidades de reserva para ${dest || 'seu destino'}`
    ],
    urgent: [
      `Vagas limitadas para ${dest || 'reservas'} — garanta já`,
      `Promoção relâmpago em pacotes para ${dest || 'o destino'}`
    ],
    casual: [
      `Novos rolês em ${dest || 'sua cidade'} — confira`,
      `Passeios e experiências que você vai curtir em ${dest || 'perto'}`
    ]
  }

  // helper: pick an item that is not equal to any in avoid (fallbacks to pick)
  function uniquePick(arr: string[], avoid: Set<string>) {
    const candidates = arr.filter(a => !avoid.has(a))
    return candidates.length ? pick(candidates) : pick(arr)
  }

  const subject = `${uniquePick(subjectBank[tone] || subjectBank.friendly, new Set())}`.replace(/\s+/g, ' ').trim()

  // pick opening and preheader ensuring they don't repeat the subject or each other
  const opening = uniquePick(openings[tone] || openings.friendly, new Set([subject]))
  const preheader = uniquePick(introsByVertical[opts.vertical || 'general'] || introsByVertical.general, new Set([subject, opening])).replace(/\s+/g, ' ')

  const top = `<h2>${mainTitleOrFallback(opts)}</h2><p>${opening} ${uniquePick(introsByVertical[opts.vertical || 'general'] || introsByVertical.general, new Set([subject, opening]))}</p>`
  // inject description or previous experience tailored line when provided
  const benefits = pickBenefits(opts)
  if (opts.description) {
    // add a custom descriptive sentence into the benefits list if present (keeps it specific)
    benefits.unshift(opts.description)
  }
  if (opts.previousExperience && opts.previousExperience.trip) {
    benefits.unshift(`Como você já viajou conosco em ${opts.previousExperience.trip}, selecionamos opções que complementam sua experiência anterior.`)
  }
  // if user-saved patterns exist, include one random pattern to make the tone/profile consistent
  if (opts.userPatterns && opts.userPatterns.length > 0) {
    const p = pick(opts.userPatterns)
    if (p && !benefits.includes(p)) benefits.splice(1, 0, p)
  }
  const mid = bullets(benefits)
  const ctaTexts: Record<string, string> = { friendly: 'Saiba mais', formal: 'Saiba mais', urgent: 'Reserve agora', casual: 'Ver opções' }
  const ctaLabel = opts.ctaLink ? (ctaTexts[tone] || 'Saiba mais') : (ctaTexts[tone] || 'Saiba mais')
  const ctaHref = opts.ctaLink || '#'
  const ctaColor = tone === 'urgent' ? '#e11d48' : tone === 'casual' ? '#059669' : '#4f46e5'
  const unsubscribe = `<p style="font-size:11px;color:#9ca3af;margin-top:10px">Se você não deseja receber estes e-mails, ignore esta mensagem.</p>`
  const bottom = `<p style="margin-top:10px;text-align:center"><a href="${ctaHref}" style="background:${ctaColor};color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;">${ctaLabel}</a></p><p style="color:#6b7280;font-size:12px;margin-top:12px;">Enviado por ${company}</p>${unsubscribe}`

  const html = `<div style="font-family: Arial, Helvetica, sans-serif; font-size:16px;color:#111;">${top}${mid}${bottom}</div>`

  return { subject, preheader, html }
}

export async function generateCopy(opts: CopyOptions & { mainTitle?: string }) {
  const delay = 400 + Math.floor(Math.random() * 900)
  await new Promise(r => setTimeout(r, delay))
  return composeCopy(opts)
}

export async function generateVariants(opts: CopyOptions & { mainTitle?: string }, count = 3) {
  const results: Array<{subject:string, preheader:string, html:string}> = []
  const seen = new Set<string>()
  const maxAttempts = Math.max(200, count * 12)
  let attempts = 0
  while (results.length < count && attempts < maxAttempts) {
    attempts++
    const tones: CopyOptions['tone'][] = ['friendly','casual','urgent','formal']
    const tone = pick(tones)
    const jitterOpts = { ...opts, tone }
    // small jitter delay
    await new Promise(r => setTimeout(r, 80 + Math.floor(Math.random() * 240)))
    const out = composeCopy(jitterOpts)
    // use a short fingerprint to detect duplicates
    const fingerprint = `${out.subject}|||${out.preheader}|||${out.html.slice(0,180)}`
    if (!seen.has(fingerprint)) {
      seen.add(fingerprint)
      results.push(out)
    }
  }
  return results
}

// Firestore helpers to persist/load user patterns (optional). These are thin wrappers
// and require `db` from your project's Firebase client. Importing here keeps patterns
// accessible to other modules but does not change the generator behavior if not used.
import { collection, getDocs, addDoc } from 'firebase/firestore'
import { db } from './firebase'

export async function loadUserPatterns(uid: string) {
  if (!uid) return [] as string[]
  try {
    const c = collection(db, 'users', uid, 'ai_patterns')
    const snap = await getDocs(c)
    return snap.docs.map(d => (d.data() as any).pattern).filter(Boolean)
  } catch (e) {
    console.warn('[aiHelper] loadUserPatterns error', e)
    return [] as string[]
  }
}

export async function saveUserPattern(uid: string, pattern: string) {
  if (!uid) throw new Error('uid required')
  try {
    await addDoc(collection(db, 'users', uid, 'ai_patterns'), { pattern, createdAt: new Date().toISOString() })
    return true
  } catch (e) {
    console.warn('[aiHelper] saveUserPattern error', e)
    return false
  }
}

export function suggestCopy(opts: CopyOptions) {
  return composeCopy(opts)
}

export function suggestCopyVariants(opts: CopyOptions, count = 3) {
  const res: Array<{subject:string, preheader:string, html:string}> = []
  const tones: CopyOptions['tone'][] = ['friendly','casual','urgent','formal']
  for (let i = 0; i < count; i++) res.push(composeCopy({ ...opts, tone: tones[i % tones.length] }))
  return res
}
