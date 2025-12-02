# Fluxo Completo: Tenant com Chave Brevo Própria

## 📋 Resumo
Cada usuário pode adicionar sua própria chave Brevo e enviar emails usando sua conta. O sistema **NÃO usa chave global** (foi removida).

## 🔄 Fluxo Passo a Passo

### 1️⃣ Criação de Conta (Signup)
**Arquivo:** `src/pages/Login.tsx`

Quando um usuário cria conta:
1. Firebase Auth cria o usuário
2. Documento criado em `users/{uid}` com `company.name`
3. **Servidor cria tenant automaticamente** via `/api/tenant/create-tenant`
   - Tenant ID: `tenant_{uid}`
   - Owner: usuário atual
   - Cria `tenants/{tenantId}/members/{uid}` com role `owner`
   - Inicializa `tenants/{tenantId}/settings/secrets` (vazio)

**Handler:** `server/api-handlers/tenant/create-tenant.js`

---

### 2️⃣ Login e Seleção de Tenant
**Arquivo:** `src/pages/Settings.tsx`

Quando usuário faz login:
1. `auth.onAuthStateChanged` detecta usuário
2. Chama `/api/my-tenants` (usa Admin SDK)
3. Carrega lista de tenants onde usuário é membro
4. **Auto-seleciona** o tenant (preferência: owner > admin > primeiro)
5. Se não existir tenant, tenta criar automaticamente

**Handler:** `server/api-handlers/my-tenants.js`

---

### 3️⃣ Adicionar Chave Brevo
**Arquivo:** `src/pages/Settings.tsx`

Usuário vai em Settings e:
1. Cola **Chave API Brevo** (campo `tenantKey`)
2. Cola **Login SMTP** (campo `smtpLogin`) - **OBRIGATÓRIO para chaves xsmtp**
3. Clica "Salvar para este tenant"

**O que acontece:**
```javascript
POST /api/tenant/set-brevo-key
Body: {
  tenantId: "tenant_xxx",
  key: "xsmtpsib-...",
  smtpLogin: "9c6dd5001@smtp-brevo.com"
}
```

**Handler:** `server/api-handlers/tenant/set-brevo-key.js`

**Ações do handler:**
1. Verifica autorização (owner/admin do tenant)
2. Cria documento em `tenants/{tenantId}/settings/keys/list/{keyId}`
   - `brevoApiKey`: chave (criptografada se `TENANT_ENCRYPTION_KEY` definido)
   - `smtpLogin`: login SMTP
   - `createdBy`: uid
3. **Atualiza `tenants/{tenantId}/settings/secrets`:**
   - `activeKeyId`: ID da nova chave
   - `smtpLogin`: login SMTP (para acesso rápido)

---

### 4️⃣ Criar e Enviar Campanha
**Arquivo:** `src/pages/Campaigns.tsx`

Quando usuário cria campanha:
1. UI carrega tenants e **auto-seleciona** o tenant do usuário
2. Ao criar campanha, `tenantId` é incluído no payload
3. Documento criado em `campaigns/{id}`:
   ```javascript
   {
     tenantId: "tenant_xxx",
     ownerUid: "uid_xxx",
     subject: "...",
     htmlContent: "...",
     to: [...],
     status: "queued"
   }
   ```

**Se envio imediato:**
```javascript
POST /api/send-campaign
Body: { campaignId: "camp_xxx" }
```

---

### 5️⃣ Envio do Email
**Arquivo:** `server/sendHelper.js`

**Fluxo completo:**

#### A. Determinar tenant
1. Se `tenantId` fornecido → usa diretamente
2. Se não, tenta derivar de `payload.ownerUid`:
   - Busca `tenants` onde `ownerUid == payload.ownerUid`
   - Ou busca `members` collectionGroup

#### B. Carregar chave ativa
```javascript
// 1. Busca secrets
const secrets = await db.collection('tenants').doc(tenantId)
  .collection('settings').doc('secrets').get()

const activeKeyId = secrets.activeKeyId

// 2. Busca documento da key
const keyDoc = await db.collection('tenants').doc(tenantId)
  .collection('settings').doc('keys')
  .collection('list').doc(activeKeyId).get()

// 3. Descriptografa se necessário
let apiKey = keyDoc.brevoApiKey
if (encrypted) apiKey = tryDecrypt(apiKey)
```

#### C. Detectar tipo de chave
```javascript
if (apiKey.startsWith('xsmtp') || apiKey.startsWith('xsmtpsib')) {
  // Chave SMTP
  // Busca smtpLogin em:
  // 1. secrets.smtpLogin
  // 2. keyDoc.smtpLogin  
  // 3. members/{ownerUid}.smtpLogin
  
  if (!smtpLogin) throw Error('SMTP login obrigatório')
  
  // Cria transporter Nodemailer
  nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    auth: { user: smtpLogin, pass: apiKey }
  })
} else {
  // Chave API REST
  // Usa axios/brevoMail.js
}
```

