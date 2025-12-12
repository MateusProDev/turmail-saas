const fetch = require('node-fetch');

async function testCreateDomain() {
  try {
    console.log('Testing create-sending-domain endpoint...');
    const response = await fetch('http://localhost:3001/api/brevo/create-sending-domain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: 'example-test-domain.com', tenantId: 'tenant_noa' })
    });
    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testCreateDomain();