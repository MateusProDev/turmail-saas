# Fluxo de Pagamento e Ativação de Planos

## 📋 Visão Geral

Sistema completo de checkout Stripe integrado com planos e limites automáticos, com criação de conta obrigatória antes do pagamento.

## 🔄 Fluxo Completo (Atualizado)

### 1. Usuário Seleciona Plano (Plans.tsx)

```
Usuário clica "Ativar Plano Starter"
    ↓
Verifica se está logado (user)
    ↓
SE NÃO ESTIVER LOGADO:
    → Salva plano no localStorage
    → Redireciona para /login?signup=1
    
SE ESTIVER LOGADO:
    → Processa checkout imediatamente
```

**Dados salvos no localStorage:**
```javascript
{
  planId: 'starter',
  priceIdEnvMonthly: 'VITE_STRIPE_PRICE_STARTER',
  priceIdEnvAnnual: 'VITE_STRIPE_PRICE_STARTER_ANNUAL',
  billingInterval: 'monthly' // ou 'annual'
}
```

### 2. Criação de Conta (Login.tsx)

```
Usuário cria conta (email/senha ou Google)
    ↓
Cria documento em Firestore users/{uid}
    ↓
Cria tenant via /api/tenant/create-tenant
    ↓
Verifica localStorage por plano pendente
    ↓
SE HOUVER PLANO PENDENTE:
    → Processa checkout
SE NÃO:
    → Redireciona para /dashboard
```

**Função processPendingPlan():**
```javascript
const processPendingPlan = async (user) => {
  const pendingPlan = JSON.parse(localStorage.getItem('pendingPlan'))
  
  if (pendingPlan.planId === 'trial') {
    // Inicia trial e vai direto pro dashboard
    await fetch('/api/start-trial', { ... })
    navigate('/dashboard')
  } else {
    // Cria sessão Stripe e redireciona
    const checkout = await fetch('/api/stripe-checkout', {
      body: JSON.stringify({ 
        priceId, 
        planId, 
        email: user.email 
      })
    })
    window.location.href = checkout.url
  }
  
  localStorage.removeItem('pendingPlan')
}
```

### 3. Checkout Stripe (stripe-checkout.js)

**IMPORTANTE:** Usuário JÁ está autenticado neste ponto.

```javascript
// server/api-handlers/stripe-checkout.js
const sessionConfig = {
  mode: 'subscription',
  payment_method_types: ['card'],
  line_items: [{ price: priceId, quantity: 1 }],
  success_url: `${host}/dashboard?checkout=success`,
  cancel_url: `${host}/plans`,
  metadata: { planId },
  customer_email: email,
}
```

**URLs de retorno:**
- ✅ Sucesso: `/dashboard?checkout=success`
- ❌ Cancelamento: `/plans`

### 4. Pagamento Confirmado

Usuario completa pagamento no Stripe
    ↓
Stripe webhook `checkout.session.completed` disparado
    ↓
webhook-stripe.js processa evento

### 5. Webhook Atualiza Firestore (webhook-stripe.js)

```javascript
// Extrai dados da sessão
const session = event.data.object
const email = session.customer_details?.email
const stripeCustomerId = session.customer
const stripeSubscriptionId = session.subscription
const planId = session.metadata?.planId // recupera planId dos metadados

// Busca configuração do plano
const { PLANS } = await import('../lib/plans.js')
const planConfig = PLANS[planId] // ex: PLANS['starter']

// Atualiza subscription em Firestore
await db.collection('subscriptions').doc(stripeSubscriptionId).set({
  stripeSubscriptionId,
  stripeCustomerId,
  email,
  status: 'active',
  planId: 'starter',
  limits: {
    emailsPerDay: 500,
    emailsPerMonth: 15000,
    campaigns: 50,
    contacts: 5000,
  },
  createdAt: new Date(),
})

// Atualiza tenant por email
const tenant = await db.collection('tenants')
  .where('ownerEmail', '==', email)
  .limit(1)
  .get()

await tenant.docs[0].ref.update({
  stripeSubscriptionId,
  status: 'active',
  planId: 'starter',
  limits: { ... },
})
```

### 6. Redirecionamento ao Dashboard

```
Stripe redireciona para /dashboard?checkout=success
    ↓
Dashboard.tsx detecta parâmetro ?checkout=success
    ↓
Mostra alerta de sucesso
    ↓
Limpa URL (remove ?checkout=success)
    ↓
Dashboard carrega subscription com limites atualizados
```

