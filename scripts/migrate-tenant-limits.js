#!/usr/bin/env node

/**
 * Migração: Adicionar limites iniciais aos tenants que não têm
 *
 * Este script garante que todos os tenants tenham os campos 'limits' e 'status' inicializados
 * com os valores do plano trial, caso não tenham sido definidos durante a criação.
 */

import admin from 'firebase-admin'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Carregar service account
const serviceAccountPath = join(__dirname, '..', 'serviceAccount.json')
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))

// Inicializar Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })
} catch (error) {
  console.error('Erro ao inicializar Firebase Admin:', error.message)
  process.exit(1)
}

const db = admin.firestore()

async function migrateTenantLimits() {
  console.log('🚀 Iniciando migração de limites para tenants...\n')

  try {
    // Carregar configuração dos planos
    const { PLANS } = await import('../server/lib/plans.js')
    const trialLimits = PLANS.trial.limits

    console.log('📋 Limites do trial que serão aplicados:')
    console.log(JSON.stringify(trialLimits, null, 2))
    console.log()

    const tenantsRef = db.collection('tenants')
    const snapshot = await tenantsRef.get()

    let updated = 0
    let skipped = 0
    let errors = 0

    console.log(`📊 Processando ${snapshot.size} tenants...\n`)

    for (const doc of snapshot.docs) {
      try {
        const data = doc.data()
        const tenantId = doc.id

        if (!data.limits) {
          console.log(`✅ Atualizando tenant ${tenantId} com limites do trial`)

          await doc.ref.update({
            limits: trialLimits,
            status: data.status || 'trial',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          })

          updated++
        } else {
          console.log(`⏭️  Tenant ${tenantId} já tem limites, pulando`)
          skipped++
        }
      } catch (error) {
        console.error(`❌ Erro ao processar tenant ${doc.id}:`, error.message)
        errors++
      }
    }

    console.log('\n🎉 Migração concluída!')
    console.log(`📈 Estatísticas:`)
    console.log(`   • Tenants atualizados: ${updated}`)
    console.log(`   • Tenants pulados: ${skipped}`)
    console.log(`   • Erros: ${errors}`)
    console.log(`   • Total processado: ${snapshot.size}`)

    if (errors > 0) {
      console.log('\n⚠️  Alguns tenants não puderam ser atualizados. Verifique os logs acima.')
      process.exit(1)
    } else {
      console.log('\n✅ Todos os tenants foram processados com sucesso!')
    }

  } catch (error) {
    console.error('❌ Erro durante a migração:', error)
    process.exit(1)
  }
}

// Executar migração
migrateTenantLimits().catch(error => {
  console.error('❌ Erro fatal:', error)
  process.exit(1)
})