export type CopyOptions = {
  company?: string
  product?: string
  tone?: 'friendly' | 'formal' | 'urgent' | 'casual'
  namePlaceholder?: string
  vertical?: 'general' | 'tourism' | 'cooperative' | 'taxi'
  destination?: string
  dateRange?: string
  ctaLink?: string
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
  const product = opts.product || 'nosso produto'
  const tone = opts.tone || 'friendly'
  const name = opts.namePlaceholder || '{{name}}'
  const dest = opts.destination || ''

  const openings: Record<string, string[]> = {
    friendly: [
      `Olá ${name},`,
      `Oi ${name}!`,
      `Olá — temos novidades para quem gosta de viajar, ${name}.`
    ],
    formal: [
      `Olá ${name},`,
      `Prezado(a) ${name},`
    ],
    urgent: [
      `Atenção ${name}, vagas acabando!`,
      `Última chamada para ${dest || 'reservas'} — ${name}`
    ],
    casual: [
      `Ei ${name}, bora?`,
      `Que tal uma escapada, ${name}?`
    ]
  }

  const introsByVertical: Record<string, string[]> = {
    tourism: [
      `Preparamos experiências em ${dest || 'vários destinos'} com guias locais e roteiros personalizados.`,
      `Roteiros pensados para quem quer viver o melhor de ${dest || 'uma região'}.`
    ],
    cooperative: [
      `Soluções para cooperativas aumentarem reservas e organizarem melhor a operação.`,
      `Ajudamos cooperativas a melhorar vendas e fidelização com ferramentas práticas.`
    ],
    taxi: [
      `Dicas práticas para motoristas aumentarem corrida e ganhar mais por dia.`,
      `Ferramentas e parcerias locais para otimizar sua operação como motorista.`
    ],
    general: [
      `Temos novidades que podem interessar a você.`,
      `Confira opções criadas para tornar sua experiência melhor.`
    ]
  }

  const subjectParts = [
    dest ? `${dest}` : null,
    pick([`${company}`, `${product}`]),
    pick([`ofertas`, `novidades`, `roteiros`, `experiências`])
  ].filter(Boolean)
  const subject = `${pick(openings[tone])} ${subjectParts.join(' — ')}`.replace(/\s+/g, ' ').trim()

  const preheader = pick(introsByVertical[opts.vertical || 'general']).replace(/\s+/g, ' ')

  const top = `<h2>${mainTitleOrFallback(opts)}</h2><p>${pick(openings[tone])} ${pick(introsByVertical[opts.vertical || 'general'])}</p>`
  const mid = bullets(pickBenefits(opts))
  const ctaTexts: Record<string, string> = { friendly: 'Saiba mais', formal: 'Saiba mais', urgent: 'Reserve agora', casual: 'Ver opções' }
  const ctaLabel = opts.ctaLink ? (ctaTexts[tone] || 'Saiba mais') : (ctaTexts[tone] || 'Saiba mais')
  const ctaHref = opts.ctaLink || '#'
  const ctaColor = tone === 'urgent' ? '#e11d48' : tone === 'casual' ? '#059669' : '#4f46e5'
  const bottom = `<p style="margin-top:10px;text-align:center"><a href="${ctaHref}" style="background:${ctaColor};color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;">${ctaLabel}</a></p><p style="color:#6b7280;font-size:12px;margin-top:12px;">Enviado por ${company}</p>`

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
  for (let i = 0; i < count; i++) {
    const tones: CopyOptions['tone'][] = ['friendly','casual','urgent','formal']
    const tone = tones[i % tones.length]
    const merged = { ...opts, tone }
    await new Promise(r => setTimeout(r, 200 + Math.floor(Math.random() * 300)))
    const out = composeCopy(merged)
    results.push(out)
  }
  return results
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
