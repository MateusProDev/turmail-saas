# 🚨 PROBLEMA: Email de Campanha Não Enviado

## ❌ Erro Identificado

```
Error: server misconfiguration: send helper not available
```

## 🔍 Diagnóstico

A campanha `camp_-gRmwhTC_6` falhou porque as seguintes variáveis de ambiente **NÃO estão configuradas no Vercel**:

1. ❌ `BREVO_API_KEY` - **OBRIGATÓRIA** para enviar emails
2. ❌ `DEFAULT_FROM_EMAIL` - Email remetente padrão
3. ❌ `DEFAULT_FROM_NAME` - Nome do remetente padrão

## ✅ Solução

### 1. Acessar Vercel Dashboard

1. Acesse: https://vercel.com/dashboard
2. Clique no projeto **turmail-saas**
3. Vá em **Settings** > **Environment Variables**

### 2. Adicionar Variáveis Obrigatórias

Adicione as seguintes variáveis:

#### **BREVO_API_KEY** (OBRIGATÓRIA)

```
Nome: BREVO_API_KEY
Valor: [SUA API KEY DA BREVO]
```

**Como obter a API Key da Brevo:**
1. Acesse: https://app.brevo.com/settings/keys/api
2. Copie sua API key (começa com `xkeysib-...`)
3. Cole no campo Value no Vercel

**Environments:** Marque todas (Production, Preview, Development)

---

#### **DEFAULT_FROM_EMAIL** (OBRIGATÓRIA)

```
Nome: DEFAULT_FROM_EMAIL
Valor: contato@turvia.com.br
```

Este será o email remetente padrão quando não configurado no tenant.

**Environments:** Marque todas (Production, Preview, Development)

---

#### **DEFAULT_FROM_NAME** (OPCIONAL)

```
Nome: DEFAULT_FROM_NAME
Valor: Turmail
```

**Environments:** Marque todas (Production, Preview, Development)

---

#### **BREVO_SMTP_LOGIN** (OPCIONAL - apenas se usar SMTP)

```
Nome: BREVO_SMTP_LOGIN
Valor: [seu email de login SMTP da Brevo]
```

**Como obter:**
1. Acesse: https://app.brevo.com/settings/keys/smtp
2. Copie o "Login"

---

### 3. Verificar Configuração Atual

Variáveis que **JÁ estão configuradas** (não precisa alterar):

- ✅ `VITE_FIREBASE_API_KEY`
- ✅ `VITE_FIREBASE_AUTH_DOMAIN`
- ✅ `VITE_FIREBASE_PROJECT_ID`
- ✅ `VITE_FIREBASE_STORAGE_BUCKET`
- ✅ `VITE_FIREBASE_MESSAGING_SENDER_ID`
- ✅ `VITE_FIREBASE_APP_ID`

### 4. Fazer Redeploy

Após adicionar as variáveis:

1. Volte para **Deployments**
2. Clique nos 3 pontinhos da última deployment
3. Clique em **Redeploy**
4. **OU** faça um novo commit e push:

```powershell
git commit --allow-empty -m "chore: trigger redeploy"
git push
```

---

## 🧪 Testar Envio

Após configurar e fazer redeploy, teste criando uma nova campanha:

1. Acesse: https://turmail.turvia.com.br/campaigns
2. Crie uma nova campanha
3. Adicione destinatário (use seu próprio email)
4. Clique em **Enviar**
5. Verifique se recebeu o email

---

## 📋 Checklist

- [ ] BREVO_API_KEY configurada no Vercel
- [ ] DEFAULT_FROM_EMAIL configurada no Vercel
- [ ] DEFAULT_FROM_NAME configurada no Vercel
- [ ] Redeploy feito
- [ ] Teste de envio realizado
- [ ] Email recebido com sucesso

---

## 🔐 Configuração no Tenant (Alternativa)

Se preferir, você também pode configurar a API key **por tenant** em vez de globalmente:

1. Acesse: https://turmail.turvia.com.br/settings
2. Na seção **Brevo Integration**
3. Cole sua API key da Brevo
4. Configure o email remetente
5. Salve

**Vantagem:** Cada tenant pode usar sua própria conta Brevo.

**Desvantagem:** Precisa configurar para cada tenant.

---

## ⚠️ Importante

**NÃO** commite a API key da Brevo no código ou no repositório Git. Sempre use variáveis de ambiente do Vercel.

---

## 📞 Suporte

Se o problema persistir após configurar as variáveis:

1. Verifique os logs do Vercel:
   - Acesse: https://vercel.com/[seu-usuario]/turmail-saas/deployments
   - Clique na última deployment
   - Vá em **Functions** > **send-campaign**
   - Verifique os logs

2. Execute o script de diagnóstico localmente:
   ```powershell
   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\Users\mateo\Documents\turmail-saas\serviceAccount.json"
   node scripts/test-send-campaign.js camp_-gRmwhTC_6
   ```

---

## ✅ Resultado Esperado

Após configurar tudo corretamente, você deve ver no Firestore:

```json
{
  "status": "sent",
  "httpStatus": 201,
  "messageId": "...",
  "attempts": 1
}
```

E receber o email na caixa de entrada do destinatário.
