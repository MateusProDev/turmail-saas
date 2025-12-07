/**
 * Script para adicionar admin claim ao usuário mateoferreira000@gmail.com
 */

const admin = require('firebase-admin')

// Inicializar Firebase Admin
if (!admin.apps.length) {
  try {
    const serviceAccount = require('../serviceAccount.json')
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
    console.log('✅ Firebase Admin inicializado')
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

async function setAdminClaim() {
  const email = 'mateoferreira000@gmail.com'
  
  console.log(`\n🔧 Configurando admin claim para: ${email}\n`)

  try {
    // Buscar usuário por email
    const user = await admin.auth().getUserByEmail(email)
    console.log(`✅ Usuário encontrado:`)
    console.log(`   UID: ${user.uid}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Provider: ${user.providerData.map(p => p.providerId).join(', ')}`)
    
    // Verificar custom claims atuais
    console.log(`\n📋 Custom Claims atuais:`, user.customClaims || 'Nenhum')

    // Adicionar admin claim
    await admin.auth().setCustomUserClaims(user.uid, { admin: true })
    console.log(`\n✅ Admin claim adicionado com sucesso!`)
    
    // Verificar novamente
    const updatedUser = await admin.auth().getUser(user.uid)
    console.log(`\n📋 Custom Claims atualizados:`, updatedUser.customClaims)
    
    console.log(`\n💡 IMPORTANTE: O usuário precisa fazer logout e login novamente para as alterações terem efeito.`)

  } catch (error) {
    console.error(`\n❌ Erro:`, error.message)
    
    if (error.code === 'auth/user-not-found') {
      console.error(`\n⚠️ Usuário ${email} não encontrado no Firebase Auth`)
      console.error(`   O usuário precisa fazer login pelo menos uma vez primeiro.`)
    }
  }
}

setAdminClaim()
  .then(() => {
    console.log('\n✅ Script concluído\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error)
    process.exit(1)
  })
