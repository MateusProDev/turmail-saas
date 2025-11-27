export type CopyOptions = {
  company?: string
  product?: string
  tone?: 'friendly' | 'formal' | 'urgent' | 'casual'
  namePlaceholder?: string
  vertical?: 'general' | 'tourism' | 'cooperative' | 'taxi'
  destination?: string
  dateRange?: string
}

function pick<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)] }

export function suggestCopy(opts: CopyOptions) {
  const company = opts.company || 'sua empresa'
  const product = opts.product || 'nosso produto'
  const tone = opts.tone || 'friendly'
  const name = opts.namePlaceholder || '{{name}}'

  // base subject templates by tone — will be augmented for verticals below
  const subjectTemplates: Record<string, string[]> = {
    friendly: [
      `Uma novidade para ${name} — experimente ${product}`,
      `${name}, veja como ${product} pode ajudar você`,
      `${product} chegou na ${company} — aproveite, ${name}`
    ],
    formal: [
      `${company} apresenta: ${product}`,
      `Informações importantes sobre ${product}`
    ],
    urgent: [
      `Última chance: oferta ${product} para ${name}`,
      `${name}, estoque limitado de ${product}`
    ],
    casual: [
      `Ei ${name}, confere isso sobre ${product}`,
      `Dá uma olhada no ${product} da ${company}`
    ]
  }

  const preheaderTemplates: Record<string, string[]> = {
    friendly: [
      `Veja como ${product} pode facilitar sua rotina.`,
      `Um presente da ${company} para você.`
    ],
    formal: [
      `Mais detalhes e instruções sobre ${product}.`,
      `Informações importantes da ${company}.`
    ],
    urgent: [
      `Oferta por tempo limitado — não perca.`,
      `Promoção válida até hoje.`
    ],
    casual: [
      `Curtiu? A gente te mostra como usar.`,
      `Rápido e fácil — experimente agora.`
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

  // Build a simple HTML body using the provided data and placeholders
  let html = `
    <div style="font-family: Arial, Helvetica, sans-serif; font-size: 16px; color: #111;">
      <h2>Olá ${name},</h2>
      <p>Queremos apresentar <strong>${product}</strong> da ${company} — uma solução pensada para você.</p>
      <ul>
        <li>Benefício 1: rapidez e facilidade de uso</li>
        <li>Benefício 2: melhora resultados rapidamente</li>
        <li>Benefício 3: suporte dedicado</li>
      </ul>
      <p>Se quiser, responda a este email ou clique no botão abaixo para saber mais.</p>
      <p style="text-align:center; margin-top:18px;"><a href="#" style="background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;">Quero saber mais</a></p>
      <p style="color:#6b7280; font-size:12px; margin-top:18px;">Mensagem enviada por ${company}.</p>
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
