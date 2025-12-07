# Configuração OAuth Google - Firebase

## ⚠️ PROBLEMA ATUAL
Login com Google funciona em localhost mas mostra **tela branca** em produção (`turmail.turvia.com.br`).

**URL observada na tela branca:**
```
https://turmail.turvia.com.br/__/auth/handler?apiKey=AIzaSy...&authType=signInViaRedirect&redirectUrl=https://turmail.turvia.com.br/login&providerId=google.com
```

## ✅ SOLUÇÃO (Configure o Firebase Console)

O código já está correto (usando `signInWithRedirect`), mas você precisa **autorizar seu domínio no Firebase**.

---

### **PASSO 1: Adicionar Domínio Autorizado no Firebase**

1. **Acesse:** https://console.firebase.google.com
2. **Selecione seu projeto:** `turmail-saas`
3. **Navegue:** Authentication → Settings → **Authorized domains**
4. **Clique em:** `Add domain`
5. **Adicione seu domínio:**
   ```
   turmail.turvia.com.br
   ```
6. **Salve**

**Domínios que DEVEM estar na lista:**
- ✅ `localhost` (já vem por padrão)
- ✅ `turmail-saas.firebaseapp.com` (já vem por padrão)
- ⚠️ **ADICIONAR:** `turmail.turvia.com.br`
- ⚠️ **ADICIONAR (se usar Vercel):** `turmail-saas.vercel.app` (ou seu URL Vercel)

---

### **PASSO 2: Configurar OAuth Redirect URI no Google Cloud Console**

1. **Acesse:** https://console.cloud.google.com/apis/credentials
2. **Selecione o projeto:** `turmail-saas`
3. **Clique no OAuth 2.0 Client ID:** "Web client (auto created by Google Service)"
4. **Em "Authorized redirect URIs", adicione:**
   ```
   https://turmail-saas.firebaseapp.com/__/auth/handler
   https://turmail.turvia.com.br/__/auth/handler
   ```
5. **Salve**

---

### **PASSO 3: Verificar Variáveis de Ambiente (Vercel/Produção)**

Se estiver usando Vercel, certifique-se que o `authDomain` está configurado:

**No Vercel Dashboard:**
1. Vá em: Settings → Environment Variables
2. Verifique que existe:
   ```
   VITE_FIREBASE_AUTH_DOMAIN=turmail-saas.firebaseapp.com
   ```

**⚠️ IMPORTANTE:** Use sempre `turmail-saas.firebaseapp.com` como authDomain (NÃO use `turmail.turvia.com.br`).

---

## 🧪 Como Testar

1. **Após configurar** os passos acima no Firebase Console
2. **Aguarde 1-2 minutos** (propagação das configurações)
3. **Teste em produção:**
   - Acesse: https://turmail.turvia.com.br/login
   - Clique em "Entrar com Google"
   - Deve funcionar sem tela branca

4. **Se ainda houver tela branca:**
   - Abra o **Console do navegador** (F12)
   - Vá na aba **Console**
   - Procure por erros relacionados a CORS ou OAuth
   - Envie a mensagem de erro

---

## 🔍 Troubleshooting

### Erro: "auth/unauthorized-domain"
**Solução:** Você não adicionou `turmail.turvia.com.br` nos Authorized Domains do Firebase.
→ Volte ao **PASSO 1**

### Erro: "redirect_uri_mismatch"
**Solução:** Você não adicionou a URI no Google Cloud Console.
→ Volte ao **PASSO 2**

### Tela branca sem erro no console
**Solução:** Limpe o cache do navegador ou teste em aba anônima.
→ Pressione `Ctrl + Shift + Delete` e limpe o cache

### Verificar se authDomain está acessível
1. Abra em uma nova aba:
   ```
   https://turmail-saas.firebaseapp.com/__/auth/handler
   ```
2. Deve aparecer "Firebase Auth" ou similar (NÃO pode dar erro 404)

---

## 📋 Checklist de Configuração

- [ ] Domínio `turmail.turvia.com.br` adicionado em Firebase → Authentication → Authorized domains
- [ ] URI `https://turmail.turvia.com.br/__/auth/handler` adicionada no Google Cloud Console
- [ ] Variável `VITE_FIREBASE_AUTH_DOMAIN=turmail-saas.firebaseapp.com` configurada na Vercel
- [ ] Aguardou 1-2 minutos após as alterações
- [ ] Testou em aba anônima ou com cache limpo

---

## 💻 Como o Código Funciona

### Localhost (Desenvolvimento)
```typescript
if (isLocalhost) {
  // Usa popup - mantém estado da página
  const result = await signInWithPopup(auth, provider)
  // ... processa usuário imediatamente
}
```

### Produção (turmail.turvia.com.br)
```typescript
else {
  // Redireciona página inteira
  await signInWithRedirect(auth, provider)
  // Página recarrega e useEffect processa resultado
}
```

### Processamento do Redirect
```typescript
useEffect(() => {
  const result = await getRedirectResult(auth)
  if (result && result.user) {
    // Cria usuário, tenant, e inicia trial
    // Depois redireciona para dashboard
  }
}, [])
```

---

## 🎯 Resumo da Solução

**O código já está correto.** Você só precisa:

1. ✅ **Adicionar `turmail.turvia.com.br`** no Firebase Console (Authorized Domains)
2. ✅ **Adicionar a Redirect URI** no Google Cloud Console
3. ✅ **Aguardar 1-2 minutos** e testar

**Não precisa alterar código!** É apenas configuração.
