#!/usr/bin/env node
const admin = require('firebase-admin')
const fs = require('fs')
const path = require('path')

// Initialize admin
try {
  if (!admin.apps.length) {
    const saPath = path.join(__dirname, '..', 'serviceAccount.json')
    if (fs.existsSync(saPath)) {
      const sa = require(saPath)
      admin.initializeApp({ credential: admin.credential.cert(sa) })
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      admin.initializeApp({ credential: admin.credential.cert(sa) })
    } else {
      console.error('No service account found. Set FIREBASE_SERVICE_ACCOUNT_JSON or ensure serviceAccount.json exists at project root.')
      process.exit(1)
    }
  }
} catch (e) {
  console.error('Failed to initialize Firebase Admin SDK:', e)
  process.exit(1)
}

// Use getFirestore() for compatibility with newer firebase-admin versions
let db
try {
  const { getFirestore } = require('firebase-admin/firestore')
  db = getFirestore()
} catch (e) {
  // Fallback to admin.firestore() for older versions
  db = admin.firestore()
}

(async function main() {
  try {
    const q = await db.collection('debug_webhooks').orderBy('receivedAt', 'desc').limit(20).get()
    if (q.empty) return console.log('No debug_webhooks documents found')
    q.docs.forEach(d => {
      const data = d.data()
      console.log('---')
      console.log('id:', d.id)
      console.log('receivedAt:', data.receivedAt && data.receivedAt.toDate ? data.receivedAt.toDate() : data.receivedAt)
      console.log('eventType:', data.eventType)
      if (data.payload) {
        try {
          console.log('payload (keys):', Object.keys(data.payload).slice(0,20))
        } catch (e) {
          console.log('payload: (could not list keys)')
        }
      }
      if (data.rawBase64) console.log('rawBase64: (present)')
    })
  } catch (e) {
    console.error('Error listing debug_webhooks:', e)
  }
})()
