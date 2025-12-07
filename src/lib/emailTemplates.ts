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

// Template 1: Pacote de Destino Premium - HERO FULL + SIDEBAR CARDS
const destinationPackageTemplate: EmailTemplate = {
  id: 'destination-package',
  name: 'Pacote de Destino Premium',
  description: 'Design com hero full-width, cards laterais flutuantes e layout magazine com imagens verticais',
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
      dateRange = 'Saídas diárias',
      heroImage = data.heroImage?.trim() || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop',
      teamImage1 = data.teamImage1?.trim() || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=280&h=400&fit=crop',
      teamImage2 = data.teamImage2?.trim() || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=280&h=400&fit=crop',
      teamImage3 = data.teamImage3?.trim() || 'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=280&h=200&fit=crop',
      teamImage4 = data.teamImage4?.trim() || 'https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=280&h=200&fit=crop',
      logoImage = data.logoImage?.trim() || 'https://images.unsplash.com/photo-1499678329028-101435549a4e?w=200&h=80&fit=crop'
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
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #e8f4f8 0%, #f0f9ff 100%); font-family: 'Segoe UI', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #e8f4f8 0%, #f0f9ff 100%); padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- HEADER COM LOGO -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: rgba(255,255,255,0.98); border-radius: 20px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.08); border: 1px solid #e0f2fe;">
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 25px;">
              <img src="${logoImage}" alt="${companyName}" width="200" height="80" style="height: 60px; width: auto; max-width: 180px; display: block; margin: 0 auto; opacity: 0.9;">
            </td>
          </tr>
          
          <!-- HERO FULL WIDTH -->
          <tr>
            <td style="padding: 0;">
              <img src="${heroImage}" alt="${destination}" width="600" height="400" style="width: 100%; height: auto; display: block; border-radius: 0;">
            </td>
          </tr>

          <!-- TÍTULO -->
          <tr>
            <td style="padding: 30px 30px 10px 30px;">
              <h1 style="margin: 0; color: #0f172a; font-size: 36px; font-weight: 700; line-height: 1.2;">${mainTitle}</h1>
            </td>
          </tr>

          <!-- DESCRIÇÃO + PREÇO SIDEBAR -->
          <tr>
            <td style="padding: 20px 30px 35px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="65%" style="vertical-align: top; padding-right: 20px;">
                    <p style="margin: 0 0 20px 0; color: #2d3748; font-size: 17px; line-height: 1.7;">${description}</p>
                    <h3 style="margin: 0 0 15px 0; color: #0ea5e9; font-size: 20px; font-weight: 600;">✨ Incluso no pacote:</h3>
                    <ul style="margin: 0; padding-left: 20px; color: #4a5568; font-size: 15px; line-height: 1.8;">
                      ${keyBenefits.map(benefit => `<li style="margin-bottom: 8px;">${benefit}</li>`).join('')}
                    </ul>
                  </td>
                  <td width="35%" style="vertical-align: top;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); border-radius: 15px; padding: 25px 20px; text-align: center; box-shadow: 0 4px 15px rgba(14,165,233,0.2);">
                      <tr>
                        <td>
                          <p style="margin: 0 0 8px 0; color: rgba(255,255,255,0.95); font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">A partir de</p>
                          <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 28px; font-weight: 700;">${priceInfo.replace('A partir de ', '')}</p>
                          <p style="margin: 0 0 20px 0; color: rgba(255,255,255,0.9); font-size: 12px;">${dateRange}</p>
                          <a href="${ctaLink}" style="display: block; background: #ffffff; color: #0284c7; padding: 14px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">${ctaText}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- GALERIA VERTICAL 2 ALTAS + 2 HORIZONTAIS -->
          <tr>
            <td style="padding: 0 30px 35px 30px;">
              <h3 style="margin: 0 0 20px 0; color: #0f172a; font-size: 24px; font-weight: 600; text-align: center;">📸 Momentos Inesquecíveis</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="48%" style="padding-right: 10px; vertical-align: top;">
                    <img src="${teamImage1}" alt="Galeria 1" width="280" height="400" style="width: 100%; height: auto; border-radius: 12px; margin-bottom: 12px; display: block;">
                  </td>
                  <td width="48%" style="padding-left: 10px; vertical-align: top;">
                    <img src="${teamImage2}" alt="Galeria 2" width="280" height="400" style="width: 100%; height: auto; border-radius: 12px; margin-bottom: 12px; display: block;">
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top: 12px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="48%" style="padding-right: 6px;">
                          <img src="${teamImage3}" alt="Galeria 3" width="280" height="200" style="width: 100%; height: auto; border-radius: 12px; display: block;">
                        </td>
                        <td width="48%" style="padding-left: 6px;">
                          <img src="${teamImage4}" alt="Galeria 4" width="280" height="200" style="width: 100%; height: auto; border-radius: 12px; display: block;">
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 30px; text-align: center; border-top: 2px solid #0ea5e9;">
              <p style="margin: 0 0 10px 0; color: #0f172a; font-size: 16px; font-weight: 600;">${companyName}</p>
              <p style="margin: 0 0 20px 0; color: #64748b; font-size: 13px;">Transformando sonhos em viagens ✈️</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr align="center">
                  <td style="padding: 0 10px; font-size: 12px;">
                    <a href="#" style="color: #0ea5e9; text-decoration: none; font-weight: 500;">Política de Privacidade</a>
                  </td>
                  <td style="padding: 0 10px; font-size: 12px; color: #cbd5e0;">•</td>
                  <td style="padding: 0 10px; font-size: 12px;">
                    <a href="#" style="color: #667eea; text-decoration: none; font-weight: 600;">Contato</a>
                  </td>
                  <td style="padding: 0 10px; font-size: 12px; color: #cbd5e0;">•</td>
                  <td style="padding: 0 10px; font-size: 12px;">
                    <a href="#" style="color: #a0aec0; text-decoration: none;">Descadastrar</a>
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

// Template 2: Newsletter Magazine-Style - MINIMALISTA GRID MASONRY
const newsletterTemplate: EmailTemplate = {
  id: 'newsletter',
  name: 'Newsletter Magazine Premium',
  description: 'Newsletter minimalista com grid assimétrico estilo Pinterest, tipografia serif elegante e espaçamento generoso',
  category: 'newsletter',
  thumbnail: '📰',
  generate: (data) => {
    const {
      companyName = 'Sua Agência',
      mainTitle = 'Novidades do Mês',
      description = 'Confira os melhores destinos e dicas para sua próxima viagem',
      ctaLink = '#',
      ctaText = 'Ver Todas as Ofertas',
      keyBenefits = ['Destinos exclusivos', 'Dicas de viagem', 'Ofertas especiais'],
      heroImage = data.heroImage?.trim() || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&h=300&fit=crop',
      teamImage1 = data.teamImage1?.trim() || 'https://images.unsplash.com/photo-1504150558240-0b4fd8946624?w=380&h=280&fit=crop',
      teamImage2 = data.teamImage2?.trim() || 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=180&h=280&fit=crop',
      teamImage3 = data.teamImage3?.trim() || 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=280&h=180&fit=crop',
      teamImage4 = data.teamImage4?.trim() || 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=280&h=180&fit=crop',
      logoImage = data.logoImage?.trim() || 'https://images.unsplash.com/photo-1499678329028-101435549a4e?w=150&h=50&fit=crop'
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
  <title>${mainTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: 'Georgia', serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff;">
          <!-- LOGO MINIMALISTA -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px; border-bottom: 1px solid #f1f5f9;">
              <img src="${logoImage}" alt="${companyName}" width="150" height="50" style="height: 50px; width: auto; max-width: 150px; display: block; margin: 0 auto;">
            </td>
          </tr>
          
          <!-- HERO WIDE BAIXO -->
          <tr>
            <td style="padding: 0;">
              <img src="${heroImage}" alt="${mainTitle}" width="600" height="300" style="width: 100%; height: auto; display: block;">
            </td>
          </tr>

          <!-- TÍTULO E DESCRIÇÃO COM MUITO ESPAÇO -->
          <tr>
            <td style="padding: 50px 40px 30px 40px;">
              <h1 style="margin: 0 0 20px 0; color: #0f172a; font-size: 40px; font-weight: normal; line-height: 1.2; font-family: 'Georgia', serif; letter-spacing: -0.5px;">${mainTitle}</h1>
              <p style="margin: 0; color: #475569; font-size: 18px; line-height: 1.8; font-family: 'Georgia', serif;">${description}</p>
            </td>
          </tr>

          <!-- GRID MASONRY ASSIMÉTRICO -->
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- Imagem 1 GRANDE -->
                  <td width="68%" style="vertical-align: top; padding-right: 10px; padding-bottom: 10px;">
                    <img src="${teamImage1}" alt="Destaque 1" width="380" height="280" style="width: 100%; height: auto; display: block; border-radius: 2px;">
                  </td>
                  <!-- Imagem 2 ESTREITA ALTA -->
                  <td width="30%" style="vertical-align: top; padding-left: 0;">
                    <img src="${teamImage2}" alt="Destaque 2" width="180" height="280" style="width: 100%; height: auto; display: block; border-radius: 2px;">
                  </td>
                </tr>
                <tr>
                  <!-- Imagens 3 e 4 LADO A LADO -->
                  <td colspan="2" style="padding-top: 10px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="49%" style="padding-right: 5px;">
                          <img src="${teamImage3}" alt="Destaque 3" width="280" height="180" style="width: 100%; height: auto; display: block; border-radius: 2px;">
                        </td>
                        <td width="49%" style="padding-left: 5px;">
                          <img src="${teamImage4}" alt="Destaque 4" width="280" height="180" style="width: 100%; height: auto; display: block; border-radius: 2px;">
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- LISTA MINIMALISTA -->
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <div style="border-top: 1px solid #e5e7eb; padding-top: 30px;">
                <h3 style="margin: 0 0 25px 0; color: #2d3748; font-size: 14px; font-weight: normal; text-transform: uppercase; letter-spacing: 2px; font-family: Arial, sans-serif;">Nesta Edição</h3>
                ${keyBenefits.map((benefit, index) => `
                  <p style="margin: ${index === 0 ? '0' : '15px'} 0 0 0; padding-bottom: 15px; ${index < keyBenefits.length - 1 ? 'border-bottom: 1px solid #f7fafc;' : ''} color: #4a5568; font-size: 16px; line-height: 1.6; font-family: 'Georgia', serif;">${benefit}</p>
                `).join('')}
              </div>
            </td>
          </tr>

          <!-- CTA MINIMALISTA -->
          <tr>
            <td align="center" style="padding: 0 40px 50px 40px;">
              <a href="${ctaLink}" style="display: inline-block; padding: 16px 50px; background-color: #1a202c; color: #ffffff; text-decoration: none; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; font-family: Arial, sans-serif; font-weight: normal;">${ctaText}</a>
            </td>
          </tr>

          <!-- FOOTER CLEAN -->
          <tr>
            <td style="background-color: #f7fafc; padding: 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 15px 0; color: #2d3748; font-size: 14px; font-weight: normal; font-family: 'Georgia', serif;">${companyName}</p>
              <p style="margin: 0 0 25px 0; color: #a0aec0; font-size: 12px; line-height: 1.6; font-family: Arial, sans-serif;">Você recebeu este e-mail porque se inscreveu<br>em nosso boletim informativo.</p>
              <p style="margin: 0; color: #cbd5e0; font-size: 11px; font-family: Arial, sans-serif;">
                <a href="#" style="color: #718096; text-decoration: none; margin: 0 8px;">Preferências</a> ·
                <a href="#" style="color: #cbd5e0; text-decoration: none; margin: 0 8px;">Descadastrar</a>
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

// Template 3: Promocional Ultra Urgente - DIAGONAL SPLIT BOLD
const promotionalTemplate: EmailTemplate = {
  id: 'promotional',
  name: 'Flash Sale Neon',
  description: 'Design ousado com split diagonal, countdown visual, gradientes vibrantes e fotos em círculos sobrepostos',
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
      dateRange = 'Válido até 31/12',
      keyBenefits = ['Todos os destinos', 'Sem taxas extras', 'Pagamento facilitado'],
      heroImage = data.heroImage?.trim() || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&h=300&fit=crop',
      teamImage1 = data.teamImage1?.trim() || 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=250&h=250&fit=crop',
      teamImage2 = data.teamImage2?.trim() || 'https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?w=250&h=250&fit=crop',
      teamImage3 = data.teamImage3?.trim() || 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=250&h=250&fit=crop',
      teamImage4 = data.teamImage4?.trim() || 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=250&h=250&fit=crop',
      logoImage = data.logoImage?.trim() || 'https://images.unsplash.com/photo-1499678329028-101435549a4e?w=180&h=60&fit=crop'
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
  <title>${mainTitle}</title>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); font-family: 'Segoe UI', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); padding: 25px 10px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
          
          <!-- HEADER DIAGONAL SPLIT -->
          <tr>
            <td style="padding: 0; background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); height: 80px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="height: 80px;">
                <tr>
                  <td width="50%" align="right" style="padding-right: 15px; vertical-align: middle;">
                    <p style="margin: 0; color: #ffffff; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">✨ ${priceInfo}</p>
                  </td>
                  <td width="50%" align="left" style="padding-left: 15px; vertical-align: middle;">
                    <img src="${logoImage}" alt="${companyName}" width="180" height="60" style="height: 45px; width: auto; max-width: 150px; display: block;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- HERO IMAGE -->
          <tr>
            <td style="padding: 0;">
              <img src="${heroImage}" alt="${mainTitle}" width="600" height="300" style="width: 100%; height: auto; display: block; border-radius: 0;">
            </td>
          </tr>

          <!-- TÍTULO -->
          <tr>
            <td style="padding: 30px 30px 10px 30px;">
              <h1 style="margin: 0; color: #0f172a; font-size: 44px; font-weight: 700; line-height: 1.1; letter-spacing: -0.5px;">${mainTitle}</h1>
            </td>
          </tr>

          <!-- DESCRIÇÃO E COUNTDOWN -->
          <tr>
            <td style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 35px 30px; text-align: center;">
              <p style="margin: 0 0 25px 0; color: #475569; font-size: 18px; line-height: 1.6; font-family: Arial, sans-serif; font-weight: normal;">${description}</p>
              <div style="background: #e0f2fe; border: 2px solid #0ea5e9; border-radius: 10px; padding: 20px; margin: 0 auto; max-width: 400px;">
                <p style="margin: 0 0 10px 0; color: #0369a1; font-size: 14px; text-transform: uppercase; letter-spacing: 1.5px; font-family: Arial, sans-serif; font-weight: 600;">⏰ OFERTA EXPIRA EM</p>
                <p style="margin: 0; color: #0f172a; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">${dateRange}</p>
              </div>
            </td>
          </tr>

          <!-- CÍRCULOS SOBREPOSTOS COM IMAGENS -->
          <tr>
            <td style="padding: 40px 30px; background: #ffffff;">
              <h2 style="margin: 0 0 30px 0; color: #0f172a; font-size: 28px; font-weight: 600; text-align: center;">🌍 Destinos Incríveis</h2>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                      <tr>
                        <td style="position: relative;">
                          <div style="width: 140px; height: 140px; border-radius: 50%; overflow: hidden; border: 5px solid #ff3264; box-shadow: 0 8px 25px rgba(255,50,100,0.4); display: inline-block; margin: 0 -15px;">
                            <img src="${teamImage1}" alt="Destino 1" width="250" height="250" style="width: 100%; height: 100%; object-fit: cover; display: block;">
                          </div>
                        </td>
                        <td style="position: relative;">
                          <div style="width: 140px; height: 140px; border-radius: 50%; overflow: hidden; border: 5px solid #ffd700; box-shadow: 0 8px 25px rgba(255,215,0,0.4); display: inline-block; margin: 0 -15px;">
                            <img src="${teamImage2}" alt="Destino 2" width="250" height="250" style="width: 100%; height: 100%; object-fit: cover; display: block;">
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                      <tr>
                        <td style="position: relative;">
                          <div style="width: 140px; height: 140px; border-radius: 50%; overflow: hidden; border: 5px solid #00d9ff; box-shadow: 0 8px 25px rgba(0,217,255,0.4); display: inline-block; margin: 0 -15px;">
                            <img src="${teamImage3}" alt="Destino 3" width="250" height="250" style="width: 100%; height: 100%; object-fit: cover; display: block;">
                          </div>
                        </td>
                        <td style="position: relative;">
                          <div style="width: 140px; height: 140px; border-radius: 50%; overflow: hidden; border: 5px solid #ff3264; box-shadow: 0 8px 25px rgba(255,50,100,0.4); display: inline-block; margin: 0 -15px;">
                            <img src="${teamImage4}" alt="Destino 4" width="250" height="250" style="width: 100%; height: 100%; object-fit: cover; display: block;">
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BENEFÍCIOS BOLD -->
          <tr>
            <td style="padding: 0 30px 35px 30px; background: #ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${keyBenefits.map((benefit, index) => `
                  <tr>
                    <td style="padding: 12px 20px; background: ${index % 2 === 0 ? 'linear-gradient(90deg, #ff3264, #ff6b9d)' : 'linear-gradient(90deg, #ffd700, #ffed4e)'}; margin-bottom: 10px; border-radius: 50px;">
                      <p style="margin: 0; color: ${index % 2 === 0 ? '#ffffff' : '#1a1a2e'}; font-size: 15px; font-weight: 900; text-align: center; text-transform: uppercase; letter-spacing: 1px;">✓ ${benefit}</p>
                    </td>
                  </tr>
                  ${index < keyBenefits.length - 1 ? '<tr><td style="height: 10px;"></td></tr>' : ''}
                `).join('')}
              </table>
            </td>
          </tr>

          <!-- CTA MEGA BOLD -->
          <tr>
            <td align="center" style="padding: 0 30px 45px 30px; background: #ffffff;">
              <a href="${ctaLink}" style="display: block; background: linear-gradient(135deg, #ff3264 0%, #ffd700 100%); color: #1a1a2e; padding: 22px 50px; border-radius: 60px; text-decoration: none; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 15px 40px rgba(255,50,100,0.5), 0 0 0 4px rgba(255,215,0,0.3); text-align: center;">${ctaText} 🚀</a>
              <p style="margin: 20px 0 0 0; color: #ff3264; font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">⚡ VAGAS LIMITADAS!</p>
            </td>
          </tr>

          <!-- FOOTER DARK -->
          <tr>
            <td style="background: #1a1a2e; padding: 30px; text-align: center; border-top: 3px solid #ff3264;">
              <p style="margin: 0 0 8px 0; color: #ffffff; font-size: 16px; font-weight: 900; text-transform: uppercase;">${companyName}</p>
              <p style="margin: 0; color: #888; font-size: 11px; font-family: Arial, sans-serif; font-weight: normal;">
                <a href="#" style="color: #ff3264; text-decoration: none; font-weight: bold;">Descadastrar</a>
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

// Template 4: VIP Cliente Recorrente - POLAROID LUXURY COM MOLDURAS
const returningCustomerTemplate: EmailTemplate = {
  id: 'returning-customer',
  name: 'Bem-vindo de Volta VIP',
  description: 'Template luxuoso com polaroids rotacionados, molduras douradas, ribbon VIP e layout de revista de luxo',
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
      keyBenefits = ['Desconto exclusivo para clientes VIP', 'Consultoria personalizada', 'Flexibilidade total'],
      heroImage = data.heroImage?.trim() || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=540&h=360&fit=crop',
      teamImage1 = data.teamImage1?.trim() || 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=240&h=320&fit=crop',
      teamImage2 = data.teamImage2?.trim() || 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=240&h=320&fit=crop',
      teamImage3 = data.teamImage3?.trim() || 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=240&h=320&fit=crop',
      teamImage4 = data.teamImage4?.trim() || 'https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=240&h=320&fit=crop',
      logoImage = data.logoImage?.trim() || 'https://images.unsplash.com/photo-1499678329028-101435549a4e?w=160&h=70&fit=crop'
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
    body { font-family: 'Palatino', 'Times New Roman', serif; }
  </style>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #f5f5dc 0%, #e8d5b7 100%);">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f5f5dc 0%, #e8d5b7 100%); padding: 30px 10px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border: 8px solid #d4af37; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
          <tr>
            <td style="background: linear-gradient(135deg, #d4af37 0%, #f4d03f 50%, #d4af37 100%); padding: 15px;">
              <p style="margin: 0; color: #1a1a1a; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 3px; text-align: center;">⭐ Cliente VIP ⭐</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 40px 30px;">
              <img src="${logoImage}" alt="${companyName}" width="160" height="70" style="height: 70px; width: auto; margin-bottom: 25px;">
              <h1 style="margin: 0; color: #2c1810; font-size: 36px;">${mainTitle}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 30px 30px;">
              <div style="border: 5px solid #d4af37; padding: 8px;">
                <img src="${heroImage}" alt="${destination}" width="540" height="360" style="width: 100%; height: auto;">
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 35px;">
              <p style="margin: 0; color: #4a4a4a; font-size: 17px; line-height: 1.8; text-align: center; font-style: italic;">${description}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 20px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="48%" align="center" style="padding: 10px;">
                    <div style="background: #fff; padding: 12px 12px 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                      <img src="${teamImage1}" alt="1" width="240" height="320" style="width: 100%; height: auto; margin-bottom: 10px;">
                      <p style="margin: 0; color: #333; font-size: 13px; font-family: 'Courier New', monospace;">Luxo & Conforto</p>
                    </div>
                  </td>
                  <td width="48%" align="center" style="padding: 10px;">
                    <div style="background: #fff; padding: 12px 12px 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                      <img src="${teamImage2}" alt="2" width="240" height="320" style="width: 100%; height: auto; margin-bottom: 10px;">
                      <p style="margin: 0; color: #333; font-size: 13px; font-family: 'Courier New', monospace;">Gastronomia</p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td width="48%" align="center" style="padding: 10px;">
                    <div style="background: #fff; padding: 12px 12px 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                      <img src="${teamImage3}" alt="3" width="240" height="320" style="width: 100%; height: auto; margin-bottom: 10px;">
                      <p style="margin: 0; color: #333; font-size: 13px; font-family: 'Courier New', monospace;">Experiências</p>
                    </div>
                  </td>
                  <td width="48%" align="center" style="padding: 10px;">
                    <div style="background: #fff; padding: 12px 12px 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                      <img src="${teamImage4}" alt="4" width="240" height="320" style="width: 100%; height: auto; margin-bottom: 10px;">
                      <p style="margin: 0; color: #333; font-size: 13px; font-family: 'Courier New', monospace;">Aventuras</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 35px 35px;">
              <div style="background: #fffef7; border: 3px solid #d4af37; border-radius: 8px; padding: 30px 25px;">
                <h3 style="margin: 0 0 25px 0; color: #2c1810; font-size: 22px; text-align: center; text-transform: uppercase;">✨ Privilégios VIP ✨</h3>
                ${keyBenefits.map((benefit, index) => `
                  <div style="margin-bottom: ${index < keyBenefits.length - 1 ? '18px' : '0'}; padding-bottom: ${index < keyBenefits.length - 1 ? '18px' : '0'}; ${index < keyBenefits.length - 1 ? 'border-bottom: 1px dashed #d4af37;' : ''}">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="40" align="center">
                          <span style="display: inline-block; width: 32px; height: 32px; background: #d4af37; border-radius: 50%; line-height: 32px; color: #1a1a1a; font-weight: bold;">✓</span>
                        </td>
                        <td style="padding-left: 15px;">
                          <p style="margin: 0; color: #2c1810; font-size: 16px; font-weight: 600;">${benefit}</p>
                        </td>
                      </tr>
                    </table>
                  </div>
                `).join('')}
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 35px 45px;">
              <a href="${ctaLink}" style="display: inline-block; background: linear-gradient(135deg, #d4af37, #f4d03f); color: #1a1a1a; padding: 18px 50px; border-radius: 50px; text-decoration: none; font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 10px 30px rgba(212,175,55,0.5);">${ctaText} ✨</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px;">
              <div style="border-left: 4px solid #d4af37; padding: 20px 25px;">
                <p style="margin: 0; color: #666; font-size: 15px; font-style: italic;">"Viajar é a única coisa que você compra que te torna mais rico."</p>
                <p style="margin: 10px 0 0; color: #d4af37; font-size: 13px; font-weight: bold;">— Provérbio</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background: linear-gradient(135deg, #2c1810, #3d2415); padding: 35px 30px; text-align: center; border-top: 3px solid #d4af37;">
              <p style="margin: 0 0 15px; color: #d4af37; font-size: 18px; font-weight: bold;">${companyName}</p>
              <p style="margin: 0 0 20px; color: #c9b998; font-size: 13px;">Obrigado por ser um cliente VIP.</p>
              <p style="margin: 0; color: #8b7355; font-size: 11px;">
                <a href="#" style="color: #d4af37; text-decoration: none;">Preferências</a> · 
                <a href="#" style="color: #8b7355; text-decoration: none;">Descadastrar</a>
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
      // 🔄 URLs corrigidas e fallbacks adicionados
      heroImage = data.heroImage?.trim() || 'https://via.placeholder.com/600x400.jpg?text=Hero+Image',
      teamImage1 = data.teamImage1?.trim() || 'https://via.placeholder.com/250x250.jpg?text=Hospedagem+Luxo',
      teamImage2 = data.teamImage2?.trim() || 'https://via.placeholder.com/250x250.jpg?text=Refeições+Gourmet',
      teamImage3 = data.teamImage3?.trim() || 'https://via.placeholder.com/250x250.jpg?text=Guias+Experientes',
      teamImage4 = data.teamImage4?.trim() || 'https://via.placeholder.com/250x250.jpg?text=Transporte+Incluído',
      // Logo com altura fixa de 100px e largura automática
      logoImage = data.logoImage?.trim() || 'https://via.placeholder.com/200x100?text=Logo'
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
    
    /* Logo container para centralização perfeita */
    .logo-container {
      display: block;
      text-align: center;
      width: 100%;
    }
    
    /* Logo com altura fixa e largura automática - FORÇANDO estilos inline */
    .logo {
      height: 100px !important;
      width: auto !important;
      max-width: 200px !important; /* Limite máximo para largura */
      object-fit: contain !important;
      display: inline-block !important;
      margin: 0 auto !important;
      border-radius: 8px !important;
    }
    
    /* Imagens das features - 250x250 com bordas arredondadas */
    .feature-image {
      width: 100% !important;
      height: 250px !important;
      object-fit: cover !important;
      border-radius: 12px !important;
      display: block !important;
    }
    
    /* CTA Button */
    .cta-button { 
      display: inline-block; 
      padding: 11px 43px; 
      background-color: #4f1337; 
      color: #ffffff; 
      text-decoration: none; 
      font-size: 16px; 
      font-weight: bold; 
      border-radius: 8px; 
    }
    
    /* Social icons */
    .social-icon { 
      width: 28px !important; 
      height: 28px !important; 
      display: block !important; 
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff;">
          <!-- LOGO SUPERIOR -->
          <tr>
            <td align="center" style="background-color: #ffffff; padding: 14px 0;">
              <div class="logo-container">
                <img src="${logoImage}" alt="${companyName}" class="logo" 
                     style="height: 100px !important; width: auto !important; max-width: 200px !important; object-fit: contain !important; display: inline-block !important; margin: 0 auto !important; border-radius: 8px !important;">
              </div>
            </td>
          </tr>

          <tr>
            <td style="border-top: 1px solid #26081a; height: 0; margin: 0; padding: 0;"></td>
          </tr>

          <!-- HERO IMAGE -->
          <tr>
            <td align="center" style="padding: 40px 32px 0 32px;">
              <img src="${heroImage}" alt="${destination}" title="${destination}" 
                   style="width: 100%; max-width: 600px; height: auto; display: block; border-radius: 8px;">
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
                    <a href="${ctaLink}" class="cta-button" style="display: inline-block; padding: 11px 43px; background-color: #4f1337; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 8px;">${ctaText}</a>
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

          <!-- GRID 2x2 - Imagens 250x250 com bordas arredondadas -->
          <tr>
            <td align="center" style="padding: 16px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                <tr>
                  <td width="50%" align="center" style="padding-right: 8px; padding-bottom: 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <img src="${teamImage1}" alt="Hospedagem Luxo" title="Hospedagem Luxo" 
                               class="feature-image"
                               style="width: 100% !important; height: 250px !important; object-fit: cover !important; border-radius: 12px !important; display: block !important;">
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-top: 8px;">
                          <p style="margin: 0; color: #26081a; font-size: 16px; font-weight: normal;">Hospedagem Luxo</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="50%" align="center" style="padding-left: 8px; padding-bottom: 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <img src="${teamImage2}" alt="Refeições Gourmet" title="Refeições Gourmet" 
                               class="feature-image"
                               style="width: 100% !important; height: 250px !important; object-fit: cover !important; border-radius: 12px !important; display: block !important;">
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
                          <img src="${teamImage3}" alt="Guias Experientes" title="Guias Experientes" 
                               class="feature-image"
                               style="width: 100% !important; height: 250px !important; object-fit: cover !important; border-radius: 12px !important; display: block !important;">
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
                          <img src="${teamImage4}" alt="Transporte Incluído" title="Transporte Incluído" 
                               class="feature-image"
                               style="width: 100% !important; height: 250px !important; object-fit: cover !important; border-radius: 12px !important; display: block !important;">
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

          <!-- PREÇO -->
          <tr>
            <td align="center" style="padding: 24px 32px 0 32px;">
              <p style="margin: 0; color: #4f1337; font-size: 28px; font-weight: bold;">${priceInfo}</p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 32px 32px; text-align: center; margin-top: 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" align="center" style="margin-bottom: 24px;">
                <tr align="center">
                  <td style="padding: 5px;">
                    <a href="#" style="display: inline-block;">
                      <img src="https://creative-assets.mailinblue.com/editor/social-icons/rounded_colored/facebook_32px.png" alt="Facebook" class="social-icon"
                           style="width: 28px !important; height: 28px !important; display: block !important;">
                    </a>
                  </td>
                  <td style="padding: 5px;">
                    <a href="#" style="display: inline-block;">
                      <img src="https://creative-assets.mailinblue.com/editor/social-icons/rounded_colored/instagram_32px.png" alt="Instagram" class="social-icon"
                           style="width: 28px !important; height: 28px !important; display: block !important;">
                    </a>
                  </td>
                  <td style="padding: 5px;">
                    <a href="#" style="display: inline-block;">
                      <img src="https://creative-assets.mailinblue.com/editor/social-icons/rounded_colored/linkedin_32px.png" alt="LinkedIn" class="social-icon"
                           style="width: 28px !important; height: 28px !important; display: block !important;">
                    </a>
                  </td>
                  <td style="padding: 5px;">
                    <a href="#" style="display: inline-block;">
                      <img src="https://creative-assets.mailinblue.com/editor/social-icons/rounded_colored/youtube_32px.png" alt="YouTube" class="social-icon"
                           style="width: 28px !important; height: 28px !important; display: block !important;">
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

              <!-- LOGO INFERIOR -->
              <div class="logo-container" style="margin-top: 16px;">
                <img src="${logoImage}" alt="${companyName}" class="logo"
                     style="height: 100px !important; width: auto !important; max-width: 200px !important; object-fit: contain !important; display: inline-block !important; margin: 0 auto !important; border-radius: 8px !important;">
              </div>
              
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

// Exportação de templates
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