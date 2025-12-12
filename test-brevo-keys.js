const testKey = async (key, name) => {
  console.log(`Testando ${name}...`);
  try {
    const response = await fetch('https://api.brevo.com/v3/account', {
      headers: { 'api-key': key }
    });
    console.log(`${name} status:`, response.status);
    if (response.status === 200) {
      const account = await response.json();
      console.log(`${name} SUCCESS - Email:`, account.email);
      return true;
    } else {
      const error = await response.text();
      console.log(`${name} FAILED:`, error);
      return false;
    }
  } catch (error) {
    console.log(`${name} ERROR:`, error.message);
    return false;
  }
};

// Testar as chaves que aparecem no painel (com prefixo xkeysib-)
const keys = [
  { key: 'xkeysib-**********1ztpRv', name: 'turmailturmails' },
  { key: 'xkeysib-**********m6ASZO', name: 'turmailturmail' },
  { key: 'xkeysib-**********HgHLuK', name: 'turmailcerto' },
  { key: 'xkeysib-**********b9FRZj', name: 'turmailtest' },
  { key: 'xkeysib-**********H0ZOHX', name: 'tenant_noa_key' }
];

async function testAllKeys() {
  for (const { key, name } of keys) {
    await testKey(key, name);
    console.log('---');
  }
}

testAllKeys();