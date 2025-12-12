#!/usr/bin/env node
import 'dotenv/config'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load service account if FIREBASE_SERVICE_ACCOUNT_JSON not set
if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    const serviceAccountPath = join(__dirname, '..', 'serviceAccount.json')
    const serviceAccount = readFileSync(serviceAccountPath, 'utf8')
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = serviceAccount
    console.log('✅ Loaded serviceAccount.json')
  } catch (err) {
    console.warn('⚠️ Could not load serviceAccount.json:', err.message)
  }
}

import admin from '../server/firebaseAdmin.js'

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
