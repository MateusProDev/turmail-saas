#!/usr/bin/env node
import admin from '../api/firebaseAdmin.js'
import axios from 'axios'
import crypto from 'crypto'

const db = admin.firestore()
const ENC_KEY = process.env.TENANT_ENCRYPTION_KEY || ''

function tryDecrypt(val) {
  if (!val) return null
  try {
    const parsed = typeof val === 'string' ? JSON.parse(val) : null
    if (!parsed || !parsed.v || !parsed.data) return val
    if (!ENC_KEY) return null
    const key = Buffer.from(ENC_KEY, 'base64')
    if (key.length !== 32) return null
    const iv = Buffer.from(parsed.iv, 'base64')
    const tag = Buffer.from(parsed.tag, 'base64')
    const data = Buffer.from(parsed.data, 'base64')
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
    return decrypted.toString('utf8')
  } catch (err) {
    return null
  }
}

async function main() {
  const args = process.argv.slice(2)
  const tenantArg = args.find(a => a.startsWith('--tenant='))
  const toArg = args.find(a => a.startsWith('--to='))
  const subjectArg = args.find(a => a.startsWith('--subject='))
  const fromArg = args.find(a => a.startsWith('--from='))
  const bodyArg = args.find(a => a.startsWith('--body='))

  const tenantId = tenantArg ? tenantArg.split('=')[1] : 'tenant_noa'
  const toEmail = toArg ? toArg.split('=')[1] : 'mateusferreiraprodev@gmail.com'
  const subject = subjectArg ? subjectArg.split('=')[1] : `Teste de e-mail (${tenantId})`
  const from = fromArg ? fromArg.split('=')[1] : 'TurMail <no-reply@turmail-saas.vercel.app>'
  const body = bodyArg ? bodyArg.split('=')[1] : `Olá — este é um teste de envio usando ${tenantId}`

  try {
    console.log('Fetching tenant key for', tenantId)
    const settingsDoc = await db.collection('tenants').doc(tenantId).collection('settings').doc('secrets').get()
    if (!settingsDoc.exists) throw new Error('Tenant settings not found')
    let tenantKey = settingsDoc.data()?.brevoApiKey
    if (!tenantKey) throw new Error('No brevoApiKey for tenant')
    const maybe = tryDecrypt(tenantKey)
    if (maybe) tenantKey = maybe
    if (!tenantKey) throw new Error('Failed to decrypt tenant key')

    console.log('Using tenant key masked:', `${tenantKey.slice(0,6)}...`)

    const payload = {
      sender: {
        name: from.replace(/"/g, ''),
        email: from.includes('<') ? from.split('<')[1].replace('>', '').trim() : from,
      },
      to: [{ email: toEmail }],
      subject,
      htmlContent: `<p>${body}</p>`,
    }

    const resp = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
      headers: { 'api-key': tenantKey, 'Content-Type': 'application/json' },
      timeout: 15000,
    })

    console.log('Send response status:', resp.status)
    console.log('Response data:', resp.data)
    process.exit(0)
  } catch (err) {
    console.error('Send failed:', err.response?.data || err.message || err)
    process.exit(2)
  }
}

main()
