import admin from 'firebase-admin'

const debug = process.env.DEBUG_API === 'true'
if (debug) console.log('[firebaseAdmin] ESM init')

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || ''
  if (privateKey && privateKey.indexOf('\\n') !== -1) {
    privateKey = privateKey.replace(/\\n/g, '\n')
  }

  if (debug) console.log('[firebaseAdmin] creds', { projectId, clientEmail, hasPrivateKey: !!privateKey })

  admin.initializeApp({
    credential: admin.credential.cert({
      // firebase-admin expects the service account keys using snake_case
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey,
    }),
  })
}

export const db = admin.firestore()
export default admin
