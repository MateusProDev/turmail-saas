import admin from '../../server/firebaseAdmin'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { senderId, tenantId } = req.body

    if (!senderId || !tenantId) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    // Buscar dados do sender no Firestore
    const senderRef = admin.firestore().doc(`tenants/${tenantId}/senderIdentities/${senderId}`)
    const senderSnap = await senderRef.get()

    if (!senderSnap.exists) {
      return res.status(404).json({ error: 'Sender not found' })
    }

    const senderData = senderSnap.data()

    // Buscar chaves da Brevo
    const tenantRef = admin.firestore().doc(`tenants/${tenantId}`)
    const tenantSnap = await tenantRef.get()
    const brevoApiKey = tenantSnap.data().brevoApiKey

    // Verificar sender na Brevo
    const brevoResponse = await fetch(`https://api.brevo.com/v3/senders/${senderData.brevoSenderId}`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey
      }
    })

    const brevoResult = await brevoResponse.json()

    if (!brevoResponse.ok) {
      throw new Error(brevoResult.message || 'Failed to verify sender in Brevo')
    }

    // Atualizar status no Firestore
    const updateData = {
      status: brevoResult.active ? 'verified' : 'pending'
    }

    if (brevoResult.active) {
      updateData.verifiedAt = new Date()
    }

    await senderRef.update(updateData)

    res.status(200).json({
      success: true,
      verified: brevoResult.active
    })

  } catch (error) {
    console.error('Verify sender error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}