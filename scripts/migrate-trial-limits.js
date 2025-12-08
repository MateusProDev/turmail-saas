/**
 * Script para migrar contas trial antigas para os novos limites
 * 
 * ANTES:
 * - 7 dias
 * - 50 emails/dia (350 total)
 * - 5 campanhas
 * - 100 contatos
 * 
 * DEPOIS:
 * - 14 dias
 * - 50 emails/dia (700 total)
 * - Campanhas ilimitadas (-1)
 * - 1.000 contatos
 * - Templates ilimitados (-1)
 */

import admin from 'firebase-admin'
import { readFileSync } from 'fs'

// Initialize Firebase Admin
const serviceAccount = JSON.parse(readFileSync('./serviceAccount.json', 'utf8'))
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const db = admin.firestore()

async function migrateTrialLimits() {
  console.log('🔄 Iniciando migração de limites do Trial...\n')

  try {
    // Buscar todas as subscriptions com planId = 'trial'
    const subsRef = db.collection('subscriptions')
    const trialQuery = await subsRef.where('planId', '==', 'trial').get()

    console.log(`📊 Encontradas ${trialQuery.size} contas trial para atualizar\n`)

    if (trialQuery.empty) {
      console.log('✅ Nenhuma conta trial encontrada. Nada a fazer.')
      process.exit(0)
    }

    let updated = 0
    let errors = 0

    for (const doc of trialQuery.docs) {
      const data = doc.data()
      const oldLimits = data.limits || {}

      console.log(`\n📧 Subscription: ${doc.id}`)
      console.log(`   Email: ${data.email || 'N/A'}`)
      console.log(`   Limites antigos:`, oldLimits)

      try {
        // Novos limites do trial (14 dias)
        const newLimits = {
          emailsPerDay: 50,
          emailsPerMonth: 700, // 50/dia * 14 dias
          campaigns: -1, // ILIMITADO
          contacts: 1000, // 1.000 contatos
          templates: -1, // ILIMITADO
        }

        // Calcular nova data de término (se ainda estiver ativo)
        let updateData = {
          limits: newLimits,
          trialDays: 14,
        }

        // Se o trial ainda não expirou, estender para 14 dias do início
        if (data.trialEndsAt) {
          const trialEndsAt = data.trialEndsAt.toDate ? data.trialEndsAt.toDate() : new Date(data.trialEndsAt)
          const now = new Date()
          
          if (trialEndsAt > now) {
            // Trial ainda ativo - recalcular baseado na data de criação
            const createdAt = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
            const newEndDate = new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000)
            newEndDate.setHours(23, 59, 59, 999)
            
            updateData.trialEndsAt = admin.firestore.Timestamp.fromDate(newEndDate)
            
            console.log(`   ⏰ Trial estendido de ${trialEndsAt.toLocaleDateString()} para ${newEndDate.toLocaleDateString()}`)
          } else {
            console.log(`   ⚠️  Trial expirado em ${trialEndsAt.toLocaleDateString()} - mantendo data`)
          }
        }

        await doc.ref.update(updateData)
        
        console.log(`   ✅ Limites atualizados:`, newLimits)
        updated++

        // Atualizar também o tenant se existir
        if (data.tenantId) {
          const tenantRef = db.collection('tenants').doc(data.tenantId)
          const tenantSnap = await tenantRef.get()
          
          if (tenantSnap.exists) {
            await tenantRef.update({
              limits: newLimits,
              planId: 'trial',
            })
            console.log(`   ✅ Tenant ${data.tenantId} atualizado`)
          }
        }

      } catch (err) {
        console.error(`   ❌ Erro ao atualizar ${doc.id}:`, err.message)
        errors++
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log(`\n✅ Migração concluída!`)
    console.log(`   📊 Total de contas: ${trialQuery.size}`)
    console.log(`   ✅ Atualizadas: ${updated}`)
    console.log(`   ❌ Erros: ${errors}`)
    console.log('\n' + '='.repeat(60))

  } catch (err) {
    console.error('❌ Erro na migração:', err)
    process.exit(1)
  }

  process.exit(0)
}

// Executar migração
migrateTrialLimits()
