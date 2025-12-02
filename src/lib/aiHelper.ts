import { collection, getDocs, addDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore'
import { db } from './firebase'

export type CopyOptions = {
  company?: string
  product?: string
  tone?: 'friendly' | 'formal' | 'urgent' | 'casual' | 'professional'
  namePlaceholder?: string
  vertical?: 'general' | 'tourism' | 'cooperative' | 'taxi' | 'ecommerce' | 'services'
  destination?: string
  dateRange?: string
  ctaLink?: string
  description?: string
  mainTitle?: string
  previousExperience?: { trip?: string; date?: string }
  userPatterns?: string[]
  audience?: string
  keyBenefits?: string[]
  constraints?: string[]
}

export type GeneratedCopy = {
  subject: string
  preheader: string
  html: string
  tone: string
  vertical: string
  score?: number
  metadata?: {
    wordCount: number
    readingLevel: string
    emotionalTone: string[]
  }
}

// Sistema de templates hierárquico
const TEMPLATE_SYSTEM = {
  tones: {
    friendly: {
      openings: [
        `Olá {name},`,
        `Oi {name}!`, 
        `Boas notícias, {name}:`,
        `Olá — temos novidades para você, {name}.`,
        `Saudações {name},`
      ],
      closings: [
        `Abraços,<br>{company}`,
        `Até breve!<br>Equipe {company}`,
        `Com carinho,<br>{company}`
      ],
      ctaTexts: ['Saiba mais', 'Ver opções', 'Descubra agora', 'Conferir']
    },
    formal: {
      openings: [
        `Prezado(a) {name},`,
        `Caro(a) {name},`,
        `Ilustríssimo(a) {name},`,
        `Senhor(a) {name},`
      ],
      closings: [
        `Atenciosamente,<br>Equipe {company}`,
        `Cordialmente,<br>{company}`,
        `Respeitosamente,<br>Diretoria {company}`
      ],
      ctaTexts: ['Saiba mais', 'Conhecer detalhes', 'Solicitar informações']
    },
    professional: {
      openings: [
        `Caro(a) {name},`,
        `Prezado(a) {name},`,
        `Olá {name},`,
        `Estimado(a) {name},`
      ],
      closings: [
        `Atenciosamente,<br>Equipe {company}`,
        `Melhores cumprimentos,<br>{company}`,
        `Saudações profissionais,<br>{company}`
      ],
      ctaTexts: ['Acessar agora', 'Conhecer solução', 'Iniciar teste']
    },
    urgent: {
      openings: [
        `Atenção {name}!`,
        `Última oportunidade, {name}!`,
        `Alerta importante, {name}:`,
        `Não perca, {name}:`
      ],
      closings: [
        `Não deixe para depois!<br>{company}`,
        `Oferta por tempo limitado<br>{company}`,
        `Agende agora!<br>{company}`
      ],
      ctaTexts: ['Garantir agora', 'Reservar já', 'Não perder']
    },
    casual: {
      openings: [
        `Ei {name}, bora?`,
        `E aí {name}!`,
        `Fala, {name}!`,
        `Olha só, {name}:`
      ],
      closings: [
        `Valeu!<br>{company}`,
        `Até mais!<br>Equipe {company}`,
        `Abraço!<br>{company}`
      ],
      ctaTexts: ['Bora ver', 'Conferir', 'Partiu']
    }
  },

  verticals: {
    tourism: {
      subjects: [
        '{company} tem novas experiências em {destination}',
        'Descubra {destination} com {company}',
        'Pacotes exclusivos para {destination}',
        'Sua próxima aventura em {destination} começa aqui',
        '{destination}: Ofertas imperdíveis {company}',
        'Viaje para {destination} - Condições especiais',
        'Realize o sonho de conhecer {destination}',
        '{destination} te espera! Veja as novidades',
        'Promoção relâmpago: {destination} com {company}',
        'Roteiros exclusivos em {destination}'
      ],
      intros: [
        'Preparamos roteiros únicos para você viver o melhor de {destination}.',
        'Selecionamos as melhores experiências em {destination} pensando em você.',
        'Descubra {destination} como nunca antes com nossos pacotes exclusivos.',
        'Transforme seu sonho de conhecer {destination} em realidade.',
        'Experiências autênticas e inesquecíveis te aguardam em {destination}.',
        'Guias locais, roteiros personalizados e momentos únicos em {destination}.',
        'Viva {destination} de forma completa com nossos pacotes especiais.',
        'De praias paradisíacas a cultura vibrante, {destination} tem tudo isso.',
        'Sua jornada para {destination} começa com a expertise da {company}.',
        'Criamos memórias que duram para sempre em {destination}.'
      ],
      benefits: [
        'Guias locais especializados e roteiros personalizados',
        'Experiências autênticas que vão além do turismo convencional',
        'Condições flexíveis e atendimento dedicado 24/7',
        'Opções para todos os tipos de viajante',
        'Hospedagens selecionadas com excelente custo-benefício',
        'Translados e logística completa inclusos',
        'Seguro viagem e assistência internacional',
        'Parcelamento facilitado e condições especiais',
        'Roteiros que combinam aventura, cultura e gastronomia',
        'Acesso a experiências exclusivas e off the beaten path'
      ],
      tourismPrompts: {
        beach: {
          phrases: [
            'Sinta a brisa do mar e o sol na pele',
            'Praias de águas cristalinas te esperam',
            'Mergulhe em cenários paradisíacos',
            'Do nascer ao pôr do sol, cada momento é mágico'
          ],
          activities: ['mergulho', 'passeios de barco', 'esportes aquáticos', 'beach clubs exclusivos']
        },
        cultural: {
          phrases: [
            'Imersa na história e cultura local',
            'Descubra tradições milenares',
            'Gastronomia autêntica e arquitetura de tirar o fôlego',
            'Cada rua conta uma história'
          ],
          activities: ['city tours guiados', 'experiências gastronômicas', 'museus e patrimônios', 'mercados locais']
        },
        adventure: {
          phrases: [
            'Adrenalina e natureza em perfeita harmonia',
            'Trilhas, montanhas e paisagens de cortar a respiração',
            'Para quem busca emoção e superação',
            'Conexão total com a natureza'
          ],
          activities: ['trekking', 'rafting', 'escalada', 'safáris fotográficos']
        },
        romantic: {
          phrases: [
            'O cenário perfeito para momentos inesquecíveis a dois',
            'Romantismo, privacidade e experiências exclusivas',
            'Crie memórias únicas ao lado de quem você ama',
            'Do jantar à beira-mar ao spa relaxante'
          ],
          activities: ['jantares românticos', 'spa para casais', 'passeios privativos', 'suítes com vista panorâmica']
        },
        family: {
          phrases: [
            'Diversão garantida para toda a família',
            'Atividades que unem pais e filhos',
            'Segurança, conforto e entretenimento',
            'Memórias que seus filhos vão lembrar para sempre'
          ],
          activities: ['parques temáticos', 'atividades educativas', 'passeios kid-friendly', 'hotéis family resort']
        }
      }
    },
    ecommerce: {
      subjects: [
        'Novos produtos {company} disponíveis',
        'Ofertas especiais {company}',
        'Lançamento {company} - {product}'
      ],
      intros: [
        'Temos novidades incríveis que combinam perfeitamente com você.',
        'Selecionamos produtos especiais pensando no seu estilo.',
        'Confira nossas últimas novidades e ofertas exclusivas.'
      ],
      benefits: [
        'Produtos de alta qualidade com garantia',
        'Entrega rápida e opções de pagamento flexíveis',
        'Atendimento especializado para tirar suas dúvidas',
        'Condições especiais para clientes frequentes'
      ]
    },
    services: {
      subjects: [
        '{company} - Soluções para {product}',
        'Melhore seus resultados com {company}',
        '{company}: Profissionais especializados em {product}'
      ],
      intros: [
        'Oferecemos soluções profissionais para otimizar seus resultados.',
        'Nossa equipe especializada está pronta para ajudar você.',
        'Descubra como podemos fazer a diferença no seu dia a dia.'
      ],
      benefits: [
        'Profissionais qualificados e experientes',
        'Soluções personalizadas para suas necessidades',
        'Suporte contínuo e acompanhamento',
        'Resultados mensuráveis e garantia de qualidade'
      ]
    },
    general: {
      subjects: [
        'Novidades {company}',
        '{company} tem novidades para você',
        'Oportunidades exclusivas {company}'
      ],
      intros: [
        'Temos novidades que podem fazer a diferença para você.',
        'Selecionamos oportunidades especiais pensando no seu perfil.',
        'Confira o que preparamos especialmente para você.'
      ],
      benefits: [
        'Soluções testadas e aprovadas',
        'Condições especiais e vantagens exclusivas',
        'Suporte dedicado e atendimento personalizado',
        'Resultados comprovados e satisfação garantida'
      ]
    }
  }
}

// Sistema de análise e scoring
class CopyAnalyzer {
  static calculateReadability(text: string): string {
    const words = text.split(/\s+/).length
    const sentences = text.split(/[.!?]+/).length
    const avgWordsPerSentence = words / sentences
    
    if (avgWordsPerSentence < 12) return 'fácil'
    if (avgWordsPerSentence < 18) return 'médio'
    return 'complexo'
  }

  static detectEmotionalTone(text: string): string[] {
    const tones = []
    const positiveWords = ['incrível', 'especial', 'exclusiv', 'únic', 'melhor', 'fantástic', 'maravilh']
    const urgentWords = ['urgente', 'limitado', 'última', 'rápido', 'agora', 'hoje']
    const friendlyWords = ['olá', 'oi', 'fala', 'e aí', 'valeu', 'abraço']
    
    const lowerText = text.toLowerCase()
    
    if (positiveWords.some(word => lowerText.includes(word))) tones.push('positivo')
    if (urgentWords.some(word => lowerText.includes(word))) tones.push('urgente')
    if (friendlyWords.some(word => lowerText.includes(word))) tones.push('amigável')
    if (!tones.length) tones.push('neutro')
    
    return tones
  }

  static calculateScore(copy: GeneratedCopy): number {
    let score = 50 // Base score
    
    // Subject length optimization
    const subjectLength = copy.subject.length
    if (subjectLength >= 30 && subjectLength <= 60) score += 20
    else if (subjectLength > 0 && subjectLength < 100) score += 10
    
    // Preheader length
    const preheaderLength = copy.preheader.length
    if (preheaderLength >= 40 && preheaderLength <= 100) score += 15
    
    // HTML content quality
    const hasPersonalization = copy.html.includes('{name}') ? 10 : 0
    const hasCTA = /<a[^>]*>.*?<\/a>/.test(copy.html) ? 15 : 0
    const hasStructure = /<(h1|h2|ul|ol)>/.test(copy.html) ? 10 : 0
    
    score += hasPersonalization + hasCTA + hasStructure
    
    return Math.min(100, score)
  }
}

// Gerador principal melhorado
class ProfessionalCopyGenerator {
  static generate(opts: CopyOptions): GeneratedCopy {
    const tone = opts.tone || 'friendly'
    const vertical = opts.vertical || 'general'
    const company = opts.company || 'nossa empresa'
    const name = opts.namePlaceholder || '{name}'
    const destination = opts.destination || ''
    const product = opts.product || ''
    
    // Seleção de templates baseados no tom e vertical
    const toneTemplates = TEMPLATE_SYSTEM.tones[tone as keyof typeof TEMPLATE_SYSTEM.tones] || TEMPLATE_SYSTEM.tones.friendly
    const verticalTemplates = TEMPLATE_SYSTEM.verticals[vertical as keyof typeof TEMPLATE_SYSTEM.verticals] || TEMPLATE_SYSTEM.verticals.general
    
    // Geração do subject
    const subject = this.generateSubject(verticalTemplates.subjects, company, destination, product)
    
    // Geração do preheader
    const preheader = this.generatePreheader(verticalTemplates.intros, company, destination, product)
    
    // Geração do conteúdo HTML
    const html = this.generateHTML({
      toneTemplates,
      verticalTemplates,
      company,
      name,
      destination,
      product,
      opts
    })
    
    const copy: GeneratedCopy = {
      subject,
      preheader,
      html,
      tone,
      vertical,
      metadata: {
        wordCount: html.split(/\s+/).length,
        readingLevel: CopyAnalyzer.calculateReadability(html),
        emotionalTone: CopyAnalyzer.detectEmotionalTone(html)
      }
    }
    
    copy.score = CopyAnalyzer.calculateScore(copy)
    
    return copy
  }
  
  private static generateSubject(
    subjects: string[], 
    company: string, 
    destination: string, 
    product: string
  ): string {
    let template = this.pickRandom(subjects)
    
    // Aplicar substituições
    template = template
      .replace(/{company}/g, company)
      .replace(/{destination}/g, destination)
      .replace(/{product}/g, product)
    
    // Otimização para mobile (30-60 caracteres)
    if (template.length < 30) {
      template = this.enhanceSubject(template)
    } else if (template.length > 60) {
      template = this.shortenSubject(template)
    }
    
    return template
  }
  
  private static generatePreheader(
    intros: string[], 
    company: string, 
    destination: string, 
    product: string
  ): string {
    let preheader = this.pickRandom(intros)
      .replace(/{company}/g, company)
      .replace(/{destination}/g, destination)
      .replace(/{product}/g, product)
    
    // Garantir comprimento ideal (40-100 caracteres)
    if (preheader.length > 100) {
      preheader = preheader.substring(0, 97) + '...'
    }
    
    return preheader
  }
  
  private static generateHTML(params: {
    toneTemplates: any
    verticalTemplates: any
    company: string
    name: string
    destination: string
    product: string
    opts: CopyOptions
  }): string {
    const { toneTemplates, verticalTemplates, company, name, destination, product, opts } = params
    
    const opening = this.pickRandom(toneTemplates.openings).replace(/{name}/g, name)
    const closing = this.pickRandom(toneTemplates.closings).replace(/{company}/g, company)
    const ctaText = this.pickRandom(toneTemplates.ctaTexts)
    
    // Título principal
    const mainTitle = opts.mainTitle || this.generateMainTitle(company, product, destination, opts)
    
    // Benefícios personalizados
    const benefits = this.generateBenefits(verticalTemplates.benefits, opts)
    
    // CTA personalizado
    const ctaHTML = this.generateCTA(ctaText, opts.ctaLink)
    
    return `
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <h1 style="color: #2c5aa0; font-size: 24px; margin-bottom: 16px;">${mainTitle}</h1>
  
  <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
    ${opening} ${this.pickRandom(verticalTemplates.intros)
      .replace(/{company}/g, company)
      .replace(/{destination}/g, destination)
      .replace(/{product}/g, product)}
  </p>
  
  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h2 style="color: #2c5aa0; font-size: 18px; margin-bottom: 12px;">Principais benefícios:</h2>
    ${benefits}
  </div>
  
  ${ctaHTML}
  
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 14px; color: #666;">
    ${closing}
  </div>
</div>
    `.trim()
  }
  
  private static generateMainTitle(company: string, product: string, destination: string, opts: CopyOptions): string {
    if (opts.previousExperience?.trip) {
      return `De volta às aventuras! Novas experiências após ${opts.previousExperience.trip}`
    }
    
    const titles = [
      `Descubra ${product || destination || 'novas possibilidades'} com ${company}`,
      `${company} apresenta: ${product || 'Oportunidades exclusivas'}`,
      `Sua próxima experiência ${destination ? `em ${destination}` : 'está aqui'}`
    ]
    
    return this.pickRandom(titles)
  }
  
  private static generateBenefits(baseBenefits: string[], opts: CopyOptions): string {
    let benefits = [...baseBenefits]
    
    // Adicionar benefícios personalizados do usuário
    if (opts.keyBenefits && opts.keyBenefits.length > 0) {
      benefits = [...opts.keyBenefits, ...benefits]
    }
    
    // Adicionar benefícios para clientes recorrentes
    if (opts.previousExperience?.trip) {
      benefits.unshift(`Vantagens exclusivas para quem já viveu ${opts.previousExperience.trip}`)
    }
    
    // Adicionar padrões do usuário
    if (opts.userPatterns && opts.userPatterns.length > 0) {
      const userPattern = this.pickRandom(opts.userPatterns)
      if (userPattern && !benefits.includes(userPattern)) {
        benefits.splice(1, 0, userPattern)
      }
    }
    
    // Selecionar 3-4 benefícios mais relevantes
    const selectedBenefits = benefits.slice(0, 4)
    
    return `
<ul style="margin: 0; padding-left: 20px;">
  ${selectedBenefits.map(benefit => 
    `<li style="margin-bottom: 8px; line-height: 1.4;">${benefit}</li>`
  ).join('')}
</ul>
    `.trim()
  }
  
  private static generateCTA(text: string, link?: string): string {
    const href = link || '#'
    const colors = {
      primary: '#2c5aa0',
      hover: '#1e3f73'
    }
    
    return `
<div style="text-align: center; margin: 30px 0;">
  <a href="${href}" 
     style="background: ${colors.primary}; 
            color: white; 
            padding: 12px 30px; 
            text-decoration: none; 
            border-radius: 6px; 
            font-weight: bold;
            display: inline-block;
            transition: background 0.3s;">
    ${text}
  </a>
  <style>
    a:hover { background: ${colors.hover} !important; }
  </style>
</div>
    `.trim()
  }
  
  private static enhanceSubject(subject: string): string {
    const enhancements = [
      `🔥 ${subject}`,
      `⭐ ${subject}`,
      `🚀 ${subject}`,
      `${subject} |`,
      `${subject} - Confira!`
    ]
    return this.pickRandom(enhancements)
  }
  
  private static shortenSubject(subject: string): string {
    if (subject.length <= 60) return subject
    
    // Tentativas de encurtamento
    const shortened = subject
      .replace(/\s*\|.*$/, '')
      .replace(/\s*\-.*$/, '')
      .substring(0, 57) + '...'
    
    return shortened.length <= 60 ? shortened : shortened.substring(0, 57) + '...'
  }
  
  private static pickRandom(array: any[]): any {
    return array[Math.floor(Math.random() * array.length)]
  }
}

// Funções de export mantendo compatibilidade
export async function generateCopy(opts: CopyOptions): Promise<GeneratedCopy> {
  // Simular delay de processamento
  await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 600))
  return ProfessionalCopyGenerator.generate(opts)
}

