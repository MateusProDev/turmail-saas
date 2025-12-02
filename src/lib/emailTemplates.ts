export interface EmailTemplate {
  id: string
  name: string
  description: string
  category: 'tourism' | 'promotional' | 'newsletter' | 'event' | 'retention'
  thumbnail: string
  generate: (data: TemplateData) => EmailContent
}

export interface TemplateData {
  companyName: string
  destination?: string
  productName?: string
  mainTitle?: string
  description?: string
  ctaLink?: string
  ctaText?: string
  keyBenefits?: string[]
  priceInfo?: string
  dateRange?: string
  contactInfo?: {
    phone?: string
    email?: string
    website?: string
  }
}

export interface EmailContent {
  subject: string
  preheader: string
  html: string
}

// Template 1: Pacote de Destino Premium
const destinationPackageTemplate: EmailTemplate = {
  id: 'destination-package',
  name: 'Pacote de Destino',
  description: 'Template elegante para apresentar destinos e pacotes turísticos com imagens e CTAs destacados',
  category: 'tourism',
  thumbnail: '🏖️',
  generate: (data) => {
    const {
      companyName = 'Sua Agência',
      destination = 'Destino Incrível',
      mainTitle = `Descubra ${destination}`,
      description = 'Uma experiência única que você não vai esquecer',
      ctaLink = '#',
      ctaText = 'Ver Pacote Completo',
      keyBenefits = ['Guias especializados', 'Hospedagem premium', 'Translados inclusos'],
      priceInfo = 'A partir de R$ 2.999',
      dateRange = 'Saídas diárias'
    } = data

    return {
      subject: `${mainTitle} - Pacotes exclusivos ${companyName}`,
      preheader: `${description} | ${dateRange}`,
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${mainTitle}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 20px 0;">
    <tr>
      <td align="center">
        <!-- Container principal -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header com gradiente -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">${companyName}</h1>
              <p style="margin: 10px 0 0; color: #e0e7ff; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Experiências Inesquecíveis</p>
            </td>
          </tr>

          <!-- Imagem hero (placeholder) -->
          <tr>
            <td style="padding: 0;">
              <div style="background: linear-gradient(to bottom, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.3)), url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=300&fit=crop') center/cover; height: 300px; display: flex; align-items: center; justify-content: center;">
                <h2 style="color: #ffffff; font-size: 48px; font-weight: 800; text-shadow: 0 2px 10px rgba(0,0,0,0.3); margin: 0; padding: 20px; text-align: center;">${mainTitle}</h2>
              </div>
            </td>
          </tr>

          <!-- Conteúdo principal -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #64748b; font-size: 18px; line-height: 1.6;">${description}</p>
              
              <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-left: 4px solid #667eea; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <p style="margin: 0 0 5px; color: #334155; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">✨ O que está incluído</p>
                ${keyBenefits.map(benefit => `
                  <p style="margin: 10px 0; color: #475569; font-size: 15px; line-height: 1.5;">
                    <span style="color: #667eea; font-weight: 700;">✓</span> ${benefit}
                  </p>
                `).join('')}
              </div>

              <!-- Preço e data -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td width="50%" style="padding-right: 10px;">
                    <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; text-align: center;">
                      <p style="margin: 0 0 5px; color: #92400e; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Investimento</p>
                      <p style="margin: 0; color: #78350f; font-size: 24px; font-weight: 800;">${priceInfo}</p>
                    </div>
                  </td>
                  <td width="50%" style="padding-left: 10px;">
                    <div style="background-color: #dbeafe; border-radius: 8px; padding: 20px; text-align: center;">
                      <p style="margin: 0 0 5px; color: #1e40af; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Disponibilidade</p>
                      <p style="margin: 0; color: #1e3a8a; font-size: 18px; font-weight: 700;">${dateRange}</p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- CTA Principal -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${ctaLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 18px 48px; border-radius: 50px; font-weight: 700; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: transform 0.2s;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0; color: #94a3b8; font-size: 13px; text-align: center; line-height: 1.6;">
                💬 Dúvidas? Nossa equipe está pronta para ajudar!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px; color: #64748b; font-size: 14px; font-weight: 600;">${companyName}</p>
              <p style="margin: 0 0 15px; color: #94a3b8; font-size: 12px;">Transformando sonhos em viagens inesquecíveis</p>
              <p style="margin: 0; color: #cbd5e1; font-size: 11px;">
                Você recebeu este email por ser cliente ou ter demonstrado interesse em nossos serviços.<br>
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
      `
    }
  }
}

// Template 2: Newsletter Informativa
const newsletterTemplate: EmailTemplate = {
  id: 'newsletter',
  name: 'Newsletter de Viagem',
  description: 'Newsletter clean e moderna com múltiplas seções, ideal para atualizações mensais e dicas de viagem',
  category: 'newsletter',
  thumbnail: '📰',
  generate: (data) => {
    const {
      companyName = 'Sua Agência',
      mainTitle = 'Novidades do Mês',
      description = 'Confira os melhores destinos e dicas para sua próxima viagem',
      ctaLink = '#',
      ctaText = 'Ver Todas as Ofertas'
    } = data

    return {
      subject: `📬 ${mainTitle} | ${companyName}`,
      preheader: description,
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff;">
          
          <!-- Header minimalista -->
          <tr>
            <td style="padding: 40px 40px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; color: #111827; font-size: 28px; font-weight: 800;">${companyName}</h1>
                  </td>
                  <td align="right">
                    <p style="margin: 0; color: #6b7280; font-size: 13px;">${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                  </td>
                </tr>
              </table>
              <div style="height: 2px; background: linear-gradient(90deg, #667eea, #764ba2); margin-top: 20px;"></div>
            </td>
          </tr>

          <!-- Conteúdo principal -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <h2 style="margin: 0 0 15px; color: #1f2937; font-size: 32px; font-weight: 700; line-height: 1.2;">${mainTitle}</h2>
              <p style="margin: 0 0 30px; color: #6b7280; font-size: 16px; line-height: 1.6;">${description}</p>

              <!-- Card 1: Destino em Destaque -->
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 25px; margin-bottom: 20px;">
                <div style="background: linear-gradient(to right, #667eea, #764ba2); height: 4px; width: 60px; border-radius: 2px; margin-bottom: 15px;"></div>
                <h3 style="margin: 0 0 10px; color: #111827; font-size: 20px; font-weight: 700;">🌴 Destino em Destaque</h3>
                <p style="margin: 0 0 15px; color: #4b5563; font-size: 15px; line-height: 1.6;">
                  Descubra praias paradisíacas, cultura rica e gastronomia única. Um destino que combina aventura e relaxamento.
                </p>
                <a href="${ctaLink}" style="color: #667eea; text-decoration: none; font-weight: 600; font-size: 14px;">
                  Saiba mais →
                </a>
              </div>

              <!-- Card 2: Dica de Viagem -->
              <div style="background-color: #fef3c7; border-radius: 12px; padding: 25px; margin-bottom: 20px;">
                <div style="background: linear-gradient(to right, #f59e0b, #d97706); height: 4px; width: 60px; border-radius: 2px; margin-bottom: 15px;"></div>
                <h3 style="margin: 0 0 10px; color: #92400e; font-size: 20px; font-weight: 700;">💡 Dica do Especialista</h3>
                <p style="margin: 0; color: #78350f; font-size: 15px; line-height: 1.6;">
                  Reserve com antecedência e garanta até 30% de desconto em pacotes selecionados. Consulte condições e destinos participantes.
                </p>
              </div>

              <!-- Card 3: Promoção -->
              <div style="background-color: #dbeafe; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
                <div style="background: linear-gradient(to right, #3b82f6, #2563eb); height: 4px; width: 60px; border-radius: 2px; margin-bottom: 15px;"></div>
                <h3 style="margin: 0 0 10px; color: #1e40af; font-size: 20px; font-weight: 700;">🎁 Oferta Especial</h3>
                <p style="margin: 0; color: #1e3a8a; font-size: 15px; line-height: 1.6;">
                  Primeira compra com 15% OFF! Use o cupom PRIMEIRA15 no checkout.
                </p>
              </div>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${ctaLink}" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px;">
                ${companyName} | Sua próxima aventura começa aqui
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                <a href="#" style="color: #9ca3af; text-decoration: none;">Descadastrar</a> |
                <a href="#" style="color: #9ca3af; text-decoration: none;">Preferências</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `
    }
  }
}

// Template 3: Promocional com Countdown
const promotionalTemplate: EmailTemplate = {
  id: 'promotional',
  name: 'Oferta Relâmpago',
  description: 'Template vibrante para promoções urgentes com elementos visuais de destaque e senso de urgência',
  category: 'promotional',
  thumbnail: '⚡',
  generate: (data) => {
    const {
      companyName = 'Sua Agência',
      mainTitle = 'Oferta Relâmpago!',
      description = 'Não perca esta oportunidade única de viajar com desconto',
      ctaLink = '#',
      ctaText = 'Garantir Desconto',
      priceInfo = '50% OFF',
      dateRange = 'Válido até 31/12'
    } = data

    return {
      subject: `🔥 ${mainTitle} | ${priceInfo} - ${companyName}`,
      preheader: `${description} | ${dateRange}`,
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 0 40px rgba(239, 68, 68, 0.3);">
          
          <!-- Badge urgente -->
          <tr>
            <td align="center" style="padding: 20px 30px 0;">
              <div style="display: inline-block; background: linear-gradient(135deg, #ef4444, #dc2626); color: #ffffff; padding: 8px 20px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);">
                ⚡ Oferta Por Tempo Limitado
              </div>
            </td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0 0 10px; color: #ffffff; font-size: 48px; font-weight: 900; letter-spacing: -1px; text-shadow: 0 2px 10px rgba(0,0,0,0.3);">${mainTitle}</h1>
              <p style="margin: 0; color: #cbd5e1; font-size: 18px; line-height: 1.5;">${description}</p>
            </td>
          </tr>

          <!-- Desconto destacado -->
          <tr>
            <td align="center" style="padding: 0 40px 30px;">
              <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 16px; padding: 40px; box-shadow: 0 10px 40px rgba(239, 68, 68, 0.4);">
                <p style="margin: 0 0 10px; color: #fee2e2; font-size: 18px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">Desconto Especial</p>
                <p style="margin: 0; color: #ffffff; font-size: 72px; font-weight: 900; line-height: 1; text-shadow: 0 4px 10px rgba(0,0,0,0.3);">${priceInfo}</p>
              </div>
            </td>
          </tr>

          <!-- Destaques -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="33%" align="center" style="padding: 10px;">
                    <div style="background-color: #334155; border-radius: 12px; padding: 20px;">
                      <p style="margin: 0 0 5px; color: #60a5fa; font-size: 32px;">🌎</p>
                      <p style="margin: 0; color: #e2e8f0; font-size: 13px; font-weight: 600;">Todos os Destinos</p>
                    </div>
                  </td>
                  <td width="33%" align="center" style="padding: 10px;">
                    <div style="background-color: #334155; border-radius: 12px; padding: 20px;">
                      <p style="margin: 0 0 5px; color: #34d399; font-size: 32px;">✓</p>
                      <p style="margin: 0; color: #e2e8f0; font-size: 13px; font-weight: 600;">Sem Taxas</p>
                    </div>
                  </td>
                  <td width="33%" align="center" style="padding: 10px;">
                    <div style="background-color: #334155; border-radius: 12px; padding: 20px;">
                      <p style="margin: 0 0 5px; color: #fbbf24; font-size: 32px;">⏰</p>
                      <p style="margin: 0; color: #e2e8f0; font-size: 13px; font-weight: 600;">${dateRange}</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding: 0 40px 40px;">
              <a href="${ctaLink}" style="display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #78350f; text-decoration: none; padding: 20px 50px; border-radius: 50px; font-weight: 800; font-size: 18px; letter-spacing: 0.5px; text-transform: uppercase; box-shadow: 0 6px 25px rgba(251, 191, 36, 0.5); border: 3px solid rgba(255,255,255,0.3);">
                ${ctaText} →
              </a>
              <p style="margin: 15px 0 0; color: #94a3b8; font-size: 12px;">
                ⏳ Vagas limitadas! Não deixe para depois.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 30px; text-align: center;">
              <p style="margin: 0 0 5px; color: #64748b; font-size: 13px; font-weight: 600;">${companyName}</p>
              <p style="margin: 0; color: #475569; font-size: 11px;">
                <a href="#" style="color: #64748b; text-decoration: none;">Descadastrar</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `
    }
  }
}

// Template 4: Cliente Recorrente (Personalizado)
const returningCustomerTemplate: EmailTemplate = {
  id: 'returning-customer',
  name: 'Bem-vindo de Volta',
  description: 'Template personalizado para clientes que já viajaram, com referências à experiência anterior',
  category: 'retention',
  thumbnail: '🎯',
  generate: (data) => {
    const {
      companyName = 'Sua Agência',
      destination = 'novo destino',
      mainTitle = 'Que tal uma nova aventura?',
      description = 'Sabemos que você adora viajar. Temos novidades perfeitas para você!',
      ctaLink = '#',
      ctaText = 'Explorar Destinos',
      keyBenefits = ['Desconto exclusivo para clientes VIP', 'Consultoria personalizada', 'Flexibilidade total']
    } = data

    return {
      subject: `${mainTitle} | Ofertas exclusivas para você`,
      preheader: description,
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fafafa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          
          <!-- Header personalizado -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 40px 50px; text-align: center; position: relative;">
              <div style="background-color: rgba(255,255,255,0.2); display: inline-block; padding: 8px 16px; border-radius: 20px; margin-bottom: 20px;">
                <p style="margin: 0; color: #ffffff; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">⭐ Cliente VIP</p>
              </div>
              <h1 style="margin: 0 0 10px; color: #ffffff; font-size: 36px; font-weight: 800;">${mainTitle}</h1>
              <p style="margin: 0; color: #e0e7ff; font-size: 16px;">${description}</p>
            </td>
          </tr>

          <!-- Conteúdo -->
          <tr>
            <td style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; background: linear-gradient(135deg, #f3e8ff, #ede9fe); border-radius: 12px; padding: 20px 30px;">
                  <p style="margin: 0 0 5px; color: #7c3aed; font-size: 14px; font-weight: 600;">Seu próximo destino</p>
                  <p style="margin: 0; color: #5b21b6; font-size: 28px; font-weight: 800;">${destination}</p>
                </div>
              </div>

              <p style="margin: 0 0 25px; color: #64748b; font-size: 16px; line-height: 1.7; text-align: center;">
                Adoramos ter você conosco novamente! Preparamos algo especial pensando no seu perfil de viajante.
              </p>

              <!-- Benefícios VIP -->
              <div style="background-color: #fefce8; border: 2px dashed #eab308; border-radius: 12px; padding: 25px; margin: 30px 0;">
                <p style="margin: 0 0 15px; color: #713f12; font-size: 16px; font-weight: 700; text-align: center;">🎁 Vantagens Exclusivas</p>
                ${keyBenefits.map(benefit => `
                  <div style="background-color: #ffffff; border-radius: 8px; padding: 12px 15px; margin-bottom: 10px;">
                    <p style="margin: 0; color: #854d0e; font-size: 14px;">
                      <span style="color: #ca8a04; font-weight: 700;">✓</span> ${benefit}
                    </p>
                  </div>
                `).join('')}
              </div>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${ctaLink}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 18px 45px; border-radius: 50px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0; color: #94a3b8; font-size: 13px; text-align: center; font-style: italic;">
                "A melhor viagem é aquela que ainda não fizemos." ✈️
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px; color: #64748b; font-size: 14px; font-weight: 600;">${companyName}</p>
              <p style="margin: 0 0 15px; color: #94a3b8; font-size: 12px;">Obrigado por confiar em nós!</p>
              <p style="margin: 0; color: #cbd5e1; font-size: 11px;">
                <a href="#" style="color: #6366f1; text-decoration: none;">Gerenciar preferências</a> |
                <a href="#" style="color: #94a3b8; text-decoration: none;">Descadastrar</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `
    }
  }
}

// Template 5: Convite para Evento/Webinar
const eventTemplate: EmailTemplate = {
  id: 'event-invitation',
  name: 'Convite para Evento',
  description: 'Template moderno para convites de eventos, webinars, encontros e experiências presenciais',
  category: 'event',
  thumbnail: '🎪',
  generate: (data) => {
    const {
      companyName = 'Sua Agência',
      mainTitle = 'Você está convidado!',
      description = 'Participe do nosso evento exclusivo sobre destinos incríveis',
      ctaLink = '#',
      ctaText = 'Confirmar Presença',
      dateRange = '15 de Janeiro, 19h',
      productName = 'Webinar Destinos 2025'
    } = data

    return {
      subject: `🎪 ${mainTitle} | ${productName}`,
      preheader: `${description} - ${dateRange}`,
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0fdf4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(34, 197, 94, 0.15);">
          
          <!-- Ticket header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center; position: relative;">
              <div style="border: 3px dashed rgba(255,255,255,0.4); border-radius: 12px; padding: 30px;">
                <p style="margin: 0 0 15px; color: #d1fae5; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">Convite Especial</p>
                <h1 style="margin: 0 0 15px; color: #ffffff; font-size: 42px; font-weight: 900; line-height: 1.1;">${mainTitle}</h1>
                <p style="margin: 0; color: #a7f3d0; font-size: 18px; font-weight: 500;">${productName}</p>
              </div>
            </td>
          </tr>

          <!-- Detalhes do evento -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 30px; color: #475569; font-size: 17px; line-height: 1.7; text-align: center;">${description}</p>

              <!-- Info cards -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td width="50%" style="padding-right: 10px;">
                    <div style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); border-radius: 12px; padding: 20px; text-align: center;">
                      <p style="margin: 0 0 8px; font-size: 36px;">📅</p>
                      <p style="margin: 0 0 5px; color: #065f46; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Data e Hora</p>
                      <p style="margin: 0; color: #047857; font-size: 16px; font-weight: 700;">${dateRange}</p>
                    </div>
                  </td>
                  <td width="50%" style="padding-left: 10px;">
                    <div style="background: linear-gradient(135deg, #dbeafe, #bfdbfe); border-radius: 12px; padding: 20px; text-align: center;">
                      <p style="margin: 0 0 8px; font-size: 36px;">🌐</p>
                      <p style="margin: 0 0 5px; color: #1e40af; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Formato</p>
                      <p style="margin: 0; color: #1e3a8a; font-size: 16px; font-weight: 700;">Online</p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- O que você vai aprender -->
              <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 25px; margin: 30px 0;">
                <p style="margin: 0 0 15px; color: #78350f; font-size: 16px; font-weight: 700;">💡 O que você vai descobrir:</p>
                <p style="margin: 0 0 10px; color: #92400e; font-size: 14px; line-height: 1.6;">✓ Destinos tendência para 2025</p>
                <p style="margin: 0 0 10px; color: #92400e; font-size: 14px; line-height: 1.6;">✓ Dicas de economia em viagens</p>
                <p style="margin: 0 0 10px; color: #92400e; font-size: 14px; line-height: 1.6;">✓ Experiências exclusivas</p>
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">✓ Sessão ao vivo de perguntas</p>
              </div>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${ctaLink}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 18px 50px; border-radius: 50px; font-weight: 800; font-size: 17px; letter-spacing: 0.5px; box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4); text-transform: uppercase;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; text-align: center; margin-top: 30px;">
                <p style="margin: 0 0 5px; color: #475569; font-size: 13px; font-weight: 600;">🎁 Bônus Exclusivo</p>
                <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.5;">Participantes ganham 10% de desconto em qualquer pacote reservado até 7 dias após o evento</p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px; color: #64748b; font-size: 14px; font-weight: 600;">${companyName}</p>
              <p style="margin: 0 0 15px; color: #94a3b8; font-size: 12px;">Nos vemos lá! 🎉</p>
              <p style="margin: 0; color: #cbd5e1; font-size: 11px;">
                <a href="#" style="color: #10b981; text-decoration: none;">Adicionar ao calendário</a> |
                <a href="#" style="color: #94a3b8; text-decoration: none;">Descadastrar</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `
    }
  }
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  destinationPackageTemplate,
  newsletterTemplate,
  promotionalTemplate,
  returningCustomerTemplate,
  eventTemplate
]

export function getTemplateById(id: string): EmailTemplate | undefined {
  return EMAIL_TEMPLATES.find(t => t.id === id)
}

export function getTemplatesByCategory(category: string): EmailTemplate[] {
  return EMAIL_TEMPLATES.filter(t => t.category === category)
}
