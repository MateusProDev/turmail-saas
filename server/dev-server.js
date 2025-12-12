import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env.local if it exists (for local development)
const envLocalPath = join(__dirname, '..', '.env.local')
if (existsSync(envLocalPath)) {
  console.log('✅ Loading .env.local')
  // dotenv/config already loaded .env, but we need to load .env.local manually
  const dotenv = await import('dotenv')
  const envLocalContent = readFileSync(envLocalPath, 'utf8')
  const parsed = dotenv.parse(envLocalContent)
  for (const [key, value] of Object.entries(parsed)) {
    if (!process.env[key]) { // Don't override if already set
      process.env[key] = value
    }
  }
}

// Load service account if FIREBASE_SERVICE_ACCOUNT_JSON not set
if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    const serviceAccountPath = join(__dirname, '..', 'serviceAccount.json')
    const serviceAccount = readFileSync(serviceAccountPath, 'utf8')
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = serviceAccount
    console.log('✅ Loaded serviceAccount.json')
  } catch (err) {
    console.warn('⚠️ Could not load serviceAccount.json:', err.message)
  }
}

// Load encryption key if not set
if (!process.env.TENANT_ENCRYPTION_KEY) {
  console.warn('⚠️ TENANT_ENCRYPTION_KEY not set - key decryption will fail')
}

const app = express()
const PORT = 3001

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

app.use(cors())
app.use(express.json())

// Import handlers
const myTenantsHandler = (await import('./api-handlers/my-tenants.js')).default
const { getBrevoStats } = await import('./api-handlers/get-brevo-stats.js')
// Mount create-tenant handler for local testing
const createTenantHandler = (await import('./api-handlers/tenant/create-tenant.js')).default
const createCompleteAccountHandler = (await import('./api-handlers/create-complete-account.js')).default

// Import Brevo handlers for local testing
const createSenderHandler = (await import('../api/brevo/create-sender.js')).default
const createSendingDomainHandler = (await import('../api/brevo/create-sending-domain.js')).default

// API routes
app.all('/api/my-tenants', async (req, res) => {
  try {
    await myTenantsHandler(req, res)
  } catch (error) {
    console.error('Error in my-tenants:', error)
    res.status(500).json({ error: error.message })
  }
})


app.all('/api/tenant/create-tenant', async (req, res) => {
  try {
    await createTenantHandler(req, res)
  } catch (error) {
    console.error('Error in tenant/create-tenant:', error)
    res.status(500).json({ error: error.message })
  }
})

app.all('/api/tenant/create-complete-account', async (req, res) => {
  try {
    await createCompleteAccountHandler(req, res)
  } catch (error) {
    console.error('Error in tenant/create-complete-account:', error)
    res.status(500).json({ error: error.message })
  }
})

app.all('/api/get-brevo-stats', async (req, res) => {
  try {
    await getBrevoStats(req, res)
  } catch (error) {
    console.error('Error in get-brevo-stats:', error)
    res.status(500).json({ error: error.message })
  }
})

// Brevo handlers for local testing
app.all('/api/brevo/create-sender', async (req, res) => {
  try {
    await createSenderHandler(req, res)
  } catch (error) {
    console.error('Error in brevo/create-sender:', error)
    res.status(500).json({ error: error.message })
  }
})

app.all('/api/brevo/create-sending-domain', async (req, res) => {
  try {
    await createSendingDomainHandler(req, res)
  } catch (error) {
    console.error('Error in brevo/create-sending-domain:', error)
    res.status(500).json({ error: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Dev API server running on http://localhost:${PORT}`)
  console.log('Server started successfully')
})