#### D. Enviar
- Se múltiplos destinatários + placeholders → envia individualmente
- Senão → envia em lote
- Persiste resultado em `campaigns/{id}`:
  - `status`: "sent" / "failed"
  - `httpStatus`, `responseBody`, `messageId`

---

## 🔐 Segurança

### Criptografia (Opcional)
**Variável:** `TENANT_ENCRYPTION_KEY` (base64, 32 bytes)

Se definida, as chaves são criptografadas com AES-256-GCM:
```javascript
{
  iv: "base64...",
  tag: "base64...",
  data: "base64..."
}
```

### Autorização
- Apenas `owner` ou `admin` do tenant podem salvar chaves
- Chaves nunca são retornadas em APIs (apenas metadata)
- Admin site-level (custom claim `admin: true`) pode gerenciar qualquer tenant

---

## 📊 Estrutura Firestore

```
tenants/
  {tenantId}/
    name: string
    ownerUid: string
    createdAt: timestamp
    
    members/
      {uid}/
        role: "owner" | "admin" | "member"
        email: string
        displayName: string
        
    settings/
      secrets/
        activeKeyId: string        ← ID da chave ativa
        smtpLogin: string          ← Login SMTP (acesso rápido)
        updatedAt: timestamp
        updatedBy: uid
        
      keys/
        list/
          {keyId}/
            id: string
            brevoApiKey: string    ← Chave (pode estar criptografada)
            smtpLogin: string      ← Login SMTP
            memberLevel: boolean
            createdBy: uid
            createdAt: timestamp

campaigns/
  {campaignId}/
    tenantId: string               ← Importante!
    ownerUid: string
    subject: string
    htmlContent: string
    to: array
    status: "queued" | "sent" | "failed"
    httpStatus: number
    responseBody: object
    messageId: string
```

---

## 🐛 Troubleshooting

### ❌ "Brevo API key missing"
**Causa:** Tenant não tem chave ativa configurada
**Solução:** 
1. Vá em Settings
2. Cole a chave Brevo
3. Se for `xsmtp`, cole também SMTP Login
4. Clique "Salvar para este tenant"

### ❌ "SMTP login not configured"
**Causa:** Chave é `xsmtp` mas não tem `smtpLogin`
**Solução:**
1. Em Settings, cole o SMTP Login (ex: `9c6dd5001@smtp-brevo.com`)
2. Salve novamente a chave

### ❌ Envio usa chave errada
**Verificar:**
1. `campaigns/{id}.tenantId` está preenchido?
2. `tenants/{tenantId}/settings/secrets.activeKeyId` aponta para key correta?
3. Logs do servidor: `[sendHelper] derived tenantId...`

### ❌ Criptografia não funciona
**Verificar:**
1. `TENANT_ENCRYPTION_KEY` está definida no Vercel?
2. É a mesma chave usada ao salvar?
3. Formato: base64, 32 bytes (44 caracteres base64)

---

## 🔧 Variáveis de Ambiente (Vercel)

### Obrigatórias
```env
FIREBASE_PROJECT_ID=turmail-saas
FIREBASE_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

### Opcionais
```env
# Criptografia de chaves
TENANT_ENCRYPTION_KEY=<base64-32-bytes>

# Fallback (se chave do tenant não configurada)
# REMOVIDAS: BREVO_API_KEY e DEFAULT_FROM_NAME

# Debug
DEBUG_SEND=true
DEBUG_API=true

# SMTP global (fallback, não recomendado)
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
```

---

## ✅ Checklist de Implementação

- [x] Tenant criado automaticamente no signup
- [x] UI Settings carrega tenants do usuário
- [x] UI permite salvar chave Brevo + SMTP Login
- [x] Handler salva chave e smtpLogin em secrets
- [x] sendHelper busca chave ativa do tenant
- [x] sendHelper deriva tenantId de ownerUid (fallback)
- [x] sendHelper busca smtpLogin de 3 locais
- [x] sendHelper valida SMTP login obrigatório para xsmtp
- [x] Campaigns inclui tenantId no payload
- [x] Logs de diagnóstico adicionados
- [x] Criptografia opcional funcional
- [x] Chave global removida

---

## 📞 Como Obter Chave SMTP no Brevo

1. Login em https://app.brevo.com
2. Vá em **Settings** > **SMTP & API**
3. Tab **SMTP**
4. Copie:
   - **Login:** (ex: `9c6dd5001@smtp-brevo.com`)
   - **Master Password:** (a chave `xsmtpsib-...`)
5. Cole ambos em Settings do app

---

## 🚀 Próximos Passos (Opcional)

- [ ] UI para listar/gerenciar múltiplas chaves por tenant
- [ ] Rotação automática de chaves
- [ ] Métricas de uso por tenant
- [ ] Webhook Brevo para bounces/complaints
- [ ] Suporte a Amazon SES como alternativa
