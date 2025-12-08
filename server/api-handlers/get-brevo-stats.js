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
 * Busca estatísticas isoladas por tenant
 * Calcula métricas apenas das campanhas do tenant específico
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

    // ISOLAMENTO POR TENANT: Buscar apenas campanhas deste tenant no Firestore
    const campaignsSnapshot = await db.collection('campaigns')
      .where('tenantId', '==', tenantId)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get()

    const tenantCampaigns = []
    const stats = {
      totalSent: 0,
      totalDelivered: 0,
      totalOpens: 0,
      totalClicks: 0,
      totalBounces: 0,
      totalUnsubscribes: 0,
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0
    }

    campaignsSnapshot.forEach(doc => {
      const campaign = doc.data()
      tenantCampaigns.push({
        id: doc.id,
        subject: campaign.subject,
        status: campaign.status,
        createdAt: campaign.createdAt,
        recipients: Array.isArray(campaign.to) ? campaign.to.length : 0
      })

      // Calcular métricas a partir dos dados da campanha
      if (campaign.status === 'sent') {
        const recipientCount = Array.isArray(campaign.to) ? campaign.to.length : 0
        stats.totalSent += recipientCount
        
        // Se temos dados de resultado da Brevo, usar
        if (campaign.result) {
          stats.totalDelivered += campaign.result.delivered || recipientCount
          stats.totalOpens += campaign.result.opens || 0
          stats.totalClicks += campaign.result.clicks || 0
          stats.totalBounces += campaign.result.bounces || 0
          stats.totalUnsubscribes += campaign.result.unsubscribes || 0
        } else {
          // Se não temos dados detalhados, assumir entregue se status = sent
          stats.totalDelivered += recipientCount
        }
      }
    })

    // Calcular taxas
    if (stats.totalSent > 0) {
      stats.deliveryRate = ((stats.totalDelivered / stats.totalSent) * 100).toFixed(2)
    }
    if (stats.totalDelivered > 0) {
      stats.openRate = ((stats.totalOpens / stats.totalDelivered) * 100).toFixed(2)
    }
    if (stats.totalOpens > 0) {
      stats.clickRate = ((stats.totalClicks / stats.totalOpens) * 100).toFixed(2)
    }

    if (debug) {
      console.log('[get-brevo-stats] Tenant stats calculated:', {
        tenantId,
        campaignCount: tenantCampaigns.length,
        totalSent: stats.totalSent,
        totalDelivered: stats.totalDelivered
      })
    }

    // Use global Brevo API key from environment (apenas para informações da conta)
    const apiKey = process.env.BREVO_API_KEY
    
    if (!apiKey) {
      console.warn('[get-brevo-stats] Global Brevo API key not configured in environment')
      return res.status(200).json({
        success: true,
        stats: {
          emailStats: stats,
          campaigns: tenantCampaigns,
          account: null,
          timestamp: new Date().toISOString()
        }
      })
    }

    // Log masked key for debugging
    const maskedKey = apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}` : 'none'
    console.log('[get-brevo-stats] Using global API key (masked):', maskedKey)

    const headers = {
      'api-key': apiKey,
      'Content-Type': 'application/json'
    }

    if (debug) console.log('[get-brevo-stats] Fetching account info from Brevo API...')

    // Buscar apenas informações da conta (não estatísticas globais)
    let accountError = null
    const accountRes = await axios.get('https://api.brevo.com/v3/account', { headers })
      .catch(e => {
        accountError = e.response?.data || e.message
        console.error('[get-brevo-stats] Account fetch error:', accountError)
        return null
      })

    return res.status(200).json({
      success: true,
      stats: {
        account: accountRes?.data || null,
        emailStats: stats,
        campaigns: tenantCampaigns,
        timestamp: new Date().toISOString(),
        errors: {
          account: accountError
        }
      }
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
