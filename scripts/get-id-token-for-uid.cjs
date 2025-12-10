#!/usr/bin/env node
/**
 * Usage: node scripts/get-id-token-for-uid.cjs --uid <UID>
 * Requires: serviceAccount.json at project root or FIREBASE_SERVICE_ACCOUNT_JSON env var
 *           and VITE_FIREBASE_API_KEY or FIREBASE_API_KEY env var
 */
const admin = require('firebase-admin')
const fs = require('fs')
const path = require('path')
const https = require('https')

// Init admin
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
      console.error('No service account found. Put serviceAccount.json in project root or set FIREBASE_SERVICE_ACCOUNT_JSON')
      process.exit(1)
    }
  }
} catch (e) {
  console.error('Failed to initialize admin SDK:', e)
  process.exit(1)
}

const args = process.argv.slice(2)
const params = {}
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    params[args[i].slice(2)] = args[i+1]
    i++
  }
}

if (!params.uid) {
  console.error('Usage: node scripts/get-id-token-for-uid.cjs --uid <UID>')
  process.exit(1)
}

const uid = params.uid

async function run() {
  try {
    const customToken = await admin.auth().createCustomToken(uid)
    console.log('Custom token created (short):', customToken.slice(0,40) + '...')

    const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || ''
    if (!apiKey) {
      console.error('Missing Firebase Web API key. Set VITE_FIREBASE_API_KEY or FIREBASE_API_KEY in env.')
      process.exit(1)
    }

    const postData = JSON.stringify({
      token: customToken,
      returnSecureToken: true
    })

    const options = {
      hostname: 'identitytoolkit.googleapis.com',
      path: `/v1/accounts:signInWithCustomToken?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          if (parsed.idToken) {
            console.log('\n=== ID TOKEN (use as Authorization: Bearer <ID_TOKEN>) ===')
            console.log(parsed.idToken)
            console.log('\nExpires in (seconds):', parsed.expiresIn)
            process.exit(0)
          } else {
            console.error('Failed to get idToken:', parsed)
            process.exit(1)
          }
        } catch (e) {
          console.error('Invalid response from signInWithCustomToken:', data)
          process.exit(1)
        }
      })
    })

    req.on('error', (e) => {
      console.error('Request error:', e)
      process.exit(1)
    })

    req.write(postData)
    req.end()

  } catch (e) {
    console.error('Error creating custom token:', e)
    process.exit(1)
  }
}

run()
