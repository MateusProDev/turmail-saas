/**
 * GET /api/produto?id=PRODUCT_ID
 *
 * Retorna HTML com Open Graph meta tags dinâmicos para o produto:
 *   - og:image  → foto do produto (aparece no preview do WhatsApp / redes sociais)
 *   - og:title  → nome + preço
 *   - og:description → descrição + categoria
 *
 * Navegadores comuns são redirecionados para a SPA (/produtos?produto=ID).
 * Bots de scraping (WhatsApp, Telegram, Facebook…) ficam na página para ler as tags.
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  // Extrair o ID do produto da query string
  const id =
    (req.query && req.query.id) ||
    new URLSearchParams((req.url || '').split('?')[1] || '').get('id')

  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost'
  const siteUrl = `${proto}://${host}`

  if (!id) {
    res.setHeader('Location', `${siteUrl}/produtos`)
    return res.status(302).end()
  }

  let product = null
  try {
    const { default: admin } = await import('../../server/firebaseAdmin.js')
    const db = admin.firestore()
    const doc = await db.collection('store_products').doc(String(id)).get()
    if (doc.exists) {
      product = { id: doc.id, ...doc.data() }
    }
  } catch (err) {
    console.error('[produto-og] firestore error', err)
  }

  if (!product) {
    res.setHeader('Location', `${siteUrl}/produtos`)
    return res.status(302).end()
  }

  // Formata preço
  const formatBRL = (v) => {
    if (v == null) return ''
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const priceStr = formatBRL(product.price)
  const ogTitle = `${product.name} — ${priceStr} | BenSuplementos`

  let ogDesc = ''
  if (product.description) {
    ogDesc = `${product.description.slice(0, 120)} | ${priceStr}`
  } else {
    ogDesc = `${product.category || 'Suplemento'} — ${priceStr} | BenSuplementos`
  }
  if (product.oldPrice) {
    const oldStr = formatBRL(product.oldPrice)
    ogDesc = `De ${oldStr} por apenas ${priceStr}. ${ogDesc}`
  }

  const ogImage = product.image || `${siteUrl}/android-icon-192x192.png`
  const canonicalUrl = `${siteUrl}/api/produto?id=${encodeURIComponent(id)}`
  // URL da SPA para onde o browser será redirecionado
  const productSpaUrl = `${siteUrl}/produtos?produto=${encodeURIComponent(id)}`

  const ua = req.headers['user-agent'] || ''
  const isBot =
    /whatsapp|facebookexternalhit|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|googlebot|bingbot|applebot|ia_archiver/i.test(
      ua
    )

  // Bots ficam na página; browsers são redirecionados imediatamente
  const redirectTag = isBot
    ? ''
    : `<meta http-equiv="refresh" content="0;url=${escHtml(productSpaUrl)}" />`

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(ogTitle)}</title>
  <meta name="description" content="${escHtml(ogDesc)}" />

  <!-- Open Graph — WhatsApp, Facebook, Telegram … -->
  <meta property="og:type"        content="product" />
  <meta property="og:url"         content="${escHtml(canonicalUrl)}" />
  <meta property="og:title"       content="${escHtml(ogTitle)}" />
  <meta property="og:description" content="${escHtml(ogDesc)}" />
  <meta property="og:image"       content="${escHtml(ogImage)}" />
  <meta property="og:image:width"  content="800" />
  <meta property="og:image:height" content="800" />
  <meta property="og:image:alt"   content="${escHtml(product.name)}" />
  <meta property="og:site_name"   content="BenSuplementos" />
  <meta property="product:price:amount"   content="${escHtml(String(product.price || ''))}" />
  <meta property="product:price:currency" content="BRL" />

  <!-- Twitter / X -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${escHtml(ogTitle)}" />
  <meta name="twitter:description" content="${escHtml(ogDesc)}" />
  <meta name="twitter:image"       content="${escHtml(ogImage)}" />

  ${redirectTag}
</head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9f9f9">
  <script>
    if (!/bot|spider|crawl|whatsapp|facebookexternalhit|twitterbot|telegrambot|linkedinbot/i.test(navigator.userAgent)) {
      window.location.replace(${JSON.stringify(productSpaUrl)});
    }
  </script>
  <div style="text-align:center;padding:2rem">
    <img src="${escHtml(ogImage)}" alt="${escHtml(product.name)}" style="max-width:200px;border-radius:12px;margin-bottom:1rem" />
    <h1 style="font-size:1.2rem;margin:0 0 .5rem">${escHtml(product.name)}</h1>
    <p style="font-size:1.4rem;color:#15803d;font-weight:bold;margin:0 0 1rem">${escHtml(priceStr)}</p>
    <a href="${escHtml(productSpaUrl)}" style="background:#16a34a;color:#fff;padding:.75rem 1.5rem;border-radius:8px;text-decoration:none;font-weight:bold">
      Ver produto →
    </a>
  </div>
</body>
</html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  // Cache curto para bots, permite revalidação
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  return res.status(200).send(html)
}

/** Escapa caracteres especiais para uso seguro em atributos HTML */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