**Dashboard.tsx:**
```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.search)
  const checkoutSuccess = params.get('checkout')
  
  if (checkoutSuccess === 'success') {
    setTimeout(() => {
      alert('🎉 Pagamento confirmado! Seu plano foi ativado com sucesso.')
    }, 500)
    
    window.history.replaceState({}, '', '/dashboard')
  }
}, [])
```

## 🎯 Diagrama de Fluxo Completo

```
┌─────────────────────────────────────────────────────────────┐
│ 1. PÁGINA DE PLANOS (/plans)                                │
├─────────────────────────────────────────────────────────────┤
│ Usuário clica "Ativar Plano Starter"                        │
│   ↓                                                          │
│ Verifica auth.currentUser                                   │
│   ↓                                                          │
│ ┌─────────────────────┬──────────────────────┐             │
│ │ SEM LOGIN           │ COM LOGIN            │             │
│ │                     │                      │             │
│ │ localStorage.set    │ createCheckoutSession│             │
│ │ 'pendingPlan'       │ (priceId, planId)   │             │
│ │   ↓                 │   ↓                  │             │
│ │ navigate('/login?   │ Stripe Checkout      │             │
│ │ signup=1')          │                      │             │
│ └─────────────────────┴──────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
                │                           │
                ↓                           ↓
┌─────────────────────────────────┐  ┌──────────────────────┐
│ 2. CRIAR CONTA (/login)         │  │ 4. STRIPE CHECKOUT   │
├─────────────────────────────────┤  ├──────────────────────┤
│ Modo signup ativado (?signup=1) │  │ Pagamento com cartão │
│   ↓                             │  │   ↓                  │
│ Email/senha ou Google           │  │ checkout.session.    │
│   ↓                             │  │ completed            │
│ createUserWithEmailAndPassword  │  │   ↓                  │
│   ↓                             │  │ Webhook processa     │
│ setDoc(users/{uid})             │  │   ↓                  │
│   ↓                             │  │ Salva planId +       │
│ /api/tenant/create-tenant       │  │ limits em Firestore  │
│   ↓                             │  │   ↓                  │
│ processPendingPlan()            │  │ redirect →           │
│   ↓                             │  │ /dashboard?checkout= │
│ localStorage.getItem            │  │ success              │
│ ('pendingPlan')                 │  └──────────────────────┘
│   ↓                             │            │
│ SE TRIAL:                       │            ↓
│   /api/start-trial → dashboard  │  ┌──────────────────────┐
│                                 │  │ 5. DASHBOARD         │
│ SE PAGO:                        │  ├──────────────────────┤
│   /api/stripe-checkout ─────────┼──→ Detecta ?checkout=  │
│                                 │  │ success              │
└─────────────────────────────────┘  │   ↓                  │
                                     │ Alert "Pagamento     │
┌─────────────────────────────────┐  │ confirmado!"         │
│ 3. APÓS SIGNUP (se plano pago)  │  │   ↓                  │
├─────────────────────────────────┤  │ Carrega subscription │
│ redirect → Stripe Checkout      │  │ com limits do plano  │
└─────────────────────────────────┘  └──────────────────────┘
```

## 📦 Estrutura de Dados

### Subscription (Firestore)

```javascript
{
  stripeSubscriptionId: "sub_1abc123...",
  stripeCustomerId: "cus_xyz789...",
  email: "user@example.com",
  status: "active",
  planId: "starter",
  limits: {
    emailsPerDay: 500,
    emailsPerMonth: 15000,
    campaigns: 50,
    contacts: 5000
  },
  createdAt: Timestamp,
  lastPaymentAt: Timestamp
}
```

### Tenant (Firestore)

```javascript
{
  ownerEmail: "user@example.com",
  ownerUid: "firebase_uid",
  stripeSubscriptionId: "sub_1abc123...",
  status: "active",
  planId: "starter",
  limits: {
    emailsPerDay: 500,
    emailsPerMonth: 15000,
    campaigns: 50,
    contacts: 5000
  },
  // ... outros campos
}
```

## 🎯 Planos e Limites

Definidos em `server/lib/plans.js`:

### Trial (7 dias grátis)
- ✅ Ativação automática no primeiro login
- 📧 50 emails/dia
- 👥 100 contatos
- 📊 5 campanhas

### Starter (R$ 47/mês)
- 📧 500 emails/dia
- 👥 5.000 contatos
- 📊 50 campanhas
- 💳 Stripe Price ID: `price_1SbmxX3NPGxGpoSOhZaPXBm9`

