import axios from 'axios'

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)) }

export async function sendEmail({ apiKey, payload, retries = 2, timeout = 15000, idempotencyKey } = {}){
  if (!apiKey) throw new Error('BREVO_API_KEY missing')
  const debug = process.env.DEBUG_SEND === 'true'
  const headers = {
    'api-key': apiKey,
    'Content-Type': 'application/json',
  }
  const idem = idempotencyKey || (payload && payload.headers && payload.headers['Idempotency-Key']) || `brevo-${Date.now()}-${Math.random().toString(36).slice(2,8)}`
  headers['Idempotency-Key'] = idem
  // sanitize payload: ensure sender.email exists and each recipient has a name
  const payloadToSend = JSON.parse(JSON.stringify(payload || {}))
  // normalize sender
  if (!payloadToSend.sender) payloadToSend.sender = { name: process.env.DEFAULT_FROM_NAME || 'No Reply', email: process.env.DEFAULT_FROM_EMAIL || '' }
  if (typeof payloadToSend.sender === 'string') payloadToSend.sender = { name: '', email: payloadToSend.sender }
  if (!payloadToSend.sender.email) {
    if (process.env.DEFAULT_FROM_EMAIL) payloadToSend.sender.email = process.env.DEFAULT_FROM_EMAIL
    else throw new Error('valid sender email required')
  }
  payloadToSend.sender.name = payloadToSend.sender.name || payloadToSend.sender.email

  // normalize recipients
  if (!payloadToSend.to) payloadToSend.to = []
  if (!Array.isArray(payloadToSend.to)) payloadToSend.to = [payloadToSend.to]
  payloadToSend.to = payloadToSend.to.map(t => {
    if (!t) return null
    if (typeof t === 'string') return { email: t, name: t }
    if (typeof t === 'object') {
      const email = t.email || t.value || ''
      const name = t.name || t.label || email
      return { email, name }
    }
    return null
  }).filter(Boolean)

  if (debug) console.log('[brevoMail] sendEmail start', { idem, timeout, payloadSummary: { to: payloadToSend.to.slice(0,3), subject: payloadToSend.subject, sender: payloadToSend.sender } })

  let attempt = 0
  let lastErr = null
  while (attempt <= retries) {
    try {
      attempt += 1
      if (debug) console.log('[brevoMail] attempt', attempt, { idem })
      const resp = await axios.post(BREVO_API_URL, payloadToSend, { headers, timeout })
      if (debug) console.log('[brevoMail] success', { status: resp.status })
      return { status: resp.status, data: resp.data }
    } catch (err) {
      lastErr = err
      const status = err?.response?.status
      console.error('[brevoMail] send error', { attempt, status, message: err?.message || err, responseData: err?.response?.data || null })
      if (status && (status >= 500 || status === 429) && attempt <= retries) {
        const backoff = 200 * Math.pow(2, attempt)
        if (debug) console.log('[brevoMail] retrying after backoff', backoff)
        await sleep(backoff)
        continue
      }
      break
    }
  }

  const message = lastErr?.response?.data || lastErr?.message || 'Unknown error'
  const err = new Error(`Brevo send failed after ${attempt} attempts: ${JSON.stringify(message)}`)
  err.cause = lastErr
  throw err
}

export default { sendEmail }
