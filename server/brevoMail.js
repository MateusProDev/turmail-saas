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
      // allow per-recipient override for sender name via `fromName`
      const fromName = t.fromName || t.from_name || t.from || undefined
      return { email, name, fromName }
    }
    return null
  }).filter(Boolean)

  if (debug) console.log('[brevoMail] sendEmail start', { idem, timeout, payloadSummary: { to: payloadToSend.to.slice(0,3), subject: payloadToSend.subject, sender: payloadToSend.sender } })

  let attempt = 0
  let lastErr = null
  // If any recipient provides a `fromName`, send per-recipient so `sender.name` can vary.
  const needPerRecipientSender = payloadToSend.to.length > 0 && payloadToSend.to.some(t => !!t.fromName)

  if (needPerRecipientSender) {
    const results = []
    const concurrency = Number(process.env.BREVO_PARALLEL_CONCURRENCY) || 5

    const sendSingleWithRetries = async (rec) => {
      const singlePayload = JSON.parse(JSON.stringify(payloadToSend))
      singlePayload.to = [{ email: rec.email, name: rec.name || rec.email }]
      singlePayload.sender = {
        email: payloadToSend.sender.email,
        name: rec.fromName || payloadToSend.sender.name
      }

      const headersPer = { ...headers, 'Idempotency-Key': `${idem}-${rec.email}-${Date.now()}` }

      let singleAttempt = 0
      while (singleAttempt <= retries) {
        try {
          singleAttempt += 1
          if (debug) console.log('[brevoMail] send single recipient', { to: rec.email, attempt: singleAttempt })
          const resp = await axios.post(BREVO_API_URL, singlePayload, { headers: headersPer, timeout })
          if (debug) console.log('[brevoMail] single success', { email: rec.email, status: resp.status })
          return { email: rec.email, status: resp.status, data: resp.data }
        } catch (err) {
          const status = err?.response?.status
          console.error('[brevoMail] single send error', { to: rec.email, attempt: singleAttempt, status, message: err?.message || err })
          if (status && (status >= 500 || status === 429) && singleAttempt <= retries) {
            const backoff = 200 * Math.pow(2, singleAttempt)
            if (debug) console.log('[brevoMail] retrying single after backoff', backoff)
            await sleep(backoff)
            continue
          }
          return { email: rec.email, error: err?.response?.data || err?.message || String(err) }
        }
      }
      return { email: rec.email, error: 'Max retries exceeded' }
    }

    // process recipients in batches with configured concurrency
    for (let i = 0; i < payloadToSend.to.length; i += concurrency) {
      const batch = payloadToSend.to.slice(i, i + concurrency)
      const promises = batch.map(rec => sendSingleWithRetries(rec))
      // await batch in parallel
      // results from each promise are objects (success or error)
      // we collect them preserving order within the batch
      // using Promise.all so sendSingleWithRetries handles its own errors
      const settled = await Promise.all(promises)
      results.push(...settled)
    }

    return { status: 207, results }
  }

  // Fallback: send as single payload when no per-recipient sender override is required
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
