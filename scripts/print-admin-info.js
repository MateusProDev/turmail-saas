#!/usr/bin/env node
import admin from '../api/firebaseAdmin.js'

function safeParse(json) {
  try { return JSON.parse(json) } catch (_) { return null }
}

console.log('--- print-admin-info ---')
console.log('process.env.FIREBASE_PROJECT_ID =', process.env.FIREBASE_PROJECT_ID || '<not-set>')
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  const svc = safeParse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
  console.log('FIREBASE_SERVICE_ACCOUNT_JSON.project_id =', svc?.project_id || '<invalid-json>')
} else {
  console.log('FIREBASE_SERVICE_ACCOUNT_JSON = <not-set>')
}

try {
  console.log('admin.apps.length =', admin.apps.length)
  if (admin.apps.length) {
    const info = admin.app().options || {}
    console.log('admin.app().options.projectId =', info.projectId || '<not-set>')
    console.log('admin.app().options.credential =', info.credential ? '<present>' : '<none>')
  }
} catch (err) {
  console.error('failed to read admin app info', err)
}

console.log('--- end ---')
