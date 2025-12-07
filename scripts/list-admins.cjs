/**
 * Script para listar todos os usuários admin do Firebase
 */

const admin = require('firebase-admin')

if (!admin.apps.length) {
  try {
    const serviceAccount = require('../serviceAccount.json')
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
  } catch (e) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  }
}

async function listAdmins() {
  console.log('\n=== 👥 USUÁRIOS ADMIN DO FIREBASE ===\n')

  try {
    const listUsersResult = await admin.auth().listUsers(1000)
    const admins = listUsersResult.users.filter(user => user.customClaims?.admin === true)
    
    if (admins.length === 0) {
      console.log('⚠️  Nenhum usuário admin encontrado')
    } else {
      console.log(`✅ ${admins.length} usuário(s) admin encontrado(s):\n`)
      
      admins.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email || 'Sem email'}`)
        console.log(`   UID: ${user.uid}`)
        console.log(`   Provider: ${user.providerData.map(p => p.providerId).join(', ')}`)
        console.log(`   Criado em: ${user.metadata.creationTime}`)
        console.log(`   Custom Claims:`, user.customClaims)
        console.log('')
      })
    }

    console.log('📊 Resumo:')
    console.log(`   Total de usuários: ${listUsersResult.users.length}`)
    console.log(`   Usuários admin: ${admins.length}`)
    console.log(`   Usuários normais: ${listUsersResult.users.length - admins.length}`)

  } catch (error) {
    console.error('❌ Erro:', error.message)
  }
}

listAdmins()
  .then(() => {
    console.log('\n✅ Script concluído\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error)
    process.exit(1)
  })
