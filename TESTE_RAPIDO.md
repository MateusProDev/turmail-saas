# 🧪 Teste Rápido - Fluxo Completo

## Objetivo
Testar que um novo usuário consegue:
1. Criar conta
2. Adicionar chave Brevo
3. Enviar email pela própria conta

---

## 📝 Passo a Passo (Produção)

### 1. Criar Nova Conta
1. Abra https://turmail-saas.vercel.app
2. Clique "Criar nova conta"
3. Preencha:
   - Email: `teste@seudominio.com`
   - Senha: `Teste123!`
   - **Nome da empresa:** `Minha Empresa Teste`
4. Clique "Cadastrar"

**✅ Verificar:**
- Redirecionou para `/dashboard`
- No Console do navegador (F12): procure `[signup] requested server-side tenant creation`

---

### 2. Ir para Settings
1. Clique "Settings" no menu
2. Aguarde carregar

**✅ Verificar:**
- Aparece mensagem "Tenant selecionado: tenant_xxx"
- Ou "Carregando tenants..." seguido de seleção automática

---

### 3. Configurar Chave Brevo

#### A. Obter credenciais Brevo
1. Login em https://app.brevo.com
2. Settings > SMTP & API > Tab SMTP
3. Copie:
   - **Login:** ex: `SEU_LOGIN@smtp-brevo.com`
   - **Master Password:** ex: `xsmtpsib-SUACHAVEAQUI...`

#### B. Colar no app
1. Em Settings, seção "Chave Brevo"
2. Cole a **Master Password** no campo "Cole a chave API"
3. **Cole o e-mail de remetente** no campo "E-mail do Remetente" (ex: `contato@suaempresa.com`)
4. **Cole o nome do remetente** no campo "Nome do Remetente" (ex: `Minha Empresa`)
5. Cole o **Login** no campo "Login SMTP"
6. Clique "Salvar para este tenant"

**✅ Verificar:**
- Mensagem: "Chave salva para o tenant"
- Sem erros no console

**⚠️ IMPORTANTE:** Os campos **E-mail do Remetente** e **Nome do Remetente** são **obrigatórios** para enviar e-mails. Sem eles, você receberá o erro: `valid sender email required`

---

### 4. Testar Envio
1. Ainda em Settings
2. Clique botão verde "Enviar e-mail de teste"

**✅ Esperado:**
- Mensagem: "Enviado (id xxx)" ou "Enviado com sucesso"
- Email recebido na caixa de entrada

**❌ Se der erro:**
- Abra Console (F12) → aba Network
- Veja resposta de `/api/send-campaign`
- Cole aqui o erro

---

### 5. Criar Campanha Real
1. Vá para "Campanhas"
2. Clique "Nova Campanha"
3. Preencha:
   - **Assunto:** `Teste de envio`
   - **Conteúdo HTML:** `<p>Olá, este é um teste!</p>`
   - **Destinatários:** cole seu email
4. Deixe "Envio Imediato" ativado
5. Clique "Criar Campanha"

**✅ Verificar:**
- Mensagem: "Campanha criada: camp_xxx"
- Email recebido
- Na lista de campanhas: status "Enviado"

---

## 🔍 Troubleshooting

### Erro: "Nenhum tenant selecionado"
**Causa:** Tenant não foi criado automaticamente

**Solução rápida (PowerShell local):**
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS='C:\Users\mateo\Documents\turmail-saas\serviceAccount.json'
$uid = 'UID_DO_USUARIO'  # Obtenha do Firebase Auth

