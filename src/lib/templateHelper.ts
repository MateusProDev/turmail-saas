export function renderTemplate(htmlContent = '', subject = '', preheader = ''): string {
  const content = String(htmlContent || '').trim()
  
  // Se o HTML já é um documento completo (tem DOCTYPE), retorna direto
  if (content.toLowerCase().includes('<!doctype') || content.toLowerCase().includes('<html')) {
    return content
  }
  
  // Se é apenas conteúdo HTML (sem estrutura completa), envolve em template básico
  const safePreheader = String(preheader || '').replace(/<[^>]*>?/gm, '')
  const escapedTitle = escapeHtml(subject || '')

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapedTitle}</title>
  <style>
    body { margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; background:#f7fafc; }
    .container { max-width:680px; margin:0 auto; background:#ffffff; padding:24px; }
    .header { font-size:18px; font-weight:600; color:#111827; margin-bottom:12px; }
    .content { font-size:15px; color:#374151; line-height:1.5; }
    .footer { font-size:12px; color:#6b7280; margin-top:18px; }
    @media (max-width:600px) { .container { padding:16px; } }
  </style>
</head>
<body>
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(safePreheader)}</div>
  <div class="container">
    <div class="header">${escapeHtml(subject || '')}</div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">Se você não deseja receber estes e-mails, ignore esta mensagem.</div>
  </div>
</body>
</html>`
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default { renderTemplate }
