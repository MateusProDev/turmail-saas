import axios from 'axios'

/**
 * Busca estatísticas da conta Brevo
 * Endpoint: GET /api/brevo-stats
 */
export async function getBrevoStats(req, res) {
  try {
    const tenantId = req.query.tenantId || req.body?.tenantId
    
    // Buscar API key do tenant
    const { getSecretValue } = await import('../firebaseAdmin.js')
    const apiKey = await getSecretValue(tenantId, 'BREVO_API_KEY')
    
    if (!apiKey) {
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

    // Buscar informações da conta
    const accountPromise = axios.get('https://api.brevo.com/v3/account', { headers }).catch(e => null)
    
    // Buscar estatísticas de email (últimos 30 dias)
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    const emailStatsPromise = axios.get('https://api.brevo.com/v3/smtp/statistics/aggregatedReport', {
      headers,
      params: {
        startDate: thirtyDaysAgo.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
        days: 30
      }
    }).catch(e => null)

    // Buscar campanhas recentes
    const campaignsPromise = axios.get('https://api.brevo.com/v3/emailCampaigns', {
      headers,
      params: {
        limit: 10,
        offset: 0
      }
    }).catch(e => null)

    const [accountRes, emailStatsRes, campaignsRes] = await Promise.all([
      accountPromise,
      emailStatsPromise,
      campaignsPromise
    ])

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
