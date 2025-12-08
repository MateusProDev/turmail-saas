# 📊 Guia de Configuração do Webhook Brevo

## ✅ Métricas em Tempo Real

O sistema **JÁ está configurado** para receber eventos da Brevo e atualizar métricas em tempo real:

- ✅ **Aberturas de email** (opens)
- ✅ **Cliques em links** (clicks)
- ✅ **Emails entregues** (delivered)
- ✅ **Bounces** (soft/hard)
- ✅ **Descadastros** (unsubscribe)
- ✅ **Spam** (spam reports)

---

## 🔧 Como Configurar o Webhook na Brevo

### 1. Acessar Configurações de Webhook

1. Acesse: https://app.brevo.com/settings/webhooks
2. Clique em **"Add a new webhook"**

### 2. Configurar URL do Webhook

```
URL: https://turmail.turvia.com.br/api/webhook-brevo-events
```

### 3. Selecionar Eventos

Marque os seguintes eventos:

- [x] **Email delivered** - Email entregue com sucesso
- [x] **Email opened** - Email aberto pelo destinatário
- [x] **Email clicked** - Link clicado no email
- [x] **Soft bounce** - Bounce temporário
- [x] **Hard bounce** - Bounce permanente
- [x] **Spam** - Marcado como spam
- [x] **Unsubscribe** - Descadastrado
- [x] **Blocked** - Email bloqueado
- [x] **Invalid email** - Email inválido

### 4. Salvar Webhook

Clique em **"Save"** ou **"Create webhook"**

---

## 📈 Como Funciona

### Fluxo de Eventos

```
1. Email enviado → Brevo envia o email
2. Destinatário abre → Brevo detecta abertura
3. Brevo dispara webhook → POST /api/webhook-brevo-events
4. Sistema atualiza Firestore → campaigns/{campaignId}/metrics
5. Dashboard atualiza em tempo real → Usuário vê métricas
```

### Estrutura de Métricas (Firestore)

Cada campanha terá a seguinte estrutura de métricas:

```javascript
{
  "campaignId": "camp_ABC123",
  "status": "sent",
  "messageId": "msg_XYZ789",
  "metrics": {
    "delivered": 100,        // Total de emails entregues
    "opens": 75,             // Total de aberturas (pode contar múltiplas vezes)
    "clicks": 25,            // Total de cliques
    "uniqueOpeners": ["email1@example.com", "email2@example.com"],  // Emails únicos que abriram
    "uniqueClickers": ["email1@example.com"],                        // Emails únicos que clicaram
    "softBounces": 2,
    "hardBounces": 1,
    "bounces": 3,
    "spam": 0,
    "unsubscribes": 1,
    "lastOpenedAt": "2025-12-08T10:30:00Z",
    "lastClickedAt": "2025-12-08T10:35:00Z",
    "rates": {
      "deliveryRate": "97.00",      // (delivered / sent) * 100
      "openRate": "73.00",           // (uniqueOpeners / delivered) * 100
      "clickRate": "24.00",          // (uniqueClickers / delivered) * 100
      "clickToOpenRate": "32.88"     // (uniqueClickers / uniqueOpeners) * 100
    }
  }
}
```

### Histórico de Eventos

Cada evento individual é salvo em:

```
campaigns/{campaignId}/events/{eventId}
```

Exemplo:

```javascript
{
  "type": "opened",
  "email": "cliente@example.com",
  "timestamp": "2025-12-08T10:30:00Z",
  "messageId": "msg_XYZ789",
  "campaignId": "camp_ABC123"
}
```

---

## 🧪 Testar Webhook

### 1. Enviar Email de Teste

1. Acesse: https://turmail.turvia.com.br/campaigns
2. Crie uma campanha de teste
3. Adicione seu próprio email como destinatário
4. Clique em **Enviar**

### 2. Verificar Recebimento

1. Abra seu email
2. Abra a mensagem recebida
3. Clique em algum link do email

