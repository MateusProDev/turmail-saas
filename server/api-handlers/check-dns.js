import admin from '../server/firebaseAdmin.js'
import dns from 'dns'
import { promisify } from 'util'

const resolveTxt = promisify(dns.resolveTxt)

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Verify auth
    const authHeader = req.headers.authorization || ''
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing auth token' })
    }
    const idToken = authHeader.split(' ')[1]
    await admin.auth().verifyIdToken(idToken)

    const { domain } = req.body
    if (!domain) {
      return res.status(400).json({ error: 'Domain required' })
    }

    // Clean domain
    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '')

    const result = {
      domain: cleanDomain,
      spf: { status: 'error', message: 'SPF não configurado' },
      dkim: { status: 'warning', message: 'DKIM não pode ser verificado automaticamente' },
      dmarc: { status: 'error', message: 'DMARC não configurado' }
    }

    // Check SPF
    try {
      const spfRecords = await resolveTxt(cleanDomain)
      const spfRecord = spfRecords.flat().find(r => r.includes('v=spf1'))
      
      if (spfRecord) {
        if (spfRecord.includes('include:spf.brevo.com') || spfRecord.includes('include:sendinblue.com')) {
          result.spf = { status: 'success', message: 'SPF configurado corretamente com Brevo' }
        } else {
          result.spf = { status: 'warning', message: 'SPF encontrado, mas sem include:spf.brevo.com' }
        }
      }
    } catch (err) {
      // SPF not found - keep error status
    }

    // Check DMARC
    try {
      const dmarcRecords = await resolveTxt(`_dmarc.${cleanDomain}`)
      const dmarcRecord = dmarcRecords.flat().find(r => r.includes('v=DMARC1'))
      
      if (dmarcRecord) {
        result.dmarc = { status: 'success', message: 'DMARC configurado' }
      }
    } catch (err) {
      // DMARC not found - keep error status
    }

    // DKIM info (can't verify without selector)
    result.dkim = {
      status: 'warning',
      message: 'Verifique manualmente no Brevo → Senders → Domains'
    }

    return res.status(200).json(result)
  } catch (err) {
    console.error('[check-dns] error', err)
    return res.status(500).json({ error: err.message || 'Internal error' })
  }
}
