import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

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

app.use(cors())
app.use(express.json())

// Import handlers
const myTenantsHandler = (await import('./api-handlers/my-tenants.js')).default
const { getBrevoStats } = await import('./api-handlers/get-brevo-stats.js')

// API routes
app.all('/api/my-tenants', async (req, res) => {
  try {
    await myTenantsHandler(req, res)
  } catch (error) {
    console.error('Error in my-tenants:', error)
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

app.listen(PORT, () => {
  console.log(`🚀 Dev API server running on http://localhost:${PORT}`)
})