export async function generateVariants(opts: CopyOptions, count = 5): Promise<GeneratedCopy[]> {
  const variants: GeneratedCopy[] = []
  const seenSubjects = new Set<string>()
  
  const tones: Array<CopyOptions['tone']> = ['friendly', 'professional', 'formal', 'casual', 'urgent']
  
  for (let i = 0; i < count * 2; i++) {
    if (variants.length >= count) break
    
    const tone = tones[i % tones.length]
    const variantOpts = { ...opts, tone }
    
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 400))
    
    const variant = ProfessionalCopyGenerator.generate(variantOpts)
    
    // Evitar duplicatas
    if (!seenSubjects.has(variant.subject)) {
      seenSubjects.add(variant.subject)
      variants.push(variant)
    }
  }
  
  // Ordenar por score
  return variants.sort((a, b) => (b.score || 0) - (a.score || 0))
}

// Sistema de padrões do usuário (mantido para compatibilidade)
export async function loadUserPatterns(uid: string): Promise<string[]> {
  if (!uid) return []
  
  try {
    const patternsRef = collection(db, 'users', uid, 'ai_patterns')
    const q = query(patternsRef, orderBy('createdAt', 'desc'), limit(50))
    const snapshot = await getDocs(q)
    
    return snapshot.docs
      .map(doc => doc.data().pattern)
      .filter(pattern => pattern && typeof pattern === 'string')
  } catch (error) {
    console.warn('[AI Helper] Erro ao carregar padrões:', error)
    return []
  }
}

