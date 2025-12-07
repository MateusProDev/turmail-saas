# Sistema de Planos e Limites - Documentação

## 📊 Estrutura de Planos

### Trial Gratuito (7 dias)
- **Preço:** Grátis
- **Duração:** 7 dias
- **Limites:**
  - 50 emails/dia
  - 350 emails/mês (50 x 7)
  - 5 campanhas
  - 100 contatos
  - 3 templates

### Starter - R$ 47/mês
- **Limites:**
  - 500 emails/dia
  - 15.000 emails/mês
  - 50 campanhas
  - 5.000 contatos
  - 20 templates

### Pro - R$ 97/mês (Recomendado)
- **Limites:**
  - 2.000 emails/dia
  - 60.000 emails/mês
  - 200 campanhas
  - 25.000 contatos
  - 100 templates
- **Extras:**
  - Automações
  - Webhooks
  - Suporte prioritário

### Agency - R$ 197/mês
- **Limites:**
  - 10.000 emails/dia
  - 300.000 emails/mês
  - Campanhas ilimitadas
  - 100.000 contatos
  - Templates ilimitados
- **Extras:**
  - Multi-tenant
  - White label
  - API completa

### Enterprise - Customizado
- **Limites:** Todos ilimitados
- **Extras:** Suporte dedicado 24/7, SLA, infraestrutura dedicada

## 🔄 Fluxo de Onboarding

### 1. Novo Usuário
```
Usuário se registra → Start Trial automático → 7 dias grátis com 50 emails/dia
```

### 2. Trial Criado Automaticamente
- Tenant criado: `tenant_{uid}`
- Subscription criada com:
  - status: 'trial'
  - trialEndsAt: +7 dias
  - limits: { emailsPerDay: 50, ... }

### 3. Durante o Trial
- Contador diário de emails em: `tenants/{tenantId}/counters/emails-YYYY-MM-DD`
- Verificação de limite antes de cada envio
- Interface mostra uso em tempo real

### 4. Fim do Trial
- Trial expira após 7 dias
- Usuário precisa fazer upgrade para continuar
- Emails bloqueados até upgrade

## 🛡️ Controle de Limites

### Verificação Antes do Envio
```javascript
// No sendHelper.js
const limitCheck = await checkDailyEmailLimit(tenantId, subscription, emailCount)
if (!limitCheck.allowed) {
  throw new Error(limitCheck.message)
}
```

### Incremento Após Envio Bem-sucedido
```javascript
// Incrementa contador
await incrementDailyEmailCount(tenantId, recipients.length)
```

### Reset Diário
- Contador automático por dia (chave: `emails-YYYY-MM-DD`)
- Cada dia é um documento separado
- Limpeza automática (Firestore TTL ou script)

## 📁 Estrutura no Firestore

### Subscriptions
```
subscriptions/{subscriptionId}
{
  uid: string
  email: string
  plan: 'trial' | 'starter' | 'pro' | 'agency'
  planId: string
  status: 'trial' | 'active' | 'expired'
  tenantId: string
  trialEndsAt: Timestamp
  trialDays: 7
  limits: {
    emailsPerDay: number
    emailsPerMonth: number
    campaigns: number
    contacts: number
    templates: number
  }
  createdAt: Timestamp
}
```

### Counters (Uso Diário)
```
tenants/{tenantId}/counters/emails-2025-12-07
{
  count: number
  date: "2025-12-07"
  updatedAt: Timestamp
}
```

## 🎨 Componentes de Interface

### EmailUsageCard.tsx
- Exibe uso atual vs limite
- Barra de progresso visual
- Alertas quando próximo do limite
- Atualização a cada 30 segundos

### Plans.tsx
- Card de cada plano com limites claros
- Botão "Começar Trial Grátis"
- Status do trial (dias restantes)
- Comparação de features

## 🔧 APIs e Funções

### `/api/start-trial`
- Cria tenant automaticamente
- Cria subscription com 7 dias
- Retorna tenantId e limites

### `checkDailyEmailLimit()`
```javascript
{
  allowed: boolean,
  limit: number,
  current: number,
  remaining: number,
  message: string
}
```

### `incrementDailyEmailCount()`
- Incrementa contador do dia
- Usa FieldValue.increment() para atomicidade

### `checkTrialStatus()`
```javascript
{
  expired: boolean,
  daysRemaining: number,
  endsAt: Date
}
```

## 💰 Configuração de Preços Stripe

Adicione nas variáveis de ambiente:

```bash
# Starter
VITE_STRIPE_PRICE_STARTER=price_xxxxx
VITE_STRIPE_PRICE_STARTER_ANNUAL=price_xxxxx

# Pro
VITE_STRIPE_PRICE_PRO=price_xxxxx
VITE_STRIPE_PRICE_PRO_ANNUAL=price_xxxxx

# Agency
VITE_STRIPE_PRICE_AGENCY=price_xxxxx
VITE_STRIPE_PRICE_AGENCY_ANNUAL=price_xxxxx
```

## ✅ Checklist de Implementação

- [x] Definir estrutura de planos (server/lib/plans.js)
- [x] Trial de 7 dias automático (start-trial.js)
- [x] Verificação de limites no envio (sendHelper.js)
- [x] Incremento de contador (sendHelper.js)
- [x] Interface de planos atualizada (Plans.tsx)
- [x] Componente de uso (EmailUsageCard.tsx)
- [ ] Integrar EmailUsageCard no Dashboard
- [ ] Configurar preços no Stripe
- [ ] Testar fluxo completo
- [ ] Criar script de limpeza de counters antigos

## 🧪 Testes Sugeridos

1. **Trial:**
   - Criar novo usuário
   - Verificar trial automático
   - Enviar 50 emails
   - Tentar enviar 51º email (deve falhar)

2. **Upgrade:**
   - Fazer upgrade para Starter
   - Verificar novos limites (500/dia)
   - Testar envio

3. **Expiração:**
   - Simular trial expirado
   - Verificar bloqueio de envio
   - Testar mensagem de erro

---

**Última atualização:** 7 de Dezembro de 2025
