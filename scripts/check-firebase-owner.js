/**
 * Script para verificar informações do projeto Firebase
 * Mostra quem é o owner e permissões
 */

const admin = require('firebase-admin')

// Inicializar Firebase Admin
if (!admin.apps.length) {
  try {
    // Tenta usar serviceAccount.json primeiro
    const serviceAccount = require('../serviceAccount.json')
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
    console.log('✅ Firebase Admin inicializado com serviceAccount.json')
  } catch (e) {
    // Se não existir, tenta usar variáveis de ambiente
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
    console.log('✅ Firebase Admin inicializado com variáveis de ambiente')
  }
}

async function checkFirebaseOwner() {
  console.log('\n=== 🔍 INFORMAÇÕES DO PROJETO FIREBASE ===\n')

  try {
    // Informações do projeto
    const projectId = admin.app().options.projectId
    const clientEmail = admin.app().options.credential?.['clientEmail']

    console.log('📋 Projeto ID:', projectId)
    console.log('📧 Service Account Email:', clientEmail)
    console.log('')

    // Listar usuários admin (primeiros 10)
    console.log('👥 Usuários do Firebase Auth (primeiros 10):')
    const listUsersResult = await admin.auth().listUsers(10)
    
    if (listUsersResult.users.length === 0) {
      console.log('   Nenhum usuário encontrado')
    } else {
      listUsersResult.users.forEach((userRecord, index) => {
        console.log(`\n   ${index + 1}. ${userRecord.email || 'Sem email'}`)
        console.log(`      UID: ${userRecord.uid}`)
        console.log(`      Provider: ${userRecord.providerData.map(p => p.providerId).join(', ')}`)
        console.log(`      Criado em: ${userRecord.metadata.creationTime}`)
        
        // Verificar custom claims (admin)
        if (userRecord.customClaims) {
          console.log(`      Custom Claims:`, userRecord.customClaims)
        }
      })
    }

    console.log('\n')
    console.log('💡 DICA: Para descobrir o Owner do projeto no Google Cloud Console:')
    console.log('   1. Acesse: https://console.cloud.google.com/iam-admin/iam?project=' + projectId)
    console.log('   2. Procure por papel "Owner" na lista')
    console.log('   3. Esse é o email do dono do projeto')
    console.log('')
    console.log('🔗 Link direto: https://console.cloud.google.com/iam-admin/iam?project=' + projectId)

  } catch (error) {
    console.error('❌ Erro ao buscar informações:', error.message)
    console.error('')
    console.error('Verifique se as credenciais do Firebase Admin estão corretas:')
    console.error('  - FIREBASE_PROJECT_ID')
    console.error('  - FIREBASE_CLIENT_EMAIL')
    console.error('  - FIREBASE_ADMIN_PRIVATE_KEY')
  }
}

checkFirebaseOwner()
  .then(() => {
    console.log('\n✅ Script concluído\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error)
    process.exit(1)
  })
