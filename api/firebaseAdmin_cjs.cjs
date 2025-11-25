const admin = require('firebase-admin')

const debug = process.env.DEBUG_API === 'true'
if (debug) console.log('[firebaseAdmin] initializing')

if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || ''
    if (privateKey && privateKey.indexOf('\\n') !== -1) {
      privateKey = privateKey.replace(/\\n/g, '\n')
    }

    if (debug) console.log('[firebaseAdmin] creds', { projectId, clientEmail, hasPrivateKey: !!privateKey })

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    })
  } catch (err) {
    console.error('[firebaseAdmin] initialization error', err && err.message ? err.message : err)
    if (debug) console.error(err.stack)
    throw err
  }
}

const db = admin.firestore()
module.exports = { admin, db }
