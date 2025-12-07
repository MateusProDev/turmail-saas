#!/usr/bin/env node

/**
 * Script para listar últimas campanhas criadas
 * Usage: node scripts/list-campaigns.js
 */

import admin from '../server/firebaseAdmin.js'

const db = admin.firestore()

async function listCampaigns() {
  try {
    console.log('📧 Buscando últimas campanhas...\n')
    
    const snapshot = await db.collection('campaigns')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get()

    if (snapshot.empty) {
      console.log('❌ Nenhuma campanha encontrada')
      return
    }

    snapshot.forEach((doc, index) => {
      const data = doc.data()
      console.log(`${index + 1}. ID: ${doc.id}`)
      console.log(`   Subject: ${data.subject || 'N/A'}`)
      console.log(`   Status: ${data.status || 'N/A'}`)
      console.log(`   Created: ${data.createdAt?.toDate() || 'N/A'}`)
      console.log(`   Tenant: ${data.tenantId || 'N/A'}`)
      console.log(`   Recipients: ${Array.isArray(data.to) ? data.to.length : 'N/A'}`)
      console.log(`   Attempts: ${data.attempts || 0}`)
      
      if (data.error) {
        console.log(`   ❌ Error: ${typeof data.error === 'object' ? JSON.stringify(data.error) : data.error}`)
      }
      
      if (data.httpStatus) {
        console.log(`   HTTP Status: ${data.httpStatus}`)
      }
      
      console.log('')
    })

  } catch (error) {
    console.error('❌ Erro:', error)
  }
}

listCampaigns()
