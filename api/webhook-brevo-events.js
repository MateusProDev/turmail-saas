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
