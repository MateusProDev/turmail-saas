import crypto from 'crypto';
import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import admin from './server/firebaseAdmin.js';

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

async function test() {
  try {
    // Buscar chave do tenant_noa
    const settingsRef = admin.firestore().doc('tenants/tenant_noa/settings/secrets');
    const snap = await settingsRef.get();
    const data = snap.data();
    const encryptedKey = data.brevoApiKey;
    console.log('Encrypted key exists:', !!encryptedKey);

    const decryptedKey = tryDecrypt(encryptedKey);
    console.log('Decryption successful:', !!decryptedKey);
    if (decryptedKey) {
      console.log('Decrypted key preview:', decryptedKey.slice(0, 15) + '...');

      // Testar chave na Brevo
      const response = await fetch('https://api.brevo.com/v3/account', {
        headers: { 'api-key': decryptedKey }
      });
      console.log('Brevo test status:', response.status);
      if (response.status === 200) {
        const account = await response.json();
        console.log('Brevo account email:', account.email);
      } else {
        const error = await response.text();
        console.log('Brevo error:', error);
      }
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

test();