import admin from '../firebaseAdmin.js'

const db = admin.firestore()

export default async function handler(req, res) {
  const debug = process.env.DEBUG_API === 'true'
  if (debug) console.log('[start-trial] invoked', { method: req.method })

  if (req.method !== 'POST') return res.status(405).end('Method not allowed')

  try {
    // Require authentication: verify Firebase ID token
    const authHeader = req.headers.authorization || req.headers.Authorization || ''
    if (!authHeader || !String(authHeader).startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing Authorization Bearer token' })
    }
    const idToken = String(authHeader).replace(/^Bearer\s+/i, '')
    let decoded
    try {
      decoded = await admin.auth().verifyIdToken(idToken)
    } catch (e) {
      console.error('[start-trial] token verify failed', e && e.message ? e.message : e)
      return res.status(401).json({ error: 'Invalid authentication token' })
    }

    const { uid: bodyUid, email: bodyEmail, planId } = req.body || {}
    const uid = decoded.uid || bodyUid
    const email = decoded.email || bodyEmail || ''
    if (!uid) return res.status(400).json({ error: 'uid required' })

    // Attempt to determine client IP
    const xff = req.headers['x-forwarded-for'] || req.headers['X-Forwarded-For']
    const ipFromHeader = typeof xff === 'string' ? xff.split(',')[0].trim() : null
    const ip = ipFromHeader || req.connection?.remoteAddress || null

    // Check for existing subscription
    const subsRef = db.collection('subscriptions')
    const q = await subsRef
      .where('uid', '==', uid)
      .where('status', 'in', ['trial', 'active'])
      .limit(1)
      .get()

    if (!q.empty) {
      const existing = q.docs[0]
      if (debug) console.log('[start-trial] existing subscription found', existing.id)
      return res.json({ ok: true, id: existing.id, existing: true })
    }

    // Create tenant automatically if doesn't exist
    const tenantId = `tenant_${uid}`
    const tenantRef = db.collection('tenants').doc(tenantId)
    const tenantSnap = await tenantRef.get()

    if (!tenantSnap.exists) {
      if (debug) console.log('[start-trial] creating tenant', tenantId)

      // Determine user info first so we can persist ownerEmail correctly
      let displayName = ''
      let userEmail = email || ''
      try {
        const userRecord = await admin.auth().getUser(uid)
        displayName = userRecord.displayName || ''
        userEmail = userRecord.email || userEmail
      } catch (e) {
        // ignore if unable to fetch user
      }

      await tenantRef.set({ 
        createdAt: admin.firestore.FieldValue.serverTimestamp(), 
        ownerUid: uid, 
        ownerEmail: userEmail || '',
        name: `Account ${uid}`,
        plan: 'trial',
      }, { merge: true })

      // Add user as owner member
      const memberRef = tenantRef.collection('members').doc(uid)
      await memberRef.set({ 
        role: 'owner', 
        createdAt: admin.firestore.FieldValue.serverTimestamp(), 
        email: userEmail, 
        displayName 
      }, { merge: true })

      // Initialize settings
      const secretsRef = tenantRef.collection('settings').doc('secrets')
      await secretsRef.set({ 
        fromEmail: null, 
        fromName: null, 
        smtpLogin: null 
      }, { merge: true })
    }

    // 14 days trial ending at 23:59:59 of the 14th day
    const now = new Date()
    const trialEndDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    trialEndDate.setHours(23, 59, 59, 999)
    const trialEndsAt = trialEndDate

    // Create subscription with NEW trial limits (14 dias)
    const doc = {
      uid,
      email: email || '',
      displayName: '',
      photoURL: '',
      role: 'user',
      plan: 'trial',
      planId: 'trial',
      tenantId: `tenant_${uid}`,
      stripeCustomerId: '',
      billing: {},
      company: { name: '', website: '' },
      phone: '',
      locale: 'pt-BR',
      onboardingCompleted: true, // Set to true to avoid onboarding modal
      metadata: {},
      ownerUid: uid,
      status: 'trial',
      trialEndsAt,
      trialDays: 14,
      limits: {
        emailsPerDay: 50,
        emailsPerMonth: 1500, // 50/dia * 30 dias
        campaigns: -1, // ILIMITADO
        contacts: 1000, // 1.000 contatos
        templates: -1, // ILIMITADO
      },
      ipAddress: ip,
      createdAt: new Date(),
    }

    const ref = await db.collection('subscriptions').add(doc)
    if (debug) console.log('[start-trial] created subscription', ref.id, '- 14 days, 50 emails/day, 1k contacts')

    return res.json({ 
      ok: true, 
      id: ref.id, 
      existing: false,
      tenantId: `tenant_${uid}`,
      trialDays: 7,
      limits: doc.limits,
    })
  } catch (err) {
    console.error('[start-trial] error', err && err.message ? err.message : err)
    return res.status(500).json({ error: 'internal' })
  }
}
