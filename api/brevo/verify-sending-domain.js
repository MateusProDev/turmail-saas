import admin from '../../server/firebaseAdmin'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { domainId, tenantId } = req.body

    if (!domainId || !tenantId) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    // Buscar dados do domínio no Firestore
    const domainRef = admin.firestore().doc(`tenants/${tenantId}/sendingDomains/${domainId}`)
    const domainSnap = await domainRef.get()

    if (!domainSnap.exists) {
      return res.status(404).json({ error: 'Domain not found' })
    }

    const domainData = domainSnap.data()

    // Buscar chaves da Brevo
    const tenantRef = admin.firestore().doc(`tenants/${tenantId}`)
    const tenantSnap = await tenantRef.get()
    const brevoApiKey = tenantSnap.data().brevoApiKey

    // Verificar domínio na Brevo
    const brevoResponse = await fetch(`https://api.brevo.com/v3/senders/domains/${domainData.brevoDomainId}`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey
      }
    })

    const brevoResult = await brevoResponse.json()

    if (!brevoResponse.ok) {
      throw new Error(brevoResult.message || 'Failed to verify domain in Brevo')
    }

    // Atualizar status no Firestore
    const updateData = {
      status: brevoResult.verified ? 'verified' : 'pending',
      dkimStatus: brevoResult.dkim?.verified ? 'verified' : 'pending',
      spfStatus: brevoResult.spf?.verified ? 'verified' : 'pending'
    }

    if (brevoResult.verified) {
      updateData.verifiedAt = new Date()
    }

    await domainRef.update(updateData)

    res.status(200).json({
      success: true,
      verified: brevoResult.verified,
      dkimVerified: brevoResult.dkim?.verified,
      spfVerified: brevoResult.spf?.verified
    })

  } catch (error) {
    console.error('Verify sending domain error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}