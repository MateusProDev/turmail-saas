const admin = require('firebase-admin')
const fs = require('fs')
const path = require('path')

function generateLocalCopy({ companyName, productName, destination, mainTitle, ctaLink, description, tone, vertical, previousExperience, keyBenefits }) {
  const subject = mainTitle ? `${mainTitle} — ${companyName || ''}`.trim() : `${companyName || 'Novidades'} para você`
  const preheader = description ? description.substring(0, 120) : `Confira ofertas para ${destination || 'vários destinos'}`
  const benefits = (keyBenefits && keyBenefits.length ? keyBenefits.slice(0,3) : []).concat([
    destination ? `Experiências em ${destination}` : 'Experiências selecionadas',
    productName ? `${productName} com condições especiais` : 'Condições especiais para clientes'
  ]).slice(0,4)

  const cta = ctaLink || '#'
  const html = `
  <div style="font-family:Arial;max-width:600px;margin:0 auto;color:#333;">
    <h1 style="color:#2c5aa0">${mainTitle || (productName || 'Novidade')}</h1>
    <p>${(previousExperience && previousExperience.trip) ? `Como gostou de ${previousExperience.trip}, selecionamos:` : 'Selecionamos para você:'}</p>
    <ul>
      ${benefits.map(b => `<li>${b}</li>`).join('')}
    </ul>
    <p style="text-align:center;margin-top:20px"><a href="${cta}" style="background:#2c5aa0;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">${ctaLink ? 'Ver oferta' : 'Saiba mais'}</a></p>
    <p style="font-size:12px;color:#888;margin-top:18px">Enviado por ${companyName || 'Nossa Empresa'}</p>
  </div>`

  return { subject, preheader, html }
}

async function main() {
  const saPath = path.join(__dirname, '..', 'serviceAccount.json')
  if (!fs.existsSync(saPath)) {
    console.error('serviceAccount.json not found at', saPath)
    process.exit(1)
  }
  const sa = require(saPath)

  admin.initializeApp({ credential: admin.credential.cert(sa), projectId: process.env.FIREBASE_PROJECT || sa.project_id || 'demo-project' })
  const db = admin.firestore()

  const ownerUid = process.env.TEST_UID || 'test-user-uid-123'
  const data = {
    tenantId: null,
    subject: '',
    htmlContent: '',
    preheader: '',
    to: [{ email: 'alice@example.com' }, { email: 'bob@example.com' }],
    ownerUid,
    sendImmediate: false,
    companyName: 'TurMail',
    productName: 'Pacote Serra Viva',
    destination: 'Rota das Serras',
    ctaLink: 'https://example.com/pacote-serra',
    mainTitle: 'Volte a viver a Rota das Serras',
    tone: 'friendly',
    vertical: 'tourism',
    description: 'Pacotes curtos, guias locais e benefícios exclusivos para clientes que retornam.',
    previousExperience: { trip: 'Rota das Serras' },
    audience: 'Clientes que já viajaram conosco',
    keyBenefits: ['Guias locais', 'Descontos para retorno', 'Check-in prioritário']
  }

  const copy = generateLocalCopy(data)
  data.subject = copy.subject
  data.preheader = copy.preheader
  data.htmlContent = copy.html

  const id = `camp_test_${Date.now()}`
  const docRef = db.collection('campaigns').doc(id)
  await docRef.set({
    ...data,
    status: 'queued',
    attempts: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  })

  console.log('Created campaign document:', id)

  const saved = await docRef.get()
  console.log('Saved data:', saved.exists ? saved.data() : null)

  const summary = {
    campaignId: id,
    subject: data.subject,
    vertical: data.vertical,
    companyName: data.companyName,
    destination: data.destination,
    productName: data.productName,
    mainTitle: data.mainTitle,
    ctaLink: data.ctaLink,
    tone: data.tone,
    recipientsCount: data.to.length,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ownerUid: ownerUid,
    rawBody: data.htmlContent
  }
  const summaryRef = await db.collection('users').doc(ownerUid).collection('ai_campaigns').add(summary)
  console.log('Saved ai_campaign summary id:', summaryRef.id)

  const readBack = await db.collection('users').doc(ownerUid).collection('ai_campaigns').doc(summaryRef.id).get()
  console.log('ai_campaign summary:', readBack.data())

  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
