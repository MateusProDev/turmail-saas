// Lightweight client-side formatter: converts plain text into simple HTML
// Rules:
// - Lines starting with '-' or '*' become list items
// - Consecutive list lines become a <ul>
// - Lines in ALL CAPS or lines ending with ':' become headings (<h2>)
// - The first short line (<=60 chars) may become <h1>
// - **bold** or __bold__ -> <strong>
// - Wrap other non-empty lines in <p>

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function applyInlineFormatting(s: string) {
  // bold **text** or __text__
  s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/__(.*?)__/g, '<strong>$1</strong>')
  return s
}

export function formatRawToHtml(raw: string) {
  if (!raw) return ''
  // normalize line endings
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const out: string[] = []
  let inList = false

  // detect first non-empty short line for potential H1
  let firstLineIndex = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim()) { firstLineIndex = i; break }
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const line = rawLine.trim()
    if (!line) {
      if (inList) { out.push('</ul>'); inList = false }
      continue
    }

    // list item
    if (/^[\-\*\u2022]\s+/.test(line)) {
      const content = line.replace(/^[\-\*\u2022]\s+/, '')
      if (!inList) { out.push('<ul>'); inList = true }
      out.push(`<li>${applyInlineFormatting(escapeHtml(content))}</li>`)
      continue
    }

    if (inList) { out.push('</ul>'); inList = false }

    // heading: ALL CAPS or ends with ':'
    if (/^[^a-z]*[A-Z0-9 ].*$/.test(line) && line === line.toUpperCase() && line.length <= 60) {
      out.push(`<h2>${applyInlineFormatting(escapeHtml(line))}</h2>`)
      continue
    }
    if (/:$/.test(line)) {
      out.push(`<h2>${applyInlineFormatting(escapeHtml(line.replace(/:$/, '')))}</h2>`)
      continue
    }

    // potential H1 if first non-empty and short
    if (i === firstLineIndex && line.length <= 60) {
      out.push(`<h1>${applyInlineFormatting(escapeHtml(line))}</h1>`)
      continue
    }

    // fallback paragraph
    out.push(`<p>${applyInlineFormatting(escapeHtml(line))}</p>`)
  }

  if (inList) out.push('</ul>')
  return out.join('\n')
}

export default formatRawToHtml

// Advanced formatter: applies heuristics to produce a nicer structure:
// - splits long paragraphs into intro + bullets
// - extracts imperative sentences as CTA (e.g., "Reserve agora" -> button)
// - preserves lists and headings from simple parser
export function advancedFormatRawToHtml(raw: string, opts?: { destination?: string, dateRange?: string, ctaLink?: string, mainTitle?: string }) {
  if (!raw) return { html: '', cta: null }
  // First, run the simple formatter to get baseline blocks
  const baseHtml = formatRawToHtml(raw)
  // We'll work on the raw text for heuristics
  const norm = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const paragraphs = norm.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)

  const ctaKeywords = ['reserve', 'garanta', 'clique', 'compre', 'saiba', 'agende', 'aproveite', 'experimente', 'confira']
  const imperativeRegex = new RegExp('^\\s*(' + ctaKeywords.join('|') + ')\\b', 'i')

  let cta: string | null = null
  const parts: string[] = []

  for (const p of paragraphs) {
    // if paragraph already looks like a list (starts with - * • or numbered) keep as-is via simple formatter
    if (/^[\-\*\u2022\d+\.]/.test(p.trim())) {
      parts.push(formatRawToHtml(p))
      continue
    }

    // split into sentences (rudimentary)
    const sentences = p.split(/(?<=[\.\?\!])\s+/).map(s => s.trim()).filter(Boolean)

    // look for a CTA sentence (imperative)
    for (const s of sentences) {
      if (imperativeRegex.test(s) && !cta) {
        // use the sentence as CTA label (shorten if needed)
        cta = s.replace(/[\.\!]$/,'')
        // do not include this sentence in body
      }
    }

    // If paragraph is long and contains multiple sentences, convert 2nd..nth sentences to bullet list
    const totalLen = p.length
    if (totalLen > 120 && sentences.length >= 2) {
      const intro = sentences[0]
      const bullets = sentences.slice(1)
      parts.push(`<p>${applyInlineFormatting(escapeHtml(intro))}</p>`)
      parts.push('<ul>')
      for (const b of bullets) parts.push(`<li>${applyInlineFormatting(escapeHtml(b.replace(/[\.\!]$/,'')))}</li>`)
      parts.push('</ul>')
      continue
    }

    // If paragraph contains keywords like 'benefícios' or 'inclui', split by sentence and make list
    if (/benef[ií]cio|beneficios|inclui|incluem|vantagem|vantagens/i.test(p) && sentences.length >= 2) {
      // prefer to make second part a list
      const intro = sentences[0]
      const bullets = sentences.slice(1)
      parts.push(`<p>${applyInlineFormatting(escapeHtml(intro))}</p>`)
      parts.push('<ul>')
      for (const b of bullets) parts.push(`<li>${applyInlineFormatting(escapeHtml(b.replace(/[\.\!]$/,'')))}</li>`)
      parts.push('</ul>')
      continue
    }

    // default: passthrough formatted paragraph
    parts.push(formatRawToHtml(p))
  }

  // assemble HTML
  let html = parts.join('\n')

  // If a mainTitle is provided, ensure it's the first H1 (prepend if necessary)
  if (opts && opts.mainTitle) {
    const firstNonEmpty = parts.find(p => p && p.trim()) || ''
    if (!/^\s*<h1>/i.test(firstNonEmpty)) {
      html = `<h1>${applyInlineFormatting(escapeHtml(opts.mainTitle))}</h1>\n` + html
    }
  }

  // if we found a CTA, append a centered button
  if (cta) {
    const href = (opts && opts.ctaLink) ? opts.ctaLink : '#'
    const label = cta || 'Saiba mais'
    const btn = `<p style="text-align:center;margin-top:18px;"><a href=\"${escapeHtml(href)}\" style=\"background:#059669;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;\">${escapeHtml(label)}</a></p>`
    html = html + '\n' + btn
  }
  return { html, cta }
}
