import admin from '../firebaseAdmin.js'
const db = admin.firestore()

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { session_id, uid } = req.query

  if (!session_id || !uid) {
    return res.status(400).json({ error: 'Missing parameters: session_id and uid required' })
  }

  try {
    // 1. Verificar se subscription foi atualizada no Firestore
    const subscriptionsRef = db.collection('subscriptions')
    const snapshot = await subscriptionsRef
      .where('uid', '==', uid)
      .where('status', '==', 'active')
      .limit(1)
      .get()

    if (snapshot.empty) {
      return res.json({
        status: 'pending',
        message: 'Pagamento ainda sendo processado pelo webhook'
      })
    }

    const subscription = snapshot.docs[0].data()

    // 2. Retornar status completo
    return res.json({
      status: 'completed',
      subscription: {
        planId: subscription.planId,
        status: subscription.status,
        onboardingCompleted: subscription.onboardingCompleted,
        requiresOnboarding: subscription.planId !== 'trial' && !subscription.onboardingCompleted,
        paymentStatus: subscription.paymentStatus,
        lastPaymentDate: subscription.lastPaymentDate,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd
      }
    })

  } catch (error) {
    console.error('Error verifying payment:', error)
    return res.status(500).json({ error: error.message })
  }
}