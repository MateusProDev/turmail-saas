#!/usr/bin/env node
import admin from '../api/firebaseAdmin.js'

async function run() {
  try {
    const db = admin.firestore()
    const snap = await db.collection('tenants').get()
    console.log('Found %d tenants', snap.size)
    for (const doc of snap.docs) {
      const id = doc.id
      const data = doc.data() || {}
      const settingsRef = db.collection('tenants').doc(id).collection('settings').doc('secrets')
      const sSnap = await settingsRef.get()
      const sData = sSnap.exists ? sSnap.data() : null
      const encrypted = sData && sData.encrypted === true
      const rawKey = sData && sData.brevoApiKey
      let masked = '<none>'
      if (rawKey) {
        if (typeof rawKey === 'string' && rawKey.startsWith('{"v":1')) masked = '<looks-encrypted>'
        else masked = `${String(rawKey).slice(0,6)}...(${String(rawKey).length} chars)`
      }
      console.log('tenant=%s encrypted=%s key=%s', id, encrypted, masked)
    }
    process.exit(0)
  } catch (err) {
    console.error('list-tenants failed', err)
    process.exit(2)
  }
}

run()
