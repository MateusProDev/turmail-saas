#!/usr/bin/env node

/**
 * Script para testar envio de campanha e diagnosticar problemas
 * Usage: node scripts/test-send-campaign.js <campaignId>
 */

import admin from '../server/firebaseAdmin.js'

const db = admin.firestore()

async function testSendCampaign() {
  const campaignId = process.argv[2]
  
  if (!campaignId) {
    console.error('❌ Uso: node scripts/test-send-campaign.js <campaignId>')
    process.exit(1)
  }

  console.log('🔍 Verificando campanha:', campaignId)

  try {
    // 1. Load campaign
    const campaignDoc = await db.collection('campaigns').doc(campaignId).get()
    
    if (!campaignDoc.exists) {
      console.error('❌ Campanha não encontrada:', campaignId)
      process.exit(1)
    }

    const campaign = campaignDoc.data()
    console.log('\n📧 Dados da Campanha:')
    console.log('  - Subject:', campaign.subject)
    console.log('  - Status:', campaign.status)
    console.log('  - TenantId:', campaign.tenantId)
    console.log('  - Recipients:', Array.isArray(campaign.to) ? campaign.to.length : 'N/A')
    console.log('  - HTML Content:', campaign.htmlContent ? `${campaign.htmlContent.substring(0, 100)}...` : 'N/A')
    console.log('  - Sender:', campaign.sender)
    console.log('  - Attempts:', campaign.attempts || 0)
    console.log('  - HTTP Status:', campaign.httpStatus || 'N/A')
    console.log('  - Message ID:', campaign.messageId || 'N/A')
    
    if (campaign.error) {
      console.log('  - ❌ Error:', campaign.error)
    }
    
    if (campaign.responseBody) {
      console.log('  - Response Body:', JSON.stringify(campaign.responseBody, null, 2))
    }

    // 2. Check tenant configuration
    if (campaign.tenantId) {
      console.log('\n🏢 Verificando configuração do Tenant:', campaign.tenantId)
      
      const tenantDoc = await db.collection('tenants').doc(campaign.tenantId).get()
      if (!tenantDoc.exists) {
        console.error('  ❌ Tenant não encontrado')
      } else {
        const tenant = tenantDoc.data()
        console.log('  - Owner UID:', tenant.ownerUid)
        console.log('  - Name:', tenant.name)
      }

      // Check secrets/settings
      const secretsDoc = await db.collection('tenants').doc(campaign.tenantId).collection('settings').doc('secrets').get()
      if (!secretsDoc.exists) {
        console.log('  ⚠️  Nenhuma configuração de secrets encontrada')
      } else {
        const secrets = secretsDoc.data()
        console.log('  - From Email:', secrets.fromEmail || '(não configurado)')
        console.log('  - From Name:', secrets.fromName || '(não configurado)')
        console.log('  - SMTP Login:', secrets.smtpLogin || '(não configurado)')
        console.log('  - Brevo API Key:', secrets.brevoApiKey ? '✅ Configurada' : '❌ Não configurada')
      }

      // Check subscription
      const subsQuery = await db.collection('subscriptions').where('tenantId', '==', campaign.tenantId).limit(1).get()
      if (!subsQuery.empty) {
        const sub = subsQuery.docs[0].data()
        console.log('\n💳 Subscription:')
        console.log('  - Status:', sub.status)
        console.log('  - Plan:', sub.planId)
        console.log('  - Daily Email Limit:', sub.dailyEmailLimit || 'N/A')
        console.log('  - Emails Sent Today:', sub.emailsSentToday || 0)
        
        if (sub.status === 'trial') {
          const trialEnd = sub.trialEndsAt?.toDate()
          const now = new Date()
          console.log('  - Trial Ends At:', trialEnd)
          console.log('  - Trial Expired?', trialEnd < now ? '❌ SIM' : '✅ NÃO')
        }
      } else {
        console.log('\n⚠️  Nenhuma subscription encontrada')
      }
    }

    // 3. Check environment variables
    console.log('\n🔐 Verificando Variáveis de Ambiente:')
    console.log('  - BREVO_API_KEY:', process.env.BREVO_API_KEY ? '✅ Configurada' : '❌ NÃO CONFIGURADA')
    console.log('  - DEFAULT_FROM_EMAIL:', process.env.DEFAULT_FROM_EMAIL || '❌ NÃO CONFIGURADA')
    console.log('  - DEFAULT_FROM_NAME:', process.env.DEFAULT_FROM_NAME || '(não configurado)')
    console.log('  - BREVO_SMTP_LOGIN:', process.env.BREVO_SMTP_LOGIN || '(não configurado)')

    // 4. Validate campaign data
    console.log('\n✅ Validação:')
    const issues = []
    
    if (!campaign.to || (Array.isArray(campaign.to) && campaign.to.length === 0)) {
      issues.push('❌ Nenhum destinatário (to)')
    }
    
    if (!campaign.subject) {
      issues.push('❌ Sem subject')
    }
    
    if (!campaign.htmlContent) {
      issues.push('❌ Sem htmlContent')
    }
    
    if (!campaign.sender?.email && !process.env.DEFAULT_FROM_EMAIL) {
      issues.push('❌ Sem sender email configurado')
    }

    if (!process.env.BREVO_API_KEY) {
      issues.push('❌ BREVO_API_KEY não configurada no ambiente')
    }

    if (issues.length > 0) {
      console.log('  Problemas encontrados:')
      issues.forEach(issue => console.log('  ', issue))
    } else {
      console.log('  ✅ Todos os dados necessários estão presentes')
    }

    console.log('\n' + '='.repeat(60))
    
    if (issues.length > 0) {
      console.log('❌ A campanha NÃO pode ser enviada. Corrija os problemas acima.')
      process.exit(1)
    } else {
      console.log('✅ A campanha ESTÁ PRONTA para ser enviada.')
      console.log('\nPara enviar, use:')
      console.log(`  curl -X POST https://turmail.turvia.com.br/api/send-campaign \\`)
      console.log(`    -H "Content-Type: application/json" \\`)
      console.log(`    -d '{"campaignId": "${campaignId}"}'`)
    }

  } catch (error) {
    console.error('\n❌ Erro ao verificar campanha:', error)
    process.exit(1)
  }
}

testSendCampaign()
