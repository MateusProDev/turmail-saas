const axios = require('axios')

module.exports = async (req, res) => {
  const debug = process.env.DEBUG_API === 'true'
  if (debug) console.log('[send-campaign] invoked', { method: req.method, headers: req.headers })

  if (req.method !== 'POST') {
    if (debug) console.log('[send-campaign] method not allowed', req.method)
    return res.status(405).end('Method not allowed')
  }

  try {
    const body = req.body
    if (debug) console.log('[send-campaign] body', body)
    const apiKey = process.env.BREVO_API_KEY
    if (!apiKey) {
      console.error('[send-campaign] BREVO_API_KEY missing')
      return res.status(500).json({ error: 'Brevo API key missing' })
    }

    const resp = await axios.post('https://api.brevo.com/v3/smtp/email', body, {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
    })

    if (debug) console.log('[send-campaign] response status', resp.status)
    return res.status(resp.status).json(resp.data)
  } catch (err) {
    console.error('[send-campaign] error', err.response?.data || err.message || err)
    if (debug) return res.status(500).json({ error: err.response?.data || err.message || 'send failed' })
    return res.status(500).json({ error: 'send failed' })
  }
}
