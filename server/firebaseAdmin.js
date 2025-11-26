import admin from 'firebase-admin'
import fs from 'fs'
import path from 'path'

const debug = process.env.DEBUG_API === 'true'
if (debug) console.log('[firebaseAdmin] ESM init')

if (!admin.apps.length) {
  try {
    const gacPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    if (gacPath) {
      if (debug) console.log('[firebaseAdmin] using GOOGLE_APPLICATION_CREDENTIALS', gacPath)
      admin.initializeApp({ credential: admin.credential.applicationDefault() })
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      if (debug) console.log('[firebaseAdmin] using FIREBASE_SERVICE_ACCOUNT_JSON env var')
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      admin.initializeApp({ credential: admin.credential.cert(sa) })
    } else {
      const projectId = process.env.FIREBASE_PROJECT_ID
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
      let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || ''
      if (privateKey && privateKey.indexOf('\\n') !== -1) {
        privateKey = privateKey.replace(/\\n/g, '\n')
      }
      const missing = []
      if (!projectId) missing.push('FIREBASE_PROJECT_ID')
      if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL')
      if (!privateKey) missing.push('FIREBASE_ADMIN_PRIVATE_KEY')
      if (missing.length > 0) {
        throw new Error(
          `[firebaseAdmin] missing admin credentials: ${missing.join(', ')}. ` +
            `Provide GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_SERVICE_ACCOUNT_JSON, or the split env vars.`
        )
      }

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
