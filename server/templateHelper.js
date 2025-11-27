export function renderTemplate(htmlContent = '', subject = '', preheader = '') {
  const safePreheader = String(preheader || '').replace(/<[^>]*>?/gm, '')
  const content = String(htmlContent || '')

  // Minimal responsive template with inline styles and preheader
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(subject || '')}</title>
  <style>
    /* Mobile-friendly responsive styles (kept small) */
    body { margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; background:#f7fafc; }
    .container { max-width:680px; margin:0 auto; background:#ffffff; padding:24px; }
    .header { font-size:18px; font-weight:600; color:#111827; margin-bottom:12px; }
    .content { font-size:15px; color:#374151; line-height:1.5; }
    .footer { font-size:12px; color:#6b7280; margin-top:18px; }
    @media (max-width:600px) { .container { padding:16px; } }
  </style>
</head>
<body>
  <!-- Preheader: hidden preview text for inboxes -->
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

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default { renderTemplate }
