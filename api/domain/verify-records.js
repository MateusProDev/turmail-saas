import admin from '../../server/firebaseAdmin'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { domain, tenantId, step } = req.body

    if (!domain || !tenantId || !step) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    console.log(`Verifying ${step} for domain ${domain}, tenant ${tenantId}`)

    const results = {
      success: false,
      records: [],
      errors: []
    }

    // Buscar configuração esperada do domínio
    const domainRef = admin.firestore().doc(`tenants/${tenantId}/domains/${domain}`)
    const domainSnap = await domainRef.get()

    if (!domainSnap.exists) {
      return res.status(404).json({ error: 'Domain configuration not found' })
    }

    const domainData = domainSnap.data()

    // Simular verificação DNS (em produção, implemente verificação real)
    // Por enquanto, vamos apenas marcar como verificado para demonstração
    switch (step) {
      case 'domain_verification':
        results.records.push({
          type: 'TXT',
          name: `_turmail-${tenantId}.${domain}`,
          verified: true,
          found: ['turmail-verification-1234567890']
        })
        await domainRef.update({
          'verificationRecord.verified': true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true })
        break

      case 'mx_records':
        results.records.push({
          type: 'MX',
          name: domain,
          verified: true,
          found: ['10 mx.turmail.com']
        })
        await domainRef.update({
          mxVerified: true,
          mxConfigured: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true })
        break

      case 'spf_dkim':
        results.records.push({
          type: 'TXT (SPF)',
          name: domain,
          verified: true,
          found: ['v=spf1 include:_spf.turmail.com ~all']
        })
        results.records.push({
          type: 'TXT (DKIM)',
          name: `turmail._domainkey.${domain}`,
          verified: true,
          found: ['v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...']
        })
        await domainRef.update({
          spfVerified: true,
          dkimVerified: true,
          spfDkimConfigured: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true })
        break

      case 'dmarc':
        results.records.push({
          type: 'TXT (DMARC)',
          name: `_dmarc.${domain}`,
          verified: true,
          found: ['v=DMARC1; p=quarantine; rua=mailto:dmarc@turmail.com']
        })
        await domainRef.update({
          dmarcVerified: true,
          dmarcConfigured: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true })
        break

      case 'email_testing':
        results.records.push({
          type: 'EMAIL_TEST',
          name: 'test@' + domain,
          verified: true,
          found: ['Email de teste enviado com sucesso']
        })
        await domainRef.update({
          testEmailSent: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true })
        break

      case 'activation':
        const requiredSteps = ['domain_verification', 'mx_records', 'spf_dkim', 'dmarc', 'email_testing']
        const allStepsComplete = requiredSteps.every(stepKey => domainData[`${stepKey}Verified`])

        if (allStepsComplete) {
          results.records.push({
            type: 'ACTIVATION',
            name: domain,
            verified: true,
            found: ['Domínio ativado com sucesso']
          })
          await domainRef.update({
            activated: true,
            activatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true })
        } else {
          results.errors.push('Cannot activate: not all required steps are completed')
          return res.status(400).json(results)
        }
        break

      default:
        return res.status(400).json({ error: 'Unknown step' })
    }

    results.success = results.records.length > 0 && results.errors.length === 0

    res.status(200).json(results)

  } catch (error) {
    console.error('Domain verification error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}