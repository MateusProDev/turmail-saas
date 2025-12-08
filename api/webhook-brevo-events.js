/**
 * Webhook do Brevo para receber eventos de email
 * 
 * Eventos suportados:
 * - delivered: Email entregue com sucesso
 * - opened: Email aberto pelo destinatário
 * - click: Link clicado no email
 * - soft_bounce: Bounce temporário
 * - hard_bounce: Bounce permanente
 * - spam: Marcado como spam
 * - unsubscribe: Descadastrado
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

// Initialize Firebase Admin (only once)
if (!getApps().length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    : null

  if (serviceAccount) {
    initializeApp({ credential: cert(serviceAccount) })
  } else {
    initializeApp()
  }
}

const db = getFirestore()

/**
 * Atualiza o engajamento do contato com base em interações de email
 * Aumenta o score automaticamente quando abre/clica em emails
 * Registra histórico completo de cada campanha enviada
 */
async function updateContactEngagement(email, eventType, campaignId) {
  try {
    // Buscar contato pelo email
    const contactsRef = db.collection('contacts')
    const contactSnap = await contactsRef
      .where('email', '==', email)
      .limit(1)
      .get()

    if (contactSnap.empty) {
      console.log('[Webhook] Contact not found for email:', email)
      return
    }

    const contactDoc = contactSnap.docs[0]
    const contactRef = contactDoc.ref
    const contactData = contactDoc.data()
    const metadata = contactData.metadata || {}
    
    // Buscar dados da campanha para histórico
    const campaignDoc = await db.collection('campaigns').doc(campaignId).get()
    const campaignData = campaignDoc.exists ? campaignDoc.data() : null
    const campaignName = campaignData?.subject || campaignData?.name || 'Sem título'

    // Pegar histórico atual de campanhas
    const campaignHistory = metadata.campaignHistory || []
    
    // Verificar se já existe registro dessa campanha
    let existingCampaignIndex = campaignHistory.findIndex(c => c.campaignId === campaignId)
    
    const now = new Date()
    
    if (existingCampaignIndex === -1) {
      // Primeira interação com essa campanha - criar registro
      campaignHistory.push({
        campaignId,
        campaignName,
        sentAt: campaignData?.sentAt || now,
        delivered: eventType === 'delivered',
        deliveredAt: eventType === 'delivered' ? now : undefined,
        opened: eventType === 'opened',
        openedAt: eventType === 'opened' ? now : undefined,
        clicked: eventType === 'clicked',
        clickedAt: eventType === 'clicked' ? now : undefined,
        clickedLinks: eventType === 'clicked' ? [campaignData?.link] : []
      })
    } else {
      // Atualizar registro existente
      const existingCampaign = campaignHistory[existingCampaignIndex]
      
      if (eventType === 'delivered') {
        existingCampaign.delivered = true
        existingCampaign.deliveredAt = now
      } else if (eventType === 'opened') {
        existingCampaign.opened = true
        existingCampaign.openedAt = now
      } else if (eventType === 'clicked') {
        existingCampaign.clicked = true
        existingCampaign.clickedAt = now
        // Adicionar link se não existir
        if (campaignData?.link) {
          existingCampaign.clickedLinks = existingCampaign.clickedLinks || []
          if (!existingCampaign.clickedLinks.includes(campaignData.link)) {
            existingCampaign.clickedLinks.push(campaignData.link)
          }
        }
      }
      
      campaignHistory[existingCampaignIndex] = existingCampaign
    }

    // Atualizar contadores de interação
    const updates = {
      'metadata.lastInteraction': now,
      'metadata.totalInteractions': FieldValue.increment(1),
      'metadata.campaignHistory': campaignHistory,
      'metadata.totalCampaignsReceived': campaignHistory.length
    }

    if (eventType === 'opened') {
      updates['metadata.emailsOpened'] = FieldValue.increment(1)
    } else if (eventType === 'clicked') {
      updates['metadata.emailsClicked'] = FieldValue.increment(1)
    }

    // Calcular métricas comportamentais avançadas
    const openedCampaigns = campaignHistory.filter(c => c.opened)
    
    if (openedCampaigns.length > 0) {
      // Calcular melhor dia da semana para abrir
      const daysCount = {}
      const hoursCount = {}
      let totalMinutesToOpen = 0
      let countWithTimeToOpen = 0
      
      openedCampaigns.forEach(campaign => {
        if (campaign.openedAt) {
          const openDate = campaign.openedAt.toDate ? campaign.openedAt.toDate() : new Date(campaign.openedAt)
          const dayName = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][openDate.getDay()]
          daysCount[dayName] = (daysCount[dayName] || 0) + 1
          
          // Calcular faixa de horário
          const hour = openDate.getHours()
          let timeRange
          if (hour < 6) timeRange = '00:00-06:00'
          else if (hour < 12) timeRange = '06:00-12:00'
          else if (hour < 18) timeRange = '12:00-18:00'
          else timeRange = '18:00-00:00'
          
          hoursCount[timeRange] = (hoursCount[timeRange] || 0) + 1
          
          // Calcular tempo médio para abrir
          if (campaign.sentAt && campaign.openedAt) {
            const sentDate = campaign.sentAt.toDate ? campaign.sentAt.toDate() : new Date(campaign.sentAt)
            const minutesToOpen = (openDate - sentDate) / (1000 * 60)
            if (minutesToOpen >= 0 && minutesToOpen < 10080) { // Ignora se > 1 semana
              totalMinutesToOpen += minutesToOpen
              countWithTimeToOpen++
            }
          }
        }
      })
      
      // Melhor dia para abrir
      const bestDay = Object.keys(daysCount).reduce((a, b) => daysCount[a] > daysCount[b] ? a : b, '')
      if (bestDay) updates['metadata.bestDayToOpen'] = bestDay
      
      // Melhor horário para abrir
      const bestTime = Object.keys(hoursCount).reduce((a, b) => hoursCount[a] > hoursCount[b] ? a : b, '')
      if (bestTime) updates['metadata.bestTimeToOpen'] = bestTime
      
      // Tempo médio para abrir
      if (countWithTimeToOpen > 0) {
        updates['metadata.avgTimeToOpen'] = Math.round(totalMinutesToOpen / countWithTimeToOpen)
      }
    }

    // Recalcular temperatura automaticamente
    const currentOpens = metadata.emailsOpened || 0
    const currentClicks = metadata.emailsClicked || 0
    const currentInteractions = metadata.totalInteractions || 0

    // Novas métricas após este evento
    const newOpens = eventType === 'opened' ? currentOpens + 1 : currentOpens
    const newClicks = eventType === 'clicked' ? currentClicks + 1 : currentClicks
    const newInteractions = currentInteractions + 1

    // Calcular taxa de engajamento
    const openRate = newInteractions > 0 ? (newOpens / newInteractions) : 0
    const clickRate = newOpens > 0 ? (newClicks / newOpens) : 0

    // Lógica de temperatura automática baseada em engajamento
    let newTemperature = metadata.temperature || 'cold'
    
    if (clickRate > 0.5 && newClicks >= 3) {
      newTemperature = 'hot' // 🔥 Clicou em 50%+ dos emails abertos E clicou pelo menos 3x
    } else if (clickRate > 0.3 || (openRate > 0.6 && newOpens >= 3)) {
      newTemperature = 'warm' // ☀️ Bom engajamento
    } else if (newInteractions >= 5 && openRate < 0.3) {
      newTemperature = 'cold' // ❄️ Muitos emails mas baixo engajamento
    }

    updates['metadata.temperature'] = newTemperature

    // Recalcular lead score
    const budgetScores = {
      'até 2k': 5,
      '2k-5k': 8,
      '5k-10k': 11,
      '10k-20k': 13,
      '20k+': 15
    }
    
    let leadScore = 0
    
    // Temperatura (+30)
    if (newTemperature === 'hot') leadScore += 30
    else if (newTemperature === 'warm') leadScore += 20
    else if (newTemperature === 'cold') leadScore += 10
    
    // Engajamento (+25)
    leadScore += openRate * 25
    
    // Compras anteriores (+20)
    if (metadata.bookingsCompleted) {
      leadScore += Math.min(20, metadata.bookingsCompleted * 5)
    }
    
    // Budget (+15)
    leadScore += budgetScores[metadata.budgetRange || 'até 2k']
    
    // Recência (+10) - acabou de interagir agora!
    leadScore += 10
    
    updates['metadata.leadScore'] = Math.min(100, Math.round(leadScore))

    await contactRef.update(updates)
    
    console.log('[Webhook] Contact engagement updated:', {
      email,
      eventType,
      campaignId,
      campaignName,
      newTemperature,
      leadScore: updates['metadata.leadScore'],
      opens: newOpens,
      clicks: newClicks,
      totalCampaigns: campaignHistory.length,
      bestDay: updates['metadata.bestDayToOpen'],
      bestTime: updates['metadata.bestTimeToOpen'],
      avgMinutesToOpen: updates['metadata.avgTimeToOpen']
    })

  } catch (error) {
    console.error('[Webhook] Error updating contact engagement:', error)
    // Não propagar erro para não quebrar webhook
  }
}

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const event = req.body
    console.log('[Brevo Webhook] Received event:', JSON.stringify(event, null, 2))

    // Extrair informações do evento
    const eventType = event.event // 'delivered', 'opened', 'click', etc.
    const messageId = event['message-id'] // ID da mensagem
    const email = event.email // Email do destinatário
    const timestamp = event.date ? new Date(event.date) : new Date()
    const link = event.link // URL clicada (apenas para evento 'click')
    const tag = event.tag // Tag da campanha (se configurado)

    console.log('[Brevo Webhook] Event details:', {
      eventType,
      messageId,
      email,
      timestamp,
      link,
      tag
    })

    // Encontrar a campanha pelo messageId
    const campaignsRef = db.collection('campaigns')
    const snapshot = await campaignsRef
      .where('result.messageId', '==', messageId)
      .limit(1)
      .get()

    if (snapshot.empty) {
      console.log('[Brevo Webhook] Campaign not found for messageId:', messageId)
      // Ainda retorna 200 para evitar retry do Brevo
      return res.status(200).json({ 
        success: true, 
        message: 'Event received but campaign not found' 
      })
    }

    const campaignDoc = snapshot.docs[0]
    const campaignId = campaignDoc.id
    const campaignRef = db.collection('campaigns').doc(campaignId)

    console.log('[Brevo Webhook] Found campaign:', campaignId)

    // Atualizar métricas da campanha
    const updates = {}
    const increment = FieldValue.increment(1)

    // Criar evento individual para histórico
    const eventData = {
      type: eventType,
      email,
      timestamp,
      messageId,
      campaignId,
      ...(link && { link }),
      ...(tag && { tag })
    }

    // Salvar evento no histórico
    await db.collection('campaigns').doc(campaignId)
      .collection('events').add(eventData)

    // Atualizar contadores da campanha
    switch (eventType) {
      case 'delivered':
        updates['metrics.delivered'] = increment
        updates['metrics.lastDeliveredAt'] = timestamp
        break

      case 'opened':
        updates['metrics.opens'] = increment
        updates['metrics.lastOpenedAt'] = timestamp
        // Adicionar email à lista de quem abriu
        updates['metrics.uniqueOpeners'] = FieldValue.arrayUnion(email)
        
        // 🔥 ATUALIZAR SCORE DO CONTATO
        await updateContactEngagement(email, 'opened', campaignId)
        break

      case 'click':
        updates['metrics.clicks'] = increment
        updates['metrics.lastClickedAt'] = timestamp
        // Adicionar email à lista de quem clicou
        updates['metrics.uniqueClickers'] = FieldValue.arrayUnion(email)
        // Salvar link clicado
        if (link) {
          updates[`metrics.clickedLinks.${Buffer.from(link).toString('base64')}`] = increment
        }
        
        // 🔥 ATUALIZAR SCORE DO CONTATO (click vale mais que open)
        await updateContactEngagement(email, 'clicked', campaignId)
        break

      case 'soft_bounce':
        updates['metrics.softBounces'] = increment
        updates['metrics.bounces'] = increment
        break

      case 'hard_bounce':
        updates['metrics.hardBounces'] = increment
        updates['metrics.bounces'] = increment
        break

      case 'spam':
        updates['metrics.spam'] = increment
        break

      case 'unsubscribe':
        updates['metrics.unsubscribes'] = increment
        break

      case 'blocked':
        updates['metrics.blocked'] = increment
        break

      case 'invalid_email':
        updates['metrics.invalid'] = increment
        break

      default:
        console.log('[Brevo Webhook] Unknown event type:', eventType)
    }

    // Atualizar campanha se houver mudanças
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = timestamp
      await campaignRef.update(updates)
      console.log('[Brevo Webhook] Campaign updated:', campaignId, updates)
    }

    // Calcular taxas em tempo real
    const campaignData = campaignDoc.data()
    const metrics = {
      sent: campaignData.to?.length || 0,
      delivered: (campaignData.metrics?.delivered || 0) + (eventType === 'delivered' ? 1 : 0),
      opens: (campaignData.metrics?.opens || 0) + (eventType === 'opened' ? 1 : 0),
      clicks: (campaignData.metrics?.clicks || 0) + (eventType === 'click' ? 1 : 0),
      uniqueOpeners: new Set(campaignData.metrics?.uniqueOpeners || []).size + (eventType === 'opened' ? 1 : 0),
      uniqueClickers: new Set(campaignData.metrics?.uniqueClickers || []).size + (eventType === 'click' ? 1 : 0)
    }

    const rates = {
      deliveryRate: metrics.sent > 0 ? (metrics.delivered / metrics.sent * 100).toFixed(2) : 0,
      openRate: metrics.delivered > 0 ? (metrics.uniqueOpeners / metrics.delivered * 100).toFixed(2) : 0,
      clickRate: metrics.delivered > 0 ? (metrics.uniqueClickers / metrics.delivered * 100).toFixed(2) : 0,
      clickToOpenRate: metrics.uniqueOpeners > 0 ? (metrics.uniqueClickers / metrics.uniqueOpeners * 100).toFixed(2) : 0
    }

    // Atualizar taxas calculadas
    await campaignRef.update({
      'metrics.rates': rates,
      'metrics.lastCalculatedAt': timestamp
    })

    console.log('[Brevo Webhook] Metrics updated:', { campaignId, metrics, rates })

    return res.status(200).json({
      success: true,
      message: 'Event processed successfully',
      campaignId,
      eventType,
      metrics,
      rates
    })

  } catch (error) {
    console.error('[Brevo Webhook] Error processing event:', error)
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}
