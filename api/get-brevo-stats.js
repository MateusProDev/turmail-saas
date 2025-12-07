import { getBrevoStats } from '../server/api-handlers/get-brevo-stats.js'

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method === 'GET' || req.method === 'POST') {
    return getBrevoStats(req, res)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