export async function saveUserPattern(uid: string, patternData: string | Record<string, any>): Promise<boolean> {
  if (!uid) return false
  
  try {
    const pattern = typeof patternData === 'string' ? patternData : patternData.pattern
    if (!pattern?.trim()) return false
    
    const patternDoc = {
      pattern: pattern.trim(),
      ownerUid: uid,
      createdAt: serverTimestamp(),
      source: 'campaign_generator',
      ...(typeof patternData === 'object' ? patternData : {})
    }
    
    await addDoc(collection(db, 'users', uid, 'ai_patterns'), patternDoc)
    return true
  } catch (error) {
    console.warn('[AI Helper] Erro ao salvar padrão:', error)
    return false
  }
}

// Funções de compatibilidade
export function suggestCopy(opts: CopyOptions): GeneratedCopy {
  return ProfessionalCopyGenerator.generate(opts)
}

export function suggestCopyVariants(opts: CopyOptions, count = 3): GeneratedCopy[] {
  const variants: GeneratedCopy[] = []
  const tones: Array<CopyOptions['tone']> = ['friendly', 'professional', 'formal']
  
  for (let i = 0; i < count; i++) {
    const variant = ProfessionalCopyGenerator.generate({
      ...opts,
      tone: tones[i % tones.length]
    })
    variants.push(variant)
  }
  
  return variants
}

