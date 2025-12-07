# Sistema de Tracking de Métricas - Turmail

## 📊 Como Funciona

### 1. **Webhooks do Brevo**
Quando você envia um email via Brevo, o sistema automaticamente rastreia:
- ✅ **Entregues**: Email chegou na caixa de entrada
- 👀 **Aberturas**: Destinatário abriu o email
- 🖱️ **Cliques**: Destinatário clicou em um link
- ⚠️ **Bounces**: Email retornou (soft/hard bounce)
- 🚫 **Spam**: Marcado como spam
- 📭 **Descadastros**: Usuário se descadastrou

### 2. **Fluxo de Dados**

```
Email Enviado (Turmail)
    ↓
Brevo envia o email
    ↓
Usuário abre/clica
    ↓
Brevo detecta evento
    ↓
Webhook POST → /api/webhook-brevo-events
    ↓
Atualiza Firestore automaticamente
    ↓
Dashboard mostra métricas em tempo real
```

### 3. **Estrutura de Dados no Firestore**

```javascript
/campaigns/{campaignId}
{
  subject: "...",
  to: [...],
  result: {
    messageId: "<123@smtp-relay.mailin.fr>", // ID único do Brevo
    status: "sent"
  },
  metrics: {
    // Contadores
    delivered: 10,        // Emails entregues
    opens: 25,            // Total de aberturas
    clicks: 8,            // Total de cliques
    bounces: 1,           // Total de bounces
    softBounces: 0,
    hardBounces: 1,
    spam: 0,
    unsubscribes: 0,
    
    // Arrays únicos
    uniqueOpeners: ["email1@...", "email2@..."],
    uniqueClickers: ["email1@..."],
    
    // Links clicados (base64 do URL como chave)
    clickedLinks: {
      "aHR0cHM6Ly9...": 5  // URL encoded → contador
    },
    
    // Taxas calculadas
    rates: {
      deliveryRate: "95.24",   // % entregues
      openRate: "40.00",       // % únicos que abriram
      clickRate: "20.00",      // % únicos que clicaram
      clickToOpenRate: "50.00" // % de quem abriu e clicou
    },
    
    // Timestamps
    lastDeliveredAt: Timestamp,
    lastOpenedAt: Timestamp,
    lastClickedAt: Timestamp,
    lastCalculatedAt: Timestamp
  }
}

// Histórico individual de eventos
/campaigns/{campaignId}/events/{eventId}
{
  type: "opened",
  email: "cliente@example.com",
  timestamp: Timestamp,
  messageId: "<123@...>",
  campaignId: "camp_xyz"
}
```

### 4. **Configuração do Webhook**

#### Via Script (Recomendado)
```bash
node scripts/setup-brevo-webhook.js [tenantId] [webhookUrl]
```

Exemplo:
```bash
node scripts/setup-brevo-webhook.js tenant_NF2OKj0O5ePsy4j0dzLRDPjT1K02 https://turmail-saas.vercel.app/api/webhook-brevo-events
```

#### Via Dashboard Brevo (Manual)
1. Acesse: https://app.brevo.com/settings/webhooks
2. Clique em "Add a new webhook"
3. Configure:
   - **URL**: `https://turmail-saas.vercel.app/api/webhook-brevo-events`
   - **Events**: Marque todos (delivered, opened, click, bounce, etc.)
   - **Type**: Transactional
4. Salve

### 5. **Testando o Webhook Localmente**

Para testar localmente antes de fazer deploy:

```bash
# 1. Instale ngrok
npm install -g ngrok

# 2. Exponha sua porta local
ngrok http 5173

# 3. Use a URL do ngrok no webhook
# Exemplo: https://abc123.ngrok.io/api/webhook-brevo-events
```

### 6. **Exemplo de Webhook Payload**

```json
{
  "event": "opened",
  "email": "cliente@example.com",
  "message-id": "<202512070708.52793258702@smtp-relay.mailin.fr>",
  "date": "2025-12-07 10:30:00",
  "tag": "campaign_123"
}
```

### 7. **Visualização no Dashboard**

Depois de configurado, o dashboard de **Relatórios** mostrará automaticamente:

✅ **Métricas Gerais**
- Total de emails enviados
- Taxa de entrega
- Taxa de abertura
- Taxa de cliques

✅ **Campanhas Individuais**
- Quantas pessoas abriram
- Quantas clicaram
- Links mais clicados
- Horários de maior engajamento

✅ **Insights de IA**
- Melhores horários para enviar
- Assuntos com melhor performance
- Recomendações de otimização

### 8. **Segurança**

- ✅ Webhook valida origin do Brevo
- ✅ Dados criptografados no Firestore
- ✅ API keys nunca expostas no frontend
- ✅ Firestore Security Rules protegem os dados

### 9. **Deploy**

O webhook já está pronto em `/api/webhook-brevo-events.js` e funcionará automaticamente no Vercel.

Para fazer deploy:
```bash
git add .
git commit -m "Add Brevo webhook tracking"
git push
```

O Vercel vai automaticamente criar a rota:
`https://turmail-saas.vercel.app/api/webhook-brevo-events`

### 10. **Monitoramento**

Para ver os logs do webhook:
```bash
# Vercel
vercel logs

# Ou no console do Vercel:
# https://vercel.com/your-team/turmail-saas/logs
```

---

## 🎯 Próximos Passos

1. ✅ Deploy do código no Vercel
2. ✅ Executar script de setup do webhook
3. ✅ Enviar campanha de teste
4. ✅ Verificar métricas atualizando em tempo real
5. ✅ Configurar alertas para campanhas com baixo desempenho

## 📚 Referências

- [Brevo Webhooks Documentation](https://developers.brevo.com/docs/webhooks)
- [Brevo Events API](https://developers.brevo.com/reference/getwebhooks)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