node -e "const admin=require('firebase-admin'); admin.initializeApp(); (async()=>{ const db=admin.firestore(); const uid=process.argv[2]; const t='tenant_'+uid; await db.collection('tenants').doc(t).set({ ownerUid: uid, name: 'Account '+uid, createdAt: admin.firestore.FieldValue.serverTimestamp() }); await db.collection('tenants').doc(t).collection('members').doc(uid).set({ role: 'owner', createdAt: admin.firestore.FieldValue.serverTimestamp() }); await db.collection('tenants').doc(t).collection('settings').doc('secrets').set({ brevoApiKey: null, smtpLogin: null, encrypted: false }); console.log('tenant criado:', t); })().catch(e=>console.error(e))" $uid
```

---

### Erro: "SMTP login not configured"
**Causa:** Salvou chave `xsmtp` sem o SMTP Login

**Solução:**
1. Em Settings, preencha o campo "Login SMTP"
2. Salve novamente

---

### Erro: "Brevo API key missing"
**Causa:** Chave não foi salva corretamente

**Verificar no Firestore:**
1. Abra Firebase Console
2. Firestore Database
3. `tenants/{tenantId}/settings/secrets`
   - Deve ter `activeKeyId`
4. `tenants/{tenantId}/settings/keys/list/{keyId}`
   - Deve ter `brevoApiKey` preenchido

**Se estiver vazio:**
- Tente salvar novamente
- Verifique console do navegador para erros

---

### Verificar Logs de Produção

**Via Vercel Dashboard:**
1. https://vercel.com > Seu projeto
2. Deployments > Latest
3. View Function Logs
4. Procure por:
   - `[sendHelper]`
   - `[tenant/set-brevo-key]`
   - Erros

**Via CLI:**
```powershell
npx vercel whoami
npx vercel projects ls
# Cole o deployment ID da lista
npx vercel logs <deployment-id> --prod
```

---

## 📊 Verificar no Firestore

### Tenant criado?
```
tenants/
  tenant_{uid}/
    ownerUid: "{uid}"
    name: "..."
```

### Chave salva?
```
tenants/tenant_{uid}/
  settings/
    secrets/
      activeKeyId: "xxx"
      smtpLogin: "9c6dd5001@smtp-brevo.com"
      fromEmail: "contato@suaempresa.com"
      fromName: "Minha Empresa"
    keys/
      list/
        {keyId}/
          brevoApiKey: "xsmtpsib-..."
          smtpLogin: "9c6dd5001@smtp-brevo.com"
          fromEmail: "contato@suaempresa.com"
          fromName: "Minha Empresa"
```

### Campanha enviada?
```
campaigns/
  camp_xxx/
    tenantId: "tenant_{uid}"
    status: "sent"
    httpStatus: 201
    messageId: "..."
```

---

## ✅ Checklist Final

- [ ] Conta criada com sucesso
- [ ] Tenant auto-selecionado em Settings
- [ ] Chave Brevo salva (com SMTP Login se xsmtp)
- [ ] Teste de envio funcionou
- [ ] Campanha enviada e recebida
- [ ] Logs sem erros críticos

---

## 🐛 Se Algo Falhar

1. **Abra o console do navegador** (F12)
2. **Copie qualquer erro em vermelho**
3. **Verifique Network tab** para ver resposta das APIs
4. **Cole aqui os logs relevantes** (sem expor chaves)

**Comandos úteis para debug local:**

```powershell
# Ver tenants do usuário
$env:GOOGLE_APPLICATION_CREDENTIALS='C:\Users\mateo\Documents\turmail-saas\serviceAccount.json'
node -e "const admin=require('firebase-admin'); admin.initializeApp(); (async()=>{ const db=admin.firestore(); const uid='UID_AQUI'; const q=await db.collectionGroup('members').where(admin.firestore.FieldPath.documentId(),'==',uid).get(); q.forEach(d=>{ const tenantId=d.ref.parent.parent.id; console.log('tenant:',tenantId,'role:',d.data().role); }); })().catch(e=>console.error(e))"

# Ver chaves de um tenant
node -e "const admin=require('firebase-admin'); admin.initializeApp(); (async()=>{ const db=admin.firestore(); const t='tenant_XXX'; const s=await db.collection('tenants').doc(t).collection('settings').doc('secrets').get(); console.log('secrets:',s.data()); const keys=await db.collection('tenants').doc(t).collection('settings').doc('keys').collection('list').get(); keys.forEach(k=>console.log(k.id,k.data())); })().catch(e=>console.error(e))"
```

---

**Depois de testar, me avise os resultados!** 🚀
