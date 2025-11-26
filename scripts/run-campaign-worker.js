#!/usr/bin/env node
import dotenv from 'dotenv'
dotenv.config({ path: '.env' })
import admin from '../api/firebaseAdmin.js'
import { sendUsingBrevoOrSmtp } from '../api/sendHelper.js'

const db = admin.firestore()

async function processCampaign(doc) {
  const id = doc.id
  const data = doc.data()
  console.log(`Processing campaign ${id} tenant=${data.tenantId} status=${data.status}`)

  try {
    await doc.ref.update({ status: 'processing', updatedAt: admin.firestore.FieldValue.serverTimestamp() })
    const payload = {
      subject: data.subject,
      htmlContent: data.htmlContent,
      to: data.to,
      sender: data.sender || { name: 'No Reply', email: `no-reply@${process.env.DEFAULT_HOST || 'localhost'}` },
    }
    const res = await sendUsingBrevoOrSmtp({ tenantId: data.tenantId, payload })
    const updates = { status: 'sent', result: res.data || null, attempts: (data.attempts || 0) + 1, sentAt: admin.firestore.FieldValue.serverTimestamp() }
    if (res && res.data && (res.data.messageId || res.data['messageId'])) updates.messageId = res.data.messageId || res.data['messageId']
    await doc.ref.update(updates)
    console.log(`Campaign ${id} sent; result=`, res.data)
  } catch (err) {
    console.error(`Campaign ${id} failed:`, err && err.message)
    const attempts = (data.attempts || 0) + 1
    const updates = { attempts }
    if (attempts >= 3) updates.status = 'failed'
    else updates.status = 'queued'
    updates.lastError = err && (err.message || String(err))
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp()
    await doc.ref.update(updates)
  }
}

async function main() {
  const args = process.argv.slice(2)
  const once = args.includes('--once')
  const iterationsArg = args.find(a => a.startsWith('--iterations='))
  const maxIterations = iterationsArg ? Number(iterationsArg.split('=')[1]) : Infinity
  console.log('Campaign worker starting...', { once, maxIterations })
  let iter = 0
  while (true) {
    if (iter >= maxIterations) {
      console.log('Max iterations reached, exiting')
      break
    }
    iter += 1
    try {
      // find next queued or retryable campaigns
      // NOTE: composite Firestore index would be required for combining 'in' and '<=' with orderBy.
      // To avoid requiring an index here, query by status and filter scheduledAt locally.
      const now = admin.firestore.Timestamp.now()
      const q = db.collection('campaigns')
        .where('status', 'in', ['queued', 'retry'])
        .limit(50)
      const snap = await q.get()
      // filter for scheduledAt <= now
      const candidates = snap.docs.filter(d => {
        const s = d.data().scheduledAt
        if (!s) return true
        try { return s.toMillis ? s.toMillis() <= now.toMillis() : new Date(s).getTime() <= now.toMillis() } catch (e) { return true }
      }).slice(0, 5)
      if (candidates.length === 0) {
        if (once) {
          console.log('No candidates found (once mode). Exiting.')
          break
        }
        await new Promise(r => setTimeout(r, 5000))
        continue
      }
      if (snap.empty) {
        // sleep
        await new Promise(r => setTimeout(r, 5000))
        continue
      }
      for (const doc of candidates) {
        await processCampaign(doc)
      }

      if (once) {
        console.log('Once mode: processed candidates, exiting.')
        break
      }
    } catch (err) {
      console.error('Worker error', err)
      await new Promise(r => setTimeout(r, 5000))
    }
  }
}

main()
