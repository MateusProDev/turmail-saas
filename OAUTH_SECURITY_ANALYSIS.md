# 🔒 Análise de Segurança - OAuth Google

## ✅ Pontos Fortes da Implementação Atual

### 1. **Autenticação via Firebase**
- ✅ **OAuth 2.0 do Google** - Protocolo seguro e confiável
- ✅ **Firebase Auth** gerencia tokens e sessões
- ✅ **Tokens JWT** são gerados automaticamente
- ✅ **Refresh tokens** gerenciados pelo Firebase

### 2. **Proteção de Dados do Usuário**
- ✅ **Email verificado** - Google garante verificação
- ✅ **Dados mínimos** - Apenas email, nome e foto
- ✅ **Merge de dados** - `setDoc(..., { merge: true })` preserva dados existentes
- ✅ **UID único** - Firebase gera UID único e imutável

### 3. **Validação Server-Side**
- ✅ **Token verificado** - API `/api/tenant/create-tenant` exige Bearer token
- ✅ **firebaseAdmin.verifyIdToken()** - Valida autenticidade do token
- ✅ **Email do token** - Usa email do token, não do corpo da requisição

### 4. **Segurança do Frontend**
- ✅ **signInWithPopup** - Evita redirecionamento completo da página
- ✅ **HTTPS** - Vercel fornece HTTPS automático
- ✅ **DOM seguro** - Não há XSS possível nos formulários
- ✅ **CSP compatível** - Content Security Policy do navegador

---

## ⚠️ Vulnerabilidades Potenciais e Mitigações

### 1. **CSRF (Cross-Site Request Forgery)**

**Risco:**  
Um atacante poderia tentar forçar um usuário autenticado a criar tenants indesejados.

**Mitigação Atual:**
- ✅ Firebase Auth tokens incluem nonce anti-CSRF
- ✅ Tokens de curta duração (1 hora)
- ✅ Same-Origin Policy do navegador

**Recomendação Adicional:**
```typescript
// Adicionar CSRF token customizado (opcional)
const csrfToken = crypto.randomUUID()
sessionStorage.setItem('csrf', csrfToken)
// Enviar no header X-CSRF-Token
```

---

### 2. **Session Hijacking**

**Risco:**  
Roubo de token de sessão via XSS ou network sniffing.

**Mitigação Atual:**
- ✅ **HTTPS obrigatório** - Tokens não trafegam em texto puro
- ✅ **HttpOnly cookies** (se usar cookies) - Firebase SDK gerencia
- ✅ **Tokens de curta duração** - Expiram em 1 hora
- ✅ **Refresh tokens seguros** - Armazenados pelo Firebase

**Recomendação Adicional:**
```typescript
// Implementar logout em caso de inatividade
useEffect(() => {
  const timeout = setTimeout(() => {
    auth.signOut() // Logout após 30 min de inatividade
  }, 30 * 60 * 1000)
  
  return () => clearTimeout(timeout)
}, [lastActivity])
```

---

### 3. **Popup Blocker**

**Risco:**  
Navegadores podem bloquear o popup, impedindo login.

**Mitigação Atual:**
- ✅ **Tratamento de erro** - `auth/popup-blocked` mostra mensagem clara
- ✅ **Fallback** - Usuário pode habilitar popups e tentar novamente

**Recomendação:**
- Adicionar botão "Tentar novamente" quando popup for bloqueado
- Considerar `signInWithRedirect` como fallback automático

---

### 4. **Brute Force / Account Enumeration**

**Risco:**  
Atacantes podem tentar descobrir emails válidos.

**Mitigação Atual:**
- ✅ **OAuth do Google** - Google limita tentativas
- ✅ **Sem endpoint de "verificar email"** - Não expõe se email existe
- ✅ **Firebase Rate Limiting** - Limita requisições por IP

**Já Protegido:**  
Firebase Auth tem proteção nativa contra brute force.

---

### 5. **Autorização vs Autenticação**

**Risco:**  
Usuário autenticado acessar dados de outro tenant.

**Mitigação Atual:**
- ✅ **Firestore Rules** - Validam ownership no backend
- ✅ **Server-side verification** - API verifica UID do token
- ✅ **Tenant isolation** - Cada tenant tem ID único

**Código Crítico Verificado:**
```typescript
// ✅ BOM - Usa email do token
const decodedToken = await firebaseAuth.verifyIdToken(token)
const email = decodedToken.email // Email verificado pelo Firebase
```

