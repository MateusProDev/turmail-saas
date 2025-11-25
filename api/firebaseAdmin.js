import admin from 'firebase-admin'
import fs from 'fs'
import path from 'path'

const debug = process.env.DEBUG_API === 'true'
if (debug) console.log('[firebaseAdmin] ESM init')

if (!admin.apps.length) {
  try {
    // 1) Prefer GOOGLE_APPLICATION_CREDENTIALS (path to JSON file)
    const gacPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    if (gacPath) {
      if (debug) console.log('[firebaseAdmin] using GOOGLE_APPLICATION_CREDENTIALS', gacPath)
      // Let the SDK pick up ADC from file
      admin.initializeApp({ credential: admin.credential.applicationDefault() })
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      // 2) Allow passing the full service account JSON as an env var (useful in CI)
      if (debug) console.log('[firebaseAdmin] using FIREBASE_SERVICE_ACCOUNT_JSON env var')
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      admin.initializeApp({ credential: admin.credential.cert(sa) })
    } else {
      // 3) Backwards-compatible: individual env vars (project id, client email, private key)
      const projectId = process.env.FIREBASE_PROJECT_ID
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
      let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || ''
      // Some shells store literal \n sequences; convert them to real newlines
      if (privateKey && privateKey.indexOf('\\n') !== -1) {
        privateKey = privateKey.replace(/\\n/g, '\n')
      }
      if (debug) console.log('[firebaseAdmin] using split env vars', { projectId, clientEmail, hasPrivateKey: !!privateKey })
      admin.initializeApp({
        credential: admin.credential.cert({
          project_id: projectId,
          client_email: clientEmail,
          private_key: privateKey,
        }),
      })
    }
  } catch (err) {
    console.error('[firebaseAdmin] failed to initialize admin SDK', err)
    throw err
  }
}

export const db = admin.firestore()
export default admin
