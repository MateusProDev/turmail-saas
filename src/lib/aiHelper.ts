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

export function suggestCopy(opts: CopyOptions) {
  // If company is not provided, prefer the recipient name placeholder (e.g. '{{name}}' or actual name)
  const company = opts.company || opts.namePlaceholder || 'sua empresa'
  const product = opts.product || 'nosso produto'
  const tone = opts.tone || 'friendly'
  const name = opts.namePlaceholder || '{{name}}'

  // base subject templates by tone — tourism-focused (agency -> clients)
  const subjectTemplates: Record<string, string[]> = {
    friendly: [
      `Novos passeios em ${opts.destination || 'sua região'} — descubra com ${company}`,
      `${name}, roteiros especiais esperam por você`,
      `${company} preparou experiências imperdíveis para ${name}`
    ],
    formal: [
      `${company} apresenta: novos roteiros e experiências`,
      `Informações sobre reservas e opções de passeio`
    ],
    urgent: [
      `Últimas vagas para passeios em ${opts.destination || 'seu destino'}`,
      `${name}, vagas limitadas — garanta já sua reserva`
    ],
    casual: [
      `Ei ${name}, bora explorar ${opts.destination || 'a cidade'}?`,
      `Olha as experiências que a ${company} montou para você`
    ]
  }

  const preheaderTemplates: Record<string, string[]> = {
    friendly: [
      `Roteiros personalizados, guias locais e suporte na viagem.`,
      `Ofertas especiais para quem quer viver experiências reais.`
    ],
    formal: [
      `Detalhes sobre horários, inclusão e políticas de reserva.`,
      `Informações relevantes para planejar sua visita.`
    ],
    urgent: [
      `Vagas limitadas — reserve agora para garantir desconto.`,
      `Promoção por tempo limitado para reservas antecipadas.`
    ],
    casual: [
      `Passeios rápidos e fáceis de reservar — confira as opções.`,
      `Dicas e passeios locais para aproveitar sua estadia.`
    ]
  }

  // Tailor suggestions for specific verticals (tourism, cooperative, taxi)
  if (opts.vertical === 'tourism') {
    // Add tourism-focused prompts
    subjectTemplates.friendly.push(`${name}, reserve agora sua próxima experiência com ${company}`)
    subjectTemplates.friendly.push(`${company}: pacotes especiais para ${opts.destination || 'seu destino'}`)
    subjectTemplates.urgent.push(`${name}, últimas vagas para o passeio — garanta já`)
    subjectTemplates.urgent.push(`Promoção rápida: descontos em reservas para ${opts.destination || 'agora'}`)
    preheaderTemplates.friendly.push(`Pacotes exclusivos e descontos para reservas antecipadas.`)
    preheaderTemplates.friendly.push(`Escolha datas: ${opts.dateRange || 'datas flexíveis'} — reserve hoje.`)
    preheaderTemplates.urgent.push(`Vagas limitadas para ${opts.destination || 'este destino'} — reserve agora.`)
  }
  if (opts.vertical === 'cooperative') {
    subjectTemplates.friendly.push(`${company} ajuda cooperados a aumentar vendas com ${product}`)
    subjectTemplates.formal.push(`Melhore as reservas e a eficiência da sua cooperativa com ${product}`)
    preheaderTemplates.friendly.push(`Soluções colaborativas para aumentar reservas e fidelização.`)
  }
  if (opts.vertical === 'taxi') {
    subjectTemplates.casual.push(`Motoristas: aumente corridas usando ${product}`)
    subjectTemplates.urgent.push(`${name}, corrida extra disponível — maximize ganhos hoje`)
    preheaderTemplates.casual.push(`Dicas rápidas para encher sua agenda de corridas.`)
  }

  const subject = pick(subjectTemplates[tone] || subjectTemplates.friendly)
  const preheader = pick(preheaderTemplates[tone] || preheaderTemplates.friendly)

  // Build a simple HTML body using the provided data and placeholders (tourism tone)
  let html = `
    <div style="font-family: Arial, Helvetica, sans-serif; font-size: 16px; color: #111;">
      <h2>Olá ${name},</h2>
      <p>Temos roteiros e experiências pensadas para quem visita ${opts.destination || 'a região'}. <strong>${company}</strong> organiza passeios com guias locais e suporte durante toda a viagem.</p>
      <ul>
        <li>Roteiros personalizados para diferentes perfis de viajante</li>
        <li>Datas flexíveis e descontos para reservas antecipadas</li>
        <li>Guias locais experientes e apoio durante o passeio</li>
      </ul>
      <p>Responda a este e-mail com suas preferências ou clique no botão abaixo para ver as opções disponíveis.</p>
      <p style="text-align:center; margin-top:18px;"><a href="#" style="background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;">Ver passeios</a></p>
      <p style="color:#6b7280; font-size:12px; margin-top:18px;">Enviado por ${company} — apoio ao visitante.</p>
    </div>
  `

  // Vertical-specific augmentations
  if (opts.vertical === 'tourism') {
    const dest = opts.destination ? `<strong>${opts.destination}</strong>` : 'o destino'
    const dates = opts.dateRange ? ` (${opts.dateRange})` : ''
    html = `
      <div style="font-family: Arial, Helvetica, sans-serif; font-size:16px; color:#111;">
        <h2>Olá ${name},</h2>
        <p>Quer uma experiência inesquecível em ${dest}${dates}? <strong>${company}</strong> preparou roteiros exclusivos para você.</p>
        <ul>
          <li>Pacotes personalizados para famílias e grupos</li>
          <li>Datas flexíveis e descontos para reservas antecipadas</li>
          <li>Guias locais experientes e apoio em viagem</li>
        </ul>
        <p style="margin-top:8px;">Aproveite ofertas especiais para ${opts.destination || 'nossos destinos mais procurados'} — vagas limitadas.</p>
        <p style="text-align:center; margin-top:18px;"><a href="#" style="background:#059669;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;">Reserve sua experiência</a></p>
        <p style="color:#6b7280; font-size:12px; margin-top:18px;">Reserve até ${opts.dateRange || 'data limitada'} e garanta benefícios exclusivos.</p>
      </div>
    `
  }
  if (opts.vertical === 'cooperative') {
    html = `
      <div style="font-family: Arial, Helvetica, sans-serif; font-size:16px; color:#111;">
        <h2>Olá ${name},</h2>
        <p>Aumente as reservas e a colaboração na sua cooperativa com soluções práticas de ${company}.</p>
        <ul>
          <li>Gerenciamento centralizado de reservas</li>
          <li>Relatórios para otimizar oferta e demanda</li>
          <li>Benefícios exclusivos para cooperados</li>
        </ul>
        <p style="text-align:center; margin-top:18px;"><a href="#" style="background:#0ea5a4;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;">Saiba como aumentar reservas</a></p>
        <p style="color:#6b7280; font-size:12px; margin-top:18px;">Trabalhe em conjunto para crescer.</p>
      </div>
    `
  }
  if (opts.vertical === 'taxi') {
    html = `
      <div style="font-family: Arial, Helvetica, sans-serif; font-size:16px; color:#111;">
        <h2>Olá ${name},</h2>
        <p>Quer encher sua agenda? ${product} traz dicas e ferramentas para motoristas aumentarem a quantidade de corridas e otimizar ganhos.</p>
        <ul>
          <li>Melhore seu tempo médio por corrida</li>
          <li>Dicas para localizar passageiros em horários de pico</li>
          <li>Ofertas e parcerias locais</li>
        </ul>
        <p style="text-align:center; margin-top:18px;"><a href="#" style="background:#ef4444;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;">Aumentar minhas corridas</a></p>
        <p style="color:#6b7280; font-size:12px; margin-top:18px;">Boas práticas para maximizar ganhos.</p>
      </div>
    `
  }

  return { subject, preheader, html }
}

