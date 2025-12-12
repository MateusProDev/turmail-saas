import admin from './server/firebaseAdmin.js';
import crypto from 'crypto';
import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';

// Carregar .env.local
const envLocalPath = join(process.cwd(), '.env.local');
const envLocalContent = readFileSync(envLocalPath, 'utf8');
const dotenv = await import('dotenv');
const parsed = dotenv.parse(envLocalContent);
for (const [k, v] of Object.entries(parsed)) {
  process.env[k] = v;
}

// Função de descriptografia
function tryDecrypt(encrypted) {
  const key = process.env.TENANT_ENCRYPTION_KEY;
  if (!key) return null;

  try {
    const parsed = JSON.parse(encrypted);
    if (parsed.iv && parsed.data) {
      const keyBuffer = Buffer.from(key, 'base64');
      const iv = Buffer.from(parsed.iv, 'base64');
      const encData = Buffer.from(parsed.data, 'base64');
      const tag = parsed.tag ? Buffer.from(parsed.tag, 'base64') : null;

      const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
      if (tag) decipher.setAuthTag(tag);

      const decrypted = Buffer.concat([decipher.update(encData), decipher.final()]);
      return decrypted.toString('utf8');
    }
  } catch (e) {}

  try {
    const [ivHex, encHex] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const enc = Buffer.from(encHex, 'hex');
    const keyBuffer = Buffer.from(key, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
    let dec = decipher.update(enc, undefined, 'utf8');
    dec += decipher.final('utf8');
    return dec;
  } catch (e) {}
  return null;
}

async function checkAllTenants() {
  const db = admin.firestore();
  const tenantsSnap = await db.collection('tenants').get();

  for (const tenantDoc of tenantsSnap.docs) {
    const tenantId = tenantDoc.id;
    console.log(`\nVerificando tenant: ${tenantId}`);

    try {
      const settingsRef = db.collection('tenants').doc(tenantId).collection('settings').doc('secrets');
      const settingsSnap = await settingsRef.get();

      if (settingsSnap.exists) {
        const data = settingsSnap.data();
        if (data.brevoApiKey) {
          console.log('  Tem chave criptografada');
          const decrypted = tryDecrypt(data.brevoApiKey);
          if (decrypted) {
            console.log('  Chave descriptografada com sucesso');
            // Testar a chave
            const response = await fetch('https://api.brevo.com/v3/account', {
              headers: { 'api-key': decrypted }
            });
            if (response.status === 200) {
              const account = await response.json();
              console.log('  ✅ CHAVE VÁLIDA! Email:', account.email);
              console.log('  Chave completa:', decrypted);
              return decrypted;
            } else {
              console.log('  ❌ Chave inválida na Brevo');
            }
          } else {
            console.log('  Falha na descriptografia');
          }
        } else {
          console.log('  Sem chave Brevo');
        }
      } else {
        console.log('  Sem documento settings/secrets');
      }
    } catch (error) {
      console.log('  Erro:', error.message);
    }
  }
  return null;
}

checkAllTenants().then(validKey => {
  if (validKey) {
    console.log('\n🎉 Encontrei uma chave válida!');
  } else {
    console.log('\n❌ Nenhuma chave válida encontrada');
  }
});