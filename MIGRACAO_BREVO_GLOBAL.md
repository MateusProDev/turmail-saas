# Migração para Brevo Global - Configuração Centralizada

## 📋 Resumo da Migração

A configuração do Brevo foi migrada de **chaves por tenant** para **uma configuração global centralizada** usando as variáveis de ambiente da Vercel. Todos os tenants agora compartilham a mesma conta Brevo, mas cada tenant pode ter suas próprias configurações de remetente (fromEmail, fromName, smtpLogin).

## 🎯 Benefícios da Centralização

✅ **Melhor conversão de emails** - Usando uma conta Brevo consolidada com melhor reputação  
✅ **Gerenciamento simplificado** - Uma única chave API para manter  
✅ **Redução de custos** - Elimina a necessidade de múltiplas contas Brevo  
✅ **Menos complexidade** - Código mais simples e fácil de manter  
✅ **Melhor segurança** - Chave armazenada apenas nas variáveis de ambiente da Vercel

## 🔧 Variáveis de Ambiente da Vercel

Configure as seguintes variáveis em **Vercel Dashboard > Settings > Environment Variables**:

```bash
# Obrigatórias
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DEFAULT_FROM_EMAIL=noreply@seudominio.com
DEFAULT_FROM_NAME=Nome da Empresa

# Opcional para SMTP
BREVO_SMTP_PORT=587
BREVO_SMTP_LOGIN=seu-email@seudominio.com
```

### Como adicionar na Vercel:

