import { db } from './firebaseAdmin.js'

export default async function handler(req, res) {
  const debug = process.env.DEBUG_API === 'true'
  if (debug) console.log('[start-trial] invoked', { method: req.method })

  if (req.method !== 'POST') return res.status(405).end('Method not allowed')

  try {
    const { uid, email, planId } = req.body || {}
    if (!uid) return res.status(400).json({ error: 'uid required' })

    // Attempt to determine client IP. In many deployments the real IP will
    // be available on X-Forwarded-For. Fall back to connection remoteAddress.
    const xff = req.headers['x-forwarded-for'] || req.headers['X-Forwarded-For']
    const ipFromHeader = typeof xff === 'string' ? xff.split(',')[0].trim() : null
    const ip = ipFromHeader || req.connection?.remoteAddress || null

    // Check for an existing subscription for this user that is still
    // relevant (trial or active). If found, return it to keep this
    // endpoint idempotent and avoid duplicating trial docs.
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

    // 14 days trial
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

    const doc = {
      email: email || null,
      uid,
      ownerUid: uid,
      planId: planId || 'free',
      status: 'trial',
      trialEndsAt,
      ipAddress: ip,
      createdAt: new Date(),
    }

    const ref = await db.collection('subscriptions').add(doc)
    if (debug) console.log('[start-trial] created subscription', ref.id)

    // NOTE: Storing IP addresses has privacy implications. Ensure your
    // privacy policy discloses this and you comply with local law.

    return res.json({ ok: true, id: ref.id, existing: false })
  } catch (err) {
    console.error('[start-trial] error', err && err.message ? err.message : err)
    return res.status(500).json({ error: 'internal' })
  }
}
