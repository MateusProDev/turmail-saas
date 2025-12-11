import admin from '../firebaseAdmin.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end('Method not allowed')

  const { tenantId } = req.query
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' })

  const authHeader = req.headers.authorization || req.headers.Authorization || ''
  const match = (Array.isArray(authHeader) ? authHeader[0] : authHeader).toString().trim().match(/^Bearer (.+)$/i)
  if (!match) return res.status(401).json({ error: 'Missing Authorization Bearer token' })

  const idToken = match[1]
  try {
    const decoded = await admin.auth().verifyIdToken(idToken)
    const uid = decoded.uid
    const db = admin.firestore()

    // Verificar se o usuário é membro do tenant
    const memberDoc = await db.collection('tenants').doc(tenantId).collection('members').doc(uid).get()
    if (!memberDoc.exists) {
      return res.status(403).json({ error: 'Access denied - not a member of this tenant' })
    }

    // Buscar subscription do tenant
    const subscriptionsRef = db.collection('subscriptions')
    const querySnapshot = await subscriptionsRef.where('tenantId', '==', tenantId).limit(1).get()

    if (querySnapshot.empty) {
      return res.status(200).json({ subscription: null })
    }

    const subscriptionDoc = querySnapshot.docs[0]
    const subscription = {
      id: subscriptionDoc.id,
      ...subscriptionDoc.data()
    }

    return res.status(200).json({ subscription })
  } catch (e) {
    console.error('[subscription] error', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
}