#!/usr/bin/env node
import crypto from 'crypto'

// Usage:
// node ./scripts/decryptEnvelope.js '{"v":1,...}'
// or set env ENVELOPE and run: node ./scripts/decryptEnvelope.js

const ENC_KEY = process.env.TENANT_ENCRYPTION_KEY
if (!ENC_KEY) {
  console.error('TENANT_ENCRYPTION_KEY is not set in the environment')
  process.exit(2)
}

function decryptEnvelope(envelopeJson) {
  const key = Buffer.from(ENC_KEY, 'base64')
  if (key.length !== 32) throw new Error('TENANT_ENCRYPTION_KEY must be base64 32 bytes')
  const env = typeof envelopeJson === 'string' ? JSON.parse(envelopeJson) : envelopeJson
  if (!env || !env.iv || !env.tag || !env.data) throw new Error('Invalid envelope format')
  const iv = Buffer.from(env.iv, 'base64')
  const tag = Buffer.from(env.tag, 'base64')
  const data = Buffer.from(env.data, 'base64')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
  return decrypted.toString('utf8')
}

async function main() {
  try {
    const arg = process.argv[2] || process.env.ENVELOPE
    if (!arg) {
      console.error('Provide the envelope JSON as the first argument or set ENVELOPE env var')
      process.exit(1)
    }
    const out = decryptEnvelope(arg)
    console.log('Decrypted value:')
    console.log(out)
  } catch (err) {
    console.error('Decryption failed:', err.message || err)
    process.exit(2)
  }
}

main()