```typescript
// ❌ RUIM - Confiaria no cliente
const { email } = req.body // NÃO FAZER ISSO
```

---

### 6. **localStorage vs sessionStorage**

**Risco:**  
Dados sensíveis em `localStorage` podem vazar via XSS.

**Status Atual:**
- ⚠️ **pendingPlan em localStorage** - Contém apenas `planId`, sem dados sensíveis
- ✅ **Tokens gerenciados pelo Firebase** - Não em localStorage manual

**Recomendação:**
```typescript
// OK para dados não-sensíveis
localStorage.setItem('pendingPlan', JSON.stringify({ planId }))

// ❌ NUNCA faça isso
localStorage.setItem('userToken', token) // NÃO!
```

---

## 🛡️ Recomendações de Segurança Adicionais

### 1. **Implementar Rate Limiting**

```typescript
// server/middleware/rateLimit.js
const rateLimit = require('express-rate-limit')

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
})

module.exports = { loginLimiter }
```

### 2. **Logging de Segurança**

```typescript
// Logar eventos críticos
console.log({
  event: 'USER_LOGIN',
  uid: user.uid,
  email: user.email,
  timestamp: new Date().toISOString(),
  ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
})
```

### 3. **Monitoramento de Anomalias**

- Implementar alertas para:
  - Múltiplos logins do mesmo IP
  - Logins de localizações incomuns
  - Criação massiva de tenants

### 4. **2FA (Two-Factor Authentication)**

```typescript
// Firebase suporta 2FA nativo
import { multiFactor } from 'firebase/auth'

// Habilitar 2FA para usuários premium
```

### 5. **Content Security Policy (CSP)**

Adicionar headers de segurança no `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "geolocation=(), microphone=(), camera=()"
        }
      ]
    }
  ]
}
```

---

## 📊 Checklist de Segurança

### Autenticação
- [x] OAuth 2.0 do Google implementado
- [x] Tokens JWT verificados server-side
- [x] HTTPS em produção
- [x] Popup seguro (sem redirect desnecessário)
- [ ] 2FA implementado (opcional para premium)
- [ ] Rate limiting em login

### Autorização
- [x] Firestore Rules configuradas
- [x] Server-side verification de tokens
- [x] Tenant isolation implementado
- [x] Email do token usado (não do body)

### Proteção de Dados
- [x] Dados mínimos coletados
- [x] Merge de dados (não sobrescreve)
- [x] Tokens não expostos no localStorage
- [x] Variáveis sensíveis em .env (não commitadas)

### Headers de Segurança
- [ ] X-Frame-Options
- [ ] X-Content-Type-Options
- [ ] Content-Security-Policy
- [ ] Referrer-Policy

### Monitoramento
- [ ] Logging de eventos de segurança
- [ ] Alertas de anomalias
- [ ] Auditoria de acessos

---

## 🎯 Próximas Ações Recomendadas

### Prioridade Alta
1. ✅ **Remover logs de debug** - CONCLUÍDO
2. **Adicionar headers de segurança** no vercel.json
3. **Implementar rate limiting** em APIs públicas

### Prioridade Média
4. **Adicionar logging estruturado** para eventos de segurança
5. **Implementar monitoramento** de anomalias
6. **Documentar processo de resposta** a incidentes

### Prioridade Baixa (Futuro)
7. **Implementar 2FA** para contas premium
8. **Adicionar biometria** em mobile (futuro)
9. **Pen testing** periódico

---

## ✅ Conclusão

### Estado Atual: **SEGURO ✅**

A implementação atual do OAuth Google está **segura para produção**:

1. ✅ Firebase Auth gerencia autenticação com segurança enterprise
2. ✅ Tokens verificados server-side em todas as APIs
3. ✅ HTTPS em produção via Vercel
4. ✅ Sem exposição de dados sensíveis
5. ✅ Isolamento correto entre tenants

### Melhorias Recomendadas

As sugestões acima são **melhorias incrementais**, não correções urgentes. O sistema atual é seguro o suficiente para lançamento em produção.

**Priorize:**
1. Headers de segurança (1 hora de trabalho)
2. Rate limiting (2 horas de trabalho)
3. Logging estruturado (1 hora de trabalho)

**Total: ~4 horas** para elevar a segurança de "Boa" para "Excelente".
