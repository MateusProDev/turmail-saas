# Sitemap e Guia Rápido de SEO — BenSuplementos

Observação: substitua `https://www.bensuplementos.com.br` pelo domínio real antes de publicar o `public/sitemap.xml`.

## Rotas incluídas no sitemap
- `/` (Home)
- `/produtos` (Catálogo)
- `/ofertas` (Promoções)
- `/about` (Sobre)

## Meta títulos e descrições recomendados

- Home
  - Title: BenSuplementos — Suplementos, Whey, Creatina e Pré-Treino em Fortaleza
  - Description: Loja online em Fortaleza com whey, creatina, pré-treino, vitaminas e suplementos. Entrega rápida para Fortaleza. Cupom BEN5 em todas as compras.

- Produtos
  - Title: Produtos — Whey, Creatina, Pré-Treino e Vitaminas | BenSuplementos
  - Description: Confira nossa seleção de suplementos: whey protein, creatina, pré-treino, BCAA e vitaminas. Entregamos para Fortaleza — frete grátis acima de R$199.

- Ofertas
  - Title: Ofertas e Promoções — Descontos em Suplementos | BenSuplementos
  - Description: Promoções em combos, whey e creatinas com descontos exclusivos. Entre no grupo de WhatsApp para cupons e ofertas relâmpago — entrega em Fortaleza.

- Sobre
  - Title: Sobre BenSuplementos — Qualidade e Entrega em Fortaleza
  - Description: BenSuplementos — loja de suplementos com foco em Fortaleza. Produtos testados e entrega rápida. Atendimento via WhatsApp.

## Palavras-chave foco (para usar em títulos, descrições, H1 e conteúdo)

- suplementos
- whey protein
- creatina
- pré-treino
- vitaminas
- BCAA
- entrega Fortaleza
- frete grátis Fortaleza
- comprar suplementos Fortaleza
- loja de suplementos online

## Recomendações de performance e SEO técnico (resumo)

- Otimize tempo de carregamento: habilite compressão (gzip/br), uso de CDN para imagens e build estático (`vite build` + hospedar em CDN ou Vercel/Netlify/Firebase Hosting).
- Pré-render as páginas públicas (Home, Produtos, Ofertas) ou usar SSG/SSR para melhorar indexação e Core Web Vitals.
- Meta tags críticas: `title`, `meta description`, `canonical`, `og:*` (OpenGraph) e `twitter:*`.
- Structured data: adicione JSON-LD `Product` para páginas de produto (nome, imagem, price, availability, sku) para aparecer em rich results.
- Imagens: servir WebP/AVIF, gerar dimensões e usar `loading="lazy"` quando apropriado.
- Sitemap: coloque `public/sitemap.xml` na raiz do domínio e envie ao Google Search Console e Bing Webmaster Tools.
- Robots: inclua um `robots.txt` simples apontando para o sitemap: `Sitemap: https://SEU_DOMINIO/sitemap.xml`.
- Mobile-first: garanta que botões e CTAs sejam fáceis de tocar; fontes e tamanhos responsivos.

## Próximos passos práticos

1. Substituir domínio no `public/sitemap.xml`.
2. Adicionar as meta tags recomendadas em `index.html` ou via component `<Head>` nas rotas.
3. Gerar JSON-LD `Product` nas páginas de produto.
4. Enviar sitemap ao Google Search Console.
