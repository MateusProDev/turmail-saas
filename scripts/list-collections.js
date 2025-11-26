#!/usr/bin/env node
import admin from '../api/firebaseAdmin.js'

async function run() {
  try {
    const db = admin.firestore()
    console.log('Listing root collections and counts:')
    const cols = await db.listCollections()
    for (const c of cols) {
      try {
        const snap = await c.limit(1).get()
        const size = snap.size
        console.log(`- ${c.id} (hasDocs=${size>0})`)
      } catch (err) {
        console.log(`- ${c.id} (error reading: ${err.message})`)
      }
    }
    process.exit(0)
  } catch (err) {
    console.error('list-collections failed', err)
    process.exit(2)
  }
}

run()
