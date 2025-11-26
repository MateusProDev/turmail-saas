import { sendEmail } from '../server/brevoMail.js'

export default async function handler(req, res) {
  // Security: only allow test sends when DEBUG_SEND=true OR when a TEST_SEND_SECRET is provided and matches header
  const debug = process.env.DEBUG_SEND === 'true'
  const secretEnv = process.env.TEST_SEND_SECRET || ''
  const providedSecret = (req.headers['x-test-secret'] || req.headers['X-Test-Secret'] || '')

  if (!debug && secretEnv) {
    if (!providedSecret || providedSecret !== secretEnv) {
      return res.status(401).json({ error: 'Unauthorized: missing or invalid test secret' })
    }
  } else if (!debug && !secretEnv) {
    return res.status(403).json({ error: 'Test endpoint disabled: set DEBUG_SEND=true or TEST_SEND_SECRET' })
  }

  if (req.method !== 'POST') return res.status(405).end('Method not allowed')

  const body = req.body || {}
  const apiKey = body.apiKey || process.env.BREVO_API_KEY
  const sender = body.sender || { name: process.env.DEFAULT_FROM_NAME || 'No Reply', email: process.env.DEFAULT_FROM_EMAIL || `no-reply@${process.env.DEFAULT_HOST || 'localhost'}` }
  let to = body.to || []
  const subject = body.subject || 'Test message'
  const htmlContent = body.htmlContent || '<p>Test</p>'
  const idempotencyKey = body.idempotencyKey || undefined

  // Normalize `to`: accept string, object, or array
  if (!Array.isArray(to)) {
    if (typeof to === 'string') to = [{ email: to }]
    else if (typeof to === 'object' && to.email) to = [to]
    else to = []
  }

  if (!apiKey) return res.status(400).json({ error: 'Missing apiKey (provide in body or set BREVO_API_KEY env)' })
  if (!to.length) return res.status(400).json({ error: 'Missing recipients in `to`' })

  const payload = { sender, to, subject, htmlContent }

  try {
    console.log('[test-brevo-send] sending test email', { to: to.map(t=>t.email), subject, usingEnvKey: !body.apiKey })
    const result = await sendEmail({ apiKey, payload, idempotencyKey })
    console.log('[test-brevo-send] send result', { status: result.status, data: result.data })
    return res.status(result.status || 200).json(result.data || { ok: true })
  } catch (e) {
    console.error('[test-brevo-send] error', e && (e.response?.data || e.message || e))
    const status = e?.response?.status || 500
    const bodyErr = e?.response?.data || e?.message || String(e)
    return res.status(status).json({ error: bodyErr })
  }
}

export const config = { runtime: 'edge' }
