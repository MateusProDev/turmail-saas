import admin from '../../server/firebaseAdmin'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { domain, tenantId } = req.body

    if (!domain || !tenantId) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    // Buscar chaves da Brevo para o tenant
    const tenantRef = admin.firestore().doc(`tenants/${tenantId}`)
    const tenantSnap = await tenantRef.get()

    if (!tenantSnap.exists) {
      return res.status(404).json({ error: 'Tenant not found' })
    }

    const tenantData = tenantSnap.data()
    const brevoApiKey = tenantData.brevoApiKey

    if (!brevoApiKey) {
      return res.status(400).json({ error: 'Brevo API key not configured for this tenant' })
    }

    // Criar domínio de envio na Brevo
    const brevoResponse = await fetch('https://api.brevo.com/v3/senders/domains', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': brevoApiKey
      },
      body: JSON.stringify({ domain })
    })

    const brevoResult = await brevoResponse.json()

    if (!brevoResponse.ok) {
      throw new Error(brevoResult.message || 'Failed to create domain in Brevo')
    }

    res.status(200).json({
      success: true,
      brevoDomainId: brevoResult.id,
      domain: brevoResult.domain,
      dkim: brevoResult.dkim,
      spf: brevoResult.spf
    })

  } catch (error) {
    console.error('Create sending domain error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}