### 3. Verificar Métricas

1. Volte para o Dashboard: https://turmail.turvia.com.br/
2. Aguarde 10-30 segundos
3. Atualize a página
4. Verifique se as métricas foram atualizadas:
   - **Aberturas** deve aumentar
   - **Cliques** deve aumentar
   - **Taxa de abertura** deve ser calculada

### 4. Verificar Logs (Opcional)

Acesse os logs do Vercel para ver eventos sendo processados:

1. https://vercel.com/[seu-usuario]/turmail-saas/deployments
2. Clique na última deployment
3. Vá em **Functions** > **webhook-brevo-events**
4. Veja os logs em tempo real

---

## 🔍 Troubleshooting

### Webhook não está funcionando?

**1. Verificar URL do Webhook**
   - Certifique-se que a URL está correta: `https://turmail.turvia.com.br/api/webhook-brevo-events`
   - Teste manualmente: `curl -X POST https://turmail.turvia.com.br/api/webhook-brevo-events`

**2. Verificar Eventos Selecionados**
   - Acesse: https://app.brevo.com/settings/webhooks
   - Verifique se todos os eventos estão marcados

**3. Verificar Logs do Brevo**
   - No painel de webhooks da Brevo, clique no webhook criado
   - Veja o histórico de chamadas
   - Verifique se há erros (status 4xx ou 5xx)

**4. Verificar messageId**
   - O webhook precisa do `messageId` para associar eventos à campanha
   - Verifique se a campanha tem `messageId` salvo no Firestore
   - Se não tiver, o evento será ignorado (mas retornará 200 OK)

**5. Verificar Firestore**
   ```javascript
   // No console do Firebase:
   db.collection('campaigns').doc('camp_ABC123').get()
   // Deve ter: messageId, metrics
   ```

---

## 📊 Visualização de Métricas

### Dashboard

As métricas são exibidas no Dashboard:

- **Total Enviado** - Quantidade de emails enviados
- **Taxa de Entrega** - % de emails entregues com sucesso
- **Total de Aberturas** - Número total de aberturas (pode contar múltiplas vezes)
- **Aberturas Únicas** - Número de pessoas diferentes que abriram
- **Taxa de Abertura** - % de aberturas únicas sobre entregues
- **Total de Cliques** - Número total de cliques
- **Cliques Únicos** - Número de pessoas diferentes que clicaram
- **Taxa de Cliques** - % de cliques únicos sobre entregues

### Página de Campanhas

Cada campanha mostra:
- Status (sent, delivered, opened)
- Número de aberturas
- Número de cliques
- Taxa de abertura individual

---

## ✅ Checklist de Configuração

- [ ] Webhook configurado na Brevo
- [ ] URL correta: `https://turmail.turvia.com.br/api/webhook-brevo-events`
- [ ] Todos os eventos selecionados (delivered, opened, click, etc.)
- [ ] Teste enviado e recebido
- [ ] Email aberto
- [ ] Link clicado
- [ ] Métricas atualizadas no Dashboard
- [ ] Eventos salvos no Firestore

---

## 🎯 Próximos Passos

Após configurar o webhook, você terá:

✅ **Métricas em tempo real** - Aberturas e cliques são rastreados automaticamente
✅ **Isolamento por tenant** - Cada usuário vê apenas suas métricas
✅ **Histórico completo** - Todos os eventos são salvos para auditoria
✅ **Taxas calculadas** - Delivery rate, open rate, click rate automáticos
✅ **Dashboard atualizado** - Visualização em tempo real das métricas

---

## 📞 Suporte

Se você tiver problemas:

1. Verifique os logs do Vercel
2. Verifique os logs do webhook na Brevo
3. Verifique se o `messageId` está sendo salvo nas campanhas
4. Execute o script de diagnóstico:
   ```powershell
   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\Users\mateo\Documents\turmail-saas\serviceAccount.json"
   node scripts/test-send-campaign.js camp_ABC123
   ```
