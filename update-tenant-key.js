import admin from './server/firebaseAdmin.js';
import crypto from 'crypto';
import 'dotenv/config';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

// Load .env.local if it exists
const envLocalPath = join(__dirname, '.env.local');
if (existsSync(envLocalPath)) {
  const envLocalContent = readFileSync(envLocalPath, 'utf8');
  const dotenv = await import('dotenv');
  const parsed = dotenv.parse(envLocalContent);
  for (const [k, v] of Object.entries(parsed)) {
    if (!process.env[k]) {
      process.env[k] = v;
    }
  }
}

const tenantId = process.argv[2];
const apiKey = process.argv[3];

if (!tenantId || !apiKey) {
  console.error('Usage: node update-tenant-key.js <tenantId> <apiKey>');
  process.exit(1);
}

function encrypt(text) {
  const key = process.env.TENANT_ENCRYPTION_KEY;
  if (!key) throw new Error('TENANT_ENCRYPTION_KEY not found');

  const keyBuffer = Buffer.from(key, 'base64');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final()
  ]);

  const tag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString('base64'),
    data: encrypted.toString('base64'),
    tag: tag.toString('base64')
  });
}

async function updateKey() {
  try {
    const encryptedKey = encrypt(apiKey);
    const settingsRef = admin.firestore().doc(`tenants/${tenantId}/settings/secrets`);

    await settingsRef.set({
      brevoApiKey: encryptedKey,
      encrypted: true
    }, { merge: true });

    console.log(`✅ Chave da Brevo atualizada para o tenant ${tenantId}`);
    console.log('Chave criptografada salva com sucesso');
  } catch (error) {
    console.error('❌ Erro ao atualizar chave:', error);
  }
}

updateKey();