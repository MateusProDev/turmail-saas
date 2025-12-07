/**
 * Script para testar o webhook manualmente
 * Simula um evento de abertura de email do Brevo
 */

const testEvent = {
  event: 'opened',
  email: 'mateusferreiraprodev@gmail.com',
  'message-id': '<202512070708.52793258702@smtp-relay.mailin.fr>', // ID de uma das suas campanhas
  date: new Date().toISOString(),
  tag: 'test'
}

async function testWebhook() {
  console.log('\n🧪 Testing webhook...\n')
  console.log('Event data:', JSON.stringify(testEvent, null, 2))
  
  try {
    const response = await fetch('https://turmail-saas.vercel.app/api/webhook-brevo-events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testEvent)
    })
    
    const data = await response.json()
    
    console.log('\n📥 Response:', response.status)
    console.log('Data:', JSON.stringify(data, null, 2))
    
    if (response.ok) {
      console.log('\n✅ Webhook is working!')
      console.log('Check Firestore for updated metrics')
    } else {
      console.log('\n❌ Webhook failed')
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message)
  }
}

testWebhook()
