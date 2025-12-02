#!/usr/bin/env node
import admin from 'firebase-admin'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const serviceAccount = JSON.parse(readFileSync(join(__dirname, '..', 'serviceAccount.json'), 'utf8'))

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

async function setSender() {
  const tenantId = 'tenant_NF2OKj0O5ePsy4j0dzLRDPjT1K02'
  const fromEmail = 'contato@turvia.com.br'
  const fromName = 'Turmail'

  console.log(`Setting sender for tenant ${tenantId}:`)
  console.log(`  fromEmail: ${fromEmail}`)
  console.log(`  fromName: ${fromName}`)

  try {
    const secretsRef = db.doc(`tenants/${tenantId}/settings/secrets`)
    
    await secretsRef.set({
      fromEmail,
      fromName,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: 'manual-script'
    }, { merge: true })

    console.log('✅ Sender saved successfully!')
    console.log('\nAgora você pode:')
    console.log('1. Enviar uma campanha de teste')
    console.log('2. Os emails devem sair como: Turmail <contato@turvia.com.br>')
    console.log('3. Não vai mais dar erro na Brevo!')
    
    process.exit(0)
  } catch (err) {
    console.error('❌ Error:', err)
    process.exit(1)
  }
}

setSender()
