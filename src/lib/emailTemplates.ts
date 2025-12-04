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
  // Imagens (URLs do Cloudinary ou caminhos locais)
  heroImage?: string
  teamImage1?: string
  teamImage2?: string
  teamImage3?: string
  teamImage4?: string
  locationImage?: string
  logoImage?: string
}

export interface EmailContent {
  subject: string
  preheader: string
  html: string
}

// Template 1: Pacote de Destino Premium
const destinationPackageTemplate: EmailTemplate = {
  id: 'destination-package',
  name: 'Pacote de Destino Premium',
  description: 'Design ultra-moderno com gradientes vibrantes e seções impactantes para destacar destinos paradisíacos',
  category: 'tourism',
  thumbnail: '🏖️',
  generate: (data) => {
    const {
      companyName = 'Sua Agência',
      destination = 'Destino Incrível',
      mainTitle = `Descubra ${destination}`,
      description = 'Uma experiência única que você não vai esquecer',
      ctaLink = '#',
      ctaText = 'Reservar Agora',
      keyBenefits = ['Guias especializados', 'Hospedagem 5 estrelas', 'Transfer incluído'],
      priceInfo = 'A partir de R$ 2.999',
      dateRange = 'Saídas diárias'
    } = data

    return {
      subject: `✈️ ${mainTitle} - Oferta Exclusiva ${companyName}`,
      preheader: `${description} | ${dateRange} | ${priceInfo}`,
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${mainTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  </style>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px 10px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
          <tr>
            <td style="padding: 30px 40px; background: #ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; color: #1e293b; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">${companyName}</h1>
                  </td>
                  <td align="right">
                    <span style="color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">Premium Travel</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="position: relative; padding: 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background: linear-gradient(135deg, rgba(102,126,234,0.95) 0%, rgba(118,75,162,0.95) 100%); padding: 60px 40px; text-align: center;">
                    <p style="margin: 0 0 10px; color: #e0e7ff; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px;">🌟 OFERTA EXCLUSIVA</p>
                    <h2 style="margin: 0 0 15px; color: #ffffff; font-size: 42px; font-weight: 800; line-height: 1.1; letter-spacing: -1px;">${mainTitle}</h2>
                    <p style="margin: 0; color: #c7d2fe; font-size: 18px; font-weight: 500; max-width: 450px; margin: 0 auto;">${description}</p>
                    <div style="display: inline-block; background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); border: 2px solid rgba(255,255,255,0.3); border-radius: 50px; padding: 12px 28px; margin-top: 25px;">
                      <p style="margin: 0; color: #ffffff; font-size: 15px; font-weight: 700;">📍 ${destination}</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 50px 40px;">
              <h3 style="margin: 0 0 30px; color: #1e293b; font-size: 24px; font-weight: 800; text-align: center;">✨ Experiência Completa</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${keyBenefits.map((benefit, index) => `
                  <tr>
                    <td style="padding: 15px 0;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="50" style="vertical-align: top;">
                            <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #ffffff; font-weight: 800; text-align: center; line-height: 44px;">${index + 1}</div>
                          </td>
                          <td style="padding-left: 15px;">
                            <p style="margin: 0; color: #334155; font-size: 16px; font-weight: 600; line-height: 1.5;">${benefit}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                `).join('')}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 16px; overflow: hidden; border: 2px solid #e2e8f0;">
                <tr>
                  <td width="50%" style="padding: 30px; text-align: center; border-right: 2px solid #e2e8f0;">
                    <p style="margin: 0 0 8px; color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">💰 Investimento</p>
                    <p style="margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 28px; font-weight: 800;">${priceInfo}</p>
                  </td>
                  <td width="50%" style="padding: 30px; text-align: center;">
                    <p style="margin: 0 0 8px; color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">📅 Saídas</p>
                    <p style="margin: 0; color: #1e293b; font-size: 18px; font-weight: 700;">${dateRange}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 50px;" align="center">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50px; box-shadow: 0 10px 30px rgba(102,126,234,0.4);">
                    <a href="${ctaLink}" style="display: inline-block; padding: 20px 50px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 700; letter-spacing: 0.5px;">
                      ${ctaText} →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 20px 0 0; color: #64748b; font-size: 13px;">
                💬 <strong>Dúvidas?</strong> Nossa equipe está pronta para ajudar!
              </p>
            </td>
          </tr>
          <tr>
            <td style="background: #0f172a; padding: 40px; text-align: center;">
              <p style="margin: 0 0 5px; color: #ffffff; font-size: 16px; font-weight: 700;">${companyName}</p>
              <p style="margin: 0 0 20px; color: #94a3b8; font-size: 13px;">Transformando sonhos em realidade desde 2024</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0; color: #64748b; font-size: 11px; line-height: 1.6;">
                      © 2024 ${companyName}. Todos os direitos reservados.<br>
                      <a href="#" style="color: #667eea; text-decoration: none;">Preferências</a> | 
                      <a href="#" style="color: #667eea; text-decoration: none;">Descadastrar</a>
                    </p>
                  </td>
                </tr>
              </table>
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

// Template 2: Newsletter Magazine-Style Ultra Moderna
const newsletterTemplate: EmailTemplate = {
  id: 'newsletter',
  name: 'Newsletter Magazine Premium',
  description: 'Newsletter estilo revista com layout editorial sofisticado, seções em cards e tipografia impecável',
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
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@400;600;700&display=swap');
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #fafafa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; padding: 20px 10px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding: 35px 40px 25px; border-bottom: 1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="70%">
                    <h1 style="margin: 0 0 5px; color: #0f172a; font-size: 30px; font-weight: 900; letter-spacing: -1px; font-family: 'Playfair Display', serif;">${companyName}</h1>
                    <p style="margin: 0; color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">Travel Magazine</p>
                  </td>
                  <td width="30%" align="right" style="vertical-align: bottom;">
                    <p style="margin: 0; color: #94a3b8; font-size: 12px; font-weight: 600;">${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 40px 35px;">
              <p style="margin: 0 0 8px; color: #8b5cf6; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2.5px;">✦ EDIÇÃO ESPECIAL</p>
              <h2 style="margin: 0 0 18px; color: #1e293b; font-size: 38px; font-weight: 900; line-height: 1.1; letter-spacing: -0.8px; font-family: 'Playfair Display', serif;">${mainTitle}</h2>
              <p style="margin: 0; color: #475569; font-size: 17px; font-weight: 400; line-height: 1.7; max-width: 480px;">${description}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 35px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
                <tr>
                  <td style="padding: 30px;">
                    <div style="width: 50px; height: 3px; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 3px; margin-bottom: 18px;"></div>
                    <h3 style="margin: 0 0 12px; color: #0f172a; font-size: 22px; font-weight: 800; letter-spacing: -0.3px;">🌴 Destino em Destaque</h3>
                    <p style="margin: 0 0 18px; color: #334155; font-size: 15px; line-height: 1.7;">
                      Descubra praias paradisíacas, cultura vibrante e gastronomia excepcional. Um destino que combina aventura, relaxamento e experiências autênticas.
                    </p>
                    <a href="${ctaLink}" style="color: #667eea; text-decoration: none; font-weight: 700; font-size: 14px; letter-spacing: 0.3px;">
                      Explorar este destino →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 35px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="48%" style="vertical-align: top; padding-right: 10px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-radius: 14px; border: 1px solid #fde68a; overflow: hidden; height: 100%;">
                      <tr>
                        <td style="padding: 25px;">
                          <div style="width: 45px; height: 3px; background: linear-gradient(90deg, #f59e0b, #d97706); border-radius: 3px; margin-bottom: 15px;"></div>
                          <h3 style="margin: 0 0 10px; color: #78350f; font-size: 18px; font-weight: 800;">💡 Dica Expert</h3>
                          <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                            Reserve com 60+ dias e garanta até 30% OFF em pacotes selecionados.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="48%" style="vertical-align: top; padding-left: 10px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%); border-radius: 14px; border: 1px solid #c4b5fd; overflow: hidden; height: 100%;">
                      <tr>
                        <td style="padding: 25px;">
                          <div style="width: 45px; height: 3px; background: linear-gradient(90deg, #8b5cf6, #7c3aed); border-radius: 3px; margin-bottom: 15px;"></div>
                          <h3 style="margin: 0 0 10px; color: #5b21b6; font-size: 18px; font-weight: 800;">🎁 Exclusivo</h3>
                          <p style="margin: 0; color: #6b21a8; font-size: 14px; line-height: 1.6;">
                            Primeira viagem com 15% OFF usando cupom <strong>PRIMEIRA15</strong>.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 15px 40px;">
              <div style="height: 1px; background: linear-gradient(90deg, transparent, #e2e8f0, transparent);"></div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 30px 40px 40px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 12px; box-shadow: 0 8px 24px rgba(15,23,42,0.25);">
                    <a href="${ctaLink}" style="display: inline-block; padding: 18px 45px; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; letter-spacing: 0.5px;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background: #f8fafc; padding: 35px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px; color: #334155; font-size: 14px; font-weight: 700;">${companyName}</p>
              <p style="margin: 0 0 18px; color: #64748b; font-size: 12px; font-style: italic;">Sua próxima aventura começa aqui ✈️</p>
              <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                <a href="#" style="color: #667eea; text-decoration: none; font-weight: 600;">Preferências</a> · 
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

// Template 3: Promocional Ultra Urgente - Neon Power
const promotionalTemplate: EmailTemplate = {
  id: 'promotional',
  name: 'Flash Sale Neon',
  description: 'Design ultra-vibrante com gradientes neon, efeitos de urgência e elementos de gamificação para máxima conversão',
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
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@700;800;900&display=swap');
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
  </style>
</head>
<body style="margin: 0; padding: 0; background: #050505;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, #0a0a0a 0%, #1a0a0f 100%); padding: 20px 10px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: linear-gradient(135deg, #1a0a14 0%, #2a1520 100%); border-radius: 20px; overflow: visible; box-shadow: 0 0 60px rgba(255, 20, 147, 0.4), 0 0 120px rgba(138, 43, 226, 0.2);">
          <tr>
            <td align="center" style="padding: 25px 30px 0; position: relative;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background: linear-gradient(135deg, #ff1493 0%, #ff6b6b 50%, #ffd700 100%); border-radius: 30px; padding: 3px; box-shadow: 0 0 25px rgba(255,20,147,0.6);">
                    <div style="background: #1a0a14; border-radius: 27px; padding: 10px 24px;">
                      <p style="margin: 0; background: linear-gradient(135deg, #ff1493, #ffd700); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">
                        ⚡ TEMPO LIMITADO ⚡
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 35px 35px 25px; text-align: center;">
              <h1 style="margin: 0 0 15px; background: linear-gradient(135deg, #ff1493 0%, #8a2be2 50%, #4169e1 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 56px; font-weight: 900; letter-spacing: -2px; text-shadow: 0 0 40px rgba(255,20,147,0.5); line-height: 1;">${mainTitle}</h1>
              <p style="margin: 0; color: #e2b8d4; font-size: 17px; font-weight: 600; line-height: 1.5;">${description}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 35px 30px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="background: linear-gradient(135deg, #ff1493 0%, #ff6b6b 50%, #ffd700 100%); border-radius: 20px; padding: 4px; box-shadow: 0 15px 50px rgba(255,20,147,0.5), 0 0 80px rgba(138,43,226,0.3);">
                    <div style="background: linear-gradient(135deg, #2a0a1e 0%, #3a1528 100%); border-radius: 16px; padding: 45px 35px; text-align: center;">
                      <p style="margin: 0 0 12px; color: #ff8dc7; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 3px;">💎 DESCONTO EXCLUSIVO</p>
                      <p style="margin: 0; background: linear-gradient(135deg, #ffffff 0%, #ffd700 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 84px; font-weight: 900; line-height: 0.9; text-shadow: 0 4px 20px rgba(255,215,0,0.4);">${priceInfo}</p>
                      <p style="margin: 12px 0 0; color: #c084a8; font-size: 14px; font-weight: 700;">Em todos os pacotes</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 35px 35px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="32%" align="center" style="padding: 8px;">
                    <div style="background: linear-gradient(135deg, rgba(65,105,225,0.15) 0%, rgba(138,43,226,0.15) 100%); border: 2px solid rgba(65,105,225,0.3); border-radius: 14px; padding: 22px 15px; box-shadow: 0 0 20px rgba(65,105,225,0.2);">
                      <p style="margin: 0 0 8px; font-size: 36px; filter: drop-shadow(0 0 10px rgba(65,105,225,0.8));">🌍</p>
                      <p style="margin: 0; color: #a3c3ff; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Todos Destinos</p>
                    </div>
                  </td>
                  <td width="32%" align="center" style="padding: 8px;">
                    <div style="background: linear-gradient(135deg, rgba(255,20,147,0.15) 0%, rgba(255,107,107,0.15) 100%); border: 2px solid rgba(255,20,147,0.3); border-radius: 14px; padding: 22px 15px; box-shadow: 0 0 20px rgba(255,20,147,0.2);">
                      <p style="margin: 0 0 8px; font-size: 36px; filter: drop-shadow(0 0 10px rgba(255,20,147,0.8));">⚡</p>
                      <p style="margin: 0; color: #ffadd2; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Sem Taxas</p>
                    </div>
                  </td>
                  <td width="32%" align="center" style="padding: 8px;">
                    <div style="background: linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,140,0,0.15) 100%); border: 2px solid rgba(255,215,0,0.3); border-radius: 14px; padding: 22px 15px; box-shadow: 0 0 20px rgba(255,215,0,0.2);">
                      <p style="margin: 0 0 8px; font-size: 36px; filter: drop-shadow(0 0 10px rgba(255,215,0,0.8));">⏰</p>
                      <p style="margin: 0; color: #ffe78a; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${dateRange}</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 35px 45px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%); border-radius: 60px; padding: 4px; box-shadow: 0 12px 35px rgba(255,215,0,0.5), 0 0 60px rgba(255,140,0,0.3);">
                    <a href="${ctaLink}" style="display: block; background: linear-gradient(135deg, #ffd700 0%, #ffa500 100%); color: #1a0a00; text-decoration: none; padding: 22px 55px; border-radius: 56px; font-weight: 900; font-size: 18px; letter-spacing: 1px; text-transform: uppercase; text-shadow: 0 2px 4px rgba(255,255,255,0.3);">
                      ${ctaText} 🚀
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 18px 0 0; color: #8a6b7a; font-size: 13px; font-weight: 600;">
                ⏰ <strong style="color: #ff8dc7;">ÚLTIMAS UNIDADES!</strong> Ação termina em breve.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background: #0f0508; padding: 32px 35px; text-align: center; border-top: 1px solid rgba(255,20,147,0.15);">
              <p style="margin: 0 0 6px; color: #6a4a5a; font-size: 13px; font-weight: 700;">${companyName}</p>
              <p style="margin: 0; color: #4a3a4a; font-size: 11px;">
                <a href="#" style="color: #6a4a5a; text-decoration: none; font-weight: 600;">Descadastrar</a>
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

// Template 4: VIP Cliente Recorrente - Luxo Personalizado
const returningCustomerTemplate: EmailTemplate = {
  id: 'returning-customer',
  name: 'Bem-vindo de Volta VIP',
  description: 'Template premium personalizado com design luxuoso, elementos VIP e tratamento exclusivo para clientes recorrentes',
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
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Inter:wght@400;600;700&display=swap');
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
  </style>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); padding: 20px 10px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(139,92,246,0.15), 0 0 1px rgba(139,92,246,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%); padding: 45px 40px 55px; text-align: center; position: relative;">
              <div style="margin-bottom: 22px;">
                <table cellpadding="0" cellspacing="0" border="0" align="center">
                  <tr>
                    <td style="background: rgba(255,255,255,0.25); backdrop-filter: blur(10px); border: 2px solid rgba(255,255,255,0.4); border-radius: 25px; padding: 10px 22px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                      <p style="margin: 0; color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2.5px;">⭐ CLIENTE VIP</p>
                    </td>
                  </tr>
                </table>
              </div>
              <h1 style="margin: 0 0 14px; color: #ffffff; font-size: 42px; font-weight: 700; letter-spacing: -0.5px; font-family: 'Cormorant Garamond', serif; line-height: 1.1;">${mainTitle}</h1>
              <p style="margin: 0; color: #f3e8ff; font-size: 17px; font-weight: 500; max-width: 450px; display: inline-block; line-height: 1.5;">${description}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 40px 40px 30px;">
              <table cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border: 2px solid #e9d5ff; border-radius: 16px; padding: 28px 35px; box-shadow: 0 4px 16px rgba(139,92,246,0.08);">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px; color: #7c3aed; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">🌍 Seu Próximo Destino</p>
                    <p style="margin: 0; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 34px; font-weight: 800; letter-spacing: -0.5px; font-family: 'Cormorant Garamond', serif;">${destination}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px;">
              <p style="margin: 0; color: #475569; font-size: 16px; line-height: 1.8; text-align: center; font-style: italic;">
                Adoramos ter você conosco novamente! 🌟 Preparamos algo especial pensando no seu perfil de viajante.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 35px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border: 2px solid #fde68a; border-radius: 16px; overflow: hidden;">
                <tr>
                  <td style="padding: 30px;">
                    <p style="margin: 0 0 20px; color: #78350f; font-size: 17px; font-weight: 800; text-align: center; letter-spacing: 0.3px;">🎁 Vantagens Exclusivas VIP</p>
                    ${keyBenefits.map((benefit, index) => `
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: ${index < keyBenefits.length - 1 ? '12px' : '0'};">
                        <tr>
                          <td style="background: #ffffff; border-radius: 10px; padding: 16px 18px; box-shadow: 0 2px 8px rgba(120,53,15,0.08);">
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td width="30" style="vertical-align: middle;">
                                  <div style="width: 24px; height: 24px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 12px; font-weight: 900; text-align: center; line-height: 24px;">✓</div>
                                </td>
                                <td style="padding-left: 12px;">
                                  <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600; line-height: 1.4;">${benefit}</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    `).join('')}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 40px 35px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 50px; box-shadow: 0 8px 25px rgba(124,58,237,0.35);">
                    <a href="${ctaLink}" style="display: inline-block; padding: 20px 48px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 700; letter-spacing: 0.5px;">
                      ${ctaText} ✨
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px;">
              <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-left: 4px solid #c084fc; border-radius: 12px; padding: 22px 25px;">
                <p style="margin: 0; color: #64748b; font-size: 14px; font-style: italic; text-align: center; line-height: 1.7;">
                  “A melhor viagem é aquela que ainda não fizemos.” ✈️
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); padding: 35px 40px; text-align: center; border-top: 1px solid #e9d5ff;">
              <p style="margin: 0 0 8px; color: #334155; font-size: 15px; font-weight: 700;">${companyName}</p>
              <p style="margin: 0 0 18px; color: #64748b; font-size: 12px; font-style: italic;">Obrigado por confiar em nós! 💜</p>
              <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                <a href="#" style="color: #7c3aed; text-decoration: none; font-weight: 600;">Gerenciar preferências</a> · 
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

// Template 5: Pacote de Viagem Premium - Baseado em Brevo Design
const eventTemplate: EmailTemplate = {
  id: 'event-invitation',
  name: 'Pacote de Viagem Premium',
  description: 'Design profissional baseado no padrão Brevo com logo, divisor, hero image, descrição, botão CTA, seção de pacotes inclusos com imagens e footer com redes sociais',
  category: 'tourism',
  thumbnail: '✈️',
  generate: (data) => {
    const {
      companyName = 'Sua Agência',
      destination = 'Destino Incrível',
      mainTitle = `Descubra ${destination}`,
      description = 'Bem-vindo ao pacote premium! Uma experiência única que você não vai esquecer com hospedagem de luxo, guias especializados e momentos inesquecíveis.',
      ctaLink = '#',
      ctaText = 'Reservar Pacote',
      priceInfo = 'A partir de R$ 3.299',
      // ✅ IMAGENS REAIS DO CLOUDINARY (PNG)
      heroImage = 'https://res.cloudinary.com/ddq2asu2s/image/upload/v1764878757/hero-destino-premium_aqxwu4.png',
      teamImage1 = 'https://res.cloudinary.com/ddq2asu2s/image/upload/v1764878755/hospedagem-luxo_rolilw.png',
      teamImage2 = 'https://res.cloudinary.com/ddq2asu2s/image/upload/v1764878756/refeicoes-gourmet_nfvrwc.png',
      teamImage3 = 'https://res.cloudinary.com/ddq2asu2s/image/upload/v1764878756/guias-experientes_yerqfr.png',
      teamImage4 = 'https://res.cloudinary.com/ddq2asu2s/image/upload/v1764878756/transporte-incluso_vnvsm5.png',
      // ⚠️ Logo continua vindo do data (permite customização)
      logoImage = data.logoImage || 'https://via.placeholder.com/95x36?text=Logo'
    } = data;

    return {
      subject: `✈️ ${mainTitle} | ${destination}`,
      preheader: `${description} - ${priceInfo}`,
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Arial', 'Helvetica', sans-serif; margin: 0; padding: 0; }
    a { color: #4f1337; text-decoration: none; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff;">
          <tr>
            <td align="center" style="padding: 10px 30px 5px 30px;">
              <p style="margin: 0; text-align: center;">
                <a href="#" style="font-size: 12px; color: #26081a;">Visualizar no navegador</a>
              </p>
            </td>
          </tr>

          <!-- LOGO -->
          <tr>
            <td align="center" style="background-color: #ffffff; padding: 14px 0;">
              <img src="${logoImage}" alt="${companyName}" style="width: 95px; height: auto; display: block;">
            </td>
          </tr>

          <tr>
            <td style="border-top: 1px solid #26081a; height: 0; margin: 0; padding: 0;"></td>
          </tr>

          <!-- HERO -->
          <tr>
            <td align="center" style="padding: 40px 32px 0 32px;">
              <img src="${heroImage}" alt="${destination}" style="width: 100%; max-width: 536px; height: auto; display: block; border-radius: 8px;">
            </td>
          </tr>

          <!-- TÍTULO -->
          <tr>
            <td align="left" style="padding: 8px 32px 0 32px;">
              <h2 style="margin: 0; color: #4f1337; font-family: 'Arial Black', Arial, sans-serif; font-size: 28px; font-weight: bold; line-height: 1.1;">
                ${mainTitle}
              </h2>
            </td>
          </tr>

          <!-- DESCRIÇÃO -->
          <tr>
            <td align="left" style="padding: 8px 32px 0 32px;">
              <p style="margin: 0; color: #26081a; font-size: 16px; line-height: 1.5;">
                ${description}
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding: 8px 32px 0 32px;">
              <table cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td style="background-color: #4f1337; border-radius: 8px; padding: 11px 5px; text-align: center;">
                    <a href="${ctaLink}" style="display: inline-block; padding: 11px 43px; background-color: #4f1337; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 8px;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DIVISOR -->
          <tr>
            <td align="center" style="padding: 40px 0 0 0;">
              <div style="width: 100%; border-top: 8px dotted #4f1337; margin: 0;"></div>
            </td>
          </tr>

          <!-- O QUE ESTÁ INCLUÍDO -->
          <tr>
            <td align="left" style="padding: 40px 32px 0 32px;">
              <h2 style="margin: 0 0 8px 0; color: #4f1337; font-family: 'Arial Black', Arial, sans-serif; font-size: 24px; font-weight: bold;">
                O que está incluído
              </h2>
              <p style="margin: 0; color: #26081a; font-size: 16px; line-height: 1.5;">
                Nossos pacotes premium incluem tudo o que você precisa para uma experiência inesquecível e segura.
              </p>
            </td>
          </tr>

          <!-- GRID 2x2 -->
          <tr>
            <td align="center" style="padding: 16px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                <tr>
                  <td width="50%" align="center" style="padding-right: 8px; padding-bottom: 0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <img src="${teamImage1}" alt="Hospedagem Luxo" style="width: 100%; max-width: 244px; height: auto; border-radius: 400px; display: block;">
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-top: 8px;">
                          <p style="margin: 0; color: #26081a; font-size: 16px; font-weight: normal;">Hospedagem Luxo</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="50%" align="center" style="padding-left: 8px; padding-bottom: 0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <img src="${teamImage2}" alt="Refeições Gourmet" style="width: 100%; max-width: 244px; height: auto; border-radius: 400px; display: block;">
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-top: 8px;">
                          <p style="margin: 0; color: #26081a; font-size: 16px; font-weight: normal;">Refeições Gourmet</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" align="center" style="padding-right: 8px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <img src="${teamImage3}" alt="Guias Experientes" style="width: 100%; max-width: 244px; height: auto; border-radius: 400px; display: block;">
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-top: 8px;">
                          <p style="margin: 0; color: #26081a; font-size: 16px; font-weight: normal;">Guias Experientes</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="50%" align="center" style="padding-left: 8px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <img src="${teamImage4}" alt="Transporte Incluído" style="width: 100%; max-width: 244px; height: auto; border-radius: 400px; display: block;">
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-top: 8px;">
                          <p style="margin: 0; color: #26081a; font-size: 16px; font-weight: normal;">Transporte Incluído</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- INFORMAÇÕES DO PACOTE -->
          <tr>
            <td align="left" style="padding: 40px 32px 0 32px;">
              <h2 style="margin: 0 0 8px 0; color: #4f1337; font-family: 'Arial Black', Arial, sans-serif; font-size: 24px; font-weight: bold;">
                Informações do Pacote
              </h2>
              <p style="margin: 0; color: #26081a; font-size: 16px; line-height: 1.5;">
                Nossos pacotes para ${destination} saem regularmente durante o ano. Consulte a melhor data para sua viagem e aproveite as melhores promoções.
              </p>
            </td>
          </tr>

          <!-- PREÇO -->
          <tr>
            <td align="center" style="padding: 24px 32px 0 32px;">
              <p style="margin: 0; color: #4f1337; font-size: 28px; font-weight: bold;">${priceInfo}</p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: #e7e7e7; padding: 32px 32px; text-align: center; margin-top: 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" align="center" style="margin-bottom: 24px;">
                <tr align="center">
                  <td style="padding: 5px;">
                    <a href="#" style="display: inline-block;">
                      <img src="https://creative-assets.mailinblue.com/editor/social-icons/rounded_colored/facebook_32px.png" alt="Facebook" style="width: 32px; height: 32px; display: block;">
                    </a>
                  </td>
                  <td style="padding: 5px;">
                    <a href="#" style="display: inline-block;">
                      <img src="https://creative-assets.mailinblue.com/editor/social-icons/rounded_colored/instagram_32px.png" alt="Instagram" style="width: 32px; height: 32px; display: block;">
                    </a>
                  </td>
                  <td style="padding: 5px;">
                    <a href="#" style="display: inline-block;">
                      <img src="https://creative-assets.mailinblue.com/editor/social-icons/rounded_colored/linkedin_32px.png" alt="LinkedIn" style="width: 32px; height: 32px; display: block;">
                    </a>
                  </td>
                  <td style="padding: 5px;">
                    <a href="#" style="display: inline-block;">
                      <img src="https://creative-assets.mailinblue.com/editor/social-icons/rounded_colored/youtube_32px.png" alt="YouTube" style="width: 32px; height: 32px; display: block;">
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px 0; color: #334155; font-size: 15px; font-weight: bold;">${companyName}</p>
              <p style="margin: 0 0 18px 0; color: #64748b; font-size: 12px;">Sua próxima aventura te espera! ✈️</p>

              <table width="100%" cellpadding="0" cellspacing="0" align="center" style="margin-bottom: 24px;">
                <tr align="center">
                  <td style="padding: 0 8px; font-size: 12px;">
                    <a href="#" style="color: #26081a; text-decoration: none;">Download App</a>
                  </td>
                  <td style="padding: 15px 8px 0 8px; font-size: 12px;">
                    <a href="#" style="color: #26081a; text-decoration: none;">Reservar</a>
                  </td>
                  <td style="padding: 15px 8px 0 8px; font-size: 12px;">
                    <a href="#" style="color: #26081a; text-decoration: none;">Contato</a>
                  </td>
                  <td style="padding: 15px 8px 0 8px; font-size: 12px;">
                    <a href="#" style="color: #26081a; text-decoration: none;">Descadastrar</a>
                  </td>
                </tr>
              </table>

              <img src="${logoImage}" alt="${companyName}" style="width: 95px; height: auto; display: block; margin: 40px auto 0;">
              <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 11px;">Você recebeu este e-mail porque se inscreveu em nosso boletim informativo.</p>
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