import admin from '../../server/firebaseAdmin.js'
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

export default async function handler(req, res) {
  console.log('[API] Create sending domain called with:', { domain: req.body?.domain, tenantId: req.body?.tenantId })
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { domain, tenantId } = req.body

    console.log('[API] Parsed parameters:', { domain: `"${domain}"`, tenantId: `"${tenantId}"`, domainLength: domain?.length, tenantIdLength: tenantId?.length })

    if (!domain || !tenantId) {
      console.log('[API] Missing parameters:', { domain: !!domain, tenantId: !!tenantId })
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    console.log('[API] Fetching tenant data for:', tenantId)
    // Buscar chaves da Brevo para o tenant
    const settingsRef = admin.firestore().doc(`tenants/${tenantId}/settings/secrets`)
    const settingsSnap = await settingsRef.get()

    console.log('[API] Settings document exists:', settingsSnap.exists)
    
    if (!settingsSnap.exists) {
      console.log('[API] Tenant settings not found:', tenantId)
      return res.status(404).json({ error: 'Tenant settings not found' })
    }

    const settingsData = settingsSnap.data()
    console.log('[API] Settings data keys:', Object.keys(settingsData || {}))
    let brevoApiKey = settingsData.brevoApiKey

    console.log('[API] Brevo API key exists in settings:', !!brevoApiKey)

    if (!brevoApiKey) {
      console.log('[API] No Brevo API key configured for tenant:', tenantId)
      return res.status(400).json({ error: 'Brevo API key not configured for this tenant' })
    }

    // Tentar descriptografar se necessário
    const decryptedKey = tryDecrypt(brevoApiKey)
    if (decryptedKey) {
      brevoApiKey = decryptedKey
      console.log('[API] Successfully decrypted Brevo API key')
    } else {
      console.log('[API] Using Brevo API key as-is (not encrypted or decryption failed)')
    }
    
    console.log('[API] Final API key preview:', brevoApiKey.substring(0, 20) + '...')

    // Verificar se o domínio já existe
    console.log('[API] Checking if domain already exists:', domain)
    const checkResponse = await fetch('https://api.brevo.com/v3/senders/domains', {
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey
      }
    })

    console.log('[API] Check response status:', checkResponse.status)
    
    if (checkResponse.ok) {
      const domainsData = await checkResponse.json()
      console.log('[API] Found domains:', domainsData.domains?.length || 0)
      const existingDomain = domainsData.domains?.find(d => d.domain_name === domain)
      
      if (existingDomain) {
        console.log('[API] Domain already exists:', existingDomain.id)
        return res.status(200).json({
          success: true,
          brevoDomainId: existingDomain.id,
          domain: existingDomain.domain_name,
          authenticated: existingDomain.authenticated,
          message: existingDomain.authenticated ? 'Domain already exists and is authenticated' : 'Domain already exists but needs authentication'
        })
      }
    } else {
      console.log('[API] Failed to check existing domains')
    }

    // Criar domínio de envio na Brevo
    console.log('[API] Calling Brevo API to create domain:', domain)
    const requestBody = { name: domain }
    console.log('[API] Request body being sent:', JSON.stringify(requestBody))
    const brevoResponse = await fetch('https://api.brevo.com/v3/senders/domains', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': brevoApiKey
      },
      body: JSON.stringify(requestBody)
    })

    console.log('[API] Brevo response status:', brevoResponse.status)
    const brevoResult = await brevoResponse.json()
    console.log('[API] Brevo response:', brevoResult)

    if (!brevoResponse.ok) {
      // Se o domínio já existe, não é um erro
      if (brevoResult.message && brevoResult.message.includes('already exists')) {
        console.log('[API] Domain already exists, treating as success')
        return res.status(200).json({
          success: true,
          domain: domain,
          message: 'Domain already exists'
        })
      }
      throw new Error(brevoResult.message || 'Failed to create domain in Brevo')
    }

    res.status(200).json({
      success: true,
      brevoDomainId: brevoResult.id,
      domain: brevoResult.domain,
      dkim: brevoResult.dkim,
      spf: brevoResult.spf
    })

  } catch (error) {
    console.error('Create sending domain error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}