// ✨ GERADOR ESPECIALIZADO EM TURISMO ✨
export async function generateTourismCopy(opts: {
  destination: string
  companyName: string
  tripType?: 'beach' | 'cultural' | 'adventure' | 'romantic' | 'family'
  duration?: string
  priceRange?: string
  highlights?: string[]
  tone?: CopyOptions['tone']
}): Promise<GeneratedCopy> {
  const {
    destination,
    companyName,
    tripType = 'beach',
    duration = '',
    priceRange = '',
    highlights = [],
    tone = 'friendly'
  } = opts

  await new Promise(resolve => setTimeout(resolve, 800))

  const tourismData = TEMPLATE_SYSTEM.verticals.tourism.tourismPrompts[tripType]
  const toneData = TEMPLATE_SYSTEM.tones[tone as keyof typeof TEMPLATE_SYSTEM.tones] || TEMPLATE_SYSTEM.tones.friendly

  // Sujeito especializado
  const subjectTemplates = [
    `${destination}: ${tourismData.phrases[0]}`,
    `Explore ${destination} com ${companyName}`,
    `Pacote ${tripType === 'romantic' ? 'Romântico' : tripType === 'family' ? 'em Família' : 'Especial'} para ${destination}`,
    `Sua aventura em ${destination} começa aqui!`,
    `${destination} te espera! Confira as novidades`
  ]

  const subject = subjectTemplates[Math.floor(Math.random() * subjectTemplates.length)]

  // Preheader contextual
  const preheaderTemplates = [
    `${tourismData.phrases[1]} | ${duration || 'Saídas flexíveis'}`,
    `${priceRange || 'Condições especiais'} - ${tourismData.phrases[2]}`,
    `${companyName} criou o roteiro perfeito para você`
  ]

  const preheader = preheaderTemplates[Math.floor(Math.random() * preheaderTemplates.length)]

  // HTML rico e contextualizado
  const selectedActivities = tourismData.activities.slice(0, 3)
  const opening = toneData.openings[0].replace(/{name}/g, '{name}')
  const closing = toneData.closings[0].replace(/{company}/g, companyName)
  const ctaText = tripType === 'romantic' ? 'Reservar Experiência Romântica' : 
                   tripType === 'family' ? 'Ver Pacote Família' : 
                   'Conhecer Roteiro Completo'

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 36px; font-weight: 800;">${companyName}</h1>
              <p style="margin: 10px 0 0; color: #e0e7ff; font-size: 14px; letter-spacing: 2px; text-transform: uppercase;">Experiências Autênticas</p>
            </td>
          </tr>

          <!-- Conteúdo -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 10px; color: #334155; font-size: 16px;">${opening}</p>
              
              <h2 style="margin: 20px 0 15px; color: #1e293b; font-size: 32px; font-weight: 700; line-height: 1.2;">
                Descubra ${destination}
              </h2>

              <p style="margin: 0 0 25px; color: #475569; font-size: 16px; line-height: 1.7;">
                ${tourismData.phrases[Math.floor(Math.random() * tourismData.phrases.length)]}
              </p>

              <!-- Highlights -->
              <div style="background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border-left: 4px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <p style="margin: 0 0 15px; color: #0c4a6e; font-size: 16px; font-weight: 700;">✨ O que te espera:</p>
                ${selectedActivities.map(activity => `
                  <p style="margin: 8px 0; color: #0369a1; font-size: 15px;">
                    <strong>✓</strong> ${activity.charAt(0).toUpperCase() + activity.slice(1)}
                  </p>
                `).join('')}
                ${highlights.map(h => `
                  <p style="margin: 8px 0; color: #0369a1; font-size: 15px;">
                    <strong>✓</strong> ${h}
                  </p>
                `).join('')}
              </div>

              ${duration || priceRange ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
                <tr>
                  ${duration ? `
                  <td width="50%" style="padding-right: 10px;">
                    <div style="background-color: #fef3c7; border-radius: 8px; padding: 18px; text-align: center;">
                      <p style="margin: 0 0 5px; color: #92400e; font-size: 12px; text-transform: uppercase; font-weight: 600;">Duração</p>
                      <p style="margin: 0; color: #78350f; font-size: 20px; font-weight: 700;">${duration}</p>
                    </div>
                  </td>
                  ` : ''}
                  ${priceRange ? `
                  <td width="50%" style="${duration ? 'padding-left: 10px;' : ''}">
                    <div style="background-color: #dcfce7; border-radius: 8px; padding: 18px; text-align: center;">
                      <p style="margin: 0 0 5px; color: #14532d; font-size: 12px; text-transform: uppercase; font-weight: 600;">Investimento</p>
                      <p style="margin: 0; color: #166534; font-size: 20px; font-weight: 700;">${priceRange}</p>
                    </div>
                  </td>
                  ` : ''}
                </tr>
              </table>
              ` : ''}

              <!-- CTA -->
              <div style="text-align: center; margin: 30px 0 20px;">
                <a href="{ctaLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                  ${ctaText}
                </a>
              </div>

              <p style="margin: 20px 0 0; color: #94a3b8; font-size: 13px; text-align: center;">
                💬 Dúvidas? Nossa equipe de especialistas está pronta para ajudar!
              </p>

              <p style="margin: 25px 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                ${closing}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px; text-align: center; border-radius: 0 0 16px 16px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px; color: #64748b; font-size: 13px; font-weight: 600;">${companyName}</p>
              <p style="margin: 0 0 12px; color: #94a3b8; font-size: 11px;">Transformando sonhos em viagens inesquecíveis</p>
              <p style="margin: 0; color: #cbd5e1; font-size: 10px;">
                <a href="#" style="color: #667eea; text-decoration: none;">Descadastrar</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  const copy: GeneratedCopy = {
    subject,
    preheader,
    html,
    tone,
    vertical: 'tourism',
    metadata: {
      wordCount: html.split(/\s+/).length,
      readingLevel: 'médio',
      emotionalTone: ['positivo', 'inspirador']
    }
  }

  copy.score = CopyAnalyzer.calculateScore(copy)
  return copy
}