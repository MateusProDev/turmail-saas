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
  if (debug) console.log('[brevoMail] sendEmail start', { idem, timeout, payloadSummary: { to: Array.isArray(payload.to) ? payload.to.slice(0,3) : payload.to, subject: payload.subject } })

  let attempt = 0
  let lastErr = null
  while (attempt <= retries) {
    try {
      attempt += 1
      if (debug) console.log('[brevoMail] attempt', attempt, { idem })
      const resp = await axios.post(BREVO_API_URL, payload, { headers, timeout })
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