1. Acesse seu projeto no [Vercel Dashboard](https://vercel.com/dashboard)
2. Vá em **Settings > Environment Variables**
3. Adicione cada variável para **All Environments** (Production, Preview, Development)
4. Clique em **Save**
5. Faça um novo deploy para aplicar as mudanças

## 📦 Alterações no Código

### 1. **sendHelper.js** (server/sendHelper.js)

**ANTES:** Carregava a chave API de cada tenant do Firestore
```javascript
// Busca chave por tenant
const secretsSnap = await db.collection('tenants').doc(tenantId)...
let apiKey = keyData.brevoApiKey
```

**DEPOIS:** Usa a chave global do ambiente
```javascript
// Use global Brevo API key from environment
const apiKey = process.env.BREVO_API_KEY

// Load tenant-specific sender configuration
let tenantFromEmail = process.env.DEFAULT_FROM_EMAIL || ''
let tenantFromName = process.env.DEFAULT_FROM_NAME || ''
```

### 2. **get-brevo-senders.js** (api/tenant/get-brevo-senders.js)

**ANTES:** Buscava chave do tenant para listar senders
```javascript
const keyData = keySnap.data()
let brevoApiKey = keyData.brevoApiKey
```

**DEPOIS:** Usa chave global
```javascript
const brevoApiKey = process.env.BREVO_API_KEY
if (!brevoApiKey) {
  return res.status(400).json({ 
    error: 'Global Brevo API key not configured' 
  })
}
```

### 3. **get-brevo-stats.js** (server/api-handlers/get-brevo-stats.js)

**ANTES:** Lógica complexa para buscar chave do tenant
```javascript
// Busca activeKey, latest key, ou legacy key...
```

**DEPOIS:** Simplificado para usar global
```javascript
const apiKey = process.env.BREVO_API_KEY
if (!apiKey) {
  return res.status(200).json({
    error: 'Global Brevo API key not configured',
    hint: 'Configure BREVO_API_KEY nas variáveis de ambiente'
  })
}
```

### 4. **brevoMail.js** (server/brevoMail.js)

**ANTES:** Exigia apiKey obrigatória
```javascript
if (!apiKey) throw new Error('BREVO_API_KEY missing')
```

**DEPOIS:** Fallback para variável global
```javascript
const brevoApiKey = apiKey || process.env.BREVO_API_KEY
if (!brevoApiKey) throw new Error('BREVO_API_KEY missing - configure in Vercel')
```

### 5. **set-brevo-key.js** (server/api-handlers/tenant/set-brevo-key.js)

**ANTES:** Salvava chave Brevo criptografada no Firestore
```javascript
const encrypted = encryptValue(key)
await newKeyRef.set({ brevoApiKey: encrypted, ... })
```

**DEPOIS:** Salva apenas configurações de remetente do tenant
```javascript
// Save tenant-specific sender configuration (fromEmail, fromName, smtpLogin)
const secretsUpdate = { smtpLogin, fromEmail, fromName, ... }
await db.collection('tenants').doc(tenantId)
  .collection('settings').doc('secrets')
  .set(secretsUpdate, { merge: true })
```

## 📊 Configuração por Tenant

Cada tenant pode configurar suas próprias informações de remetente:

```javascript
// Firestore: tenants/{tenantId}/settings/secrets
{
  fromEmail: "contato@empresa.com",
  fromName: "Nome da Empresa",
  smtpLogin: "contato@empresa.com",  // Opcional para SMTP
  updatedAt: Timestamp,
  updatedBy: "uid-do-usuario"
}
```

## 🔄 Fluxo de Envio de Email

1. **Cliente** chama `/api/send-campaign` com payload
2. **sendHelper** usa `process.env.BREVO_API_KEY` (chave global)
3. **sendHelper** carrega configurações de sender do tenant (fromEmail, fromName)
4. **brevoMail** envia email usando a chave global com o sender do tenant
5. **Brevo API** processa o envio com a conta centralizada

## 🚀 Passos para Implementar

### 1. Adicionar variáveis na Vercel
```bash
BREVO_API_KEY=sua-chave-aqui
DEFAULT_FROM_EMAIL=noreply@seudominio.com
DEFAULT_FROM_NAME=Sua Empresa
```

### 2. Deploy das alterações
```bash
git add .
git commit -m "feat: migrar para Brevo global centralizado"
git push origin main
```

### 3. Configurar senders por tenant (opcional)
Cada tenant pode configurar seu próprio remetente em **Settings > Configuração Brevo**

## ✅ Checklist de Migração

- [x] Adicionar `BREVO_API_KEY` na Vercel
- [x] Adicionar `DEFAULT_FROM_EMAIL` na Vercel
- [x] Adicionar `DEFAULT_FROM_NAME` na Vercel
- [x] Atualizar `sendHelper.js`
- [x] Atualizar `get-brevo-senders.js`
- [x] Atualizar `get-brevo-stats.js`
- [x] Atualizar `brevoMail.js`
- [x] Atualizar `set-brevo-key.js`
- [ ] Fazer deploy das alterações
- [ ] Testar envio de email
- [ ] Verificar estatísticas no dashboard

## 🧪 Testes

### Testar envio de email:
```bash
# No terminal local
node scripts/test-send.js
```

### Testar API de senders:
```bash
curl -X GET "https://seusite.vercel.app/api/tenant/get-brevo-senders?tenantId=TENANT_ID" \
  -H "Authorization: Bearer SEU_TOKEN"
```

## 🐛 Troubleshooting

### Erro: "Global Brevo API key not configured"
**Solução:** Adicione `BREVO_API_KEY` nas variáveis de ambiente da Vercel

### Erro: "Sender email not configured"
**Solução:** Configure `DEFAULT_FROM_EMAIL` ou configure o fromEmail do tenant

### Emails não chegam
**Solução:** Verifique se o sender email está verificado na conta Brevo

## 📚 Referências

- [Brevo API Documentation](https://developers.brevo.com/)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- Arquivo original: `BREVO_EMAIL_GUIDE.md`

## 🔐 Segurança

- ✅ Chave API nunca exposta no frontend
- ✅ Armazenada como **Encrypted** na Vercel
- ✅ Acessível apenas pelo backend (server-side)
- ✅ Logs nunca mostram a chave completa (apenas masked)

---

**Data da Migração:** 7 de Dezembro de 2025  
**Autor:** Equipe de Desenvolvimento