### Pro (R$ 97/mês) ⭐ Recomendado
- 📧 2.000 emails/dia
- 👥 20.000 contatos
- 📊 200 campanhas
- 💳 Stripe Price ID: `price_1Sbmyj3NPGxGpoSOHwBha5KU`

### Agency (R$ 197/mês)
- 📧 10.000 emails/dia
- 👥 100.000 contatos
- 📊 Ilimitado campanhas
- 💳 Stripe Price ID: `price_1Sbn023NPGxGpoSOkBSOhq19`

## ⚙️ Configuração

### Variáveis de Ambiente (.env)

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_51SX88n...
STRIPE_WEBHOOK_SECRET=whsec_Hun4V0t...
DEFAULT_HOST=http://localhost:3000

# Stripe Price IDs
VITE_STRIPE_PRICE_STARTER=price_1SbmxX3NPGxGpoSOhZaPXBm9
VITE_STRIPE_PRICE_STARTER_ANNUAL=price_1Sbmxt3NPGxGpoSO5NvFo64W
VITE_STRIPE_PRICE_PRO=price_1Sbmyj3NPGxGpoSOHwBha5KU
VITE_STRIPE_PRICE_PRO_ANNUAL=price_1Sbmz63NPGxGpoSOOs8ttKfK
VITE_STRIPE_PRICE_AGENCY=price_1Sbn023NPGxGpoSOkBSOhq19
VITE_STRIPE_PRICE_AGENCY_ANNUAL=price_1Sbn0K3NPGxGpoSOgeLVi6qY
```

### Vercel (Produção)

Adicionar as mesmas variáveis no dashboard do Vercel:
1. Acessar projeto no Vercel
2. Settings → Environment Variables
3. Adicionar `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `DEFAULT_HOST`
4. Adicionar todos os `VITE_STRIPE_PRICE_*`
5. Redesploy

## 🔒 Verificação de Limites

O sistema verifica limites automaticamente em:

### 1. Envio de Email (sendHelper.js)

```javascript
import { checkDailyEmailLimit } from './lib/plans.js'

// Antes de enviar
const canSend = await checkDailyEmailLimit(tenantId)
if (!canSend) {
  throw new Error('Limite diário de emails excedido')
}

// Após enviar com sucesso
await incrementDailyEmailCount(tenantId)
```

### 2. Dashboard

- Mostra plano atual
- Exibe limites do plano
- Alerta quando próximo do limite
- Botão para upgrade

## 🧪 Testando o Fluxo

### Modo Teste (Stripe Test Keys)

1. **Selecionar plano na página /plans**
2. **Usar cartão de teste:**
   - Número: `4242 4242 4242 4242`
   - Data: qualquer data futura
   - CVC: qualquer 3 dígitos
   - CEP: qualquer
3. **Confirmar pagamento**
4. **Verificar redirecionamento para /dashboard**
5. **Ver alerta de sucesso**
6. **Verificar limites aplicados**

### Verificar Firestore

```javascript
// subscriptions/{stripeSubscriptionId}
{
  planId: "starter",
  limits: { emailsPerDay: 500, ... },
  status: "active"
}

// tenants/{tenantId}
{
  planId: "starter",
  limits: { emailsPerDay: 500, ... }
}
```

## 🐛 Troubleshooting

### Webhook não dispara
- Verificar `STRIPE_WEBHOOK_SECRET` correto
- Testar webhook localmente com Stripe CLI:
  ```bash
  stripe listen --forward-to localhost:3000/api/webhook-stripe
  ```

### Limites não aparecem
- Verificar se webhook foi processado
- Checar logs do servidor
- Verificar se `planId` está nos metadados da sessão

### Redirecionamento falha
- Verificar `DEFAULT_HOST` configurado
- Checar se URLs success/cancel estão corretas
- Ver console do navegador para erros

## 📚 Arquivos Envolvidos

- ✅ `src/pages/Plans.tsx` - UI de seleção de planos
- ✅ `src/lib/stripe.ts` - createCheckoutSession()
- ✅ `server/api-handlers/stripe-checkout.js` - Cria sessão
- ✅ `server/api-handlers/webhook-stripe.js` - Processa pagamento
- ✅ `server/lib/plans.js` - Definição de planos e limites
- ✅ `src/pages/Dashboard.tsx` - Detecção de checkout success
- ✅ `server/sendHelper.js` - Verificação de limites
