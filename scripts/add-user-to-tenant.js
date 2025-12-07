import 'dotenv/config'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load service account
const serviceAccountPath = join(__dirname, '..', 'serviceAccount.json')
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount)
})

const db = getFirestore()

async function addUserToTenant() {
  const userId = 'NF2OKj0O5ePsy4j0dzLRDPjT1K02'
  const tenantId = 'tenant_NF2OKj0O5ePsy4j0dzLRDPjT1K02'
  
  console.log(`\n📝 Adding user ${userId} to tenant ${tenantId}...\n`)
  
  try {
    // Check if member already exists
    const memberRef = db.doc(`tenants/${tenantId}/members/${userId}`)
    const memberDoc = await memberRef.get()
    
    if (memberDoc.exists) {
      console.log('✅ User is already a member of this tenant')
      console.log('Current data:', memberDoc.data())
      return
    }
    
    // Add user as owner
    await memberRef.set({
      uid: userId,
      role: 'owner',
      joinedAt: new Date(),
      displayName: 'Owner',
      email: 'owner@turvia.com.br' // Update with actual email if available
    })
    
    console.log('✅ User successfully added as owner of tenant')
    console.log(`\nPath: tenants/${tenantId}/members/${userId}`)
    console.log('Role: owner')
    
  } catch (error) {
    console.error('❌ Error adding user to tenant:', error)
  }
}

addUserToTenant()
