import axios from 'axios'
import { db } from '../firebaseAdmin.js'
import crypto from 'crypto'

// Função de descriptografia (suporta tanto CBC quanto GCM)
function tryDecrypt(encrypted) {
  if (!encrypted || typeof encrypted !== 'string') return null
  
  const key = process.env.TENANT_ENCRYPTION_KEY
  if (!key) return null

  try {
    // Tenta formato GCM (JSON com iv, tag, data)
    const parsed = JSON.parse(encrypted)
    if (parsed.iv && parsed.data) {
      const keyBuffer = Buffer.from(key, 'base64')
      if (keyBuffer.length !== 32) return null
      
      const iv = Buffer.from(parsed.iv, 'base64')
      const encData = Buffer.from(parsed.data, 'base64')
      const tag = parsed.tag ? Buffer.from(parsed.tag, 'base64') : null
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv)
      if (tag) decipher.setAuthTag(tag)
      
      const decrypted = Buffer.concat([decipher.update(encData), decipher.final()])
      return decrypted.toString('utf8')
    }
  } catch (e) {
    // Não é JSON ou falhou GCM, tenta CBC
  }

  try {
    // Formato CBC (ivHex:encHex)
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
          
          if (debug) console.log('[get-brevo-stats] Active key (first 20 chars):', tenantKey?.substring(0, 20))
          
          const decrypted = tryDecrypt(tenantKey)
          if (decrypted) {
            tenantKey = decrypted
            if (debug) console.log('[get-brevo-stats] Active key was encrypted, decrypted successfully')
          } else {
            if (debug) console.log('[get-brevo-stats] Active key appears to be plain text or decryption failed')
          }
          
          if (tenantKey) apiKey = tenantKey
          if (debug) console.log('[get-brevo-stats] Found active key, length:', apiKey?.length)
        } else {
          if (debug) console.log('[get-brevo-stats] Active key document not found')
        }
      }
      
      // Se não encontrou activeKey, buscar a mais recente da lista
      if (!apiKey) {
        if (debug) console.log('[get-brevo-stats] No active key, fetching latest from list...')
        
        const keysSnapshot = await db.collection('tenants').doc(tenantId).collection('settings').doc('keys').collection('list')
          .orderBy('createdAt', 'desc')
          .limit(1)
          .get()
        
        if (!keysSnapshot.empty) {
          const latestKeyDoc = keysSnapshot.docs[0]
          const keyData = latestKeyDoc.data() || {}
          let tenantKey = keyData.brevoApiKey
          
          if (debug) console.log('[get-brevo-stats] Latest key ID:', latestKeyDoc.id, '(first 20 chars):', tenantKey?.substring(0, 20))
          
          const decrypted = tryDecrypt(tenantKey)
          if (decrypted) {
            tenantKey = decrypted
            if (debug) console.log('[get-brevo-stats] Latest key was encrypted, decrypted successfully')
          } else {
            if (debug) console.log('[get-brevo-stats] Latest key appears to be plain text')
          }
          
          if (tenantKey) apiKey = tenantKey
          if (debug) console.log('[get-brevo-stats] Using latest key, length:', apiKey?.length)
        } else {
          if (debug) console.log('[get-brevo-stats] No keys found in list')
        }
      }
      
      // Fallback para chave legacy
      if (!apiKey) {
        const legacyKey = secrets?.brevoApiKey
        if (legacyKey) {
          if (debug) console.log('[get-brevo-stats] Using legacy key (first 20 chars):', legacyKey?.substring(0, 20))
          
          const decrypted = tryDecrypt(legacyKey)
          if (decrypted) {
            apiKey = decrypted
            if (debug) console.log('[get-brevo-stats] Legacy key was encrypted, decrypted successfully')
          } else {
            apiKey = legacyKey
            if (debug) console.log('[get-brevo-stats] Legacy key appears to be plain text')
          }
          if (debug) console.log('[get-brevo-stats] Using legacy key, length:', apiKey?.length)
        } else {
          if (debug) console.log('[get-brevo-stats] No legacy key found')
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
        stats: null,
        hint: 'Configure sua chave Brevo em Configurações > Configuração Brevo'
      })
    }

    // Log masked key for debugging
    const maskedKey = apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}` : 'none'
    console.log('[get-brevo-stats] Using API key (masked):', maskedKey)

    const headers = {
      'api-key': apiKey,
      'Content-Type': 'application/json'
    }

    if (debug) console.log('[get-brevo-stats] Fetching from Brevo API...')

    // Buscar informações da conta
    let accountError = null
    const accountPromise = axios.get('https://api.brevo.com/v3/account', { headers })
      .catch(e => {
        accountError = e.response?.data || e.message
        console.error('[get-brevo-stats] Account fetch error:', accountError)
        return null
      })
    
    // Buscar estatísticas de email (últimos 30 dias)
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    let emailStatsError = null
    const emailStatsPromise = axios.get('https://api.brevo.com/v3/smtp/statistics/aggregatedReport', {
      headers,
      params: {
        startDate: thirtyDaysAgo.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0]
      }
    }).catch(e => {
      emailStatsError = e.response?.data || e.message
      console.error('[get-brevo-stats] Email stats fetch error:', emailStatsError)
      return null
    })

    // Buscar campanhas recentes
    let campaignsError = null
    const campaignsPromise = axios.get('https://api.brevo.com/v3/emailCampaigns', {
      headers,
      params: {
        limit: 50,
        offset: 0,
        sort: 'desc'
      }
    }).catch(e => {
      campaignsError = e.response?.data || e.message
      console.error('[get-brevo-stats] Campaigns fetch error:', campaignsError)
      return null
    })

    const [accountRes, emailStatsRes, campaignsRes] = await Promise.all([
      accountPromise,
      emailStatsPromise,
      campaignsPromise
    ])

    const campaignsData = campaignsRes?.data?.campaigns || []
    console.log('[get-brevo-stats] Campaigns data:', {
      hasCampaignsRes: !!campaignsRes,
      hasData: !!campaignsRes?.data,
      campaignsArray: Array.isArray(campaignsData),
      count: campaignsData.length,
      firstCampaign: campaignsData[0] ? {
        id: campaignsData[0].id,
        name: campaignsData[0].name,
        subject: campaignsData[0].subject
      } : null
    })

    if (debug) {
      console.log('[get-brevo-stats] Results:', {
        account: !!accountRes?.data,
        emailStats: !!emailStatsRes?.data,
        campaigns: !!campaignsRes?.data,
        campaignsCount: campaignsData.length,
        errors: { accountError, emailStatsError, campaignsError }
      })
    }

    const stats = {
      account: accountRes?.data || null,
      emailStats: emailStatsRes?.data || null,
      campaigns: campaignsData,
      timestamp: new Date().toISOString(),
      errors: {
        account: accountError,
        emailStats: emailStatsError,
        campaigns: campaignsError
      }
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
