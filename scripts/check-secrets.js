import 'dotenv/config'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const serviceAccountPath = join(__dirname, '..', 'serviceAccount.json')
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

const tenantId = process.argv[2] || 'tenant_NF2OKj0O5ePsy4j0dzLRDPjT1K02'

async function checkSecrets() {
  console.log(`\n📋 Checking secrets for tenant: ${tenantId}\n`)
  
  const settingsRef = db.collection('tenants').doc(tenantId).collection('settings').doc('secrets')
  const doc = await settingsRef.get()
  
  if (!doc.exists) {
    console.log('❌ No secrets document found')
    return
  }
  
  const data = doc.data()
  console.log('📄 Secrets structure:')
  console.log(JSON.stringify(data, null, 2))
  
  // Check for keys subcollection
  console.log('\n🔑 Checking for keys...')
  
  // Check settings/keys/list subcollection
  const keysDoc = await db.collection('tenants').doc(tenantId).collection('settings').doc('keys').get()
  if (keysDoc.exists) {
    console.log('Keys document exists:', keysDoc.data())
  }
  
  const keysListSnapshot = await db.collection('tenants').doc(tenantId).collection('settings').doc('keys').collection('list').get()
  
  if (!keysListSnapshot.empty) {
    console.log(`\nFound ${keysListSnapshot.size} keys in settings/keys/list:`)
    keysListSnapshot.forEach(keyDoc => {
      console.log(`\n  Key ID: ${keyDoc.id}`)
      console.log(`  Data:`, JSON.stringify(keyDoc.data(), null, 4))
    })
  } else {
    console.log('No keys found in settings/keys/list')
  }
  
  // Check main tenants doc
  console.log('\n📦 Checking main tenant document...')
  const tenantDoc = await db.collection('tenants').doc(tenantId).get()
  if (tenantDoc.exists) {
    console.log('Tenant data keys:', Object.keys(tenantDoc.data()))
  }
}

checkSecrets()
