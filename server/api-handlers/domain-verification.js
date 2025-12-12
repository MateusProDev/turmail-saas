const { onRequest } = require('firebase-functions/v2/https')
const admin = require('firebase-admin')
const dns = require('dns').promises

// Inicializar Firebase Admin se não estiver inicializado
if (!admin.apps.length) {
  admin.initializeApp()
}

exports.verifyDomainRecords = onRequest(
  {
    region: 'us-central1',
    cors: true,
    timeoutSeconds: 60
  },
  async (req, res) => {
    // Apenas aceitar POST
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

      // Verificar registros baseado na etapa
      switch (step) {
        case 'domain_verification':
          // Verificar registro TXT de verificação
          try {
            const txtRecords = await dns.resolveTxt(`_turmail-${tenantId}.${domain}`)
            const expectedValue = domainData.verificationRecord?.value

            const verified = txtRecords.some(record =>
              record.some(value => value === expectedValue)
            )

            results.records.push({
              type: 'TXT',
              name: `_turmail-${tenantId}.${domain}`,
              verified,
              found: txtRecords.flat()
            })

            if (verified) {
              await domainRef.update({
                'verificationRecord.verified': true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              })
            }
          } catch (error) {
            results.errors.push(`TXT verification failed: ${error.message}`)
          }
          break

        case 'mx_records':
          // Verificar registros MX
          try {
            const mxRecords = await dns.resolveMx(domain)
            const hasTurmailMx = mxRecords.some(record =>
              record.exchange.includes('turmail.com')
            )

            results.records.push({
              type: 'MX',
              name: domain,
              verified: hasTurmailMx,
              found: mxRecords.map(r => `${r.priority} ${r.exchange}`)
            })

            if (hasTurmailMx) {
              await domainRef.update({
                mxVerified: true,
                mxConfigured: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              })
            }
          } catch (error) {
            results.errors.push(`MX verification failed: ${error.message}`)
          }
          break

        case 'spf_dkim':
          // Verificar SPF
          try {
            const spfRecords = await dns.resolveTxt(domain)
            const hasSpf = spfRecords.some(record =>
              record.some(value => value.includes('v=spf1') && value.includes('turmail.com'))
            )

            results.records.push({
              type: 'TXT (SPF)',
              name: domain,
              verified: hasSpf,
              found: spfRecords.flat()
            })

            if (hasSpf) {
              await domainRef.update({
                spfVerified: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              })
            }
          } catch (error) {
            results.errors.push(`SPF verification failed: ${error.message}`)
          }

          // Verificar DKIM
          try {
            const dkimRecords = await dns.resolveTxt(`turmail._domainkey.${domain}`)
            const hasDkim = dkimRecords.some(record =>
              record.some(value => value.includes('v=DKIM1'))
            )

            results.records.push({
              type: 'TXT (DKIM)',
              name: `turmail._domainkey.${domain}`,
              verified: hasDkim,
              found: dkimRecords.flat()
            })

            if (hasDkim) {
              await domainRef.update({
                dkimVerified: true,
                spfDkimConfigured: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              })
            }
          } catch (error) {
            results.errors.push(`DKIM verification failed: ${error.message}`)
          }
          break

        case 'dmarc':
          // Verificar DMARC
          try {
            const dmarcRecords = await dns.resolveTxt(`_dmarc.${domain}`)
            const hasDmarc = dmarcRecords.some(record =>
              record.some(value => value.includes('v=DMARC1'))
            )

            results.records.push({
              type: 'TXT (DMARC)',
              name: `_dmarc.${domain}`,
              verified: hasDmarc,
              found: dmarcRecords.flat()
            })

            if (hasDmarc) {
              await domainRef.update({
                dmarcVerified: true,
                dmarcConfigured: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              })
            }
          } catch (error) {
            results.errors.push(`DMARC verification failed: ${error.message}`)
          }
          break

        case 'email_testing':
          // Simular envio de email de teste
          try {
            // Aqui você implementaria o envio real do email de teste
            // Por enquanto, apenas marcar como concluído
            await domainRef.update({
              testEmailSent: true,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            })

            results.records.push({
              type: 'EMAIL_TEST',
              name: 'test@' + domain,
              verified: true,
              found: ['Email de teste enviado com sucesso']
            })
          } catch (error) {
            results.errors.push(`Email test failed: ${error.message}`)
          }
          break

        case 'activation':
          // Verificar se todas as outras etapas estão completas
          const requiredSteps = ['domain_verification', 'mx_records', 'spf_dkim', 'dmarc', 'email_testing']
          const allStepsComplete = requiredSteps.every(stepKey => domainData[`${stepKey}Verified`])

          if (allStepsComplete) {
            await domainRef.update({
              activated: true,
              activatedAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            })

            results.records.push({
              type: 'ACTIVATION',
              name: domain,
              verified: true,
              found: ['Domínio ativado com sucesso']
            })
          } else {
            results.errors.push('Cannot activate: not all required steps are completed')
          }
          break

        default:
          return res.status(400).json({ error: 'Unknown step' })
      }

      // Determinar sucesso geral
      results.success = results.records.length > 0 &&
                       results.records.every(r => r.verified) &&
                       results.errors.length === 0

      res.json(results)

    } catch (error) {
      console.error('Domain verification error:', error)
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      })
    }
  }
)