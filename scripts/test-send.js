import { sendEmail } from '../server/brevoMail.js'

async function main(){
  const apiKey = process.env.TEST_API_KEY || process.env.BREVO_API_KEY
  const toEnv = process.env.TEST_TO || ''
  const fromEnv = process.env.TEST_FROM || process.env.DEFAULT_FROM_EMAIL || `no-reply@localhost`
  const subject = process.env.TEST_SUBJECT || 'Teste local'
  const html = process.env.TEST_HTML || '<p>Teste de envio local</p>'

  if (!apiKey) {
    console.error('Missing API key. Set TEST_API_KEY or BREVO_API_KEY')
    process.exit(1)
  }
  const tos = toEnv.split(/[,;\s]+/).filter(Boolean)
  if (tos.length === 0) {
    console.error('Missing recipients. Set TEST_TO env to one or more emails (comma separated)')
    process.exit(1)
  }

  const to = tos.map(e => ({ email: e }))
  const payload = { sender: { name: 'Local Tester', email: fromEnv }, to, subject, htmlContent: html }
  try {
    console.log('[scripts/test-send] sending', { to: tos, subject })
    const res = await sendEmail({ apiKey, payload })
    console.log('[scripts/test-send] success', res)
    process.exit(0)
  } catch (e) {
    console.error('[scripts/test-send] error', e && (e.response?.data || e.message || e))
    process.exit(2)
  }
}

main()
