import axios from 'axios'
import { db } from '../firebaseAdmin.js'
import crypto from 'crypto'

// Função de descriptografia (copiada de sendHelper.js)
function tryDecrypt(encrypted) {
  if (!encrypted || typeof encrypted !== 'string') return null
  try {
    const key = process.env.ENCRYPTION_KEY
    if (!key) return null
    const [ivHex, encHex] = encrypted.split(':')
    if (!ivHex || !encHex) return null
    const iv = Buffer.from(ivHex, 'hex')
    const enc = Buffer.from(encHex, 'hex')
    const keyBuffer = Buffer.from(key, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv)
    let dec = decipher.update(enc, undefined, 'utf8')
    dec += decipher.final('utf8')
    return dec
  } catch (e) {
    return null
  }
}

/**
 * Busca estatísticas da conta Brevo
 * Endpoint: GET /api/get-brevo-stats
 */
export async function getBrevoStats(req, res) {
  try {
    const tenantId = req.query.tenantId || req.body?.tenantId
    const debug = true
    
    if (!tenantId) {
      console.error('[get-brevo-stats] No tenantId provided')
      return res.status(400).json({
        success: false,
        error: 'tenantId is required',
        stats: null
      })
    }

    if (debug) console.log('[get-brevo-stats] Fetching stats for tenant:', tenantId)

    // Buscar API key do tenant (mesma lógica do sendHelper)
    let apiKey = null
    
    try {
      const secretsSnap = await db.collection('tenants').doc(tenantId).collection('settings').doc('secrets').get()
      const secrets = secretsSnap.exists ? secretsSnap.data() : {}
      const activeKeyId = secrets?.activeKeyId
      
      if (debug) console.log('[get-brevo-stats] Secrets found:', { hasSecrets: secretsSnap.exists, activeKeyId })
      
      if (activeKeyId) {
        const keySnap = await db.collection('tenants').doc(tenantId).collection('settings').doc('keys').collection('list').doc(activeKeyId).get()
        if (keySnap.exists) {
          const keyData = keySnap.data() || {}
          let tenantKey = keyData.brevoApiKey
          const decrypted = tryDecrypt(tenantKey)
          if (decrypted) tenantKey = decrypted
          if (tenantKey) apiKey = tenantKey
          if (debug) console.log('[get-brevo-stats] Found active key:', { hasKey: !!apiKey })
        }
      } else {
        // Fallback para chave legacy
        const legacyKey = secrets?.brevoApiKey
        if (legacyKey) {
          const decrypted = tryDecrypt(legacyKey)
          if (decrypted) apiKey = decrypted
          else apiKey = legacyKey
          if (debug) console.log('[get-brevo-stats] Using legacy key:', { hasKey: !!apiKey })
        }
      }
    } catch (e) {
      console.error('[get-brevo-stats] Error loading tenant key:', e)
      return res.status(500).json({
        success: false,
        error: 'Failed to load API key: ' + e.message,
        stats: null
      })
    }
    
    if (!apiKey) {
      console.warn('[get-brevo-stats] No Brevo API key configured for tenant:', tenantId)
      return res.status(200).json({
        success: false,
        error: 'No Brevo API key configured',
        stats: null
      })
    }

    const headers = {
      'api-key': apiKey,
      'Content-Type': 'application/json'
    }

    if (debug) console.log('[get-brevo-stats] Fetching from Brevo API...')

    // Buscar informações da conta
    const accountPromise = axios.get('https://api.brevo.com/v3/account', { headers })
      .catch(e => {
        console.error('[get-brevo-stats] Account fetch error:', e.response?.data || e.message)
        return null
      })
    
    // Buscar estatísticas de email (últimos 30 dias)
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    const emailStatsPromise = axios.get('https://api.brevo.com/v3/smtp/statistics/aggregatedReport', {
      headers,
      params: {
        startDate: thirtyDaysAgo.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0]
      }
    }).catch(e => {
      console.error('[get-brevo-stats] Email stats fetch error:', e.response?.data || e.message)
      return null
    })

    // Buscar campanhas recentes
    const campaignsPromise = axios.get('https://api.brevo.com/v3/emailCampaigns', {
      headers,
      params: {
        limit: 10,
        offset: 0
      }
    }).catch(e => {
      console.error('[get-brevo-stats] Campaigns fetch error:', e.response?.data || e.message)
      return null
    })

    const [accountRes, emailStatsRes, campaignsRes] = await Promise.all([
      accountPromise,
      emailStatsPromise,
      campaignsPromise
    ])

    if (debug) {
      console.log('[get-brevo-stats] Results:', {
        account: !!accountRes?.data,
        emailStats: !!emailStatsRes?.data,
        campaigns: !!campaignsRes?.data
      })
    }

    const stats = {
      account: accountRes?.data || null,
      emailStats: emailStatsRes?.data || null,
      campaigns: campaignsRes?.data || null,
      timestamp: new Date().toISOString()
    }

    return res.status(200).json({
      success: true,
      stats
    })

  } catch (error) {
    console.error('[get-brevo-stats] Error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch Brevo stats',
      stats: null
    })
  }
}
