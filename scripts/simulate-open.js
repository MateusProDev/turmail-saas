/**
 * Registra manualmente uma abertura/clique para teste
 */

import 'dotenv/config'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const serviceAccountPath = join(__dirname, '..', 'serviceAccount.json')
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

async function simulateOpen(campaignId, email) {
  console.log(`\n👁️ Simulando abertura de email...\n`)
  console.log(`Campaign: ${campaignId}`)
  console.log(`Email: ${email}\n`)

  const campaignRef = db.collection('campaigns').doc(campaignId)
  const campaignDoc = await campaignRef.get()

  if (!campaignDoc.exists) {
    console.error('❌ Campaign not found')
    return
  }

  const now = new Date()
  const increment = FieldValue.increment(1)

  // Salvar evento
  await campaignRef.collection('events').add({
    type: 'opened',
    email,
    timestamp: now,
    messageId: campaignDoc.data().result?.messageId,
    campaignId,
    source: 'manual_simulation'
  })

  // Atualizar métricas
  await campaignRef.update({
    'metrics.opens': increment,
    'metrics.lastOpenedAt': now,
    'metrics.uniqueOpeners': FieldValue.arrayUnion(email),
    updatedAt: now
  })

  console.log('✅ Abertura registrada!')
  console.log('\n📊 Evento salvo em:')
  console.log(`   /campaigns/${campaignId}/events`)
  console.log('\n📈 Métricas atualizadas:')
  console.log(`   metrics.opens++`)
  console.log(`   metrics.uniqueOpeners += "${email}"`)
  console.log('\n🎯 Agora verifique a página de Relatórios!')
}

// Usar a campanha mais recente
const campaignId = process.argv[2] || 'camp_7n4PYda-Jj'
const email = process.argv[3] || 'mateusferreiraprodev@gmail.com'

simulateOpen(campaignId, email)
