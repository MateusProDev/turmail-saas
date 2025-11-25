const axios = require('axios')

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed')

  try {
    const body = req.body
    const apiKey = process.env.BREVO_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'Brevo API key missing' })

    // Proxy to Brevo / SMTP send or Campaigns endpoint
    const resp = await axios.post('https://api.brevo.com/v3/smtp/email', body, {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
    })

    return res.status(resp.status).json(resp.data)
  } catch (err) {
    console.error(err.response?.data || err.message)
    return res.status(500).json({ error: 'send failed' })
  }
}