export default suggestCopy

// Return multiple variant suggestions (helpful for A/B or quick choices)
export function suggestCopyVariants(opts: CopyOptions, count = 3) {
  const make = (toneOverride?: CopyOptions['tone'], ctaLabel?: string, ctaColor?: string, href?: string) => {
    const merged = { ...opts } as CopyOptions
    if (toneOverride) merged.tone = toneOverride
    const out = suggestCopy(merged)
    // small post-processing: replace the first CTA <a> text/color/href when present
    if (!out.html) return out
    let html = out.html
    // replace href if provided
    if (href) html = html.replace(/<a\s+href=\"?#?[^\"]*\"/i, `<a href=\"${href}\"`)
    // replace background color in inline style if provided
    if (ctaColor) html = html.replace(/background:\s*#[0-9a-fA-F]{3,6}/i, `background:${ctaColor}`)
    // replace inner text of first anchor
    if (ctaLabel) html = html.replace(/(<a[^>]*>)([\s\S]*?)(<\/a>)/i, `$1${ctaLabel}$3`)
    return { subject: out.subject, preheader: out.preheader, html }
  }

  if (opts && opts.vertical === 'tourism') {
    // produce three tourism-focused variants, then generate extras if `count` > 3
    const base = [
      make('friendly', 'Quero saber mais', '#4f46e5', opts.ctaLink || '#'),
      make('urgent', 'Reserve agora', '#e11d48', opts.ctaLink || '#'),
      make('casual', 'Ver experiências', '#059669', opts.ctaLink || '#')
    ]

    if (count <= base.length) return base.slice(0, count)

    const extras: Array<{subject:string, preheader:string, html:string}> = []
    const toneCycle: Array<CopyOptions['tone']> = ['friendly','urgent','casual','formal']
    // generate additional variants by calling suggestCopy with varied tones
    for (let i = base.length; i < count; i++) {
      const tone = toneCycle[(i - base.length) % toneCycle.length]
      const out = suggestCopy({ ...opts, tone })
      // post-process CTA label/color/href according to tone
      let html = out.html || ''
      const href = opts.ctaLink || '#'
      const color = tone === 'urgent' ? '#e11d48' : tone === 'casual' ? '#059669' : '#4f46e5'
      const label = tone === 'urgent' ? 'Reserve agora' : tone === 'casual' ? 'Ver experiências' : 'Saiba mais'
      html = html.replace(/<a\s+href=\"?#?[^\"]*\"/i, `<a href=\"${href}\"`)
      html = html.replace(/background:\s*#[0-9a-fA-F]{3,6}/i, `background:${color}`)
      html = html.replace(/(<a[^>]*>)([\s\S]*?)(<\/a>)/i, `$1${label}$3`)
      extras.push({ subject: out.subject, preheader: out.preheader, html })
    }

    return base.concat(extras).slice(0, count)
  }

  // Generic: produce `count` variants by re-calling suggestCopy (randomized templates)
  const res: Array<{subject:string, preheader:string, html:string}> = []
  for (let i = 0; i < count; i++) {
    const out = suggestCopy(opts)
    res.push({ subject: out.subject, preheader: out.preheader, html: out.html })
  }
  return res
}
